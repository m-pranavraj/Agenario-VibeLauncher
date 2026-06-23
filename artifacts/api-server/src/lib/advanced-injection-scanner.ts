/**
 * Advanced Injection Vulnerability Scanner
 * ─────────────────────────────────────────────────────────────────────────
 * Covers the injection vulnerability classes that were missing or incomplete:
 *
 * 1. PATH TRAVERSAL — fs.readFile(userInput), path.join(req.params.file) without validation
 * 2. SSTI — Server-Side Template Injection (EJS, Handlebars, Pug with user data)
 * 3. XXE — XML External Entity (xml2js, fast-xml-parser, libxml with unsafe config)
 * 4. OPEN REDIRECT — res.redirect(req.query.url) without allowlist validation
 * 5. LOG INJECTION — User input in log messages (newline injection)
 * 6. INSECURE FILE UPLOAD — Missing type/size validation on multer
 * 7. MASS ASSIGNMENT via spread operator
 *
 * Competitor coverage: Aikido (Path Traversal ✅, XXE ✅), Snyk (all ✅)
 */

type KeyFile = { path: string; content: string };

export interface InjectionFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  fixPrompt: string;
  confidence: number;
  category: "path-traversal" | "ssti" | "xxe" | "open-redirect" | "log-injection" | "file-upload" | "mass-assign";
  owasp: string;
  cwe: string;
}

