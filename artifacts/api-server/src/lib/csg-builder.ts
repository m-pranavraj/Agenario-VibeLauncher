/**
 * Combined Semantic Graph (CSG) Builder
 * ─────────────────────────────────────────────────────────────────────────────
 * PATENT FOUNDATION: Shared graph structure powering all 10 analysis pillars.
 *
 * The CSG fuses six graph layers into one traversable structure:
 *   1. AST nodes  — variable, function, class, import, conditional
 *   2. CFG edges  — control flow (if/else/switch/try/catch branches)
 *   3. DFG edges  — data flow (assignment, return, argument passing)
 *   4. Call Graph — function→function invocation edges
 *   5. Route Map  — HTTP method + path → handler function edges
 *   6. Import Map — module→module dependency edges
 *
 * Node types: Variable | Function | Component | Route | DBQuery | APICall |
 *             Conditional | Module | ExternalDep | Sink | Source | Sanitizer
 *
 * Edge types: data_flow | control_flow | calls | renders | handles |
 *             queries | imports | sanitizes | produces | consumes
 *
 * All engines (VibeTaint, SymCost, ArchScan, etc.) traverse this same graph
 * using domain-specific walkers — no redundant parsing per pillar.
 */

export type CSGNodeType =
  | "variable"
  | "function"
  | "component"
  | "route"
  | "dbquery"
  | "apicall"
  | "conditional"
  | "module"
  | "external_dep"
  | "sink"
  | "source"
  | "sanitizer"
  | "import"
  | "try_catch"
  | "loop"
  | "class";

export type CSGEdgeType =
  | "data_flow"
  | "control_flow"
  | "calls"
  | "renders"
  | "handles"
  | "queries"
  | "imports"
  | "sanitizes"
  | "produces"
  | "consumes"
  | "defines"
  | "throws"
  | "catches"
  | "mutates";

export interface CSGNode {
  id: string;
  type: CSGNodeType;
  label: string;
  filePath: string;
  lineStart: number;
  lineEnd?: number;
  // Domain-specific metadata
  meta: {
    // For functions
    isAsync?: boolean;
    isExported?: boolean;
    paramCount?: number;
    hasReturn?: boolean;
    cyclomaticComplexity?: number;
    cognitiveComplexity?: number;
    // For variables
    isTainted?: boolean;
    isSource?: boolean;
    isSink?: boolean;
    isSanitizer?: boolean;
    // For routes
    httpMethod?: string;
    routePath?: string;
    hasAuthMiddleware?: boolean;
    // For DB queries
    queryType?: "select" | "insert" | "update" | "delete" | "raw";
    isParameterized?: boolean;
    // For API calls
    externalService?: string;
    hasErrorHandling?: boolean;
    hasRetry?: boolean;
    // For conditionals
    conditionText?: string;
    isAuthCheck?: boolean;
    isNullCheck?: boolean;
    // For imports
    importedFrom?: string;
    importedNames?: string[];
    // For try_catch
    catchIsEmpty?: boolean;
    hasLogging?: boolean;
    // For loops
    containsAsyncCall?: boolean; // N+1 risk
    // Cost modeling
    estimatedCostMs?: number;
    estimatedBundleKb?: number;
  };
}

export interface CSGEdge {
  from: string;
  to: string;
  type: CSGEdgeType;
  // Control dependence weight (for implicit flow detection)
  implicit?: boolean;
  // Data flow specifics
  dataFlowKind?: "assignment" | "argument" | "return" | "property";
  lineNumber?: number;
}

export interface CSG {
  nodes: Map<string, CSGNode>;
  edges: CSGEdge[];
  // Adjacency for fast traversal
  outEdges: Map<string, CSGEdge[]>;
  inEdges: Map<string, CSGEdge[]>;
  // Index maps
  nodesByType: Map<CSGNodeType, string[]>;
  nodesByFile: Map<string, string[]>;
  sourceNodes: string[];   // Taint sources
  sinkNodes: string[];     // Taint sinks
  sanitizerNodes: string[]; // Sanitizers on taint paths
}

// ── Pattern databases ──────────────────────────────────────────────────────

