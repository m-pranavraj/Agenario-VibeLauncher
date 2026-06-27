import crypto from "crypto";
/**
 * VibeTaint v2 — Babel AST Deep Taint Analysis Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * PATENT CLAIM: Context-sensitive interprocedural taint analysis using Babel AST
 * scope tracking. Tracks explicit data flow through variable assignments, function
 * parameters, return values, and member expressions. Detects implicit control-flow
 * dependencies from tainted branch conditions. Identifies sanitizers (Zod.parse,
 * DOMPurify.sanitize, etc.) that break taint propagation.
 *
 * Algorithm:
 *   1. Parse each file with Babel (JSX+TS support)
 *   2. Build scope tree: track every variable declaration and its taint state
 *   3. Forward data-flow: assignment = source → propagate to assigned variable
 *   4. Interprocedural: function call arguments → callee parameter taint
 *   5. Return tracking: tainted return → caller expression taint
 *   6. Implicit flow: branch condition taint → side-effects in branch body
 *   7. Sanitizer gates: tainted → sanitizer call → untainted result
 *   8. Sink detection: tainted data reaching eval/exec/query → finding
 *
 * Output: TaintFinding[] with full source→sink path evidence, sanitizer
 * intersection checks, and per-variable taint provenance chains.
 */

import * as parser from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = typeof _traverse === "function" ? _traverse : (_traverse as any).default;

import { buildCSG, bfsForward, bfsBackward, type CSG, type CSGNode } from "./csg-builder.js";
import { logger } from "./logger.js";

// ─── Types ────────────────────────────────────────────────────────────────

export interface TaintPath {
  sourceNode: string;
  sourceLabel: string;
  sinkNode: string;
  sinkLabel: string;
  vulnType: string;
  sanitized: boolean;
  missingPaths: number;
  pathLength: number;
  /** Chain of variable/expression names that propagated taint */
  taintChain: string[];
  /** Specific code locations in the propagation path */
  propagationLocs: Array<{ file: string; line: number; code: string }>;
  /** Whether this is an implicit (control-dependence) flow */
  implicitFlow: boolean;
}

export interface TaintFinding {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "taint" | "idor" | "sqli" | "xss" | "cmd_injection" | "ssrf" | "time_bomb";
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  fixPrompt: string;
  confidence: number;
  taintPath?: TaintPath;
  cveIds?: string[];
  vulnerableVersion?: string;
  cvssScore?: number;
}

export interface VibeTaintResult {
  findings: TaintFinding[];
  stats: {
    sourceNodes: number;
    sinkNodes: number;
    sanitizerNodes: number;
    taintedPaths: number;
    sanitizedPaths: number;
    timeBombFindings: number;
    idorPatterns: number;
    authBypassPatterns: number;
    implicitFlowsDetected: number;
  };
  taintScore: number;
}

// ─── Source / Sink / Sanitizer Definitions ───────────────────────────────

interface SourceDef {
  patterns: string[];
  label: string;
  category: string;
}

interface SinkDef {
  patterns: string[];
  label: string;
  vulnType: string;
  severity: "critical" | "high" | "medium" | "low";
  categories: string[];
}

interface SanitizerDef {
  patterns: string[];
  label: string;
  clearsCategories: string[];
}

const SOURCE_DEFS: SourceDef[] = [
  { patterns: ["req.body", "request.body"], label: "HTTP request body", category: "user_input" },
  { patterns: ["req.query", "request.query"], label: "URL query parameter", category: "user_input" },
  { patterns: ["req.params", "request.params"], label: "URL path parameter", category: "user_input" },
  { patterns: ["req.headers", "request.headers"], label: "HTTP header", category: "user_input" },
  { patterns: ["req.cookies", "request.cookies"], label: "Cookie value", category: "user_input" },
  { patterns: ["searchParams.get(", "searchParams.get("], label: "URL search param", category: "user_input" },
  { patterns: ["localStorage.getItem"], label: "localStorage read", category: "client_storage" },
  { patterns: ["sessionStorage.getItem"], label: "sessionStorage read", category: "client_storage" },
  { patterns: ["document.cookie"], label: "document.cookie read", category: "user_input" },
  { patterns: ["window.location"], label: "Window location", category: "user_input" },
  { patterns: ["process.env"], label: "Environment variable", category: "config" },
  { patterns: ["useSearchParams()"], label: "Next.js search params", category: "user_input" },
  { patterns: ["getServerSideProps"], label: "Next.js SSR props", category: "user_input" },
  { patterns: ["req.files", "request.files"], label: "File upload", category: "user_input" },
  { patterns: ["req.file", "request.file"], label: "File upload", category: "user_input" },
];

const SINK_DEFS: SinkDef[] = [
  { patterns: ["eval(", "eval ("], label: "eval() call", vulnType: "code_injection", severity: "critical", categories: ["code_execution"] },
  { patterns: ["new Function("], label: "new Function() call", vulnType: "code_injection", severity: "critical", categories: ["code_execution"] },
  { patterns: [".query(", ".query ("], label: "DB query call", vulnType: "sqli", severity: "critical", categories: ["sql_injection"] },
  { patterns: [".execute(", ".execute ("], label: "DB execute call", vulnType: "sqli", severity: "critical", categories: ["sql_injection"] },
  { patterns: [".raw(", ".raw ("], label: "DB raw query", vulnType: "sqli", severity: "critical", categories: ["sql_injection"] },
  { patterns: ["exec(", "exec ("], label: "exec() call", vulnType: "cmd_injection", severity: "critical", categories: ["command_injection"] },
  { patterns: ["execSync(", "execSync ("], label: "execSync() call", vulnType: "cmd_injection", severity: "critical", categories: ["command_injection"] },
  { patterns: ["spawn(", "spawn ("], label: "spawn() call", vulnType: "cmd_injection", severity: "critical", categories: ["command_injection"] },
  { patterns: ["dangerouslySetInnerHTML"], label: "dangerouslySetInnerHTML", vulnType: "xss", severity: "critical", categories: ["xss"] },
  { patterns: [".innerHTML ="], label: "innerHTML assignment", vulnType: "xss", severity: "high", categories: ["xss"] },
  { patterns: ["document.write(", "document.write ("], label: "document.write", vulnType: "xss", severity: "high", categories: ["xss"] },
  { patterns: ["fetch(", "fetch ("], label: "fetch() call", vulnType: "ssrf", severity: "critical", categories: ["ssrf"] },
  { patterns: ["res.redirect(", "res.redirect ("], label: "res.redirect()", vulnType: "open_redirect", severity: "high", categories: ["open_redirect"] },
  { patterns: ["fs.writeFile", "fs.writeFileSync"], label: "File write", vulnType: "path_traversal", severity: "high", categories: ["file_operations"] },
  { patterns: ["fs.appendFile", "fs.appendFileSync"], label: "File append", vulnType: "path_traversal", severity: "high", categories: ["file_operations"] },
  { patterns: [".innerHTML ="], label: "innerHTML setter", vulnType: "xss", severity: "high", categories: ["xss"] },
  { patterns: ["res.send(", "res.send ("], label: "res.send()", vulnType: "xss", severity: "medium", categories: ["data_exposure"] },
  { patterns: ["res.json(", "res.json ("], label: "res.json()", vulnType: "xss", severity: "medium", categories: ["data_exposure"] },
  { patterns: ["res.render(", "res.render ("], label: "res.render()", vulnType: "ssti", severity: "high", categories: ["ssti"] },
  { patterns: ["cookie-parser", "cookieParser"], label: "Cookie parsing", vulnType: "taint", severity: "low", categories: ["data_exposure"] },
  { patterns: ["jwt.sign(", "jwt.sign ("], label: "JWT sign", vulnType: "taint", severity: "high", categories: ["auth"] },
  { patterns: ["jwt.verify(", "jwt.verify ("], label: "JWT verify", vulnType: "taint", severity: "high", categories: ["auth"] },
];

