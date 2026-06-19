/**
 * Low-level process management for GitHubbox sandbox — spawn, health checks, teardown.
 */

import { spawn, type ChildProcess, execSync } from "child_process";
import net from "net";
import os from "os";

const isWindows = process.platform === "win32";

export interface ManagedProcess {
  proc: ChildProcess;
  port: number;
  logs: string[];
}

export async function findAvailablePort(preferred = 0): Promise<number> {
  if (preferred > 0) {
    const free = await isPortFree(preferred);
    if (free) return preferred;
  }

  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close(() => reject(new Error("Could not allocate port")));
        return;
      }
      const port = addr.port;
      server.close(() => resolve(port));
    });
  });
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

export function spawnManagedProcess(
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string>,
): ManagedProcess {
  const logs: string[] = [];
  const proc = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    shell: isWindows,
    detached: !isWindows,
  });

  const append = (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    logs.push(text);
    if (logs.length > 200) logs.shift();
  };

  proc.stdout?.on("data", append);
  proc.stderr?.on("data", append);

  const port = Number(env["PORT"] ?? env["SANDBOX_PORT"] ?? 0);
  return { proc, port, logs };
}

export async function waitForHttpReady(
  url: string,
  timeoutMs: number,
  intervalMs = 1500,
): Promise<{ ok: boolean; status: number; attempts: number }> {
  const deadline = Date.now() + timeoutMs;
  let attempts = 0;

  while (Date.now() < deadline) {
    attempts += 1;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4_000);
      const res = await fetch(url, { signal: ctrl.signal, redirect: "manual" });
      clearTimeout(timer);
      if (res.status > 0 && res.status < 600) {
        return { ok: true, status: res.status, attempts };
      }
    } catch {
      /* retry */
    }
    await sleep(intervalMs);
  }

  return { ok: false, status: 0, attempts };
}

export async function killManagedProcess(managed: ManagedProcess): Promise<void> {
  const { proc } = managed;
  if (!proc.pid) return;

  try {
    if (isWindows) {
      execSync(`taskkill /PID ${proc.pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-proc.pid, "SIGTERM");
      await sleep(500);
      try {
        process.kill(-proc.pid, "SIGKILL");
      } catch {
        /* already dead */
      }
    }
  } catch {
    try {
      proc.kill("SIGKILL");
    } catch {
      /* ignore */
    }
  }
}

export async function runShellCommand(
  command: string,
  cwd: string,
  timeoutMs: number,
  env: Record<string, string> = {},
): Promise<{ ok: boolean; output: string; code: number | null }> {
  return new Promise((resolve) => {
    const logs: string[] = [];
    const proc = spawn(command, {
      cwd,
      env: { ...process.env, ...env, CI: "true", NODE_ENV: "development" },
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, timeoutMs);

    proc.stdout?.on("data", (c) => logs.push(c.toString()));
    proc.stderr?.on("data", (c) => logs.push(c.toString()));

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, output: logs.join("").slice(-12_000), code });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, output: `${logs.join("")}\n${err.message}`.slice(-12_000), code: null });
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function buildStartInvocation(
  pm: "pnpm" | "npm" | "yarn",
  scriptName: string,
  port: number,
): { command: string; args: string[]; env: Record<string, string> } {
  const env: Record<string, string> = {
    PORT: String(port),
    HOST: "127.0.0.1",
    HOSTNAME: "127.0.0.1",
    BROWSER: "none",
    CI: "true",
    NODE_ENV: "development",
  };

  if (pm === "pnpm") {
    return { command: "pnpm", args: ["run", scriptName], env };
  }
  if (pm === "yarn") {
    return { command: "yarn", args: [scriptName], env };
  }
  return { command: "npm", args: ["run", scriptName], env };
}
