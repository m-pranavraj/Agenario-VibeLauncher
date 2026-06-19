import "./types.d.ts";
import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pkg from "pg";
import pinoHttp from "pino-http";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import cron from "node-cron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const { Pool } = pkg;

const app: Express = express();

// Trust Replit's reverse proxy so express-rate-limit and secure cookies work correctly
app.set("trust proxy", 1);

// ── Security headers (Helmet) ─────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
        frameSrc: ["https://api.razorpay.com", "https://checkout.razorpay.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow Razorpay iframe
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// ── Rate limiting ─────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Max 20 auth attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  skipSuccessfulRequests: true,
});

const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Max 30 scan requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Scan rate limit reached. Please wait before starting another analysis." },
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Max 5 OTP sends per 10 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests. Please wait 10 minutes before trying again." },
  skipSuccessfulRequests: false,
});

app.use(globalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/auth/send-otp", otpLimiter);
app.use("/api/scans", (req, res, next) => {
  if (req.method === "POST") {
    scanLimiter(req, res, next);
    return;
  }
  next();
});

// ── Logging ───────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const isProduction = process.env["NODE_ENV"] === "production";

function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.trim();
  }
}

// ── CORS ──────────────────────────────────────────────────────────────────
// Build a strict allowlist. In production the frontend and API share the same
// Replit-proxied origin, so same-origin requests never hit the CORS handler.
// We only need CORS for local development (Vite on a different port) and for
// any explicitly configured FRONTEND_URL.
const allowedOrigins = new Set<string>(
  [
    process.env["FRONTEND_URL"],
    process.env["REPLIT_DEV_DOMAIN"]
      ? `https://${process.env["REPLIT_DEV_DOMAIN"]}`
      : undefined,
    // Production frontend domains
    "https://www.agenario.tech",
    "https://agenario.tech",
    // Local Vite dev server (port may vary, cover common ranges)
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:22752",
    "http://localhost:4173",
  ].filter(Boolean) as string[],
);

app.use(
  cors({
    origin(requestOrigin, callback) {
      // Same-origin requests (no Origin header) are always allowed
      if (!requestOrigin) return callback(null, true);
      const normalizedOrigin = normalizeOrigin(requestOrigin);
      if (allowedOrigins.has(normalizedOrigin)) return callback(null, true);
      callback(new Error(`CORS: origin '${normalizedOrigin}' is not allowed`));
    },
    credentials: true,
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────
// Raw body for GitHub webhook signature verification
app.use(
  "/api/github/webhook",
  express.raw({ type: "application/json" }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Session ───────────────────────────────────────────────────────────────
const PgStore = connectPgSimple(session);
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

app.use(
  session({
    store: new PgStore({ pool }),
    secret: process.env["SESSION_SECRET"] ?? "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    name: "agn_sid", // Don't use default 'connect.sid'
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      // In production the frontend and API share the same Replit-proxied origin
      // so "lax" is both safe and sufficient. "none" would require Secure and
      // allows cross-site cookie sending — avoid unless cross-origin is needed.
      sameSite: "lax",
    },
  }),
);

// ── Routes ────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── In-process daily pulse cron ──────────────────────────────────────────
// Runs at 09:00 UTC every day. Calls the pulse endpoint internally to
// check for score drops / new CVEs (email gated by EMAIL_ENABLED env var).
cron.schedule("0 9 * * *", () => {
  const secret = process.env["PULSE_SECRET"] ?? "";
  const port = process.env["PORT"] ?? "8080";
  fetch(`http://localhost:${port}/api/monitoring/pulse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pulse-secret": secret,
    },
  })
    .then((r) => r.json())
    .then((data) => logger.info({ data }, "Daily pulse cron completed"))
    .catch((err) => logger.error({ err }, "Daily pulse cron failed"));
}, { timezone: "UTC" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(__dirname, "../../agenario/dist");

app.use(express.static(publicPath));

// ── SPA fallback for non-API routes (production only) ─────────────────────
// In development, Vite handles all non-/api requests; in production this
// prevents 404s when the user refreshes a deep route.
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  const indexHtml = path.join(publicPath, "index.html");
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.redirect("/");
  }
});

// ── Global error handler ──────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error({ err }, "Unhandled error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default app;