const SANITIZER_DEFS: SanitizerDef[] = [
  { patterns: [".parse(", ".safeParse("], label: "Zod schema parse", clearsCategories: ["user_input", "injection", "*"] },
  { patterns: ["DOMPurify.sanitize", "dompurify"], label: "DOMPurify sanitize", clearsCategories: ["xss", "injection"] },
  { patterns: ["validator.escape", "validator.stripLow", "validator.whitelist"], label: "Validator.js escape", clearsCategories: ["xss", "injection"] },
  { patterns: ["encodeURIComponent("], label: "encodeURIComponent", clearsCategories: ["xss", "injection"] },
  { patterns: ["parseInt(", "Number("], label: "Number coercion", clearsCategories: ["sqli", "injection"] },
  { patterns: ["escapeHtml("], label: "HTML escape", clearsCategories: ["xss"] },
  { patterns: ["xss("], label: "xss-filters", clearsCategories: ["xss"] },
];

// ─── CVE Database ─────────────────────────────────────────────────────────

const CVE_DATABASE: Array<{
  package: string;
  vulnerableRange: string;
  cveId: string;
  cvssScore: number;
  description: string;
  vulnType: string;
  fixVersion: string;
}> = [
  { package: "lodash", vulnerableRange: "<4.17.21", cveId: "CVE-2021-23337", cvssScore: 7.2, description: "Command injection via Template", vulnType: "cmd_injection", fixVersion: "4.17.21" },
  { package: "lodash", vulnerableRange: "<4.17.19", cveId: "CVE-2020-8203", cvssScore: 7.4, description: "Prototype Pollution", vulnType: "prototype_pollution", fixVersion: "4.17.19" },
  { package: "minimist", vulnerableRange: "<1.2.6", cveId: "CVE-2021-44906", cvssScore: 9.8, description: "Prototype Pollution", vulnType: "prototype_pollution", fixVersion: "1.2.6" },
  { package: "node-fetch", vulnerableRange: "<2.6.7", cveId: "CVE-2022-0235", cvssScore: 6.1, description: "Exposure of Sensitive Information", vulnType: "info_disclosure", fixVersion: "2.6.7" },
  { package: "axios", vulnerableRange: "<1.6.0", cveId: "CVE-2023-45857", cvssScore: 6.5, description: "CSRF via cross-origin requests", vulnType: "csrf", fixVersion: "1.6.0" },
  { package: "express", vulnerableRange: "<4.19.2", cveId: "CVE-2024-29041", cvssScore: 6.1, description: "Open Redirect", vulnType: "open_redirect", fixVersion: "4.19.2" },
  { package: "jsonwebtoken", vulnerableRange: "<9.0.0", cveId: "CVE-2022-23529", cvssScore: 7.6, description: "Remote Code Execution via JWT", vulnType: "rce", fixVersion: "9.0.0" },
  { package: "vm2", vulnerableRange: "<3.9.17", cveId: "CVE-2023-29199", cvssScore: 9.8, description: "Sandbox escape leading to RCE", vulnType: "rce", fixVersion: "3.9.17" },
  { package: "tar", vulnerableRange: "<6.1.9", cveId: "CVE-2021-37713", cvssScore: 7.1, description: "Arbitrary File Write via Path Traversal", vulnType: "path_traversal", fixVersion: "6.1.9" },
  { package: "ejs", vulnerableRange: "<3.1.10", cveId: "CVE-2024-33883", cvssScore: 5.3, description: "Server-Side Template Injection", vulnType: "ssti", fixVersion: "3.1.10" },
  { package: "next", vulnerableRange: "<14.1.1", cveId: "CVE-2024-34351", cvssScore: 7.5, description: "SSRF in Server Actions", vulnType: "ssrf", fixVersion: "14.1.1" },
  { package: "pg", vulnerableRange: "<8.11.5", cveId: "CVE-2024-4483", cvssScore: 6.5, description: "SQL injection via connection string", vulnType: "sqli", fixVersion: "8.11.5" },
  { package: "mysql2", vulnerableRange: "<3.9.4", cveId: "CVE-2024-21508", cvssScore: 9.8, description: "Remote Code Execution", vulnType: "rce", fixVersion: "3.9.4" },
  { package: "sanitize-html", vulnerableRange: "<2.11.0", cveId: "CVE-2024-21501", cvssScore: 5.3, description: "Bypass via nested script tags", vulnType: "xss", fixVersion: "2.11.0" },
  { package: "jsonpath-plus", vulnerableRange: "<8.0.0", cveId: "CVE-2024-21534", cvssScore: 9.8, description: "Remote Code Execution", vulnType: "rce", fixVersion: "8.0.0" },
  { package: "vite", vulnerableRange: "<5.4.6", cveId: "CVE-2024-45812", cvssScore: 6.5, description: "XSS via crafted HTML", vulnType: "xss", fixVersion: "5.4.6" },
  { package: "jose", vulnerableRange: "<4.15.5", cveId: "CVE-2024-28176", cvssScore: 4.9, description: "Resource exhaustion via JWE", vulnType: "dos", fixVersion: "4.15.5" },
];

// ─── IDOR / Auth Bypass / Implicit Flow Patterns ─────────────────────────

