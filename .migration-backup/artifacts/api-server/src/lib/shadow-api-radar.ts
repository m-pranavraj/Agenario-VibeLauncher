/**
 * Shadow API Radar
 * ─────────────────────────────────────────────────────────────
 * Detects orphaned backend routes that the frontend no longer calls.
 * AI coding tools frequently add/remove UI without cleaning up APIs.
 * Orphaned routes = live attack surface with zero business value.
 */

import fs from "fs";
import path from "path";
import type { ShadowApiFindings } from "@workspace/db/schema";

function findFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) results.push(...findFiles(full, exts));
      else if (exts.some((ext) => e.name.endsWith(ext))) results.push(full);
    }
  } catch { /* ignore */ }
  return results;
}

function readSafe(p: string): string {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
}

// Extract routes from backend Express router files
function extractBackendRoutes(dir: string): string[] {
  const routes: string[] = [];
  const files = findFiles(dir, [".ts", ".js"]).filter(
    (f) => f.includes("/routes/") || f.includes("/api/") || f.includes("/controllers/")
  );

  for (const file of files) {
    const content = readSafe(file);
    const matches = [
      ...content.matchAll(/router\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g),
      ...content.matchAll(/app\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g),
    ];
    for (const m of matches) {
      const method = (m[1] ?? "GET").toUpperCase();
      const route = m[2] ?? "";
      if (route && !route.includes("${") && !route.includes("*")) {
        routes.push(`${method} ${route}`);
      }
    }
  }
  return [...new Set(routes)];
}

// Extract fetch/axios calls from frontend source files
function extractFrontendFetches(dir: string): string[] {
  const fetches: string[] = [];

  const frontendDirs = ["src", "app", "pages", "components", "lib", "client"];
  const searchDirs = frontendDirs
    .map((d) => path.join(dir, d))
    .filter((d) => { try { return fs.statSync(d).isDirectory(); } catch { return false; } });

  const searchDir = searchDirs.length > 0 ? searchDirs[0]! : dir;
  const files = findFiles(searchDir, [".ts", ".tsx", ".js", ".jsx"]);

  for (const file of files) {
    const content = readSafe(file);

    const fetchMatches = [
      ...content.matchAll(/fetch\s*\(\s*["'`]([^"'`]+\/api\/[^"'`]+)["'`]/g),
      ...content.matchAll(/fetch\s*\(\s*`([^`]+\/api\/[^`]+)`/g),
      ...content.matchAll(/axios\.(get|post|put|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g),
    ];

    for (const m of fetchMatches) {
      const url = m[2] ?? m[1] ?? "";
      if (url && url.includes("/api/")) {
        const cleanUrl = url.replace(/\$\{[^}]+\}/g, ":id").split("?")[0]!;
        fetches.push(cleanUrl);
      }
    }
  }

  return [...new Set(fetches)];
}

function normalizeRoute(route: string): string {
  return route
    .replace(/\/:\w+/g, "/:id")
    .replace(/\/\d+/g, "/:id")
    .toLowerCase();
}

export function runShadowApiRadar(dir: string): ShadowApiFindings {
  const backendRoutes = extractBackendRoutes(dir);
  const frontendFetches = extractFrontendFetches(dir);

  const normalizedFetches = frontendFetches.map(normalizeRoute);
  const orphaned: Array<{ route: string; method: string; risk: string }> = [];

  const SAFE_PREFIXES = ["/healthz", "/health", "/metrics", "/docs", "/api-docs"];
  const SAFE_ROUTES = ["GET /healthz", "GET /health", "GET /metrics"];

  for (const backRoute of backendRoutes) {
    if (SAFE_ROUTES.some((s) => backRoute.endsWith(s.split(" ")[1]!))) continue;
    if (SAFE_PREFIXES.some((p) => backRoute.includes(p))) continue;

    const [method, routePath] = backRoute.split(" ", 2) as [string, string];
    const normalizedBack = normalizeRoute(routePath ?? "");

    const isCalled = normalizedFetches.some((f) => normalizeRoute(f) === normalizedBack ||
      normalizeRoute(f).startsWith(normalizedBack.replace("/:id", "")) ||
      normalizedBack.startsWith(normalizeRoute(f).replace("/:id", "")));

    if (!isCalled && routePath) {
      const isHighRisk = /delete|destroy|remove|drop|admin|ban|reset|purge/i.test(routePath);
      orphaned.push({
        route: routePath,
        method: method ?? "GET",
        risk: isHighRisk ? "HIGH — destructive operation with no UI trigger" : "MEDIUM — live endpoint not called by frontend",
      });
    }
  }

  const undocumented = orphaned.filter((r) => r.risk.startsWith("HIGH")).map((r) => `${r.method} ${r.route}`);

  const summary = orphaned.length === 0
    ? "No orphaned routes detected. Backend API surface matches frontend usage."
    : `Found ${orphaned.length} orphaned backend route(s) the frontend no longer calls. ${undocumented.length > 0 ? `${undocumented.length} are high-risk destructive operations.` : ""} These are live attack surface with zero UI protection.`;

  return {
    orphanedRoutes: orphaned.slice(0, 10),
    undocumentedEndpoints: undocumented,
    frontendFetchRoutes: frontendFetches.slice(0, 20),
    backendRegisteredRoutes: backendRoutes.slice(0, 20),
    summary,
  };
}
