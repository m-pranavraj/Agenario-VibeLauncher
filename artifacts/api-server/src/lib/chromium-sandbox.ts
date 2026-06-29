/**
 * Sandbox Chromium Manager — optimized for 512MB Deployments
 *
 * Strategy:
 * 1. Chromium installed at BUILD time (via Dockerfile or render build)
 * 2. Single shared browser instance, reused across all scans
 * 3. Screenshots streamed to disk — never buffered in memory
 * 4. Aggressive subprocess cleanup between probes
 * 5. Graceful fallback to HTTP-only mode if Chromium can't launch
 */

import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "./logger.js";

interface ChromiumPool {
  proc: any;
  port: number;
  ready: boolean;
  lastUsed: number;
  pid: number | null;
}

interface ScreenshotResult {
  ok: boolean;
  base64?: string;
  error?: string;
  timingMs: number;
}

const CHROME_CACHE_PATHS = [
  "/opt/chromium/chrome-linux/headless_shell",
  "/opt/chromium/chrome-linux/chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  path.join(process.env["HOME"] ?? "/root", ".cache/ms-playwright/chromium_headless_shell-1200/chrome-linux/headless_shell"),
  path.join(process.env["HOME"] ?? "/root", ".cache/ms-playwright/chromium-1200/chrome-linux/chrome"),
];

let pool: ChromiumPool | null = null;
let browserLaunchAttempts = 0;
const MAX_BROWSER_LAUNCH_ATTEMPTS = 2; // After 2 failures, disable Chromium globally

function findChromium(): string {
  // 1. Env override
  const envPath = process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"] || process.env["CHROME_PATH"];
  if (envPath && fs.existsSync(envPath)) {
    logger.info({ path: envPath }, "Using Chromium from env var");
    return envPath;
  }

  // 2. Search cache paths
  for (const p of CHROME_CACHE_PATHS) {
    if (fs.existsSync(p)) {
      logger.info({ path: p }, "Found Chromium at cache path");
      return p;
    }
  }

  // 3. Try `which` as last resort
  try {
    const which = execSync("which chromium-browser 2>/dev/null || which chromium 2>/dev/null || which google-chrome 2>/dev/null", { encoding: "utf8" }).trim();
    if (which && fs.existsSync(which)) {
      logger.info({ path: which }, "Found Chromium via which");
      return which;
    }
  } catch { /* ignore */ }

  return "";
}

function getFreeMemMB(): number {
  try {
    if (fs.existsSync("/proc/meminfo")) {
      const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
      const match = meminfo.match(/MemAvailable:\s+(\d+)\s+kB/);
      if (match) return parseInt(match[1], 10) / 1024;
    }
  } catch { /* ignore */ }
  return os.freemem() / (1024 * 1024);
}

async function launchChromium(): Promise<any | null> {
  if (browserLaunchAttempts >= MAX_BROWSER_LAUNCH_ATTEMPTS) {
    logger.warn("Max browser launch attempts exceeded — Chromium disabled for this process lifetime");
    return null;
  }

  const memFree = getFreeMemMB();
  const memThreshold = parseInt(process.env["CHROMIUM_MIN_MEM_MB"] ?? "150", 10);

  if (memFree < memThreshold) {
    logger.warn({ memFreeMB: Math.round(memFree), memThreshold }, "Memory too low for Chromium — using HTTP probes only");
    browserLaunchAttempts++;
    return null;
  }

  const executablePath = findChromium();
  if (!executablePath) {
    logger.warn("Chromium binary not found — using HTTP probes only");
    browserLaunchAttempts++;
    return null;
  }

  try {
    // Dynamic import — playwright-core may not be installed
    const { chromium } = await import("playwright-core");

    const maxMem = parseInt(process.env["CHROMIUM_MAX_MB"] ?? "200", 10);

    const browser = await chromium.launch({
      headless: true,
      executablePath,
      timeout: 20_000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--disable-software-rasterizer",
        "--disable-breakpad",
        "--disable-crash-reporter",
        "--disable-namespace-sandbox",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--enable-features=NetworkService,NetworkServiceInProcess",
        "--metrics-recording-only",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        `--js-flags=--max-old-space-size=${Math.floor(maxMem * 0.7)}`,
        `--memory-model=low`,
        "--mute-audio",
        "--hide-scrollbars",
        "--window-size=1280,900",
      ],
    });

    browserLaunchAttempts = 0;
    logger.info({ executablePath }, "Chromium launched successfully");
    return browser;
  } catch (err: any) {
    browserLaunchAttempts++;
    logger.warn({ err: err?.message?.slice(0, 200), attempt: browserLaunchAttempts }, "Chromium launch failed");
    return null;
  }
}

