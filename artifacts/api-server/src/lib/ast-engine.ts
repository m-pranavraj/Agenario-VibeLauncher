import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

// Handle ESM/CJS interop for babel traverse
const traverse = typeof _traverse === 'function' ? _traverse : (_traverse as any).default;

export interface AstAnalysisResults {
  vibeTaint: { sources: number; sinks: number; sanitizers: number };
  symCost: { maxLoopDepth: number; totalLoops: number };
  failSafe: { tryBlocks: number; catchBlocks: number; emptyCatches: number };
  obsCover: { functions: number; loggers: number };
  archScan: { imports: number; exports: number };
  promptTrace: { llmCalls: number; stringInterpolations: number };
  cogFlow: { maxDomDepth: number; reactHooks: number; totalDivs: number };
  constraintSolver: { conditionals: number };
  regGraph: { cryptoImports: number; deletes: number };
  flowValue: { paymentRefs: number };
}

export function runAstAnalysis(keyFiles: { path: string; content: string }[]): AstAnalysisResults {
  const results: AstAnalysisResults = {
    vibeTaint: { sources: 0, sinks: 0, sanitizers: 0 },
    symCost: { maxLoopDepth: 0, totalLoops: 0 },
    failSafe: { tryBlocks: 0, catchBlocks: 0, emptyCatches: 0 },
    obsCover: { functions: 0, loggers: 0 },
    archScan: { imports: 0, exports: 0 },
    promptTrace: { llmCalls: 0, stringInterpolations: 0 },
    cogFlow: { maxDomDepth: 0, reactHooks: 0, totalDivs: 0 },
    constraintSolver: { conditionals: 0 },
    regGraph: { cryptoImports: 0, deletes: 0 },
    flowValue: { paymentRefs: 0 }
  };

  for (const file of keyFiles) {
    if (!file.content) continue;
    
    // Skip large minified files or assets
    if (file.content.length > 500000) continue;

    let ast;
    try {
      ast = parse(file.content, {
        sourceType: "module",
        plugins: ["jsx", "typescript", "decorators-legacy"],
        errorRecovery: true,
      });
    } catch (err) {
      // If babel fails to parse a malformed file, skip to next
      continue;
    }

    try {
      traverse(ast, {
        // --- ARCH SCAN ---
        ImportDeclaration() {
          results.archScan.imports++;
        },
        ExportNamedDeclaration() {
          results.archScan.exports++;
        },
        ExportDefaultDeclaration() {
          results.archScan.exports++;
        },

        // --- OBS COVER & VIBETAINT & PROMPTTRACE ---
        FunctionDeclaration() {
          results.obsCover.functions++;
        },
        ArrowFunctionExpression() {
          results.obsCover.functions++;
        },
        FunctionExpression() {
          results.obsCover.functions++;
        },

        CallExpression(path: any) {
          const callee = path.node.callee;

          // ObsCover: console.log, logger.info
          if (callee.type === "MemberExpression") {
            const objName = callee.object?.name || "";
            if (objName === "console" || objName === "logger" || objName === "pino") {
              results.obsCover.loggers++;
            }
          }

          // VibeTaint: Sinks (eval, exec)
          if (callee.type === "Identifier" && (callee.name === "eval" || callee.name === "exec")) {
            results.vibeTaint.sinks++;
          }
          if (callee.type === "MemberExpression" && callee.property?.name === "dangerouslySetInnerHTML") {
            results.vibeTaint.sinks++;
          }

          // VibeTaint: Sanitizers
          if (callee.type === "MemberExpression") {
            const propName = callee.property?.name || "";
            if (propName === "sanitize" || propName === "escape" || propName === "parse") {
              results.vibeTaint.sanitizers++;
            }
          }

          // PromptTrace: LLM Calls
          if (callee.type === "Identifier" && (callee.name === "OpenAI" || callee.name === "Anthropic")) {
            results.promptTrace.llmCalls++;
          }

          // RegGraph: Crypto / Deletes
          if (callee.type === "MemberExpression" && callee.property?.name === "delete") {
            results.regGraph.deletes++;
          }

          // FlowValue: Payment
          if (callee.type === "Identifier" && (callee.name.toLowerCase().includes("stripe") || callee.name.toLowerCase().includes("checkout"))) {
            results.flowValue.paymentRefs++;
          }
          
          // CogFlow: Hooks
          if (callee.type === "Identifier" && (callee.name === "useState" || callee.name === "useEffect" || callee.name === "useMemo")) {
            results.cogFlow.reactHooks++;
          }
        },

        // VibeTaint: Sources
        MemberExpression(path: any) {
          const objName = path.node.object?.name || "";
          const propName = path.node.property?.name || "";
          if (objName === "req" && (propName === "body" || propName === "query" || propName === "params")) {
            results.vibeTaint.sources++;
          }
        },

        // --- FAILSAFE ---
        TryStatement(path: any) {
          results.failSafe.tryBlocks++;
          if (path.node.handler) {
            results.failSafe.catchBlocks++;
            const catchBody = path.node.handler.body?.body;
            if (Array.isArray(catchBody) && catchBody.length === 0) {
              results.failSafe.emptyCatches++;
            }
          }
        },

        // --- SYMCOST ---
        ForStatement(path: any) {
          results.symCost.totalLoops++;
          let depth = 1;
          let parent = path.parentPath;
          while (parent) {
            if (parent.type === "ForStatement" || parent.type === "WhileStatement") depth++;
            parent = parent.parentPath;
          }
          if (depth > results.symCost.maxLoopDepth) {
            results.symCost.maxLoopDepth = depth;
          }
        },
        WhileStatement(path: any) {
          results.symCost.totalLoops++;
          let depth = 1;
          let parent = path.parentPath;
          while (parent) {
            if (parent.type === "ForStatement" || parent.type === "WhileStatement") depth++;
            parent = parent.parentPath;
          }
          if (depth > results.symCost.maxLoopDepth) {
            results.symCost.maxLoopDepth = depth;
          }
        },

        // --- PROMPTTRACE ---
        TemplateLiteral() {
          results.promptTrace.stringInterpolations++;
        },

        // --- COGFLOW ---
        JSXElement(path: any) {
          if (path.node.openingElement?.name?.name === "div") {
            results.cogFlow.totalDivs++;
          }
          let depth = 1;
          let parent = path.parentPath;
          while (parent) {
            if (parent.type === "JSXElement") depth++;
            parent = parent.parentPath;
          }
          if (depth > results.cogFlow.maxDomDepth) {
            results.cogFlow.maxDomDepth = depth;
          }
        },

        // --- CONSTRAINT SOLVER ---
        IfStatement() {
          results.constraintSolver.conditionals++;
        },
        LogicalExpression() {
          results.constraintSolver.conditionals++;
        },
        
        // --- REGGRAPH ---
        StringLiteral(path: any) {
          if (path.node.value === "crypto" || path.node.value === "bcrypt") {
            results.regGraph.cryptoImports++;
          }
        }
      });
    } catch (err) {
      // Traverse error
      console.warn("AST Traversal error on file:", file.path, err);
    }
  }

  return results;
}
