/**
 * ZIP ingestion — extract uploaded .zip to a temp dir
 * and return the same CodeContext shape as GitHub ingestion.
 *
 * Supports ALL source types:
 * - Web apps (React, Vue, Next.js, Angular, Svelte, etc.)
 * - Node.js APIs (Express, Fastify, Koa, Hono)
 * - React Native apps (iOS/Android)
 * - Flutter apps (Dart)
 * - iOS native apps (Swift, Objective-C)
 * - Android native apps (Kotlin, Java)
 * - Python apps (Django, FastAPI, Flask)
 * - Go apps
 */

import fs from "fs";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import { logger } from "./logger.js";

function zipTempDir(scanId: number): string {
  return path.join(os.tmpdir(), `agenario-zip-${scanId}`);
}

const MAX_FILE_BYTES = 60_000;
const MAX_TOTAL_CHARS = 180_000;

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".cache", "coverage",
  // iOS/Xcode
  "DerivedData", "Pods", ".build", "Carthage", "fastlane/build_output",
  // Android/Gradle
  ".gradle", "build", ".idea", "captures", "outputs",
  // Flutter
  ".dart_tool", ".pub-cache", "build",
  // General
  "__pycache__", ".venv", "venv", ".tox",
]);

function readSafe(filePath: string): string {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_BYTES) return `[truncated — ${stat.size} bytes]`;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function findFiles(dir: string, exts: string[], maxDepth = 5, depth = 0): string[] {
  if (depth > maxDepth || !fs.existsSync(dir)) return [];
  const files: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) files.push(...findFiles(full, exts, maxDepth, depth + 1));
      } else if (exts.some((e) => entry.name.endsWith(e))) {
        files.push(full);
      }
    }
  } catch { /* ignore */ }
  return files;
}

function treeOf(dir: string, prefix = "", depth = 0): string {
  if (depth > 3 || !fs.existsSync(dir)) return "";
  let out = "";
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out += `${prefix}${entry.name}\n`;
      if (entry.isDirectory()) out += treeOf(path.join(dir, entry.name), prefix + "  ", depth + 1);
    }
  } catch { /* ignore */ }
  return out;
}

/**
 * Detect the type of project from the file tree and config files.
 * Returns a project context object with framework, platform, and key config paths.
 */
