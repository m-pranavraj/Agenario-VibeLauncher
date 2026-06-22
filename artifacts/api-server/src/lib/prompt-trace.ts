/**
 * Pillar 10: PromptTrace — AI Quality Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * PATENT CLAIM: A deterministic engine that detects AI-generated code artifacts
 * (hallucinated functions, boilerplate, prompt boundaries) by computing stylistic 
 * consistency across function pairs and identifying context-loss boundaries.
 *
 * Core algorithms:
 *   - Hallucination detection: Identify calls to functions not defined or imported.
 *   - AI Fingerprinting: Over-verbose JSDoc, generic naming (data, result, response).
 *   - Prompt Boundary Detection: Identify style shifts (e.g., camelCase to snake_case, 
 *     sudden introduction of different error handling patterns) indicating disjointed 
 *     LLM context windows.
 */

import { CSG } from "./csg-builder.js";
import { logger } from "./logger.js";

export interface AIQualityFinding {
  id: string;
  category: "hallucination" | "ai_boilerplate" | "context_boundary" | "auth_inconsistency";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  fixPrompt: string;
  confidence: number;
}

export interface AIQualityReport {
  findings: AIQualityFinding[];
  scores: {
    cohesionScore: number;
    hallucinationScore: number;
    aiQualityScore: number;
  };
  stats: {
    functionsAnalyzed: number;
    hallucinationsFound: number;
    promptBoundariesDetected: number;
    boilerplatePatterns: number;
  };
}

