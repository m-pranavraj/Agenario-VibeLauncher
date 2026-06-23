export type RuleCategory =
  | "denial-of-service"
  | "code-execution"
  | "injection"
  | "auth-bypass"
  | "data-exposure"
  | "crypto-failure"
  | "config-misconfig"
  | "path-traversal"
  | "ssrf"
  | "prototype-pollution"
  | "mass-assignment"
  | "race-condition"
  | "insecure-deserialization"
  | "hardcoded-secrets"
  | "supply-chain"
  | "business-logic"
  | "memory-safety"
  | "async-errors"
  | "xss"
  | "open-redirect"
  | "header-injection";

export interface SecurityRule {
  id: string;
  name: string;
  category: RuleCategory;
  severity: "critical" | "high" | "medium" | "low" | "info";
  cwe: string[];
  owasp: string[];
  description: string;
  impact: string;
  detection: "regex" | "ast" | "csg" | "composite";
  patterns: string[];
  excludePatterns?: string[];
  contextPatterns?: string[];
  fixAdvice: string;
}

export interface SecurityFinding {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  severity: "critical" | "high" | "medium" | "low" | "info";
  cwe: string[];
  owasp: string[];
  description: string;
  impact: string;
  file: string;
  line: number;
  column: number;
  code: string;
  fixAdvice: string;
  confidence: number;
}

export interface SecurityFindingStats {
  rulesChecked: number;
  filesScanned: number;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  durationMs: number;
}

