import crypto from "crypto";
import type {
  CombinedSemanticGraph,
  CsgNode,
  CsgEdge,
  VibeTaintFinding,
  TaintPath,
} from "./types.js";
import { sanitizers, sources, sinks } from "./sanitizers.js";

export interface TaintConfig {
  maxPathDepth: number;
  minConfidence: number;
  checkImplicitFlows: boolean;
  checkExplicitFlows: boolean;
  framework: string;
}

const DEFAULT_CONFIG: TaintConfig = {
  maxPathDepth: 20,
  minConfidence: 0.3,
  checkImplicitFlows: true,
  checkExplicitFlows: true,
  framework: "next",
};

export interface TaintResult {
  findings: VibeTaintFinding[];
  stats: {
    explicitPathsTraced: number;
    implicitPathsTraced: number;
    sanitizersApplied: number;
    totalTaintPaths: number;
    durationMs: number;
  };
}

export async function runTaintAnalysis(
  graph: CombinedSemanticGraph,
  config: Partial<TaintConfig> = {},
): Promise<TaintResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  const findings: VibeTaintFinding[] = [];
  let explicitPaths = 0;
  let implicitPaths = 0;
  let sanitizerCount = 0;

  const sourceNodes = findSourceNodes(graph);
  const sinkNodes = findSinkNodes(graph);

  if (cfg.checkExplicitFlows) {
    for (const srcNode of sourceNodes) {
      for (const sinkNode of sinkNodes) {
        const paths = forwardTaintCrawl(
          graph,
          srcNode,
          sinkNode,
          cfg.maxPathDepth,
          cfg.minConfidence,
          "explicit",
        );
        explicitPaths += paths.length;

        for (const path of paths) {
          const sanitized = checkSanitization(graph, path);
          if (sanitized) sanitizerCount++;

          findings.push({
            id: `taint-${crypto.randomUUID().slice(0, 8)}`,
            severity: sanitized ? "medium" : "high",
            title: `Unsanitized data flow from ${srcNode.name} to ${sinkNode.name}`,
            description: buildDescription(srcNode, sinkNode, path, sanitized),
            file: sinkNode.file,
            line: sinkNode.line,
            column: sinkNode.column,
            source: {
              file: srcNode.file,
              line: srcNode.line,
              column: srcNode.column,
              code: srcNode.code,
              name: srcNode.name,
            },
            sink: {
              file: sinkNode.file,
              line: sinkNode.line,
              column: sinkNode.column,
              code: sinkNode.code,
              name: sinkNode.name,
            },
            path,
            sanitized,
            confidence: path.confidence,
            framework: cfg.framework,
            ruleId: "VIBE-TAINT-E001",
          });
        }
      }
    }
  }

  if (cfg.checkImplicitFlows) {
    for (const sinkNode of sinkNodes) {
      const paths = backwardImplicitCrawl(
        graph,
        sinkNode,
        cfg.maxPathDepth,
        cfg.minConfidence,
      );
      implicitPaths += paths.length;

      for (const path of paths) {
        const sanitized = checkSanitization(graph, path);

        findings.push({
          id: `implicit-${crypto.randomUUID().slice(0, 8)}`,
          severity: sanitized ? "medium" : "critical",
          title: `Implicit flow controls ${sinkNode.name} at line ${sinkNode.line}`,
          description: `Sink '${sinkNode.name}' on line ${sinkNode.line} is implicitly controlled by a condition on line ${path.nodes[0]?.line ?? "unknown"} that depends on untrusted data.`,
          file: sinkNode.file,
          line: sinkNode.line,
          column: sinkNode.column,
          source: {
            file: path.nodes[0]?.file ?? sinkNode.file,
            line: path.nodes[0]?.line ?? sinkNode.line,
            column: path.nodes[0]?.column ?? sinkNode.column,
            code: path.nodes[0]?.code ?? "",
            name: path.nodes[0]?.name ?? "unknown",
          },
          sink: {
            file: sinkNode.file,
            line: sinkNode.line,
            column: sinkNode.column,
            code: sinkNode.code,
            name: sinkNode.name,
          },
          path,
          sanitized,
          confidence: path.confidence,
          framework: cfg.framework,
          ruleId: "VIBE-TAINT-I001",
        });
      }
    }
  }

  const uniqFindings = deduplicateFindings(findings);

  return {
    findings: uniqFindings,
    stats: {
      explicitPathsTraced: explicitPaths,
      implicitPathsTraced: implicitPaths,
      sanitizersApplied: sanitizerCount,
      totalTaintPaths: uniqFindings.length,
      durationMs: Date.now() - startTime,
    },
  };
}

function findSourceNodes(graph: CombinedSemanticGraph): CsgNode[] {
  const matched: CsgNode[] = [];
  for (const node of graph.nodes.values()) {
    for (const src of sources) {
      for (const pattern of src.patterns) {
        if (node.code && (node.code.includes(pattern) || node.name.includes(pattern))) {
          matched.push(node);
          break;
        }
      }
    }
  }
  return matched;
}

function findSinkNodes(graph: CombinedSemanticGraph): CsgNode[] {
  const matched: CsgNode[] = [];
  for (const node of graph.nodes.values()) {
    for (const snk of sinks) {
      for (const pattern of snk.patterns) {
        if (node.code && (node.code.includes(pattern) || node.name.includes(pattern))) {
          matched.push(node);
          break;
        }
      }
    }
  }
  return matched;
}