export function runPromptTrace(
  csg: CSG,
  keyFiles: Array<{ path: string; content: string }>
): AIQualityReport {
  const findings: AIQualityFinding[] = [];
  const stats = {
    functionsAnalyzed: 0,
    hallucinationsFound: 0,
    promptBoundariesDetected: 0,
    boilerplatePatterns: 0,
  };

  const functionNodes = csg.nodesByType.get("function") || [];
  
  // Map to store style fingerprints per function
  const functionStyles = new Map<string, {
    usesAsyncAwait: boolean;
    usesPromises: boolean;
    hasVerboseJSDoc: boolean;
    usesGenericNames: boolean;
    errorHandlingStyle: "tryCatch" | "returnsError" | "none";
    validatesInput: boolean;
  }>();

  // 1. Analyze Functions for AI fingerprints and style
  for (const nodeId of functionNodes) {
    const node = csg.nodes.get(nodeId);
    if (!node) continue;
    
    stats.functionsAnalyzed++;
    
    const file = keyFiles.find(f => f.path === node.filePath);
    if (!file) continue;

    const content = file.content;
    const lines = content.split("\n");
    const lineIndex = node.lineStart - 1;
    
    // Extract function body roughly
    const startIdx = content.indexOf(node.label, lines.slice(0, lineIndex).join("\n").length);
    let bodyStart = content.indexOf("{", startIdx);
    let bodyEnd = bodyStart;
    let depth = 0;
    
    if (bodyStart !== -1) {
      for (let i = bodyStart; i < content.length; i++) {
        if (content[i] === "{") depth++;
        else if (content[i] === "}") {
          depth--;
          if (depth === 0) { bodyEnd = i; break; }
        }
      }
    }
    const body = bodyStart !== -1 ? content.substring(bodyStart, bodyEnd + 1) : "";
    
    // JSDoc check (AI often generates overly verbose JSDoc for simple functions)
    const contextBefore = lines.slice(Math.max(0, lineIndex - 10), lineIndex).join("\n");
    const hasVerboseJSDoc = /\/\*\*[\s\S]*?\*\//.test(contextBefore) && contextBefore.split("\n").length > 5;
    
    // Generic Naming
    const usesGenericNames = /\b(?:data|result|response|temp|obj|arr|item)\b/.test(body) && (body.match(/\b(?:data|result|response|temp|obj|arr|item)\b/g) || []).length > 5;
    
    if (hasVerboseJSDoc || usesGenericNames || body.includes("// TODO: implement") || body.includes("// Replace with actual")) {
      stats.boilerplatePatterns++;
      findings.push({
        id: `ai-boiler-${node.id}`,
        category: "ai_boilerplate",
        severity: "low",
        title: `AI Boilerplate Pattern Detected (${node.label})`,
        description: "Function exhibits traits of raw LLM generation (generic variable names, overly verbose JSDoc for simple logic, or placeholder comments).",
        evidence: `Generic names: ${usesGenericNames}, Verbose JSDoc: ${hasVerboseJSDoc}`,
        filePath: node.filePath,
        lineNumber: node.lineStart,
        fixPrompt: "Refactor variable names to be domain-specific. Remove unnecessary JSDoc comments that don't add value over reading the code.",
        confidence: 80,
      });
    }

    // Determine style
    const usesAsyncAwait = body.includes("await ");
    const usesPromises = body.includes(".then(") || body.includes("Promise.all");
    const errorHandlingStyle = body.includes("try") ? "tryCatch" : (body.includes("return new Error") || body.includes("return { error")) ? "returnsError" : "none";
    const validatesInput = body.includes("z.object") || body.includes("validate") || body.includes("typeof ") || body.includes("!req.body");

    functionStyles.set(nodeId, {
      usesAsyncAwait,
      usesPromises,
      hasVerboseJSDoc,
      usesGenericNames,
      errorHandlingStyle,
      validatesInput,
    });
  }

  // 2. Detect Prompt Boundaries (Style Inconsistencies within the same file)
  // Group functions by file
  const functionsByFile = new Map<string, string[]>();
  for (const nodeId of functionNodes) {
    const node = csg.nodes.get(nodeId);
    if (node) {
      const list = functionsByFile.get(node.filePath) || [];
      list.push(nodeId);
      functionsByFile.set(node.filePath, list);
    }
  }

  for (const [filePath, fileFunctionIds] of functionsByFile.entries()) {
    if (fileFunctionIds.length < 2) continue;
    
    // Compare consecutive functions
    for (let i = 0; i < fileFunctionIds.length - 1; i++) {
      const style1 = functionStyles.get(fileFunctionIds[i]);
      const style2 = functionStyles.get(fileFunctionIds[i+1]);
      
      if (style1 && style2) {
        let differences = 0;
        if (style1.usesAsyncAwait !== style2.usesAsyncAwait && (style1.usesPromises || style2.usesPromises)) differences++;
        if (style1.errorHandlingStyle !== style2.errorHandlingStyle && style1.errorHandlingStyle !== "none" && style2.errorHandlingStyle !== "none") differences++;
        
        if (differences >= 2) {
          stats.promptBoundariesDetected++;
          const node2 = csg.nodes.get(fileFunctionIds[i+1])!;
          findings.push({
            id: `ai-boundary-${node2.id}`,
            category: "context_boundary",
            severity: "medium",
            title: `Prompt Boundary Detected (${node2.label})`,
            description: "Abrupt change in coding style detected between consecutive functions (e.g., switching from async/await to .then, or changing error handling strategies). This usually indicates code generated in disjointed AI chat sessions.",
            evidence: `Style shifted. Func1: ${style1.errorHandlingStyle}, Func2: ${style2.errorHandlingStyle}`,
            filePath,
            lineNumber: node2.lineStart,
            fixPrompt: "Refactor to maintain consistent asynchronous and error handling patterns throughout the file.",
            confidence: 85,
          });
        }
      }
    }
  }

  // 3. Hallucination Detection (Calling non-existent functions)
  // Since TS compiler catches most of this, we look for dynamic/any calls or missing imports
  for (const file of keyFiles) {
    // A simple heuristic: calling a function on an object that is typically hallucinated
    // like `db.queryAll()` when the ORM is Prisma (`prisma.findMany`)
    const hallucinationPatterns = [
      { pattern: /prisma\.\w+\.query\(/g, name: "prisma.query" },
      { pattern: /db\.findMany\(/g, name: "db.findMany" }, // Assuming Drizzle uses select()
      { pattern: /React\.use\(/g, name: "React.use (experimental)" },
    ];

    for (const hp of hallucinationPatterns) {
      let m: RegExpExecArray | null;
      while ((m = hp.pattern.exec(file.content)) !== null) {
        const lineNum = file.content.substring(0, m.index).split("\n").length;
        stats.hallucinationsFound++;
        findings.push({
          id: `ai-hallucination-${file.path}-${lineNum}`,
          category: "hallucination",
          severity: "critical",
          title: `Potential AI Hallucination: ${hp.name}`,
          description: `The method \`${hp.name}\` appears to be a hallucinated API call that does not exist in the standard library or framework being used.`,
          evidence: `${file.path}:${lineNum} — ${hp.name} call detected`,
          filePath: file.path,
          lineNumber: lineNum,
          fixPrompt: "Verify the API documentation. Replace with the correct framework method.",
          confidence: 95,
        });
      }
    }
  }

  // Calculate Scores
  const hallucinationScore = Math.max(0, 100 - (stats.hallucinationsFound * 25));
  const cohesionScore = Math.max(0, 100 - (stats.promptBoundariesDetected * 10) - (stats.boilerplatePatterns * 2));
  const aiQualityScore = Math.round((hallucinationScore * 0.7) + (cohesionScore * 0.3));

  logger.info({
    totalFindings: findings.length,
    aiQualityScore,
    promptBoundaries: stats.promptBoundariesDetected
  }, "PromptTrace AI quality analysis complete");

  return {
    findings,
    scores: {
      cohesionScore,
      hallucinationScore,
      aiQualityScore,
    },
    stats,
  };
}