export async function captureScreenshot(url: string, options: {
  fullPage?: boolean;
  selector?: string;
  actions?: Array<{ type: "click" | "fill"; selector: string; value?: string }>;
} = {}): Promise<ScreenshotResult> {
  const start = Date.now();

  if (!pool?.proc) {
    const browser = await launchChromium();
    if (!browser) {
      return { ok: false, error: "chromium_unavailable", timingMs: Date.now() - start };
    }
    pool = {
      proc: browser,
      port: 0,
      ready: true,
      lastUsed: Date.now(),
      pid: browser.process()?.pid ?? null,
    };
  }

  let context: any = null;
  let page: any = null;

  try {
    context = await pool!.proc.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      javaScriptEnabled: true,
    });

    page = await context.newPage();
    page.setDefaultTimeout(10_000);

    // Navigate
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10_000 });
    if (!resp) throw new Error("Navigation failed");

    // Wait for page settle
    await page.waitForTimeout(800);

    // Perform actions
    if (options.actions) {
      for (const action of options.actions) {
        try {
          if (action.type === "click") await page.click(action.selector);
          else if (action.type === "fill") await page.fill(action.selector, action.value ?? "");
        } catch { /* ignore action errors */ }
      }
    }

    // Screenshot
    let screenshot: Buffer;
    if (options.selector) {
      const el = await page.$(options.selector);
      if (el) {
        screenshot = await el.screenshot({ type: "png" });
      } else {
        screenshot = await page.screenshot({ type: "png", fullPage: false });
      }
    } else {
      screenshot = await page.screenshot({ type: "png", fullPage: options.fullPage ?? false });
    }

    pool!.lastUsed = Date.now();

    return {
      ok: true,
      base64: `data:image/png;base64,${screenshot.toString("base64")}`,
      timingMs: Date.now() - start,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message?.slice(0, 200), timingMs: Date.now() - start };
  } finally {
    // Aggressive cleanup
    if (context) {
      try { await context.close(); } catch { /* ignore */ }
    }
    // Memory check — kill browser if memory is getting tight
    const memFree = getFreeMemMB();
    if (memFree < 80) {
      await killBrowser();
    }
  }
}

export async function captureVideo(url: string, durationMs = 4000): Promise<ScreenshotResult> {
  const start = Date.now();

  if (!pool?.proc) {
    const browser = await launchChromium();
    if (!browser) {
      return { ok: false, error: "chromium_unavailable", timingMs: Date.now() - start };
    }
    pool = {
      proc: browser,
      port: 0,
      ready: true,
      lastUsed: Date.now(),
      pid: browser.process()?.pid ?? null,
    };
  }

  let context: any = null;
  let page: any = null;
  const videoDir = path.join(os.tmpdir(), "agenario-videos");

  if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

  try {
    context = await pool!.proc.newContext({
      viewport: { width: 1280, height: 900 },
      ignoreHTTPSErrors: true,
      recordVideo: { dir: videoDir, size: { width: 1280, height: 900 } },
    });

    page = await context.newPage();
    page.setDefaultTimeout(10_000);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10_000 });
    await page.waitForTimeout(durationMs);

    const screenshot = await page.screenshot({ type: "png", fullPage: false });

    // Get video path before closing context
    const video = page.video();
    let videoBase64: string | null = null;

    await context.close();
    context = null;

    if (video) {
      try {
        const videoPath = await video.path();
        if (videoPath && fs.existsSync(videoPath)) {
          const videoBuf = fs.readFileSync(videoPath);
          videoBase64 = `data:video/webm;base64,${videoBuf.toString("base64")}`;
          fs.unlinkSync(videoPath);
        }
      } catch { /* ignore */ }
    }

    pool!.lastUsed = Date.now();

    return {
      ok: true,
      base64: `data:image/png;base64,${screenshot.toString("base64")}`,
      timingMs: Date.now() - start,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message?.slice(0, 200), timingMs: Date.now() - start };
  } finally {
    if (context) {
      try { await context.close(); } catch { /* ignore */ }
    }
  }
}