function forwardTaintCrawl(
  graph: CombinedSemanticGraph,
  source: CsgNode,
  sink: CsgNode,
  maxDepth: number,
  minConfidence: number,
  flowType: "explicit" | "implicit",
): TaintPath[] {
  const results: TaintPath[] = [];

  function dfs(
    current: CsgNode,
    visited: Set<string>,
    nodes: CsgNode[],
    edges: CsgEdge[],
    confidence: number,
  ): void {
    if (visited.has(current.id)) return;
    if (nodes.length > maxDepth) return;
    if (confidence < minConfidence) return;

    visited.add(current.id);
    nodes.push(current);

    if (current.id === sink.id && nodes.length >= 2) {
      results.push({
        nodes: [...nodes],
        edges: [...edges],
        confidence: confidence * 0.95,
        flowType,
      });
      visited.delete(current.id);
      nodes.pop();
      return;
    }

    const adj = graph.adjacency.get(current.id);
    if (adj) {
      for (const edge of adj.out) {
        if (flowType === "explicit" && edge.type !== "data_flow") continue;
        if (flowType === "implicit" && edge.type !== "control_flow") continue;

        const nextNode = graph.nodes.get(edge.targetId);
        if (nextNode && !visited.has(nextNode.id)) {
          edges.push(edge);
          dfs(nextNode, visited, nodes, edges, confidence * edge.confidence);
          edges.pop();
        }
      }
    }

    visited.delete(current.id);
    nodes.pop();
  }

  const initialVisited = new Set<string>();
  dfs(source, initialVisited, [], [], 1.0);

  return results;
}

function backwardImplicitCrawl(
  graph: CombinedSemanticGraph,
  sink: CsgNode,
  maxDepth: number,
  minConfidence: number,
): TaintPath[] {
  const results: TaintPath[] = [];

  function bfsBackward(): TaintPath[] {
    const paths: TaintPath[] = [];
    const queue: Array<{
      node: CsgNode;
      path: { nodes: CsgNode[]; edges: CsgEdge[]; confidence: number };
    }> = [];

    queue.push({ node: sink, path: { nodes: [sink], edges: [], confidence: 1.0 } });
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.path.nodes.length > maxDepth) continue;
      if (current.path.confidence < minConfidence) continue;

      const currentId = current.node.id;
      const adj = graph.adjacency.get(currentId);

      if (adj) {
        for (const edge of adj.in) {
          if (edge.type !== "control_flow") continue;

          const prevNode = graph.nodes.get(edge.sourceId);
          if (!prevNode || visited.has(prevNode.id)) continue;

          visited.add(prevNode.id);
          const newPath = {
            nodes: [prevNode, ...current.path.nodes],
            edges: [edge, ...current.path.edges],
            confidence: current.path.confidence * edge.confidence,
            flowType: "implicit" as const,
          };

          const isSource = checkIsSource(graph, prevNode);
          if (isSource) {
            paths.push(newPath);
          } else {
            queue.push({ node: prevNode, path: newPath });
          }
        }
      }
    }

    return paths;
  }

  return bfsBackward();
}

function checkIsSource(graph: CombinedSemanticGraph, node: CsgNode): boolean {
  for (const src of sources) {
    for (const pattern of src.patterns) {
      if (node.code && node.code.includes(pattern)) return true;
      if (node.name && node.name.includes(pattern)) return true;
    }
  }

  const adj = graph.adjacency.get(node.id);
  if (adj) {
    for (const edge of adj.in) {
      if (edge.type === "data_flow") {
        const srcNode = graph.nodes.get(edge.sourceId);
        if (srcNode && checkIsSource(graph, srcNode)) return true;
      }
    }
  }

  return false;
}

function checkSanitization(
  graph: CombinedSemanticGraph,
  path: TaintPath,
): boolean {
  for (const node of path.nodes) {
    for (const san of sanitizers) {
      for (const pattern of san.patterns) {
        if (node.code && node.code.includes(pattern)) return true;
        if (node.name && node.name.includes(pattern)) return true;
      }
    }

    const adj = graph.adjacency.get(node.id);
    if (adj) {
      for (const edge of adj.out) {
        if (edge.type === "data_flow") {
          const target = graph.nodes.get(edge.targetId);
          if (target) {
            for (const san of sanitizers) {
              for (const pattern of san.patterns) {
                if (target.code && target.code.includes(pattern)) return true;
              }
            }
          }
        }
      }
    }
  }
  return false;
}

function buildDescription(
  src: CsgNode,
  sink: CsgNode,
  path: TaintPath,
  sanitized: boolean,
): string {
  const flowType = path.flowType === "explicit" ? "data flow" : "control flow";
  const sanitizedStr = sanitized ? "(sanitized)" : "(UNSANITIZED)";
  const edgeCount = path.edges.length;
  return `Tainted ${flowType} path (${edgeCount} edges) from '${src.name}' at line ${src.line} to '${sink.name}' at line ${sink.line} ${sanitizedStr}`;
}

function deduplicateFindings(
  findings: VibeTaintFinding[],
): VibeTaintFinding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.file}:${f.line}:${f.sink.name}:${f.source.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
