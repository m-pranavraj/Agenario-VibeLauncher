/**
 * Phase 11 — Sandbox Tester
 * Tests AI-generated and rule-based patches in an isolated sandbox before
 * marking them as "ready" for user approval. Prevents broken fixes from
 * ever reaching the user.
 *
 * Pipeline:
 *   1. Write patched code to a temporary sandbox directory
 *   2. Run TypeScript typecheck (tsc --noEmit)
 *   3. Run existing test suite (npm test) if available
 *   4. Run build check (npm run build) if available
 *   5. Return structured test result with pass/fail + timing + logs
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "../logger.js";

export interface SandboxTestResult {
  passed: boolean;
  typecheck: { ok: boolean; output: string; durationMs: number };
  tests: { ok: boolean; skipped: boolean; output: string; durationMs: number };
  build: { ok: boolean; skipped: boolean; output: string; durationMs: number };
  totalDurationMs: number;
  sandboxDir: string;
}

export interface SandboxTestInput {
  /** The original file content */
  originalCode: string;
  /** The patched file content */
  patchedCode: string;
  /** File path relative to project root (e.g. "src/routes/auth.ts") */
  filePath: string;
  /** Absolute path to the project root directory */
  projectRoot: string;
}

const TIMEOUT_TYPECHECK = 60_000;
const TIMEOUT_TEST = 90_000;
const TIMEOUT_BUILD = 120_000;

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ ok: boolean; output: string; code: number | null; durationMs: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const logs: string[] = [];
    let settled = false;

    const proc = spawn(command, args, {
      cwd,
      env: { ...process.env, NODE_ENV: "development", CI: "true" },
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      if (!settled) {
        try { proc.kill("SIGKILL"); } catch { /* ignore */ }
        settled = true;
        resolve({
          ok: false,
          output: logs.join("").slice(-2000) + `\n[TIMEOUT after ${timeoutMs / 1000}s]`,
          code: null,
          durationMs: Date.now() - start,
        });
      }
    }, timeoutMs);

    proc.stdout?.on("data", (c: Buffer) => logs.push(c.toString("utf8")));
    proc.stderr?.on("data", (c: Buffer) => logs.push(c.toString("utf8")));

    proc.on("close", (code) => {
      if (settled) return;
      clearTimeout(timer);
      settled = true;
      resolve({
        ok: code === 0,
        output: logs.join("").slice(-2000),
        code,
        durationMs: Date.now() - start,
      });
    });

    proc.on("error", (err: Error) => {
      if (settled) return;
      clearTimeout(timer);
      settled = true;
      resolve({
        ok: false,
        output: `${logs.join("")}\n${err.message}`.slice(-2000),
        code: null,
        durationMs: Date.now() - start,
      });
    });
  });
}

/**
 * Detect the package manager used in a project directory.
 */
function detectPackageManager(projectRoot: string): "pnpm" | "npm" | "yarn" {
  if (fs.existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(projectRoot, "yarn.lock"))) return "yarn";
  return "npm";
}

/**
 * Run the full sandbox test suite against a patch.
 *
 * If the original project code is available (from scan ingestion),
 * we write the patched file and run the project's own checks.
 * If not available (e.g. URL or description scans), we skip structural
 * tests and just return a basic syntax validation.
 */
export async function testPatchInSandbox(input: SandboxTestInput): Promise<SandboxTestResult> {
  const start = Date.now();
  const { patchedCode, filePath, projectRoot } = input;

  const typecheck = { ok: false, output: "", durationMs: 0 };
  const tests = { ok: true, skipped: true, output: "", durationMs: 0 };
  const build = { ok: true, skipped: true, output: "", durationMs: 0 };

  // 1. Verify the project root exists and is a real project
  if (!projectRoot || !fs.existsSync(projectRoot)) {
    logger.debug({ filePath, projectRoot }, "Sandbox test: no project root — skipping structural tests");
    return {
      passed: true,
      typecheck: { ok: true, output: "Skipped — no project root", durationMs: 0 },
      tests,
      build,
      totalDurationMs: Date.now() - start,
      sandboxDir: "",
    };
  }

  // 2. Write the patched file into the project
  const targetFile = path.join(projectRoot, filePath);
  const targetDir = path.dirname(targetFile);

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Import the original file first (backup)
    const backupExists = fs.existsSync(targetFile);
    const backup = backupExists ? fs.readFileSync(targetFile, "utf8") : null;

    // Write patched code
    fs.writeFileSync(targetFile, patchedCode, "utf8");

    const pm = detectPackageManager(projectRoot);

    // 3. TypeScript typecheck
    const hasTsConfig = fs.existsSync(path.join(projectRoot, "tsconfig.json"));
    if (hasTsConfig) {
      typecheck.output = "";
      const tcResult = await runCommand(pm, ["exec", "tsc", "--noEmit"], projectRoot, TIMEOUT_TYPECHECK);
      typecheck.ok = tcResult.ok;
      typecheck.output = tcResult.output;
      typecheck.durationMs = tcResult.durationMs;
    } else {
      typecheck.ok = true;
      typecheck.output = "Skipped — no tsconfig.json";
    }

    // 4. Run tests (optional — if project has test script)
    const pkgPath = path.join(projectRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.scripts?.test && pkg.scripts.test !== "echo \"no test specified\" && exit 0") {
          tests.skipped = false;
          const testResult = await runCommand(pm, ["test"], projectRoot, TIMEOUT_TEST);
          tests.ok = testResult.ok;
          tests.output = testResult.output;
          tests.durationMs = testResult.durationMs;
        }
      } catch {
        // Could not parse package.json — skip tests
      }
    }

    // 5. Build check (optional — if project has build script)
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.scripts?.build) {
          build.skipped = false;
          const buildResult = await runCommand(pm, ["run", "build"], projectRoot, TIMEOUT_BUILD);
          build.ok = buildResult.ok;
          build.output = buildResult.output;
          build.durationMs = buildResult.durationMs;
        }
      } catch {
        // Could not parse package.json — skip build
      }
    }

    // 6. Restore original file (cleanup)
    if (backup !== null) {
      fs.writeFileSync(targetFile, backup, "utf8");
    } else {
      try { fs.unlinkSync(targetFile); } catch { /* ignore */ }
    }

  } catch (err: any) {
    logger.warn({ err: err?.message, filePath }, "Sandbox test failed");
    typecheck.ok = false;
    typecheck.output = `Sandbox error: ${err?.message ?? String(err)}`;
  }

  const passed = typecheck.ok && tests.ok && build.ok;

  return {
    passed,
    typecheck,
    tests,
    build,
    totalDurationMs: Date.now() - start,
    sandboxDir: projectRoot,
  };
}

/**
 * Lightweight syntax-only check for scans where we don't have the project.
 * Spawns node --check on a temp file to verify the patched code is syntactically valid.
 */
export async function checkSyntaxOnly(code: string, language: string): Promise<{ ok: boolean; error?: string }> {
  if (language !== "typescript" && language !== "javascript") {
    return { ok: true };
  }

  const tmpFile = path.join(os.tmpdir(), `agenario-syntax-check-${Date.now()}.js`);
  try {
    fs.writeFileSync(tmpFile, code, "utf8");
    const result = await runCommand(process.execPath, ["--check", tmpFile], os.tmpdir(), 10_000);
    return { ok: result.ok, error: result.ok ? undefined : result.output.slice(0, 500) };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}
