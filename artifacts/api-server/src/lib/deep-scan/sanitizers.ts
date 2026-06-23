export interface SanitizerPattern {
  name: string;
  library: string;
  patterns: string[];
  description: string;
  confidence: number;
  sanitizesCategory: string[];
  weaknessPatterns?: string[];
}

export interface SourceDefinition {
  name: string;
  library: string;
  patterns: string[];
  description: string;
  confidence: number;
  categories: string[];
}

export interface SinkDefinition {
  name: string;
  library: string;
  patterns: string[];
  description: string;
  confidence: number;
  severity: "critical" | "high" | "medium" | "low";
  categories: string[];
}

export const SANITIZER_DATABASE: SanitizerPattern[] = [
  {
    name: "Zod .parse()",
    library: "zod",
    patterns: [
      "zod\\.object\\(.*\\)\\.parse",
      "\\.parse\\(req\\.body",
      "\\.parse\\(body",
      "\\.parse\\(input",
      "safeParse\\(req\\.body",
      "safeParse\\(body",
      "safeParse\\(input",
    ],
    description: "Zod schema validation — input is type-checked and sanitized against schema",
    confidence: 98,
    sanitizesCategory: ["injection", "validation"],
    weaknessPatterns: [".parse\\(.*\\.body", "safeParse\\(.*req"],
  },
  {
    name: "Prisma parameterized query",
    library: "@prisma/client",
    patterns: [
      "prisma\\..*\\.findUnique",
      "prisma\\..*\\.findFirst",
      "prisma\\..*\\.findMany",
      "prisma\\..*\\.create",
      "prisma\\..*\\.update",
      "prisma\\..*\\.upsert",
      "prisma\\..*\\.delete",
    ],
    description: "Prisma ORM — uses parameterized queries by default, preventing SQL injection",
    confidence: 99,
    sanitizesCategory: ["sql_injection"],
  },
  {
    name: "Prisma $queryRaw with template literal",
    library: "@prisma/client",
    patterns: [
      "prisma\\.\\$queryRaw`",
      "prisma\\.\\$executeRaw`",
      "prisma\\.\\$queryRawUnsafe",
      "prisma\\.\\$executeRawUnsafe",
    ],
    description: "Prisma raw query — template literal form is parameterized, Unsafe form is NOT",
    confidence: 95,
    sanitizesCategory: ["sql_injection"],
    weaknessPatterns: ["\\$queryRawUnsafe", "\\$executeRawUnsafe"],
  },
  {
    name: "React Hook Form validation",
    library: "react-hook-form",
    patterns: [
      "register\\(.*,\\s*\\{[^}]*required",
      "register\\(.*,\\s*\\{[^}]*minLength",
      "register\\(.*,\\s*\\{[^}]*pattern",
      "useForm\\(\\{[^}]*resolver",
    ],
    description: "React Hook Form validation rules are applied to form inputs",
    confidence: 88,
    sanitizesCategory: ["injection", "validation"],
  },
  {
    name: "Clerk authentication middleware",
    library: "@clerk/nextjs",
    patterns: [
      "auth\\(\\)",
      "currentUser\\(\\)",
      "requireAuth",
      "clerkMiddleware",
      "authMiddleware",
      "@clerk/nextjs",
      "@clerk/clerk-react",
      "useAuth\\(\\)",
      "useUser\\(\\)",
    ],
    description: "Clerk authentication — user identity verified before reaching handler",
    confidence: 97,
    sanitizesCategory: ["auth"],
  },
  {
    name: "tRPC input validation",
    library: "@trpc/server",
    patterns: [
      "trpc\\.router\\(\\)\\.(query|mutation|subscription)\\(.*\\.input\\(z",
      "\\.input\\(zod",
      "\\.input\\(z\\.string",
      "\\.input\\(z\\.number",
      "\\.output\\(z",
    ],
    description: "tRPC with Zod — input is validated at the API boundary automatically",
    confidence: 98,
    sanitizesCategory: ["injection", "validation"],
  },
  {
    name: "Convex schema validation",
    library: "convex",
    patterns: [
      "v\\.object\\(\\{",
      "v\\.string\\(\\)",
      "v\\.number\\(\\)",
      "v\\.array\\(v",
      "v\\.union\\(v",
      "mutation\\(\\{[^}]*handler.*args.*v",
      "query\\(\\{[^}]*handler.*args.*v",
    ],
    description: "Convex argument validation — function args are validated against schema",
    confidence: 96,
    sanitizesCategory: ["injection", "validation"],
  },
  {
    name: "DOMPurify sanitization",
    library: "dompurify",
    patterns: [
      "DOMPurify\\.sanitize",
      "purify\\.sanitize",
      "dompurify",
    ],
    description: "DOMPurify — sanitizes HTML to prevent XSS",
    confidence: 99,
    sanitizesCategory: ["xss"],
  },
  {
    name: "Express middleware auth",
    library: "express",
    patterns: [
      "requireAuth",
      "authenticate",
      "isAuthenticated",
      "ensureAuthenticated",
      "protectRoute",
      "withAuth",
      "requireAuth\\(req",
    ],
    description: "Express authentication middleware — protects routes from unauthenticated access",
    confidence: 90,
    sanitizesCategory: ["auth"],
  },
  {
    name: "Validator.js sanitization",
    library: "validator",
    patterns: [
      "validator\\.escape",
      "validator\\.stripLow",
      "validator\\.whitelist",
      "validator\\.blacklist",
      "validator\\.normalizeEmail",
      "validator\\.trim",
    ],
    description: "validator.js — input sanitization functions",
    confidence: 97,
    sanitizesCategory: ["injection", "xss"],
  },
  {
    name: "Helmet security headers",
    library: "helmet",
    patterns: [
      "app\\.use\\(helmet",
      "import.*helmet",
      "require.*helmet",
    ],
    description: "Helmet — sets secure HTTP headers (CSP, XSS-Protection, etc.)",
    confidence: 95,
    sanitizesCategory: ["config", "xss"],
  },
  {
    name: "bcrypt password hashing",
    library: "bcryptjs",
    patterns: [
      "bcrypt\\.hash",
      "bcrypt\\.compare",
      "bcryptjs\\.hash",
      "bcryptjs\\.compare",
    ],
    description: "bcrypt — passwords are hashed before storage",
    confidence: 99,
    sanitizesCategory: ["auth", "exposure"],
  },
  {
    name: "Rate limiting middleware",
    library: "express-rate-limit",
    patterns: [
      "rateLimit\\(\\{",
      "rate-limiter",
      "RateLimiter",
      "RateLimit",
      "bottleneck",
    ],
    description: "Rate limiting — protects against brute force and DoS",
    confidence: 92,
    sanitizesCategory: ["auth", "config"],
  },
];

