import type { CombinedSemanticGraph, CsgNode, CsgEdge } from "./types.js";
import type { PerformanceFinding } from "./performance-rules.js";

export interface NodeCost {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  file: string;
  line: number;
  cpuCostMs: number;
  ioCostMs: number;
  dbQueryCount: number;
  apiCallCount: number;
  bundleBytes: number;
  isDeadCode: boolean;
  dependencyCostMs: number;
  dependencyBundleBytes: number;
}

export interface PathCost {
  pathName: string;
  entryNodeId: string;
  totalCpuCostMs: number;
  totalIoCostMs: number;
  totalDbQueryCount: number;
  totalApiCallCount: number;
  totalBundleBytes: number;
  nodeCount: number;
  depth: number;
  parallelizableCostMs: number;
}

export interface FatHandlerInfo {
  functionName: string;
  file: string;
  line: number;
  operationCount: number;
  operations: string[];
  estimatedCostMs: number;
}

export interface DeadCodeInfo {
  nodeId: string;
  name: string;
  file: string;
  line: number;
  code: string;
  reason: string;
}

const SYNC_OPS_COST_MS: Record<string, number> = {
  readFileSync: 5,
  writeFileSync: 8,
  statSync: 1,
  bcrypt_hashSync: 250,
  bcrypt_compareSync: 50,
  crypto_pbkdf2Sync: 100,
  JSON_parse: 0.1,
  JSON_stringify: 0.1,
  spread_1000: 0.1,
  console_log: 0.05,
};

const ASYNC_OPS_COST_MS: Record<string, number> = {
  dbQuery: 10,
  apiCall: 100,
  emailSend: 200,
  fileWrite: 15,
  fileRead: 5,
  imageProcess: 300,
  setState: 1,
  useEffect: 5,
  render: 5,
};

export class PecGraph {
  private graph: CombinedSemanticGraph;
  private nodeCosts: Map<string, NodeCost> = new Map();
  private pathCosts: Map<string, PathCost> = new Map();

  constructor(graph: CombinedSemanticGraph) {
    this.graph = graph;
  }

  computeAllCosts(): {
    nodeCosts: NodeCost[];
    pathCosts: PathCost[];
    fatHandlers: FatHandlerInfo[];
    deadCodeSections: DeadCodeInfo[];
    totalEstimatedCostMs: number;
    totalBundleBytes: number;
  } {
    this.computeNodeCosts();
    const fatHandlers = this.detectFatHandlers();
    const deadCodeSections = this.detectDeadCode();

    const entryPaths = this.computeEntryPaths();
    const totalEstimatedCostMs = Array.from(this.nodeCosts.values()).reduce(
      (sum, n) => sum + n.cpuCostMs + n.ioCostMs + n.dependencyCostMs,
      0,
    );
    const totalBundleBytes = Array.from(this.nodeCosts.values()).reduce(
      (sum, n) => sum + n.bundleBytes + n.dependencyBundleBytes,
      0,
    );

    return {
      nodeCosts: Array.from(this.nodeCosts.values()),
      pathCosts: Array.from(this.pathCosts.values()),
      fatHandlers,
      deadCodeSections,
      totalEstimatedCostMs,
      totalBundleBytes,
    };
  }

  private computeNodeCosts(): void {
    for (const [nodeId, node] of this.graph.nodes) {
      const cost = this.estimateNodeCost(node);
      this.nodeCosts.set(nodeId, cost);
    }

    for (const [nodeId, nodeCost] of this.nodeCosts) {
      const adjacency = this.graph.adjacency.get(nodeId);
      if (!adjacency) continue;

      for (const edge of adjacency.out) {
        if (edge.type === "calls" || edge.type === "imports") {
          const targetCost = this.nodeCosts.get(edge.targetId);
          if (targetCost) {
            nodeCost.dependencyCostMs += targetCost.cpuCostMs + targetCost.ioCostMs;
            nodeCost.dependencyBundleBytes += targetCost.bundleBytes;
          }
        }
      }
    }
  }