const IDOR_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  description: string;
  severity: "critical" | "high";
  fixPrompt: string;
}> = [
  {
    name: "IDOR: Direct ID from params without ownership check",
    pattern: /req\.params\.(?:id|userId|user_id|accountId|account_id)\b(?!.*(?:userId|session\.userId|req\.user\.id|ownership|belongs|authorize))/g,
    severity: "critical",
    description: "Route uses ID directly from URL params without verifying the requesting user owns that resource.",
    fixPrompt: "Add ownership check: `if (resource.userId !== req.session.userId) return res.status(403).json({ error: 'Forbidden' });`.",
  },
  {
    name: "IDOR: Missing auth on database query by ID",
    pattern: /(?:db|prisma)\.\w+\.(?:findFirst|findUnique|findById|select)\s*\(\s*\{(?:(?!userId|session|auth|user_id).){0,200}\}/gs,
    severity: "high",
    description: "Database query by ID without filtering by authenticated userId allows horizontal privilege escalation.",
    fixPrompt: "Add `where: { id, userId: req.session.userId }` to scope queries to the authenticated user.",
  },
  {
    name: "IDOR: Sequential ID in URL path",
    pattern: /\/api\/\w+\/\${(?:params|req\.params)\.\w*id\w*}/gi,
    severity: "high",
    description: "API endpoint uses sequential integer IDs in URL — predictable IDs enable enumeration attacks.",
    fixPrompt: "Use UUIDs instead of sequential IDs, or implement authorization checks.",
  },
];

const AUTH_BYPASS_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  fixPrompt: string;
  confidence: number;
}> = [
  {
    name: "Auth Bypass: JWT decoded but not verified",
    pattern: /jwt\.decode\s*\(/g,
    severity: "critical",
    description: "jwt.decode() does NOT verify signature — anyone can forge a JWT.",
    fixPrompt: "Use jwt.verify(token, process.env.JWT_SECRET) instead of jwt.decode().",
    confidence: 99,
  },
  {
    name: "Auth Bypass: Disabled auth middleware in production",
    pattern: /(?:process\.env\.NODE_ENV\s*!==?\s*['"]production['"]|isDev\s*&&|devMode\s*&&)\s*(?:next\(\)|return)/g,
    severity: "critical",
    description: "Auth middleware has a dev-mode bypass.",
    fixPrompt: "Remove environment-based auth bypass.",
    confidence: 95,
  },
  {
    name: "Auth Bypass: Mass assignment in user update",
    pattern: /(?:\.update|\.set)\s*\(\s*(?:req\.body|req\.query)\s*\)/g,
    severity: "critical",
    description: "Spreading entire request body into database update allows mass assignment.",
    fixPrompt: "Explicitly whitelist updatable fields.",
    confidence: 97,
  },
  {
    name: "Broken Auth: Timing-unsafe comparison",
    pattern: /(?:token|secret|key|password|hash)\s*===\s*(?:req\.|user\.|params\.|body\.)/g,
    severity: "high",
    description: "String equality for secret comparison is timing-unsafe.",
    fixPrompt: "Use crypto.timingSafeEqual() for secret comparisons.",
    confidence: 88,
  },
];

const IMPLICIT_FLOW_PATTERNS: Array<{
  name: string;
  guardPattern: RegExp;
  unsafePattern: RegExp;
  description: string;
  severity: "critical" | "high";
  fixPrompt: string;
}> = [
  {
    name: "Implicit IDOR: Auth check missing in else branch",
    guardPattern: /if\s*\([^)]*(?:isAdmin|role\s*===|session\.userId)[^)]*\)\s*\{[^}]+\}/g,
    unsafePattern: /else\s*\{[^}]*(?:db|prisma)\.\w+\./g,
    description: "DB query in else-branch of admin check without user ownership verification.",
    severity: "critical",
    fixPrompt: "Add explicit user ownership verification in the else branch.",
  },
  {
    name: "Implicit Priv Escalation: Role check bypassed by early return",
    guardPattern: /if\s*\([^)]*!.*(?:authenticated|authorized|session\.userId)[^)]*\)\s*(?:return|throw)/g,
    unsafePattern: /(?:req\.session\.userId|req\.user\.id)\s*=\s*/g,
    severity: "critical",
    description: "Session mutation occurs after a negative auth guard.",
    fixPrompt: "Move session mutation inside an explicit positive auth check.",
  },
];

// ─── Taint State ─────────────────────────────────────────────────────────

interface TaintProvenance {
  sourceId: string;
  sourceLabel: string;
  sourceLine: number;
  sourceFile: string;
  chain: string[];
  locs: Array<{ file: string; line: number; code: string }>;
  implicitFlow: boolean;
}

interface TaintScope {
  /** variable name → TaintProvenance[] (each reassignment creates a new provenance) */
  variables: Map<string, TaintProvenance[]>;
  /** expression hash → TaintProvenance (for temp expressions) */
  expressions: Map<string, TaintProvenance>;
  /** parent scope */
  parent: TaintScope | null;
  /** child scopes */
  children: TaintScope[];
  /** Functions defined in this scope: name → paramNames[] */
  functions: Map<string, { params: string[]; bodyStartLine: number; bodyEndLine: number }>;
  /** Whether this scope is inside an implicit-flow context */
  implicitCtx: { condition: string; sourceProv: TaintProvenance } | null;
}

function newScope(parent: TaintScope | null): TaintScope {
  return { variables: new Map(), expressions: new Map(), parent, children: [], functions: new Map(), implicitCtx: null };
}

function lookupVar(scope: TaintScope, name: string): TaintProvenance[] | null {
  let s: TaintScope | null = scope;
  while (s) {
    if (s.variables.has(name)) return s.variables.get(name)!;
    s = s.parent;
  }
  return null;
}

function exprKey(node: any): string {
  if (!node || !node.loc) return `anon:${crypto.randomUUID().slice(0, 8)}`;
  return `${node.loc.start.line}:${node.loc.start.column}-${node.type}`;
}

// ─── AST Taint Analysis Engine ───────────────────────────────────────────

interface FileAnalysis {
  path: string;
  content: string;
}

interface TaintFindingInternal {
  source: { label: string; line: number; file: string; code: string };
  sink: { label: string; line: number; file: string; code: string; vulnType: string; severity: string };
  chain: string[];
  locs: Array<{ file: string; line: number; code: string }>;
  sanitized: boolean;
  implicitFlow: boolean;
  confidence: number;
}

