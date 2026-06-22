export interface SecurityRule {
  id: string;
  name: string;
  category: "injection" | "auth" | "exposure" | "config" | "dos" | "rce" | "proto_pollution" | "ssrf" | "path_traversal" | "crypto" | "async" | "race" | "supply_chain" | "secrets" | "quality";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  pattern?: RegExp;
  cwe: string;
  owasp: string;
  fixPrompt: string;
  confidence: number;
}

export const SECURITY_RULES: SecurityRule[] = [
  // ── INJECTION (SQL, NoSQL, Command, XSS) ─────────────────────────────
  {
    id: "sec-sql-1",
    name: "Raw SQL Injection via Template Literals",
    category: "injection",
    severity: "critical",
    description: "User input concatenated directly into raw SQL query strings allows SQL injection attacks.",
    pattern: /\.query\s*\(\s*[`"].*\$\{.*\}.*(WHERE|INSERT|UPDATE|DELETE)[`"]/gi,
    cwe: "CWE-89",
    owasp: "A03:2021-Injection",
    fixPrompt: "Use parameterized queries exclusively: `db.query('SELECT * FROM users WHERE id = $1', [id])`.",
    confidence: 95,
  },
  {
    id: "sec-sql-2",
    name: "Prisma Raw Query Injection",
    category: "injection",
    severity: "critical",
    description: "Prisma `$queryRawUnsafe` or improperly parameterized `$queryRaw` allows SQL injection.",
    pattern: /prisma\.\$(?:queryRawUnsafe|executeRawUnsafe)\s*\(/g,
    cwe: "CWE-89",
    owasp: "A03:2021-Injection",
    fixPrompt: "Replace `$queryRawUnsafe` with `$queryRaw` using Prisma's tagged template literal mapping.",
    confidence: 98,
  },
  {
    id: "sec-nosql-1",
    name: "NoSQL Injection via Request Object Binding",
    category: "injection",
    severity: "high",
    description: "Passing `req.query` directly into Mongoose queries allows object injection.",
    pattern: /\.(?:find|findOne|update|delete)\s*\(\s*(?:req\.query|req\.body)\s*\)/g,
    cwe: "CWE-943",
    owasp: "A03:2021-Injection",
    fixPrompt: "Sanitize NoSQL inputs by specifically destructuring the required fields.",
    confidence: 90,
  },
  {
    id: "sec-cmd-1",
    name: "Command Injection via exec/spawn",
    category: "rce",
    severity: "critical",
    description: "Executing system commands with unsanitized user input allows Arbitrary Command Execution.",
    pattern: /(?:exec|execSync|spawn|spawnSync)\s*\(\s*[`"][^`"]*\$\{.*\}[^`"]*[`"]/g,
    cwe: "CWE-78",
    owasp: "A03:2021-Injection",
    fixPrompt: "Avoid shell commands. Use execFile with an array of arguments instead.",
    confidence: 95,
  },

  // ── AUTHENTICATION & SESSION ─────────────────────────────────────────
  {
    id: "sec-auth-1",
    name: "Weak JWT Secret",
    category: "auth",
    severity: "critical",
    description: "Hardcoded or weak secret key used for JWT signing.",
    pattern: /jwt\.sign\s*\([^,]+,\s*['"`](?:secret|password|12345|test)['"`]/i,
    cwe: "CWE-321",
    owasp: "A07:2021-Identification and Authentication Failures",
    fixPrompt: "Use a strong, randomly generated 256-bit key loaded from environment variables.",
    confidence: 99,
  },
  {
    id: "sec-auth-2",
    name: "JWT Signature Verification Bypass",
    category: "auth",
    severity: "critical",
    description: "Using `jwt.decode` without verifying the signature allows forged tokens.",
    pattern: /jwt\.decode\s*\(/g,
    cwe: "CWE-347",
    owasp: "A07:2021-Identification and Authentication Failures",
    fixPrompt: "Replace `jwt.decode` with `jwt.verify`.",
    confidence: 90,
  },
  {
    id: "sec-auth-3",
    name: "Timing Attack on Secret Comparison",
    category: "auth",
    severity: "high",
    description: "Using standard string equality (`===`) for secrets allows timing attacks.",
    pattern: /(?:password|secret|token|hash)\s*===?\s*(?:req\.|user\.)/i,
    cwe: "CWE-208",
    owasp: "A02:2021-Cryptographic Failures",
    fixPrompt: "Use `crypto.timingSafeEqual` for all secret or token comparisons.",
    confidence: 85,
  },
  {
    id: "sec-auth-4",
    name: "Hardcoded Credentials in Code",
    category: "secrets",
    severity: "critical",
    description: "Secrets or passwords hardcoded directly in the source code.",
    pattern: /(?:password|api_key|apikey|secret|token)\s*[:=]\s*['"`][a-zA-Z0-9_\-]{16,}['"`]/i,
    cwe: "CWE-798",
    owasp: "A07:2021-Identification and Authentication Failures",
    fixPrompt: "Move credentials to a secure secrets manager or environment variables.",
    confidence: 80,
  },

  // ── IDOR & ACCESS CONTROL ────────────────────────────────────────────
  {
    id: "sec-idor-1",
    name: "IDOR via Direct Object Reference in URL",
    category: "auth",
    severity: "critical",
    description: "Database queries using IDs from URL parameters without checking ownership.",
    pattern: /(?:db|prisma)\.\w+\.(?:findUnique|findOne|update|delete)\s*\(\s*\{\s*where\s*:\s*\{\s*id\s*:\s*req\.params\.id\s*\}\s*\}\s*\)/g,
    cwe: "CWE-639",
    owasp: "A01:2021-Broken Access Control",
    fixPrompt: "Add a condition to verify the resource belongs to the authenticated user.",
    confidence: 85,
  },
  {
    id: "sec-idor-2",
    name: "Mass Assignment / Over-posting",
    category: "auth",
    severity: "high",
    description: "Passing `req.body` directly to database update or create allows modification of read-only fields.",
    pattern: /(?:db|prisma)\.\w+\.(?:create|update)\s*\(\s*\{\s*data\s*:\s*req\.body\s*\}\s*\)/g,
    cwe: "CWE-915",
    owasp: "A01:2021-Broken Access Control",
    fixPrompt: "Destructure the allowed fields explicitly.",
    confidence: 95,
  },

  // ── SSRF ───────────────────────────────
  {
    id: "sec-ssrf-1",
    name: "Unvalidated SSRF via Fetch/Axios",
    category: "ssrf",
    severity: "critical",
    description: "Making HTTP requests to URLs provided directly by the user.",
    pattern: /(?:fetch|axios\.\w+)\s*\(\s*(?:req\.body\.\w+|req\.query\.\w+|req\.params\.\w+)\s*\)/g,
    cwe: "CWE-918",
    owasp: "A10:2021-Server-Side Request Forgery",
    fixPrompt: "Validate the URL against an allowlist.",
    confidence: 88,
  },

  // ── CRYPTO ───────────────────────────────────────────
  {
    id: "sec-crypto-1",
    name: "Weak Hashing Algorithm (MD5/SHA1)",
    category: "crypto",
    severity: "high",
    description: "Using cryptographically broken hashing algorithms.",
    pattern: /crypto\.createHash\s*\(\s*['"](?:md5|sha1)['"]\s*\)/i,
    cwe: "CWE-328",
    owasp: "A02:2021-Cryptographic Failures",
    fixPrompt: "Use strong hashing algorithms like SHA-256 or bcrypt.",
    confidence: 99,
  },
  {
    id: "sec-crypto-3",
    name: "Math.random() for Cryptographic Contexts",
    category: "crypto",
    severity: "medium",
    description: "Using Math.random() to generate tokens, passwords, or keys is insecure.",
    pattern: /(?:token|password|key|secret).*Math\.random/i,
    cwe: "CWE-338",
    owasp: "A02:2021-Cryptographic Failures",
    fixPrompt: "Use `crypto.randomBytes(32).toString('hex')` or `crypto.randomUUID()`.",
    confidence: 90,
  },

  // Note: Representing a portion of the 42 rules. Deep integration engine applies these against AST nodes.
];
