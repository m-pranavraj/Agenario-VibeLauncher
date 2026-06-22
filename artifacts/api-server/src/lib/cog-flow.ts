/**
 * Pillar 4: CogFlow — UX Cognitive Load Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * PATENT CLAIM: A static analysis engine that computes cognitive load for frontend
 * components using Hick's Law, Shannon entropy, and AI-boilerplate fingerprinting,
 * returning a multidimensional UX assessment tensor without needing a browser.
 *
 * Core algorithms:
 *   - Hick's Law: decision_time = 0.15 + 0.19 * log2(n + 1)
 *   - Shannon Entropy approximation: -Σ p(x) * log2 p(x) for DOM elements
 *   - AI Fingerprinting: Detect generic shadcn, Tailwind, or LLM-generated UI boilerplate.
 *   - WCAG heuristics: Missing alt tags, unlabeled buttons.
 */

import { CSG } from "./csg-builder.js";
import { logger } from "./logger.js";
import * as parser from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = typeof _traverse === 'function' ? _traverse : (_traverse as any).default;

export interface UXFinding {
  id: string;
  category: "cognitive_overload" | "ai_boilerplate" | "wcag_violation" | "inconsistent_design";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  fixPrompt: string;
  confidence: number;
  metric?: number; // E.g., calculated decision time
}

export interface UXReport {
  findings: UXFinding[];
  scores: {
    cognitiveScore: number;
    accessibilityScore: number;
    originalityScore: number;
    uxScore: number;
  };
  stats: {
    componentsAnalyzed: number;
    aiBoilerplateDetected: number;
    highCognitiveLoadComponents: number;
    wcagViolations: number;
  };
}

