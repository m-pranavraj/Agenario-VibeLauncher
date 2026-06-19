/**
 * GitHub repository ingestion
 * Clones a public GitHub repo into a temp dir and extracts code context.
 */

import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { logger } from "./logger";

export function scanTempDir(prefix: string, scanId: number): string {
  return path.join(os.tmpdir(), `${prefix}-${scanId}`);
}

const MAX_FILE_BYTES = 60_000;
const MAX_TOTAL_CHARS = 180_000;
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", ".cache", "coverage"]);

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

export interface IngestionResult {
  dir: string;
  context: {
    packageJson: Record<string, unknown>;
    fileTree: string;
    totalFiles: number;
    keyFiles: Array<{ path: string; content: string }>;
    schemas: string;
  };
}

export async function ingestGitHubRepo(repoUrl: string, scanId: number): Promise<IngestionResult | null> {
  const dir = scanTempDir("agenario-gh", scanId);
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });

    // Normalize GitHub URL
    let cloneUrl = repoUrl.trim();
    if (!cloneUrl.endsWith(".git")) cloneUrl += ".git";
    if (!cloneUrl.startsWith("http")) cloneUrl = `https://github.com/${cloneUrl}`;

    execSync(`git clone --depth 1 --single-branch "${cloneUrl}" "${dir}"`, {
      timeout: 60_000,
      stdio: "pipe",
    });

    logger.info({ dir, scanId }, "GitHub repo cloned");

    let packageJson: Record<string, unknown> = {};
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try { packageJson = JSON.parse(readSafe(pkgPath)); } catch { /* ignore */ }
    }

    const fileTree = treeOf(dir);
    const totalFiles = findFiles(dir, [".ts", ".tsx", ".js", ".jsx", ".py", ".go"]).length;

    const ALWAYS_FETCH = [
      "README.md", "package.json",
      "src/middleware.ts", "middleware.ts",
      "prisma/schema.prisma", "schema.prisma",
      "drizzle/schema.ts", "lib/db/schema.ts", "db/schema.ts",
      ".env.example", ".env.local.example",
      "next.config.ts", "next.config.js",
      "src/index.ts", "src/app.ts", "src/server.ts",
      "src/App.tsx", "src/main.tsx",
    ];

    const keyFiles: Array<{ path: string; content: string }> = [];
    let totalChars = 0;

    for (const rel of ALWAYS_FETCH) {
      const full = path.join(dir, rel);
      if (fs.existsSync(full)) {
        const c = readSafe(full);
        if (c && totalChars + c.length < MAX_TOTAL_CHARS) {
          keyFiles.push({ path: rel, content: c });
          totalChars += c.length;
        }
      }
    }

    const ROUTE_DIRS = ["pages/api", "src/pages/api", "app/api", "src/app/api", "routes", "src/routes", "api", "src/api"];
    for (const rd of ROUTE_DIRS) {
      const full = path.join(dir, rd);
      if (!fs.existsSync(full)) continue;
      for (const f of findFiles(full, [".ts", ".tsx", ".js", ".jsx"], 3).slice(0, 20)) {
        const c = readSafe(f);
        if (c && totalChars + c.length < MAX_TOTAL_CHARS) {
          keyFiles.push({ path: path.relative(dir, f), content: c });
          totalChars += c.length;
        }
      }
      break;
    }

    let schemas = "";
    for (const sf of ["prisma/schema.prisma", "drizzle/schema.ts", "db/schema.ts", "lib/db/schema.ts"]) {
      const full = path.join(dir, sf);
      if (fs.existsSync(full)) { schemas = readSafe(full); break; }
    }

    return { dir, context: { packageJson, fileTree, totalFiles, keyFiles, schemas } };
  } catch (err) {
    logger.error({ err, scanId }, "GitHub ingestion failed");
    return null;
  }
}

export function extractRoutesFromDir(dir: string, framework: string): string {
  const routeDirs: string[] = [];
  if (framework === "nextjs") {
    routeDirs.push(
      path.join(dir, "pages/api"),
      path.join(dir, "app/api"),
      path.join(dir, "src/pages/api"),
      path.join(dir, "src/app/api"),
    );
  } else {
    routeDirs.push(
      path.join(dir, "routes"),
      path.join(dir, "src/routes"),
      path.join(dir, "api"),
      path.join(dir, "src/api"),
    );
  }

  const routes: string[] = [];
  for (const rDir of routeDirs) {
    if (!fs.existsSync(rDir)) continue;
    collectRouteFiles(rDir, routes, dir);
  }
  return routes.slice(0, 30).join("\n");
}

function collectRouteFiles(dir: string, out: string[], root: string, depth = 0): void {
  if (depth > 4) return;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectRouteFiles(full, out, root, depth + 1);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        out.push(path.relative(root, full));
      }
    }
  } catch { /* ignore */ }
}

export function cleanupScan(scanId: number): void {
  try {
    fs.rmSync(scanTempDir("agenario-gh", scanId), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
