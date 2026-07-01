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
  },
  {
    "id": "SSRF-001",
    "name": "SSRF via user-controlled URL in fetch/axios",
    "category": "ssrf",
    "severity": "critical",
    "cwe": ["CWE-918"],
    "owasp": ["A10"],
    "description": "User-controlled URL from request body or query string is passed directly to fetch() or axios.get(), allowing attackers to make the server issue requests to internal services, cloud metadata endpoints, or arbitrary hosts.",
    "impact": "Attackers can access AWS/GCP metadata at 169.254.169.254 to steal IAM credentials, pivot to internal microservices, scan the internal network, or exfiltrate data from internal APIs.",
    "detection": "regex",
    "patterns": [
      "fetch\\(req\\.body\\.",
      "fetch\\(req\\.query\\.",
      "fetch\\(req\\.params\\.",
      "axios\\.get\\(req\\.body\\.",
      "axios\\.get\\(req\\.query\\.",
      "axios\\.post\\(req\\.body\\.",
      "axios\\.request\\(req\\.body\\.",
      "axios\\.request\\(req\\.query\\."
    ],
    "fixAdvice": "Implement an allowlist of permitted hostnames/IP ranges. Parse the URL, validate the hostname against the allowlist, block private/loopback ranges (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x). Use a dedicated SSRF-protection library like ssrf-req-filter."
  },
  {
    "id": "SSRF-002",
    "name": "SSRF via user-controlled URL in http.get/request",
    "category": "ssrf",
    "severity": "critical",
    "cwe": ["CWE-918"],
    "owasp": ["A10"],
    "description": "User-controlled URL from request body or params is passed directly to Node's http.get(), https.get(), or the 'request' library, enabling Server-Side Request Forgery.",
    "impact": "An attacker can make the server connect to internal services (Redis, databases, Kubernetes API), cloud metadata endpoints, or other internal infrastructure, leading to credential theft and lateral movement.",
    "detection": "regex",
    "patterns": [
      "http\\.get\\(req\\.body\\.",
      "http\\.get\\(req\\.query\\.",
      "http\\.get\\(req\\.params\\.",
      "https\\.get\\(req\\.body\\.",
      "https\\.get\\(req\\.query\\.",
      "request\\(req\\.body\\.",
      "request\\(req\\.query\\.",
      "request\\(req\\.params\\."
    ],
    "fixAdvice": "Validate and allowlist URLs before making outbound requests. Block RFC 1918 private IP ranges and link-local addresses (169.254.x.x). Enforce URL scheme restrictions (https only). Consider using a forward proxy with egress filtering."
  },
  {
    "id": "SSRF-003",
    "name": "SSRF via URL object constructed from user input",
    "category": "ssrf",
    "severity": "high",
    "cwe": ["CWE-918"],
    "owasp": ["A10"],
    "description": "A URL object is constructed from user-controlled input (new URL(req.body.*)) and subsequently used in a network request, enabling SSRF through URL parsing bypasses.",
    "impact": "URL parsing inconsistencies between validation logic and the HTTP client can be exploited to bypass naive hostname checks, allowing access to internal resources.",
    "detection": "regex",
    "patterns": [
      "new URL\\(req\\.body\\.",
      "new URL\\(req\\.query\\.",
      "new URL\\(req\\.params\\.",
      "new URL\\(userInput",
      "new URL\\(input\\."
    ],
    "fixAdvice": "After constructing the URL object, validate url.hostname against a strict allowlist and block private/internal IP ranges. Never rely solely on string-based prefix checks before URL construction."
  },
  {
    "id": "JWT-001",
    "name": "JWT algorithm 'none' bypass",
    "category": "auth-bypass",
    "severity": "critical",
    "cwe": ["CWE-327"],
    "owasp": ["A2"],
    "description": "JWT verification options allow the 'none' algorithm, which means tokens can be forged without any cryptographic signature. An attacker can craft a valid JWT with any payload.",
    "impact": "Complete authentication bypass. An attacker can forge arbitrary user identities including admin roles, impersonate any user, and gain full unauthorized access to the application.",
    "detection": "regex",
    "patterns": [
      "algorithm\\s*:\\s*['\"]none['\"]",
      "algorithms\\s*:\\s*\\[[^\\]]*['\"]none['\"]",
      "algorithm:\\s*'none'",
      "algorithms:\\s*\\[.*'none'"
    ],
    "fixAdvice": "Remove 'none' from the allowed algorithms list. Explicitly specify only strong algorithms: { algorithms: ['RS256'] } or { algorithms: ['HS256'] }. Never allow the 'none' algorithm in production."
  },
  {
    "id": "JWT-002",
    "name": "JWT verification with empty secret",
    "category": "auth-bypass",
    "severity": "critical",
    "cwe": ["CWE-321"],
    "owasp": ["A2"],
    "description": "jwt.verify() is called with an empty string or null as the secret, effectively disabling signature verification. Any JWT payload will be accepted as valid.",
    "impact": "All JWT-protected endpoints are completely unprotected. Any attacker can forge arbitrary tokens with any user ID, role, or claims without knowing any secret.",
    "detection": "regex",
    "patterns": [
      "jwt\\.verify\\(.*,\\s*''",
      "jwt\\.verify\\(.*,\\s*\"\"",
      "jwt\\.verify\\(.*,\\s*null\\s*[,)]",
      "jwt\\.verify\\(.*,\\s*undefined\\s*[,)]",
      "verify\\(token,\\s*''",
      "verify\\(token,\\s*\"\""
    ],
    "fixAdvice": "Always use a cryptographically strong secret (32+ bytes of entropy). Load the secret from environment variables: process.env.JWT_SECRET. Validate that the secret is present at startup and reject empty/undefined values."
  },
  {
    "id": "JWT-003",
    "name": "JWT decode without verification",
    "category": "auth-bypass",
    "severity": "high",
    "cwe": ["CWE-345"],
    "owasp": ["A2"],
    "description": "jwt.decode() is used instead of jwt.verify(), which decodes the token payload without validating the signature. Any crafted JWT with arbitrary claims will be trusted.",
    "impact": "Attackers can craft tokens with elevated privileges (admin: true, role: 'superuser') without knowing the signing secret. Authentication is completely bypassed.",
    "detection": "regex",
    "patterns": [
      "jwt\\.decode\\(",
      "jsonwebtoken\\.decode\\(",
      "decode\\(token\\)",
      "decode\\(req\\.headers"
    ],
    "excludePatterns": [
      "jwt\\.verify\\("
    ],
    "fixAdvice": "Replace jwt.decode() with jwt.verify(token, secret, options). jwt.decode() is only safe for non-sensitive claims inspection after verification has already occurred."
  },
  {
    "id": "JWT-004",
    "name": "Hardcoded JWT secret",
    "category": "hardcoded-secrets",
    "severity": "critical",
    "cwe": ["CWE-321"],
    "owasp": ["A2"],
    "description": "A weak or hardcoded JWT signing secret is used directly in jwt.sign() or jwt.verify() calls instead of being loaded from environment variables.",
    "impact": "Anyone with access to the source code, git history, or a leaked binary can forge tokens for any user or privilege level, bypassing all authentication controls.",
    "detection": "regex",
    "patterns": [
      "jwt\\.sign\\(.*['\"]secret['\"]",
      "jwt\\.sign\\(.*['\"]mysecret['\"]",
      "jwt\\.sign\\(.*['\"]secret123['\"]",
      "jwt\\.sign\\(.*['\"]password['\"]",
      "jwt\\.sign\\(.*['\"]my-secret['\"]",
      "jwt\\.verify\\(.*['\"]secret['\"]",
      "jwt\\.verify\\(.*['\"]secret123['\"]",
      "jwt\\.verify\\(.*['\"]my-secret['\"]",
      "sign\\(payload,\\s*['\"][a-zA-Z0-9_-]{4,32}['\"]"
    ],
    "fixAdvice": "Store JWT secrets in environment variables (JWT_SECRET) and access via process.env. Use a minimum 256-bit (32-byte) random secret generated with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\". Rotate secrets periodically."
  },
  {
    "id": "SSTI-001",
    "name": "Server-Side Template Injection via Handlebars with user input",
    "category": "code-execution",
    "severity": "critical",
    "cwe": ["CWE-94"],
    "owasp": ["A3"],
    "description": "User-controlled input is passed to Handlebars.compile() as a template string, enabling Server-Side Template Injection. Attackers can execute arbitrary code via Handlebars template expressions.",
    "impact": "Full Remote Code Execution (RCE). Attackers can execute OS commands, read arbitrary files, exfiltrate environment variables and secrets, and achieve complete server compromise.",
    "detection": "regex",
    "patterns": [
      "Handlebars\\.compile\\(req\\.body\\.",
      "Handlebars\\.compile\\(req\\.query\\.",
      "Handlebars\\.compile\\(req\\.params\\.",
      "Handlebars\\.compile\\(userInput",
      "handlebars\\.compile\\(req\\."
    ],
    "fixAdvice": "Never pass user-controlled strings as Handlebars templates. Only compile trusted, static template strings. Pass user data as template context variables: Handlebars.compile(STATIC_TEMPLATE)(userDataAsContext)."
  },
  {
    "id": "SSTI-002",
    "name": "Server-Side Template Injection via EJS with user input",
    "category": "code-execution",
    "severity": "critical",
    "cwe": ["CWE-94"],
    "owasp": ["A3"],
    "description": "User-controlled input is passed to ejs.render() or ejs.renderFile() as the template string or file path, enabling Server-Side Template Injection.",
    "impact": "EJS templates can execute arbitrary JavaScript. An attacker can read /etc/passwd, list environment variables, execute shell commands, and achieve full RCE.",
    "detection": "regex",
    "patterns": [
      "ejs\\.render\\(req\\.body\\.",
      "ejs\\.render\\(req\\.query\\.",
      "ejs\\.render\\(req\\.params\\.",
      "ejs\\.renderFile\\(req\\.body\\.",
      "ejs\\.renderFile\\(req\\.query\\.",
      "ejs\\.renderFile\\(req\\.params\\.",
      "ejs\\.render\\(userInput",
      "ejs\\.render\\(input"
    ],
    "fixAdvice": "Use only static, hardcoded template strings or file paths with ejs. Pass user data exclusively as the data context object: ejs.render(STATIC_TEMPLATE, { userVar: sanitized(req.body.var) })."
  },
  {
    "id": "SSTI-003",
    "name": "Server-Side Template Injection via Pug/Jade with user input",
    "category": "code-execution",
    "severity": "critical",
    "cwe": ["CWE-94"],
    "owasp": ["A3"],
    "description": "User-controlled input is passed directly to pug.compile() or pug.render() as a template string, enabling SSTI. Pug templates support embedded JavaScript execution.",
    "impact": "Full RCE via Pug's unbuffered code blocks (-) or interpolation. Attackers can execute arbitrary Node.js code, exfiltrate secrets, and take full control of the server.",
    "detection": "regex",
    "patterns": [
      "pug\\.compile\\(req\\.",
      "pug\\.compile\\(userInput",
      "pug\\.render\\(req\\.",
      "pug\\.render\\(userInput",
      "jade\\.compile\\(req\\.",
      "jade\\.render\\(req\\."
    ],
    "fixAdvice": "Never compile user input as Pug templates. Use static template files and pass user data as locals: pug.renderFile('template.pug', { data: sanitized })."
  },
  {
    "id": "LOGINJ-001",
    "name": "Log injection via unsanitized request data",
    "category": "injection",
    "severity": "medium",
    "cwe": ["CWE-117"],
    "owasp": ["A9"],
    "description": "Raw user input from request body, query, or params is logged directly via console.log without sanitization, enabling log injection attacks. Attackers can forge log entries or inject ANSI escape sequences.",
    "impact": "Attackers can inject fake log entries to cover tracks, confuse security monitoring, exploit log aggregation parsers (SIEM injection), or use ANSI escape sequences to manipulate terminal output.",
    "detection": "regex",
    "patterns": [
      "console\\.log\\(req\\.body",
      "console\\.log\\(req\\.query",
      "console\\.log\\(req\\.params",
      "console\\.log\\(`.*req\\.",
      "console\\.log\\(.*\\+\\s*req\\."
    ],
    "fixAdvice": "Sanitize log messages before writing: strip newlines (\\n, \\r), ANSI escape sequences, and non-printable characters from user input. Use structured logging (winston, pino) with separate fields for user data rather than string concatenation."
  },
  {
    "id": "LOGINJ-002",
    "name": "Log injection via logger with unsanitized request data",
    "category": "injection",
    "severity": "medium",
    "cwe": ["CWE-117"],
    "owasp": ["A9"],
    "description": "User-controlled input from request body or query is passed directly to logger.info(), logger.error(), logger.warn(), or logger.debug() without sanitization.",
    "impact": "Attackers can inject malicious content into structured logs, poison SIEM dashboards, forge audit records, and exploit log parsers in downstream monitoring infrastructure.",
    "detection": "regex",
    "patterns": [
      "logger\\.info\\(req\\.",
      "logger\\.error\\(req\\.",
      "logger\\.warn\\(req\\.",
      "logger\\.debug\\(req\\.",
      "log\\.info\\(req\\.",
      "log\\.error\\(req\\.",
      "log\\.warn\\(req\\.",
      "winston\\.info\\(req\\.",
      "pino\\(.*req\\."
    ],
    "fixAdvice": "Use structured logging with user data as separate fields: logger.info({ userId: req.body.id }, 'Action performed'). Never interpolate user input into log message strings. Sanitize string values to remove newlines and control characters."
  },
  {
    "id": "DOMXSS-001",
    "name": "DOM XSS via innerHTML assignment",
    "category": "xss",
    "severity": "high",
    "cwe": ["CWE-79"],
    "owasp": ["A3"],
    "description": "innerHTML is assigned from a variable that may contain user-controlled data, enabling DOM-based Cross-Site Scripting. Browsers parse and execute script content set via innerHTML.",
    "impact": "Attackers inject malicious JavaScript that executes in victims' browsers, enabling session hijacking, credential theft, keylogging, phishing overlays, and full account takeover.",
    "detection": "regex",
    "patterns": [
      "\\.innerHTML\\s*=\\s*[^\"'][^;]*",
      "\\.innerHTML\\s*\\+=",
      "innerHTML\\s*=\\s*`",
      "innerHTML\\s*=\\s*[a-zA-Z_$]"
    ],
    "excludePatterns": [
      "\\.innerHTML\\s*=\\s*''",
      "\\.innerHTML\\s*=\\s*\"\"",
      "\\.innerHTML\\s*=\\s*`\\s*`"
    ],
    "fixAdvice": "Use textContent instead of innerHTML for text data. For rich HTML, use DOMPurify.sanitize() before assigning to innerHTML. Better yet, use createElement/createTextNode APIs or a framework with automatic XSS protection."
  },
  {
    "id": "DOMXSS-002",
    "name": "DOM XSS via document.write with location data",
    "category": "xss",
    "severity": "critical",
    "cwe": ["CWE-79"],
    "owasp": ["A3"],
    "description": "document.write() is called with window.location data (hash, search, href) which can be attacker-controlled via URL manipulation, enabling reflected DOM XSS.",
    "impact": "Attackers craft malicious URLs that cause victim browsers to execute arbitrary JavaScript when the page loads, enabling session theft, phishing, and drive-by attacks.",
    "detection": "regex",
    "patterns": [
      "document\\.write\\(location\\.",
      "document\\.write\\(window\\.location",
      "document\\.write\\(document\\.URL",
      "document\\.write\\(document\\.referrer",
      "document\\.writeln\\(location\\.",
      "document\\.writeln\\(window\\.location"
    ],
    "fixAdvice": "Never pass location data to document.write(). Parse URL parameters safely and encode output before use. Use textContent, setAttribute, or a framework renderer instead of document.write."
  },
  {
    "id": "DOMXSS-003",
    "name": "React dangerouslySetInnerHTML with non-sanitized value",
    "category": "xss",
    "severity": "high",
    "cwe": ["CWE-79"],
    "owasp": ["A3"],
    "description": "dangerouslySetInnerHTML is used with a value that appears to come from state, props, or dynamic data without explicit DOMPurify sanitization, risking XSS in React applications.",
    "impact": "Bypasses React's built-in XSS protection. Malicious HTML from the server or user input renders as executable script in the browser, enabling complete session compromise.",
    "detection": "regex",
    "patterns": [
      "dangerouslySetInnerHTML\\s*=\\s*\\{\\s*\\{\\s*__html\\s*:",
      "dangerouslySetInnerHTML=\\{\\{__html:",
      "__html:\\s*[a-zA-Z_$]",
      "__html:\\s*`"
    ],
    "excludePatterns": [
      "DOMPurify\\.sanitize",
      "sanitizeHtml",
      "xss("
    ],
    "fixAdvice": "Always sanitize HTML before passing to dangerouslySetInnerHTML: { __html: DOMPurify.sanitize(content) }. Install dompurify. Consider using safer alternatives like react-markdown for rendering user content."
  },
  {
    "id": "CORS-001",
    "name": "CORS wildcard origin with credentials enabled",
    "category": "config-misconfig",
    "severity": "critical",
    "cwe": ["CWE-942"],
    "owasp": ["A5"],
    "description": "Access-Control-Allow-Origin is set to '*' (wildcard) while Access-Control-Allow-Credentials is also set to 'true'. Browsers reject this combination, but manual implementation errors can create a broken CORS policy.",
    "impact": "Misconfigured CORS allows any website to make authenticated cross-origin requests, enabling cross-site request forgery at scale, session hijacking, and unauthorized data access.",
    "detection": "regex",
    "patterns": [
      "Access-Control-Allow-Origin.*\\*.*Access-Control-Allow-Credentials.*true",
      "res\\.setHeader\\('Access-Control-Allow-Origin',\\s*'\\*'\\)",
      "res\\.header\\('Access-Control-Allow-Origin',\\s*'\\*'\\)",
      "allowedOrigins\\s*:\\s*\\*"
    ],
    "fixAdvice": "Never combine Access-Control-Allow-Origin: * with credentials. Maintain an explicit allowlist of trusted origins. Use the cors() middleware with: { origin: allowedOriginsList, credentials: true }."
  },
  {
    "id": "CORS-002",
    "name": "CORS wildcard origin with credentials in cors() middleware",
    "category": "config-misconfig",
    "severity": "critical",
    "cwe": ["CWE-942"],
    "owasp": ["A5"],
    "description": "The cors() middleware is configured with origin: '*' and credentials: true, creating a permissive CORS policy that allows any site to make authenticated cross-origin requests.",
    "impact": "Any malicious website can make authenticated API requests on behalf of logged-in users, leading to CSRF, data theft, and account takeover at scale.",
    "detection": "regex",
    "patterns": [
      "origin\\s*:\\s*['\"]\\*['\"]",
      "cors\\(\\{[^}]*origin\\s*:\\s*'\\*'",
      "cors\\(\\{[^}]*origin\\s*:\\s*\"\\*\""
    ],
    "contextPatterns": [
      "credentials\\s*:\\s*true"
    ],
    "fixAdvice": "Replace origin: '*' with an explicit array of trusted origins: cors({ origin: ['https://app.example.com'], credentials: true }). Implement origin validation: cors({ origin: (origin, cb) => cb(null, allowlist.includes(origin)) })."
  },
  {
    "id": "CORS-003",
    "name": "CORS origin reflected from request without allowlist",
    "category": "config-misconfig",
    "severity": "high",
    "cwe": ["CWE-942"],
    "owasp": ["A5"],
    "description": "The CORS origin is set by reflecting req.headers.origin directly back without validating against an allowlist, allowing any origin to be treated as trusted.",
    "impact": "Any attacker-controlled website can make authenticated cross-origin requests, bypassing same-origin policy protections and enabling CSRF and data exfiltration.",
    "detection": "regex",
    "patterns": [
      "origin\\s*:\\s*req\\.headers\\.origin",
      "Access-Control-Allow-Origin.*req\\.headers\\.origin",
      "res\\.setHeader.*Access-Control-Allow-Origin.*req\\.get\\('origin'\\)",
      "res\\.header.*Access-Control-Allow-Origin.*req\\.headers\\.origin"
    ],
    "fixAdvice": "Validate the origin against an explicit allowlist before reflecting: const origin = allowedOrigins.includes(req.headers.origin) ? req.headers.origin : allowedOrigins[0]. Never blindly reflect the origin header."
  },
  {
    "id": "PROTO-001",
    "name": "Prototype pollution via Object.assign with user input",
    "category": "prototype-pollution",
    "severity": "high",
    "cwe": ["CWE-1321"],
    "owasp": ["A8"],
    "description": "Object.assign() is used to merge user-controlled request body data into an object, allowing prototype pollution via __proto__, constructor, or prototype keys.",
    "impact": "Attackers can pollute Object.prototype with arbitrary properties, causing widespread object property injection. This can bypass authorization checks (isAdmin becoming true), enable DoS, or in some frameworks enable RCE.",
    "detection": "regex",
    "patterns": [
      "Object\\.assign\\(\\{\\}\\s*,\\s*req\\.body\\)",
      "Object\\.assign\\(\\w+\\s*,\\s*req\\.body\\)",
      "Object\\.assign\\(target\\s*,\\s*req\\.body\\)",
      "Object\\.assign\\(config\\s*,\\s*req\\.body\\)",
      "Object\\.assign\\(\\{\\}\\s*,\\s*body\\)"
    ],
    "fixAdvice": "Use JSON.parse(JSON.stringify(req.body)) to strip prototype chain. Validate input with a schema validator (Joi, Zod, ajv) before merging. Block __proto__, constructor, and prototype keys. Use Object.create(null) for safe maps."
  },
  {
    "id": "PROTO-002",
    "name": "Prototype pollution via lodash merge with user input",
    "category": "prototype-pollution",
    "severity": "critical",
    "cwe": ["CWE-1321"],
    "owasp": ["A8"],
    "description": "lodash's _.merge() performs deep merging of user-controlled data, which can pollute Object.prototype via crafted __proto__ or constructor.prototype keys in the input.",
    "impact": "Lodash merge prototype pollution is a well-documented critical vulnerability (CVE-2018-3721, CVE-2019-10744). Attackers can set arbitrary properties on all objects, enabling privilege escalation and RCE in some template engines.",
    "detection": "regex",
    "patterns": [
      "_\\.merge\\(.*req\\.body",
      "_\\.merge\\(.*req\\.query",
      "lodash\\.merge\\(.*req\\.body",
      "merge\\(target\\s*,\\s*req\\.body\\)",
      "merge\\(config\\s*,\\s*req\\.body\\)",
      "merge\\(\\{\\}\\s*,\\s*req\\.body\\)"
    ],
    "fixAdvice": "Use lodash version >=4.17.12 (patched). Use _.mergeWith() with a customizer that rejects __proto__ and constructor keys. Prefer structured validation with Zod/Joi over deep merging user input."
  },
  {
    "id": "PROTO-003",
    "name": "Prototype pollution via deepmerge/merge with user input",
    "category": "prototype-pollution",
    "severity": "high",
    "cwe": ["CWE-1321"],
    "owasp": ["A8"],
    "description": "deepmerge() or similar deep-merge functions are called with user-controlled request data, creating prototype pollution risk through recursive object merging.",
    "impact": "Deep prototype pollution on Object.prototype affects all objects in the application, potentially bypassing security checks, corrupting application state, or enabling RCE via polluted template rendering.",
    "detection": "regex",
    "patterns": [
      "deepmerge\\(.*req\\.body",
      "deepmerge\\(.*req\\.query",
      "deepmerge\\(obj\\s*,\\s*req\\.body\\)",
      "merge\\(config\\s*,\\s*userInput\\)",
      "deepMerge\\(.*req\\.body",
      "extend\\(true\\s*,\\s*\\{\\}\\s*,\\s*req\\.body\\)"
    ],
    "fixAdvice": "Sanitize input before merging: remove __proto__, constructor, and prototype keys recursively. Use a schema-validated DTO pattern. Freeze base objects with Object.freeze() to prevent prototype chain modification."
  },
  {
    "id": "MASSASSIGN-001",
    "name": "Mass assignment via direct ORM update with request body",
    "category": "mass-assignment",
    "severity": "high",
    "cwe": ["CWE-915"],
    "owasp": ["A1"],
    "description": "ORM update() or similar methods are called directly with req.body, allowing attackers to update any model field including privileged ones (isAdmin, role, balance) not intended for user modification.",
    "impact": "Attackers can escalate privileges (setting isAdmin=true), modify other users' data, change email/password for account takeover, or manipulate financial fields (balance, credits, price).",
    "detection": "regex",
    "patterns": [
      "\\.update\\(req\\.body\\)",
      "\\.update\\(body\\)",
      "\\.update\\(req\\.body,",
      "updateOne\\(.*req\\.body\\)",
      "updateMany\\(.*req\\.body\\)",
      "Model\\.update\\(req\\.body"
    ],
    "fixAdvice": "Always use explicit field selection: update({ role: req.body.role, name: req.body.name }) — only fields the user should modify. Use pick() to whitelist allowed fields: const allowed = _.pick(req.body, ['name', 'email']). Never pass raw req.body to ORM mutations."
  },
  {
    "id": "MASSASSIGN-002",
    "name": "Mass assignment via ORM create with raw request body",
    "category": "mass-assignment",
    "severity": "high",
    "cwe": ["CWE-915"],
    "owasp": ["A1"],
    "description": "Mongoose, Sequelize, Prisma, or similar ORM's create() method is called directly with req.body, passing all user-supplied fields to the model constructor without a field whitelist.",
    "impact": "Attackers can set privileged fields during registration or object creation: isAdmin: true, role: 'admin', emailVerified: true, balance: 999999, bypassing application business logic.",
    "detection": "regex",
    "patterns": [
      "\\.create\\(req\\.body\\)",
      "\\.create\\(body\\)",
      "User\\.create\\(req\\.body",
      "Model\\.create\\(req\\.body",
      "new User\\(req\\.body\\)",
      "new Model\\(req\\.body\\)",
      "insertOne\\(req\\.body\\)"
    ],
    "fixAdvice": "Whitelist allowed fields before creation: const data = { name: req.body.name, email: req.body.email }; await User.create(data). Use a DTO validation layer (class-validator, Zod) to strip unallowed fields before reaching the ORM."
  },
  {
    "id": "REDIR-001",
    "name": "Open redirect via URL query parameter",
    "category": "open-redirect",
    "severity": "high",
    "cwe": ["CWE-601"],
    "owasp": ["A1"],
    "description": "res.redirect() is called with a URL from req.query (next, redirect, returnUrl, etc.) without validating that the destination is a trusted relative path or domain.",
    "impact": "Attackers craft links like /login?next=https://evil.com to redirect authenticated users to phishing pages after login. Used in phishing, OAuth redirect attacks, and credential harvesting.",
    "detection": "regex",
    "patterns": [
      "res\\.redirect\\(req\\.query\\.next",
      "res\\.redirect\\(req\\.query\\.redirect",
      "res\\.redirect\\(req\\.query\\.returnUrl",
      "res\\.redirect\\(req\\.query\\.return_url",
      "res\\.redirect\\(req\\.query\\.url",
      "res\\.redirect\\(req\\.query\\.to",
      "res\\.redirect\\(req\\.query\\.goto",
      "res\\.redirect\\(req\\.query\\.destination"
    ],
    "fixAdvice": "Validate redirect destinations against an allowlist of trusted domains. For relative paths only: ensure the URL starts with / and doesn't start with //. Use: if (url.startsWith('/') && !url.startsWith('//')) res.redirect(url)."
  },
  {
    "id": "REDIR-002",
    "name": "Open redirect via body or params URL field",
    "category": "open-redirect",
    "severity": "high",
    "cwe": ["CWE-601"],
    "owasp": ["A1"],
    "description": "res.redirect() is called with a URL from req.body or req.params without path validation, enabling open redirect attacks via POST body or URL parameter manipulation.",
    "impact": "Post-authentication redirects to attacker-controlled URLs enable phishing and session token leakage via Referer headers to external domains.",
    "detection": "regex",
    "patterns": [
      "res\\.redirect\\(req\\.body\\.url",
      "res\\.redirect\\(req\\.body\\.redirect",
      "res\\.redirect\\(req\\.body\\.next",
      "res\\.redirect\\(req\\.params\\.",
      "response\\.redirect\\(req\\.body\\."
    ],
    "fixAdvice": "Implement a URL allowlist check. Parse the URL and validate the hostname: const parsed = new URL(url, 'https://yoursite.com'); if (!allowedHosts.includes(parsed.hostname)) return res.status(400).json({error: 'Invalid redirect'})."
  },
  {
    "id": "CMDINJ-001",
    "name": "Command injection via exec with user input",
    "category": "code-execution",
    "severity": "critical",
    "cwe": ["CWE-78"],
    "owasp": ["A3"],
    "description": "child_process.exec() is called with user-controlled input from request body, query, or params, enabling OS command injection via shell metacharacters (;, |, &, $(), `, etc.).",
    "impact": "Full Remote Code Execution. Attackers can execute arbitrary OS commands as the Node.js process user, read any file, exfiltrate data, install backdoors, and pivot to internal systems.",
    "detection": "regex",
    "patterns": [
      "exec\\(req\\.body\\.",
      "exec\\(req\\.query\\.",
      "exec\\(req\\.params\\.",
      "exec\\(`.*\\$\\{req\\.body",
      "exec\\(`.*\\$\\{req\\.query",
      "exec\\(.*\\+\\s*req\\.body",
      "exec\\(.*\\+\\s*req\\.query"
    ],
    "fixAdvice": "Never pass user input to exec(). Use execFile() or spawn() with an argument array to avoid shell interpretation. Validate input strictly with an allowlist regex. Use child_process.execFile(cmd, [arg]) where cmd is hardcoded."
  },
  {
    "id": "CMDINJ-002",
    "name": "Command injection via spawn/execSync with user input",
    "category": "code-execution",
    "severity": "critical",
    "cwe": ["CWE-78"],
    "owasp": ["A3"],
    "description": "spawn() or execSync() is called with user-controlled input, enabling command injection. execSync additionally blocks the event loop, compounding the impact.",
    "impact": "Attackers gain full OS command execution, can escalate privileges, exfiltrate the entire database, install persistent backdoors, and cause DoS by running fork-bomb commands.",
    "detection": "regex",
    "patterns": [
      "spawn\\(req\\.body\\.",
      "spawn\\(req\\.query\\.",
      "spawn\\(`.*\\$\\{req\\.",
      "execSync\\(req\\.body\\.",
      "execSync\\(req\\.query\\.",
      "execSync\\(`.*\\$\\{req\\.",
      "spawnSync\\(req\\.body\\.",
      "spawnSync\\(req\\.query\\."
    ],
    "fixAdvice": "Use spawn(cmd, [sanitizedArg], { shell: false }) — never set shell: true with user input. For execSync, switch to spawn with shell: false. Allowlist valid command arguments. Consider sandboxing with containers or VM2."
  },
  {
    "id": "CMDINJ-003",
    "name": "Command injection via template literal in exec",
    "category": "code-execution",
    "severity": "critical",
    "cwe": ["CWE-78"],
    "owasp": ["A3"],
    "description": "A template literal containing user-controlled request data (req.body.*, req.query.*) is constructed and passed to exec(), execSync(), or shell(), enabling shell injection.",
    "impact": "Shell metacharacters in template literals (;, |, &&, $()) allow full command injection. Attackers can chain arbitrary commands with the intended command.",
    "detection": "regex",
    "patterns": [
      "exec\\(`[^`]*\\$\\{req\\.",
      "execSync\\(`[^`]*\\$\\{req\\.",
      "spawn\\(`[^`]*\\$\\{req\\.",
      "shell\\.exec\\(`[^`]*\\$\\{req\\.",
      "child_process.*`[^`]*\\$\\{req\\."
    ],
    "fixAdvice": "Never use template literals to construct shell commands with user input. Pass user values as separate array arguments to execFile/spawn. Use shelljs.exec() only with fully hardcoded commands."
  },
  {
    "id": "PATHTRAV-001",
    "name": "Path traversal via user-controlled path.join/resolve",
    "category": "path-traversal",
    "severity": "high",
    "cwe": ["CWE-22"],
    "owasp": ["A1"],
    "description": "path.join() or path.resolve() is called with user-controlled input from the request, and the result is used in file operations without validating that the final path stays within an allowed directory.",
    "impact": "Attackers use ../../../etc/passwd sequences to escape the intended directory and read sensitive files: private keys, .env files, database credentials, /etc/shadow.",
    "detection": "regex",
    "patterns": [
      "path\\.join\\(.*req\\.body\\.",
      "path\\.join\\(.*req\\.query\\.",
      "path\\.join\\(.*req\\.params\\.",
      "path\\.resolve\\(.*req\\.body\\.",
      "path\\.resolve\\(.*req\\.query\\.",
      "path\\.resolve\\(.*req\\.params\\."
    ],
    "fixAdvice": "After path.join(), verify the resolved path starts with the allowed base: if (!resolved.startsWith(ALLOWED_DIR)) throw new Error('Path traversal detected'). Use path.normalize() + startsWith check. Never trust user-supplied path segments."
  },
  {
    "id": "PATHTRAV-002",
    "name": "Path traversal via fs.readFile with user input",
    "category": "path-traversal",
    "severity": "critical",
    "cwe": ["CWE-22"],
    "owasp": ["A1"],
    "description": "fs.readFile() or fs.readFileSync() is called with a path derived from user-controlled request data without sanitization, enabling arbitrary file read from the server filesystem.",
    "impact": "Attackers can read /etc/passwd, /etc/shadow, .env files, private SSL keys, application source code, database configuration, and any other file accessible to the Node.js process.",
    "detection": "regex",
    "patterns": [
      "fs\\.readFile\\(req\\.body\\.",
      "fs\\.readFile\\(req\\.query\\.",
      "fs\\.readFile\\(req\\.params\\.",
      "fs\\.readFileSync\\(req\\.body\\.",
      "fs\\.readFileSync\\(req\\.query\\.",
      "fs\\.readFileSync\\(req\\.params\\.",
      "readFile\\(req\\.body\\.",
      "readFile\\(req\\.params\\."
    ],
    "fixAdvice": "Map user input to a predefined set of allowed filenames. After resolving the full path, assert it starts with the allowed base directory: const full = path.resolve(BASE_DIR, filename); if (!full.startsWith(BASE_DIR + '/')) throw new Error('Forbidden')."
  },
  {
    "id": "PATHTRAV-003",
    "name": "Path traversal via fs.writeFile with user input",
    "category": "path-traversal",
    "severity": "critical",
    "cwe": ["CWE-22"],
    "owasp": ["A1"],
    "description": "fs.writeFile() or fs.writeFileSync() is called with a path derived from user input, allowing attackers to write arbitrary content to any file on the server, including overwriting application code.",
    "impact": "Attackers can overwrite application source files to inject backdoor code, write web shells, overwrite configuration files, corrupt the database, or write to /etc/cron.d for command execution.",
    "detection": "regex",
    "patterns": [
      "fs\\.writeFile\\(req\\.body\\.",
      "fs\\.writeFile\\(req\\.query\\.",
      "fs\\.writeFile\\(req\\.params\\.",
      "fs\\.writeFileSync\\(req\\.body\\.",
      "fs\\.writeFileSync\\(req\\.query\\.",
      "writeFile\\(req\\.body\\.",
      "writeFile\\(req\\.params\\."
    ],
    "fixAdvice": "Never write to user-specified paths. Use a UUID-based file naming scheme for user uploads. Validate upload paths are within a dedicated uploads directory. Consider using cloud object storage (S3) instead of local filesystem writes."
  },
  {
    "id": "XXE-001",
    "name": "XXE via allowDtd: true in XML parser",
    "category": "injection",
    "severity": "critical",
    "cwe": ["CWE-611"],
    "owasp": ["A5"],
    "description": "XML parsing is configured with allowDtd: true (xml2js, libxmljs, or similar), enabling XML External Entity (XXE) attacks where attacker-crafted XML can read arbitrary files or cause SSRF.",
    "impact": "Attackers can read /etc/passwd, /etc/shadow, AWS credentials from instance metadata, and internal files. XXE can also be used for SSRF and denial of service via billion-laughs attacks.",
    "detection": "regex",
    "patterns": [
      "allowDtd\\s*:\\s*true",
      "allowExternalEntities\\s*:\\s*true",
      "xmlParseEntityRef\\s*:\\s*true",
      "resolveEntities\\s*:\\s*true",
      "processEntities\\s*:\\s*true"
    ],
    "fixAdvice": "Set allowDtd: false, allowExternalEntities: false in your XML parser options. For xml2js: { explicitArray: false }. For node-expat: disable external entity processing. Validate and sanitize XML input before parsing."
  },
  {
    "id": "XXE-002",
    "name": "XXE via fast-xml-parser without doctype restriction",
    "category": "injection",
    "severity": "high",
    "cwe": ["CWE-611"],
    "owasp": ["A5"],
    "description": "fast-xml-parser is used without explicitly setting allowDoctype: false, which may allow DOCTYPE declarations in parsed XML input, enabling potential XXE attacks.",
    "impact": "Billion-laughs entity expansion attacks can cause memory exhaustion and DoS. External entity references can be used for SSRF and file disclosure depending on parser behavior.",
    "detection": "regex",
    "patterns": [
      "fast-xml-parser",
      "new XMLParser\\(\\)",
      "XMLParser\\(\\{[^}]*\\}\\)",
      "parse\\(.*xml.*\\{[^}]*\\}\\)",
      "require\\('fast-xml-parser'\\)"
    ],
    "excludePatterns": [
      "allowDoctype\\s*:\\s*false",
      "allowBooleanAttributes"
    ],
    "fixAdvice": "Explicitly configure fast-xml-parser with: new XMLParser({ allowBooleanAttributes: true, allowDoctype: false }). Always reject input containing <!DOCTYPE or <!ENTITY declarations before parsing."
  },
  {
    "id": "NOSQL-001",
    "name": "NoSQL injection via MongoDB $where operator with user input",
    "category": "injection",
    "severity": "critical",
    "cwe": ["CWE-943"],
    "owasp": ["A3"],
    "description": "User-controlled input is passed to MongoDB's $where operator, which executes JavaScript on the server. Attackers can inject arbitrary JavaScript to bypass query logic or exfiltrate data.",
    "impact": "Authentication bypass (return true bypasses all conditions), data exfiltration via side-channel timing attacks, and DoS via infinite loops in the $where JavaScript context.",
    "detection": "regex",
    "patterns": [
      "\\$where\\s*:\\s*req\\.body\\.",
      "\\$where\\s*:\\s*req\\.query\\.",
      "\\$where\\s*:\\s*`.*\\$\\{req\\.",
      "\\$where.*userInput",
      "\\$where.*input\\."
    ],
    "fixAdvice": "Never use $where with user input. Use MongoDB query operators instead of JavaScript expressions. If $where is needed, strictly validate and sanitize input. Disable server-side JS in MongoDB: mongod --noscripting."
  },
  {
    "id": "NOSQL-002",
    "name": "NoSQL injection via dynamic MongoDB query key from user input",
    "category": "injection",
    "severity": "critical",
    "cwe": ["CWE-943"],
    "owasp": ["A3"],
    "description": "User-controlled input is used as a dynamic key in a MongoDB query object ([req.body.field]: value), allowing injection of MongoDB operators ($gt, $where, $ne, $regex) as query keys.",
    "impact": "Attackers can inject MongoDB comparison operators to bypass authentication ($ne: null), perform data exfiltration, access other users' records, or trigger expensive regex operations.",
    "detection": "regex",
    "patterns": [
      "\\{\\s*\\[req\\.body\\.",
      "\\{\\s*\\[req\\.query\\.",
      "\\{\\s*\\[req\\.params\\.",
      "\\[req\\.body\\.\\w+\\]\\s*:",
      "\\[req\\.query\\.\\w+\\]\\s*:",
      "findOne\\(\\{\\s*\\[.*req\\."
    ],
    "fixAdvice": "Never use user input as a MongoDB query key. Validate that field names are in a strict allowlist. Use parameterized query patterns where field names are hardcoded: { [allowedField]: sanitizedValue }."
  },
  {
    "id": "NOSQL-003",
    "name": "NoSQL injection via entire request body as MongoDB filter",
    "category": "injection",
    "severity": "critical",
    "cwe": ["CWE-943"],
    "owasp": ["A3"],
    "description": "The entire req.body object is passed as a MongoDB query filter to find(), findOne(), or similar, allowing attackers to inject arbitrary MongoDB query operators.",
    "impact": "Attackers send {\"password\": {\"$gt\": \"\"}} to bypass authentication, or {\"$where\": \"sleep(5000)\"} for time-based attacks. Mass data extraction by passing empty filter {}.",
    "detection": "regex",
    "patterns": [
      "\\.find\\(req\\.body\\)",
      "\\.findOne\\(req\\.body\\)",
      "\\.findMany\\(req\\.body\\)",
      "\\.count\\(req\\.body\\)",
      "\\.deleteMany\\(req\\.body\\)",
      "\\.updateMany\\(req\\.body,",
      "collection\\.find\\(body\\)"
    ],
    "fixAdvice": "Never pass raw req.body as a MongoDB filter. Extract specific fields: { email: req.body.email, status: 'active' }. Use input validation with Joi/Zod to reject objects containing $ keys. Use mongo-sanitize library to strip operator keys."
  },
  {
    "id": "RAND-001",
    "name": "Insecure random — Math.random() for security token",
    "category": "crypto-failure",
    "severity": "high",
    "cwe": ["CWE-338"],
    "owasp": ["A2"],
    "description": "Math.random() is used to generate security-sensitive values such as session tokens, CSRF tokens, OTP codes, or API keys. Math.random() is not cryptographically secure.",
    "impact": "Math.random() output is predictable from its seed. Attackers who observe enough random values can predict future tokens, enabling session hijacking, CSRF bypass, or account takeover.",
    "detection": "regex",
    "patterns": [
      "Math\\.random\\(\\).*token",
      "Math\\.random\\(\\).*session",
      "Math\\.random\\(\\).*secret",
      "Math\\.random\\(\\).*key",
      "Math\\.random\\(\\).*csrf",
      "Math\\.random\\(\\).*otp",
      "token.*Math\\.random\\(\\)",
      "sessionId.*Math\\.random\\(\\)"
    ],
    "fixAdvice": "Use crypto.randomBytes() for generating cryptographically secure random values: crypto.randomBytes(32).toString('hex'). For tokens, use crypto.randomUUID(). Never use Math.random() for any security-sensitive purpose."
  },
  {
    "id": "RAND-002",
    "name": "Insecure random — Math.random() for password reset token",
    "category": "crypto-failure",
    "severity": "critical",
    "cwe": ["CWE-338"],
    "owasp": ["A2"],
    "description": "Math.random() is used to generate password reset tokens. These tokens are predictable and can be brute-forced or predicted by observing other tokens generated by the same process.",
    "impact": "Attackers can predict password reset tokens and take over any user account by resetting their password without knowing the current password. Full account takeover for any user.",
    "detection": "regex",
    "patterns": [
      "Math\\.random\\(\\).*reset",
      "Math\\.random\\(\\).*password",
      "reset.*Math\\.random\\(\\)",
      "resetToken.*Math\\.random\\(\\)",
      "passwordReset.*Math\\.random\\(\\)",
      "Math\\.random\\(\\).toString\\(36\\)"
    ],
    "fixAdvice": "Use crypto.randomBytes(32).toString('hex') for password reset tokens. Ensure tokens are stored hashed (bcrypt/argon2) in the database and have short expiry (15-60 minutes). Invalidate tokens after use."
  },
  {
    "id": "HDRINJ-001",
    "name": "HTTP header injection via user-controlled Location header",
    "category": "header-injection",
    "severity": "high",
    "cwe": ["CWE-113"],
    "owasp": ["A3"],
    "description": "User-controlled input from req.query is set as the Location response header value without sanitization. If the value contains CRLF sequences, attackers can inject additional HTTP headers.",
    "impact": "HTTP response splitting allows injection of Set-Cookie headers for session fixation, cache poisoning, cross-site scripting via content-type manipulation, or open redirect.",
    "detection": "regex",
    "patterns": [
      "res\\.setHeader\\('Location'\\s*,\\s*req\\.query\\.",
      "res\\.setHeader\\(\"Location\"\\s*,\\s*req\\.query\\.",
      "res\\.header\\('Location'\\s*,\\s*req\\.query\\.",
      "res\\.set\\('Location'\\s*,\\s*req\\.query\\.",
      "res\\.setHeader\\('Location'\\s*,\\s*req\\.body\\."
    ],
    "fixAdvice": "Strip CRLF characters before setting any header from user input: value.replace(/[\\r\\n]/g, ''). Validate Location values are safe URLs. Use res.redirect() with validated URLs instead of manually setting Location headers."
  },
  {
    "id": "HDRINJ-002",
    "name": "HTTP header injection via dynamic header name from user input",
    "category": "header-injection",
    "severity": "critical",
    "cwe": ["CWE-113"],
    "owasp": ["A3"],
    "description": "A user-controlled value is used as the header name in res.setHeader(), allowing attackers to set arbitrary response headers including Set-Cookie, Content-Type, or security policy headers.",
    "impact": "Attackers can override security headers (CSP, HSTS), set malicious cookies for session fixation, poison caches, or inject content that leads to XSS.",
    "detection": "regex",
    "patterns": [
      "res\\.setHeader\\(req\\.body\\.",
      "res\\.setHeader\\(req\\.query\\.",
      "res\\.setHeader\\(req\\.params\\.",
      "res\\.header\\(req\\.body\\.",
      "res\\.header\\(req\\.query\\.",
      "res\\.set\\(req\\.body\\.",
      "res\\.set\\(req\\.query\\."
    ],
    "fixAdvice": "Never use user input as an HTTP header name. Maintain a strict allowlist of header names that can be set programmatically. Validate all header values and strip CRLF characters: value.replace(/[\\r\\n]/g, '')."
  },
  {
    "id": "EVAL-001",
    "name": "Code injection via eval() with user input",
    "category": "code-execution",
    "severity": "critical",
    "cwe": ["CWE-95"],
    "owasp": ["A3"],
    "description": "eval() is called with user-controlled input from request body or query string, enabling arbitrary JavaScript code execution on the server.",
    "impact": "Full Remote Code Execution. Attackers can execute any JavaScript: read files, run OS commands via child_process, exfiltrate all secrets, install backdoors, and pivot to internal systems.",
    "detection": "regex",
    "patterns": [
      "eval\\(req\\.body\\.",
      "eval\\(req\\.query\\.",
      "eval\\(req\\.params\\.",
      "eval\\(`.*\\$\\{req\\.",
      "eval\\(.*\\+\\s*req\\.body",
      "eval\\(.*\\+\\s*req\\.query",
      "eval\\(userInput",
      "eval\\(input\\."
    ],
    "fixAdvice": "Never use eval() with user input. If dynamic computation is needed, use a safe expression parser (mathjs for math, JSON.parse for data). Consider sandboxing with isolated-vm for untrusted code execution."
  },
  {
    "id": "EVAL-002",
    "name": "Code injection via new Function() with user input",
    "category": "code-execution",
    "severity": "critical",
    "cwe": ["CWE-95"],
    "owasp": ["A3"],
    "description": "new Function() is called with user-controlled input to dynamically create a JavaScript function from a string, equivalent to eval() in terms of code injection risk.",
    "impact": "Identical to eval() — full RCE. new Function() executes in the global scope and provides access to all global objects. Attackers can exfiltrate process.env and execute OS commands.",
    "detection": "regex",
    "patterns": [
      "new Function\\(req\\.body\\.",
      "new Function\\(req\\.query\\.",
      "new Function\\(req\\.params\\.",
      "new Function\\(.*req\\.body",
      "new Function\\(userInput",
      "Function\\(req\\.body\\.",
      "Function\\(req\\.query\\."
    ],
    "fixAdvice": "Avoid new Function() with user input entirely. Use a purpose-built expression evaluator. If dynamic functions are required for business logic, implement a whitelist of allowed operations and use a sandboxed evaluator (vm2, isolated-vm)."
  },
  {
    "id": "EVAL-003",
    "name": "Code injection via Node.js vm.runInNewContext with user input",
    "category": "code-execution",
    "severity": "critical",
    "cwe": ["CWE-95"],
    "owasp": ["A3"],
    "description": "vm.runInNewContext(), vm.runInContext(), or vm.runInThisContext() is called with user-controlled code string, enabling sandbox escape and arbitrary code execution.",
    "impact": "Node.js VM module sandbox is not a security boundary. Attackers can escape using prototype chain access: this.constructor.constructor('return process')().mainModule.require('child_process'). Full RCE.",
    "detection": "regex",
    "patterns": [
      "vm\\.runInNewContext\\(req\\.",
      "vm\\.runInNewContext\\(userInput",
      "vm\\.runInContext\\(req\\.",
      "vm\\.runInThisContext\\(req\\.",
      "vm\\.Script.*req\\.body",
      "runInNewContext\\(req\\."
    ],
    "fixAdvice": "Do not use Node.js vm module with user input — it is not a security sandbox. Use isolated-vm (based on V8 isolates) for genuine sandboxing. If script execution is required, use a separate container process with strict resource limits."
  },
  {
    "id": "RACE-001",
    "name": "Race condition — sequential await select+update without transaction",
    "category": "race-condition",
    "severity": "high",
    "cwe": ["CWE-362"],
    "owasp": ["A4"],
    "description": "Sequential await db.select() followed by await db.update() (or similar read-then-write patterns) without a database transaction creates a TOCTOU race condition under concurrent requests.",
    "impact": "Under concurrent load, multiple requests read the same value before any update commits, leading to double-spending, overselling inventory, duplicate reward issuance, or corrupted application state.",
    "detection": "regex",
    "patterns": [
      "await.*\\.select\\(",
      "await.*\\.findOne\\(",
      "await.*\\.findUnique\\("
    ],
    "contextPatterns": [
      "await.*\\.update\\(",
      "await.*\\.save\\(",
      "await.*\\.increment\\("
    ],
    "fixAdvice": "Wrap read-modify-write operations in a database transaction with SERIALIZABLE isolation. Use atomic operations: UPDATE with WHERE + row count check, or database-level locks (SELECT FOR UPDATE). Use optimistic locking with version fields."
  },
  {
    "id": "RACE-002",
    "name": "TOCTOU race condition — balance check before deduction",
    "category": "race-condition",
    "severity": "critical",
    "cwe": ["CWE-367"],
    "owasp": ["A4"],
    "description": "A balance/stock/quota check (if balance >= amount) is performed separately from the deduction (await db.deduct()), creating a classic Time-Of-Check-Time-Of-Use race condition.",
    "impact": "Double-spending attacks: attackers send concurrent requests that all pass the balance check before any deduction commits. Financial loss, inventory overselling, exceeded rate limits, free premium access.",
    "detection": "regex",
    "patterns": [
      "if\\s*\\(.*balance\\s*>=",
      "if\\s*\\(.*balance\\s*>",
      "if\\s*\\(.*stock\\s*>=",
      "if\\s*\\(.*credits\\s*>=",
      "if\\s*\\(.*quota\\s*>",
      "if\\s*\\(.*amount\\s*<="
    ],
    "contextPatterns": [
      "await.*deduct",
      "await.*decrement",
      "await.*subtract",
      "await.*update.*balance",
      "await.*\.save\\("
    ],
    "fixAdvice": "Use atomic database operations: UPDATE accounts SET balance = balance - $amount WHERE balance >= $amount AND id = $id. Check affected rows count. Use SELECT FOR UPDATE (pessimistic locking) or optimistic locking with a version column. Never separate check from mutation."
  }
];
