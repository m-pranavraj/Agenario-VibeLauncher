import { logger } from "./logger.js";
import { buildCSG, bfsForward, type CSG } from "./csg-builder.js";

export interface BigOProfilerResult {
  worstCaseTimeComplexity: string;
  worstCaseSpaceComplexity: string;
  serverCollapseThreshold: number;
  totalNestedLoops: number;
  dependentLoops: number;
  independentLoops: number;
  recursionDepth: number;
  expensiveFunctions: Array<{ file: string; line: number; function: string; complexity: string; estimatedOps: number }>;
  insight: string;
}

interface LoopInfo {
  filePath: string;
  line: number;
  depth: number;
  bound: "constant" | "linear" | "quadratic" | "unknown";
  isDependent: boolean;
  functionName: string;
}

function classifyLoopBound(content: string, loopLine: number): "constant" | "linear" | "quadratic" | "unknown" {
  const lines = content.split("\n");
  const loopLineContent = lines[loopLine - 1] ?? "";
  const nextLines = lines.slice(loopLine, Math.min(loopLine + 20, lines.length)).join(" ");

  const rangeMatch = loopLineContent.match(/(\w+)\s*<\s*(\w+)/);
  if (!rangeMatch) return "unknown";

  const loopVar = rangeMatch[1];
  const upperBound = rangeMatch[2];

  if (/^\d+$/.test(upperBound)) return "constant";
  if (upperBound === loopVar) return "unknown";

  const dependentMatch = nextLines.match(new RegExp(`${loopVar}\\s*[*/+-]\\s*(${upperBound}|\\d+)`, "g"));
  if (dependentMatch) return "quadratic";

  return "linear";
}

function computeSeriesComplexity(loops: LoopInfo[]): string {
  if (loops.length === 0) return "O(1)";

  const nested = loops.filter(l => l.depth > 1);
  const dependent = loops.filter(l => l.isDependent);
  const independent = loops.filter(l => !l.isDependent && l.depth === 1);

  if (nested.length >= 2) {
    const hasQuadratic = nested.some(l => l.bound === "quadratic" || l.bound === "unknown");
    if (hasQuadratic) return "O(n³) or higher";
    return "O(n²)";
  }

  if (dependent.length >= 1 && independent.length >= 1) return "O(n²)";

  if (loops.length === 1) {
    const loop = loops[0];
    if (loop.bound === "constant") return "O(1)";
    if (loop.bound === "linear") return "O(n)";
    if (loop.bound === "quadratic") return "O(n²)";
    return "O(n)";
  }

  return "O(n log n)";
}

export function runBigOProfiler(keyFiles: Array<{ path: string; content: string }>, csg: CSG): BigOProfilerResult {
  const allLoops: LoopInfo[] = [];
  const expensiveFunctions: Array<{ file: string; line: number; function: string; complexity: string; estimatedOps: number }> = [];
  let recursionDepth = 0;

  for (const file of keyFiles) {
    const lines = file.content.split("\n");
    let currentFn = "anonymous";
    let fnLine = 1;
    let fnDepth = 0;
    const loopStack: Array<{ depth: number; line: number; filePath: string }> = [];

    const functionRe = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\s*\(|(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{)/g;
    const forRe = /\b(for\s*\(|while\s*\(|forEach|map\s*\(|filter\s*\(|reduce\s*\()/g;
    const recursionRe = /\b(this\.\w+\(|self\.\w+\(|module\.exports\.\w+\(|caller\(|arguments\.callee\()/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      const fnMatch = line.match(functionRe);
      if (fnMatch) {
        currentFn = fnMatch[1] ?? fnMatch[2] ?? fnMatch[3] ?? currentFn;
        fnLine = lineNum;
        fnDepth = loopStack.length;
      }

      if (recursionRe.test(line)) {
        recursionDepth++;
        expensiveFunctions.push({
          file: file.path,
          line: lineNum,
          function: currentFn,
          complexity: "recursive",
          estimatedOps: 1000000,
        });
      }

      const hasLoop = forRe.test(line);
      if (hasLoop) {
        const depth = loopStack.length + 1;
        const bound = classifyLoopBound(file.content, lineNum);
        const isDependent = line.includes(`${currentFn}(`) || line.includes("recursive");

        loopStack.push({ depth, line: lineNum, filePath: file.path });
        allLoops.push({
          filePath: file.path,
          line: lineNum,
          depth,
          bound,
          isDependent,
          functionName: currentFn,
        });
      }

      const closeCount = (line.match(/\}/g) ?? []).length;
      for (let c = 0; c < closeCount && loopStack.length > 0; c++) {
        loopStack.pop();
      }
    }

    const fnLoops = allLoops.filter(l => l.filePath === file.path);
    if (fnLoops.length > 0) {
      const complexity = computeSeriesComplexity(fnLoops);
      const estimatedOps = fnLoops.reduce((s, l) => {
        if (l.bound === "constant") return s + 1;
        if (l.bound === "linear") return s * 100;
        if (l.bound === "quadratic") return s * 10000;
        return s * 1000;
      }, 1);

      if (estimatedOps > 10000) {
        expensiveFunctions.push({
          file: file.path,
          line: fnLine,
          function: currentFn,
          complexity,
          estimatedOps,
        });
      }
    }
  }

  const nestedLoops = allLoops.filter(l => l.depth > 1).length;
  const dependentLoops = allLoops.filter(l => l.isDependent).length;
  const independentLoops = allLoops.filter(l => !l.isDependent).length;
  const timeComplexity = computeSeriesComplexity(allLoops);

  const spaceComplexity = recursionDepth > 0
    ? `O(${timeComplexity.includes("n²") ? "n" : "log n"}) stack`
    : "O(1) auxiliary";

  const dbQueries = [...csg.nodes.values()].filter(n => n.type === "dbquery").length;
  const socketCollapseThreshold = Math.max(10, Math.floor(1000 / (allLoops.length * 0.5 + dbQueries * 2)));

  let insight = "";
  if (nestedLoops === 0 && recursionDepth === 0) {
    insight = "No nested loops or recursion detected. Time complexity is likely O(n) or better.";
  } else if (nestedLoops >= 3) {
    insight = `Deep nesting detected (${nestedLoops} nested loops). Worst-case complexity is O(n³) or higher. Refactoring strongly recommended.`;
  } else if (dependentLoops >= 2) {
    insight = `${dependentLoops} dependent nested loops create quadratic or worse complexity. Consider hash maps or pre-indexing.`;
  } else {
    insight = `${nestedLoops} nested loop(s), ${recursionDepth} recursive function(s). ${timeComplexity} complexity. Socket collapse threshold: ${socketCollapseThreshold} concurrent requests.`;
  }

  logger.info({ timeComplexity, nestedLoops, recursionDepth, socketCollapseThreshold }, "Big-O Profiler complete");

  return {
    worstCaseTimeComplexity: timeComplexity,
    worstCaseSpaceComplexity: spaceComplexity,
    serverCollapseThreshold: socketCollapseThreshold,
    totalNestedLoops: nestedLoops,
    dependentLoops,
    independentLoops,
    recursionDepth,
    expensiveFunctions: expensiveFunctions.slice(0, 20),
    insight,
  };
}
