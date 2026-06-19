/**
 * GitHubbox sandbox eligibility — determines whether ingested code can be
 * built, served, and probed in an isolated local runtime.
 */

import fs from "fs";
import path from "path";

export type PackageManager = "pnpm" | "npm" | "yarn";

export interface SandboxEligibility {
  eligible: boolean;
  reason: string;
  blockers: string[];
  packageManager?: PackageManager;
  installCommand?: string;
  startCommand?: string;
  startScript?: string;
  portHint?: number;
  framework?: string;
}

const UNSUPPORTED_FRAMEWORKS = new Set([
  "flutter",
  "react-native-only",
  "expo-native-only",
  "python-django",
  "python-flask",
  "go",
  "rust",
  "java",
]);

const MAX_REPO_FILES = 8_000;
const MAX_PACKAGE_JSON_BYTES = 512_000;

function countFiles(dir: string, depth = 0): number {
  if (depth > 6 || !fs.existsSync(dir)) return 0;
  let count = 0;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) count += countFiles(full, depth + 1);
      else count += 1;
    }
  } catch {
    /* ignore */
  }
  return count;
}

function detectPackageManager(dir: string): PackageManager {
  if (fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(dir, "yarn.lock"))) return "yarn";
  return "npm";
}

function installCommandFor(pm: PackageManager, dir: string): string {
  if (pm === "pnpm") return "pnpm install --ignore-scripts --prefer-offline";
  if (pm === "yarn") return "yarn install --ignore-scripts --frozen-lockfile";
  if (fs.existsSync(path.join(dir, "package-lock.json"))) return "npm ci --ignore-scripts";
  return "npm install --ignore-scripts";
}

function resolveStartScript(
  scripts: Record<string, string> | undefined,
  framework: string,
): { script: string; command: string; portHint: number } | null {
  const order =
    framework === "node-api"
      ? ["dev", "start", "serve", "preview"]
      : ["dev", "start", "preview", "serve"];

  for (const name of order) {
    const cmd = scripts?.[name];
    if (cmd && !/electron|tauri|capacitor|expo start(?!.*web)/i.test(cmd)) {
      return { script: name, command: cmd, portHint: framework === "node-api" ? 8080 : 3000 };
    }
  }

  if (framework === "nextjs") {
    return { script: "dev", command: "next dev", portHint: 3000 };
  }
  if (["react", "vite", "svelte", "vue", "sveltekit", "astro"].includes(framework)) {
    return { script: "dev", command: "vite", portHint: 5173 };
  }
  if (framework === "remix") {
    return { script: "dev", command: "remix vite:dev", portHint: 5173 };
  }
  if (framework === "nuxt") {
    return { script: "dev", command: "nuxt dev", portHint: 3000 };
  }
  if (framework === "node-api") {
    return { script: "start", command: "node index.js", portHint: 8080 };
  }

  return null;
}

function isNativeMobileOnly(dir: string, pkg: Record<string, unknown>): boolean {
  const deps = {
    ...(pkg.dependencies as Record<string, unknown> | undefined),
    ...(pkg.devDependencies as Record<string, unknown> | undefined),
  };
  const hasExpo = Boolean(deps["expo"]);
  const hasWebScript = Boolean(
    (pkg.scripts as Record<string, string> | undefined)?.web ||
      (pkg.scripts as Record<string, string> | undefined)?.["start:web"],
  );
  if (hasExpo && !hasWebScript) return true;

  const hasAppJson = fs.existsSync(path.join(dir, "app.json")) || fs.existsSync(path.join(dir, "app.config.js"));
  const hasIndexHtml =
    fs.existsSync(path.join(dir, "index.html")) ||
    fs.existsSync(path.join(dir, "public/index.html")) ||
    fs.existsSync(path.join(dir, "src/index.html"));
  const hasPackageJson = fs.existsSync(path.join(dir, "package.json"));

  if (hasAppJson && !hasIndexHtml && !deps["next"] && !deps["vite"] && !deps["react"]) {
    return true;
  }

  if (!hasPackageJson) return false;
  return false;
}

function isPythonOrNonNodeRepo(dir: string): boolean {
  const markers = ["requirements.txt", "pyproject.toml", "Pipfile", "go.mod", "Cargo.toml", "pom.xml"];
  const hasNode = fs.existsSync(path.join(dir, "package.json"));
  if (!hasNode && markers.some((m) => fs.existsSync(path.join(dir, m)))) return true;
  return false;
}

export function assessSandboxEligibility(
  dir: string,
  packageJson: Record<string, unknown>,
  framework: string,
): SandboxEligibility {
  const blockers: string[] = [];

  if (process.env["VERCEL"] === "1" || process.env["SANDBOX_ENABLED"] === "false") {
    return {
      eligible: false,
      reason:
        "Sandbox execution is disabled in this deployment environment. Run scans on a worker with SANDBOX_ENABLED=true.",
      blockers: ["serverless_environment"],
    };
  }

  if (!fs.existsSync(dir)) {
    return {
      eligible: false,
      reason: "Ingested repository directory is missing — filebase could not be loaded.",
      blockers: ["missing_directory"],
    };
  }

  if (isPythonOrNonNodeRepo(dir)) {
    return {
      eligible: false,
      reason:
        "This filebase is not eligible: only Node.js web applications (package.json with a dev/start script) can run in the GitHubbox sandbox.",
      blockers: ["non_node_project"],
    };
  }

  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return {
      eligible: false,
      reason:
        "This repository is not eligible for sandbox execution — no package.json found. Upload a Node.js web app or provide a live URL instead.",
      blockers: ["no_package_json"],
    };
  }

  const pkgStat = fs.statSync(pkgPath);
  if (pkgStat.size > MAX_PACKAGE_JSON_BYTES) {
    blockers.push("package_json_too_large");
  }

  const fileCount = countFiles(dir);
  if (fileCount > MAX_REPO_FILES) {
    return {
      eligible: false,
      reason: `Repository exceeds sandbox file limit (${fileCount} files, max ${MAX_REPO_FILES}). Try a smaller project or live URL scan.`,
      blockers: ["repo_too_large", ...blockers],
    };
  }

  if (isNativeMobileOnly(dir, packageJson)) {
    return {
      eligible: false,
      reason:
        "This project appears to be a native/mobile app without a web dev server. GitHubbox only executes web apps with an HTTP endpoint.",
      blockers: ["mobile_only", ...blockers],
    };
  }

  const fw = framework.toLowerCase();
  if (UNSUPPORTED_FRAMEWORKS.has(fw)) {
    return {
      eligible: false,
      reason: `Framework "${framework}" is not supported by the GitHubbox sandbox runtime.`,
      blockers: ["unsupported_framework", ...blockers],
    };
  }

  const scripts = packageJson.scripts as Record<string, string> | undefined;
  const start = resolveStartScript(scripts, framework);
  if (!start) {
    return {
      eligible: false,
      reason:
        'This repository is not eligible — package.json has no runnable "dev", "start", or "preview" script for a web server.',
      blockers: ["no_start_script", ...blockers],
    };
  }

  const pm = detectPackageManager(dir);
  const installCmd = installCommandFor(pm, dir);

  if (blockers.length > 0) {
    return {
      eligible: false,
      reason: "Repository failed sandbox pre-flight checks.",
      blockers,
    };
  }

  return {
    eligible: true,
    reason: "Repository is eligible for GitHubbox sandbox execution.",
    blockers: [],
    packageManager: pm,
    installCommand: installCmd,
    startCommand: start.command,
    startScript: start.script,
    portHint: start.portHint,
    framework,
  };
}