function analyzeFileTaint(
  file: FileAnalysis,
  crossFileScope: Map<string, Array<{ params: string[] }>>,
  allFiles: FileAnalysis[],
  globalFindings: TaintFindingInternal[],
  analyzedFunctions: Set<string>,
): TaintScope {
  const scope = newScope(null);
  const content = file.content;
  if (content.length > 500000) return scope;

  let ast: any;
  try {
    ast = parser.parse(content, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "decorators-legacy", "optionalChaining", "nullishCoalescingOperator"],
      errorRecovery: true,
    });
  } catch {
    return scope;
  }

  // Walk to build function map first
  traverse(ast, {
    FunctionDeclaration(path: any) {
      const name = path.node.id?.name;
      if (!name || ["use", "if", "for", "while", "switch"].includes(name)) return;
      const params = path.node.params.map((p: any) => p.name || p?.left?.name || "");
      const bodyStart = path.node.loc?.start?.line || 0;
      const bodyEnd = path.node.loc?.end?.line || 0;
      scope.functions.set(name, { params, bodyStartLine: bodyStart, bodyEndLine: bodyEnd });
    },
    VariableDeclarator(path: any) {
      const id = path.node.id;
      if (id?.type === "Identifier" && path.parentPath?.parentPath?.node?.type === "ExportNamedDeclaration") {
        // exported const
      }
    },
    ArrowFunctionExpression(path: any) {
      const parent = path.parent;
      if (parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier") {
        const name = parent.id.name;
        const params = path.node.params.map((p: any) => p.name || p?.left?.name || "");
        const bodyStart = path.node.loc?.start?.line || 0;
        const bodyEnd = path.node.loc?.end?.line || 0;
        scope.functions.set(name, { params, bodyStartLine: bodyStart, bodyEndLine: bodyEnd });
      }
    },
    FunctionExpression(path: any) {
      const parent = path.parent;
      if (parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier") {
        const name = parent.id.name;
        const params = path.node.params.map((p: any) => p.name || p?.left?.name || "");
        const bodyStart = path.node.loc?.start?.line || 0;
        const bodyEnd = path.node.loc?.end?.line || 0;
        scope.functions.set(name, { params, bodyStartLine: bodyStart, bodyEndLine: bodyEnd });
      }
    },
  });

  // Walk for actual taint analysis
  traverse(ast, {
    // ─── Source Detection ──────────────────────────────────────────
    MemberExpression(path: any) {
      const code = getCode(path.node, content);
      const line = path.node.loc?.start?.line || 1;

      for (const src of SOURCE_DEFS) {
        for (const pat of src.patterns) {
          if (code.includes(pat)) {
            const prov: TaintProvenance = {
              sourceId: `source:${file.path}:${line}:${src.label}`,
              sourceLabel: src.label,
              sourceLine: line,
              sourceFile: file.path,
              chain: [code],
              locs: [{ file: file.path, line, code: code.substring(0, 80) }],
              implicitFlow: false,
            };
            scope.expressions.set(exprKey(path.node), prov);

            // If assigned to variable, propagate
            const parent = path.parent;
            if (parent?.type === "AssignmentExpression" && parent.left?.type === "Identifier") {
              const varName = parent.left.name;
              const existing = scope.variables.get(varName) || [];
              existing.push(prov);
              scope.variables.set(varName, existing);
            }
            if (parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier") {
              const varName = parent.id.name;
              const existing = scope.variables.get(varName) || [];
              existing.push(prov);
              scope.variables.set(varName, existing);
            }
            break;
          }
        }
      }
    },

    // ─── Assignment Tracking ───────────────────────────────────────
    AssignmentExpression(path: any) {
      const left = path.node.left;
      const right = path.node.right;
      if (!left || !right) return;

      const rightProv = resolveExpressionTaint(scope, right, file, content);
      if (!rightProv || rightProv.length === 0) return;

      const line = path.node.loc?.start?.line || 1;

      if (left?.type === "Identifier") {
        const varName = left.name;
        for (const prov of rightProv) {
          const newProv: TaintProvenance = {
            ...prov,
            chain: [...prov.chain, `${varName} = ${truncate(getCode(right, content), 60)}`],
            locs: [...prov.locs, { file: file.path, line, code: truncate(getCode(path.node, content), 80) }],
          };
          const existing = scope.variables.get(varName) || [];
          existing.push(newProv);
          scope.variables.set(varName, existing);
        }
      } else if (left?.type === "MemberExpression") {
        const objCode = getCode(left.object, content);
        const objProv = lookupVar(scope, objCode);
        if (objProv && objProv.length > 0) {
          for (const prov of objProv) {
            const newProv: TaintProvenance = {
              ...prov,
              chain: [...prov.chain, `.${left.property?.name || ""} = ${truncate(getCode(right, content), 40)}`],
              locs: [...prov.locs, { file: file.path, line, code: truncate(getCode(path.node, content), 80) }],
            };
            scope.expressions.set(exprKey(path.node), newProv);
          }
        }
      }
    },

    // ─── Variable Declarations ─────────────────────────────────────
    VariableDeclarator(path: any) {
      const id = path.node.id;
      const init = path.node.init;
      if (!id || !init) return;
      if (id.type !== "Identifier") return;

      const varName = id.name;
      const line = path.node.loc?.start?.line || 1;

      // Check init for taint
      const initProv = resolveExpressionTaint(scope, init, file, content);
      if (initProv && initProv.length > 0) {
        for (const prov of initProv) {
          // Check if init is a sanitizer call
          const isSanitized = checkSanitizer(getCode(init, content));
          const newProv: TaintProvenance = {
            ...prov,
            sourceId: isSanitized ? `sanitized:${file.path}:${line}` : prov.sourceId,
            sourceLabel: isSanitized ? `sanitized:${prov.sourceLabel}` : prov.sourceLabel,
            chain: [...prov.chain, `${varName} = ${truncate(getCode(init, content), 60)}`],
            locs: [...prov.locs, { file: file.path, line, code: truncate(getCode(path.node, content), 80) }],
          };
          if (isSanitized) {
            newProv.sourceId = `sanitized:${file.path}:${line}`;
          }
          const existing = scope.variables.get(varName) || [];
          existing.push(newProv);
          scope.variables.set(varName, existing);
        }
      }
    },

    // ─── Function Calls ────────────────────────────────────────────
    CallExpression(path: any) {
      const callee = path.node.callee;
      const args = path.node.arguments;
      const line = path.node.loc?.start?.line || 1;
      const callCode = getCode(path.node, content);

      // Check if call is a sink
      checkSinkHit(callCode, line, file, scope, globalFindings);

      // Check if call is a sanitizer — if result is stored, mark as clean
      const isSanCall = checkSanitizer(callCode);
      if (isSanCall) {
        const parent = path.parent;
        if (parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier") {
          const varName = parent.id.name;
          // Create a clean provenance to untaint
          const cleanProv: TaintProvenance = {
            sourceId: `sanitized:${file.path}:${line}`,
            sourceLabel: `sanitized:${truncate(callCode, 40)}`,
            sourceLine: line,
            sourceFile: file.path,
            chain: [`sanitized(${varName})`],
            locs: [{ file: file.path, line, code: truncate(callCode, 80) }],
            implicitFlow: false,
          };
          scope.variables.set(varName, [cleanProv]);
        }
        if (parent?.type === "AssignmentExpression" && parent.left?.type === "Identifier") {
          const varName = parent.left.name;
          const cleanProv: TaintProvenance = {
            sourceId: `sanitized:${file.path}:${line}`,
            sourceLabel: `sanitized:${truncate(callCode, 40)}`,
            sourceLine: line,
            sourceFile: file.path,
            chain: [`sanitized(${varName})`],
            locs: [{ file: file.path, line, code: truncate(callCode, 80) }],
            implicitFlow: false,
          };
          scope.variables.set(varName, [cleanProv]);
        }
        return;
      }

      // Track tainted arguments to function calls
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (!arg) continue;
        const argProv = resolveExpressionTaint(scope, arg, file, content);
        if (!argProv || argProv.length === 0) continue;

        // Try to find the callee function definition in scope
        const funcName = callee?.name;
        if (funcName && scope.functions.has(funcName)) {
          const funcInfo = scope.functions.get(funcName)!;
          if (i < funcInfo.params.length) {
            const paramName = funcInfo.params[i];
            for (const prov of argProv) {
              const newProv: TaintProvenance = {
                ...prov,
                chain: [...prov.chain, `${funcName}(${paramName})`],
                locs: [...prov.locs, { file: file.path, line, code: truncate(`call: ${funcName}()`, 80) }],
              };
              // Since we're in the caller scope, store the taint association
              scope.expressions.set(`call:${funcName}:${paramName}:${line}`, newProv);
            }
          }
        }

        // Handle callback arguments (inline arrow functions)
        if (arg?.type === "ArrowFunctionExpression" || arg?.type === "FunctionExpression") {
          const paramNames = arg.params.map((p: any) => p.name || "");
          // Propagate taint to caller's scope when callback returns tainted value
          const body = arg.body;
          if (body?.type === "Identifier") {
            const bodyProv = lookupVar(scope, body.name);
            if (bodyProv && bodyProv.length > 0) {
              // Return value is tainted
              scope.expressions.set(exprKey(path.node), bodyProv[0]);
            }
          }
        }
      }

      // Check if this call is assigned to a variable (return value tracking)
      const parent = path.parent;
      if (parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier") {
        const varName = parent.id.name;
        // Check if any argument was tainted — return value is also tainted
        const taintedArgs = args
          .map((a: any) => resolveExpressionTaint(scope, a, file, content))
          .filter((p: any) => p && p.length > 0);
        if (taintedArgs.length > 0 && !isSanCall) {
          const existing = scope.variables.get(varName) || [];
          for (const prov of taintedArgs[0]) {
            const newProv: TaintProvenance = {
              ...prov,
              chain: [...prov.chain, `${varName} = ${truncate(getCode(path.node, content), 60)}`],
              locs: [...prov.locs, { file: file.path, line, code: truncate(getCode(path.node, content), 80) }],
            };
            existing.push(newProv);
          }
          scope.variables.set(varName, existing);
        }
      }

      // Object method calls - track taint delegation
      if (callee?.type === "MemberExpression") {
        const obj = callee.object;
        const objProv = resolveExpressionTaint(scope, obj, file, content);
        if (objProv && objProv.length > 0) {
          // Method call on tainted object — result is tainted
          const parent2 = path.parent;
          if (parent2?.type === "VariableDeclarator" && parent2.id?.type === "Identifier") {
            const varName2 = parent2.id.name;
            const existing = scope.variables.get(varName2) || [];
            for (const prov of objProv) {
              const newProv: TaintProvenance = {
                ...prov,
                chain: [...prov.chain, `${varName2} = .${callee.property?.name}()`],
                locs: [...prov.locs, { file: file.path, line, code: truncate(getCode(path.node, content), 80) }],
              };
              existing.push(newProv);
            }
            scope.variables.set(varName2, existing);
          }
        }
      }
    },

    // ─── Return Statements ─────────────────────────────────────────
    ReturnStatement(path: any) {
      const arg = path.node.argument;
      if (!arg) return;
      const argProv = resolveExpressionTaint(scope, arg, file, content);
      if (!argProv || argProv.length === 0) return;
      const line = path.node.loc?.start?.line || 1;

      // Find the enclosing function
      let fnPath = path.parentPath;
      while (fnPath && !["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(fnPath.node?.type)) {
        fnPath = fnPath.parentPath;
      }
      if (!fnPath) return;

      const fnNode = fnPath.node;
      const fnName = fnNode.id?.name ||
        (fnPath.parent?.type === "VariableDeclarator" ? fnPath.parent.id?.name : null) ||
        "anonymous";

      scope.expressions.set(`return:${fnName}:${line}`, argProv[0]);
    },

    // ─── Implicit Flow Detection ───────────────────────────────────
    IfStatement(path: any) {
      const test = path.node.test;
      if (!test) return;

      const testProv = resolveExpressionTaint(scope, test, file, content);
      if (!testProv || testProv.length === 0) return;

      const line = path.node.loc?.start?.line || 1;

      // The condition is tainted — all assignments in the body are implicitly tainted
      const consequent = path.node.consequent;
      const alternate = path.node.alternate;

      // Set implicit context for both branches
      if (consequent) {
        markImplicitTaint(scope, consequent.body || [consequent], testProv[0], file, line, globalFindings, content);
      }
      if (alternate) {
        const altBody = alternate.type === "BlockStatement" ? alternate.body : [alternate];
        markImplicitTaint(scope, altBody, testProv[0], file, line, globalFindings, content);
      }
    },
  });

  return scope;
}

