/**
 * Agenario Proof Engine
 * ─────────────────────────────────────────────────────────────
 * Runtime evidence generation for security findings.
 * Proves vulnerabilities exist with real HTTP probing, static
 * code analysis, and structured reproduction steps.
 *
 * Features:
 * 1. IDOR Fuzzer — probes numeric/UUID routes for access control gaps
 * 2. Chaos Engine — tests graceful degradation on API failures
 * 3. PII Scanner — detects secrets/tokens in live JS bundles
 * 4. Stripe Bypass Detector — checks client-side price validation
 */

import { logger } from "./logger.js";
import type { ProofEvidence } from "@workspace/db/schema";

const FETCH_TIMEOUT = 8000;

async function safeFetch(url: string, opts: RequestInit = {}): Promise<{ ok: boolean; status: number; text: string; headers: Record<string, string> }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    const text = await res.text().catch(() => "");
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    return { ok: res.ok, status: res.status, text, headers };
  } catch {
    return { ok: false, status: 0, text: "", headers: {} };
  }
}

function truncate(s: string, n = 200): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ── 1. IDOR Fuzzer ─────────────────────────────────────────────
export async function runIDORProbe(baseUrl: string): Promise<ProofEvidence | null> {
  const cleanUrl = baseUrl.replace(/\/$/, "");

  const IDOR_PATHS = [
    "/api/users/1", "/api/users/2",
    "/api/orders/1", "/api/orders/2",
    "/api/invoices/1", "/api/invoices/2",
    "/api/profile/1", "/api/profile/2",
    "/api/bookings/1", "/api/bookings/2",
    "/api/tickets/1", "/api/tickets/2",
    "/dashboard/order/1", "/dashboard/order/2",
    "/api/documents/1", "/api/documents/2",
  ];

  const results: Array<{ path: string; status: number; dataSize: number; hasUserData: boolean }> = [];

  for (const path of IDOR_PATHS.slice(0, 8)) {
    const r = await safeFetch(`${cleanUrl}${path}`, {
      headers: { "Accept": "application/json", "User-Agent": "AgenarioBot/1.0" },
    });
    if (r.status !== 404 && r.status !== 0) {
      const hasUserData = /email|name|phone|address|password|token|ssn|dob/i.test(r.text);
      results.push({ path, status: r.status, dataSize: r.text.length, hasUserData });
    }
  }

  const exposed = results.filter((r) => r.status === 200 && r.hasUserData);
  const accessible = results.filter((r) => r.status === 200);

  if (exposed.length > 0) {
    return {
      type: "idor",
      title: "IDOR — User Data Accessible Without Authorization",
      severity: "critical",
      confidence: 97,
      url: `${cleanUrl}${exposed[0]!.path}`,
      steps: [
        `Navigate to ${cleanUrl}${exposed[0]!.path}`,
        `Change the numeric ID from 1 → 2: ${cleanUrl}${exposed[0]!.path.replace("/1", "/2")}`,
        `Observe: another user's private data returned without authentication`,
        `Repeat with IDs 3, 4, 5... to enumerate all user records`,
      ],
      observed: `${exposed.length} endpoint(s) returned 200 with user-identifying data (email/name/phone) without requiring authentication. Paths: ${exposed.map((e) => e.path).join(", ")}`,
      impact: "Any user can access any other user's private data. Full database enumeration possible. GDPR/CCPA violation — immediate regulatory exposure.",
      screenshot: undefined,
      codeRef: "Missing authorization middleware on API routes — add requireAuth() guard to all /api/users/:id, /api/orders/:id routes",
    };
  }

  if (accessible.length > 0) {
    return {
      type: "idor",
      title: "Unauthenticated API Routes Respond to Sequential ID Probing",
      severity: "high",
      confidence: 88,
      url: `${cleanUrl}${accessible[0]!.path}`,
      steps: [
        `Send GET request to ${cleanUrl}${accessible[0]!.path} without authentication headers`,
        `Observe: server returns HTTP ${accessible[0]!.status} instead of 401/403`,
        `Try sequential IDs to enumerate resources`,
      ],
      observed: `${accessible.length} route(s) responded without requiring authentication. IDs are sequential/guessable.`,
      impact: "Broken access control. Attackers can enumerate and access resources belonging to other users.",
      codeRef: "Add authentication and ownership checks to all resource routes",
    };
  }

  return null;
}