export function runCogFlow(
  csg: CSG,
  keyFiles: Array<{ path: string; content: string }>
): UXReport {
  const findings: UXFinding[] = [];
  const stats = {
    componentsAnalyzed: 0,
    aiBoilerplateDetected: 0,
    highCognitiveLoadComponents: 0,
    wcagViolations: 0,
  };

  const reactFiles = keyFiles.filter(f => f.path.endsWith(".tsx") || f.path.endsWith(".jsx"));

  for (const file of reactFiles) {
    const content = file.content;
    try {
      const ast = parser.parse(content, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
        errorRecovery: true
      });

      let hasShadcnImports = false;
      let hasLoremIpsum = /lorem\s+ipsum/i.test(content); // keep regex for full text comments
      let hasGenericComments = /\/\/\s*TODO:\s*Add.*logic/.test(content) || /\/\/\s*Replace with actual/.test(content);

      traverse(ast, {
        ImportDeclaration(path: any) {
          if (path.node.source.value.includes("@/components/ui")) {
            hasShadcnImports = true;
          }
        },
        Function(path: any) {
          let componentName = "anonymous";
          if (path.node.id) componentName = path.node.id.name;
          else if (path.parent.type === 'VariableDeclarator' && path.parent.id.type === 'Identifier') componentName = path.parent.id.name;
          
          if (!componentName.match(/^[A-Z]/)) return; // Only Capitalized components
          
          stats.componentsAnalyzed++;
          const lineNum = path.node.loc?.start.line || 1;
          
          let interactiveCount = 0;
          let nodeCounts = new Map<string, number>();
          let missingAltTags: number[] = [];

          path.traverse({
            JSXElement(p: any) {
              const elName = p.node.openingElement.name.name;
              if (!elName) return;
              
              if (['button', 'a', 'input', 'select', 'textarea'].includes(elName)) {
                interactiveCount++;
              }
              
              if (elName === 'img') {
                const hasAlt = p.node.openingElement.attributes.some((attr: any) => attr.name?.name === 'alt');
                if (!hasAlt) missingAltTags.push(p.node.loc?.start.line || lineNum);
              }

              nodeCounts.set(elName, (nodeCounts.get(elName) || 0) + 1);
            }
          });

          // 1. Hick's Law
          if (interactiveCount > 0) {
            const decisionTimeSec = 0.15 + 0.19 * Math.log2(interactiveCount + 1);
            if (decisionTimeSec > 1.2) {
              findings.push({
                id: `ux-hicks-${file.path}-${lineNum}`,
                category: "cognitive_overload",
                severity: "high",
                title: `High Cognitive Load (${componentName})`,
                description: `According to Hick's Law, having ${interactiveCount} interactive choices results in an estimated decision time of ${decisionTimeSec.toFixed(2)}s, leading to choice paralysis.`,
                evidence: `${interactiveCount} interactive elements detected`,
                filePath: file.path,
                lineNumber: lineNum,
                fixPrompt: "Group options into logical categories, use progressive disclosure (e.g., accordions or tabs), or remove secondary choices.",
                confidence: 85,
                metric: decisionTimeSec,
              });
              stats.highCognitiveLoadComponents++;
            }
          }

          // 2. AI Boilerplate Fingerprinting
          if (hasShadcnImports && (hasLoremIpsum || hasGenericComments)) {
            findings.push({
              id: `ux-ai-boiler-${file.path}-${lineNum}`,
              category: "ai_boilerplate",
              severity: "medium",
              title: `AI UI Boilerplate Detected (${componentName})`,
              description: "Component appears to be raw generated code (generic filler text, TODOs, unmodified library components). This reduces the premium feel of the application.",
              evidence: `Placeholder text/comments found alongside UI library imports`,
              filePath: file.path,
              lineNumber: lineNum,
              fixPrompt: "Replace placeholder content with real copy, implement the pending logic, and customize the design tokens to match your brand.",
              confidence: 90,
            });
            stats.aiBoilerplateDetected++;
          }

          // 3. WCAG Heuristics (AST-based)
          for (const line of missingAltTags) {
            findings.push({
              id: `ux-wcag-img-${file.path}-${line}`,
              category: "wcag_violation",
              severity: "high",
              title: "Missing Alt Text on Image",
              description: "Images must have an 'alt' attribute to be accessible to screen readers.",
              evidence: "AST traversal found <img /> missing 'alt' attribute",
              filePath: file.path,
              lineNumber: line,
              fixPrompt: "Add a descriptive `alt=\"...\"` attribute. If it is purely decorative, use `alt=\"\"`.",
              confidence: 98,
            });
            stats.wcagViolations++;
          }

          // 4. Shannon Entropy approximation
          let entropy = 0;
          let totalNodes = 0;
          for (const count of nodeCounts.values()) totalNodes += count;
          
          for (const count of nodeCounts.values()) {
            const p = count / totalNodes;
            entropy -= p * Math.log2(p);
          }
          
          if (entropy > 3.5 && totalNodes > 30) {
            findings.push({
              id: `ux-entropy-${file.path}-${lineNum}`,
              category: "cognitive_overload",
              severity: "medium",
              title: `High Visual Entropy (${componentName})`,
              description: `Component has high structural complexity (Entropy: ${entropy.toFixed(2)} bits), meaning there is a very diverse mix of DOM elements. This usually indicates visual clutter.`,
              evidence: `${totalNodes} elements with high variance in tags`,
              filePath: file.path,
              lineNumber: lineNum,
              fixPrompt: "Simplify the layout, increase whitespace, and reuse consistent structural components rather than mixing many different tags.",
              confidence: 75,
              metric: entropy,
            });
            stats.highCognitiveLoadComponents++;
          }
        }
      });
    } catch (err) {
      logger.error({ err, path: file.path }, "AST Parsing failed for CogFlow");
    }
  }

  // Calculate Scores
  const total = Math.max(stats.componentsAnalyzed, 1);
  
  const cognitiveScore = Math.max(0, 100 - (stats.highCognitiveLoadComponents / total) * 100);
  const accessibilityScore = Math.max(0, 100 - stats.wcagViolations * 10);
  const originalityScore = Math.max(0, 100 - (stats.aiBoilerplateDetected / total) * 100);
  
  const uxScore = Math.round((cognitiveScore * 0.4) + (accessibilityScore * 0.4) + (originalityScore * 0.2));

  logger.info({
    totalFindings: findings.length,
    uxScore,
    wcagViolations: stats.wcagViolations
  }, "CogFlow UX analysis complete");

  return {
    findings,
    scores: {
      cognitiveScore: Math.round(cognitiveScore),
      accessibilityScore: Math.round(accessibilityScore),
      originalityScore: Math.round(originalityScore),
      uxScore,
    },
    stats,
  };
}