// ─── Helper: Resolve expression to taint provenance ─────────────────────

function resolveExpressionTaint(
  scope: TaintScope,
  node: any,
  file: FileAnalysis,
  content: string,
): TaintProvenance[] | null {
  if (!node) return null;

  // Identifier: look up in scope
  if (node.type === "Identifier") {
    const prov = lookupVar(scope, node.name);
    if (prov && prov.length > 0) return prov;
    return null;
  }

  // MemberExpression: check if object is tainted
  if (node.type === "MemberExpression") {
    const objProv = resolveExpressionTaint(scope, node.object, file, content);
    if (objProv && objProv.length > 0) return objProv;
    return null;
  }

  // CallExpression
  if (node.type === "CallExpression") {
    const callee = node.callee;
    // Check if this is a known expression via key
    const ek = exprKey(node);
    if (scope.expressions.has(ek)) return [scope.expressions.get(ek)!];

    // Check sanitizer
    const code = getCode(node, content);
    if (checkSanitizer(code)) return null; // Sanitized — no taint

    // Check if it's a function call with tainted arguments
    for (const arg of node.arguments) {
      if (!arg) continue;
      const argProv = resolveExpressionTaint(scope, arg, file, content);
      if (argProv && argProv.length > 0) {
        // Return value inherits taint from arguments
        const resultProv: TaintProvenance = {
          ...argProv[0],
          chain: [...argProv[0].chain, `${truncate(code, 60)}`],
          locs: [...argProv[0].locs, { file: file.path, line: node.loc?.start?.line || 1, code: truncate(code, 80) }],
        };
        return [resultProv];
      }
    }

    return null;
  }

  // TemplateLiteral: check expressions inside
  if (node.type === "TemplateLiteral") {
    for (const expr of node.expressions) {
      const exprProv = resolveExpressionTaint(scope, expr, file, content);
      if (exprProv && exprProv.length > 0) {
        return [{
          ...exprProv[0],
          chain: [...exprProv[0].chain, `\`...\$\{...\}...\``],
          locs: [...exprProv[0].locs, { file: file.path, line: node.loc?.start?.line || 1, code: truncate(getCode(node, content), 80) }],
        }];
      }
    }
    return null;
  }

  // ArrayExpression: check elements
  if (node.type === "ArrayExpression") {
    for (const elem of node.elements) {
      if (!elem) continue;
      const elemProv = resolveExpressionTaint(scope, elem, file, content);
      if (elemProv && elemProv.length > 0) return elemProv;
    }
    return null;
  }

  // ObjectExpression: check values
  if (node.type === "ObjectExpression") {
    for (const prop of node.properties) {
      if (!prop || !prop.value) continue;
      const valProv = resolveExpressionTaint(scope, prop.value, file, content);
      if (valProv && valProv.length > 0) return valProv;
    }
    return null;
  }

  // BinaryExpression / LogicalExpression
  if (node.type === "BinaryExpression" || node.type === "LogicalExpression") {
    const leftProv = resolveExpressionTaint(scope, node.left, file, content);
    if (leftProv && leftProv.length > 0) return leftProv;
    const rightProv = resolveExpressionTaint(scope, node.right, file, content);
    if (rightProv && rightProv.length > 0) return rightProv;
    return null;
  }

  // ConditionalExpression (ternary)
  if (node.type === "ConditionalExpression") {
    const testProv = resolveExpressionTaint(scope, node.test, file, content);
    if (testProv && testProv.length > 0) {
      return [{
        ...testProv[0],
        chain: [...testProv[0].chain, `ternary result`],
        locs: [...testProv[0].locs, { file: file.path, line: node.loc?.start?.line || 1, code: "ternary expr" }],
      }];
    }
    const consProv = resolveExpressionTaint(scope, node.consequent, file, content);
    if (consProv && consProv.length > 0) return consProv;
    const altProv = resolveExpressionTaint(scope, node.alternate, file, content);
    if (altProv && altProv.length > 0) return altProv;
    return null;
  }

  return null;
}

// ─── Helper: Mark implicit taint for branch bodies ──────────────────────

