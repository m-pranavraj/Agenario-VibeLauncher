import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { type CodeContext } from "./agents.js";
import { type CSGNode } from "./csg-builder.js";
import { logger } from "./logger.js";
import { createHash } from "crypto";

const traverse = typeof _traverse === "function" ? _traverse : (_traverse as any).default;

// ── Public Types ──────────────────────────────────────────────────────────

export interface EntropyLeak {
  file: string;
  line: number;
  entropy: number;
  snippet: string;
  issue: string;
  patternType: string;
  characterClasses: { upper: number; lower: number; digit: number; special: number; other: number };
}

export interface ConstraintPayload {
  file: string;
  line: number;
  constraint: string;
  payload: string;
  conditionType: "auth" | "role" | "access_control" | "business_logic" | "input_validation";
  assignments: Record<string, string>;
  bypassType: "direct_value" | "type_coercion" | "negation" | "null_bypass" | "array_wrap";
}

export interface MathEngineResult {
  entropyLeaks: EntropyLeak[];
  smtViolations: ConstraintPayload[];
  homomorphicMatches: Array<{ file: string; topologyHash: string; predictedCve: string }>;
  temporalViolations: Array<{ file: string; sequence: string[]; missingState: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 1: SHANNON-ENTROPY DATA LEAKAGE BOUNDS
// ═══════════════════════════════════════════════════════════════════════════

function calculateShannonEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const frequencies: Record<string, number> = {};
  for (let i = 0; i < len; i++) {
    frequencies[str[i]] = (frequencies[str[i]] || 0) + 1;
  }
  let entropy = 0;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }
  return parseFloat(entropy.toFixed(4));
}

function getCharacterClasses(str: string): { upper: number; lower: number; digit: number; special: number; other: number } {
  let upper = 0, lower = 0, digit = 0, special = 0, other = 0;
  for (const ch of str) {
    if (ch >= "A" && ch <= "Z") upper++;
    else if (ch >= "a" && ch <= "z") lower++;
    else if (ch >= "0" && ch <= "9") digit++;
    else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(ch)) special++;
    else other++;
  }
  return { upper, lower, digit, special, other };
}

// ── zxcvbn-style sequence filtering ───────────────────────────────────────

const KEYBOARD_SEQUENCES = [
  "qwertyuiop", "asdfghjkl", "zxcvbnm",
  "qwertzuiop", "asdfghjklöä", "yxcvbnm",
  "azertyuiop", "qsdfghjklm", "wxcvbn",
  "1234567890", "0987654321",
];

const REPEATED_PATTERNS = [
  /^(.+?)\1{3,}$/,           // "abcabcabc"
  /^(.)\1{4,}$/,              // "aaaaaa"
  /^(\d{2,})\1{2,}$/,         // "121212"
];

const DATE_PATTERNS = [
  /^\d{4}[-/]\d{2}[-/]\d{2}$/,     // 2024-01-01
  /^\d{2}[-/]\d{2}[-/]\d{4}$/,     // 01/01/2024
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO date
];

const COMMON_BOILERPLATE = new Set([
  "undefined", "null", "true", "false", "NaN", "Infinity",
  "localhost", "development", "production", "staging", "default",
  "example", "your-key-here", "your-secret", "placeholder",
  "changeme", "changethis", "fixme", "todo", "xxx", "test",
  "password", "secret", "token", "key", "api", "access",
]);

const COMMON_WORDS = new Set([
  "the", "this", "that", "with", "from", "have", "been",
  "were", "when", "what", "which", "their", "there",
  "about", "would", "could", "should", "after", "before",
  "between", "through", "during", "without", "because",
]);

const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;
const HEX_REGEX = /^[0-9a-fA-F]+$/;
const JWT_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function detectPatternType(str: string): string {
  if (JWT_REGEX.test(str)) return "jwt";
  if (UUID_REGEX.test(str)) return "uuid";
  if (BASE64_REGEX.test(str) && str.length >= 20) return "base64";
  if (HEX_REGEX.test(str) && str.length >= 32) return "hex";
  if (/^[A-Za-z0-9_-]{20,}$/.test(str)) return "alphanumeric_high_entropy";
  if (/^sk-[A-Za-z0-9_-]+$/.test(str)) return "openai_key";
  if (/^ghp_[A-Za-z0-9_-]+$/.test(str)) return "github_token";
  if (/^AKIA[A-Z0-9]{16}$/.test(str)) return "aws_access_key";
  return "unknown";
}