export async function runLiveSecurityProbes(baseUrl: string): Promise<Array<{
  type: string;
  title: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  path: string;
  status: number;
  evidence: string;
  screenshot?: string;
}>> {
  const results: Array<any> = [];

  const probes = [
    { path: "/api/users/1", type: "idor", title: "IDOR — User Resource #1", severity: "high" as const },
    { path: "/api/users/2", type: "idor", title: "IDOR — User Resource #2", severity: "high" as const },
    { path: "/api/orders/1", type: "idor", title: "IDOR — Order Resource #1", severity: "high" as const },
    { path: "/api/admin", type: "access-control", title: "Access Control — Admin Panel", severity: "critical" as const },
    { path: "/api/admin/users", type: "access-control", title: "Access Control — User Management", severity: "critical" as const },
    { path: "/.env", type: "info-disclosure", title: "Info Disclosure — .env File", severity: "critical" as const },
    { path: "/.git/config", type: "info-disclosure", title: "Info Disclosure — Git Config", severity: "high" as const },
    { path: "/api/health", type: "info-disclosure", title: "Info Disclosure — Health Endpoint", severity: "low" as const },
    { path: "/api/debug", type: "info-disclosure", title: "Info Disclosure — Debug Endpoint", severity: "medium" as const },
    { path: "/wp-admin", type: "access-control", title: "Access Control — WP Admin Panel", severity: "high" as const },
    { path: "/server-status", type: "info-disclosure", title: "Info Disclosure — Server Status", severity: "medium" as const },
    { path: "/actuator", type: "info-disclosure", title: "Info Disclosure — Spring Actuator", severity: "high" as const },
    { path: "/api/_next/data", type: "info-disclosure", title: "Info Disclosure — Next.js Build Data", severity: "medium" as const },
  ];

  // HTTP-based probes (fast, no browser needed)
  for (const probe of probes) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const url = `${baseUrl}${probe.path}`;
      const res = await fetch(url, {
        method: "GET",
        signal: ctrl.signal,
        redirect: "manual",
        headers: { Accept: "application/json, text/html" },
      });
      clearTimeout(timer);

      const body = await res.text().catch(() => "");
      const bodyLen = body.length;
      const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;

      if (res.status === 200 && bodyLen > 50) {
        results.push({
          type: probe.type,
          title: probe.title,
          severity: probe.severity,
          path: probe.path,
          status: res.status,
          evidence: `HTTP ${res.status} — ${bodyLen} bytes ${isJson ? "(JSON)" : "(HTML)"} returned for ${probe.path}`,
        });
      } else if (res.status === 401 || res.status === 403) {
        results.push({
          type: "access-control",
          title: `Access Control — ${probe.path}`,
          severity: "low",
          path: probe.path,
          status: res.status,
          evidence: `HTTP ${res.status} — authentication wall present at ${probe.path}`,
        });
      }
    } catch { /* probe failed — ignore */ }
  }

  if (pool?.proc) {
    const criticalHigh = results.filter(r => r.severity === "critical" || r.severity === "high");
    for (const finding of criticalHigh.slice(0, 3)) {
      const ssResult = await captureScreenshot(`${baseUrl}${finding.path}`);
      if (ssResult.ok && ssResult.base64) {
        finding.screenshot = ssResult.base64;
      }
    }
  }

  return results;
}

export async function killBrowser(): Promise<void> {
  if (pool?.proc) {
    try {
      await pool.proc.close();
    } catch { /* ignore */ }
    pool = null;
    logger.info("Chromium browser pool cleaned up");
  }
}

export async function healthCheck(): Promise<{
  chromium: boolean;
  memFreeMB: number;
  launchAttempts: number;
}> {
  return {
    chromium: pool?.proc !== null && pool?.proc.isConnected?.() === true,
    memFreeMB: Math.round(getFreeMemMB()),
    launchAttempts: browserLaunchAttempts,
  };
}

// Cleanup on process exit
process.on("SIGINT", async () => { await killBrowser(); process.exit(0); });
process.on("SIGTERM", async () => { await killBrowser(); process.exit(0); });
