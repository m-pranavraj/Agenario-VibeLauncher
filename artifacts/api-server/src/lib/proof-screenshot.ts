/**
 * Proof Screenshot Generator
 * Generates SVG "browser mockup" screenshots for runtime proof evidence.
 * These are stored as base64 data URIs in the ProofEvidence.screenshot field.
 */

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

export function generateProofScreenshot(opts: {
  url?: string;
  status?: number;
  title: string;
  observed: string;
  severity: string;
  proofType: string;
}): string {
  const { url = "N/A", status = 0, title, observed, severity, proofType } = opts;

  const sevColor =
    severity === "critical" ? "#f87171" :
    severity === "high"     ? "#fb923c" :
    severity === "medium"   ? "#fbbf24" : "#94a3b8";

  const statusColor =
    status === 200 ? "#4ade80" :
    status === 403 || status === 401 ? "#60a5fa" :
    status === 0   ? "#94a3b8" : "#f59e0b";

  const typeLabel = proofType.replace(/-/g, " ").toUpperCase();
  const truncUrl = url.length > 62 ? url.slice(0, 59) + "…" : url;
  const truncTitle = title.length > 54 ? title.slice(0, 51) + "…" : title;

  const obsLines = wrapText(observed, 72, 4);
  const height = 180 + obsLines.length * 17;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="${height}">
  <rect width="640" height="${height}" rx="10" fill="#08080f" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>

  <!-- Browser chrome bar -->
  <rect width="640" height="38" rx="10" fill="#111120"/>
  <rect y="28" width="640" height="10" fill="#111120"/>

  <!-- Traffic lights -->
  <circle cx="20" cy="19" r="5" fill="#ff5f56"/>
  <circle cx="36" cy="19" r="5" fill="#febc2e"/>
  <circle cx="52" cy="19" r="5" fill="#28c840"/>

  <!-- URL bar -->
  <rect x="70" y="9" width="490" height="20" rx="5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <text x="80" y="23" font-family="'Courier New',monospace" font-size="10" fill="rgba(255,255,255,0.45)">${esc(truncUrl)}</text>

  <!-- HTTP status pill -->
  <rect x="566" y="9" width="60" height="20" rx="5" fill="${statusColor}22" stroke="${statusColor}44" stroke-width="1"/>
  <text x="596" y="23" font-family="'Courier New',monospace" font-size="10" fill="${statusColor}" text-anchor="middle" font-weight="bold">${status || "—"}</text>

  <!-- Separator -->
  <line x1="0" y1="38" x2="640" y2="38" stroke="rgba(255,255,255,0.06)"/>

  <!-- Proof type badge -->
  <rect x="16" y="53" width="${typeLabel.length * 6.4 + 16}" height="18" rx="9" fill="${sevColor}1a" stroke="${sevColor}40" stroke-width="1"/>
  <text x="${(typeLabel.length * 6.4 + 16) / 2 + 16}" y="65.5" font-family="'Helvetica Neue',sans-serif" font-size="8.5" fill="${sevColor}" text-anchor="middle" font-weight="700" letter-spacing="0.5">${esc(typeLabel)}</text>

  <!-- Severity badge -->
  <rect x="${typeLabel.length * 6.4 + 36}" y="53" width="${severity.length * 6.8 + 16}" height="18" rx="9" fill="${sevColor}1a" stroke="${sevColor}40" stroke-width="1"/>
  <text x="${typeLabel.length * 6.4 + 44 + (severity.length * 6.8 + 16) / 2}" y="65.5" font-family="'Helvetica Neue',sans-serif" font-size="8.5" fill="${sevColor}" text-anchor="middle" font-weight="700" letter-spacing="0.5">${severity.toUpperCase()}</text>

  <!-- Title -->
  <text x="16" y="95" font-family="'Helvetica Neue',sans-serif" font-size="14" fill="rgba(255,255,255,0.88)" font-weight="600">${esc(truncTitle)}</text>

  <!-- Separator -->
  <line x1="16" y1="110" x2="624" y2="110" stroke="rgba(255,255,255,0.05)"/>

  <!-- Observed label -->
  <text x="16" y="127" font-family="'Helvetica Neue',sans-serif" font-size="9" fill="rgba(255,255,255,0.28)" letter-spacing="1" font-weight="600">OBSERVED</text>

  <!-- Observed text lines -->
  ${obsLines.map((line, i) =>
    `<text x="16" y="${143 + i * 17}" font-family="'Courier New',monospace" font-size="10.5" fill="rgba(255,255,255,0.52)">${esc(line)}</text>`
  ).join("\n  ")}

  <!-- Footer bar -->
  <rect x="0" y="${height - 26}" width="640" height="26" rx="10" fill="rgba(0,0,0,0.35)"/>
  <rect x="0" y="${height - 26}" width="640" height="14" fill="rgba(0,0,0,0.35)"/>
  <circle cx="16" cy="${height - 13}" r="3" fill="${sevColor}"/>
  <text x="26" y="${height - 9}" font-family="'Helvetica Neue',sans-serif" font-size="9" fill="${sevColor}bb">Agenario Runtime Proof · agenario.app · ${new Date().toISOString().slice(0, 10)}</text>
</svg>`;

  const b64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

export function generateAccessControlScreenshot(opts: {
  url: string;
  attackUrl: string;
  verdict: "vulnerable" | "protected";
  resourceType: string;
  statusCode: number;
}): string {
  const { url, attackUrl, verdict, resourceType, statusCode } = opts;

  const isVuln = verdict === "vulnerable";
  const accentColor = isVuln ? "#f87171" : "#4ade80";
  const resultText = isVuln
    ? `VULNERABLE: ${resourceType} data returned without auth`
    : `PROTECTED: Server correctly rejected unauthenticated access`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="200">
  <rect width="640" height="200" rx="10" fill="#08080f" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>

  <!-- Chrome -->
  <rect width="640" height="38" rx="10" fill="#111120"/>
  <rect y="28" width="640" height="10" fill="#111120"/>
  <circle cx="20" cy="19" r="5" fill="#ff5f56"/>
  <circle cx="36" cy="19" r="5" fill="#febc2e"/>
  <circle cx="52" cy="19" r="5" fill="#28c840"/>
  <rect x="70" y="9" width="490" height="20" rx="5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <text x="80" y="23" font-family="'Courier New',monospace" font-size="10" fill="rgba(255,255,255,0.45)">${esc(attackUrl.length > 62 ? attackUrl.slice(0, 59) + "…" : attackUrl)}</text>
  <rect x="566" y="9" width="60" height="20" rx="5" fill="${accentColor}22" stroke="${accentColor}44" stroke-width="1"/>
  <text x="596" y="23" font-family="'Courier New',monospace" font-size="10" fill="${accentColor}" text-anchor="middle" font-weight="bold">${statusCode}</text>
  <line x1="0" y1="38" x2="640" y2="38" stroke="rgba(255,255,255,0.06)"/>

  <!-- Access Control Test Header -->
  <rect x="16" y="52" width="140" height="18" rx="9" fill="${accentColor}1a" stroke="${accentColor}44" stroke-width="1"/>
  <text x="86" y="64.5" font-family="'Helvetica Neue',sans-serif" font-size="8.5" fill="${accentColor}" text-anchor="middle" font-weight="700" letter-spacing="0.5">ACCESS CONTROL TEST</text>

  <!-- Step flow -->
  <text x="16" y="94" font-family="'Courier New',monospace" font-size="10" fill="rgba(255,255,255,0.35)">USER A logs in →</text>
  <text x="16" y="111" font-family="'Courier New',monospace" font-size="10" fill="rgba(255,255,255,0.35)">Intercept request, change ID →</text>
  <text x="16" y="128" font-family="'Courier New',monospace" font-size="10" fill="rgba(255,255,255,0.35)">Access ${esc(resourceType)} at ${esc(attackUrl.length > 40 ? attackUrl.slice(0, 37) + "…" : attackUrl)}</text>

  <!-- Result banner -->
  <rect x="16" y="144" width="608" height="36" rx="8" fill="${accentColor}15" stroke="${accentColor}35" stroke-width="1"/>
  <text x="32" y="167" font-family="'Helvetica Neue',sans-serif" font-size="11.5" fill="${accentColor}" font-weight="600">${isVuln ? "⚠️ " : "✓ "}${esc(resultText)}</text>

  <!-- Footer -->
  <rect x="0" y="174" width="640" height="26" rx="10" fill="rgba(0,0,0,0.35)"/>
  <rect x="0" y="174" width="640" height="14" fill="rgba(0,0,0,0.35)"/>
  <circle cx="16" cy="187" r="3" fill="${accentColor}"/>
  <text x="26" y="191" font-family="'Helvetica Neue',sans-serif" font-size="9" fill="${accentColor}bb">Agenario Access Control Probe · ${new Date().toISOString().slice(0, 10)}</text>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