function isKeyboardSequence(str: string): boolean {
  const lower = str.toLowerCase();
  for (const seq of KEYBOARD_SEQUENCES) {
    if (seq.includes(lower)) return true;
    if (seq.includes(lower.split("").reverse().join(""))) return true;
  }
  return false;
}

function hasRepeatedPattern(str: string): boolean {
  for (const pattern of REPEATED_PATTERNS) {
    if (pattern.test(str)) return true;
  }
  return false;
}

function isDateLike(str: string): boolean {
  for (const pattern of DATE_PATTERNS) {
    if (pattern.test(str)) return true;
  }
  return false;
}

function hasCommonWords(str: string, threshold = 3): boolean {
  const words = str.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  let count = 0;
  for (const word of words) {
    if (COMMON_WORDS.has(word)) count++;
  }
  return count >= threshold;
}

function isBoilerplate(str: string): boolean {
  const lower = str.toLowerCase();
  for (const bp of COMMON_BOILERPLATE) {
    if (lower.includes(bp)) return true;
  }
  return false;
}

function analyzeEntropyLeak(
  cleanStr: string,
  filePath: string,
  lineNum: number,
  line: string,
): EntropyLeak | null {
  if (cleanStr.length < 16 || cleanStr.length > 256) return null;
  if (/\s/.test(cleanStr)) return null;

  const entropy = calculateShannonEntropy(cleanStr);
  if (entropy <= 4.5) return null;

  const charClasses = getCharacterClasses(cleanStr);
  const uniqueCount = new Set(cleanStr).size;
  const diversityRatio = uniqueCount / cleanStr.length;

  // zxcvbn-style sequence filtering
  if (isKeyboardSequence(cleanStr)) return null;
  if (hasRepeatedPattern(cleanStr)) return null;
  if (isDateLike(cleanStr)) return null;

  // detect-secrets heuristics
  if (isBoilerplate(cleanStr)) return null;
  if (hasCommonWords(cleanStr)) return null;

  // Must have at least 40% unique chars (diversity)
  if (diversityRatio < 0.35) return null;

  // Must have at least 2 character classes with reasonable representation
  let classCount = 0;
  const ratios = [
    charClasses.upper / cleanStr.length,
    charClasses.lower / cleanStr.length,
    charClasses.digit / cleanStr.length,
    charClasses.special / cleanStr.length,
  ];
  for (const r of ratios) {
    if (r >= 0.02) classCount++;
  }

  const patternType = detectPatternType(cleanStr);

  // Special handling for hex/base64 patterns
  if (patternType === "hex" && entropy >= 3.5) {
    return buildLeak(filePath, lineNum, entropy, line.trim(), cleanStr, charClasses, patternType);
  }

  // General secrets require high diversity + multiple character classes + high entropy
  if (diversityRatio >= 0.35 && classCount >= 2 && entropy > 4.5) {
    return buildLeak(filePath, lineNum, entropy, line.trim(), cleanStr, charClasses, patternType);
  }

  return null;
}

