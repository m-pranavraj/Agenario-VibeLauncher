/**
 * Agenario Proof Screenshot Engine v3 (Honest)
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates simple proof card SVGs clearly labeled as "Agenario Proof Card".
 * These are NOT browser screenshots — they are honest evidence visualizations.
 *
 * Screenshot types:
 *  1. generateBrowserReplayScreenshot  — Proof card for browser replay
 *  2. generateCodeEditorScreenshot     — Proof card for code findings
 *  3. generateConsoleErrorScreenshot   — Proof card for console errors
 *  4. generateAttackInterceptScreenshot — Proof card for attack intercept
 *  5. generateAccessControlScreenshot  — Access control test result card
 *  6. generateProofScreenshot          — General-purpose proof card
 */

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\n/g, " ").split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur = cur ? cur + " " + w : w;
    }
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur.trim());
  return lines.slice(0, maxLines);
}

function toB64(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const TODAY = new Date().toISOString().slice(0, 10);

const C = {
  bg:       "#0d0d1a",
  panel:    "#141428",
  border:   "rgba(255,255,255,0.07)",
  text:     "rgba(255,255,255,0.85)",
  muted:    "rgba(255,255,255,0.35)",
  dim:      "rgba(255,255,255,0.18)",
  critical: "#f87171",
  high:     "#fb923c",
  medium:   "#fbbf24",
  low:      "#94a3b8",
  green:    "#4ade80",
  blue:     "#60a5fa",
};

function sevColor(sev: string): string {
  return sev === "critical" ? C.critical : sev === "high" ? C.high : sev === "medium" ? C.medium : C.low;
}

function renderCard(title: string, bodyLines: string[], severity: string, footer: string): string {
  const accent = sevColor(severity);
  const lineH = 18;
  const pad = 14;
  const headerH = 36;
  const footerH = 26;
  const bodyH = bodyLines.length * lineH + 12;
  const W = 600;
  const totalH = headerH + bodyH + footerH;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}">
  <rect width="${W}" height="${totalH}" rx="8" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
  <rect width="${W}" height="${headerH}" rx="8" fill="${accent}18"/>
  <rect y="${headerH - 4}" width="${W}" height="4" fill="${accent}18"/>
  <text x="${pad}" y="${headerH - 11}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="13" fill="${accent}" font-weight="700">${esc(truncate(title, 80))}</text>
  ${bodyLines.map((l, i) => `<text x="${pad}" y="${headerH + 14 + i * lineH}" font-family="'Fira Code','Courier New',monospace" font-size="10.5" fill="${C.text}">${esc(truncate(l, 90))}</text>`).join("")}
  <rect y="${totalH - footerH}" width="${W}" height="${footerH}" rx="8" fill="${C.panel}"/>
  <text x="${pad}" y="${totalH - 10}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" fill="${C.muted}">${esc(footer)} · ${TODAY}</text>
</svg>`;
}

export function generateBrowserReplayScreenshot(opts: {
  url: string;
  attackUrl: string;
  method?: string;
  statusCode: number;
  responseTime?: number;
  responseBody?: Record<string, unknown>;
  attackLabel: string;
  finding: string;
  severity: string;
  probeType: string;
  networkRows?: Array<{ method: string; path: string; status: number; size: string; time: string; isAttack?: boolean }>;
}): string {
  const lines = [
    `Method: ${opts.method ?? "GET"} | Status: ${opts.statusCode} | ${opts.responseTime ?? 0}ms`,
    `Target: ${opts.attackUrl}`,
    `Finding: ${opts.finding}`,
    `Probe: ${opts.probeType}`,
  ];
  return toB64(renderCard(`${opts.attackLabel} — ${opts.severity.toUpperCase()}`, lines, opts.severity, "Agenario Browser Replay Proof"));
}

export function generateCodeEditorScreenshot(opts: {
  filePath: string;
  lines: Array<{ lineNo: number; code: string; vulnerable?: boolean; annotation?: string }>;
  severity: string;
  title: string;
  fixSnippet?: string;
}): string {
  const lines = [
    `File: ${opts.filePath}`,
    `Issue: ${opts.title}`,
    ...opts.lines.filter(l => l.vulnerable).slice(0, 3).map(l => `L${l.lineNo}: ${truncate(l.code, 60)}`),
    ...(opts.fixSnippet ? [`Fix: ${truncate(opts.fixSnippet.replace(/\n/g, " | "), 80)}`] : []),
  ];
  return toB64(renderCard(`Code Analysis: ${opts.title}`, lines, opts.severity, "Agenario Code Analysis Proof"));
}

export function generateConsoleErrorScreenshot(opts: {
  url: string;
  errors: Array<{ level: "error" | "warn" | "info"; message: string; source?: string }>;
  severity: string;
  title: string;
}): string {
  const lines = [
    `URL: ${opts.url}`,
    ...opts.errors.slice(0, 5).map(e => `[${e.level.toUpperCase()}] ${truncate(e.message, 70)}`),
  ];
  return toB64(renderCard(`Console Error: ${opts.title}`, lines, opts.severity, "Agenario Console Error Proof"));
}

export function generateAttackInterceptScreenshot(opts: {
  originalRequest: string;
  modifiedRequest: string;
  response: string;
  url: string;
  severity: string;
  attackType: string;
  finding: string;
}): string {
  const lines = [
    `Attack: ${opts.attackType}`,
    `URL: ${opts.url}`,
    `Finding: ${truncate(opts.finding, 80)}`,
  ];
  return toB64(renderCard(`Attack Interceptor: ${opts.attackType.toUpperCase()}`, lines, opts.severity, "Agenario Attack Interceptor Proof"));
}

export function generateAccessControlScreenshot(opts: {
  url: string;
  attackUrl: string;
  verdict: "vulnerable" | "protected";
  resourceType: string;
  statusCode: number;
}): string {
  const lines = [
    `Target: ${opts.attackUrl}`,
    `Verdict: ${opts.verdict.toUpperCase()}`,
    `Resource: ${opts.resourceType}`,
    `Status: ${opts.statusCode}`,
  ];
  const sev = opts.verdict === "vulnerable" ? "critical" : "low";
  return toB64(renderCard(`Access Control: ${opts.verdict.toUpperCase()}`, lines, sev, "Agenario Access Control Proof"));
}

export function generateProofScreenshot(opts: {
  url?: string;
  status?: number;
  title: string;
  observed: string;
  severity: string;
  proofType: string;
  steps?: string[];
  impact?: string;
}): string {
  const lines = [
    `${opts.proofType.toUpperCase()} | ${opts.severity.toUpperCase()}`,
    opts.url ? `URL: ${opts.url}` : null,
    `Observed: ${truncate(opts.observed, 80)}`,
    ...(opts.impact ? [`Impact: ${truncate(opts.impact, 80)}`] : []),
    ...(opts.steps ? opts.steps.slice(0, 3).map(s => `→ ${truncate(s, 70)}`) : []),
  ].filter(Boolean) as string[];
  return toB64(renderCard(opts.title, lines, opts.severity, "Agenario Runtime Proof"));
}
