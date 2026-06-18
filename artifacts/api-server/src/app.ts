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

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: true,
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
      sameSite: isProduction ? "none" : "lax",
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
