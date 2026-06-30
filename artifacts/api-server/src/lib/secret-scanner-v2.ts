/**
 * Secret & API Key Leakage Scanner
 * Deterministic, regex-based scanner — zero AI hallucinations.
 * Finds 40+ categories of hardcoded credentials in any code input.
 */

export interface SecretFinding {
  id: string;
  name: string;
  category: SecretCategory;
  risk: "critical" | "high" | "medium";
  maskedValue: string;
  context: string;
  lineHint: string;
  recommendation: string;
}

export interface SecretScanResults {
  totalFound: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  findings: SecretFinding[];
  scannedChars: number;
  hasCritical: boolean;
}

export type SecretCategory =
  | "payment"
  | "cloud-credentials"
  | "database"
  | "cryptographic"
  | "auth"
  | "ai-api"
  | "email"
  | "communication"
  | "vcs"
  | "credentials"
  | "generic";

interface Pattern {
  name: string;
  regex: RegExp;
  risk: "critical" | "high" | "medium";
  category: SecretCategory;
  recommendation: string;
}

const PATTERNS: Pattern[] = [
  // ── Payment ─────────────────────────────────────────
  {
    name: "Stripe Live Secret Key",
    regex: /sk_live_[0-9a-zA-Z_]{24,}/,
    risk: "critical",
    category: "payment",
    recommendation: "Remove from code immediately. Rotate in Stripe dashboard. Use STRIPE_SECRET_KEY env var.",
  },
  {
    name: "Stripe Test Secret Key",
    regex: /sk_test_[0-9a-zA-Z_]{24,}/,
    risk: "high",
    category: "payment",
    recommendation: "Move to STRIPE_SECRET_KEY env var. Test keys can still be used to list customers/charges.",
  },
  {
    name: "Stripe Webhook Secret",
    regex: /whsec_[0-9a-zA-Z]{24,}/,
    risk: "critical",
    category: "payment",
    recommendation: "Remove and regenerate webhook secret in Stripe. Use STRIPE_WEBHOOK_SECRET env var.",
  },
  {
    name: "Stripe Restricted Key",
    regex: /rk_live_[0-9a-zA-Z]{24,}/,
    risk: "critical",
    category: "payment",
    recommendation: "Revoke and regenerate in Stripe dashboard. Move to env vars.",
  },
  {
    name: "Razorpay Live Key Secret",
    regex: /rzp_live_[0-9a-zA-Z]{14,}/,
    risk: "critical",
    category: "payment",
    recommendation: "Regenerate in Razorpay dashboard immediately. Use RAZORPAY_KEY_SECRET env var.",
  },
  {
    name: "Razorpay Test Key Secret",
    regex: /rzp_test_[0-9a-zA-Z]{14,}/,
    risk: "high",
    category: "payment",
    recommendation: "Move to RAZORPAY_KEY_SECRET env var. Test keys expose order/payment data.",
  },
  {
    name: "PayPal Client Secret",
    regex: /paypal[_-]?(?:client[_-]?)?secret\s*[:=]\s*["']([A-Za-z0-9_-]{16,})["']/i,
    risk: "critical",
    category: "payment",
    recommendation: "Rotate PayPal credentials immediately. Use PAYPAL_CLIENT_SECRET env var.",
  },

  // ── Cloud Credentials ────────────────────────────────
  {
    name: "AWS Access Key ID",
    regex: /AKIA[0-9A-Z]{16}/,
    risk: "critical",
    category: "cloud-credentials",
    recommendation: "Deactivate key in AWS IAM immediately. Treat as compromised. Use AWS_ACCESS_KEY_ID env var.",
  },
  {
    name: "AWS Secret Access Key",
    regex: /aws[_-]?secret[_-]?(?:access[_-]?)?key\s*[:=]\s*["']?([A-Za-z0-9\/+=]{40})["']?/i,
    risk: "critical",
    category: "cloud-credentials",
    recommendation: "Rotate AWS credentials immediately. Scan CloudTrail for unauthorized access.",
  },
  {
    name: "Google API Key",
    regex: /AIza[0-9A-Za-z\-_]{35}/,
    risk: "critical",
    category: "cloud-credentials",
    recommendation: "Restrict key in Google Cloud Console and rotate. Use GOOGLE_API_KEY env var.",
  },
  {
    name: "Google OAuth Client Secret",
    regex: /GOCSPX-[0-9A-Za-z\-_]{28}/,
    risk: "critical",
    category: "cloud-credentials",
    recommendation: "Rotate OAuth client secret in Google Cloud Console immediately.",
  },
  {
    name: "Firebase Service Account Key",
    regex: /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/,
    risk: "critical",
    category: "cloud-credentials",
    recommendation: "Revoke service account key in Firebase Console. Never commit service account JSON files.",
  },
  {
    name: "Azure Client Secret",
    regex: /azure[_-]?client[_-]?secret\s*[:=]\s*["']([A-Za-z0-9~_\-.]{32,})["']/i,
    risk: "critical",
    category: "cloud-credentials",
    recommendation: "Rotate in Azure Active Directory. Use AZURE_CLIENT_SECRET env var.",
  },
  {
    name: "DigitalOcean Personal Access Token",
    regex: /dop_v1_[0-9a-f]{64}/,
    risk: "critical",
    category: "cloud-credentials",
    recommendation: "Revoke token in DigitalOcean dashboard. Use DO_ACCESS_TOKEN env var.",
  },
  {
    name: "Vercel Access Token",
    regex: /vercel[_-]?(?:access[_-]?)?token\s*[:=]\s*["']([A-Za-z0-9]{24,})["']/i,
    risk: "critical",
    category: "cloud-credentials",
    recommendation: "Revoke in Vercel settings. Use VERCEL_TOKEN env var.",
  },

  // ── Database ─────────────────────────────────────────
  {
    name: "PostgreSQL Connection URL (with credentials)",
    regex: /postgres(?:ql)?:\/\/[^:]+:[^@\s"']{3,}@[^/\s"']+/i,
    risk: "critical",
    category: "database",
    recommendation: "Rotate DB password immediately. Use DATABASE_URL env var. Enable DB audit logs.",
  },
  {
    name: "MongoDB Connection URL (with credentials)",
    regex: /mongodb(?:\+srv)?:\/\/[^:]+:[^@\s"']{3,}@[^\s"']+/i,
    risk: "critical",
    category: "database",
    recommendation: "Rotate MongoDB user password. Use MONGODB_URI env var.",
  },
  {
    name: "MySQL Connection URL (with credentials)",
    regex: /mysql(?:2)?:\/\/[^:]+:[^@\s"']{3,}@[^\s"']+/i,
    risk: "critical",
    category: "database",
    recommendation: "Rotate MySQL user password. Use DATABASE_URL env var.",
  },
  {
    name: "Redis URL (with credentials)",
    regex: /redis(?:s)?:\/\/:[^@\s"']{3,}@[^\s"']+/i,
    risk: "critical",
    category: "database",
    recommendation: "Rotate Redis password. Use REDIS_URL env var.",
  },
  {
    name: "Supabase Service Role Key",
    regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    risk: "critical",
    category: "database",
    recommendation: "Rotate Supabase keys in project settings. Service role key bypasses RLS — critical exposure.",
  },
  {
    name: "PlanetScale Database URL",
    regex: /mysql:\/\/[^:]+:[^@\s"']+@[^/\s"']+\.psdb\.cloud/i,
    risk: "critical",
    category: "database",
    recommendation: "Rotate PlanetScale branch password immediately.",
  },

  // ── Cryptographic ────────────────────────────────────
  {
    name: "RSA Private Key",
    regex: /-----BEGIN RSA PRIVATE KEY-----/,
    risk: "critical",
    category: "cryptographic",
    recommendation: "Remove private key from codebase entirely. Generate new key pair. Never commit private keys.",
  },
  {
    name: "EC Private Key",
    regex: /-----BEGIN EC PRIVATE KEY-----/,
    risk: "critical",
    category: "cryptographic",
    recommendation: "Remove EC private key from codebase. Generate new key pair.",
  },
  {
    name: "OpenSSH Private Key",
    regex: /-----BEGIN OPENSSH PRIVATE KEY-----/,
    risk: "critical",
    category: "cryptographic",
    recommendation: "Remove SSH private key from repo. Rotate the keypair on your server immediately.",
  },
  {
    name: "Generic PEM Private Key",
    regex: /-----BEGIN PRIVATE KEY-----/,
    risk: "critical",
    category: "cryptographic",
    recommendation: "Remove private key from codebase. Store in secrets manager (Vault, AWS Secrets Manager).",
  },
  {
    name: "Hardcoded Encryption Key",
    regex: /(?:encryption|encrypt|aes)[_-]?(?:key|secret)\s*[:=]\s*["']([0-9a-fA-F]{16,})["']/i,
    risk: "critical",
    category: "cryptographic",
    recommendation: "Move encryption key to env var. Rotate all data encrypted with this key.",
  },

  // ── Auth Tokens ──────────────────────────────────────
  {
    name: "JWT Secret (hardcoded)",
    regex: /jwt[_-]?secret\s*[:=]\s*["']([^"']{8,})["']/i,
    risk: "critical",
    category: "auth",
    recommendation: "Replace with JWT_SECRET env var (min 64-char random string). Rotate all issued tokens.",
  },
  {
    name: "Session Secret (hardcoded)",
    regex: /session[_-]?secret\s*[:=]\s*["']([^"']{6,})["']/i,
    risk: "critical",
    category: "auth",
    recommendation: "Move to SESSION_SECRET env var. Invalidates all active sessions when rotated.",
  },
  {
    name: "Cookie Secret (hardcoded)",
    regex: /cookie[_-]?secret\s*[:=]\s*["']([^"']{6,})["']/i,
    risk: "critical",
    category: "auth",
    recommendation: "Move to COOKIE_SECRET env var. Use openssl rand -base64 48 to generate.",
  },
  {
    name: "Weak or Default JWT Secret",
    regex: /jwt[_-]?secret\s*[:=]\s*["'](secret|password|changeme|1234|test|your[_-]?secret|mysecret)["']/i,
    risk: "critical",
    category: "auth",
    recommendation: "This is a default/weak secret. Replace with JWT_SECRET env var using 64+ random chars.",
  },
  {
    name: "API Key in Code (generic)",
    regex: /(?:api[_-]?key|apikey)\s*[:=]\s*["']([a-zA-Z0-9_\-]{20,})["']/i,
    risk: "high",
    category: "auth",
    recommendation: "Move to API_KEY env var. Rotate the key with the provider.",
  },
  {
    name: "Bearer Token (hardcoded)",
    regex: /[Bb]earer\s+([a-zA-Z0-9_\-.]{30,})/,
    risk: "high",
    category: "auth",
    recommendation: "Remove hardcoded bearer token. Use token from environment or auth flow.",
  },

  // ── AI APIs ──────────────────────────────────────────
  {
    name: "OpenAI API Key",
    regex: /sk-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20}/,
    risk: "critical",
    category: "ai-api",
    recommendation: "Revoke in OpenAI dashboard immediately. Use OPENAI_API_KEY env var. Check usage logs for abuse.",
  },
  {
    name: "OpenAI API Key (new format)",
    regex: /sk-proj-[a-zA-Z0-9_-]{40,}/,
    risk: "critical",
    category: "ai-api",
    recommendation: "Revoke in OpenAI dashboard. Use OPENAI_API_KEY env var.",
  },
  {
    name: "Anthropic API Key",
    regex: /sk-ant-(?:api03-)?[a-zA-Z0-9_-]{80,}/,
    risk: "critical",
    category: "ai-api",
    recommendation: "Revoke in Anthropic Console. Use ANTHROPIC_API_KEY env var.",
  },
  {
    name: "Groq API Key",
    regex: /gsk_[a-zA-Z0-9]{40,}/,
    risk: "critical",
    category: "ai-api",
    recommendation: "Revoke in Groq Console. Use GROQ_API_KEY env var.",
  },
  {
    name: "Replicate API Token",
    regex: /r8_[a-zA-Z0-9]{40}/,
    risk: "critical",
    category: "ai-api",
    recommendation: "Revoke in Replicate dashboard. Use REPLICATE_API_TOKEN env var.",
  },
  {
    name: "HuggingFace API Token",
    regex: /hf_[a-zA-Z0-9]{30,}/,
    risk: "high",
    category: "ai-api",
    recommendation: "Revoke in HuggingFace settings. Use HUGGINGFACE_TOKEN env var.",
  },
  {
    name: "Cohere API Key",
    regex: /cohere[_-]?(?:api[_-]?)?key\s*[:=]\s*["']([a-zA-Z0-9]{40})["']/i,
    risk: "critical",
    category: "ai-api",
    recommendation: "Revoke in Cohere dashboard. Use COHERE_API_KEY env var.",
  },

  // ── Email ────────────────────────────────────────────
  {
    name: "SendGrid API Key",
    regex: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/,
    risk: "critical",
    category: "email",
    recommendation: "Revoke in SendGrid API Keys. Use SENDGRID_API_KEY env var.",
  },
  {
    name: "Mailgun API Key",
    regex: /(?:key)-[0-9a-fA-F]{32}/,
    risk: "high",
    category: "email",
    recommendation: "Rotate in Mailgun account. Use MAILGUN_API_KEY env var.",
  },
  {
    name: "Resend API Key",
    regex: /re_[a-zA-Z0-9_]{20,}/,
    risk: "high",
    category: "email",
    recommendation: "Revoke in Resend dashboard. Use RESEND_API_KEY env var.",
  },
  {
    name: "Postmark Server Token",
    regex: /postmark[_-]?(?:server[_-]?)?(?:api[_-]?)?token\s*[:=]\s*["']([a-fA-F0-9-]{36})["']/i,
    risk: "high",
    category: "email",
    recommendation: "Rotate in Postmark account. Use POSTMARK_API_TOKEN env var.",
  },

  // ── Communication ────────────────────────────────────
  {
    name: "Twilio Account SID",
    regex: /AC[a-f0-9]{32}/,
    risk: "high",
    category: "communication",
    recommendation: "Use TWILIO_ACCOUNT_SID env var. Pair with rotation of auth token.",
  },
  {
    name: "Twilio Auth Token",
    regex: /twilio[_-]?auth[_-]?token\s*[:=]\s*["']([0-9a-f]{32})["']/i,
    risk: "critical",
    category: "communication",
    recommendation: "Rotate in Twilio Console. Use TWILIO_AUTH_TOKEN env var.",
  },
  {
    name: "Slack Bot Token",
    regex: /xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/,
    risk: "high",
    category: "communication",
    recommendation: "Revoke in Slack app settings. Use SLACK_BOT_TOKEN env var.",
  },
  {
    name: "Slack App-Level Token",
    regex: /xapp-[0-9]+-[A-Z0-9]+-[0-9]+-[a-fA-F0-9]{64}/,
    risk: "critical",
    category: "communication",
    recommendation: "Revoke app-level token in Slack app settings immediately.",
  },
  {
    name: "Discord Bot Token",
    regex: /[MN][A-Za-z0-9_-]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}/,
    risk: "critical",
    category: "communication",
    recommendation: "Regenerate bot token in Discord Developer Portal. Use DISCORD_BOT_TOKEN env var.",
  },
  {
    name: "Telegram Bot Token",
    regex: /[0-9]{8,10}:[a-zA-Z0-9_-]{35}/,
    risk: "high",
    category: "communication",
    recommendation: "Revoke via BotFather /revoke. Use TELEGRAM_BOT_TOKEN env var.",
  },

  // ── VCS ──────────────────────────────────────────────
  {
    name: "GitHub Personal Access Token (classic)",
    regex: /ghp_[0-9a-zA-Z]{36}/,
    risk: "critical",
    category: "vcs",
    recommendation: "Revoke token in GitHub settings → Developer settings → Personal access tokens.",
  },
  {
    name: "GitHub Fine-Grained Token",
    regex: /github_pat_[0-9a-zA-Z_]{82}/,
    risk: "critical",
    category: "vcs",
    recommendation: "Revoke fine-grained token in GitHub settings immediately.",
  },
  {
    name: "GitHub Actions Token",
    regex: /ghs_[0-9a-zA-Z]{36}/,
    risk: "critical",
    category: "vcs",
    recommendation: "This is a GitHub Actions token — likely from a CI leak. Invalidate the workflow run.",
  },
  {
    name: "GitLab Personal Access Token",
    regex: /glpat-[0-9a-zA-Z_-]{20}/,
    risk: "critical",
    category: "vcs",
    recommendation: "Revoke in GitLab User Settings → Access Tokens.",
  },

  // ── Generic Credentials ──────────────────────────────
  {
    name: "Hardcoded Admin Password",
    regex: /admin[_-]?(?:password|passwd|pwd)\s*[:=]\s*["']([^"']{4,})["']/i,
    risk: "critical",
    category: "credentials",
    recommendation: "Remove hardcoded admin credentials. Use environment variables or a secrets manager.",
  },
  {
    name: "Hardcoded Password (generic)",
    regex: /(?:^|[,{;\s])password\s*[:=]\s*["']([^"'\s]{6,})["']/im,
    risk: "high",
    category: "credentials",
    recommendation: "Remove hardcoded password. Use environment variables.",
  },
  {
    name: "SMTP Credentials",
    regex: /smtp[_-]?(?:pass(?:word)?|pwd)\s*[:=]\s*["']([^"']{4,})["']/i,
    risk: "high",
    category: "credentials",
    recommendation: "Move SMTP credentials to SMTP_PASS env var. Use app-specific passwords.",
  },
];

function maskValue(match: string): string {
  if (match.length <= 8) return "****";
  return match.slice(0, 6) + "..." + match.slice(-4);
}

function extractLineContext(code: string, matchIndex: number): string {
  const lineStart = code.lastIndexOf("\n", matchIndex) + 1;
  const lineEnd = code.indexOf("\n", matchIndex);
  const line = code.slice(lineStart, lineEnd === -1 ? code.length : lineEnd).trim();
  return line.slice(0, 120);
}

function estimateLineNumber(code: string, matchIndex: number): string {
  const linesBeforeMatch = code.slice(0, matchIndex).split("\n").length;
  return `~line ${linesBeforeMatch}`;
}

function deduplicateFindings(findings: SecretFinding[]): SecretFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.name}:${f.maskedValue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function scanForSecrets(code: string): SecretScanResults {
  const findings: SecretFinding[] = [];
  const maxScan = Math.min(code.length, 500_000); // cap at 500KB
  const scanned = code.slice(0, maxScan);

  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.regex.source, "gm");
    let match: RegExpExecArray | null;
    let count = 0;
    while ((match = regex.exec(scanned)) !== null && count < 5) {
      const fullMatch = match[0];
      const capturedGroup = match[1] ?? fullMatch;
      findings.push({
        id: `${pattern.category}-${findings.length}`,
        name: pattern.name,
        category: pattern.category,
        risk: pattern.risk,
        maskedValue: maskValue(capturedGroup),
        context: extractLineContext(scanned, match.index),
        lineHint: estimateLineNumber(scanned, match.index),
        recommendation: pattern.recommendation,
      });
      count++;
    }
  }

  const deduped = deduplicateFindings(findings);
  const criticalCount = deduped.filter((f) => f.risk === "critical").length;
  const highCount = deduped.filter((f) => f.risk === "high").length;
  const mediumCount = deduped.filter((f) => f.risk === "medium").length;

  return {
    totalFound: deduped.length,
    criticalCount,
    highCount,
    mediumCount,
    findings: deduped,
    scannedChars: maxScan,
    hasCritical: criticalCount > 0,
  };
}

/**
 * Scan code context from a directory (multiple files).
 * Returns aggregated results.
 */
export function scanFilesForSecrets(
  keyFiles: Array<{ path: string; content: string }>,
  appDescription?: string | null,
): SecretScanResults {
  const combined = keyFiles
    .map((f) => `// FILE: ${f.path}\n${f.content}`)
    .join("\n\n");

  // Also scan the description for accidentally pasted keys
  const fullInput = combined + (appDescription ? `\n\n// DESCRIPTION:\n${appDescription}` : "");
  return scanForSecrets(fullInput);
}
