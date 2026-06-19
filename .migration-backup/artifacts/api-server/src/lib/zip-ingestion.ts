/**
 * ZIP ingestion — extract uploaded .zip to a temp dir
 * and return the same CodeContext shape as GitHub ingestion.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { logger } from "./logger";

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

export interface ZipIngestionResult {
  dir: string;
  context: {
    packageJson: Record<string, unknown>;
    fileTree: string;
    totalFiles: number;
    keyFiles: Array<{ path: string; content: string }>;
    schemas: string;
  };
}

export async function ingestZipFile(zipPath: string, scanId: number): Promise<ZipIngestionResult | null> {
  const dir = `/tmp/agenario-${scanId}`;
  try {
    execSync(`rm -rf "${dir}" && mkdir -p "${dir}"`, { timeout: 10_000 });

    // Use system unzip
    execSync(`unzip -q "${zipPath}" -d "${dir}"`, { timeout: 30_000, stdio: "pipe" });

    // If the zip had a single top-level folder, use it as root
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let root = dir;
    if (entries.length === 1 && entries[0].isDirectory()) {
      root = path.join(dir, entries[0].name);
    }

    logger.info({ dir: root, scanId }, "ZIP extracted");

    let packageJson: Record<string, unknown> = {};
    const pkgPath = path.join(root, "package.json");
    if (fs.existsSync(pkgPath)) {
      try { packageJson = JSON.parse(readSafe(pkgPath)); } catch { /* ignore */ }
    }

    const fileTree = treeOf(root);
    const totalFiles = findFiles(root, [".ts", ".tsx", ".js", ".jsx", ".py", ".go"]).length;

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
      const full = path.join(root, rel);
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
      const full = path.join(root, rd);
      if (!fs.existsSync(full)) continue;
      for (const f of findFiles(full, [".ts", ".tsx", ".js", ".jsx"], 3).slice(0, 20)) {
        const c = readSafe(f);
        if (c && totalChars + c.length < MAX_TOTAL_CHARS) {
          keyFiles.push({ path: path.relative(root, f), content: c });
          totalChars += c.length;
        }
      }
      break;
    }

    let schemas = "";
    for (const sf of ["prisma/schema.prisma", "drizzle/schema.ts", "db/schema.ts", "lib/db/schema.ts"]) {
      const full = path.join(root, sf);
      if (fs.existsSync(full)) { schemas = readSafe(full); break; }
    }

    return { dir: root, context: { packageJson, fileTree, totalFiles, keyFiles, schemas } };
  } catch (err) {
    logger.error({ err, scanId }, "ZIP ingestion failed");
    return null;
  } finally {
    // Clean up the original zip file
    try { fs.unlinkSync(zipPath); } catch { /* ignore */ }
  }
}

export function cleanupZip(scanId: number): void {
  try { execSync(`rm -rf "/tmp/agenario-${scanId}"`, { timeout: 10_000 }); } catch { /* ignore */ }
}