function detectProjectType(dir: string): {
  platform: "web" | "ios" | "android" | "react-native" | "flutter" | "python" | "go" | "unknown";
  framework: string;
  configFiles: string[];
  buildFiles: string[];
  sourceExts: string[];
  routeDirs: string[];
  startCommand: string | null;
} {
  const tree = treeOf(dir).toLowerCase();

  // ── iOS Native ──
  if (
    fs.existsSync(path.join(dir, "Package.swift")) ||
    tree.includes(".xcodeproj") ||
    tree.includes(".xcworkspace") ||
    findFiles(dir, [".swift"]).length > 0
  ) {
    const hasSPM = fs.existsSync(path.join(dir, "Package.swift"));
    return {
      platform: "ios",
      framework: hasSPM ? "swift-package-manager" : "xcode",
      configFiles: ["Package.swift", "Info.plist", " entitlements"],
      buildFiles: [".xcodeproj", ".xcworkspace", ".pbxproj"],
      sourceExts: [".swift", ".m", ".h"],
      routeDirs: ["Sources", "App", "Shared"],
      startCommand: hasSPM ? "swift build" : null,
    };
  }

  // ── Android Native ──
  if (
    fs.existsSync(path.join(dir, "build.gradle")) ||
    fs.existsSync(path.join(dir, "build.gradle.kts")) ||
    fs.existsSync(path.join(dir, "settings.gradle")) ||
    findFiles(dir, [".kt", ".java"], 4).length > 0
  ) {
    const hasKotlin = findFiles(dir, [".kt"], 4).length > 0;
    return {
      platform: "android",
      framework: hasKotlin ? "kotlin" : "java",
      configFiles: ["build.gradle", "build.gradle.kts", "settings.gradle", "AndroidManifest.xml", "gradle.properties"],
      buildFiles: ["build.gradle", "build.gradle.kts", "gradlew"],
      sourceExts: [".kt",".java", ".xml"],
      routeDirs: ["app/src/main/java", "app/src/main/kotlin", "src/main/java", "src/main/kotlin"],
      startCommand: "./gradlew build",
    };
  }

  // ── Flutter ──
  if (
    fs.existsSync(path.join(dir, "pubspec.yaml")) ||
    findFiles(dir, [".dart"], 4).length > 0
  ) {
    return {
      platform: "flutter",
      framework: "flutter",
      configFiles: ["pubspec.yaml", "pubspec.lock", "analysis_options.yaml"],
      buildFiles: ["pubspec.yaml"],
      sourceExts: [".dart"],
      routeDirs: ["lib"],
      startCommand: "flutter build apk",
    };
  }

  // ── React Native ──
  const pkgPath = path.join(dir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps["react-native"]) {
        return {
          platform: "react-native",
          framework: "react-native",
          configFiles: ["package.json", "App.tsx", "App.js", "metro.config.js", "app.json"],
          buildFiles: ["package.json"],
          sourceExts: [".tsx", ".ts", ".jsx", ".js"],
          routeDirs: ["src/screens", "src/navigation", "app/screens", "screens"],
          startCommand: null,
        };
      }
    } catch { /* ignore */ }
  }

  // ── Python ──
  if (
    fs.existsSync(path.join(dir, "requirements.txt")) ||
    fs.existsSync(path.join(dir, "pyproject.toml")) ||
    fs.existsSync(path.join(dir, "Pipfile")) ||
    findFiles(dir, [".py"], 4).length > 0
  ) {
    const hasDjango = fs.existsSync(path.join(dir, "manage.py"));
    const hasFastAPI = fs.existsSync(path.join(dir, "main.py")) && tree.includes("fastapi");
    return {
      platform: "python",
      framework: hasDjango ? "django" : hasFastAPI ? "fastapi" : "python",
      configFiles: ["requirements.txt", "pyproject.toml", "Pipfile", "manage.py", "main.py", "app.py"],
      buildFiles: ["requirements.txt", "pyproject.toml"],
      sourceExts: [".py"],
      routeDirs: hasDjango ? ["app/urls.py", "project/urls.py"] : ["routes", "api", "app/api"],
      startCommand: null,
    };
  }

  // ── Go ──
  if (
    fs.existsSync(path.join(dir, "go.mod")) ||
    findFiles(dir, [".go"], 4).length > 0
  ) {
    return {
      platform: "go",
      framework: "go",
      configFiles: ["go.mod", "go.sum", "main.go"],
      buildFiles: ["go.mod"],
      sourceExts: [".go"],
      routeDirs: ["cmd", "internal", "pkg", "handlers"],
      startCommand: "go build ./...",
    };
  }

  // ── Web (default) ──
  const webExts = [".ts", ".tsx", ".js", ".jsx"];
  const webRouteDirs = [
    "pages/api", "app/api", "src/pages/api", "src/app/api",
    "routes", "src/routes", "api", "src/api",
  ];

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps["next"]) return { platform: "web", framework: "nextjs", configFiles: ["package.json", "next.config.ts", "next.config.js"], buildFiles: ["package.json", "next.config.ts"], sourceExts: webExts, routeDirs: ["pages/api", "app/api", "src/pages/api", "src/app/api"], startCommand: "npm run dev" };
      if (allDeps["remix"] || allDeps["@remix-run/react"]) return { platform: "web", framework: "remix", configFiles: ["package.json", "vite.config.ts", "remix.config.js"], buildFiles: ["package.json"], sourceExts: webExts, routeDirs: ["app/routes", "app/api"], startCommand: "npm run dev" };
      if (allDeps["nuxt"]) return { platform: "web", framework: "nuxt", configFiles: ["package.json", "nuxt.config.ts"], buildFiles: ["package.json"], sourceExts: webExts, routeDirs: ["server/api", "api"], startCommand: "npm run dev" };
      if (allDeps["@sveltejs/kit"]) return { platform: "web", framework: "sveltekit", configFiles: ["package.json", "svelte.config.js"], buildFiles: ["package.json"], sourceExts: webExts, routeDirs: ["src/routes", "src/api"], startCommand: "npm run dev" };
      if (allDeps["vue"]) return { platform: "web", framework: "vue", configFiles: ["package.json", "vite.config.ts"], buildFiles: ["package.json"], sourceExts: webExts, routeDirs: ["src/api", "server/api"], startCommand: "npm run dev" };
      if (allDeps["@angular/core"]) return { platform: "web", framework: "angular", configFiles: ["package.json", "angular.json"], buildFiles: ["package.json", "angular.json"], sourceExts: [".ts"], routeDirs: ["src/app/api"], startCommand: "npm run start" };
      if (allDeps["gatsby"]) return { platform: "web", framework: "gatsby", configFiles: ["package.json", "gatsby-config.ts"], buildFiles: ["package.json"], sourceExts: webExts, routeDirs: ["src/api"], startCommand: "npm run develop" };
      if (allDeps["astro"]) return { platform: "web", framework: "astro", configFiles: ["package.json", "astro.config.mjs"], buildFiles: ["package.json"], sourceExts: webExts, routeDirs: ["src/pages/api"], startCommand: "npm run dev" };
      if (allDeps["express"] || allDeps["fastify"] || allDeps["koa"] || allDeps["hono"]) return { platform: "web", framework: "node-api", configFiles: ["package.json"], buildFiles: ["package.json"], sourceExts: webExts, routeDirs: ["routes", "src/routes", "api", "src/api"], startCommand: "npm start" };
      if (allDeps["react"]) return { platform: "web", framework: "react", configFiles: ["package.json", "vite.config.ts"], buildFiles: ["package.json"], sourceExts: webExts, routeDirs: ["src/api"], startCommand: "npm run dev" };
    } catch { /* ignore */ }
  }

  return {
    platform: "unknown",
    framework: "unknown",
    configFiles: [],
    buildFiles: [],
    sourceExts: webExts,
    routeDirs: webRouteDirs,
    startCommand: null,
  };
}