export const SOURCE_DATABASE: SourceDefinition[] = [
  {
    name: "Express req.body",
    library: "express",
    patterns: [
      "req\\.body",
      "request\\.body",
      "req\\.query",
      "request\\.query",
      "req\\.params",
      "request\\.params",
    ],
    description: "HTTP request body/query/params — user-controlled input",
    confidence: 99,
    categories: ["user_input"],
  },
  {
    name: "Next.js searchParams",
    library: "next/navigation",
    patterns: [
      "searchParams",
      "useSearchParams\\(\\)",
      "params\\.\\w+",
    ],
    description: "Next.js URL search parameters — user-controlled",
    confidence: 95,
    categories: ["user_input"],
  },
  {
    name: "Form state / form data",
    library: "react-hook-form",
    patterns: [
      "formState",
      "getValues\\(\\)",
      "watch\\(\\)",
      "new FormData\\(.*\\)",
      "formData\\.get\\(",
      "formData\\.entries\\(",
    ],
    description: "Form data — user-supplied form input",
    confidence: 92,
    categories: ["user_input"],
  },
  {
    name: "localStorage / sessionStorage",
    library: "web",
    patterns: [
      "localStorage\\.getItem",
      "localStorage\\.setItem",
      "sessionStorage\\.getItem",
      "sessionStorage\\.setItem",
    ],
    description: "Browser storage — may contain attacker-influenced data",
    confidence: 80,
    categories: ["storage"],
  },
  {
    name: "Cookies",
    library: "web",
    patterns: [
      "req\\.cookies",
      "cookies\\.",
      "parseCookies",
      "getCookie",
    ],
    description: "HTTP cookies — user-controlled and attacker-modifiable",
    confidence: 90,
    categories: ["user_input"],
  },
  {
    name: "WebSocket messages",
    library: "ws",
    patterns: [
      "ws\\.on\\('message'",
      "socket\\.on\\('message'",
      "websocket\\.on\\('message'",
      "io\\.on\\('connection'",
    ],
    description: "WebSocket messages — real-time user input",
    confidence: 88,
    categories: ["user_input"],
  },
  {
    name: "OAuth callback parameters",
    library: "next-auth",
    patterns: [
      "callbackUrl",
      "code\\s*:",
      "state\\s*:",
      "sessionToken",
      "oauth_token",
    ],
    description: "OAuth callback parameters — may be tampered with",
    confidence: 78,
    categories: ["auth_input"],
  },
  {
    name: "GraphQL query variables",
    library: "graphql",
    patterns: [
      "args\\.\\w+",
      "parent\\.\\w+",
      "context\\.\\w+",
      "variables\\.\\w+",
      "graphql\\(.*variables",
    ],
    description: "GraphQL query variables — user-supplied data in queries",
    confidence: 85,
    categories: ["user_input"],
  },
  {
    name: "File uploads",
    library: "express",
    patterns: [
      "req\\.files",
      "req\\.file",
      "upload\\(.*\\)",
      "multer",
      "fileUpload",
    ],
    description: "Uploaded files — may contain malicious content",
    confidence: 90,
    categories: ["user_input"],
  },
  {
    name: "Environment variables",
    library: "node",
    patterns: [
      "process\\.env\\.",
      "import\\.meta\\.env\\.",
      "Deno\\.env\\.",
      "getenv\\(",
      "env\\.",
    ],
    description: "Environment variables — may be set by attackers if deployment is compromised",
    confidence: 60,
    categories: ["config"],
  },
];