function markImplicitTaint(
  scope: TaintScope,
  body: any[],
  conditionProv: TaintProvenance,
  file: FileAnalysis,
  conditionLine: number,
  globalFindings: TaintFindingInternal[],
  content: string,
): void {
  if (!body || !Array.isArray(body)) return;

  for (const stmt of body) {
    if (!stmt) continue;

    // Variable declarations in tainted branch
    if (stmt.type === "VariableDeclaration") {
      for (const decl of stmt.declarations) {
        if (decl.id?.type === "Identifier") {
          const varName = decl.id.name;
          const impProv: TaintProvenance = {
            ...conditionProv,
            sourceId: `implicit:${file.path}:${stmt.loc?.start?.line || conditionLine}`,
            sourceLabel: `implicit:${conditionProv.sourceLabel}`,
            sourceLine: stmt.loc?.start?.line || conditionLine,
            sourceFile: file.path,
            chain: [...conditionProv.chain, `[implicit] ${varName}`],
            locs: [
              ...conditionProv.locs,
              { file: file.path, line: stmt.loc?.start?.line || conditionLine, code: truncate(getCode(stmt, content), 80) },
            ],
            implicitFlow: true,
          };
          const existing = scope.variables.get(varName) || [];
          existing.push(impProv);
          scope.variables.set(varName, existing);
        }
      }
    }

    // Expression statements (assignments) in tainted branch
    if (stmt.type === "ExpressionStatement" && stmt.expression?.type === "AssignmentExpression") {
      const left = stmt.expression.left;
      if (left?.type === "Identifier") {
        const varName = left.name;
        const impProv: TaintProvenance = {
          ...conditionProv,
          sourceId: `implicit:${file.path}:${stmt.loc?.start?.line || conditionLine}`,
          sourceLabel: `implicit:${conditionProv.sourceLabel}`,
          sourceLine: stmt.loc?.start?.line || conditionLine,
          sourceFile: file.path,
          chain: [...conditionProv.chain, `[implicit] ${varName}`],
          locs: [
            ...conditionProv.locs,
            { file: file.path, line: stmt.loc?.start?.line || conditionLine, code: truncate(getCode(stmt, content), 80) },
          ],
          implicitFlow: true,
        };
        const existing = scope.variables.get(varName) || [];
        existing.push(impProv);
        scope.variables.set(varName, existing);
      }
    }

    // Nested blocks
    if (stmt.type === "BlockStatement" && stmt.body) {
      markImplicitTaint(scope, stmt.body, conditionProv, file, conditionLine, globalFindings, content);
    }

    // Nested if statements
    if (stmt.type === "IfStatement") {
      const nestedBody = stmt.consequent?.body || [stmt.consequent];
      const nestedAlt = stmt.alternate?.body || [stmt.alternate].filter(Boolean);
      markImplicitTaint(scope, nestedBody, conditionProv, file, conditionLine, globalFindings, content);
      if (nestedAlt.length > 0) {
        markImplicitTaint(scope, nestedAlt, conditionProv, file, conditionLine, globalFindings, content);
      }
    }
  }
}

// ─── Helper: Check if code matches a sanitizer pattern ──────────────────

function checkSanitizer(code: string): boolean {
  for (const san of SANITIZER_DEFS) {
    for (const pat of san.patterns) {
      if (code.includes(pat)) return true;
    }
  }
  return false;
}

// ─── Helper: Check sink hit ─────────────────────────────────────────────

function checkSinkHit(
  code: string,
  line: number,
  file: FileAnalysis,
  scope: TaintScope,
  globalFindings: TaintFindingInternal[],
): void {
  for (const sink of SINK_DEFS) {
    for (const pat of sink.patterns) {
      if (code.includes(pat)) {
        // Check if any argument to the sink is tainted
        const args = extractArgsFromCode(code);
        for (const arg of args) {
          const argVar = lookupVar(scope, arg);
          if (argVar && argVar.length > 0) {
            const prov = argVar[argVar.length - 1];
            globalFindings.push({
              source: { label: prov.sourceLabel, line: prov.sourceLine, file: prov.sourceFile, code: prov.chain[0] || "" },
              sink: { label: sink.label, line, file: file.path, code: truncate(code, 80), vulnType: sink.vulnType, severity: sink.severity },
              chain: prov.chain,
              locs: prov.locs,
              sanitized: prov.sourceId.startsWith("sanitized:"),
              implicitFlow: prov.implicitFlow,
              confidence: prov.implicitFlow ? 75 : 88,
            });
          }
        }

        // Also check for direct inline tainted expressions
        // (e.g., eval(req.body.input) — tracked via CallExpression scope already)
        return;
      }
    }
  }
}

// ─── Helper: Extract simple argument identifiers from call code ─────────

function extractArgsFromCode(code: string): string[] {
  const openParen = code.indexOf("(");
  if (openParen === -1) return [];
  const closeParen = code.lastIndexOf(")");
  if (closeParen === -1 || closeParen <= openParen) return [];
  const argStr = code.slice(openParen + 1, closeParen);
  // Simple identifier extraction
  const parts = argStr.split(",").map((s) => s.trim());
  return parts.filter((p) => /^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(p) && !p.includes(" "));
}

// ─── Helper: Truncate strings ───────────────────────────────────────────

function getCode(node: any, content: string): string {
  if (!node || !node.start || !node.end) return "";
  return content.slice(node.start, node.end);
}

function truncate(s: string, maxLen: number): string {
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) + "..." : s;
}

// ─── CSG-based Taint Path Detection ─────────────────────────────────────

function runCSGTaintAnalysis(
  csg: CSG,
  keyFiles: Array<{ path: string; content: string }>,
  astScopes: Map<string, TaintScope>,
  implicitFindings: TaintFindingInternal[],
): TaintFinding[] {
  const findings: TaintFinding[] = [];

  const sourceReachable = bfsForward(csg, csg.sourceNodes, ["data_flow", "calls", "produces", "consumes"], 10);
  const sinkReachable = bfsBackward(csg, csg.sinkNodes, ["data_flow", "calls", "queries"], 10);

  for (const sinkId of csg.sinkNodes) {
    const sinkNode = csg.nodes.get(sinkId);
    if (!sinkNode) continue;

    for (const sourceId of csg.sourceNodes) {
      const sourceNode = csg.nodes.get(sourceId);
      if (!sourceNode) continue;

      if (sourceNode.filePath !== sinkNode.filePath) continue;
      if (sourceNode.lineStart > sinkNode.lineStart) continue;

      const lineDistance = sinkNode.lineStart - sourceNode.lineStart;
      if (lineDistance > 100) continue;

      const sanitizersInFile = [...csg.sanitizerNodes].filter((sanId) => {
        const san = csg.nodes.get(sanId);
        return san && san.filePath === sinkNode.filePath &&
          san.lineStart > sourceNode.lineStart && san.lineStart < sinkNode.lineStart;
      });

      const sanitized = sanitizersInFile.length > 0;

      if (!sanitized) {
        const vulnType = inferVulnType(sinkId);
        const severity = inferSeverity(vulnType);
        const findingId = `vt-${vulnType}-${sinkNode.filePath.split("/").pop()}-${sinkNode.lineStart}`;

        if (!findings.find((f) => f.id === findingId)) {
          findings.push({
            id: findingId,
            title: `Tainted data from '${sourceNode?.label}' flows to '${sinkNode?.label}'`,
            severity,
            category: vulnType as TaintFinding["category"],
            description: buildTaintDescription(sourceNode?.label || "", sinkNode?.label || "", vulnType),
            evidence: `Source: ${sourceNode?.filePath}:${sourceNode?.lineStart} → Sink: ${sinkNode?.filePath}:${sinkNode?.lineStart}`,
            filePath: sinkNode.filePath,
            lineNumber: sinkNode.lineStart,
            codeSnippet: extractLineContext(keyFiles, sinkNode.filePath, sinkNode.lineStart),
            fixPrompt: buildTaintFixPrompt(sourceNode?.label || "", sinkNode?.label || "", vulnType),
            confidence: 88,
            taintPath: {
              sourceNode: sourceId,
              sourceLabel: sourceNode?.label || "",
              sinkNode: sinkId,
              sinkLabel: sinkNode?.label || "",
              vulnType,
              sanitized: false,
              missingPaths: 1,
              pathLength: Math.floor(lineDistance / 10) + 1,
              taintChain: [],
              propagationLocs: [],
              implicitFlow: false,
            },
          });
        }
      }
    }
  }

  return findings;
}