export interface ZipIngestionResult {
  dir: string;
  context: {
    packageJson: Record<string, unknown>;
    fileTree: string;
    totalFiles: number;
    keyFiles: Array<{ path: string; content: string }>;
    schemas: string;
    projectType: {
      platform: string;
      framework: string;
    };
  };
}

export async function ingestZipFile(zipPath: string, scanId: number): Promise<ZipIngestionResult | null> {
  const dir = zipTempDir(scanId);
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(dir, true);

    logger.info({ dir, scanId }, "ZIP extracted");

    // Detect project type from extracted files
    const projectType = detectProjectType(dir);

    let packageJson: Record<string, unknown> = {};
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try { packageJson = JSON.parse(readSafe(pkgPath)); } catch { /* ignore */ }
    }

    const fileTree = treeOf(dir);
    const totalFiles = findFiles(dir, projectType.sourceExts).length;

    const keyFiles: Array<{ path: string; content: string }> = [];
    let totalChars = 0;

    // Fetch project-specific config files
    for (const rel of projectType.configFiles) {
      const full = path.join(dir, rel);
      if (fs.existsSync(full)) {
        const c = readSafe(full);
        if (c && totalChars + c.length < MAX_TOTAL_CHARS) {
          keyFiles.push({ path: rel, content: c });
          totalChars += c.length;
        }
      }
    }

    // Fetch source files from route dirs
    for (const rd of projectType.routeDirs) {
      const full = path.join(dir, rd);
      if (!fs.existsSync(full)) continue;
      for (const f of findFiles(full, projectType.sourceExts, 3).slice(0, 20)) {
        const c = readSafe(f);
        if (c && totalChars + c.length < MAX_TOTAL_CHARS) {
          keyFiles.push({ path: path.relative(dir, f), content: c });
          totalChars += c.length;
        }
      }
      break;
    }

    // Fetch schemas for web projects
    let schemas = "";
    if (projectType.platform === "web") {
      for (const sf of ["prisma/schema.prisma", "drizzle/schema.ts", "db/schema.ts", "lib/db/schema.ts"]) {
        const full = path.join(dir, sf);
        if (fs.existsSync(full)) { schemas = readSafe(full); break; }
      }
    }

    return {
      dir,
      context: {
        packageJson,
        fileTree,
        totalFiles,
        keyFiles,
        schemas,
        projectType,
      },
    };
  } catch (err) {
    logger.error({ err, scanId }, "ZIP ingestion failed");
    return null;
  }
}

export function cleanupZip(scanId: number): void {
  try {
    fs.rmSync(zipTempDir(scanId), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
