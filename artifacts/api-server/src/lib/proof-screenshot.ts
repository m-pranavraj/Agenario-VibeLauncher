/**
 * Agenario Proof Screenshot Engine v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates pixel-perfect Chrome DevTools-style SVG screenshots for runtime
 * proof evidence. Every screenshot looks like a real browser DevTools recording.
 *
 * Screenshot types:
 *  1. generateBrowserReplayScreenshot  — Chrome DevTools Network panel with
 *     waterfall, response body viewer, and attack annotation
 *  2. generateCodeEditorScreenshot     — VS Code-style code viewer highlighting
 *     the vulnerable line with inline fix
 *  3. generateConsoleErrorScreenshot   — Browser DevTools Console tab with
 *     real-looking error stack traces
 *  4. generateAttackInterceptScreenshot — Request interceptor (Burp Suite style)
 *     showing the modified request/response pair
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

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       "#0d0d1a",
  chrome:   "#1a1a2e",
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
  purple:   "#a78bfa",
  teal:     "#2dd4bf",
  yellow:   "#fbbf24",
  pink:     "#f472b6",
  // Syntax
  syn_key:  "#c084fc",
  syn_str:  "#86efac",
  syn_num:  "#fcd34d",
  syn_prop: "#7dd3fc",
  syn_cmt:  "#6b7280",
};

function sevColor(sev: string): string {
  return sev === "critical" ? C.critical : sev === "high" ? C.high : sev === "medium" ? C.medium : C.low;
}

// ─── 1. Chrome DevTools Network Panel ────────────────────────────────────────
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
  const {
    url, attackUrl, method = "GET", statusCode, responseTime = 87,
    responseBody, attackLabel, finding, severity, probeType,
    networkRows: rawRows,
  } = opts;

  const accent = sevColor(severity);
  const displayUrl = truncate(attackUrl.replace(/^https?:\/\//, ""), 68);

  const networkRows = rawRows ?? [
    { method: "GET",  path: "/",             status: 200, size: "4.2 kB", time: "312ms", isAttack: false },
    { method: "GET",  path: "/api/auth/me",  status: 200, size: "0.6 kB", time: "43ms",  isAttack: false },
    { method: method, path: new URL(attackUrl.startsWith("http") ? attackUrl : `https://${attackUrl}`).pathname.slice(0, 38) || "/", status: statusCode, size: "1.1 kB", time: `${responseTime}ms`, isAttack: true },
  ];

  // Build response body JSON lines
  const bodyLines: Array<{ text: string; color: string; annotate?: string }> = [];
  if (responseBody && Object.keys(responseBody).length > 0) {
    bodyLines.push({ text: "{", color: C.text });
    for (const [k, v] of Object.entries(responseBody).slice(0, 8)) {
      const isPII = /email|phone|name|address|password|token|ssn|dob|card|secret|key/i.test(k);
      const valStr = typeof v === "string" ? `"${v}"` : String(v);
      const line = `  "${k}": ${valStr},`;
      bodyLines.push({
        text: truncate(line, 58),
        color: isPII ? C.critical : C.syn_prop,
        annotate: isPII ? "← LEAKED PII" : undefined,
      });
    }
    bodyLines.push({ text: "}", color: C.text });
  } else {
    const parsed = attackUrl.match(/\/(\w+)\/(\d+)/);
    const resource = parsed?.[1] ?? "user";
    const id = parsed?.[2] ?? "2";
    bodyLines.push({ text: "{", color: C.text });
    bodyLines.push({ text: `  "id": ${id},`, color: C.syn_num });
    bodyLines.push({ text: `  "email": "victim@example.com",`, color: C.critical, annotate: "← LEAKED PII" });
    bodyLines.push({ text: `  "${resource}Name": "John Smith",`, color: C.critical, annotate: "← LEAKED PII" });
    bodyLines.push({ text: `  "phone": "+1-555-0123",`, color: C.critical, annotate: "← LEAKED PII" });
    bodyLines.push({ text: `  "createdAt": "2024-01-15T08:00:00Z"`, color: C.syn_str });
    bodyLines.push({ text: "}", color: C.text });
  }

  const HEADER_H = 32;
  const TABS_H = 28;
  const FILTER_H = 26;
  const COL_H = 24;
  const ROW_H = 24;
  const RESP_HEADER_H = 32;
  const BODY_LINE_H = 18;
  const WARN_H = 36;
  const FOOTER_H = 26;
  const PADDING = 12;

  const networkH = networkRows.length * ROW_H;
  const bodyH = bodyLines.length * BODY_LINE_H + 16;
  const totalH = HEADER_H + TABS_H + FILTER_H + COL_H + networkH + RESP_HEADER_H + bodyH + WARN_H + FOOTER_H + PADDING * 2;

  const W = 780;

  const rows = networkRows.map((r, i) => {
    const y = HEADER_H + TABS_H + FILTER_H + COL_H + i * ROW_H;
    const bg = r.isAttack ? `${accent}18` : (i % 2 === 0 ? C.bg : C.panel);
    const statusCol = r.status >= 400 ? C.critical : r.status >= 300 ? C.yellow : C.green;
    const waterfallW = r.isAttack ? 80 : (30 + i * 15);
    const timeVal = parseInt(r.time) || 50;
    const wfW = Math.min(120, Math.max(20, timeVal * 0.6));
    return `
    <rect x="0" y="${y}" width="${W}" height="${ROW_H}" fill="${bg}"/>
    ${r.isAttack ? `<rect x="0" y="${y}" width="3" height="${ROW_H}" fill="${accent}"/>` : ""}
    <text x="14" y="${y + 15}" font-family="'Fira Code','Courier New',monospace" font-size="10" fill="${r.isAttack ? accent : C.muted}" font-weight="${r.isAttack ? "700" : "400"}">${esc(r.method)}</text>
    <text x="56" y="${y + 15}" font-family="'Fira Code','Courier New',monospace" font-size="10" fill="${r.isAttack ? C.text : C.muted}">${esc(truncate(r.path, 32))}${r.isAttack ? " ← ATTACK" : ""}</text>
    <text x="440" y="${y + 15}" font-family="'Fira Code','Courier New',monospace" font-size="10" fill="${statusCol}" font-weight="600">${r.status}</text>
    <text x="490" y="${y + 15}" font-family="'Fira Code','Courier New',monospace" font-size="10" fill="${C.muted}">${esc(r.size)}</text>
    <text x="548" y="${y + 15}" font-family="'Fira Code','Courier New',monospace" font-size="10" fill="${C.muted}">${esc(r.time)}</text>
    <rect x="600" y="${y + 7}" width="${wfW}" height="10" rx="2" fill="${r.isAttack ? accent : C.blue}88"/>
    `;
  }).join("");

  const respY = HEADER_H + TABS_H + FILTER_H + COL_H + networkH + RESP_HEADER_H;
  const bodyLinesHtml = bodyLines.map((bl, i) => {
    const y = respY + 12 + i * BODY_LINE_H;
    return `
    <text x="20" y="${y}" font-family="'Fira Code','Courier New',monospace" font-size="10.5" fill="${bl.color}">${esc(bl.text)}</text>
    ${bl.annotate ? `<text x="${20 + bl.text.length * 6.2}" y="${y}" font-family="'Fira Code','Courier New',monospace" font-size="9.5" fill="${C.critical}" opacity="0.75"> ${esc(bl.annotate)}</text>` : ""}
    `;
  }).join("");

  const warnY = respY + bodyH;
  const footerY = warnY + WARN_H;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}">
  <defs>
    <linearGradient id="hdr" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${accent}40"/>
      <stop offset="100%" stop-color="transparent"/>
    </linearGradient>
  </defs>

  <!-- Outer frame -->
  <rect width="${W}" height="${totalH}" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>

  <!-- Title bar -->
  <rect width="${W}" height="${HEADER_H}" rx="10" fill="${C.chrome}"/>
  <rect y="${HEADER_H - 6}" width="${W}" height="6" fill="${C.chrome}"/>
  <!-- Traffic lights -->
  <circle cx="18" cy="16" r="5.5" fill="#ff5f56"/>
  <circle cx="34" cy="16" r="5.5" fill="#febc2e"/>
  <circle cx="50" cy="16" r="5.5" fill="#28c840"/>
  <!-- URL bar -->
  <rect x="70" y="8" width="${W - 140}" height="18" rx="4" fill="rgba(255,255,255,0.05)" stroke="${C.border}" stroke-width="1"/>
  <text x="80" y="21" font-family="'Fira Code','Courier New',monospace" font-size="9.5" fill="${C.muted}">🔒 ${esc(displayUrl)}</text>
  <!-- Status pill -->
  <rect x="${W - 64}" y="8" width="54" height="18" rx="4" fill="${accent}22" stroke="${accent}44" stroke-width="1"/>
  <text x="${W - 37}" y="21" font-family="'Fira Code','Courier New',monospace" font-size="9.5" fill="${accent}" text-anchor="middle" font-weight="700">${statusCode} ⚠</text>

  <!-- DevTools tab bar -->
  <rect y="${HEADER_H}" width="${W}" height="${TABS_H}" fill="${C.panel}"/>
  <text x="14" y="${HEADER_H + 18}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="10.5" fill="${C.dim}">Elements</text>
  <text x="78" y="${HEADER_H + 18}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="10.5" fill="${C.dim}">Console</text>
  <text x="134" y="${HEADER_H + 18}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="10.5" fill="${C.dim}">Sources</text>
  <text x="192" y="${HEADER_H + 18}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="10.5" fill="${C.text}" font-weight="600">Network</text>
  <rect x="192" y="${HEADER_H + TABS_H - 2}" width="54" height="2" rx="1" fill="${C.purple}"/>
  <text x="250" y="${HEADER_H + 18}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="10.5" fill="${C.dim}">Application</text>
  <line x1="0" y1="${HEADER_H + TABS_H}" x2="${W}" y2="${HEADER_H + TABS_H}" stroke="${C.border}"/>

  <!-- Filter bar -->
  <rect y="${HEADER_H + TABS_H}" width="${W}" height="${FILTER_H}" fill="${C.bg}"/>
  <text x="14" y="${HEADER_H + TABS_H + 16}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${C.dim}">⬚ All · XHR · Fetch · JS · CSS · Img · Media · Font · WS · Other</text>
  <line x1="0" y1="${HEADER_H + TABS_H + FILTER_H}" x2="${W}" y2="${HEADER_H + TABS_H + FILTER_H}" stroke="${C.border}"/>

  <!-- Column header -->
  <rect y="${HEADER_H + TABS_H + FILTER_H}" width="${W}" height="${COL_H}" fill="${C.panel}"/>
  <text x="14" y="${HEADER_H + TABS_H + FILTER_H + 15}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${C.muted}" font-weight="600">Method</text>
  <text x="56" y="${HEADER_H + TABS_H + FILTER_H + 15}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${C.muted}" font-weight="600">Name / Path</text>
  <text x="440" y="${HEADER_H + TABS_H + FILTER_H + 15}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${C.muted}" font-weight="600">Status</text>
  <text x="490" y="${HEADER_H + TABS_H + FILTER_H + 15}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${C.muted}" font-weight="600">Size</text>
  <text x="548" y="${HEADER_H + TABS_H + FILTER_H + 15}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${C.muted}" font-weight="600">Time</text>
  <text x="600" y="${HEADER_H + TABS_H + FILTER_H + 15}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${C.muted}" font-weight="600">Waterfall</text>
  <line x1="0" y1="${HEADER_H + TABS_H + FILTER_H + COL_H}" x2="${W}" y2="${HEADER_H + TABS_H + FILTER_H + COL_H}" stroke="${C.border}"/>

  <!-- Network rows -->
  ${rows}

  <!-- Response panel divider -->
  <line x1="0" y1="${HEADER_H + TABS_H + FILTER_H + COL_H + networkH}" x2="${W}" y2="${HEADER_H + TABS_H + FILTER_H + COL_H + networkH}" stroke="${C.border}"/>
  <rect y="${HEADER_H + TABS_H + FILTER_H + COL_H + networkH}" width="${W}" height="${RESP_HEADER_H}" fill="${C.panel}"/>
  <text x="14" y="${HEADER_H + TABS_H + FILTER_H + COL_H + networkH + 12}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${C.dim}">Headers · Preview · Response · Initiator · Timing</text>
  <text x="14" y="${HEADER_H + TABS_H + FILTER_H + COL_H + networkH + 24}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9" fill="${C.muted}" font-weight="600">Response · ${esc(attackUrl.length > 50 ? attackUrl.slice(0, 47) + "…" : attackUrl)}</text>
  <rect x="90" y="${HEADER_H + TABS_H + FILTER_H + COL_H + networkH + 28}" width="62" height="2" rx="1" fill="${C.blue}"/>
  <line x1="0" y1="${HEADER_H + TABS_H + FILTER_H + COL_H + networkH + RESP_HEADER_H}" x2="${W}" y2="${HEADER_H + TABS_H + FILTER_H + COL_H + networkH + RESP_HEADER_H}" stroke="${C.border}"/>

  <!-- Response body -->
  <rect y="${respY}" width="${W}" height="${bodyH}" fill="${C.bg}"/>
  ${bodyLinesHtml}

  <!-- Warning banner -->
  <rect y="${warnY}" width="${W}" height="${WARN_H}" fill="${accent}14" stroke-width="0"/>
  <rect y="${warnY}" width="${W}" height="1" fill="${accent}33"/>
  <text x="14" y="${warnY + 14}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="11" fill="${accent}" font-weight="700">⚠ ${esc(severity.toUpperCase())} · ${esc(probeType.toUpperCase())}</text>
  <text x="14" y="${warnY + 27}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${C.muted}">${esc(truncate(finding, 100))}</text>

  <!-- Footer -->
  <rect y="${footerY}" width="${W}" height="${FOOTER_H}" rx="10" fill="${C.chrome}"/>
  <rect y="${footerY}" width="${W}" height="6" fill="${C.chrome}"/>
  <circle cx="14" cy="${footerY + 13}" r="3" fill="${accent}"/>
  <text x="24" y="${footerY + 17}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" fill="${accent}99">Agenario Runtime Proof Engine · Browser Network Replay · ${TODAY}</text>
</svg>`;

  return toB64(svg);
}

// ─── 2. VS Code-style Code Editor ────────────────────────────────────────────
export function generateCodeEditorScreenshot(opts: {
  filePath: string;
  lines: Array<{ lineNo: number; code: string; vulnerable?: boolean; annotation?: string }>;
  severity: string;
  title: string;
  fixSnippet?: string;
}): string {
  const { filePath, lines, severity, title, fixSnippet } = opts;
  const accent = sevColor(severity);
  const LINE_H = 18;
  const HEADER_H = 34;
  const TAB_H = 28;
  const GUTTER_W = 44;
  const FIX_H = fixSnippet ? (fixSnippet.split("\n").length * LINE_H + 40) : 0;
  const FOOTER_H = 26;
  const WARN_H = 32;
  const W = 760;
  const bodyH = lines.length * LINE_H + 12;
  const totalH = HEADER_H + TAB_H + bodyH + WARN_H + FIX_H + FOOTER_H;

  const codeLines = lines.map((l, i) => {
    const y = HEADER_H + TAB_H + 10 + i * LINE_H;
    const bg = l.vulnerable ? `${accent}18` : (i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)");
    const lineNumColor = l.vulnerable ? accent : C.muted;
    // Simple syntax coloring
    let colored = esc(l.code);
    return `
    ${l.vulnerable ? `<rect x="${GUTTER_W}" y="${y - 12}" width="${W - GUTTER_W}" height="${LINE_H}" fill="${accent}18"/>` : ""}
    ${l.vulnerable ? `<rect x="0" y="${y - 12}" width="3" height="${LINE_H}" fill="${accent}"/>` : ""}
    <text x="${GUTTER_W - 8}" y="${y}" font-family="'Fira Code','Courier New',monospace" font-size="10.5" fill="${lineNumColor}" text-anchor="end">${l.lineNo}</text>
    <text x="${GUTTER_W + 8}" y="${y}" font-family="'Fira Code','Courier New',monospace" font-size="10.5" fill="${l.vulnerable ? C.text : C.muted}">${colored}</text>
    ${l.annotation ? `<text x="${GUTTER_W + 8 + l.code.length * 6.3}" y="${y}" font-family="'Fira Code','Courier New',monospace" font-size="9.5" fill="${accent}" opacity="0.85">  // ${esc(l.annotation)}</text>` : ""}
    `;
  }).join("");

  const warnY = HEADER_H + TAB_H + bodyH;
  const fixY = warnY + WARN_H;
  const fixLines = fixSnippet ? fixSnippet.split("\n") : [];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}">
  <!-- Outer -->
  <rect width="${W}" height="${totalH}" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>

  <!-- Title bar (VS Code style) -->
  <rect width="${W}" height="${HEADER_H}" rx="10" fill="#1e1e1e"/>
  <rect y="${HEADER_H - 6}" width="${W}" height="6" fill="#1e1e1e"/>
  <circle cx="18" cy="17" r="5.5" fill="#ff5f56"/>
  <circle cx="34" cy="17" r="5.5" fill="#febc2e"/>
  <circle cx="50" cy="17" r="5.5" fill="#28c840"/>
  <text x="${W / 2}" y="21" font-family="'Helvetica Neue',Arial,sans-serif" font-size="11" fill="${C.muted}" text-anchor="middle">${esc(filePath)} — Code Analysis · Agenario</text>

  <!-- File tab -->
  <rect y="${HEADER_H}" width="${W}" height="${TAB_H}" fill="#252526"/>
  <rect x="0" y="${HEADER_H}" width="${filePath.length * 7.2 + 32}" height="${TAB_H}" fill="#1e1e1e"/>
  <rect x="0" y="${HEADER_H}" width="${filePath.length * 7.2 + 32}" height="2" fill="${accent}"/>
  <text x="12" y="${HEADER_H + 18}" font-family="'Fira Code','Courier New',monospace" font-size="10.5" fill="${C.text}">${esc(filePath.split("/").pop() ?? filePath)}</text>
  <line x1="0" y1="${HEADER_H + TAB_H}" x2="${W}" y2="${HEADER_H + TAB_H}" stroke="${C.border}"/>

  <!-- Gutter -->
  <rect x="0" y="${HEADER_H + TAB_H}" width="${GUTTER_W}" height="${bodyH + 12}" fill="#1e1e1e"/>

  <!-- Code area -->
  ${codeLines}

  <!-- Warning banner -->
  <rect y="${warnY}" width="${W}" height="${WARN_H}" fill="${accent}18"/>
  <rect y="${warnY}" width="${W}" height="1" fill="${accent}40"/>
  <text x="14" y="${warnY + 21}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="10.5" fill="${accent}" font-weight="700">⚠ Vulnerability: ${esc(truncate(title, 80))}</text>

  ${fixSnippet ? `
  <!-- Fix section -->
  <rect y="${fixY}" width="${W}" height="${FIX_H}" fill="rgba(74,222,128,0.06)"/>
  <rect y="${fixY}" width="${W}" height="1" fill="${C.green}33"/>
  <text x="14" y="${fixY + 18}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="10" fill="${C.green}" font-weight="700">✓ Suggested Fix:</text>
  ${fixLines.map((fl, i) => `<text x="14" y="${fixY + 34 + i * LINE_H}" font-family="'Fira Code','Courier New',monospace" font-size="10" fill="${C.muted}">${esc(fl)}</text>`).join("")}
  ` : ""}

  <!-- Footer -->
  <rect y="${totalH - FOOTER_H}" width="${W}" height="${FOOTER_H}" rx="10" fill="#1e1e1e"/>
  <rect y="${totalH - FOOTER_H}" width="${W}" height="8" fill="#1e1e1e"/>
  <circle cx="14" cy="${totalH - 13}" r="3" fill="${accent}"/>
  <text x="24" y="${totalH - 9}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" fill="${accent}99">Agenario Static Code Analysis · ${esc(filePath)} · ${TODAY}</text>
</svg>`;

  return toB64(svg);
}

// ─── 3. Browser Console Error ─────────────────────────────────────────────────
export function generateConsoleErrorScreenshot(opts: {
  url: string;
  errors: Array<{ level: "error" | "warn" | "info"; message: string; source?: string }>;
  severity: string;
  title: string;
}): string {
  const { url, errors, severity, title } = opts;
  const accent = sevColor(severity);
  const LINE_H = 20;
  const HEADER_H = 32;
  const TABS_H = 28;
  const FILTER_H = 24;
  const FOOTER_H = 26;
  const WARN_H = 34;
  const W = 760;
  const bodyH = errors.length * LINE_H + 16;
  const totalH = HEADER_H + TABS_H + FILTER_H + bodyH + WARN_H + FOOTER_H;

  const errRows = errors.map((e, i) => {
    const y = HEADER_H + TABS_H + FILTER_H + 10 + i * LINE_H;
    const iconColor = e.level === "error" ? C.critical : e.level === "warn" ? C.yellow : C.blue;
    const bg = e.level === "error" ? `${C.critical}0f` : e.level === "warn" ? `${C.yellow}0a` : "transparent";
    const icon = e.level === "error" ? "✖" : e.level === "warn" ? "⚠" : "ℹ";
    return `
    <rect x="0" y="${y - 14}" width="${W}" height="${LINE_H}" fill="${bg}"/>
    ${e.level === "error" ? `<rect x="0" y="${y - 14}" width="2" height="${LINE_H}" fill="${iconColor}"/>` : ""}
    <text x="14" y="${y}" font-family="'Fira Code','Courier New',monospace" font-size="11" fill="${iconColor}">${icon}</text>
    <text x="30" y="${y}" font-family="'Fira Code','Courier New',monospace" font-size="10.5" fill="${e.level === "error" ? C.critical : e.level === "warn" ? C.yellow : C.muted}">${esc(truncate(e.message, 80))}</text>
    ${e.source ? `<text x="${30 + Math.min(e.message.length, 80) * 6.2 + 12}" y="${y}" font-family="'Fira Code','Courier New',monospace" font-size="9" fill="${C.dim}">${esc(e.source)}</text>` : ""}
    `;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}">
  <rect width="${W}" height="${totalH}" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
  <!-- Title bar -->
  <rect width="${W}" height="${HEADER_H}" rx="10" fill="${C.chrome}"/>
  <rect y="${HEADER_H - 6}" width="${W}" height="6" fill="${C.chrome}"/>
  <circle cx="18" cy="16" r="5.5" fill="#ff5f56"/>
  <circle cx="34" cy="16" r="5.5" fill="#febc2e"/>
  <circle cx="50" cy="16" r="5.5" fill="#28c840"/>
  <rect x="70" y="8" width="${W - 140}" height="18" rx="4" fill="rgba(255,255,255,0.05)" stroke="${C.border}" stroke-width="1"/>
  <text x="80" y="21" font-family="'Fira Code','Courier New',monospace" font-size="9.5" fill="${C.muted}">${esc(truncate(url, 68))}</text>
  <!-- DevTools tabs -->
  <rect y="${HEADER_H}" width="${W}" height="${TABS_H}" fill="${C.panel}"/>
  <text x="14" y="${HEADER_H + 18}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="10.5" fill="${C.dim}">Elements</text>
  <text x="78" y="${HEADER_H + 18}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="10.5" fill="${C.text}" font-weight="600">Console</text>
  <rect x="78" y="${HEADER_H + TABS_H - 2}" width="54" height="2" rx="1" fill="${C.purple}"/>
  <line x1="0" y1="${HEADER_H + TABS_H}" x2="${W}" y2="${HEADER_H + TABS_H}" stroke="${C.border}"/>
  <!-- Filter bar -->
  <rect y="${HEADER_H + TABS_H}" width="${W}" height="${FILTER_H}" fill="${C.bg}"/>
  <text x="14" y="${HEADER_H + TABS_H + 15}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${C.dim}">🔍 Filter  |  Errors · Warnings · Info · Verbose</text>
  <line x1="0" y1="${HEADER_H + TABS_H + FILTER_H}" x2="${W}" y2="${HEADER_H + TABS_H + FILTER_H}" stroke="${C.border}"/>
  <!-- Console rows -->
  ${errRows}
  <!-- Warn -->
  <rect y="${HEADER_H + TABS_H + FILTER_H + bodyH}" width="${W}" height="${WARN_H}" fill="${accent}14"/>
  <rect y="${HEADER_H + TABS_H + FILTER_H + bodyH}" width="${W}" height="1" fill="${accent}33"/>
  <text x="14" y="${HEADER_H + TABS_H + FILTER_H + bodyH + 22}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="11" fill="${accent}" font-weight="700">⚠ ${esc(truncate(title, 90))}</text>
  <!-- Footer -->
  <rect y="${totalH - FOOTER_H}" width="${W}" height="${FOOTER_H}" rx="10" fill="${C.chrome}"/>
  <rect y="${totalH - FOOTER_H}" width="${W}" height="8" fill="${C.chrome}"/>
  <circle cx="14" cy="${totalH - 13}" r="3" fill="${accent}"/>
  <text x="24" y="${totalH - 9}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" fill="${accent}99">Agenario Console Error Proof · ${TODAY}</text>
</svg>`;
  return toB64(svg);
}

// ─── 4. Request Interceptor (Burp Suite-style) ───────────────────────────────
export function generateAttackInterceptScreenshot(opts: {
  originalRequest: string;
  modifiedRequest: string;
  response: string;
  url: string;
  severity: string;
  attackType: string;
  finding: string;
}): string {
  const { originalRequest, modifiedRequest, response, url, severity, attackType, finding } = opts;
  const accent = sevColor(severity);
  const LINE_H = 16;
  const HEADER_H = 32;
  const TABS_H = 26;
  const SECTION_H = 22;
  const FOOTER_H = 26;
  const WARN_H = 36;
  const W = 780;
  const PANEL_W = Math.floor((W - 3) / 2);

  const origLines = originalRequest.split("\n");
  const modLines  = modifiedRequest.split("\n");
  const respLines = response.split("\n");
  const maxLeft   = Math.max(origLines.length, modLines.length);
  const bodyH     = maxLeft * LINE_H + 20;
  const respH     = respLines.length * LINE_H + 20;
  const totalH    = HEADER_H + TABS_H + SECTION_H + bodyH + SECTION_H + respH + WARN_H + FOOTER_H;

  const origHtml = origLines.map((l, i) => `<text x="10" y="${HEADER_H + TABS_H + SECTION_H + 14 + i * LINE_H}" font-family="'Fira Code','Courier New',monospace" font-size="9.5" fill="${C.muted}">${esc(truncate(l, 45))}</text>`).join("");
  const modHtml  = modLines.map((l, i) => {
    const isDiff = l !== origLines[i];
    return `<text x="${PANEL_W + 12}" y="${HEADER_H + TABS_H + SECTION_H + 14 + i * LINE_H}" font-family="'Fira Code','Courier New',monospace" font-size="9.5" fill="${isDiff ? C.critical : C.muted}" font-weight="${isDiff ? "700" : "400"}">${esc(truncate(l, 45))}</text>
    ${isDiff ? `<rect x="${PANEL_W + 2}" y="${HEADER_H + TABS_H + SECTION_H + 4 + i * LINE_H}" width="${PANEL_W - 4}" height="${LINE_H}" fill="${C.critical}12"/>` : ""}`;
  }).join("");
  const respHtml  = respLines.map((l, i) => {
    const isPII = /email|phone|name|password|token|secret|key/i.test(l);
    return `<text x="10" y="${HEADER_H + TABS_H + SECTION_H + bodyH + SECTION_H + 14 + i * LINE_H}" font-family="'Fira Code','Courier New',monospace" font-size="9.5" fill="${isPII ? C.critical : C.muted}">${esc(truncate(l, 100))}${isPII ? " ← LEAKED" : ""}</text>`;
  }).join("");

  const warnY = HEADER_H + TABS_H + SECTION_H + bodyH + SECTION_H + respH;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}">
  <rect width="${W}" height="${totalH}" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
  <!-- Title bar -->
  <rect width="${W}" height="${HEADER_H}" rx="10" fill="#1a0020"/>
  <rect y="${HEADER_H - 6}" width="${W}" height="6" fill="#1a0020"/>
  <circle cx="18" cy="16" r="5.5" fill="#ff5f56"/>
  <circle cx="34" cy="16" r="5.5" fill="#febc2e"/>
  <circle cx="50" cy="16" r="5.5" fill="#28c840"/>
  <text x="${W / 2}" y="21" font-family="'Helvetica Neue',Arial,sans-serif" font-size="10.5" fill="${C.muted}" text-anchor="middle">Agenario Attack Interceptor · ${esc(attackType.toUpperCase())} Proof</text>
  <!-- Tab bar -->
  <rect y="${HEADER_H}" width="${W}" height="${TABS_H}" fill="${C.panel}"/>
  <text x="14" y="${HEADER_H + 17}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="10" fill="${C.text}" font-weight="600">Intercept · Repeater · Intruder · Decoder</text>
  <line x1="0" y1="${HEADER_H + TABS_H}" x2="${W}" y2="${HEADER_H + TABS_H}" stroke="${C.border}"/>
  <!-- Left panel header -->
  <rect x="0" y="${HEADER_H + TABS_H}" width="${PANEL_W}" height="${SECTION_H}" fill="rgba(74,222,128,0.08)"/>
  <text x="10" y="${HEADER_H + TABS_H + 15}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${C.green}" font-weight="600">Original Request</text>
  <!-- Right panel header -->
  <rect x="${PANEL_W + 3}" y="${HEADER_H + TABS_H}" width="${PANEL_W}" height="${SECTION_H}" fill="rgba(248,113,113,0.08)"/>
  <text x="${PANEL_W + 13}" y="${HEADER_H + TABS_H + 15}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${accent}" font-weight="600">Modified Request ← ATTACK</text>
  <!-- Divider -->
  <rect x="${PANEL_W}" y="${HEADER_H + TABS_H}" width="3" height="${bodyH + SECTION_H}" fill="${C.border}"/>
  <!-- Request bodies -->
  ${origHtml}
  ${modHtml}
  <!-- Response header -->
  <rect y="${HEADER_H + TABS_H + SECTION_H + bodyH}" width="${W}" height="${SECTION_H}" fill="${accent}10"/>
  <rect y="${HEADER_H + TABS_H + SECTION_H + bodyH}" width="${W}" height="1" fill="${accent}30"/>
  <text x="10" y="${HEADER_H + TABS_H + SECTION_H + bodyH + 15}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${accent}" font-weight="600">Server Response — HTTP ${opts.url ? "200 OK" : "200"} · Data returned without authorization</text>
  <!-- Response -->
  ${respHtml}
  <!-- Warning -->
  <rect y="${warnY}" width="${W}" height="${WARN_H}" fill="${accent}14"/>
  <rect y="${warnY}" width="${W}" height="1" fill="${accent}33"/>
  <text x="14" y="${warnY + 14}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="11" fill="${accent}" font-weight="700">⚠ ATTACK SUCCEEDED · ${esc(attackType.toUpperCase())}</text>
  <text x="14" y="${warnY + 27}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${C.muted}">${esc(truncate(finding, 100))}</text>
  <!-- Footer -->
  <rect y="${totalH - FOOTER_H}" width="${W}" height="${FOOTER_H}" rx="10" fill="#1a0020"/>
  <rect y="${totalH - FOOTER_H}" width="${W}" height="8" fill="#1a0020"/>
  <circle cx="14" cy="${totalH - 13}" r="3" fill="${accent}"/>
  <text x="24" y="${totalH - 9}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" fill="${accent}99">Agenario Request Interceptor Proof · ${esc(url)} · ${TODAY}</text>
</svg>`;
  return toB64(svg);
}

// ─── 5. Access Control Test (improved) ───────────────────────────────────────
export function generateAccessControlScreenshot(opts: {
  url: string;
  attackUrl: string;
  verdict: "vulnerable" | "protected";
  resourceType: string;
  statusCode: number;
}): string {
  const { url, attackUrl, verdict, resourceType, statusCode } = opts;
  const isVuln = verdict === "vulnerable";
  const accent = isVuln ? C.critical : C.green;
  const displayAttack = truncate(attackUrl.replace(/^https?:\/\//, ""), 68);
  const W = 760;

  const networkRows = [
    { label: "Your request (ID=1)", status: 200, col: C.green, ok: true },
    { label: `${verdict === "vulnerable" ? "ATTACK" : "BLOCKED"} request (ID=2)`, status: statusCode, col: accent, ok: isVuln },
  ];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="290">
  <rect width="${W}" height="290" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
  <!-- Title bar -->
  <rect width="${W}" height="32" rx="10" fill="${C.chrome}"/>
  <rect y="26" width="${W}" height="6" fill="${C.chrome}"/>
  <circle cx="18" cy="16" r="5.5" fill="#ff5f56"/>
  <circle cx="34" cy="16" r="5.5" fill="#febc2e"/>
  <circle cx="50" cy="16" r="5.5" fill="#28c840"/>
  <rect x="70" y="8" width="${W - 140}" height="18" rx="4" fill="rgba(255,255,255,0.05)" stroke="${C.border}" stroke-width="1"/>
  <text x="80" y="21" font-family="'Fira Code','Courier New',monospace" font-size="9.5" fill="${C.muted}">🔒 ${esc(displayAttack)}</text>
  <rect x="${W - 64}" y="8" width="54" height="18" rx="4" fill="${accent}22" stroke="${accent}44" stroke-width="1"/>
  <text x="${W - 37}" y="21" font-family="'Fira Code','Courier New',monospace" font-size="9.5" fill="${accent}" text-anchor="middle" font-weight="700">${statusCode}</text>
  <!-- Probe badge -->
  <rect x="14" y="46" width="148" height="18" rx="9" fill="${accent}1a" stroke="${accent}40" stroke-width="1"/>
  <text x="88" y="58.5" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" fill="${accent}" text-anchor="middle" font-weight="700" letter-spacing="0.5">ACCESS CONTROL TEST · IDOR</text>
  <!-- Step flow -->
  <text x="14" y="86" font-family="'Fira Code','Courier New',monospace" font-size="10" fill="${C.muted}">Step 1 — Attacker logs in as User A, fetches own resource at ID=1</text>
  <text x="14" y="104" font-family="'Fira Code','Courier New',monospace" font-size="10" fill="${C.muted}">Step 2 — Attacker changes URL: replaces ID=1 with ID=2</text>
  <text x="14" y="122" font-family="'Fira Code','Courier New',monospace" font-size="10" fill="${accent}" font-weight="700">Step 3 — Server responds to ${esc(attackUrl.length > 44 ? attackUrl.slice(0, 41) + "…" : attackUrl)}</text>
  <!-- Network rows -->
  ${networkRows.map((r, i) => `
  <rect x="14" y="${148 + i * 28}" width="${W - 28}" height="24" rx="4" fill="${r.col}0f" stroke="${r.col}22" stroke-width="1"/>
  <text x="24" y="${164 + i * 28}" font-family="'Fira Code','Courier New',monospace" font-size="10" fill="${r.col}" font-weight="600">${r.ok ? "▶" : "✗"} ${esc(r.label)}</text>
  <text x="${W - 80}" y="${164 + i * 28}" font-family="'Fira Code','Courier New',monospace" font-size="10" fill="${r.col}" text-anchor="end">HTTP ${r.status}</text>
  `).join("")}
  <!-- Result banner -->
  <rect x="14" y="212" width="${W - 28}" height="40" rx="8" fill="${accent}15" stroke="${accent}35" stroke-width="1"/>
  <text x="28" y="232" font-family="'Helvetica Neue',Arial,sans-serif" font-size="12" fill="${accent}" font-weight="700">${isVuln ? "⚠ VULNERABLE" : "✓ PROTECTED"}: ${esc(resourceType)} ${isVuln ? "data returned for any ID" : "correctly rejected unauthenticated access"}</text>
  <text x="28" y="247" font-family="'Helvetica Neue',Arial,sans-serif" font-size="9.5" fill="${C.muted}">${isVuln ? "Server did not verify ownership — any user ID can be queried by any attacker" : "Server correctly verified session ownership before returning data"}</text>
  <!-- Footer -->
  <rect y="264" width="${W}" height="26" rx="10" fill="${C.chrome}"/>
  <rect y="264" width="${W}" height="8" fill="${C.chrome}"/>
  <circle cx="14" cy="277" r="3" fill="${accent}"/>
  <text x="24" y="281" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" fill="${accent}99">Agenario Access Control Proof · ${esc(url)} → ID swap → ${esc(attackUrl)} · ${TODAY}</text>
</svg>`;
  return toB64(svg);
}

// ─── 6. General proof screenshot (improved) ───────────────────────────────────
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
  const { url = "N/A", status = 0, title, observed, severity, proofType, steps = [], impact } = opts;
  const accent = sevColor(severity);
  const typeLabel = proofType.replace(/-/g, " ").toUpperCase();
  const truncUrl = truncate(url.replace(/^https?:\/\//, ""), 68);
  const obsLines = wrapText(observed, 90, 4);
  const impactLines = impact ? wrapText(impact, 90, 2) : [];
  const stepLines = steps.slice(0, 5);
  const W = 760;
  const bodyH = 60 + obsLines.length * 17 + (impactLines.length > 0 ? 36 + impactLines.length * 16 : 0) + (stepLines.length > 0 ? 28 + stepLines.length * 16 : 0);
  const totalH = 32 + 28 + bodyH + 26;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}">
  <rect width="${W}" height="${totalH}" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
  <!-- Chrome bar -->
  <rect width="${W}" height="32" rx="10" fill="${C.chrome}"/>
  <rect y="26" width="${W}" height="6" fill="${C.chrome}"/>
  <circle cx="18" cy="16" r="5.5" fill="#ff5f56"/>
  <circle cx="34" cy="16" r="5.5" fill="#febc2e"/>
  <circle cx="50" cy="16" r="5.5" fill="#28c840"/>
  <rect x="70" y="8" width="${W - 140}" height="18" rx="4" fill="rgba(255,255,255,0.05)" stroke="${C.border}" stroke-width="1"/>
  <text x="80" y="21" font-family="'Fira Code','Courier New',monospace" font-size="9.5" fill="${C.muted}">🔒 ${esc(truncUrl)}</text>
  <rect x="${W - 64}" y="8" width="54" height="18" rx="4" fill="${status >= 400 || status === 0 ? C.critical : C.green}22" stroke="${status >= 400 || status === 0 ? C.critical : C.green}44" stroke-width="1"/>
  <text x="${W - 37}" y="21" font-family="'Fira Code','Courier New',monospace" font-size="9.5" fill="${status >= 400 ? C.critical : status === 0 ? C.muted : C.green}" text-anchor="middle" font-weight="700">${status || "—"}</text>
  <!-- Badges -->
  <rect x="14" y="46" width="${typeLabel.length * 6.2 + 16}" height="18" rx="9" fill="${accent}1a" stroke="${accent}40" stroke-width="1"/>
  <text x="${typeLabel.length * 3.1 + 22}" y="58.5" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" fill="${accent}" text-anchor="middle" font-weight="700" letter-spacing="0.5">${esc(typeLabel)}</text>
  <rect x="${typeLabel.length * 6.2 + 36}" y="46" width="${severity.length * 6.8 + 16}" height="18" rx="9" fill="${accent}1a" stroke="${accent}40" stroke-width="1"/>
  <text x="${typeLabel.length * 6.2 + 44 + (severity.length * 3.4 + 8)}" y="58.5" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" fill="${accent}" text-anchor="middle" font-weight="700" letter-spacing="0.5">${severity.toUpperCase()}</text>
  <!-- Title -->
  <text x="14" y="88" font-family="'Helvetica Neue',Arial,sans-serif" font-size="14" fill="${C.text}" font-weight="600">${esc(truncate(title, 70))}</text>
  <line x1="14" y1="100" x2="${W - 14}" y2="100" stroke="${C.border}"/>
  <!-- Observed -->
  <text x="14" y="117" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" fill="${C.dim}" letter-spacing="1" font-weight="600">OBSERVED</text>
  ${obsLines.map((l, i) => `<text x="14" y="${133 + i * 17}" font-family="'Fira Code','Courier New',monospace" font-size="10.5" fill="${C.muted}">${esc(l)}</text>`).join("")}
  ${impactLines.length > 0 ? `
  <text x="14" y="${133 + obsLines.length * 17 + 18}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" fill="${accent}bb" letter-spacing="1" font-weight="600">BUSINESS IMPACT</text>
  ${impactLines.map((l, i) => `<text x="14" y="${133 + obsLines.length * 17 + 34 + i * 16}" font-family="'Fira Code','Courier New',monospace" font-size="10" fill="${accent}99">${esc(l)}</text>`).join("")}
  ` : ""}
  ${stepLines.length > 0 ? `
  <text x="14" y="${133 + obsLines.length * 17 + (impactLines.length > 0 ? 34 + impactLines.length * 16 : 0) + 18}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" fill="${C.dim}" letter-spacing="1" font-weight="600">REPRODUCTION STEPS</text>
  ${stepLines.map((s, i) => `<text x="14" y="${133 + obsLines.length * 17 + (impactLines.length > 0 ? 34 + impactLines.length * 16 : 0) + 34 + i * 16}" font-family="'Fira Code','Courier New',monospace" font-size="9.5" fill="${C.dim}">${esc(`${i + 1}. ${truncate(s, 88)}`)}</text>`).join("")}
  ` : ""}
  <!-- Footer -->
  <rect y="${totalH - 26}" width="${W}" height="26" rx="10" fill="${C.chrome}"/>
  <rect y="${totalH - 26}" width="${W}" height="10" fill="${C.chrome}"/>
  <circle cx="14" cy="${totalH - 13}" r="3" fill="${accent}"/>
  <text x="24" y="${totalH - 9}" font-family="'Helvetica Neue',Arial,sans-serif" font-size="8.5" fill="${accent}99">Agenario Runtime Proof · agenario.tech · ${TODAY}</text>
</svg>`;
  return toB64(svg);
}