/** Taint source patterns — user-controlled inputs */
const SOURCE_PATTERNS: Array<{ pattern: RegExp; label: string; risk: string }> = [
  { pattern: /req\.body/g, label: "HTTP request body", risk: "user_input" },
  { pattern: /req\.query/g, label: "URL query parameter", risk: "user_input" },
  { pattern: /req\.params/g, label: "URL path parameter", risk: "user_input" },
  { pattern: /req\.headers/g, label: "HTTP header", risk: "user_input" },
  { pattern: /req\.cookies/g, label: "Cookie value", risk: "user_input" },
  { pattern: /searchParams\.get\(/g, label: "URL search param", risk: "user_input" },
  { pattern: /localStorage\.getItem\(/g, label: "localStorage read", risk: "client_storage" },
  { pattern: /sessionStorage\.getItem\(/g, label: "sessionStorage read", risk: "client_storage" },
  { pattern: /document\.cookie/g, label: "document.cookie read", risk: "user_input" },
  { pattern: /location\.search/g, label: "URL search string", risk: "user_input" },
  { pattern: /location\.hash/g, label: "URL hash fragment", risk: "user_input" },
  { pattern: /window\.location/g, label: "Window location", risk: "user_input" },
  { pattern: /process\.env/g, label: "Environment variable", risk: "config" },
  { pattern: /getServerSideProps/g, label: "Next.js SSR props", risk: "user_input" },
  { pattern: /useSearchParams\(\)/g, label: "Next.js search params", risk: "user_input" },
];

/** Taint sink patterns — dangerous operations */
const SINK_PATTERNS: Array<{ pattern: RegExp; label: string; vulnType: string; severity: string }> = [
  // SQL Injection sinks
  { pattern: /\$\{[^}]+\}.*(?:SELECT|INSERT|UPDATE|DELETE|WHERE)/gi, label: "SQL via template literal", vulnType: "sqli", severity: "critical" },
  { pattern: /\.query\s*\(\s*[`"'][^`"']*\$\{/g, label: "DB query with interpolation", vulnType: "sqli", severity: "critical" },
  { pattern: /db\.execute\s*\(\s*[`"'][^`"']*\$\{/g, label: "DB execute with interpolation", vulnType: "sqli", severity: "critical" },
  // XSS sinks
  { pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{/g, label: "dangerouslySetInnerHTML assignment", vulnType: "xss", severity: "critical" },
  { pattern: /innerHTML\s*=\s*/g, label: "innerHTML assignment", vulnType: "xss", severity: "critical" },
  { pattern: /document\.write\s*\(/g, label: "document.write call", vulnType: "xss", severity: "high" },
  { pattern: /eval\s*\(/g, label: "eval() call", vulnType: "code_injection", severity: "critical" },
  { pattern: /new Function\s*\(/g, label: "new Function() call", vulnType: "code_injection", severity: "critical" },
  // Command injection
  { pattern: /exec\s*\(\s*[`"'][^`"']*\$\{/g, label: "exec with user input", vulnType: "cmd_injection", severity: "critical" },
  { pattern: /spawn\s*\([^,]+,\s*\[.*req\./g, label: "spawn with request data", vulnType: "cmd_injection", severity: "critical" },
  // SSRF / unvalidated redirects
  { pattern: /res\.redirect\s*\(\s*req\./g, label: "Redirect to user-controlled URL", vulnType: "open_redirect", severity: "high" },
  { pattern: /fetch\s*\(\s*[`"']\s*\$\{.*req\./g, label: "SSRF: fetch with user-controlled URL", vulnType: "ssrf", severity: "critical" },
  // Stripe/payment sinks
  { pattern: /stripe\.\w+\.create\s*\(/g, label: "Stripe API call", vulnType: "payment_bypass", severity: "critical" },
  { pattern: /stripe\.charges\.capture\s*\(/g, label: "Stripe charge capture", vulnType: "payment_bypass", severity: "critical" },
];

/** Sanitizer patterns — these break taint paths */
const SANITIZER_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /z\.\w+\(\)\.parse\s*\(/g, label: "Zod schema parse" },
  { pattern: /\.safeParse\s*\(/g, label: "Zod safeParse" },
  { pattern: /DOMPurify\.sanitize\s*\(/g, label: "DOMPurify sanitization" },
  { pattern: /validator\.escape\s*\(/g, label: "validator.escape()" },
  { pattern: /validator\.isEmail\s*\(/g, label: "validator.isEmail()" },
  { pattern: /parseInt\s*\(\s*[^,)]+,\s*10\s*\)/g, label: "parseInt with radix" },
  { pattern: /Number\s*\(\s*[^)]+\s*\)/g, label: "Number() cast" },
  { pattern: /encodeURIComponent\s*\(/g, label: "encodeURIComponent" },
  { pattern: /prisma\.\w+\.findFirst\s*\(\s*\{/g, label: "Prisma parameterized query" },
  { pattern: /prisma\.\w+\.findUnique\s*\(\s*\{/g, label: "Prisma parameterized query" },
  { pattern: /xss\s*\(\s*/g, label: "xss-filters sanitizer" },
  { pattern: /escapeHtml\s*\(/g, label: "HTML escape function" },
];

/** External API dependency patterns for FailSafe */
export const EXTERNAL_DEP_PATTERNS: Array<{ name: string; patterns: RegExp[]; category: string }> = [
  { name: "Stripe", patterns: [/stripe\.\w+\./g, /from ['"]stripe['"]/g], category: "payment" },
  { name: "Razorpay", patterns: [/razorpay\.\w+/g, /from ['"]razorpay['"]/g], category: "payment" },
  { name: "Twilio", patterns: [/twilio\.\w+/g, /from ['"]twilio['"]/g], category: "sms" },
  { name: "SendGrid", patterns: [/sgMail\./g, /from ['"]@sendgrid/g], category: "email" },
  { name: "Nodemailer", patterns: [/createTransport\(/g, /from ['"]nodemailer['"]/g], category: "email" },
  { name: "Database (Drizzle)", patterns: [/db\.select\(/g, /db\.insert\(/g, /db\.update\(/g], category: "database" },
  { name: "Database (Prisma)", patterns: [/prisma\.\w+\.(find|create|update|delete)/g], category: "database" },
  { name: "Redis", patterns: [/redis\.get\(/g, /redis\.set\(/g, /ioredis/g], category: "cache" },
  { name: "OpenAI", patterns: [/openai\.\w+/g, /from ['"]openai['"]/g], category: "ai" },
  { name: "Anthropic", patterns: [/anthropic\.\w+/g, /from ['"]@anthropic/g], category: "ai" },
  { name: "AWS S3", patterns: [/s3\.\w+\(/g, /from ['"]@aws-sdk\/client-s3['"]/g], category: "storage" },
  { name: "Cloudinary", patterns: [/cloudinary\.\w+/g, /from ['"]cloudinary['"]/g], category: "storage" },
  { name: "Auth0", patterns: [/auth0\.\w+/g, /from ['"]@auth0/g], category: "auth" },
  { name: "Clerk", patterns: [/clerkClient\./g, /from ['"]@clerk/g], category: "auth" },
  { name: "Supabase", patterns: [/supabase\.\w+/g, /from ['"]@supabase/g], category: "database" },
];

/** Known heavy import bundle costs in KB */
export const BUNDLE_COST_DB: Record<string, number> = {
  "moment": 232,
  "lodash": 71,
  "lodash-es": 71,
  "rxjs": 89,
  "d3": 275,
  "three": 589,
  "chart.js": 162,
  "recharts": 143,
  "date-fns": 78,
  "antd": 423,
  "material-ui": 318,
  "@mui/material": 318,
  "bootstrap": 58,
  "jquery": 87,
  "underscore": 21,
  "ramda": 43,
  "axios": 14,
  "react-query": 38,
  "swr": 8,
  "framer-motion": 94,
  "gsap": 67,
  "pdf-lib": 197,
  "pdfmake": 213,
  "xlsx": 387,
  "monaco-editor": 2100,
  "quill": 45,
  "draft-js": 89,
  "react-data-grid": 112,
  "ag-grid-react": 287,
  "mapbox-gl": 456,
  "leaflet": 143,
  "socket.io-client": 23,
};

/** Async operation cost estimates in ms */
export const ASYNC_COST_DB: Record<string, number> = {
  "db_query_simple": 5,
  "db_query_join": 15,
  "db_query_aggregation": 30,
  "db_query_full_table_scan": 100,
  "api_call_internal": 10,
  "api_call_external": 100,
  "api_call_ai": 2000,
  "file_read_small": 2,
  "file_read_large": 20,
  "bcrypt_hash": 250,
  "bcrypt_compare": 250,
  "redis_get": 1,
  "redis_set": 1,
  "email_send": 500,
  "sms_send": 300,
  "image_resize": 150,
  "pdf_generate": 800,
  "zip_create": 200,
  "jwt_sign": 2,
  "jwt_verify": 1,
  "dns_lookup": 20,
  "tls_handshake": 50,
};

// ── Core CSG Builder ────────────────────────────────────────────────────────

export function buildCSG(keyFiles: Array<{ path: string; content: string }>): CSG {
  const csg: CSG = {
    nodes: new Map(),
    edges: [],
    outEdges: new Map(),
    inEdges: new Map(),
    nodesByType: new Map(),
    nodesByFile: new Map(),
    sourceNodes: [],
    sinkNodes: [],
    sanitizerNodes: [],
  };

  for (const file of keyFiles) {
    analyzeFile(csg, file.path, file.content);
  }

  // Build cross-file call edges from function name matching
  buildCrossFileCallEdges(csg, keyFiles);

  return csg;
}

function addNode(csg: CSG, node: CSGNode): void {
  csg.nodes.set(node.id, node);

  // Update type index
  const typeList = csg.nodesByType.get(node.type) ?? [];
  typeList.push(node.id);
  csg.nodesByType.set(node.type, typeList);

  // Update file index
  const fileList = csg.nodesByFile.get(node.filePath) ?? [];
  fileList.push(node.id);
  csg.nodesByFile.set(node.filePath, fileList);

  // Update source/sink/sanitizer lists
  if (node.meta.isSource) csg.sourceNodes.push(node.id);
  if (node.meta.isSink) csg.sinkNodes.push(node.id);
  if (node.meta.isSanitizer) csg.sanitizerNodes.push(node.id);
}

function addEdge(csg: CSG, edge: CSGEdge): void {
  csg.edges.push(edge);

  const outList = csg.outEdges.get(edge.from) ?? [];
  outList.push(edge);
  csg.outEdges.set(edge.from, outList);

  const inList = csg.inEdges.get(edge.to) ?? [];
  inList.push(edge);
  csg.inEdges.set(edge.to, inList);
}

function analyzeFile(csg: CSG, filePath: string, content: string): void {
  const lines = content.split("\n");

  // Add module node
  const moduleId = `module:${filePath}`;
  addNode(csg, {
    id: moduleId,
    type: "module",
    label: filePath.split("/").pop() ?? filePath,
    filePath,
    lineStart: 1,
    meta: {},
  });

  // ── Extract imports ──────────────────────────────────────────────────────
  const importRegex = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  let importMatch: RegExpExecArray | null;
  importRegex.lastIndex = 0;
  while ((importMatch = importRegex.exec(content)) !== null) {
    const importedNames = importMatch[1]
      ? importMatch[1].split(",").map((s) => s.trim().split(" as ")[0].trim())
      : importMatch[2]
        ? [importMatch[2]]
        : [];
    const importedFrom = importMatch[3];
    const lineNum = content.substring(0, importMatch.index).split("\n").length;

    const importId = `import:${filePath}:${importedFrom}:${lineNum}`;
    addNode(csg, {
      id: importId,
      type: "import",
      label: `import from '${importedFrom}'`,
      filePath,
      lineStart: lineNum,
      meta: {
        importedFrom,
        importedNames,
        estimatedBundleKb: BUNDLE_COST_DB[importedFrom],
      },
    });

    addEdge(csg, {
      from: moduleId,
      to: importId,
      type: "imports",
    });
  }

  // ── Extract functions ────────────────────────────────────────────────────
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(([^)]*)\)|(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
  let funcMatch: RegExpExecArray | null;
  funcRegex.lastIndex = 0;
  while ((funcMatch = funcRegex.exec(content)) !== null) {
    const funcName = funcMatch[1] || funcMatch[3];
    if (!funcName || ["use", "if", "for", "while", "switch"].includes(funcName)) continue;

    const lineNum = content.substring(0, funcMatch.index).split("\n").length;
    const isAsync = funcMatch[0].includes("async");
    const isExported = funcMatch[0].trim().startsWith("export");
    const paramStr = funcMatch[2] || funcMatch[4] || "";
    const paramCount = paramStr.split(",").filter((p) => p.trim()).length;

    // Extract function body for analysis
    const bodyStart = content.indexOf("{", funcMatch.index + funcMatch[0].length);
    let depth = 0;
    let bodyEnd = bodyStart;
    for (let i = bodyStart; i < content.length && i < bodyStart + 5000; i++) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") {
        depth--;
        if (depth === 0) { bodyEnd = i; break; }
      }
    }
    const funcBody = bodyStart > 0 ? content.substring(bodyStart, bodyEnd + 1) : "";
    const cyclomaticComplexity = computeCyclomaticComplexity(funcBody);
    const cognitiveComplexity = computeCognitiveComplexity(funcBody);

    const funcId = `func:${filePath}:${funcName}:${lineNum}`;
    addNode(csg, {
      id: funcId,
      type: "function",
      label: funcName,
      filePath,
      lineStart: lineNum,
      meta: {
        isAsync,
        isExported,
        paramCount,
        cyclomaticComplexity,
        cognitiveComplexity,
        hasReturn: funcBody.includes("return "),
        containsAsyncCall: isAsync && (funcBody.includes("await ") || funcBody.includes(".then(")),
      },
    });

    addEdge(csg, {
      from: moduleId,
      to: funcId,
      type: "defines",
      lineNumber: lineNum,
    });

    // Check for route handlers
    analyzeRouteHandler(csg, filePath, funcId, funcBody, funcName, lineNum);

    // Check for DB queries within function
    analyzeDBQueries(csg, filePath, funcId, funcBody, lineNum);

    // Check for external API calls
    analyzeAPICalls(csg, filePath, funcId, funcBody, lineNum);

    // Check for error handling
    analyzeTryCatch(csg, filePath, funcId, funcBody, lineNum);

    // Check for loops (N+1 risk)
    analyzeLoops(csg, filePath, funcId, funcBody, lineNum);
  }

  // ── Extract taint sources in file scope ─────────────────────────────────
  for (const sp of SOURCE_PATTERNS) {
    let m: RegExpExecArray | null;
    const re = new RegExp(sp.pattern.source, "g");
    while ((m = re.exec(content)) !== null) {
      const lineNum = content.substring(0, m.index).split("\n").length;
      const srcId = `source:${filePath}:${lineNum}:${sp.label.replace(/\s+/g, "_")}`;
      if (csg.nodes.has(srcId)) continue;
      addNode(csg, {
        id: srcId,
        type: "source",
        label: sp.label,
        filePath,
        lineStart: lineNum,
        meta: { isSource: true, isTainted: true },
      });
    }
  }

  // ── Extract taint sinks in file scope ──────────────────────────────────
  for (const sk of SINK_PATTERNS) {
    let m: RegExpExecArray | null;
    const re = new RegExp(sk.pattern.source, "gi");
    while ((m = re.exec(content)) !== null) {
      const lineNum = content.substring(0, m.index).split("\n").length;
      const sinkId = `sink:${filePath}:${lineNum}:${sk.vulnType}`;
      if (csg.nodes.has(sinkId)) continue;
      addNode(csg, {
        id: sinkId,
        type: "sink",
        label: sk.label,
        filePath,
        lineStart: lineNum,
        meta: { isSink: true },
      });
    }
  }

  // ── Extract sanitizers in file scope ───────────────────────────────────
  for (const san of SANITIZER_PATTERNS) {
    let m: RegExpExecArray | null;
    const re = new RegExp(san.pattern.source, "g");
    while ((m = re.exec(content)) !== null) {
      const lineNum = content.substring(0, m.index).split("\n").length;
      const sanId = `sanitizer:${filePath}:${lineNum}:${san.label.replace(/\s+/g, "_")}`;
      if (csg.nodes.has(sanId)) continue;
      addNode(csg, {
        id: sanId,
        type: "sanitizer",
        label: san.label,
        filePath,
        lineStart: lineNum,
        meta: { isSanitizer: true },
      });
    }
  }

  // ── Extract conditionals (for implicit flow detection) ─────────────────
  analyzeConditionals(csg, filePath, content);
}

function analyzeRouteHandler(
  csg: CSG, filePath: string, funcId: string, body: string, funcName: string, lineNum: number
): void {
  const routePatterns = [
    /router\.(get|post|put|patch|delete|use)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /app\.(get|post|put|patch|delete|use)\s*\(\s*['"`]([^'"`]+)['"`]/g,
  ];

  for (const pat of routePatterns) {
    let m: RegExpExecArray | null;
    const re = new RegExp(pat.source, "g");
    while ((m = re.exec(body)) !== null) {
      const httpMethod = m[1].toUpperCase();
      const routePath = m[2];
      const routeId = `route:${filePath}:${httpMethod}:${routePath}`;

      const hasAuthMiddleware = body.includes("requireAuth") ||
        body.includes("authenticate") ||
        body.includes("verifyToken") ||
        body.includes("middleware");

      addNode(csg, {
        id: routeId,
        type: "route",
        label: `${httpMethod} ${routePath}`,
        filePath,
        lineStart: lineNum,
        meta: {
          httpMethod,
          routePath,
          hasAuthMiddleware,
        },
      });

      addEdge(csg, { from: funcId, to: routeId, type: "handles" });
    }
  }
}

function analyzeDBQueries(
  csg: CSG, filePath: string, funcId: string, body: string, lineNum: number
): void {
  const dbPatterns: Array<{ re: RegExp; qtype: CSGNode["meta"]["queryType"] }> = [
    { re: /db\.select\(/g, qtype: "select" },
    { re: /db\.insert\(/g, qtype: "insert" },
    { re: /db\.update\(/g, qtype: "update" },
    { re: /db\.delete\(/g, qtype: "delete" },
    { re: /prisma\.\w+\.findMany\(/g, qtype: "select" },
    { re: /prisma\.\w+\.findFirst\(/g, qtype: "select" },
    { re: /prisma\.\w+\.findUnique\(/g, qtype: "select" },
    { re: /prisma\.\w+\.create\(/g, qtype: "insert" },
    { re: /prisma\.\w+\.update\(/g, qtype: "update" },
    { re: /prisma\.\w+\.delete\(/g, qtype: "delete" },
    { re: /\.query\s*\(\s*['"`]/g, qtype: "raw" },
    { re: /\.execute\s*\(\s*['"`]/g, qtype: "raw" },
  ];

  for (const { re, qtype } of dbPatterns) {
    let m: RegExpExecArray | null;
    const newRe = new RegExp(re.source, "g");
    while ((m = newRe.exec(body)) !== null) {
      const absoluteLine = lineNum + body.substring(0, m.index).split("\n").length - 1;
      const dbId = `dbquery:${filePath}:${absoluteLine}:${qtype}`;
      if (csg.nodes.has(dbId)) continue;

      // Check if this is raw SQL with interpolation (injection risk)
      const contextEnd = Math.min(m.index + 200, body.length);
      const context = body.substring(m.index, contextEnd);
      const isParameterized = !context.includes("${") || qtype !== "raw";
      const estimatedCostMs = qtype === "select" ? ASYNC_COST_DB.db_query_simple
        : qtype === "raw" ? ASYNC_COST_DB.db_query_full_table_scan
        : ASYNC_COST_DB.db_query_simple;

      addNode(csg, {
        id: dbId,
        type: "dbquery",
        label: `DB ${qtype}`,
        filePath,
        lineStart: absoluteLine,
        meta: { queryType: qtype, isParameterized, estimatedCostMs },
      });

      addEdge(csg, { from: funcId, to: dbId, type: "queries" });
    }
  }
}

function analyzeAPICalls(
  csg: CSG, filePath: string, funcId: string, body: string, lineNum: number
): void {
  for (const dep of EXTERNAL_DEP_PATTERNS) {
    for (const pattern of dep.patterns) {
      const re = new RegExp(pattern.source, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        const absoluteLine = lineNum + body.substring(0, m.index).split("\n").length - 1;
        const apiId = `apicall:${filePath}:${absoluteLine}:${dep.name}`;
        if (csg.nodes.has(apiId)) continue;

        // Check surrounding context for error handling
        const contextBefore = body.substring(Math.max(0, m.index - 200), m.index);
        const contextAfter = body.substring(m.index, Math.min(body.length, m.index + 200));
        const hasErrorHandling = contextBefore.includes("try") || contextAfter.includes(".catch(");
        const hasRetry = body.includes("retry") || body.includes("backoff") || body.includes("attempt");

        addNode(csg, {
          id: apiId,
          type: "apicall",
          label: `${dep.name} API call`,
          filePath,
          lineStart: absoluteLine,
          meta: {
            externalService: dep.name,
            hasErrorHandling,
            hasRetry,
            estimatedCostMs: ASYNC_COST_DB.api_call_external,
          },
        });

        addEdge(csg, { from: funcId, to: apiId, type: "calls" });
        break; // One node per dep per function
      }
    }
  }

  // Generic fetch/axios calls
  const fetchRe = /(?:await\s+)?(?:fetch|axios\.(?:get|post|put|delete|patch))\s*\(/g;
  let fm: RegExpExecArray | null;
  while ((fm = fetchRe.exec(body)) !== null) {
    const absoluteLine = lineNum + body.substring(0, fm.index).split("\n").length - 1;
    const apiId = `apicall:${filePath}:${absoluteLine}:http`;
    if (csg.nodes.has(apiId)) continue;
    const contextAfter = body.substring(fm.index, Math.min(body.length, fm.index + 300));
    const hasErrorHandling = contextAfter.includes(".catch(") || body.substring(Math.max(0, fm.index - 300), fm.index).includes("try");

    addNode(csg, {
      id: apiId,
      type: "apicall",
      label: "HTTP API call",
      filePath,
      lineStart: absoluteLine,
      meta: {
        externalService: "HTTP",
        hasErrorHandling,
        hasRetry: body.includes("retry") || body.includes("backoff"),
        estimatedCostMs: ASYNC_COST_DB.api_call_external,
      },
    });

    addEdge(csg, { from: funcId, to: apiId, type: "calls" });
  }
}

function analyzeTryCatch(
  csg: CSG, filePath: string, funcId: string, body: string, lineNum: number
): void {
  const tryCatchRe = /try\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\s*catch\s*\(([^)]*)\)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = tryCatchRe.exec(body)) !== null) {
    const catchBody = m[3] || "";
    const absoluteLine = lineNum + body.substring(0, m.index).split("\n").length - 1;
    const tcId = `try_catch:${filePath}:${absoluteLine}`;

    const catchIsEmpty = catchBody.trim().length === 0 ||
      catchBody.trim() === "//" ||
      /^\s*\/\/.*$/.test(catchBody.trim());

    const hasLogging = catchBody.includes("logger.") ||
      catchBody.includes("console.") ||
      catchBody.includes("log(") ||
      catchBody.includes("Sentry.") ||
      catchBody.includes("captureException");

    addNode(csg, {
      id: tcId,
      type: "try_catch",
      label: "try/catch block",
      filePath,
      lineStart: absoluteLine,
      meta: { catchIsEmpty, hasLogging },
    });

    addEdge(csg, { from: funcId, to: tcId, type: "catches" });
  }
}

function analyzeLoops(
  csg: CSG, filePath: string, funcId: string, body: string, lineNum: number
): void {
  const loopRe = /(?:for\s*\(|for\s+(?:const|let|var)\s+\w+\s+(?:of|in)|while\s*\(|\.(?:map|forEach|filter|reduce|flatMap)\s*\()/g;
  let m: RegExpExecArray | null;
  while ((m = loopRe.exec(body)) !== null) {
    // Check if loop body contains async/DB calls (N+1 risk)
    const loopStart = m.index;
    const loopEnd = Math.min(body.length, loopStart + 500);
    const loopBody = body.substring(loopStart, loopEnd);

    const containsAsyncCall = loopBody.includes("await ") ||
      loopBody.includes("db.") ||
      loopBody.includes("prisma.") ||
      loopBody.includes("fetch(") ||
      loopBody.includes("axios.");

    if (!containsAsyncCall) continue; // Only flag loops with async calls

    const absoluteLine = lineNum + body.substring(0, m.index).split("\n").length - 1;
    const loopId = `loop:${filePath}:${absoluteLine}`;
    if (csg.nodes.has(loopId)) continue;

    addNode(csg, {
      id: loopId,
      type: "loop",
      label: "Loop with async call (N+1 risk)",
      filePath,
      lineStart: absoluteLine,
      meta: { containsAsyncCall: true },
    });

    addEdge(csg, { from: funcId, to: loopId, type: "defines" });
  }
}

function analyzeConditionals(csg: CSG, filePath: string, content: string): void {
  // Detect auth/role checks as conditionals for implicit flow tracking
  const authConditionRe = /if\s*\(([^)]*(?:\.role|isAdmin|isAuthenticated|session\.userId|req\.user|auth\.)[^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = authConditionRe.exec(content)) !== null) {
    const lineNum = content.substring(0, m.index).split("\n").length;
    const condId = `conditional:${filePath}:${lineNum}`;
    if (csg.nodes.has(condId)) continue;

    addNode(csg, {
      id: condId,
      type: "conditional",
      label: "Auth/role check",
      filePath,
      lineStart: lineNum,
      meta: {
        conditionText: m[1].substring(0, 100),
        isAuthCheck: true,
      },
    });
  }
}

function buildCrossFileCallEdges(csg: CSG, keyFiles: Array<{ path: string; content: string }>): void {
  // Build a map of exported function names to their node IDs
  const exportedFuncs = new Map<string, string>();
  for (const [nodeId, node] of csg.nodes) {
    if (node.type === "function" && node.meta.isExported) {
      exportedFuncs.set(node.label, nodeId);
    }
  }

  // For each file, check if it calls any exported function from another file
  for (const file of keyFiles) {
    const moduleId = `module:${file.path}`;
    for (const [funcName, funcNodeId] of exportedFuncs) {
      const calledFromDifferentFile = funcNodeId.includes(`:${file.path}:`) === false;
      if (!calledFromDifferentFile) continue;

      // Check if this function name appears as a call in this file
      const callRe = new RegExp(`\\b${funcName}\\s*\\(`, "g");
      if (callRe.test(file.content)) {
        addEdge(csg, {
          from: moduleId,
          to: funcNodeId,
          type: "calls",
        });
      }
    }
  }
}

// ── Complexity Metrics ─────────────────────────────────────────────────────

/**
 * Cyclomatic Complexity — counts decision points + 1
 * V(G) = edges - nodes + 2P where P = connected components
 * Simplified: count branches (if, else, for, while, case, catch, &&, ||, ??)
 */
export function computeCyclomaticComplexity(body: string): number {
  const branchKeywords = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\?/g,
    /&&/g,
    /\|\|/g,
    /\?\s*[^:]/g, // ternary
  ];

  let complexity = 1;
  for (const re of branchKeywords) {
    const matches = body.match(new RegExp(re.source, "g"));
    if (matches) complexity += matches.length;
  }
  return complexity;
}

/**
 * Cognitive Complexity — penalizes nesting and structural complexity
 * From SonarSource's algorithm: https://www.sonarsource.com/resources/cognitive-complexity/
 * Increments for: breaks in linear flow + nesting multiplier
 */
export function computeCognitiveComplexity(body: string): number {
  let complexity = 0;
  let nestingLevel = 0;

  const lines = body.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();

    // Nesting increasers — add nesting multiplier
    if (/^(?:if|for|while|do|switch|try)\s*[({]/.test(trimmed)) {
      complexity += 1 + nestingLevel;
      nestingLevel++;
    }
    // Logical operators — add flat 1
    else if (/&&|\|\||\?\?/.test(trimmed)) {
      complexity += trimmed.match(/&&|\|\||\?\?/g)?.length ?? 0;
    }
    // else/else-if — add 1 (structural)
    else if (/^(?:else\s+if|else)\s*[({]/.test(trimmed)) {
      complexity += 1;
    }
    // Closing brace — decrease nesting
    if (/^}/.test(trimmed) && nestingLevel > 0) {
      nestingLevel--;
    }
  }

  return complexity;
}

// ── Graph Traversal Utilities ──────────────────────────────────────────────

/**
 * BFS forward traversal from a set of start nodes
 * Returns all reachable node IDs up to max depth
 */
export function bfsForward(
  csg: CSG,
  startIds: string[],
  edgeTypes?: CSGEdgeType[],
  maxDepth = 10,
): Map<string, number> {
  const visited = new Map<string, number>(); // nodeId → depth
  const queue: Array<[string, number]> = startIds.map((id) => [id, 0]);

  while (queue.length > 0) {
    const [nodeId, depth] = queue.shift()!;
    if (visited.has(nodeId) || depth > maxDepth) continue;
    visited.set(nodeId, depth);

    const edges = csg.outEdges.get(nodeId) ?? [];
    for (const edge of edges) {
      if (edgeTypes && !edgeTypes.includes(edge.type)) continue;
      if (!visited.has(edge.to)) {
        queue.push([edge.to, depth + 1]);
      }
    }
  }

  return visited;
}

/**
 * BFS backward traversal from a set of start nodes (reverse edges)
 */
export function bfsBackward(
  csg: CSG,
  startIds: string[],
  edgeTypes?: CSGEdgeType[],
  maxDepth = 10,
): Map<string, number> {
  const visited = new Map<string, number>();
  const queue: Array<[string, number]> = startIds.map((id) => [id, 0]);

  while (queue.length > 0) {
    const [nodeId, depth] = queue.shift()!;
    if (visited.has(nodeId) || depth > maxDepth) continue;
    visited.set(nodeId, depth);

    const edges = csg.inEdges.get(nodeId) ?? [];
    for (const edge of edges) {
      if (edgeTypes && !edgeTypes.includes(edge.type)) continue;
      if (!visited.has(edge.from)) {
        queue.push([edge.from, depth + 1]);
      }
    }
  }

  return visited;
}

/**
 * Find all PATHS (not just reachability) from sources to sinks
 * Used by VibeTaint for full path reporting
 */
export function findPaths(
  csg: CSG,
  fromId: string,
  toId: string,
  maxDepth = 8,
): string[][] {
  const paths: string[][] = [];

  function dfs(current: string, path: string[], depth: number): void {
    if (depth > maxDepth) return;
    if (current === toId) {
      paths.push([...path, current]);
      return;
    }
    const edges = csg.outEdges.get(current) ?? [];
    for (const edge of edges) {
      if (!path.includes(edge.to)) {
        dfs(edge.to, [...path, current], depth + 1);
      }
    }
  }

  dfs(fromId, [], 0);
  return paths;
}

/**
 * Tarjan's SCC algorithm — finds strongly connected components (circular deps)
 * Time complexity: O(V + E)
 */
export function tarjanSCC(
  csg: CSG,
  nodeFilter?: CSGNodeType[],
): string[][] {
  const nodes = nodeFilter
    ? [...csg.nodes.keys()].filter((id) => nodeFilter.includes(csg.nodes.get(id)!.type))
    : [...csg.nodes.keys()];

  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];
  let indexCounter = 0;

  function strongConnect(nodeId: string): void {
    index.set(nodeId, indexCounter);
    lowlink.set(nodeId, indexCounter);
    indexCounter++;
    stack.push(nodeId);
    onStack.add(nodeId);

    const edges = csg.outEdges.get(nodeId) ?? [];
    for (const edge of edges) {
      if (!nodeFilter || nodeFilter.includes(csg.nodes.get(edge.to)?.type!)) {
        if (!index.has(edge.to)) {
          strongConnect(edge.to);
          lowlink.set(nodeId, Math.min(lowlink.get(nodeId)!, lowlink.get(edge.to)!));
        } else if (onStack.has(edge.to)) {
          lowlink.set(nodeId, Math.min(lowlink.get(nodeId)!, index.get(edge.to)!));
        }
      }
    }

    if (lowlink.get(nodeId) === index.get(nodeId)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== nodeId);

      if (scc.length > 1) { // Only report non-trivial SCCs
        sccs.push(scc);
      }
    }
  }

  for (const nodeId of nodes) {
    if (!index.has(nodeId)) {
      strongConnect(nodeId);
    }
  }

  return sccs;
}