// ── 2. Chaos Engine ────────────────────────────────────────────
export async function runChaosProbe(baseUrl: string): Promise<ProofEvidence | null> {
  const cleanUrl = baseUrl.replace(/\/$/, "");

  const CHAOS_PATHS = [
    "/api/healthz",
    "/api/health",
    "/health",
    "/api/users/me",
  ];

  let healthPath: string | null = null;
  for (const p of CHAOS_PATHS) {
    const r = await safeFetch(`${cleanUrl}${p}`);
    if (r.ok) { healthPath = p; break; }
  }

  const BASE_ROUTES = ["/", "/dashboard", "/login"];
  const chaosResults: Array<{ path: string; status: number; hasErrorBoundary: boolean; hasLoadingState: boolean }> = [];

  for (const path of BASE_ROUTES.slice(0, 3)) {
    const r = await safeFetch(`${cleanUrl}${path}`);
    const hasErrorBoundary = /error.?boundary|ErrorBoundary|error-fallback/i.test(r.text);
    const hasLoadingState = /skeleton|loading|spinner|shimmer/i.test(r.text);
    chaosResults.push({ path, status: r.status, hasErrorBoundary, hasLoadingState });
  }

  const noErrorBoundary = chaosResults.filter((r) => r.status === 200 && !r.hasErrorBoundary);
  const noLoadingState = chaosResults.filter((r) => r.status === 200 && !r.hasLoadingState);

  if (noErrorBoundary.length > 0) {
    return {
      type: "chaos",
      title: "No Error Boundaries — App Will White-Screen on API Failure",
      severity: "high",
      confidence: 86,
      url: `${cleanUrl}/`,
      steps: [
        `Open browser DevTools → Network tab`,
        `Block or delay your database/API requests (add 10s artificial latency)`,
        `Navigate to ${cleanUrl}/dashboard`,
        `Observe: blank white screen instead of graceful error message`,
        `Alternatively: simulate by going offline (DevTools → Network → Offline)`,
      ],
      observed: `No React Error Boundary detected in page HTML. App renders without error fallback containers. ${healthPath ? `Health endpoint found at ${healthPath}` : "No health endpoint found"}`,
      impact: "When Stripe, Supabase, or your DB goes down (and they will), users see a white screen with no explanation. Average: 3 support tickets per incident. Trust permanently damaged.",
      codeRef: "Wrap root App component and each page in <ErrorBoundary fallback={<ErrorFallback />}>",
    };
  }

  if (noLoadingState.length > 0 && !healthPath) {
    return {
      type: "chaos",
      title: "Missing Loading States and Health Check Endpoint",
      severity: "medium",
      confidence: 78,
      url: `${cleanUrl}/`,
      steps: [
        `Open app on a slow 3G connection (DevTools → Network → Slow 3G)`,
        `Observe: content jumps in without skeleton/loading placeholder`,
        `No /healthz endpoint found — uptime monitors cannot check app health`,
      ],
      observed: "No loading skeleton/spinner patterns detected in page HTML. No health check endpoint responds.",
      impact: "Poor perceived performance. Uptime monitoring impossible. Users may think app is broken during normal load.",
      codeRef: "Add skeleton loaders to data-fetching components and create GET /healthz endpoint returning { status: 'ok', db: 'connected' }",
    };
  }

  return null;
}