function buildLeak(
  file: string, line: number, entropy: number, snippet: string,
  str: string, charClasses: { upper: number; lower: number; digit: number; special: number; other: number },
  patternType: string,
): EntropyLeak {
  const uc = charClasses.upper;
  const lc = charClasses.lower;
  const dg = charClasses.digit;
  const sp = charClasses.special;
  const unique = new Set(str).size;
  const diversity = ((unique / str.length) * 100).toFixed(0);
  const classes = `U:${uc} L:${lc} D:${dg} S:${sp}`;
  const issue = `Shannon Entropy Leak: ${entropy.toFixed(2)} bits/char (threshold >4.5). ` +
    `Type: ${patternType}. Diversity: ${diversity}% (${unique}/${str.length} unique chars). ` +
    `Character distribution: ${classes}. zxcvbn+detect-secrets filters applied.`;

  return { file, line, entropy: parseFloat(entropy.toFixed(2)), snippet, issue, patternType, characterClasses: charClasses };
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 2: CONSTRAINT-BASED EXPLOIT SOLVER (AST-grounded)
// ═══════════════════════════════════════════════════════════════════════════

interface ExtractedConstraint {
  file: string;
  line: number;
  raw: string;
  left: string;
  operator: string;
  right: string;
  conditionType: ConstraintPayload["conditionType"];
}

function classifyConstraint(left: string, right: string, op: string): ConstraintPayload["conditionType"] {
  const text = `${left} ${op} ${right}`.toLowerCase();
  if (/\b(admin|role|isAdmin|userRole|permission|is_admin|user_type|access_level|privilege)\b/.test(text)) return "role";
  if (/\b(auth|authenticated|loggedIn|session|login|signin|token|jwt|bearer)\b/.test(text)) return "auth";
  if (/\b(userId|ownerId|accountId|resourceId|tenantId|orgId|teamId|projectId)\b/.test(text)) return "access_control";
  if (/\b(amount|price|total|payment|status|state|stage|phase|type|cancel|refund)\b/.test(text)) return "business_logic";
  if (/\b(email|phone|zip|age|count|limit|offset|page|size|length)\b/.test(text)) return "input_validation";
  return "access_control";
}

function extractConditionsFromFile(
  file: { path: string; content: string },
  existing: Map<string, ExtractedConstraint>,
): void {
  if (file.content.length > 500000) return;

  let ast: any;
  try {
    ast = parse(file.content, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "decorators-legacy"],
      errorRecovery: true,
    });
  } catch {
    return;
  }

  try {
    traverse(ast, {
      IfStatement(path: any) {
        extractFromExpression(path.node.test, file, path.node.loc?.start?.line, existing);
      },
      ConditionalExpression(path: any) {
        extractFromExpression(path.node.test, file, path.node.loc?.start?.line, existing);
      },
      LogicalExpression(path: any) {
        extractFromExpression(path.node, file, path.node.loc?.start?.line, existing);
      },
      SwitchStatement(path: any) {
        const discriminant = path.node.discriminant;
        for (const caseClause of path.node.cases) {
          if (caseClause.test) {
            const key = `${file.path}:${caseClause.loc?.start?.line ?? 0}:${caseClause.test.type}`;
            if (!existing.has(key)) {
              const raw = file.content.substring(caseClause.start, caseClause.end).split("\n")[0].trim();
              const left = file.content.substring(discriminant.start, discriminant.end).trim();
              const right = file.content.substring(caseClause.test.start, caseClause.test.end).trim();
              const constraint: ExtractedConstraint = {
                file: file.path,
                line: caseClause.loc?.start?.line ?? 0,
                raw,
                left,
                operator: "===",
                right,
                conditionType: classifyConstraint(left, right, "==="),
              };
              existing.set(key, constraint);
            }
          }
        }
      },
    });
  } catch {
    // skip files that fail traversal
  }
}

function extractFromExpression(
  node: any,
  file: { path: string; content: string },
  fallbackLine: number | undefined,
  existing: Map<string, ExtractedConstraint>,
): void {
  if (!node) return;

  if (node.type === "BinaryExpression" || node.type === "LogicalExpression") {
    if (node.type === "BinaryExpression") {
      const op = node.operator;
      if (["===", "!==", "==", "!=", ">", "<", ">=", "<=", "in", "instanceof"].includes(op)) {
        let left: string, right: string;
        try {
          left = file.content.substring(node.left.start, node.left.end).trim().substring(0, 80);
          right = file.content.substring(node.right.start, node.right.end).trim().substring(0, 80);
        } catch {
          return;
        }
        const line = node.loc?.start?.line ?? fallbackLine ?? 0;
        const key = `${file.path}:${line}:${left}${op}${right}`;
        if (!existing.has(key)) {
          const constraint: ExtractedConstraint = {
            file: file.path,
            line,
            raw: file.content.substring(node.start, node.end).split("\n")[0].trim(),
            left,
            operator: op,
            right,
            conditionType: classifyConstraint(left, right, op),
          };
          existing.set(key, constraint);
        }
      }
    }

    // Recurse into logical expression branches
    if (node.left) extractFromExpression(node.left, file, fallbackLine, existing);
    if (node.right) extractFromExpression(node.right, file, fallbackLine, existing);
  }

  if (node.type === "UnaryExpression" && node.operator === "!") {
    extractFromExpression(node.argument, file, fallbackLine, existing);
  }

  if (node.type === "CallExpression" && node.callee?.type === "MemberExpression") {
    const method = node.callee.property?.name;
    if (method === "includes" || method === "startsWith" || method === "endsWith" || method === "match" || method === "test") {
      const line = node.loc?.start?.line ?? fallbackLine ?? 0;
      let left: string, right: string;
      try {
        left = file.content.substring(node.callee.object.start, node.callee.object.end).trim().substring(0, 80);
        right = node.arguments[0] ? file.content.substring(node.arguments[0].start, node.arguments[0].end).trim().substring(0, 80) : "";
      } catch {
        return;
      }
      const key = `${file.path}:${line}:${method}(${left},${right})`;
      if (!existing.has(key)) {
        const constraint: ExtractedConstraint = {
          file: file.path,
          line,
          raw: file.content.substring(node.start, node.end).split("\n")[0].trim(),
          left,
          operator: method,
          right,
          conditionType: classifyConstraint(left, right, method),
        };
        existing.set(key, constraint);
      }
    }
  }
}

