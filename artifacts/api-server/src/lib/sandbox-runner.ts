/**
 * GitHubbox — production sandbox runner.
 * Installs dependencies, starts the app on localhost, runs live proof probes,
 * and returns honest eligibility/failure metadata.
 */

import { logger } from "./logger.js";
import type { ProofEvidence, LaunchReplayStep, SandboxMeta } from "@workspace/db/schema";
import { assessSandboxEligibility, type SandboxEligibility } from "./sandbox-eligibility.js";
import {
  buildStartInvocation,
  findAvailablePort,
  killManagedProcess,
  runShellCommand,
  spawnManagedProcess,
  waitForHttpReady,
  type ManagedProcess,
} from "./sandbox-process.js";
import { runLiveUrlProofs, captureSandboxLaunchProof } from "./playwright-proof.js";

export type { SandboxMeta };

export interface SandboxRunResult {
  meta: SandboxMeta;
  proofs: ProofEvidence[];
  steps: LaunchReplayStep[];
}

const INSTALL_TIMEOUT = Number(process.env["SANDBOX_INSTALL_TIMEOUT_MS"] ?? 120_000);
const START_TIMEOUT = Number(process.env["SANDBOX_START_TIMEOUT_MS"] ?? 90_000);
const TOTAL_TIMEOUT = Number(process.env["SANDBOX_TIMEOUT_MS"] ?? 240_000);

function step(label: string, status: LaunchReplayStep["status"], detail?: string): LaunchReplayStep {
  return { step: label, status, detail };
}

