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
import "node:crypto"; // ensure crypto module is available
import crypto from "crypto";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./lib/errors.js";
import { enrichSession } from "./middlewares/auth.js";
import { metricsMiddleware } from "./lib/metrics.js";

const { Pool } = pkg;

const app: Express = express();

// Trust Vercel + Render/Cloudflare reverse proxies so express-rate-limit and secure cookies work correctly
app.set("trust proxy", 1);

// ── Security headers (Helmet) ─────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Phase 1.5 — Removed 'unsafe-inline' from scriptSrc. CSP violation reports now surfaced.
        // If Razorpay checkout requires inline scripts, use their hosted page and scope the nonce to that route only.
        scriptSrc: ["'self'", "https://checkout.razorpay.com"],
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

app.use(metricsMiddleware);
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

const isProduction = process.env["NODE_ENV"] === "production" || !!process.env["RENDER"] || !!process.env["FRONTEND_URL"];

function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.trim();
  }
}

// ── CORS ──────────────────────────────────────────────────────────────────
// Production setup: frontend on Vercel, API on Render — CROSS-ORIGIN.
// FRONTEND_URL env var must be set on Render to your Vercel domain.
// SameSite=None;Secure cookies are used in production (see session config).
const allowedOrigins = new Set<string>(
  [
    // Primary: set FRONTEND_URL on your Render API service to your Vercel URL
    process.env["FRONTEND_URL"],
    // Replit dev domain (injected automatically in Replit workspace)
    process.env["REPLIT_DEV_DOMAIN"]
      ? `https://${process.env["REPLIT_DEV_DOMAIN"]}`
      : undefined,
    // Production frontend domains (Vercel / custom domain)
    "https://www.agenario.tech",
    "https://agenario.tech",
    // Vercel preview/deployment URLs — add yours if different
    "https://agenario.vercel.app",
    // Local Vite dev server
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

// Verify session table on startup
pool.query(`
  SELECT 1 FROM "session" LIMIT 1
`).catch(() => {
  logger.error("Session table 'session' does not exist in database — run DEPLOYMENT.md SQL to create it");
});

app.use(
  session({
    store: new PgStore({
      pool,
      errorLog: (err: Error) => logger.error({ err }, "Session store error"),
    }),
    secret: (() => {
      const secret = process.env["SESSION_SECRET"];
      if (!secret) {
        if (isProduction) {
          // Phase 1.1 — Never fall back to a weak secret in production. Session forgery risk.
          throw new Error("FATAL: SESSION_SECRET env var must be set in production. Refusing to start.");
        }
        logger.warn("SESSION_SECRET not set — using random ephemeral secret for development. Sessions will not persist across restarts.");
        return crypto.randomBytes(32).toString("hex");
      }
      return secret;
    })(),
    resave: false,
    saveUninitialized: false,
    name: "agn_sid", // Don't use default 'connect.sid'
    cookie: {
      // In production, Vercel → Render proxy chain requires SameSite=None + Secure.
      // Domain is set to .agenario.tech so the cookie works on both www and bare domain.
      secure: isProduction ? true : false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: isProduction ? "none" : "lax",
      // Remove hardcoded domain so the cookie works across any allowed Vercel frontend domain
      // domain: isProduction ? ".agenario.tech" : undefined,
    },
  }),
);

// ── Auth enrichment (API key + webhook secret → session) ─────────────────
app.use("/api", enrichSession);

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

// ── Global error handler (Phase 5.4) ─────────────────────────────────────
// Handles AppError with typed codes, logs 5xx errors, returns clean JSON.
app.use(errorHandler);


export default app;
