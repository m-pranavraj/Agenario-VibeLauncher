/**
 * Deployment-Ready Chromium Sandbox Manager
 *
 * Solves the "no Chromium on server" problem by:
 * 1. Downloading Chromium at build/startup time (not bundled in repo)
 * 2. Caching it in a persistent location
 * 3. Memory-efficient: single browser, multiple contexts, aggressive cleanup
 * 4. Works on Render, Railway, Fly.io, VPS, Docker — anywhere
 *
 * Usage:
 *   const mgr = new ChromiumManager();
 *   await mgr.init();
 *   const screenshot = await mgr.captureScreenshot('http://localhost:3000');
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "./logger.js";

export interface ScreenshotResult {
  ok: boolean;
  base64: string | null;
  videoBase64: string | null;
  error: string | null;
  timing: {
    launchMs: number;
    navigateMs: number;
    screenshotMs: number;
    totalMs: number;
  };
}

export interface ChromiumManagerOptions {
  /** Where to store the Chromium binary cache */
  cacheDir?: string;
  /** Max memory for Chromium in MB */
  maxMemoryMB?: number;
  /** Whether to download Chromium if not found */
  autoDownload?: boolean;
  /** Viewport size */
  viewport?: { width: number; height: number };
}

export class ChromiumManager {
  private browser: any = null;
  private options: Required<ChromiumManagerOptions>;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(options: ChromiumManagerOptions = {}) {
    this.options = {
      cacheDir: options.cacheDir || path.join(os.tmpdir(), ".agenario-chromium"),
      maxMemoryMB: options.maxMemoryMB || 256,
      autoDownload: options.autoDownload !== false,
      viewport: options.viewport || { width: 1280, height: 900 },
    };
  }

  /**
   * Initialize Chromium. Safe to call multiple times — only runs once.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInit();
    await this.initPromise;
    this.initialized = true;
  }

  private async _doInit(): Promise<void> {
    // Ensure cache dir exists
    if (!fs.existsSync(this.options.cacheDir)) {
      fs.mkdirSync(this.options.cacheDir, { recursive: true });
    }

    // Try to find existing Chromium
    const executablePath = await this._findChromium();

    if (!executablePath) {
      if (this.options.autoDownload) {
        logger.info("Chromium not found — downloading...");
        await this._downloadChromium();
      } else {
        logger.warn("Chromium not found and autoDownload disabled");
        return;
      }
    }

    await this._launchBrowser();
  }

  /**
   * Find Chromium binary on the system or in cache.
   */
  private async _findChromium(): Promise<string | null> {
    // 1. Check env var override
    if (process.env["CHROMIUM_PATH"] && fs.existsSync(process.env["CHROMIUM_PATH"])) {
      return process.env["CHROMIUM_PATH"];
    }

    // 2. Check common system paths
    const systemPaths = [
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/microsoft-edge",
      "/usr/bin/microsoft-edge-stable",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      path.join(os.homedir(), ".cache", "ms-playwright", "chromium-1200", "chrome-linux", "chrome"),
      path.join(os.homedir(), ".cache", "ms-playwright", "chromium_headless_shell-1200", "chrome-linux", "headless_shell"),
    ];

    for (const p of systemPaths) {
      if (fs.existsSync(p)) {
        logger.info({ path: p }, "Found Chromium at system path");
        return p;
      }
    }

    // 3. Check Playwright cache
    const pwCacheDir = path.join(os.homedir(), ".cache", "ms-playwright");
    if (fs.existsSync(pwCacheDir)) {
      const versions = fs.readdirSync(pwCacheDir);
      for (const v of versions.sort().reverse()) {
        const candidates = [
          path.join(pwCacheDir, v, "chrome-linux", "chrome"),
          path.join(pwCacheDir, v, "chrome-linux", "headless_shell"),
          path.join(pwCacheDir, v, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            logger.info({ path: c }, "Found Chromium in Playwright cache");
            return c;
          }
        }
      }
    }

    // 4. Check our own cache
    const ourCache = path.join(this.options.cacheDir, "chrome");
    if (fs.existsSync(ourCache)) {
      return ourCache;
    }

    return null;
  }