// ── Path Traversal Patterns ────────────────────────────────────────────
const PATH_TRAVERSAL_PATTERNS = [
  {
    pattern: /fs\.(?:readFile|readFileSync|createReadStream|writeFile|writeFileSync|access|stat)\s*\(\s*(?:req\.|path\.join\s*\([^)]*req\.)/g,
    title: "Path Traversal via fs Module with User Input",
    description: "Node.js filesystem operation called with a path derived from user input (req.params/req.query). An attacker can traverse directories to read sensitive files like /etc/passwd or ../../.env.",
    fix: "Validate and sanitize the path with path.resolve() and ensure it stays within the allowed directory:\n```\nconst safeRoot = path.resolve('./uploads');\nconst requested = path.resolve(safeRoot, req.params.filename);\nif (!requested.startsWith(safeRoot)) return res.status(403).json({ error: 'Forbidden' });\n```",
    cwe: "CWE-22",
    confidence: 90,
  },
  {
    pattern: /path\.join\s*\(\s*(?:__dirname|__filename|process\.cwd\(\)|'[^']*')\s*,\s*(?:req\.|params\.|query\.)/g,
    title: "Path Traversal via path.join with User Input",
    description: "path.join() called with user-controlled segments. On Unix, path.join('/base', '../../etc/passwd') resolves to '/etc/passwd', bypassing directory restrictions.",
    fix: "Use path.resolve() and validate the result starts with the allowed base directory. Never pass user input directly to path.join().",
    cwe: "CWE-22",
    confidence: 88,
  },
  {
    pattern: /res\.(?:sendFile|download)\s*\(\s*(?:req\.|path\.join[^)]*req\.)/g,
    title: "Path Traversal via res.sendFile/download with User Input",
    description: "Express res.sendFile() or res.download() called with a path derived from user request parameters, enabling directory traversal to serve arbitrary files.",
    fix: "Use express.static() for static file serving, or validate file paths against an allowlist of permitted filenames.",
    cwe: "CWE-22",
    confidence: 92,
  },
];

// ── SSTI Patterns ──────────────────────────────────────────────────────
const SSTI_PATTERNS = [
  {
    pattern: /res\.render\s*\(\s*(?:req\.|userInput|template|view)\./g,
    title: "SSTI: Template Name from User Input (res.render)",
    description: "Express res.render() called with a template name derived from user input. An attacker can specify arbitrary template paths or inject template syntax, leading to Remote Code Execution.",
    fix: "Use a hardcoded template name or validate against an explicit allowlist of valid template names:\n```\nconst VALID_TEMPLATES = ['home', 'about', 'contact'];\nconst template = VALID_TEMPLATES.includes(req.query.page) ? req.query.page : 'home';\nres.render(template, { data: sanitizedData });\n```",
    cwe: "CWE-94",
    confidence: 88,
  },
  {
    pattern: /ejs\.render\s*\([^)]*req\./g,
    title: "SSTI: EJS Template Rendered with User Input",
    description: "EJS template engine renders user-controlled input directly. EJS SSTI can lead to RCE via <%- global.process.mainModule.require('child_process').execSync('id') %>.",
    fix: "Sanitize user input before passing to EJS. Use EJS's `escape` option (<%=) instead of unescaped (<%-).\nSee CVE-2022-29078 for EJS SSTI RCE.",
    cwe: "CWE-94",
    confidence: 92,
  },
  {
    pattern: /handlebars\.compile\s*\(\s*req\./g,
    title: "SSTI: Handlebars Template Compiled from User Input",
    description: "Handlebars compiles user-provided strings as templates. Attackers can use prototype-polluting helpers to achieve RCE.",
    fix: "Never compile user input as Handlebars templates. Pre-compile all templates at build time.",
    cwe: "CWE-94",
    confidence: 90,
  },
  {
    pattern: /pug\.render\s*\([^)]*req\./g,
    title: "SSTI: Pug/Jade Template Rendered with User Input",
    description: "Pug template engine renders user-controlled content. Pug SSTI allows JavaScript execution via #{code} syntax.",
    fix: "Sanitize all user inputs and use Pug's `escape` filter for user content.",
    cwe: "CWE-94",
    confidence: 88,
  },
];

// ── XXE Patterns ───────────────────────────────────────────────────────
const XXE_PATTERNS = [
  {
    pattern: /xml2js\.parseString\s*\([^)]*req\.|xml2js\.Parser\s*\(\s*\{[^}]*expandEntities\s*:\s*true/g,
    title: "XXE: xml2js Parsing User-Controlled XML",
    description: "xml2js parses XML from user input. By default, xml2js has expandEntities disabled, but if enabled, attackers can read arbitrary server files via External Entity references like <!ENTITY xxe SYSTEM 'file:///etc/passwd'>.",
    fix: "Ensure expandEntities is false (default). Validate and sanitize XML input before parsing. Consider using JSON instead of XML for user APIs.",
    cwe: "CWE-611",
    confidence: 82,
  },
  {
    pattern: /fast-xml-parser|xmlbuilder|libxmljs/g,
    title: "XXE Risk: XML Parsing Library Detected",
    description: "XML parsing library detected. XML parsers are vulnerable to XXE injection if entity expansion is not explicitly disabled. Check configuration for resolveEntities or expandEntities settings.",
    fix: "Explicitly disable entity resolution:\n- fast-xml-parser: `{ allowBooleanAttributes: false, parseAttributeValue: false, resolveEntities: false }`\n- libxmljs: Use LIBXML_NOENT flag carefully or avoid external DTDs",
    cwe: "CWE-611",
    confidence: 70,
  },
  {
    pattern: /resolveEntities\s*:\s*true/g,
    title: "XXE: XML Entity Resolution Enabled",
    description: "XML parser explicitly configured with resolveEntities: true. This enables XXE attacks, allowing attackers to read local files and potentially perform SSRF.",
    fix: "Set resolveEntities: false in your XML parser configuration.",
    cwe: "CWE-611",
    confidence: 98,
  },
];

// ── Open Redirect Patterns ─────────────────────────────────────────────
const OPEN_REDIRECT_PATTERNS = [
  {
    pattern: /res\.redirect\s*\(\s*(?:req\.(?:query|body|params)\.\w+|`[^`]*\$\{req\.)/g,
    title: "Open Redirect via User-Controlled URL",
    description: "Express redirect() called with a URL from user input. Attackers craft links that appear to be from your domain but redirect victims to phishing sites: yourapp.com/redirect?url=https://evil.com",
    fix: "Validate redirect URLs against an explicit allowlist:\n```\nconst ALLOWED_HOSTS = ['yourdomain.com', 'app.yourdomain.com'];\nconst redirectUrl = new URL(req.query.url, 'https://yourdomain.com');\nif (!ALLOWED_HOSTS.includes(redirectUrl.hostname)) return res.redirect('/');\nres.redirect(redirectUrl.toString());\n```",
    cwe: "CWE-601",
    confidence: 90,
  },
  {
    pattern: /window\.location\s*=\s*(?:decodeURI(?:Component)?\s*\()?\s*(?:params|searchParams|location\.search|location\.hash)/g,
    title: "Open Redirect via Client-Side URL Parameter",
    description: "Client-side code sets window.location to a value from URL parameters. This enables open redirects via JavaScript.",
    fix: "Validate the redirect target against a list of allowed origins before redirecting.",
    cwe: "CWE-601",
    confidence: 85,
  },
];

// ── Log Injection Patterns ─────────────────────────────────────────────
const LOG_INJECTION_PATTERNS = [
  {
    pattern: /console\.(?:log|info|warn|error)\s*\([`"'][^`"']*\$\{(?:req\.|user\.)/g,
    title: "Log Injection: User Input in Log Message",
    description: "User-controlled data interpolated directly into log messages. Attackers can inject newlines to forge log entries, contaminate audit logs, and bypass log-based anomaly detection: `username: admin\\nINFO: login success`",
    fix: "Use structured logging — log fields separately, not interpolated into strings:\n```\nlogger.info({ userId: req.params.id, action: 'login' }, 'User action'); // ✅\nconsole.log(`User logged in: ${req.body.username}`); // ❌\n```",
    cwe: "CWE-117",
    confidence: 80,
  },
];

// ── Insecure File Upload Patterns ──────────────────────────────────────
const FILE_UPLOAD_PATTERNS = [
  {
    pattern: /multer\s*\(\s*\{(?![^}]*(?:fileFilter|limits))/g,
    title: "Insecure File Upload: multer Without fileFilter or limits",
    description: "File upload configured with multer without fileFilter to validate MIME types or limits to cap file size. Attackers can upload executable files (.php, .js, shell scripts) or oversized files causing DoS.",
    fix: "Add fileFilter and limits to multer:\n```\nconst upload = multer({\n  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max\n  fileFilter: (req, file, cb) => {\n    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];\n    cb(null, allowedTypes.includes(file.mimetype));\n  }\n});\n```",
    cwe: "CWE-434",
    confidence: 82,
  },
  {
    pattern: /req\.files?\.(?:mv|path)|formidable/g,
    title: "File Upload: Validate MIME Type and Extension",
    description: "File upload detected. Ensure MIME type validation is performed on the server side (not just by file extension), as attackers can rename files.",
    fix: "Use the `file-type` npm package to validate actual file content (magic bytes), not just the extension or MIME type header.",
    cwe: "CWE-434",
    confidence: 70,
  },
];

// ── Mass Assignment via Spread ─────────────────────────────────────────
const MASS_ASSIGN_SPREAD_PATTERNS = [
  {
    pattern: /\.\s*(?:create|update|save|updateOne|updateMany|findOneAndUpdate)\s*\(\s*\{[^}]*\.\.\.\s*req\.body/g,
    title: "Mass Assignment via Spread of req.body",
    description: "req.body spread directly into database operation using `...req.body`. Even with destructuring-style objects, spread bypasses field allowlisting and allows clients to set privileged fields (isAdmin, role, balance, userId).",
    fix: "Explicitly pick allowed fields:\n```\n// ❌ Dangerous:\nawait db.users.update({ id }, { ...req.body });\n\n// ✅ Safe:\nconst { name, email, bio } = req.body;\nawait db.users.update({ id }, { name, email, bio });\n```",
    cwe: "CWE-915",
    confidence: 90,
  },
];

// ── Cookie Security Patterns ───────────────────────────────────────────
const COOKIE_SECURITY_PATTERNS = [
  {
    pattern: /res\.cookie\s*\(\s*['"`][^'"`,]+['"`]\s*,[^,]+,\s*\{(?![^}]*httpOnly\s*:\s*true)/g,
    title: "Auth Cookie Missing HttpOnly Flag",
    description: "Authentication cookie set without HttpOnly flag. Without HttpOnly, JavaScript can access the cookie value, enabling XSS attacks to steal session tokens.",
    fix: "Always set httpOnly: true on session/auth cookies:\n`res.cookie('session', token, { httpOnly: true, secure: true, sameSite: 'strict' })`",
    cwe: "CWE-1004",
    confidence: 85,
  },
  {
    pattern: /res\.cookie\s*\(\s*['"`][^'"`,]+['"`]\s*,[^,]+,\s*\{(?![^}]*(?:sameSite|SameSite))/g,
    title: "Auth Cookie Missing SameSite Attribute",
    description: "Cookie set without SameSite attribute. Without SameSite, cookies are sent on cross-origin requests, enabling CSRF attacks.",
    fix: "Set SameSite='Strict' or 'Lax' on all cookies:\n`res.cookie('session', token, { httpOnly: true, secure: true, sameSite: 'strict' })`",
    cwe: "CWE-1275",
    confidence: 80,
  },
  {
    pattern: /res\.cookie\s*\(\s*['"`][^'"`,]+['"`]\s*,[^,]+,\s*\{(?![^}]*secure\s*:\s*true)/g,
    title: "Auth Cookie Missing Secure Flag",
    description: "Cookie set without Secure flag. Without Secure, the cookie is transmitted over unencrypted HTTP, enabling interception via man-in-the-middle attacks.",
    fix: "Add `secure: true` to all auth cookies:\n`res.cookie('session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' })`",
    cwe: "CWE-614",
    confidence: 80,
  },
];

// ── JWT Algorithm Confusion ────────────────────────────────────────────
const JWT_ALGO_CONFUSION_PATTERNS = [
  {
    pattern: /algorithms\s*:\s*\[\s*['"`](?:none|HS(?:256|384|512))['"`]/g,
    title: "JWT: 'none' Algorithm Allowed",
    description: "JWT verification allows the 'none' algorithm. Attackers craft tokens with alg: 'none' and no signature, bypassing all JWT security.",
    fix: "Always specify allowed algorithms explicitly and exclude 'none':\n```\njwt.verify(token, secret, { algorithms: ['HS256'] });\n// Never use: algorithms: ['none']\n```",
    cwe: "CWE-347",
    confidence: 98,
  },
  {
    pattern: /jwt\.verify\s*\([^)]*\)\s*(?!.*algorithms)/g,
    title: "JWT Verification Without Algorithm Specification",
    description: "JWT verification called without specifying allowed algorithms. This allows the RS256→HS256 algorithm confusion attack, where attackers sign tokens with the server's public key treated as an HMAC secret.",
    fix: "Always specify the algorithms option:\n```\njwt.verify(token, secret, { algorithms: ['HS256'] })\n```",
    cwe: "CWE-327",
    confidence: 78,
  },
  {
    pattern: /jwt\.verify\s*\([^,]+,\s*[^,)]+\)(?!\s*\.\s*then|\s*;|\s*catch|\s*\/\/)/g,
    title: "Unhandled JWT Verification Result",
    description: "jwt.verify() called synchronously without try/catch. If the token is invalid, jwt.verify throws, crashing the process or bypassing auth in some frameworks.",
    fix: "Wrap jwt.verify in try/catch and handle verification errors:\n```\ntry {\n  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });\n  // use decoded\n} catch (err) {\n  return res.status(401).json({ error: 'Invalid token' });\n}\n```",
    cwe: "CWE-755",
    confidence: 75,
  },
];

// ── OAuth Misconfiguration Patterns ────────────────────────────────────
const OAUTH_MISC_PATTERNS = [
  {
    pattern: /redirect_uri\s*[:=]\s*['"`][^'"`,]*\*|callbackURL\s*:\s*['"`][^'"`,]*\*/g,
    title: "OAuth: Wildcard redirect_uri",
    description: "OAuth redirect URI contains a wildcard. This allows authorization code injection attacks where attackers control the redirect destination and steal authorization codes.",
    fix: "Register exact redirect URIs in your OAuth provider. Never use wildcards.\nValid: `redirect_uri: 'https://yourdomain.com/auth/callback'`\nInvalid: `redirect_uri: 'https://yourdomain.com/*'`",
    cwe: "CWE-601",
    confidence: 95,
  },
  {
    pattern: /state\s*:\s*(?:null|undefined|''|"")\s*(?:,|})/g,
    title: "OAuth: Missing state Parameter (CSRF in OAuth Flow)",
    description: "OAuth flow uses null or empty state parameter. The state parameter prevents CSRF attacks during OAuth. Without it, attackers can trick users into connecting attacker-controlled accounts.",
    fix: "Generate a cryptographically random state value per login attempt:\n```\nconst state = crypto.randomBytes(16).toString('hex');\nreq.session.oauthState = state;\n// Include state in authorization URL and verify on callback\n```",
    cwe: "CWE-352",
    confidence: 88,
  },
  {
    pattern: /email\s*:\s*(?:profile\.emails\[0\]\.value|user\.email)(?!\s*(?:&&|if|\|\|).*(?:sub|id|userId))/g,
    title: "OAuth: Email Used as Identifier Without Sub Claim Verification",
    description: "OAuth login uses email as the unique identifier without verifying the `sub` claim. Some providers allow email changes, and some malicious providers can set any email value, enabling account takeover.",
    fix: "Use the `sub` (subject) claim as the unique identifier for OAuth users:\n```\nconst userId = profile.id; // sub claim — stable and provider-unique\n// NOT: const userId = profile.emails[0].value; // email can be changed\n```",
    cwe: "CWE-287",
    confidence: 80,
  },
];

// ── WebSocket Security Patterns ────────────────────────────────────────
const WEBSOCKET_SECURITY_PATTERNS = [
  {
    pattern: /on\s*\(\s*['"`]connection['"`]\s*,\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{(?![^}]*(?:session|auth|token|jwt|userId))/g,
    title: "WebSocket: No Authentication on Connection Handler",
    description: "WebSocket connection handler does not verify authentication. Any client can connect to the WebSocket server without a valid session or token.",
    fix: "Validate authentication in the connection handler:\n```\nio.use((socket, next) => {\n  const token = socket.handshake.auth.token;\n  try {\n    socket.userId = jwt.verify(token, secret).userId;\n    next();\n  } catch (err) {\n    next(new Error('Unauthorized'));\n  }\n});\n```",
    cwe: "CWE-306",
    confidence: 72,
  },
  {
    pattern: /server\.on\s*\(\s*['"`]upgrade['"`]/g,
    title: "WebSocket: Manual Upgrade Handler — Verify Origin",
    description: "Manual WebSocket upgrade handler detected. Ensure the Origin header is validated to prevent Cross-Site WebSocket Hijacking (CSWH), where a malicious website opens a WebSocket connection using the victim's cookies.",
    fix: "Validate Origin header in upgrade handler:\n```\nif (req.headers.origin !== 'https://yourdomain.com') {\n  socket.destroy();\n  return;\n}\n```",
    cwe: "CWE-346",
    confidence: 75,
  },
];

export function runAdvancedInjectionScanner(keyFiles: KeyFile[]): InjectionFinding[] {
  const findings: InjectionFinding[] = [];
  let findingIndex = 0;
  const makeId = (prefix: string) => `${prefix}-${++findingIndex}`;

  const allPatterns: Array<{
    patterns: Array<{ pattern: RegExp; title: string; description: string; fix: string; cwe: string; confidence: number }>;
    category: InjectionFinding["category"];
    owasp: string;
    severity: InjectionFinding["severity"];
  }> = [
    { patterns: PATH_TRAVERSAL_PATTERNS, category: "path-traversal", owasp: "A01:2021-Broken Access Control", severity: "critical" },
    { patterns: SSTI_PATTERNS, category: "ssti", owasp: "A03:2021-Injection", severity: "critical" },
    { patterns: XXE_PATTERNS, category: "xxe", owasp: "A03:2021-Injection", severity: "high" },
    { patterns: OPEN_REDIRECT_PATTERNS, category: "open-redirect", owasp: "A01:2021-Broken Access Control", severity: "medium" },
    { patterns: LOG_INJECTION_PATTERNS, category: "log-injection", owasp: "A03:2021-Injection", severity: "medium" },
    { patterns: FILE_UPLOAD_PATTERNS, category: "file-upload", owasp: "A03:2021-Injection", severity: "high" },
    { patterns: MASS_ASSIGN_SPREAD_PATTERNS, category: "mass-assign", owasp: "A01:2021-Broken Access Control", severity: "high" },
  ];

  for (const file of keyFiles) {
    const { path: filePath, content } = file;
    if (!content || !/\.(ts|js|tsx|jsx)$/.test(filePath)) continue;

    const isTestFile = /test|spec|mock|fixture/.test(filePath.toLowerCase());
    if (isTestFile) continue;

    const lines = content.split("\n");

    for (const { patterns, category, owasp, severity } of allPatterns) {
      for (const vuln of patterns) {
        vuln.pattern.lastIndex = 0;

        for (let i = 0; i < lines.length; i++) {
          if (vuln.pattern.test(lines[i])) {
            vuln.pattern.lastIndex = 0;
            findings.push({
              id: makeId(category.toUpperCase().slice(0, 4)),
              severity,
              title: vuln.title,
              description: vuln.description,
              evidence: `${filePath}:${i + 1}: ${lines[i].trim().slice(0, 120)}`,
              filePath,
              lineNumber: i + 1,
              codeSnippet: lines[i].trim().slice(0, 200),
              fixPrompt: vuln.fix,
              confidence: vuln.confidence,
              category,
              owasp,
              cwe: vuln.cwe,
            });
            break;
          }
          vuln.pattern.lastIndex = 0;
        }
      }
    }
  }

  return findings;
}

export function runAuthHardeningScanner(keyFiles: KeyFile[]): InjectionFinding[] {
  const findings: InjectionFinding[] = [];
  let findingIndex = 0;
  const makeId = (prefix: string) => `${prefix}-${++findingIndex}`;

  const authPatternGroups: Array<{
    patterns: Array<{ pattern: RegExp; title: string; description: string; fix: string; cwe: string; confidence: number }>;
    category: InjectionFinding["category"];
    owasp: string;
    severity: InjectionFinding["severity"];
  }> = [
    { patterns: JWT_ALGO_CONFUSION_PATTERNS, category: "mass-assign" as const, owasp: "A07:2021-Identification and Authentication Failures", severity: "critical" },
    { patterns: OAUTH_MISC_PATTERNS, category: "mass-assign" as const, owasp: "A07:2021-Identification and Authentication Failures", severity: "high" },
    { patterns: COOKIE_SECURITY_PATTERNS, category: "mass-assign" as const, owasp: "A02:2021-Cryptographic Failures", severity: "medium" },
    { patterns: WEBSOCKET_SECURITY_PATTERNS, category: "mass-assign" as const, owasp: "A07:2021-Identification and Authentication Failures", severity: "high" },
  ];

  for (const file of keyFiles) {
    const { path: filePath, content } = file;
    if (!content || !/\.(ts|js|tsx|jsx)$/.test(filePath)) continue;

    const isTestFile = /test|spec|mock|fixture/.test(filePath.toLowerCase());
    if (isTestFile) continue;

    const lines = content.split("\n");

    for (const { patterns, owasp, severity } of authPatternGroups) {
      for (const vuln of patterns) {
        vuln.pattern.lastIndex = 0;

        for (let i = 0; i < lines.length; i++) {
          if (vuln.pattern.test(lines[i])) {
            vuln.pattern.lastIndex = 0;
            const category = vuln.title.includes("JWT") ? "mass-assign" :
              vuln.title.includes("OAuth") ? "mass-assign" :
              vuln.title.includes("Cookie") ? "mass-assign" :
              "mass-assign";

            findings.push({
              id: makeId("AUTH"),
              severity,
              title: vuln.title,
              description: vuln.description,
              evidence: `${filePath}:${i + 1}: ${lines[i].trim().slice(0, 120)}`,
              filePath,
              lineNumber: i + 1,
              codeSnippet: lines[i].trim().slice(0, 200),
              fixPrompt: vuln.fix,
              confidence: vuln.confidence,
              category,
              owasp,
              cwe: vuln.cwe,
            });
            break;
          }
          vuln.pattern.lastIndex = 0;
        }
      }
    }
  }

  return findings;
}
