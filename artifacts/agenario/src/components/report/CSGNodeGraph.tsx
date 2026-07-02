import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GitBranch,
  FunctionSquare,
  Zap,
  Shield,
  ShieldAlert,
  Lock,
  AlertTriangle,
  ArrowRight,
  Bug,
} from "lucide-react";

const ENTRY_NODE_COLOR = "#10b981";
const CRITICAL_EDGE_COLOR = "#ef4444";
const NORMAL_EDGE_COLOR = "#6366f1";
const NODE_BG = "#0f172a";
const ENTRY_BG = "#052e16";
const CRITICAL_BG = "#450a0a";

interface CfgEdge {
  source: string;
  target: string;
  isCritical?: boolean;
}

interface CfgNodeData {
  label: string;
  functionName: string;
  isEntry?: boolean;
  isSink?: boolean;
  severity?: string;
  filePath?: string;
  lineNumber?: number;
}

interface CSGNodeGraphProps {
  callGraph?: {
    nodes?: CfgNodeData[];
    edges?: CfgEdge[];
    criticalPaths?: string[][];
  };
  scanIssues?: Array<{
    agentName?: string;
    functionName?: string;
    filePath?: string;
    severity?: string;
  }>;
  maxDepth?: number;
  height?: number;
}

const SEVERITY_ICON: Record<string, any> = {
  critical: ShieldAlert,
  high: AlertTriangle,
  medium: Bug,
  low: Shield,
};

function severityColor(severity?: string): string {
  switch (severity) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    case "low": return "#3b82f6";
    default: return "#94a3b8";
  }
}