  /**
   * Download Chromium using npx playwright install.
   */
  private async _downloadChromium(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = 120_000; // 2 minutes
      const timer = setTimeout(() => {
        reject(new Error("Chromium download timed out"));
      }, timeout);

      const proc = spawn("npx", ["playwright", "install", "chromium"], {
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) {
          logger.info("Chromium downloaded successfully");
          resolve();
        } else {
          reject(new Error(`Chromium download failed (code ${code}): ${stderr.slice(-500)}`));
        }
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        reject(new Error(`Could not spawn playwright install: ${err.message}`));
      });
    });
  }

  /**
   * Launch the browser with memory-efficient settings.
   */
  private async _launchBrowser(): Promise<void> {
    const executablePath = await this._findChromium();

    // Dynamic import — playwright-core is optional
    const { chromium } = await import("playwright-core");

    const isProduction = process.env["NODE_ENV"] === "production";

    const launchArgs = [
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      "--metrics-recording-only",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      `--js-flags=--max-old-space-size=${this.options.maxMemoryMB}`,
      `--memory-model=low`,
      "--mute-audio",
      "--hide-scrollbars",
    ];

    // Sandbox flags: only in dev or containerized environments
    if (!isProduction || process.env["SANDBOX_IN_DOCKER"] === "true") {
      launchArgs.push("--no-sandbox", "--disable-setuid-sandbox");
    }

    this.browser = await chromium.launch({
      headless: true,
      executablePath: executablePath ?? undefined,
      args: launchArgs,
      timeout: 30_000,
    });

    logger.info({ executablePath }, "Chromium launched successfully");

    // Cleanup on exit
    const cleanup = async () => {
      if (this.browser) {
        try { await this.browser.close(); } catch { /* ignore */ }
      }
    };
    process.once("SIGINT", cleanup);
    process.once("SIGTERM", cleanup);
    process.once("exit", cleanup);
  }

  /**
   * Capture a real screenshot of a URL.
   * Creates a fresh context per call for isolation.
   */
  async captureScreenshot(url: string, options: {
    fullPage?: boolean;
    waitFor?: string;
    waitForMs?: number;
    actions?: Array<{ type: "click" | "fill" | "screenshot"; selector?: string; value?: string }>;
  } = {}): Promise<ScreenshotResult> {
    const timing = { launchMs: 0, navigateMs: 0, screenshotMs: 0, totalMs: 0 };
    const startTotal = Date.now();

    if (!this.browser) {
      return { ok: false, base64: null, videoBase64: null, error: "Browser not initialized", timing };
    }

    let context: any = null;
    let page: any = null;
    let videoPath: string | null = null;

    try {
      const videoDir = path.join(os.tmpdir(), "agenario-videos");
      if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

      // Create isolated context with video recording
      context = await this.browser.newContext({
        viewport: this.options.viewport,
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        ignoreHTTPSErrors: true,
        recordVideo: { dir: videoDir, size: this.options.viewport },
      });

      page = await context.newPage();
      page.setDefaultTimeout(15_000);

      // Navigate
      const startNav = Date.now();
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
      timing.navigateMs = Date.now() - startNav;

      // Wait for specific selector if requested
      if (options.waitFor) {
        try {
          await page.waitForSelector(options.waitFor, { timeout: 5_000 });
        } catch { /* selector not found, continue */ }
      }

      // Wait extra time if requested
      if (options.waitForMs) {
        await page.waitForTimeout(Math.min(options.waitForMs, 5000));
      }

      // Perform actions if requested
      if (options.actions) {
        for (const action of options.actions) {
          if (action.type === "click" && action.selector) {
            await page.click(action.selector).catch(() => {});
          } else if (action.type === "fill" && action.selector && action.value) {
            await page.fill(action.selector, action.value).catch(() => {});
          } else if (action.type === "screenshot") {
            // Intermediate screenshot
          }
        }
      }

      // Capture screenshot
      const startScreenshot = Date.now();
      const buf = await page.screenshot({
        type: "png",
        fullPage: options.fullPage || false,
      });
      timing.screenshotMs = Date.now() - startScreenshot;

      timing.totalMs = Date.now() - startTotal;

      // Get video if recorded
      let videoBase64: string | null = null;
      const video = page.video();
      if (video) {
        try {
          videoPath = await video.path();
          if (videoPath && fs.existsSync(videoPath)) {
            const videoBuf = fs.readFileSync(videoPath);
            videoBase64 = `data:video/webm;base64,${videoBuf.toString("base64")}`;
            // Clean up video file
            fs.unlinkSync(videoPath);
          }
        } catch { /* video not available */ }
      }

      return {
        ok: true,
        base64: `data:image/png;base64,${buf.toString("base64")}`,
        videoBase64,
        error: null,
        timing,
      };
    } catch (err: any) {
      timing.totalMs = Date.now() - startTotal;
      return {
        ok: false,
        base64: null,
        videoBase64: null,
        error: err?.message ?? String(err),
        timing,
      };
    } finally {
      // Aggressive cleanup
      if (context) {
        try { await context.close(); } catch { /* ignore */ }
      }
    }
  }

  /**
   * Run a full security probe against a URL.
   * Returns real browser-based evidence.
   */
  async runSecurityProbes(baseUrl: string): Promise<Array<{
    type: string;
    title: string;
    severity: string;
    evidence: string;
    screenshot: string | null;
  }>> {
    const results: Array<any> = [];

    if (!this.browser) return results;

    const probes = [
      { path: "/api/users/1", type: "idor", title: "IDOR — User Resource Access" },
      { path: "/api/orders/1", type: "idor", title: "IDOR — Order Resource Access" },
      { path: "/api/admin", type: "access-control", title: "Access Control — Admin Endpoint" },
      { path: "/.env", type: "info-disclosure", title: "Info Disclosure — .env File" },
      { path: "/.git/config", type: "info-disclosure", title: "Info Disclosure — Git Config" },
      { path: "/api/health", type: "info-disclosure", title: "Info Disclosure — Health Endpoint" },
    ];

    for (const probe of probes) {
      let context: any = null;
      let page: any = null;
      try {
        context = await this.browser.newContext({
          viewport: this.options.viewport,
          ignoreHTTPSErrors: true,
        });
        page = await context.newPage();
        page.setDefaultTimeout(8_000);

        const url = `${baseUrl}${probe.path}`;
        const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8_000 });
        const status = resp?.status() ?? 0;
        const content = await page.content().catch(() => "");

        // Take screenshot for interesting findings
        let screenshot: string | null = null;
        if (status === 200 && content.length > 100) {
          const buf = await page.screenshot({ type: "png" }).catch(() => null);
          if (buf) screenshot = `data:image/png;base64,${buf.toString("base64")}`;
        }

        results.push({
          type: probe.type,
          title: probe.title,
          severity: status === 200 ? "high" : "info",
          evidence: `HTTP ${status} — ${content.length} bytes returned for ${probe.path}`,
          screenshot,
        });
      } catch {
        // Probe failed — that's fine
      } finally {
        if (context) { try { await context.close(); } catch { /* ignore */ } }
      }
    }

    return results;
  }

  /**
   * Check if browser is available.
   */
  isAvailable(): boolean {
    return this.browser !== null && !this.browser.isClosed?.();
  }

  /**
   * Shutdown browser.
   */
  async shutdown(): Promise<void> {
    if (this.browser) {
      try { await this.browser.close(); } catch { /* ignore */ }
      this.browser = null;
      this.initialized = false;
      this.initPromise = null;
    }
  }
}

// Singleton instance
let _instance: ChromiumManager | null = null;

export function getChromiumManager(): ChromiumManager {
  if (!_instance) {
    _instance = new ChromiumManager();
  }
  return _instance;
}