  private estimateNodeCost(node: CsgNode): NodeCost {
    const codeLower = node.code.toLowerCase();
    const base: NodeCost = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      file: node.file,
      line: node.line,
      cpuCostMs: 0,
      ioCostMs: 0,
      dbQueryCount: 0,
      apiCallCount: 0,
      bundleBytes: 0,
      isDeadCode: false,
      dependencyCostMs: 0,
      dependencyBundleBytes: 0,
    };

    switch (node.type) {
      case "db_query":
        base.dbQueryCount = 1;
        base.ioCostMs += ASYNC_OPS_COST_MS.dbQuery;
        break;

      case "api_call":
        base.apiCallCount = 1;
        base.ioCostMs += ASYNC_OPS_COST_MS.apiCall;
        if (codeLower.includes(".post") || codeLower.includes("axios.post")) {
          base.ioCostMs += 50;
        }
        break;

      case "function":
        this.estimateFunctionCost(node, base);
        break;

      case "conditional":
        base.cpuCostMs += 0.01;
        break;

      case "import":
        this.estimateImportCost(node, base);
        break;

      case "expression":
        this.estimateExpressionCost(node, base);
        break;

      case "component":
        this.estimateComponentCost(node, base);
        break;

      case "route":
        base.cpuCostMs += 0.1;
        break;

      case "assignment":
        if (codeLower.includes("json.parse") && codeLower.includes("json.stringify")) {
          base.cpuCostMs += SYNC_OPS_COST_MS.JSON_parse + SYNC_OPS_COST_MS.JSON_stringify;
        }
        if (codeLower.includes("spread") || codeLower.includes("...")) {
          base.cpuCostMs += SYNC_OPS_COST_MS.spread_1000;
        }
        break;
    }

    const syncPatternCost = this.detectSyncOperations(node.code);
    base.cpuCostMs += syncPatternCost.cpuMs;
    base.ioCostMs += syncPatternCost.ioMs;