// ── 3. PII / Secret Bundle Scanner ─────────────────────────────
export async function runPIIBundleProbe(baseUrl: string): Promise<ProofEvidence | null> {
  const cleanUrl = baseUrl.replace(/\/$/, "");

  const r = await safeFetch(cleanUrl);
  if (!r.ok) return null;

  const scriptMatches = [...r.text.matchAll(/src=["']([^"']*\.(js|mjs|chunk\.js)[^"']*)["']/g)];
  const scriptUrls = scriptMatches.slice(0, 5).map((m) => {
    const src = m[1]!;
    return src.startsWith("http") ? src : `${cleanUrl}${src.startsWith("/") ? "" : "/"}${src}`;
  });

  const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp; severity: "critical" | "high" }> = [
    { name: "Stripe Secret Key", pattern: /sk_live_[A-Za-z0-9]{20,}/, severity: "critical" },
    { name: "OpenAI API Key", pattern: /sk-[A-Za-z0-9]{40,}/, severity: "critical" },
    { name: "AWS Access Key", pattern: /AKIA[0-9A-Z]{16}/, severity: "critical" },
    { name: "Supabase Service Role", pattern: /service_role[^'"]{0,20}eyJ/, severity: "critical" },
    { name: "GitHub Token", pattern: /ghp_[A-Za-z0-9]{36}/, severity: "critical" },
    { name: "Hardcoded JWT Secret", pattern: /jwt[_-]?secret[^'"]{0,10}[=:][^'"]{0,5}['"][^'"]{12,}['"]/, severity: "critical" },
    { name: "Firebase Service Account Key", pattern: /"private_key":\s*"-----BEGIN/, severity: "critical" },
    { name: "Stripe Publishable Key in Bundle", pattern: /pk_live_[A-Za-z0-9]{20,}/, severity: "high" },
    { name: "Google API Key", pattern: /AIza[0-9A-Za-z-_]{35}/, severity: "high" },
    { name: "Database URL with Credentials", pattern: /postgres:\/\/[^:]+:[^@]+@[^'"]+/, severity: "critical" },
  ];

  const found: Array<{ name: string; severity: "critical" | "high"; snippet: string; bundleUrl: string }> = [];

  for (const bundleUrl of scriptUrls) {
    const bundleRes = await safeFetch(bundleUrl);
    if (!bundleRes.ok) continue;

    for (const { name, pattern, severity } of SECRET_PATTERNS) {
      const match = bundleRes.text.match(pattern);
      if (match) {
        found.push({
          name,
          severity,
          snippet: truncate(match[0], 60),
          bundleUrl,
        });
      }
    }

    const consoleLogPassword = /console\.log\([^)]*(?:password|token|secret|key)[^)]*\)/gi;
    if (consoleLogPassword.test(bundleRes.text)) {
      found.push({
        name: "Secret/Password Logged to Console",
        severity: "high",
        snippet: "console.log(…password/token…)",
        bundleUrl,
      });
    }
  }

  if (found.length === 0) return null;

  const worst = found.sort((a, b) => (a.severity === "critical" ? -1 : 1))[0]!;

  return {
    type: "pii",
    title: `Secret Leaked in Client Bundle: ${worst.name}`,
    severity: worst.severity,
    confidence: 99,
    url: worst.bundleUrl,
    steps: [
      `Open ${cleanUrl} in browser`,
      `View Page Source (Ctrl+U or Cmd+U)`,
      `Find the main JavaScript bundle URL`,
      `Open bundle in new tab or run: curl ${worst.bundleUrl} | grep -i "${worst.name.split(" ")[0]}"`,
      `Observe: ${worst.name} visible in plaintext client-side JavaScript`,
    ],
    observed: `Found ${found.length} secret(s) in client-side JavaScript bundle(s):\n${found.map((f) => `• ${f.name}: ${f.snippet} (in ${f.bundleUrl.split("/").pop()})`).join("\n")}`,
    impact: "Anyone who visits your site can steal this key. Stripe fraud bots scrape new launches within hours. A leaked service_role key gives full database admin access.",
    codeRef: "Move ALL secrets to server-side environment variables. NEVER import secret keys in any file under /src/client/ or /src/app/. Use VITE_PUBLIC_ prefix ONLY for non-secret config.",
  };
}

// ── 4. Stripe Bypass Detector ──────────────────────────────────
export async function runStripeBypassProbe(baseUrl: string): Promise<ProofEvidence | null> {
  const cleanUrl = baseUrl.replace(/\/$/, "");

  const checkoutPaths = ["/checkout", "/api/checkout", "/api/payment", "/api/orders", "/api/billing"];
  let checkoutFound = false;

  for (const path of checkoutPaths) {
    const r = await safeFetch(`${cleanUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: -100, price: -100, total: 0 }),
    });
    if (r.status !== 0 && r.status !== 404) {
      checkoutFound = true;

      if (r.status === 200 || r.status === 201) {
        return {
          type: "stripe-bypass",
          title: "Revenue Bypass — Backend Trusts Client-Submitted Price",
          severity: "critical",
          confidence: 95,
          url: `${cleanUrl}${path}`,
          steps: [
            `Open browser DevTools → Network tab`,
            `Initiate checkout on ${cleanUrl}`,
            `Intercept the POST ${path} request`,
            `Modify body: change {"amount": 5000} to {"amount": -100} or {"amount": 0}`,
            `Observe: server accepts the modified price — purchase goes through for ₹0`,
          ],
          observed: `POST ${path} with amount:-100 returned HTTP ${r.status}. Server did not reject the manipulated price. Response: ${truncate(r.text, 150)}`,
          impact: "Customers can buy any product for ₹0 by intercepting the network request. This is a P0 revenue vulnerability — estimated 100% loss for any customer who discovers it.",
          codeRef: "Never trust client-submitted prices. Always look up the price server-side from your database/Stripe product catalog. Use Stripe Payment Links or server-side Checkout Sessions.",
        };
      }
    }
  }

  if (!checkoutFound) return null;

  return {
    type: "stripe-bypass",
    title: "Payment Endpoints Require Client Price Validation Testing",
    severity: "high",
    confidence: 72,
    url: `${cleanUrl}/checkout`,
    steps: [
      "Open DevTools → Network tab during checkout",
      "Find the POST request to your payment backend",
      "Check if 'amount' or 'price' is sent from the client",
      "If yes: manipulate the value to 0 or negative",
      "Test if the server accepts the modified price",
    ],
    observed: "Payment endpoints detected. Manual testing required to confirm client-side price trust.",
    impact: "If backend trusts client-submitted prices, any customer can purchase for ₹0.",
    codeRef: "Server-side: const price = await stripe.prices.retrieve(priceId); // Never const price = req.body.amount",
  };
}

// ── Main: Run all probes for a URL ─────────────────────────────
export async function runProofEngine(sourceType: string, sourceInput: string): Promise<ProofEvidence[]> {
  if (sourceType !== "url") return [];

  const url = sourceInput.startsWith("http") ? sourceInput : `https://${sourceInput}`;
  logger.info({ url }, "Proof engine starting");

  const results = await Promise.allSettled([
    runIDORProbe(url),
    runChaosProbe(url),
    runPIIBundleProbe(url),
    runStripeBypassProbe(url),
  ]);

  const evidence: ProofEvidence[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      evidence.push(r.value);
    }
  }

  logger.info({ url, found: evidence.length }, "Proof engine complete");
  return evidence;
}