export const SECURITY_RULES: SecurityRule[] = [
  {
    "id": "REDOS-001",
    "name": "User input in RegExp constructor (ReDoS)",
    "category": "denial-of-service",
    "severity": "critical",
    "cwe": [
      "CWE-1333",
      "CWE-400"
    ],
    "owasp": [
      "A1"
    ],
    "description": "User-controlled input is passed directly to the RegExp constructor without sanitization, creating a ReDoS vulnerability. Attackers can craft input causing catastrophic backtracking, freezing the event loop.",
    "impact": "An attacker can freeze the server process by sending crafted input that triggers exponential backtracking in the regex engine, causing a complete denial of service for all users.",
    "detection": "regex",
    "patterns": [
      "new RegExp\\(req\\.",
      "new RegExp\\(input",
      "new RegExp\\(body\\.",
      "new RegExp\\(query",
      "new RegExp\\(params\\.",
      "RegExp\\(req\\."
    ],
    "fixAdvice": "Use the re2 library for safe regular expressions, or sanitize user input before passing to RegExp. Apply timeout guards on regex execution."
  },
  {
    "id": "DOS-002",
    "name": "Synchronous file read in request handler",
    "category": "denial-of-service",
    "severity": "high",
    "cwe": [
      "CWE-400",
      "CWE-1173"
    ],
    "owasp": [
      "A1"
    ],
    "description": "Synchronous file system operations are used inside request handlers, blocking the Node.js event loop and preventing the server from processing other requests.",
    "impact": "Large file operations block the event loop, causing degraded performance or complete unresponsiveness. An attacker can trigger many concurrent requests to amplify the effect.",
    "detection": "regex",
    "patterns": [
      "readFileSync\\(req",
      "writeFileSync\\(req",
      "existsSync\\(req",
      "readdirSync\\(req",
      "mkdirSync\\(req",
      "unlinkSync\\(req",
      "statSync\\(req",
      "appendFileSync\\(req"
    ],
    "fixAdvice": "Use fs.promises (e.g., fs.promises.readFile) or async fs methods with proper error handling instead of sync variants in request handlers."
  },
  {
    "id": "DOS-003",
    "name": "JSON.parse with user input without try-catch",
    "category": "denial-of-service",
    "severity": "high",
    "cwe": [
      "CWE-754",
      "CWE-400"
    ],
    "owasp": [
      "A1"
    ],
    "description": "JSON.parse is called on user-controlled input without wrapping in a try-catch block. Malformed JSON causes an uncaught exception that crashes the request.",
    "impact": "An attacker can crash the request handler by sending malformed JSON. In unhandled promise rejection scenarios, this can crash the entire process.",
    "detection": "regex",
    "patterns": [
      "JSON.parse\\(req\\.",
      "JSON.parse\\(body",
      "JSON.parse\\(input",
      "JSON.parse\\(query",
      "JSON.parse\\(params",
      "JSON.parse\\(payload"
    ],
    "fixAdvice": "Always wrap JSON.parse calls on user input in try-catch blocks. Consider using a safe JSON parser with configurable depth limits."
  },
  {
    "id": "DOS-004",
    "name": "Uncontrolled resource allocation (loop with user bound)",
    "category": "denial-of-service",
    "severity": "critical",
    "cwe": [
      "CWE-770"
    ],
    "owasp": [
      "A1"
    ],
    "description": "User-controlled input is used as the upper bound of a loop or to allocate an array without any size limits, allowing an attacker to exhaust server memory or CPU.",
    "impact": "An attacker can cause Out-of-Memory crashes or extreme CPU usage by providing large numeric values, effectively bringing down the server.",
    "detection": "regex",
    "patterns": [
      "i < req\\.",
      "i < body\\.",
      "i < params\\.",
      "i < query\\.",
      "new Array\\(req\\.",
      "new Array\\(body\\.",
      "new Array\\(input"
    ],
    "fixAdvice": "Always clamp user-supplied numeric input to a safe maximum. Validate and limit array sizes before allocation."
  },
  {
    "id": "DOS-005",
    "name": "Unbounded request body / no payload size limit",
    "category": "denial-of-service",
    "severity": "high",
    "cwe": [
      "CWE-770"
    ],
    "owasp": [
      "A1"
    ],
    "description": "Express body-parser middleware is configured without a size limit, allowing attackers to send arbitrarily large request bodies that exhaust server memory.",
    "impact": "An attacker can send multi-gigabyte payloads to consume all available RAM, causing OOM crashes or severe performance degradation.",
    "detection": "regex",
    "patterns": [
      "express\\.json\\(\\)",
      "express\\.urlencoded\\(\\)"
    ],
    "excludePatterns": [
      "express\\.json\\(\\{.*limit",
      "express\\.urlencoded\\(\\{.*limit"
    ],
    "fixAdvice": "Add a size limit to body parsers: express.json({ limit: \"1mb\" }) or express.urlencoded({ limit: \"1mb\", extended: true })."
  },
  {
    "id": "DOS-006",
    "name": "process.exit() in request handler",
    "category": "denial-of-service",
    "severity": "critical",
    "cwe": [
      "CWE-404"
    ],
    "owasp": [
      "A1"
    ],
    "description": "process.exit() is called from within a request handler, immediately terminating the entire Node.js process and causing a denial of service for all users.",
    "impact": "A single request can crash the entire server. This creates an easy denial-of-service vector - an attacker only needs to trigger the code path that calls exit.",
    "detection": "regex",
    "patterns": [
      "process\\.exit\\("
    ],
    "fixAdvice": "Remove process.exit() from request handlers. Return appropriate HTTP error responses instead of crashing the process."
  },
  {
    "id": "DOS-007",
    "name": "Unhandled promise rejection in async handler",
    "category": "denial-of-service",
    "severity": "high",
    "cwe": [
      "CWE-754"
    ],
    "owasp": [
      "A1"
    ],
    "description": "An async route handler does not have a try-catch block, causing unhandled promise rejections that may crash the process.",
    "impact": "Unhandled rejections crash the Node.js process in newer versions that treat unhandled rejections as fatal. Even without crashing, behavior becomes undefined.",
    "detection": "regex",
    "patterns": [
      "async\\(\\s*req",
      "async\\s+function\\s+\\(\\s*req"
    ],
    "contextPatterns": [
      "async",
      "try\\s*\\{"
    ],
    "fixAdvice": "Wrap async handler logic in try-catch blocks and call next(err) for Express. Use express-async-errors to automatically catch promise rejections."
  },
  {
    "id": "DOS-008",
    "name": "Unbounded file upload without size/mime validation",
    "category": "denial-of-service",
    "severity": "high",
    "cwe": [
      "CWE-770",
      "CWE-434"
    ],
    "owasp": [
      "A1"
    ],
    "description": "File upload middleware is configured without file size limits or MIME type validation, allowing attackers to upload arbitrarily large or dangerous files.",
    "impact": "Attackers can exhaust disk space with large uploads, or upload malicious files that could lead to RCE if served or processed.",
    "detection": "regex",
    "patterns": [
      "multer\\(\\)",
      "multer\\(\\{\\}",
      "upload\\.single\\(",
      "upload\\.array\\(",
      "req\\.files"
    ],
    "excludePatterns": [
      "fileSize",
      "limits"
    ],
    "fixAdvice": "Configure multer with fileSize limits and fileFilter for MIME type validation."
  },
  {
    "id": "DOS-009",
    "name": "Unbounded database query result (no LIMIT)",
    "category": "denial-of-service",
    "severity": "high",
    "cwe": [
      "CWE-770"
    ],
    "owasp": [
      "A1"
    ],
    "description": "Database queries are executed without a LIMIT clause, allowing results to return millions of rows and consuming excessive memory and bandwidth.",
    "impact": "An attacker can trigger queries that return massive result sets, causing OOM crashes or overwhelming the database connection pool.",
    "detection": "regex",
    "patterns": [
      "\\.find\\(\\{",
      "\\.findMany\\(",
      "SELECT \\* FROM",
      "\\.findAll\\(\\{"
    ],
    "excludePatterns": [
      "limit",
      "take:",
      "\\.limit\\("
    ],
    "fixAdvice": "Always use pagination: add .limit(100) in Mongoose, take: 100 in Prisma, or LIMIT 100 in SQL."
  },
  {
    "id": "DOS-010",
    "name": "User input in SQL query without parameterization",
    "category": "injection",
    "severity": "critical",
    "cwe": [
      "CWE-89"
    ],
    "owasp": [
      "A1"
    ],
    "description": "User-controlled input is interpolated directly into SQL query strings using template literals or concatenation, creating SQL injection vulnerabilities.",
    "impact": "An attacker can execute arbitrary SQL commands, potentially reading, modifying, or deleting all data in the database.",
    "detection": "regex",
    "patterns": [
      "\\$\\{.*req\\.",
      "\\$\\{.*body\\.",
      "\\$\\{.*input",
      "\\$\\{.*params\\.",
      "\\$\\{.*query\\."
    ],
    "fixAdvice": "Use parameterized queries with placeholders. For Prisma, use $queryRaw type-safe templates instead of interpolation."
  },
  {
    "id": "DOS-011",
    "name": "Prisma $queryRawUnsafe with user input",
    "category": "injection",
    "severity": "critical",
    "cwe": [
      "CWE-89"
    ],
    "owasp": [
      "A1"
    ],
    "description": "Prisma queryRawUnsafe or executeRawUnsafe methods are called with user-controlled input, bypassing Prisma type-safe query builder and enabling SQL injection.",
    "impact": "Same as SQL injection - attacker can execute arbitrary SQL on the database.",
    "detection": "regex",
    "patterns": [
      "\\$queryRawUnsafe\\(req",
      "\\$executeRawUnsafe\\(req",
      "\\$queryRawUnsafe\\(body",
      "\\$executeRawUnsafe\\(body",
      "\\$queryRawUnsafe\\(input",
      "\\$executeRawUnsafe\\(input"
    ],
    "fixAdvice": "Use $queryRaw with Prisma tagged template literals instead of $queryRawUnsafe."
  },
  {
    "id": "DOS-012",
    "name": "Missing rate limiting on auth endpoints",
    "category": "denial-of-service",
    "severity": "high",
    "cwe": [
      "CWE-307"
    ],
    "owasp": [
      "A2"
    ],
    "description": "Authentication endpoints are not protected by rate limiting, allowing brute-force attacks or account enumeration.",
    "impact": "Attackers can perform unlimited login attempts, brute-force passwords, enumerate valid usernames, or trigger mass password reset emails.",
    "detection": "regex",
    "patterns": [
      "router\\.post\\(\\s*['\"`]login",
      "router\\.post\\(\\s*['\"`]signup",
      "router\\.post\\(\\s*['\"`]register",
      "router\\.post\\(\\s*['\"`]forgot",
      "router\\.post\\(\\s*['\"`]reset"
    ],
    "contextPatterns": [
      "rateLimit",
      "rate-limit",
      "RateLimit"
    ],
    "fixAdvice": "Apply express-rate-limit on auth routes: 5-10 attempts per minute for login, 1-3 for password reset."
  },
  {
    "id": "DOS-013",
    "name": "Blocking event loop with sync crypto",
    "category": "denial-of-service",
    "severity": "medium",
    "cwe": [
      "CWE-400"
    ],
    "owasp": [
      "A1"
    ],
    "description": "Synchronous cryptographic operations like bcrypt.hashSync block the event loop for hundreds of milliseconds per call.",
    "impact": "Multiple concurrent auth requests cause cascading delays as each sync bcrypt call blocks the event loop.",
    "detection": "regex",
    "patterns": [
      "bcrypt\\.hashSync",
      "bcrypt\\.compareSync",
      "crypto\\.pbkdf2Sync"
    ],
    "fixAdvice": "Use async alternatives: bcrypt.hash() instead of bcrypt.hashSync()."
  },
  {
    "id": "DOS-014",
    "name": "Open redirect via user input",
    "category": "open-redirect",
    "severity": "medium",
    "cwe": [
      "CWE-601"
    ],
    "owasp": [
      "A1"
    ],
    "description": "User-controlled input is passed to res.redirect() without validation, allowing attackers to redirect users to arbitrary external phishing sites.",
    "impact": "Attackers can create convincing phishing URLs using the application domain, tricking users into visiting malicious sites.",
    "detection": "regex",
    "patterns": [
      "res\\.redirect\\(req\\.",
      "res\\.redirect\\(body\\.",
      "res\\.redirect\\(query\\.",
      "res\\.redirect\\(params\\."
    ],
    "fixAdvice": "Use a URL allowlist for redirect destinations. Validate that the redirect URL starts with a known safe prefix."
  },
  {
    "id": "DOS-015",
    "name": "Mass assignment / parameter pollution",
    "category": "mass-assignment",
    "severity": "high",
    "cwe": [
      "CWE-915"
    ],
    "owasp": [
      "A1"
    ],
    "description": "The entire req.body is passed directly to database update/create methods without filtering, allowing attackers to set arbitrary fields like isAdmin or role.",
    "impact": "An attacker can escalate privileges by setting protected fields like role: \"admin\" during signup or profile update.",
    "detection": "regex",
    "patterns": [
      "\\.update\\(req\\.body",
      "\\.create\\(req\\.body",
      "findByIdAndUpdate\\(req\\.body",
      "\\.updateOne\\(req\\.body",
      "\\.insertOne\\(req\\.body",
      "Object\\.assign\\(.*req\\.body"
    ],
    "fixAdvice": "Use a whitelist approach: destructure only expected fields or use lodash.pick to select allowed fields."
  },
  {
    "id": "PROTO-001",
    "name": "Prototype pollution via unsafe object merge",
    "category": "prototype-pollution",
    "severity": "critical",
    "cwe": [
      "CWE-1321"
    ],
    "owasp": [
      "A1"
    ],
    "description": "Unsafe object merge operations using Object.assign, _.merge, or deepMerge on user-controlled input can set __proto__ properties, polluting all object prototypes.",
    "impact": "Prototype pollution can bypass security checks, inject properties into all objects, and enable RCE in some runtimes.",
    "detection": "regex",
    "patterns": [
      "Object\\.assign\\(req\\.body",
      "merge\\(req\\.body",
      "deepMerge\\(req\\.body",
      "_\\.merge\\(req\\.body",
      "Object\\.assign\\(body"
    ],
    "fixAdvice": "Strip __proto__, constructor, and prototype keys from user input before merging. Use libraries that defend against prototype pollution."
  },
  {
    "id": "PROTO-002",
    "name": "express.urlencoded with extended:true",
    "category": "prototype-pollution",
    "severity": "high",
    "cwe": [
      "CWE-1321"
    ],
    "owasp": [
      "A1"
    ],
    "description": "express.urlencoded configured with extended:true uses the qs library which can parse nested objects and enable prototype pollution.",
    "impact": "Attackers can pollute Object.prototype with crafted query strings, potentially bypassing auth checks or causing unexpected behavior.",
    "detection": "regex",
    "patterns": [
      "urlencoded\\(\\{.*extended:\\s*true"
    ],
    "fixAdvice": "Use express.urlencoded({ extended: false }) which uses the querystring library that does not support nested object parsing."
  },
  {
    "id": "AUTH-001",
    "name": "JWT \"none\" algorithm not rejected",
    "category": "auth-bypass",
    "severity": "critical",
    "cwe": [
      "CWE-347"
    ],
    "owasp": [
      "A2"
    ],
    "description": "jsonwebtoken.verify() is called without specifying allowed algorithms. Attackers can craft tokens with algorithm \"none\" to bypass authentication.",
    "impact": "An attacker can forge valid JWTs by setting the algorithm to \"none\" and omitting the signature, gaining unauthorized access.",
    "detection": "regex",
    "patterns": [
      "jwt\\.verify\\(token",
      "jwt\\.verify\\(.*secret",
      "jwt\\.verify\\(.*key"
    ],
    "excludePatterns": [
      "algorithms:"
    ],
    "fixAdvice": "Always specify allowed algorithms: jwt.verify(token, secret, { algorithms: ['HS256'] })."
  },
  {
    "id": "AUTH-002",
    "name": "Hardcoded JWT secret in source code",
    "category": "hardcoded-secrets",
    "severity": "critical",
    "cwe": [
      "CWE-798"
    ],
    "owasp": [
      "A2"
    ],
    "description": "A hardcoded string literal is used as the JWT signing secret. Secrets in source code are exposed in version control.",
    "impact": "Anyone with access to the source code can forge valid JWTs and impersonate any user.",
    "detection": "regex",
    "patterns": [
      "jwt\\.sign\\(.*['\"`][A-Za-z0-9_\\-]{8,}",
      "secret:\\s*['\"`][A-Za-z]",
      "jwtSecret:\\s*['\"`][A-Za-z]"
    ],
    "fixAdvice": "Store JWT secrets in environment variables (process.env.JWT_SECRET). Use 256-bit random secrets via crypto.randomBytes."
  },
  {
    "id": "AUTH-003",
    "name": "Insufficient entropy (Math.random for tokens)",
    "category": "crypto-failure",
    "severity": "high",
    "cwe": [
      "CWE-338"
    ],
    "owasp": [
      "A2"
    ],
    "description": "Math.random() is used to generate session tokens, reset tokens, or API keys. Math.random is not cryptographically secure.",
    "impact": "An attacker who observes generated tokens can predict future tokens and hijack user sessions or reset passwords.",
    "detection": "regex",
    "patterns": [
      "Math\\.random\\(\\)\\.toString\\(36",
      "Math\\.random.*token",
      "token.*Math\\.random"
    ],
    "fixAdvice": "Use crypto.randomBytes() or crypto.randomUUID() for token generation."
  },
  {
    "id": "AUTH-004",
    "name": "Weak password hashing (MD5/SHA1)",
    "category": "crypto-failure",
    "severity": "critical",
    "cwe": [
      "CWE-327"
    ],
    "owasp": [
      "A2"
    ],
    "description": "Weak hash algorithms (MD5, SHA1) are used for password storage. These are designed for speed and can be cracked rapidly.",
    "impact": "Password database leaks can be cracked efficiently. MD5 and SHA1 are trivially reversible with modern GPU hardware.",
    "detection": "regex",
    "patterns": [
      "createHash\\(['\"`]md5",
      "createHash\\('sha1'"
    ],
    "fixAdvice": "Use bcrypt (cost factor 10+), argon2, or scrypt for password hashing."
  },
  {
    "id": "AUTH-005",
    "name": "Insecure cookie config (no httpOnly/secure/sameSite)",
    "category": "auth-bypass",
    "severity": "high",
    "cwe": [
      "CWE-1004"
    ],
    "owasp": [
      "A2"
    ],
    "description": "Authentication cookies are set without httpOnly, secure, or sameSite flags, making them accessible to JavaScript.",
    "impact": "An XSS attacker can steal session tokens via document.cookie and hijack user sessions.",
    "detection": "regex",
    "patterns": [
      "res\\.cookie\\(\\s*['\"`]token",
      "res\\.cookie\\(\\s*['\"`]session",
      "res\\.cookie\\(\\s*['\"`]auth"
    ],
    "contextPatterns": [
      "httpOnly:\\s*false"
    ],
    "fixAdvice": "Set cookie options: { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 3600000 }."
  },
  {
    "id": "SSRF-001",
    "name": "SSRF via user-provided URL",
    "category": "ssrf",
    "severity": "critical",
    "cwe": [
      "CWE-918"
    ],
    "owasp": [
      "A1"
    ],
    "description": "User-controlled input is passed directly to HTTP request functions, allowing attackers to make requests to internal services.",
    "impact": "An attacker can access internal cloud metadata endpoints, internal services, or scan the internal network.",
    "detection": "regex",
    "patterns": [
      "fetch\\(req\\.",
      "axios\\.get\\(req\\.",
      "axios\\.post\\(req\\.",
      "got\\(req\\.",
      "got\\.get\\(req\\.",
      "http\\.request\\(req\\.",
      "https\\.request\\(req\\.",
      "axios\\(req\\.",
      "fetch\\(body\\."
    ],
    "fixAdvice": "Use a strict URL allowlist. Validate against allowed domains. Block private IP ranges. Never allow requests to internal addresses."
  },
  {
    "id": "SSRF-002",
    "name": "SSRF via file/image URL processing",
    "category": "ssrf",
    "severity": "high",
    "cwe": [
      "CWE-918"
    ],
    "owasp": [
      "A1"
    ],
    "description": "User-provided image URLs are passed to image processing libraries without validation, enabling SSRF attacks.",
    "impact": "Attackers can probe internal services by providing URLs to internal endpoints.",
    "detection": "regex",
    "patterns": [
      "sharp\\(req\\.",
      "sharp\\(body\\.",
      "Jimp\\.read\\(req\\.",
      "Jimp\\.read\\(body\\."
    ],
    "fixAdvice": "Use signed URLs with expiration. Validate URLs against a domain allowlist."
  },
  {
    "id": "PT-001",
    "name": "Path traversal in file operations",
    "category": "path-traversal",
    "severity": "critical",
    "cwe": [
      "CWE-22"
    ],
    "owasp": [
      "A1"
    ],
    "description": "User-controlled input is used to construct file paths without proper validation, allowing attackers to read/write files outside the intended directory.",
    "impact": "An attacker can read arbitrary files or write malicious files to arbitrary locations, potentially achieving RCE.",
    "detection": "regex",
    "patterns": [
      "readFileSync.*req\\.",
      "writeFileSync.*req\\.",
      "unlinkSync.*req\\.",
      "createReadStream.*req\\.",
      "createWriteStream.*req\\.",
      "path\\.join.*req\\.",
      "path\\.resolve.*req\\.",
      "readFile.*params\\."
    ],
    "fixAdvice": "Validate the resolved path stays within the intended base directory. Reject paths containing \"..\" or null bytes."
  },
  {
    "id": "RCE-001",
    "name": "Command injection via exec/spawn",
    "category": "code-execution",
    "severity": "critical",
    "cwe": [
      "CWE-78"
    ],
    "owasp": [
      "A1"
    ],
    "description": "User-controlled input is passed to exec/spawn without sanitization, allowing arbitrary shell command injection.",
    "impact": "An attacker can execute arbitrary commands on the server, gaining full control over the application.",
    "detection": "regex",
    "patterns": [
      "exec\\(req\\.",
      "execSync\\(req\\.",
      "spawn\\(req\\.",
      "exec\\(body\\.",
      "exec\\(input"
    ],
    "fixAdvice": "Avoid shell commands. Use execFile() or spawn() with arguments as separate array elements."
  },
  {
    "id": "RCE-002",
    "name": "eval/new Function with user input",
    "category": "code-execution",
    "severity": "critical",
    "cwe": [
      "CWE-95"
    ],
    "owasp": [
      "A1"
    ],
    "description": "eval() or new Function() is called with user-controlled input, allowing arbitrary code execution.",
    "impact": "An attacker can execute arbitrary JavaScript on the server, leading to complete system compromise.",
    "detection": "regex",
    "patterns": [
      "eval\\(req\\.",
      "eval\\(body\\.",
      "eval\\(input",
      "new Function\\(req\\.",
      "new Function\\(body\\."
    ],
    "fixAdvice": "Never use eval() or new Function() with user input."
  },
  {
    "id": "RCE-003",
    "name": "Insecure deserialization",
    "category": "insecure-deserialization",
    "severity": "high",
    "cwe": [
      "CWE-502"
    ],
    "owasp": [
      "A1"
    ],
    "description": "User-controlled input is deserialized without proper validation or depth limits.",
    "impact": "Attackers can trigger prototype pollution or execute code through malicious serialized objects.",
    "detection": "regex",
    "patterns": [
      "JSON\\.parse\\(",
      "deserialize",
      "unserialize"
    ],
    "excludePatterns": [
      "catch",
      "try"
    ],
    "fixAdvice": "Use a safe JSON parser with depth limits. Validate structure after parsing against a strict schema."
  },
  {
    "id": "CONFIG-001",
    "name": "CORS wildcard origin with credentials",
    "category": "config-misconfig",
    "severity": "high",
    "cwe": [
      "CWE-942"
    ],
    "owasp": [
      "A1"
    ],
    "description": "CORS is configured with origin: * and credentials: true simultaneously.",
    "impact": "Any site can make authenticated requests and read responses, leading to data exposure.",
    "detection": "regex",
    "patterns": [
      "origin:\\s*['\"`]\\*['\"`].*credentials:\\s*true",
      "credentials:\\s*true.*origin:\\s*['\"`]\\*['\"`]"
    ],
    "fixAdvice": "Specify explicit origins instead of wildcard when using credentials."
  },
  {
    "id": "CONFIG-002",
    "name": "Stack traces exposed in production",
    "category": "data-exposure",
    "severity": "high",
    "cwe": [
      "CWE-209"
    ],
    "owasp": [
      "A3"
    ],
    "description": "Error stack traces or detailed error messages are sent to the client, leaking sensitive information.",
    "impact": "Attackers can learn the application directory structure, framework versions, and library versions.",
    "detection": "regex",
    "patterns": [
      "err\\.stack",
      "error\\.stack",
      "NODE_ENV.*development"
    ],
    "fixAdvice": "Send generic error messages to clients. Log detailed errors server-side with a centralized error handler."
  },
  {
    "id": "CONFIG-003",
    "name": "Insecure transport (HTTP)",
    "category": "config-misconfig",
    "severity": "high",
    "cwe": [
      "CWE-319"
    ],
    "owasp": [
      "A3"
    ],
    "description": "The application uses http.createServer() instead of https.createServer(), transmitting data in plaintext.",
    "impact": "An attacker on the same network can intercept all traffic and steal session tokens and credentials via MITM.",
    "detection": "regex",
    "patterns": [
      "http\\.createServer"
    ],
    "excludePatterns": [
      "https",
      "ssl",
      "tls",
      "proxy"
    ],
    "fixAdvice": "Use HTTPS in production with valid TLS certificates. Redirect HTTP to HTTPS."
  },
  {
    "id": "CONFIG-004",
    "name": "Hardcoded API key/secret",
    "category": "hardcoded-secrets",
    "severity": "critical",
    "cwe": [
      "CWE-798"
    ],
    "owasp": [
      "A2"
    ],
    "description": "Hardcoded API keys, secrets, or credentials found in source code.",
    "impact": "Credentials in source code are exposed to anyone with repository access. Automated scanners can exploit these keys within minutes.",
    "detection": "regex",
    "patterns": [
      "sk_live_",
      "sk_test_",
      "ghp_",
      "AKIA",
      "mongodb\\+srv://[^:]+:[^@]+@",
      "-----BEGIN.*PRIVATE KEY-----"
    ],
    "fixAdvice": "Use environment variables for all secrets. Use a secrets manager. Add .env to .gitignore."
  },
  {
    "id": "ASYNC-001",
    "name": "Promise rejection without error handling",
    "category": "async-errors",
    "severity": "high",
    "cwe": [
      "CWE-754"
    ],
    "owasp": [
      "A1"
    ],
    "description": "A Promise chain is used without a .catch() handler, meaning rejections are silently swallowed.",
    "impact": "Unhandled promise rejections crash the Node.js process in Node >= 15.",
    "detection": "regex",
    "patterns": [
      "\\.then\\(",
      "\\.then\\(.*\\.then\\("
    ],
    "excludePatterns": [
      "\\.catch\\("
    ],
    "fixAdvice": "Always attach a .catch() handler to promise chains. Use async/await with try-catch instead."
  },
  {
    "id": "ASYNC-002",
    "name": "Missing try-catch in async route handler",
    "category": "async-errors",
    "severity": "critical",
    "cwe": [
      "CWE-248"
    ],
    "owasp": [
      "A1"
    ],
    "description": "An async route handler does not handle promise rejections. Express does not catch async errors automatically.",
    "impact": "Unhandled rejections crash the Node.js process. All async route errors result in 500 without proper error logging.",
    "detection": "regex",
    "patterns": [
      "async\\s+\\(req",
      "async\\s+function\\s+\\(req"
    ],
    "excludePatterns": [
      "try\\s*\\{",
      "\\.catch\\("
    ],
    "fixAdvice": "Wrap async handler bodies in try-catch and call next(err). Use express-async-errors package."
  },
  {
    "id": "EXP-001",
    "name": "Sensitive data in server response",
    "category": "data-exposure",
    "severity": "high",
    "cwe": [
      "CWE-200"
    ],
    "owasp": [
      "A3"
    ],
    "description": "Sensitive fields like passwords or tokens are included in API response objects without filtering.",
    "impact": "Password hashes and tokens exposed in responses enable credential theft and session hijacking.",
    "detection": "regex",
    "patterns": [
      "res\\.json\\(.*password",
      "res\\.json\\(.*token.*user",
      "res\\.send\\(.*password"
    ],
    "excludePatterns": [
      "select.*password",
      "exclude"
    ],
    "fixAdvice": "Use response mapping/dto pattern to strip sensitive fields. Use .select('-password') in Mongoose."
  },
  {
    "id": "EXP-002",
    "name": "Verbose error messages disclosing internals",
    "category": "data-exposure",
    "severity": "medium",
    "cwe": [
      "CWE-209"
    ],
    "owasp": [
      "A3"
    ],
    "description": "Error responses include internal details such as file paths, SQL queries, or stack traces.",
    "impact": "Information disclosure aids attackers in crafting further attacks.",
    "detection": "regex",
    "patterns": [
      "SQL.*error.*res",
      "err\\.message.*res\\.",
      "send.*error\\.message"
    ],
    "fixAdvice": "Log full error details server-side and return only a generic message to the client."
  },
  {
    "id": "BIZ-001",
    "name": "IDOR (Insecure Direct Object Reference)",
    "category": "business-logic",
    "severity": "high",
    "cwe": [
      "CWE-639"
    ],
    "owasp": [
      "A1"
    ],
    "description": "User-supplied object IDs are used directly in database queries without verifying user ownership.",
    "impact": "An attacker can access other users data by simply changing an ID parameter in requests.",
    "detection": "regex",
    "patterns": [
      "findById\\(req\\.params",
      "findOne\\(\\{.*req\\.params\\.",
      "findByPk\\(req\\.params"
    ],
    "fixAdvice": "Always verify object ownership: findOne({ id: req.params.id, userId: req.user.id })."
  },
  {
    "id": "BIZ-002",
    "name": "Missing ownership check in update/delete",
    "category": "business-logic",
    "severity": "high",
    "cwe": [
      "CWE-639"
    ],
    "owasp": [
      "A1"
    ],
    "description": "Update/delete operations use findByIdAndUpdate/Delete without verifying the resource belongs to the user.",
    "impact": "Any authenticated user can modify or delete other users data.",
    "detection": "regex",
    "patterns": [
      "findByIdAndUpdate\\(req\\.params",
      "findByIdAndDelete\\(req\\.params",
      "updateOne\\(\\{.*req\\.params"
    ],
    "fixAdvice": "Add user ownership filter: findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, update)."
  },
  {
    "id": "RACE-001",
    "name": "Check-then-act race condition",
    "category": "race-condition",
    "severity": "high",
    "cwe": [
      "CWE-367"
    ],
    "owasp": [
      "A1"
    ],
    "description": "The application checks a condition and then performs an action, but concurrent requests can interleave between check and action.",
    "impact": "Race conditions lead to overselling inventory, double-spending, or abuse of limited-use tokens.",
    "detection": "regex",
    "patterns": [
      "if\\s*\\(.*stock.*>",
      "if\\s*\\(.*balance.*>=",
      "if\\s*\\(.*available",
      "if\\s*\\(.*count.*>"
    ],
    "contextPatterns": [
      "await",
      ".save",
      ".update",
      "findOneAnd"
    ],
    "fixAdvice": "Use atomic database operations. Use transactions or optimistic locking with version fields."
  },
  {
    "id": "RACE-002",
    "name": "Non-atomic database read-then-write",
    "category": "race-condition",
    "severity": "medium",
    "cwe": [
      "CWE-367"
    ],
    "owasp": [
      "A1"
    ],
    "description": "Sensitive operations perform separate read and write queries without atomicity.",
    "impact": "Concurrent requests can lead to inconsistent state, double-spending, or overselling.",
    "detection": "regex",
    "patterns": [
      "balance",
      "inventory",
      "stock",
      "withdraw",
      "deposit",
      "transfer",
      "redeem",
      "claim"
    ],
    "contextPatterns": [
      "const\\s+\\w+\\s*=\\s*await",
      "let\\s+\\w+\\s*=\\s*await"
    ],
    "fixAdvice": "Use atomic operations (MongoDB $inc, Prisma increment, SQL UPDATE ... SET x = x - 1 WHERE x > 0)."
  },
  {
    "id": "SUP-001",
    "name": "Dependency confusion attack surface",
    "category": "supply-chain",
    "severity": "high",
    "cwe": [
      "CWE-1104"
    ],
    "owasp": [
      "A6"
    ],
    "description": "Private package names match names that exist on the public npm registry, enabling dependency confusion attacks.",
    "impact": "An attacker can publish a malicious package with the same name; npm install may fetch the public malicious package.",
    "detection": "regex",
    "patterns": [
      "\"name\":\\s*\"[^@]"
    ],
    "fixAdvice": "Use @scope prefix for all private packages (e.g., @company/package-name). Configure .npmrc."
  },
  {
    "id": "SUP-002",
    "name": "Missing integrity check on CDN scripts",
    "category": "supply-chain",
    "severity": "medium",
    "cwe": [
      "CWE-829"
    ],
    "owasp": [
      "A6"
    ],
    "description": "Third-party scripts loaded from CDNs do not include the integrity attribute for SRI verification.",
    "impact": "If a CDN is compromised, served JavaScript can be modified to steal data or inject malicious code.",
    "detection": "regex",
    "patterns": [
      "<script\\s+src=['\"`]https?://"
    ],
    "excludePatterns": [
      "integrity="
    ],
    "fixAdvice": "Add Subresource Integrity hashes to all external script tags: integrity=\"sha384-...\" crossorigin=\"anonymous\"."
  }
];