export function CSGNodeGraph({
  callGraph,
  scanIssues = [],
  maxDepth = 20,
  height = 520,
}: CSGNodeGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const nds: Node[] = [];
    const edgs: Edge[] = [];

    if (!callGraph || !callGraph.nodes || callGraph.nodes.length === 0) {
      nds.push({
        id: "cfg-empty",
        position: { x: 180, y: 200 },
        data: { label: "No CSG call graph data — run deep tech analysis", functionName: "" },
        style: {
          background: NODE_BG,
          color: "#94a3b8",
          border: "1px dashed #334155",
          borderRadius: 10,
          padding: "12px 20px",
          fontSize: "11px",
          fontFamily: "monospace",
          textAlign: "center",
          width: 320,
        },
      });
      return { nodes: nds, edges: edgs };
    }

    const graphNodes = callGraph.nodes.slice(0, maxDepth);
    const graphEdges = callGraph.edges || [];
    const criticalPathSet = new Set<string>();
    (callGraph.criticalPaths || []).forEach((path) => {
      path.forEach((nodeId) => criticalPathSet.add(nodeId));
    });
    const issueFnSet = new Set(
      scanIssues.filter((i) => i.functionName).map((i) => i.functionName!)
    );
    const H_SPACE = 280;
    const V_SPACE = 90;
    const cols = Math.ceil(Math.sqrt(graphNodes.length));
    const rows = Math.ceil(graphNodes.length / cols);

    graphNodes.forEach((gn, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = col * H_SPACE + 60;
      const y = row * V_SPACE + 30;
      const isCritical = criticalPathSet.has(gn.functionName);
      const hasIssue = issueFnSet.has(gn.functionName);
      const isEntry = gn.isEntry;
      const isSink = gn.isSink;

      let bg = NODE_BG;
      let border = "#1e293b";
      let text = "#e2e8f0";
      if (isEntry) { bg = ENTRY_BG; border = "#10b981"; text = "#6ee7b7"; }
      else if (isSink) { bg = CRITICAL_BG; border = "#ef4444"; text = "#fca5a5"; }
      else if (isCritical) { bg = "#2d0a0a"; border = "#ef4444"; text = "#fca5a5"; }
      else if (hasIssue) { bg = "#1c1917"; border = "#f97316"; text = "#fdba74"; }

      const Icon = isEntry ? Shield : isSink ? ShieldAlert : hasIssue ? AlertTriangle : FunctionSquare;
      const labelText = gn.label || gn.functionName;
      const sublabel = isCritical && !isSink ? "⚠ CRITICAL PATH" : "";

      nds.push({
        id: gn.functionName,
        position: { x, y },
        data: { label: labelText, functionName: gn.functionName, isEntry, isSink, severity: gn.severity, filePath: gn.filePath, lineNumber: gn.lineNumber },
        style: {
          background: bg,
          color: text,
          border: `2px solid ${border}`,
          borderRadius: 10,
          padding: "10px 14px",
          fontSize: "10px",
          fontWeight: 600,
          fontFamily: "monospace",
          minWidth: 130,
          textAlign: "center",
          boxShadow: isCritical ? `0 0 12px ${border}40` : isSink ? `0 0 12px ${border}40` : "none",
        },
      });

      if (sublabel) {
        nds.push({
          id: `sub-${gn.functionName}`,
          position: { x: x - 10, y: y - 20 },
          data: { label: sublabel },
          style: {
            background: "transparent",
            color: "#ef4444",
            fontSize: "7px",
            fontFamily: "monospace",
            fontWeight: 800,
            letterSpacing: "0.08em",
            padding: 0,
            border: "none",
            width: 150,
          },
        });
      }
    });

    const addedEdgeIds = new Set<string>();
    graphEdges.forEach((edg, i) => {
      const isCriticalEdge = criticalPathSet.has(edg.source) && criticalPathSet.has(edg.target);
      const edgeId = `cfg-${edg.source}-${edg.target}-${i}`;
      if (addedEdgeIds.has(edgeId)) return;
      addedEdgeIds.add(edgeId);
      edgs.push({
        id: edgeId,
        source: edg.source,
        target: edg.target,
        type: "smoothstep",
        style: {
          stroke: isCriticalEdge ? CRITICAL_EDGE_COLOR : NORMAL_EDGE_COLOR,
          strokeWidth: isCriticalEdge ? 2.5 : 1.5,
          opacity: isCriticalEdge ? 0.9 : 0.5,
          strokeDasharray: isCriticalEdge ? undefined : "4 2",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCriticalEdge ? CRITICAL_EDGE_COLOR : NORMAL_EDGE_COLOR,
          width: 10,
          height: 10,
        },
        animated: isCriticalEdge,
      });
    });

    return { nodes: nds, edges: edgs };
  }, [callGraph, scanIssues, maxDepth]);

  const totalNodes = callGraph?.nodes?.length || 0;
  const totalEdges = callGraph?.edges?.length || 0;
  const criticalPathsCount = callGraph?.criticalPaths?.length || 0;

  return (
    <div className={`rounded-2xl border overflow-hidden ${false ? "bg-white border-gray-200" : "bg-[#0a0a0f] border-white/10"}`}>
      <div className={`px-5 py-3.5 border-b flex items-center gap-3 bg-white/[0.02] border-white/[0.06]`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/15 border border-violet-500/25">
          <GitBranch className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold font-['Syne'] text-white">CSG Call Stack Graph</h3>
          <p className="text-[10px] text-white/40">
            {totalNodes} function{totalNodes !== 1 ? "s" : ""} · {totalEdges} call edges
            {criticalPathsCount > 0 && <span className="text-red-400 ml-1.5">• {criticalPathsCount} critical path{criticalPathsCount !== 1 ? "s" : ""}</span>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {[
            { label: "Entry", color: "#10b981" },
            { label: "Normal", color: "#6366f1" },
            { label: "Critical", color: "#ef4444" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className="text-[9px] font-medium text-white/30">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height }} className="w-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.4 }}
          panOnDrag
          zoomOnScroll
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background color="#1e293b" gap={24} size={1} style={{ opacity: 0.4 }} />
          <Controls
            showInteractive={false}
            style={{
              background: "rgba(17,24,39,0.9)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
            }}
          />
        </ReactFlow>
      </div>

      <div className="px-4 py-2.5 border-t border-white/[0.05] bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-white/20">
            🟢 Entry points · ⚠ Red edges = critical call paths · dashed = non-critical
          </span>
          <span className="text-[9px] font-mono text-white/20">
            Click &amp; drag to pan · Scroll to zoom
          </span>
        </div>
      </div>
    </div>
  );
}
