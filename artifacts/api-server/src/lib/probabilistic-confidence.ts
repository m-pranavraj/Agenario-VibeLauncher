import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { logger } from "./logger.js";

const traverse = typeof _traverse === 'function' ? _traverse : (_traverse as any).default;

export interface AIContextMetrics {
  typedVariableDensity: number;
  astDepth: number;
  externalLibraryInterfaces: number;
  cyclomaticComplexity: number;
  functionCount: number;
  fileCount: number;
  avgFunctionLength: number;
  hasTypeScript: boolean;
  strictMode: boolean;
}

interface FileMetrics {
  content: string;
  typedVars: number;
  untypedVars: number;
  externalCalls: number;
  astDepth: number;
  cyclomaticComplexity: number;
  functionCount: number;
  functionLengths: number[];
  ast: any | null;
}

function parseFile(content: string): any {
  try {
    return parse(content, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "decorators-legacy"],
      errorRecovery: true,
    });
  } catch {
    return null;
  }
}

function analyzeFile(file: { path: string; content: string }): FileMetrics {
  const ast = parseFile(file.content);
  let typedVars = 0;
  let untypedVars = 0;
  let externalCalls = 0;
  let maxAstDepth = 0;
  let cyclomaticComplexity = 1;
  let functionCount = 0;
  const functionLengths: number[] = [];
  const isTs = file.path.endsWith(".ts") || file.path.endsWith(".tsx");

  const lines = file.content.split("\n");

  typedVars = (file.content.match(/(\w+)\s*:\s*(string|number|boolean|Date|Record|Array|Promise|Map|Set|Buffer|void|any|null|undefined)\b/g) || []).length;
  untypedVars = (file.content.match(/\b(const|let|var)\s+\w+(?:\s*=\s*[^;{])+/g) || []).length + 
    (file.content.match(/: any\b/g) || []).length * 2;

  externalCalls = (file.content.match(/\b(fetch|axios|stripe|prisma|openai|redis|db\.|process\.env)\s*\(/g) || []).length +
    (file.content.match(/\bimport\s+.*\bfrom\s+['"]/g) || []).length * 2;

  if (ast) {
    try {
      traverse(ast, {
        enter(path: any) {
          let depth = 1;
          let p = path.parentPath;
          while (p) { depth++; p = p.parentPath; }
          if (depth > maxAstDepth) maxAstDepth = depth;
        },

        FunctionDeclaration(path: any) {
          functionCount++;
          const body = path.node.body?.body || [];
          functionLengths.push(body.length);
          cyclomaticComplexity += countBranching(path.node);
        },
        ArrowFunctionExpression(path: any) {
          functionCount++;
          const body = path.node.body;
          if (body?.type === "BlockStatement") {
            functionLengths.push((body.body || []).length);
          } else {
            functionLengths.push(1);
          }
          cyclomaticComplexity += countBranching(path.node);
        },
        FunctionExpression(path: any) {
          functionCount++;
          const body = path.node.body?.body || [];
          functionLengths.push(body.length);
          cyclomaticComplexity += countBranching(path.node);
        },

        IfStatement() { cyclomaticComplexity++; },
        SwitchCase(path: any) {
          if (path.node.test !== null) cyclomaticComplexity++;
        },
        LogicalExpression() { cyclomaticComplexity++; },
        ConditionalExpression() { cyclomaticComplexity++; },
        ForStatement() { cyclomaticComplexity++; },
        WhileStatement() { cyclomaticComplexity++; },
        DoWhileStatement() { cyclomaticComplexity++; },
        ForInStatement() { cyclomaticComplexity++; },
        ForOfStatement() { cyclomaticComplexity++; },
        CatchClause() { cyclomaticComplexity++; },
      });
    } catch {}
  }

  return {
    content: file.content,
    typedVars,
    untypedVars,
    externalCalls,
    astDepth: maxAstDepth,
    cyclomaticComplexity,
    functionCount,
    functionLengths,
    ast,
  };
}

function countBranching(node: any): number {
  let count = 0;
  if (!node || !node.body) return 0;
  const innerBody = node.body.body || (node.body.type === "BlockStatement" ? node.body.body : []);
  for (const stmt of innerBody) {
    if (!stmt) continue;
    if (stmt.type === "IfStatement" || stmt.type === "SwitchCase" ||
        stmt.type === "ForStatement" || stmt.type === "WhileStatement" ||
        stmt.type === "DoWhileStatement" || stmt.type === "ForInStatement" ||
        stmt.type === "ForOfStatement" || stmt.type === "CatchClause" ||
        stmt.type === "ConditionalExpression") {
      count++;
    }
    if (stmt.expression?.type === "LogicalExpression") count++;
  }
  return count;
}

export function computeAbstractInterpretationConfidence(
  keyFiles: Array<{ path: string; content: string }>,
): AIContextMetrics & { confidence: number; metricContributions: Record<string, number> } {
  if (!keyFiles || keyFiles.length === 0) {
    return {
      typedVariableDensity: 0.5,
      astDepth: 1,
      externalLibraryInterfaces: 0,
      cyclomaticComplexity: 1,
      functionCount: 0,
      fileCount: 0,
      avgFunctionLength: 0,
      hasTypeScript: false,
      strictMode: false,
      confidence: 50,
      metricContributions: { base: 50 },
    };
  }

  const fileMetrics = keyFiles.map(analyzeFile);

  const totalTyped = fileMetrics.reduce((s, m) => s + m.typedVars, 0);
  const totalUntyped = fileMetrics.reduce((s, m) => s + m.untypedVars, 0);
  const totalExternal = fileMetrics.reduce((s, m) => s + m.externalCalls, 0);
  const maxAstDepth = Math.max(...fileMetrics.map(m => m.astDepth), 1);
  const avgCyclomatic = fileMetrics.reduce((s, m) => s + m.cyclomaticComplexity, 0) / Math.max(fileMetrics.length, 1);
  const totalFunctions = fileMetrics.reduce((s, m) => s + m.functionCount, 0);
  const allLengths = fileMetrics.flatMap(m => m.functionLengths);
  const avgFuncLength = allLengths.length > 0 ? allLengths.reduce((a, b) => a + b, 0) / allLengths.length : 0;
  const hasTypeScript = keyFiles.some(f => f.path.endsWith(".ts") || f.path.endsWith(".tsx"));
  const strictMode = keyFiles.some(f => f.content.includes('"strict": true') || f.content.includes('"strict":true'));

  const typedDensity = (totalTyped + totalUntyped) > 0
    ? totalTyped / (totalTyped + totalUntyped)
    : 0.5;

  let probability = 0.85;

  const densityContribution = typedDensity;
  probability *= (0.7 + 0.3 * densityContribution);

  const typedBoost = densityContribution;

  const astDepthFactor = Math.max(0.5, 1 - (maxAstDepth - 1) * 0.002);
  probability *= astDepthFactor;

  const extFactor = Math.max(0.3, 1 - (totalExternal / Math.max(keyFiles.length, 1)) * 0.03);
  probability *= extFactor;

  const complexityFactor = Math.max(0.4, 1 - (avgCyclomatic - 1) * 0.01);
  probability *= complexityFactor;

  if (hasTypeScript) probability *= 1.08;
  if (strictMode) probability *= 1.05;

  probability = Math.min(0.99, Math.max(0.10, probability));

  const confidence = Math.round(probability * 100);

  const metricContributions = {
    typedVariableDensity: Math.round(densityContribution * 100),
    astDepthFactor: Math.round(astDepthFactor * 100),
    externalInterfaceFactor: Math.round(extFactor * 100),
    complexityFactor: Math.round(complexityFactor * 100),
    tsBoost: hasTypeScript ? 8 : 0,
    strictModeBoost: strictMode ? 5 : 0,
  };

  logger.info({
    confidence,
    typedDensity: typedDensity.toFixed(3),
    astDepth: maxAstDepth,
    extBoundaries: totalExternal,
    complexity: avgCyclomatic.toFixed(1),
    isTS: hasTypeScript,
    strict: strictMode,
  }, "Abstract Interpretation Confidence computed");

  return {
    typedVariableDensity: typedDensity,
    astDepth: maxAstDepth,
    externalLibraryInterfaces: totalExternal,
    cyclomaticComplexity: Math.round(avgCyclomatic * 10) / 10,
    functionCount: totalFunctions,
    fileCount: keyFiles.length,
    avgFunctionLength: Math.round(avgFuncLength * 10) / 10,
    hasTypeScript,
    strictMode,
    confidence,
    metricContributions,
  };
}
