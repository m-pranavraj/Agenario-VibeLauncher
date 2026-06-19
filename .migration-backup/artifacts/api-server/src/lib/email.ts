import nodemailer from "nodemailer";
import { logger } from "./logger.js";

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? "587", 10);
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const SMTP_FROM = process.env.SMTP_FROM ?? "alerts@agenario.app";
const APP_URL = process.env.APP_URL ?? "https://agenario.app";

function createTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export interface RetentionEmailData {
  userName: string;
  userEmail: string;
  scanId: number;
  appSource: string;
  currentScore: number;
  previousScore: number | null;
  criticalCves: Array<{ packageName: string; cveId: string; description: string }>;
  newIssues: Array<{ title: string; severity: string; agentName: string }>;
}

function scoreDrop(current: number, prev: number | null): number {
  if (prev === null) return 0;
  return Math.max(0, prev - current);
}

function buildRetentionEmail(data: RetentionEmailData): { subject: string; html: string } {
  const drop = scoreDrop(data.currentScore, data.previousScore);
  const hasCves = data.criticalCves.length > 0;
  const hasScoreDrop = drop >= 5;

  const subject = hasCves
    ? `🚨 [Agenario] ${data.criticalCves.length} new critical vulnerabilities detected in your code`
    : hasScoreDrop
    ? `⚠️ Action Required: Your launch readiness score dropped to ${data.currentScore}%`
    : `📉 Weekly Drift: Your app's threat landscape shifted`;

  const scoreColor = data.currentScore >= 80 ? "#4ade80" : data.currentScore >= 55 ? "#f59e0b" : "#f87171";
  const dropBadge = drop > 0
    ? `<span style="color:#f87171;font-size:14px;font-weight:700;">−${drop} pts</span>`
    : "";

  const cveRows = data.criticalCves.slice(0, 3).map((c) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="display:inline-block;background:#ef444415;border:1px solid #ef444430;color:#f87171;font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;margin-right:8px;">CRITICAL CVE</span>
        <strong style="color:rgba(255,255,255,0.85);font-size:13px;">${c.packageName}</strong>
        <br>
        <span style="color:rgba(255,255,255,0.35);font-size:11px;margin-top:3px;display:block;">${c.cveId} — ${c.description.slice(0, 100)}${c.description.length > 100 ? "…" : ""}</span>
      </td>
    </tr>`).join("");

  const issueRows = data.newIssues.slice(0, 3).map((i) => {
    const sevColor = i.severity === "critical" ? "#f87171" : i.severity === "high" ? "#fb923c" : "#fbbf24";
    const sevBg = i.severity === "critical" ? "#ef444415" : i.severity === "high" ? "#f9731615" : "#f59e0b15";
    const sevBorder = i.severity === "critical" ? "#ef444430" : i.severity === "high" ? "#f9731630" : "#f59e0b30";
    return `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="display:inline-block;background:${sevBg};border:1px solid ${sevBorder};color:${sevColor};font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;margin-right:8px;text-transform:uppercase;">${i.severity}</span>
        <span style="color:rgba(255,255,255,0.80);font-size:13px;">${i.title}</span>
        <br>
        <span style="color:rgba(255,255,255,0.25);font-size:10px;margin-top:2px;display:block;">${i.agentName}</span>
      </td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;min-height:100vh;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo -->
        <tr><td style="padding-bottom:32px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="display:inline-table;">
            <tr>
              <td style="padding-right:10px;vertical-align:middle;">
                <div style="width:32px;height:32px;background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:10px;"></div>
              </td>
              <td style="vertical-align:middle;">
                <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.5px;">Agenario</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Hero card -->
        <tr><td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:32px;margin-bottom:16px;">
          <p style="color:rgba(255,255,255,0.35);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px 0;">Threat Landscape Alert</p>
          <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 8px 0;line-height:1.3;">
            ${hasCves ? "New vulnerabilities detected" : hasScoreDrop ? "Your launch score dropped" : "Weekly security drift"}
          </h1>
          <p style="color:rgba(255,255,255,0.45);font-size:14px;margin:0 0 24px 0;line-height:1.6;">
            Hey ${data.userName}, while you were away, the threat landscape shifted. We ran an automated background pulse check on <strong style="color:rgba(255,255,255,0.7);">${data.appSource}</strong>.
          </p>

          <!-- Score display -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:20px;margin-bottom:24px;">
            <tr>
              <td>
                <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px 0;">Current Launch Score</p>
                <div style="display:flex;align-items:baseline;gap:8px;">
                  <span style="color:${scoreColor};font-size:40px;font-weight:900;line-height:1;">${data.currentScore}</span>
                  <span style="color:rgba(255,255,255,0.25);font-size:16px;">/100</span>
                  ${dropBadge ? `<span style="margin-left:8px;">${dropBadge} since last scan</span>` : ""}
                </div>
              </td>
            </tr>
          </table>

          ${hasCves ? `
          <!-- CVE alerts -->
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 10px 0;">🔴 New Dependency Vulnerabilities</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:12px;margin-bottom:24px;overflow:hidden;">
            <tbody>${cveRows}</tbody>
          </table>` : ""}

          ${issueRows ? `
          <!-- Issue alerts -->
          <p style="color:rgba(255,255,255,0.3);font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 10px 0;">⚠️ Agent-Detected Risks</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;margin-bottom:24px;overflow:hidden;">
            <tbody>${issueRows}</tbody>
          </table>` : ""}

          <!-- Context -->
          <p style="color:rgba(255,255,255,0.35);font-size:13px;line-height:1.7;margin:0 0 28px 0;">
            Your ${data.previousScore !== null ? "Creator" : "Agenario"} subscription actively monitors these shifts so you don't get caught off guard on launch day. The code hasn't changed — <strong style="color:rgba(255,255,255,0.6);">the world got more dangerous.</strong>
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center">
              <a href="${APP_URL}/scans/${data.scanId}"
                style="display:inline-block;background:#ffffff;color:#000000;font-size:14px;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:-0.2px;">
                Secure My Codebase →
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0;text-align:center;">
          <p style="color:rgba(255,255,255,0.15);font-size:11px;margin:0;">
            Agenario · AI-powered production review board · <a href="${APP_URL}/dashboard" style="color:rgba(255,255,255,0.25);text-decoration:none;">Dashboard</a>
          </p>
          <p style="color:rgba(255,255,255,0.1);font-size:10px;margin:8px 0 0 0;">
            You received this because you're subscribed to threat landscape alerts.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

// Set EMAIL_ENABLED=true in environment to enable email sending.
// Disabled by default — SMTP env vars must also be configured.
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === "true";

export async function sendRetentionEmail(data: RetentionEmailData): Promise<boolean> {
  if (!EMAIL_ENABLED) {
    logger.info({ userEmail: data.userEmail }, "Email sending disabled (EMAIL_ENABLED != true)");
    return false;
  }
  const transport = createTransport();
  if (!transport) {
    logger.warn({ userEmail: data.userEmail }, "Email transport not configured — set SMTP_HOST/SMTP_USER/SMTP_PASS");
    return false;
  }
  const { subject, html } = buildRetentionEmail(data);
  try {
    await transport.sendMail({
      from: `Agenario <${SMTP_FROM}>`,
      to: data.userEmail,
      subject,
      html,
    });
    logger.info({ userEmail: data.userEmail, subject }, "Retention email sent");
    return true;
  } catch (err) {
    logger.error({ err, userEmail: data.userEmail }, "Failed to send retention email");
    return false;
  }
}

export function previewRetentionEmail(data: RetentionEmailData): string {
  return buildRetentionEmail(data).html;
}
