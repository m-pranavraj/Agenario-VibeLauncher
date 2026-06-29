import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ── Basic health check ─────────────────────────────────────────────────────
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// ── Phase 6.3 — Deep health check ─────────────────────────────────────────
// Checks database, AI provider availability, memory, and uptime.
// Used by monitoring dashboards, load balancers, and on-call runbooks.
router.get("/health/deep", async (_req, res) => {
  const start = Date.now();
  const checks: Record<string, { status: "ok" | "degraded" | "down"; latencyMs?: number; detail?: string }> = {};

  // 1. Database ping
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = { status: "down", detail: err?.message ?? "Unknown DB error" };
    logger.error({ err }, "[health/deep] DB check failed");
  }

  // 2. AI provider reachability (Groq)
  try {
    const aiStart = Date.now();
    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) {
      checks.aiProvider = { status: "degraded", detail: "GROQ_API_KEY not set" };
    } else {
      const r = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      checks.aiProvider = {
        status: r.ok ? "ok" : "degraded",
        latencyMs: Date.now() - aiStart,
        detail: r.ok ? undefined : `HTTP ${r.status}`,
      };
    }
  } catch (err: any) {
    checks.aiProvider = { status: "degraded", detail: "Groq unreachable" };
  }

  // 3. Memory usage
  const mem = process.memoryUsage();
  const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
  checks.memory = {
    status: heapUsedMb < 400 ? "ok" : heapUsedMb < 700 ? "degraded" : "down",
    detail: `heap ${heapUsedMb}MB / ${heapTotalMb}MB`,
  };

  // 4. Process uptime
  const uptimeSecs = Math.round(process.uptime());
  checks.process = {
    status: "ok",
    detail: `uptime ${Math.floor(uptimeSecs / 3600)}h ${Math.floor((uptimeSecs % 3600) / 60)}m`,
  };

  // 5. Chromium / Sandbox status
  try {
    const { healthCheck } = await import("../lib/chromium-sandbox.js");
    const chromiumHealth = await healthCheck();
    checks.chromium = {
      status: chromiumHealth.chromium ? "ok" : "degraded",
      detail: `chromium: ${chromiumHealth.chromium ? "available" : "unavailable"}, mem: ${chromiumHealth.memFreeMB}MB free`,
    };
  } catch {
    checks.chromium = { status: "degraded", detail: "Chromium module not loaded" };
  }

  const overallStatus = Object.values(checks).some((c) => c.status === "down")
    ? "down"
    : Object.values(checks).some((c) => c.status === "degraded")
    ? "degraded"
    : "ok";

  res.status(overallStatus === "down" ? 503 : 200).json({
    status: overallStatus,
    totalLatencyMs: Date.now() - start,
    checks,
    timestamp: new Date().toISOString(),
    version: process.env["npm_package_version"] ?? "unknown",
  });
});

export default router;