    return base;
  }

  private estimateFunctionCost(node: CsgNode, cost: NodeCost): void {
    const code = node.code;
    const codeLower = code.toLowerCase();
    const adjacency = this.graph.adjacency.get(node.id);

    if (codeLower.includes("async")) {
      cost.cpuCostMs += 0.5;
    }

    const dbPatterns = ["find(", "findone(", "findmany(", "query(", "select ", "update(", "create(", "save("];
    for (const p of dbPatterns) {
      if (codeLower.includes(p)) {
        cost.dbQueryCount += 1;
        cost.ioCostMs += ASYNC_OPS_COST_MS.dbQuery;
      }
    }

    const apiPatterns = ["fetch(", "axios.", "got(", "http.", "https.", "request("];
    for (const p of apiPatterns) {
      if (codeLower.includes(p)) {
        const escapedP = p.replace("(", "\\(");
        cost.apiCallCount += (code.match(new RegExp(escapedP, "gi")) || []).length;
      }
    }
    cost.ioCostMs += cost.apiCallCount * ASYNC_OPS_COST_MS.apiCall;

    if (codeLower.includes("email") && (codeLower.includes("send") || codeLower.includes("mail"))) {
      cost.ioCostMs += ASYNC_OPS_COST_MS.emailSend;
    }

    if (adjacency) {
      let renderEdges = 0;
      for (const edge of adjacency.out) {
        if (edge.type === "renders") renderEdges++;
      }
      if (renderEdges > 0) {
        cost.cpuCostMs += renderEdges * ASYNC_OPS_COST_MS.render;
      }
    }

    const branchPatterns = code.match(/if\s*\(/g);
    if (branchPatterns) {
      cost.cpuCostMs += branchPatterns.length * 0.05;
    }

    const loopPatterns = code.match(/(for\s*\(|forEach|while\s*\()/g);
    if (loopPatterns) {
      cost.cpuCostMs += loopPatterns.length * 0.5;
    }
  }

  private estimateImportCost(node: CsgNode, cost: NodeCost): void {
    const code = node.code;

    const heavyLibs: Record<string, number> = {
      lodash: 71000,
      moment: 232000,
      "chart.js": 150000,
      d3: 250000,
      three: 500000,
      "aws-sdk": 800000,
      firebase: 400000,
      underscore: 56000,
      jquery: 87000,
      bootstrap: 190000,
      axios: 15000,
    };

    for (const [lib, bytes] of Object.entries(heavyLibs)) {
      if (code.toLowerCase().includes(lib)) {
        cost.bundleBytes += bytes;
        break;
      }
    }

    if (code.includes("from 'react-icons'") || code.includes('from "react-icons"')) {
      cost.bundleBytes += 500000;
    }

    if (node.meta?.isDefaultImport) {
      cost.bundleBytes += cost.bundleBytes * 0.3;
    }
  }

  private estimateExpressionCost(node: CsgNode, cost: NodeCost): void {
    const code = node.code;
    const codeLower = code.toLowerCase();

    if (codeLower.includes("usememo") || codeLower.includes("usecallback")) {
      cost.cpuCostMs += 0.1;
    }

    if (codeLower.includes("useeffect")) {
      cost.cpuCostMs += ASYNC_OPS_COST_MS.useEffect;
    }

    if (codeLower.includes("usesate") || codeLower.includes("usereducer")) {
      cost.cpuCostMs += ASYNC_OPS_COST_MS.setState;
    }

    if (codeLower.includes("console.log") || codeLower.includes("console.warn")) {
      cost.cpuCostMs += SYNC_OPS_COST_MS.console_log;
    }

    if (codeLower.includes(".sort(") && code.length > 100) {
      cost.cpuCostMs += 50;
    }

    if (codeLower.includes(".filter(") && code.length > 100) {
      cost.cpuCostMs += 10;
    }

    if (codeLower.includes(".reduce(") && code.length > 100) {
      cost.cpuCostMs += 10;
    }
  }

  private estimateComponentCost(node: CsgNode, cost: NodeCost): void {
    const code = node.code;
    const adjacency = this.graph.adjacency.get(node.id);

    cost.cpuCostMs += ASYNC_OPS_COST_MS.render;

    if (code.includes("React.memo") || code.includes("memo(")) {
      cost.cpuCostMs *= 0.5;
    }

    if (code.includes("useEffect") && !code.includes("[") && code.includes("]")) {
      cost.cpuCostMs += ASYNC_OPS_COST_MS.useEffect * 5;
    }

    if (adjacency) {
      let childComponents = 0;
      for (const edge of adjacency.out) {
        if (edge.type === "renders") childComponents++;
      }
      if (childComponents > 10) {
        cost.cpuCostMs += childComponents * ASYNC_OPS_COST_MS.render * 0.3;
      }
    }
  }

  private detectSyncOperations(code: string): { cpuMs: number; ioMs: number } {
    let cpuMs = 0;
    let ioMs = 0;

    if (code.includes("readFileSync") || code.includes("writeFileSync")) {
      ioMs += SYNC_OPS_COST_MS.readFileSync;
    }
    if (code.includes("statSync") || code.includes("existsSync")) {
      ioMs += SYNC_OPS_COST_MS.statSync;
    }
    if (code.includes("hashSync")) {
      cpuMs += SYNC_OPS_COST_MS.bcrypt_hashSync;
    }
    if (code.includes("compareSync")) {
      cpuMs += SYNC_OPS_COST_MS.bcrypt_compareSync;
    }
    if (code.includes("pbkdf2Sync")) {
      cpuMs += SYNC_OPS_COST_MS.crypto_pbkdf2Sync;
    }

    return { cpuMs, ioMs };
  }

  private computeEntryPaths(): PathCost[] {
    const paths: PathCost[] = [];

    for (const entryId of this.graph.entryPoints) {
      const visited = new Set<string>();
      const nodesInPath: string[] = [];
      this.walkGraph(entryId, visited, nodesInPath);

      let totalCpuCostMs = 0;
      let totalIoCostMs = 0;
      let totalDbQueryCount = 0;
      let totalApiCallCount = 0;
      let totalBundleBytes = 0;

      for (const nodeId of nodesInPath) {
        const cost = this.nodeCosts.get(nodeId);
        if (cost) {
          totalCpuCostMs += cost.cpuCostMs;
          totalIoCostMs += cost.ioCostMs;
          totalDbQueryCount += cost.dbQueryCount;
          totalApiCallCount += cost.apiCallCount;
          totalBundleBytes += cost.bundleBytes;
        }
      }

      const entryNode = this.graph.nodes.get(entryId);

      paths.push({
        pathName: entryNode?.name ?? entryId,
        entryNodeId: entryId,
        totalCpuCostMs,
        totalIoCostMs,
        totalDbQueryCount,
        totalApiCallCount,
        totalBundleBytes,
        nodeCount: nodesInPath.length,
        depth: nodesInPath.length,
        parallelizableCostMs: this.estimateParallelizableCost(entryId, nodesInPath),
      });

      this.pathCosts.set(entryId, paths[paths.length - 1]);
    }

    return paths;
  }

  private walkGraph(nodeId: string, visited: Set<string>, nodes: string[]): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    nodes.push(nodeId);

    const adjacency = this.graph.adjacency.get(nodeId);
    if (!adjacency) return;

    for (const edge of adjacency.out) {
      if (edge.type === "calls" || edge.type === "renders" || edge.type === "handles") {
        this.walkGraph(edge.targetId, visited, nodes);
      }
    }
  }

  private estimateParallelizableCost(entryId: string, nodesInPath: string[]): number {
    const childCosts: number[] = [];
    const adjacency = this.graph.adjacency.get(entryId);
    if (!adjacency) return 0;

    for (const edge of adjacency.out) {
      if (edge.type === "calls") {
        const targetCost = this.nodeCosts.get(edge.targetId);
        if (targetCost) {
          childCosts.push(targetCost.cpuCostMs + targetCost.ioCostMs);
        }
      }
    }

    if (childCosts.length <= 1) return 0;

    childCosts.sort((a, b) => b - a);
    const sequentialCost = childCosts.reduce((a, b) => a + b, 0);
    const parallelCost = childCosts[0];

    return sequentialCost - parallelCost;
  }

  private detectFatHandlers(): FatHandlerInfo[] {
    const fatHandlers: FatHandlerInfo[] = [];

    for (const [, node] of this.graph.nodes) {
      if (node.type !== "function" && node.type !== "route") continue;
      if (!node.code.toLowerCase().includes("req") && !node.name.startsWith("handle")) continue;

      const operations: string[] = [];
      const code = node.code;

      this.collectOperations(node.id, operations, new Set());

      if (operations.length >= 3) {
        const estCost = operations.length * 50;
        fatHandlers.push({
          functionName: node.name,
          file: node.file,
          line: node.line,
          operationCount: operations.length,
          operations,
          estimatedCostMs: estCost,
        });
      }
    }

    return fatHandlers;
  }

  private collectOperations(nodeId: string, operations: string[], visited: Set<string>): void {
    if (visited.has(nodeId) || operations.length > 10) return;
    visited.add(nodeId);

    const node = this.graph.nodes.get(nodeId);
    if (!node) return;
    const codeLower = node.code.toLowerCase();

    const opPatterns: Record<string, string[]> = {
      "database query": ["find(", "findone(", "findmany(", "select ", "update(", "create("],
      "api call": ["fetch(", "axios.", "got("],
      "email": ["send", "mail"],
      "file write": ["writefile"],
      "file read": ["readfile"],
      "image process": ["sharp(", "jimp.", "resizeimage"],
    };

    for (const [op, patterns] of Object.entries(opPatterns)) {
      if (patterns.some(p => codeLower.includes(p))) {
        if (!operations.includes(op)) {
          operations.push(op);
        }
      }
    }

    if (codeLower.includes("await") && !codeLower.includes("promise.all")) {
      operations.push("sequential await");
    }

    const adjacency = this.graph.adjacency.get(nodeId);
    if (!adjacency) return;

    for (const edge of adjacency.out) {
      if (edge.type === "calls") {
        this.collectOperations(edge.targetId, operations, visited);
      }
    }
  }

  private detectDeadCode(): DeadCodeInfo[] {
    const deadCodes: DeadCodeInfo[] = [];

    for (const [nodeId, node] of this.graph.nodes) {
      if (node.type === "function" || node.type === "variable") {
        const code = node.code;
        const isExport = code.includes("export") || code.includes("module.exports");
        const isFunction = node.type === "function";
        const codeLower = code.toLowerCase();

        if (isFunction && !isExport) {
          const referenced = this.isReferenced(nodeId);
          if (!referenced) {
            const reason = node.name.startsWith("_")
              ? "Function prefixed with underscore suggests internal/private but is defined at module level"
              : "Function is defined but never called from any entry point or exported API";
            deadCodes.push({
              nodeId,
              name: node.name,
              file: node.file,
              line: node.line,
              code: code.substring(0, 200),
              reason,
            });
          }
        }

        if (
          code.includes("console.log") &&
          !code.includes("test") &&
          !code.includes("debug") &&
          !code.includes("dev")
        ) {
          if (!codeLower.includes("if") || !codeLower.includes("development")) {
            deadCodes.push({
              nodeId,
              name: node.name,
              file: node.file,
              line: node.line,
              code: code.substring(0, 200),
              reason: "console.log statement detected in non-development file — likely debug cruft",
            });
          }
        }
      }

      if (node.type === "conditional") {
        const condition = node.code;
        if (
          condition.includes("false") &&
          !condition.includes("true")
        ) {
          deadCodes.push({
            nodeId,
            name: node.name,
            file: node.file,
            line: node.line,
            code: condition.substring(0, 200),
            reason: "Dead branch: conditional always evaluates to false",
          });
        }
      }
    }

    return deadCodes.filter((dc, i, arr) => arr.findIndex((d) => d.nodeId === dc.nodeId) === i);
  }

  private isReferenced(nodeId: string): boolean {
    const adjacency = this.graph.adjacency.get(nodeId);
    if (!adjacency) return false;

    for (const edge of adjacency.in) {
      if (edge.type === "calls" || edge.type === "imports" || edge.type === "renders") {
        return true;
      }
    }

    for (const [, node] of this.graph.nodes) {
      if (node.code.includes(nodeId.replace("node-", "").split("-")[0]!) || node.code.includes(node.name)) {
        if (this.graph.adjacency.get(node.id)?.out.some((e) => e.targetId === nodeId || e.type === "calls")) {
          return true;
        }
      }
    }

    return false;
  }

  computeComplexityScore(node: CsgNode): {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    dependencyCount: number;
    score: number;
  } {
    const code = node.code;
    const decisionPoints = (code.match(/\bif\s*\(/g) || []).length +
      (code.match(/\belse\s+if\b/g) || []).length +
      (code.match(/\bswitch\s*\(/g) || []).length +
      (code.match(/\bcase\s+/g) || []).length +
      (code.match(/\bfor\s*\(/g) || []).length +
      (code.match(/\bwhile\s*\(/g) || []).length +
      (code.match(/\bcatch\s*\(/g) || []).length +
      (code.match(/\b&&\b/g) || []).length +
      (code.match(/\b\|\|\b/g) || []).length;

    const cyclomaticComplexity = Math.max(1, decisionPoints + 1);

    let cognitiveComplexity = 0;
    let nestingDepth = 0;
    for (const line of code.split("\n")) {
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;

      if (line.match(/\b(if|for|while|switch|catch)\b/)) {
        cognitiveComplexity += 1 + nestingDepth;
      }

      if (line.match(/\belse\s+if\b/)) {
        cognitiveComplexity += 1;
      }

      nestingDepth += opens - closes;
      nestingDepth = Math.max(0, nestingDepth);
    }

    const adjacency = this.graph.adjacency.get(node.id);
    const dependencyCount = adjacency ? adjacency.out.length : 0;

    const totalComplexity = (cyclomaticComplexity * 0.4) + (cognitiveComplexity * 0.4) + (dependencyCount * 0.2);
    const score = Math.min(100, Math.round(totalComplexity * 5));

    return { cyclomaticComplexity, cognitiveComplexity, dependencyCount, score };
  }

  estimateBundleImpact(nodeId: string): number {
    let total = 0;
    const visited = new Set<string>();
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const cost = this.nodeCosts.get(current);
      if (cost) {
        total += cost.bundleBytes;
      }

      const adjacency = this.graph.adjacency.get(current);
      if (adjacency) {
        for (const edge of adjacency.out) {
          if (edge.type === "imports") {
            queue.push(edge.targetId);
          }
        }
      }
    }

    return total;
  }

  hasComplexityRegressed(history: { timestamp: Date; complexityScore: number }[]): {
    regressed: boolean;
    growthRate: number;
    projectedDate: Date | null;
  } {
    if (history.length < 2) {
      return { regressed: false, growthRate: 0, projectedDate: null };
    }

    const sorted = [...history].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;

    const timeSpanMs = last.timestamp.getTime() - first.timestamp.getTime();
    const scoreDelta = last.complexityScore - first.complexityScore;

    if (timeSpanMs <= 0 || scoreDelta <= 0) {
      return { regressed: false, growthRate: 0, projectedDate: null };
    }

    const growthRatePerMs = scoreDelta / timeSpanMs;
    const growthRatePerDay = growthRatePerMs * 86400000;

    const regressed = growthRatePerDay > 1;

    let projectedDate: Date | null = null;
    if (growthRatePerMs > 0) {
      const msUntilThreshold = (100 - last.complexityScore) / growthRatePerMs;
      projectedDate = new Date(last.timestamp.getTime() + msUntilThreshold);
    }

    return { regressed, growthRate: Math.round(growthRatePerDay * 100) / 100, projectedDate };
  }
}

export function computeCostBreakdown(
  nodeCosts: NodeCost[],
  nodeId: string,
): {
  cpuOperations: number;
  databaseQueries: number;
  apiCalls: number;
  bundleSizeBytes: number;
  reactRenders: number;
  eventLoopBlockingMs: number;
  totalEstimatedMs: number;
} {
  const node = nodeCosts.find((n) => n.nodeId === nodeId);
  if (!node) {
    return {
      cpuOperations: 0,
      databaseQueries: 0,
      apiCalls: 0,
      bundleSizeBytes: 0,
      reactRenders: 0,
      eventLoopBlockingMs: 0,
      totalEstimatedMs: 0,
    };
  }

  const eventLoopBlockingMs = node.cpuCostMs + (node.ioCostMs > 0 ? node.ioCostMs : 0);

  return {
    cpuOperations: Math.round(node.cpuCostMs * 10),
    databaseQueries: node.dbQueryCount,
    apiCalls: node.apiCallCount,
    bundleSizeBytes: node.bundleBytes + node.dependencyBundleBytes,
    reactRenders: node.nodeType === "component" ? 1 : 0,
    eventLoopBlockingMs: Math.round(eventLoopBlockingMs * 100) / 100,
    totalEstimatedMs: Math.round((node.cpuCostMs + node.ioCostMs + node.dependencyCostMs) * 100) / 100,
  };
}

export function computeTotalCostBreakdown(nodeCosts: NodeCost[]): {
  cpuOperations: number;
  databaseQueries: number;
  apiCalls: number;
  bundleSizeBytes: number;
  reactRenders: number;
  eventLoopBlockingMs: number;
  totalEstimatedMs: number;
} {
  return nodeCosts.reduce(
    (acc, n) => ({
      cpuOperations: acc.cpuOperations + Math.round(n.cpuCostMs * 10),
      databaseQueries: acc.databaseQueries + n.dbQueryCount,
      apiCalls: acc.apiCalls + n.apiCallCount,
      bundleSizeBytes: acc.bundleSizeBytes + n.bundleBytes + n.dependencyBundleBytes,
      reactRenders: acc.reactRenders + (n.nodeType === "component" ? 1 : 0),
      eventLoopBlockingMs: acc.eventLoopBlockingMs + Math.round((n.cpuCostMs + n.ioCostMs) * 100) / 100,
      totalEstimatedMs: acc.totalEstimatedMs + Math.round((n.cpuCostMs + n.ioCostMs + n.dependencyCostMs) * 100) / 100,
    }),
    { cpuOperations: 0, databaseQueries: 0, apiCalls: 0, bundleSizeBytes: 0, reactRenders: 0, eventLoopBlockingMs: 0, totalEstimatedMs: 0 },
  );
}