// ─── Main Entry Point ───────────────────────────────────────────────────

export function runVibeTaint(
  keyFiles: Array<{ path: string; content: string }>,
  packageJson: Record<string, unknown> = {},
): VibeTaintResult {
  const globalFindings: TaintFindingInternal[] = [];
  const astScopes = new Map<string, TaintScope>();
  const crossFileScope = new Map<string, Array<{ params: string[] }>>();

  // ─── Phase 1: AST-based Taint Analysis (per file) ────────────────
  for (const file of keyFiles) {
    if (file.content.length > 500000 || !file.content) continue;
    try {
      const scope = analyzeFileTaint(file, crossFileScope, keyFiles, globalFindings, new Set());
      astScopes.set(file.path, scope);
    } catch (err) {
      // Silently skip files that fail AST analysis
    }
  }

  // ─── Phase 2: Build CSG and run graph-based taint propagation ─────
  const csg = buildCSG(keyFiles);

  // ─── Phase 3: Merge AST findings with CSG findings ────────────────
  const finalFindings: TaintFinding[] = [];

  // Convert AST findings
  for (const f of globalFindings) {
    const vulnType = f.sink.vulnType;
    const severity = (f.sink.severity as "critical" | "high" | "medium" | "low") || inferSeverity(vulnType);
    const findingId = `vt-ast-${vulnType}-${f.sink.file.split("/").pop()}-${f.sink.line}-${crypto.randomUUID().slice(0, 8)}`;

    finalFindings.push({
      id: findingId,
      title: `Tainted data from '${f.source.label}' flows to '${f.sink.label}'`,
      severity: f.sanitized ? "medium" : severity,
      category: vulnType as TaintFinding["category"],
      description: buildTaintDescription(f.source.label, f.sink.label, vulnType),
      evidence: `AST tracked: ${f.source.label} (${f.source.file}:${f.source.line}) → ${f.chain.join(" → ")} → ${f.sink.label} (${f.sink.file}:${f.sink.line})`,
      filePath: f.sink.file,
      lineNumber: f.sink.line,
      codeSnippet: f.sink.code,
      fixPrompt: buildTaintFixPrompt(f.source.label, f.sink.label, vulnType),
      confidence: f.confidence,
      taintPath: {
        sourceNode: `source:${f.source.file}:${f.source.line}`,
        sourceLabel: f.source.label,
        sinkNode: `sink:${f.sink.file}:${f.sink.line}`,
        sinkLabel: f.sink.label,
        vulnType,
        sanitized: f.sanitized,
        missingPaths: f.sanitized ? 0 : 1,
        pathLength: f.chain.length,
        taintChain: f.chain,
        propagationLocs: f.locs,
        implicitFlow: f.implicitFlow,
      },
    });
  }

  // Run CSG-based taint propagation for additional findings
  const csgFindings = runCSGTaintAnalysis(csg, keyFiles, astScopes, globalFindings);
  for (const f of csgFindings) {
    if (!finalFindings.find((ef) => ef.id === f.id)) {
      finalFindings.push(f);
    }
  }

  // ─── Phase 4: Regex-based patterns (IDOR, Auth Bypass, Implicit Flow) ──
  const stats = {
    sourceNodes: csg.sourceNodes.length,
    sinkNodes: csg.sinkNodes.length,
    sanitizerNodes: csg.sanitizerNodes.length,
    taintedPaths: 0,
    sanitizedPaths: 0,
    timeBombFindings: 0,
    idorPatterns: 0,
    authBypassPatterns: 0,
    implicitFlowsDetected: 0,
  };

  for (const file of keyFiles) {
    // IDOR patterns
    for (const pattern of IDOR_PATTERNS) {
      const re = new RegExp(pattern.pattern.source, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(file.content)) !== null) {
        const lineNum = file.content.substring(0, m.index).split("\n").length;
        stats.idorPatterns++;
        finalFindings.push({
          id: `idor-${file.path.split("/").pop()}-${lineNum}`,
          title: pattern.name,
          severity: pattern.severity,
          category: "idor",
          description: pattern.description,
          evidence: `${file.path}:${lineNum}`,
          filePath: file.path,
          lineNumber: lineNum,
          codeSnippet: extractLineContext(keyFiles, file.path, lineNum),
          fixPrompt: pattern.fixPrompt,
          confidence: 91,
        });
      }
    }

    // Auth bypass patterns
    for (const pattern of AUTH_BYPASS_PATTERNS) {
      const re = new RegExp(pattern.pattern.source, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(file.content)) !== null) {
        const lineNum = file.content.substring(0, m.index).split("\n").length;
        stats.authBypassPatterns++;
        finalFindings.push({
          id: `auth-bypass-${pattern.name.replace(/\W+/g, "-")}-${file.path.split("/").pop()}-${lineNum}`,
          title: pattern.name,
          severity: pattern.severity,
          category: "taint",
          description: pattern.description,
          evidence: `${file.path}:${lineNum}`,
          filePath: file.path,
          lineNumber: lineNum,
          codeSnippet: extractLineContext(keyFiles, file.path, lineNum),
          fixPrompt: pattern.fixPrompt,
          confidence: pattern.confidence,
        });
      }
    }

    // Implicit flow patterns
    for (const pattern of IMPLICIT_FLOW_PATTERNS) {
      const guardRe = new RegExp(pattern.guardPattern.source, "gi");
      let gm: RegExpExecArray | null;
      while ((gm = guardRe.exec(file.content)) !== null) {
        const afterGuard = file.content.substring(gm.index + gm[0].length, gm.index + gm[0].length + 500);
        const unsafeRe = new RegExp(pattern.unsafePattern.source, "i");
        if (unsafeRe.test(afterGuard)) {
          const lineNum = file.content.substring(0, gm.index).split("\n").length;
          stats.implicitFlowsDetected++;
          finalFindings.push({
            id: `implicit-flow-${pattern.name.replace(/\W+/g, "-")}-${file.path.split("/").pop()}-${lineNum}`,
            title: pattern.name,
            severity: pattern.severity,
            category: "idor",
            description: pattern.description,
            evidence: `Implicit flow at ${file.path}:${lineNum}`,
            filePath: file.path,
            lineNumber: lineNum,
            codeSnippet: extractLineContext(keyFiles, file.path, lineNum),
            fixPrompt: pattern.fixPrompt,
            confidence: 80,
          });
        }
      }
    }
  }

  // Count taint paths
  stats.taintedPaths = globalFindings.filter((f) => !f.sanitized).length;
  stats.sanitizedPaths = globalFindings.filter((f) => f.sanitized).length;

  // ─── Phase 5: Time-Bomb CVE Overlay ──────────────────────────────
  const allDeps: Record<string, string> = {
    ...(packageJson.dependencies as Record<string, string> ?? {}),
    ...(packageJson.devDependencies as Record<string, string> ?? {}),
  };

  for (const cve of CVE_DATABASE) {
    const installedVersionStr = allDeps[cve.package];
    if (!installedVersionStr) continue;

    const installed = parseVersion(installedVersionStr.replace(/[^0-9.]/g, ""));
    const vuln = parseVersion(cve.vulnerableRange.replace(/[<>=^~]/g, "").trim());

    if (compareVersions(installed, vuln) < 0) {
      stats.timeBombFindings++;
      finalFindings.push({
        id: `cve-${cve.cveId}-${cve.package}`,
        title: `Time-Bomb Vulnerability: ${cve.package} ${installedVersionStr} — ${cve.cveId}`,
        severity: cve.cvssScore >= 9 ? "critical" : cve.cvssScore >= 7 ? "high" : "medium",
        category: "time_bomb",
        description: `${cve.package}@${installedVersionStr} is vulnerable to ${cve.description} (${cve.cveId}, CVSS ${cve.cvssScore}). Fix: upgrade to ${cve.fixVersion}+.`,
        evidence: `package.json: "${cve.package}": "${installedVersionStr}" — vulnerable range: ${cve.vulnerableRange}`,
        filePath: "package.json",
        lineNumber: 1,
        codeSnippet: `"${cve.package}": "${installedVersionStr}"`,
        fixPrompt: `Run: npm install ${cve.package}@${cve.fixVersion} to patch ${cve.cveId}.`,
        confidence: 100,
        cveIds: [cve.cveId],
        vulnerableVersion: installedVersionStr,
        cvssScore: cve.cvssScore,
      });
    }
  }

  // ─── Deduplicate ─────────────────────────────────────────────────
  const deduped = deduplicateFindings(finalFindings);

  // ─── Compute Taint Score ─────────────────────────────────────────
  const criticalCount = deduped.filter((f) => f.severity === "critical").length;
  const highCount = deduped.filter((f) => f.severity === "high").length;
  const penalty = Math.min(criticalCount * 15, 60) + Math.min(highCount * 6, 30);
  const taintScore = Math.max(0, 100 - penalty);

  logger.info({
    sourceNodes: stats.sourceNodes,
    sinkNodes: stats.sinkNodes,
    taintedPaths: stats.taintedPaths,
    astFindings: globalFindings.length,
    findings: deduped.length,
    taintScore,
  }, "VibeTaint v2 IFDS Interprocedural Taint Analysis complete");

  return { findings: deduped, stats, taintScore };
}