export async function runGithubboxSandbox(opts: {
  scanId: number;
  dir: string;
  packageJson: Record<string, unknown>;
  framework: string;
  sourceType: string;
}): Promise<SandboxRunResult> {
  const started = Date.now();
  const steps: LaunchReplayStep[] = [];
  const { scanId, dir, packageJson, framework, sourceType } = opts;

  if (sourceType !== "github" && sourceType !== "zip") {
    return {
      meta: {
        status: "skipped",
        reason: "Sandbox execution applies only to GitHub repositories and uploaded ZIP archives.",
      },
      proofs: [],
      steps: [step("Sandbox pre-flight", "warning", "Skipped — not a file-based source")],
    };
  }

  const eligibility = assessSandboxEligibility(dir, packageJson, framework);
  if (!eligibility.eligible) {
    logger.info({ scanId, reason: eligibility.reason }, "Sandbox ineligible");
    return {
      meta: {
        status: "ineligible",
        reason: eligibility.reason,
        blockers: eligibility.blockers,
      },
      proofs: [],
      steps: [
        step("Sandbox eligibility check", "fail", eligibility.reason),
        ...eligibility.blockers.map((b) => step(`Blocker: ${b}`, "fail")),
      ],
    };
  }

  steps.push(step("Sandbox eligibility check", "ok", eligibility.reason));

  let managed: ManagedProcess | null = null;

  try {
    if (Date.now() - started > TOTAL_TIMEOUT) {
      throw new Error("Sandbox total timeout exceeded before install");
    }

    const installCmd = eligibility.installCommand!;

    const installResult = await runShellCommand(installCmd, dir, INSTALL_TIMEOUT, {
      NODE_ENV: "development",
    });

    if (!installResult.ok) {
      const reason =
        "Dependency install failed — this repository is not eligible for live sandbox execution. Check package.json scripts and lockfile compatibility.";
      return {
        meta: {
          status: "failed",
          reason,
          blockers: ["install_failed"],
          installCommand: installCmd,
          installLog: installResult.output,
          elapsedMs: Date.now() - started,
        },
        proofs: [],
        steps: [
          ...steps,
          step("Install dependencies", "fail", installResult.output.slice(-500) || "Install exited non-zero"),
        ],
      };
    }

    steps.push(step("Install dependencies", "ok", "Dependencies resolved successfully"));

    let auditLog: any = null;
    let auditVulnCount = 0;
    try {
      const pm = eligibility.packageManager!;
      const auditCmd = pm === "npm" ? "npm audit --json" : pm === "pnpm" ? "pnpm audit --json" : "yarn audit --json";
      const auditResult = await runShellCommand(auditCmd, dir, 30_000, { NODE_ENV: "development" });
      try {
        const parsed = JSON.parse(auditResult.output);
        auditLog = parsed;
        if (pm === "npm") {
          auditVulnCount = Object.keys(parsed.vulnerabilities || {}).length;
        } else if (pm === "pnpm") {
          auditVulnCount = (parsed.vulnerabilities ? Object.values(parsed.vulnerabilities).reduce((a: any, b: any) => Number(a) + Number(b), 0) : 0) as number;
        } else {
          auditVulnCount = (parsed.metadata?.vulnerabilities ? Object.values(parsed.metadata.vulnerabilities).reduce((a: any, b: any) => Number(a) + Number(b), 0) : 0) as number;
        }
      } catch (e) {}
    } catch (e) {
      logger.warn({ err: e, scanId }, "Sandbox audit failed");
    }

    const port = await findAvailablePort(eligibility.portHint ?? 3000);
    const pm = eligibility.packageManager!;
    const scriptName = eligibility.startScript!;
    const start = buildStartInvocation(pm, scriptName, port);

    steps.push(
      step(
        "Launch dev server",
        "ok",
        `${pm} run ${scriptName} on 127.0.0.1:${port}`,
      ),
    );

    managed = spawnManagedProcess(start.command, start.args, dir, start.env);
    const localUrl = `http://127.0.0.1:${port}`;

    const ready = await waitForHttpReady(localUrl, START_TIMEOUT);
    if (!ready.ok) {
      const serverLog = managed.logs.join("").slice(-2000);
      await killManagedProcess(managed);
      managed = null;

      const reason =
        "Dev server did not become reachable within the sandbox timeout. This repo may require environment variables, a database, or a custom start command not supported by GitHubbox.";
      return {
        meta: {
          status: "failed",
          reason,
          blockers: ["server_start_timeout"],
          localUrl,
          port,
          startCommand: eligibility.startCommand,
          serverLog,
          elapsedMs: Date.now() - started,
        },
        proofs: [],
        steps: [
          ...steps,
          step("Launch dev server", "fail", `No HTTP response on ${localUrl} after ${START_TIMEOUT / 1000}s`),
        ],
      };
    }

    steps.push(
      step("Health check", "ok", `HTTP ${ready.status} from ${localUrl} (${ready.attempts} attempts)`),
    );

    const proofs: ProofEvidence[] = [];

    const launchProof = await captureSandboxLaunchProof(localUrl, {
      framework,
      startCommand: `${pm} run ${scriptName}`,
      port,
      httpStatus: ready.status,
    }).catch((err) => {
      logger.warn({ err, scanId }, "Sandbox launch screenshot failed");
      return null;
    });

    if (launchProof) {
      proofs.push(launchProof);
      steps.push(step("Capture launch screenshot", "ok", "Real Chromium screenshot captured"));
    } else {
      steps.push(step("Capture launch screenshot", "warning", "Browser unavailable — HTTP probes still ran"));
    }

    const liveProofs = await runLiveUrlProofs(localUrl);
    proofs.push(...liveProofs);
    steps.push(step("Run live security probes", "ok", `${liveProofs.length} runtime proof(s) collected`));

    return {
      meta: {
        status: "completed",
        reason: "GitHubbox sandbox executed successfully — live runtime proofs captured against localhost.",
        localUrl,
        port,
        startCommand: eligibility.startCommand,
        installCommand: installCmd,
        packageManager: pm,
        httpStatus: ready.status,
        elapsedMs: Date.now() - started,
        serverLog: managed.logs.join("").slice(-1500),
      },
      proofs,
      steps,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, scanId }, "GitHubbox sandbox failed");
    return {
      meta: {
        status: "failed",
        reason: `Sandbox execution error: ${message}`,
        elapsedMs: Date.now() - started,
      },
      proofs: [],
      steps: [...steps, step("Sandbox execution", "fail", message)],
    };
  } finally {
    if (managed) {
      await killManagedProcess(managed).catch(() => {});
    }
  }
}

/** Quick eligibility-only check (no install/run). */
export function getSandboxEligibility(
  dir: string,
  packageJson: Record<string, unknown>,
  framework: string,
): SandboxEligibility {
  return assessSandboxEligibility(dir, packageJson, framework);
}