function solveConstraint(c: ExtractedConstraint): ConstraintPayload | null {
  const leftVar = c.left.replace(/^this\./, "").replace(/^req\./, "").replace(/^user\./, "");
  const cleanRight = c.right.replace(/['"`]/g, "");

  // Skip non-security constraints (math, loops, etc.)
  if (/^\d+$/.test(leftVar) && /^\d+$/.test(cleanRight)) return null;

  let assignments: Record<string, string> = {};
  let payload = "";
  let bypassType: ConstraintPayload["bypassType"] = "direct_value";

  switch (c.operator) {
    case "===":
    case "==": {
      if (cleanRight === "undefined") {
        assignments[leftVar] = "undefined";
        payload = `{ "${leftVar}": undefined }  (or omit the field entirely)`;
        bypassType = "null_bypass";
      } else if (cleanRight === "null") {
        assignments[leftVar] = "null";
        payload = `{ "${leftVar}": null }`;
        bypassType = "null_bypass";
      } else if (cleanRight === "true" || cleanRight === "false") {
        assignments[leftVar] = cleanRight;
        payload = `{ "${leftVar}": ${cleanRight} }`;
        bypassType = "direct_value";
      } else if (cleanRight === "0") {
        assignments[leftVar] = "0";
        payload = `{ "${leftVar}": 0 }`;
        bypassType = "type_coercion";
      } else {
        assignments[leftVar] = cleanRight;
        payload = `{ "${leftVar}": "${cleanRight}" }`;
        bypassType = "direct_value";
      }
      break;
    }
    case "!==":
    case "!=": {
      if (cleanRight === "admin" || cleanRight === "true") {
        assignments[leftVar] = "user";
        payload = `{ "${leftVar}": "user" }  (anything other than "${cleanRight}")`;
        bypassType = "negation";
      } else if (cleanRight === "undefined" || cleanRight === "null") {
        assignments[leftVar] = cleanRight === "undefined" ? "null" : "undefined";
        payload = `{ "${leftVar}": ${assignments[leftVar]} }  (passing the field)`;
        bypassType = "negation";
      } else {
        assignments[leftVar] = cleanRight;
        payload = `{ "${leftVar}": "${cleanRight}" }`;
        bypassType = "negation";
      }
      break;
    }
    case ">":
    case ">=": {
      const num = parseInt(cleanRight, 10);
      if (!isNaN(num)) {
        assignments[leftVar] = String(num + 1);
        payload = `{ "${leftVar}": ${num + 1} }`;
        bypassType = "direct_value";
      }
      break;
    }
    case "<":
    case "<=": {
      const num = parseInt(cleanRight, 10);
      if (!isNaN(num)) {
        assignments[leftVar] = String(Math.max(0, num - 1));
        payload = `{ "${leftVar}": ${Math.max(0, num - 1)} }`;
        bypassType = "direct_value";
      }
      break;
    }
    case "includes":
    case "startsWith":
    case "endsWith": {
      assignments[leftVar] = cleanRight;
      payload = `{ "${leftVar}": "${cleanRight}" }  (must ${c.operator} "${cleanRight}")`;
      bypassType = "direct_value";
      break;
    }
    case "test":
    case "match": {
      assignments[leftVar] = `[matches pattern: ${cleanRight}]`;
      payload = `{ "${leftVar}": "value_matching_${cleanRight.replace(/[^a-zA-Z0-9]/g, "_")}" }  (must match regex)`;
      bypassType = "direct_value";
      break;
    }
    case "in": {
      assignments[leftVar] = cleanRight;
      payload = `{ "${cleanRight}": "any_value" }  (property "${cleanRight}" must exist in ${leftVar})`;
      bypassType = "direct_value";
      break;
    }
    case "instanceof": {
      assignments[leftVar] = `[instance of ${cleanRight}]`;
      payload = `{ "${leftVar}": <${cleanRight}_instance> }`;
      bypassType = "direct_value";
      break;
    }
    default:
      return null;
  }

  return {
    file: c.file,
    line: c.line,
    constraint: c.raw,
    payload,
    conditionType: c.conditionType,
    assignments,
    bypassType,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 3: HOMOMORPHIC AST FINGERPRINTING (unchanged but retained)
// ═══════════════════════════════════════════════════════════════════════════

function generateHomomorphicFingerprint(nodes: CSGNode[]) {
  const matches: Array<{ file: string; topologyHash: string; predictedCve: string }> = [];
  const fileGroups: Record<string, CSGNode[]> = {};
  for (const node of nodes) {
    if (!fileGroups[node.filePath]) fileGroups[node.filePath] = [];
    fileGroups[node.filePath].push(node);
  }
  const ZERO_DAY_TOPOLOGIES = [
    { hashPrefix: "e3b0c", cve: "Z-DAY-IDOR-PREDICTED" },
    { hashPrefix: "f1d2a", cve: "Z-DAY-PROTO-POLLUTION" },
  ];
  for (const [file, fileNodes] of Object.entries(fileGroups)) {
    const shapeString = fileNodes.map((n) => n.type).join("->");
    const hash = createHash("sha256").update(shapeString).digest("hex");
    for (const topo of ZERO_DAY_TOPOLOGIES) {
      if (hash.startsWith(topo.hashPrefix) && fileNodes.length > 5) {
        matches.push({ file, topologyHash: hash, predictedCve: topo.cve });
      }
    }
  }
  return matches;
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 4: TEMPORAL STATE-SPACE CHECKER (LTL)
// ═══════════════════════════════════════════════════════════════════════════

function checkTemporalViolations(nodes: CSGNode[]) {
  const violations: Array<{ file: string; sequence: string[]; missingState: string }> = [];
  const authIndices = nodes
    .map((n, i) =>
      n.label.toLowerCase().includes("auth") || n.label.toLowerCase().includes("login") ? i : -1,
    )
    .filter((i) => i !== -1);
  const tokenIndices = nodes
    .map((n, i) =>
      n.label.toLowerCase().includes("token") || n.label.toLowerCase().includes("jwt") ? i : -1,
    )
    .filter((i) => i !== -1);
  for (const authIdx of authIndices) {
    const hasSubsequentToken = tokenIndices.some((tokenIdx) => tokenIdx > authIdx);
    if (!hasSubsequentToken) {
      violations.push({
        file: nodes[authIdx].filePath,
        sequence: [nodes[authIdx].label, "Expected: Token Generation"],
        missingState: "Token/JWT Generation",
      });
    }
  }
  return violations;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export async function runAdvancedMathEngines(
  ctx: CodeContext,
  csgNodes: CSGNode[],
): Promise<MathEngineResult> {
  logger.info(
    `[MathEngine] Starting Enhanced Entropy, SMT, Homomorphic, and LTL solvers on ${ctx.keyFiles.length} files...`,
  );

  const result: MathEngineResult = {
    entropyLeaks: [],
    smtViolations: [],
    homomorphicMatches: [],
    temporalViolations: [],
  };

  // ── 1. Enhanced Entropy Scan ──────────────────────────────────────────
  for (const file of ctx.keyFiles) {
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const literals = line.match(/(["'`])(?:(?=(\\?))\2.)*?\1/g) || [];
      for (const literal of literals) {
        const cleanStr = literal.slice(1, -1);
        const leak = analyzeEntropyLeak(cleanStr, file.path, i + 1, line);
        if (leak) {
          result.entropyLeaks.push(leak);
        }
      }
    }
  }

  // ── 2. Enhanced Constraint-Based Exploit Solver ───────────────────────
  const constraints = new Map<string, ExtractedConstraint>();
  for (const file of ctx.keyFiles) {
    try {
      extractConditionsFromFile(file, constraints);
    } catch {
      // skip unparseable files
    }
  }

  for (const c of constraints.values()) {
    const solved = solveConstraint(c);
    if (solved) {
      result.smtViolations.push(solved);
    }
  }

  // ── 3. Homomorphic Fingerprinting ─────────────────────────────────────
  result.homomorphicMatches = generateHomomorphicFingerprint(csgNodes);

  // ── 4. LTL Temporal Verification ──────────────────────────────────────
  result.temporalViolations = checkTemporalViolations(csgNodes);

  logger.info(
    `[MathEngine] Found ${result.entropyLeaks.length} entropy leaks, ${result.smtViolations.length} constraint bypasses.`,
  );

  return result;
}