export const SINK_DATABASE: SinkDefinition[] = [
  {
    name: "Database query execution",
    library: "database",
    patterns: [
      "\\.query\\(",
      "\\.execute\\(",
      "\\.raw\\(",
      "\\.\\$queryRaw",
      "\\.\\$executeRaw",
      "sql`",
      "query`",
      "execute`",
    ],
    description: "Database query execution — SQL injection risk if query contains user input",
    confidence: 95,
    severity: "critical",
    categories: ["sql_injection"],
  },
  {
    name: "eval / Function constructor",
    library: "javascript",
    patterns: [
      "eval\\(",
      "new Function\\(",
      "setTimeout\\s*\\(['\"`]",
      "setInterval\\s*\\(['\"`]",
    ],
    description: "Code execution — arbitrary code execution if user input reaches here",
    confidence: 99,
    severity: "critical",
    categories: ["code_execution"],
  },
  {
    name: "innerHTML / outerHTML",
    library: "dom",
    patterns: [
      "\\.innerHTML\\s*=",
      "\\.outerHTML\\s*=",
      "insertAdjacentHTML\\(",
    ],
    description: "HTML injection — XSS risk if user input is assigned",
    confidence: 97,
    severity: "high",
    categories: ["xss"],
  },
  {
    name: "Shell command execution",
    library: "node",
    patterns: [
      "exec\\(",
      "execSync\\(",
      "spawn\\(",
      "spawnSync\\(",
      "execFile\\(",
      "execFileSync\\(",
      "child_process\\.",
      "shell\\.",
    ],
    description: "Shell command execution — command injection if user input reaches here",
    confidence: 97,
    severity: "critical",
    categories: ["command_injection"],
  },
  {
    name: "File system write",
    library: "node",
    patterns: [
      "fs\\.writeFileSync\\(",
      "fs\\.writeFile\\(",
      "fs\\.appendFileSync\\(",
      "fs\\.appendFile\\(",
      "writeFile\\(",
      "writeFileSync\\(",
    ],
    description: "File system write — path traversal risk if user input controls the path",
    confidence: 92,
    severity: "high",
    categories: ["file_operations"],
  },
  {
    name: "HTTP response with user data",
    library: "express",
    patterns: [
      "res\\.send\\(",
      "res\\.json\\(",
      "res\\.render\\(",
      "response\\.send\\(",
      "response\\.json\\(",
      "response\\.render\\(",
    ],
    description: "HTTP response — sensitive data exposure if user data includes secrets",
    confidence: 80,
    severity: "high",
    categories: ["data_exposure"],
  },
  {
    name: "Payment API call",
    library: "stripe",
    patterns: [
      "stripe\\.",
      "stripe\\.charges\\.create",
      "stripe\\.paymentIntents\\.create",
      "stripe\\.checkout\\.sessions\\.create",
      "paypal\\.",
      "razorpay\\.",
      "lemonsqueezy\\.",
    ],
    description: "Payment API — business logic attack surface",
    confidence: 90,
    severity: "critical",
    categories: ["business_logic"],
  },
  {
    name: "Response with user-controlled headers",
    library: "express",
    patterns: [
      "res\\.setHeader\\(",
      "res\\.header\\(",
      "res\\.set\\(",
      "response\\.setHeader\\(",
    ],
    description: "Response header setting — header injection if user input controls header value",
    confidence: 85,
    severity: "high",
    categories: ["header_injection"],
  },
  {
    name: "Redirect with user input",
    library: "express",
    patterns: [
      "res\\.redirect\\(",
      "response\\.redirect\\(",
      "redirect\\(",
      "nextRedirect\\(",
      "router\\.push\\(",
    ],
    description: "Redirect — open redirect vulnerability if user input controls the URL",
    confidence: 88,
    severity: "medium",
    categories: ["open_redirect"],
  },
  {
    name: "External API call with user data",
    library: "fetch",
    patterns: [
      "fetch\\(.*\\$\\{",
      "axios\\.(get|post|put|delete)\\(.*\\$\\{",
      "got\\(.*\\$\\{",
      "https?\\.request\\(.*\\$\\{",
      "\\.post\\(.*req",
    ],
    description: "External API call with interpolated user data — SSRF or injection risk",
    confidence: 82,
    severity: "high",
    categories: ["ssrf"],
  },
  {
    name: "JWT signing / verification",
    library: "jsonwebtoken",
    patterns: [
      "jwt\\.sign\\(",
      "jwt\\.verify\\(",
      "jwt\\.decode\\(",
      "jsonwebtoken",
    ],
    description: "JWT operation — token manipulation risk if secret is weak",
    confidence: 85,
    severity: "high",
    categories: ["auth"],
  },
  {
    name: "Dynamic import",
    library: "javascript",
    patterns: [
      "import\\(.*\\$\\{",
      "require\\(.*\\$\\{",
      "dynamicImport\\(",
    ],
    description: "Dynamic import with computed path — arbitrary module loading risk",
    confidence: 88,
    severity: "high",
    categories: ["code_execution"],
  },
  {
    name: "Server action mutation",
    library: "next",
    patterns: [
      "'use server'",
      '"use server"',
      "server\\.only",
      "server-only",
    ],
    description: "Next.js server action — may expose server-side logic to client",
    confidence: 75,
    severity: "medium",
    categories: ["config"],
  },
];

export const sanitizers = SANITIZER_DATABASE;
export const sources = SOURCE_DATABASE;
export const sinks = SINK_DATABASE;
