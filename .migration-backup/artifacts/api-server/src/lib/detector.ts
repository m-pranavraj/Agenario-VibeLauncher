/**
 * Framework / vibe-tool / business-type detector
 * Pure heuristics — no I/O, no async, no network calls.
 */

import fs from "fs";
import path from "path";

export function detectFramework(pkg: Record<string, unknown>): string {
  const deps = {
    ...(pkg.dependencies as Record<string, unknown> ?? {}),
    ...(pkg.devDependencies as Record<string, unknown> ?? {}),
  };
  if (deps["next"]) return "nextjs";
  if (deps["remix"] || deps["@remix-run/react"]) return "remix";
  if (deps["nuxt"] || deps["nuxt3"]) return "nuxt";
  if (deps["@sveltejs/kit"]) return "sveltekit";
  if (deps["svelte"]) return "svelte";
  if (deps["@angular/core"]) return "angular";
  if (deps["vue"]) return "vue";
  if (deps["gatsby"]) return "gatsby";
  if (deps["astro"]) return "astro";
  if (deps["express"] || deps["fastify"] || deps["koa"] || deps["hono"]) return "node-api";
  if (deps["react"]) return "react";
  return "unknown";
}

export function detectVibeTool(pkg: Record<string, unknown>, fileTree: string): string {
  const name = (pkg.name as string ?? "").toLowerCase();
  const tree = fileTree.toLowerCase();
  if (tree.includes("cursor") || tree.includes(".cursorrules")) return "cursor";
  if (tree.includes("lovable") || name.includes("lovable")) return "lovable";
  if (tree.includes("bolt") || name.includes("bolt")) return "bolt";
  if (tree.includes("v0") || tree.includes("vercel-v0")) return "v0";
  if (tree.includes("windsurf")) return "windsurf";
  if (tree.includes("replit")) return "replit";
  if (tree.includes(".aider")) return "aider";
  return "unknown";
}

export function detectBusinessType(fileTree: string, keyContent: string): string {
  const combined = (fileTree + " " + keyContent).toLowerCase();
  if (/shop|cart|checkout|product|inventory|order|stripe|payment/.test(combined)) return "ecommerce";
  if (/dashboard|analytics|metric|chart|report|kpi/.test(combined)) return "analytics";
  if (/blog|article|post|cms|content|markdown/.test(combined)) return "content";
  if (/auth|login|register|user|account|profile|session/.test(combined)) return "saas";
  if (/api|endpoint|route|rest|graphql/.test(combined)) return "api";
  if (/landing|hero|cta|marketing|pricing/.test(combined)) return "landing";
  return "unknown";
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