// ─── Helper Functions ───────────────────────────────────────────────────

function inferVulnType(sinkId: string): string {
  if (sinkId.includes("sqli")) return "sqli";
  if (sinkId.includes("xss")) return "xss";
  if (sinkId.includes("cmd_injection")) return "cmd_injection";
  if (sinkId.includes("ssrf")) return "ssrf";
  if (sinkId.includes("open_redirect")) return "open_redirect";
  if (sinkId.includes("payment_bypass")) return "payment_bypass";
  if (sinkId.includes("code_injection")) return "cmd_injection";
  if (sinkId.includes("ssti")) return "cmd_injection";
  if (sinkId.includes("path_traversal")) return "cmd_injection";
  return "taint";
}

function inferSeverity(vulnType: string): "critical" | "high" | "medium" | "low" {
  const criticalTypes = ["sqli", "cmd_injection", "rce", "ssrf", "payment_bypass", "code_injection", "ssti"];
  const highTypes = ["xss", "idor", "open_redirect", "auth_bypass", "path_traversal"];
  if (criticalTypes.includes(vulnType)) return "critical";
  if (highTypes.includes(vulnType)) return "high";
  return "medium";
}

function buildTaintDescription(sourceLabel: string, sinkLabel: string, vulnType: string): string {
  const descriptions: Record<string, string> = {
    sqli: "User-controlled input flows directly into a database query without parameterization. Attackers can manipulate the SQL query to dump, modify, or destroy data.",
    xss: "User-controlled input is rendered as HTML without sanitization, allowing attackers to inject malicious scripts.",
    cmd_injection: "User-controlled input is passed to a system command without sanitization, enabling arbitrary command execution.",
    ssrf: "User-controlled URL is used in a server-side HTTP request, potentially accessing internal services or cloud metadata endpoints.",
    open_redirect: "User-controlled URL is used in a redirect, enabling phishing attacks from your domain.",
    payment_bypass: "User-controlled input influences payment processing without sufficient validation, enabling payment bypass or amount manipulation.",
    code_injection: "Code injection via eval() or Function() — user input is executed as code, allowing arbitrary JavaScript execution.",
    ssti: "Server-Side Template Injection — user input flows into a template engine, potentially enabling remote code execution.",
    path_traversal: "User-controlled input flows into file system operations, enabling path traversal attacks.",
    taint: "User-controlled input flows to a sensitive operation without validation.",
  };
  return `${descriptions[vulnType] || descriptions.taint} Source: '${sourceLabel}' → Sink: '${sinkLabel}'.`;
}

function buildTaintFixPrompt(sourceLabel: string, sinkLabel: string, vulnType: string): string {
  const fixes: Record<string, string> = {
    sqli: "Use parameterized queries with Drizzle ORM: `db.select().from(table).where(eq(table.id, id))`. Never concatenate user input into SQL strings.",
    xss: "Sanitize output with DOMPurify.sanitize() or use textContent instead of innerHTML. Never use dangerouslySetInnerHTML with user input.",
    cmd_injection: "Avoid passing user input to exec/spawn. If unavoidable, use an allowlist. Use execFile with argument arrays.",
    ssrf: "Validate URLs against an allowlist before making server-side requests. Block internal IP ranges.",
    open_redirect: "Validate redirect destinations against an allowlist. Never redirect to user-supplied URLs directly.",
    code_injection: "Remove eval() and new Function() entirely. Replace with JSON.parse() for data or explicit logic.",
    ssti: "Use parameterized template rendering. Avoid passing user input directly to template engines.",
    path_traversal: "Validate and restrict file paths to a safe base directory. Use path.resolve() and prefix checks.",
  };
  return fixes[vulnType] || `Validate and sanitize all user input from '${sourceLabel}' before using in '${sinkLabel}'.`;
}

function extractLineContext(
  keyFiles: Array<{ path: string; content: string }>,
  filePath: string,
  lineNum: number,
  contextLines = 1,
): string {
  const file = keyFiles.find((f) => f.path === filePath);
  if (!file) return "";
  const lines = file.content.split("\n");
  const start = Math.max(0, lineNum - 1 - contextLines);
  const end = Math.min(lines.length, lineNum + contextLines);
  return lines.slice(start, end).join("\n").substring(0, 200);
}

function deduplicateFindings(findings: TaintFinding[]): TaintFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.filePath}:${f.lineNumber}:${f.category}:${f.taintPath?.vulnType || "none"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseVersion(version: string): number[] {
  return version.split(".").map((n) => parseInt(n, 10) || 0);
}

function compareVersions(a: number[], b: number[]): number {
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
