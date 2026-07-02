import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Server,
  Database,
  Globe,
  Lock,
  Zap,
  AlertTriangle,
  XCircle,
} from "lucide-react";

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string; edge: string }> = {
  critical: { bg: "#7f1d1d", border: "#dc2626", text: "#fca5a5", edge: "#ef4444" },
  high: { bg: "#7c2d12", border: "#f97316", text: "#fdba74", edge: "#f97316" },
  medium: { bg: "#713f12", border: "#eab308", text: "#fde047", edge: "#eab308" },
  low: { bg: "#172554", border: "#3b82f6", text: "#93c5fd", edge: "#3b82f6" },
  info: { bg: "#1e293b", border: "#475569", text: "#94a3b8", edge: "#64748b" },
  clean: { bg: "#052e16", border: "#22c55e", text: "#86efac", edge: "#22c55e" },
};

const NODE_TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  source: { label: "Source", icon: Globe, color: "#f59e0b" },
  sanitizer: { label: "Sanitizer", icon: ShieldCheck, color: "#22c55e" },
  sink: { label: "Sink", icon: AlertTriangle, color: "#ef4444" },
};

interface TaintPath {
  id: string;
  source: string;
  sourceType?: string;
  sinks?: { name: string; severity?: string }[];
  sanitizers?: string[];
  severity?: string;
  filePath?: string;
  lineNumber?: number;
}

interface TaintFlowVisualizerProps {
  taintPaths?: TaintPath[];
  crossLanguageFindings?: Array<{
    id: string;
    title?: string;
    severity?: string;
    description?: string;
    filePath?: string;
    lineNumber?: number;
  }>;
  entropyLeaks?: Array<{ patternType?: string; severity?: string; file?: string; line?: number }>;
  maxPaths?: number;
  height?: number;
}

const RISK_LEVEL_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#64748b",
};

export function TaintFlowVisualizer({
  taintPaths = [],
  crossLanguageFindings = [],
  entropyLeaks = [],
  maxPaths = 8,
  height = 480,
}: TaintFlowVisualizerProps) {
  const isLight = false;

  const { nodes, edges } = useMemo(() => {
    const nds: Node[] = [];
    const edgs: Edge[] = [];
    let yOffset = 0;
    const H_SPACING = 320;
    const V_SPACING = 100;
    let nodeId = 0;

    const paths = taintPaths.slice(0, maxPaths);

    paths.forEach((path, pIdx) => {
      if (pIdx > 0) yOffset += V_SPACING;
      const xCenter = 180;
      const yStart = yOffset;
      const sev = path.severity || "medium";
      const riskColor = RISK_LEVEL_COLOR[sev] || "#eab308";

      const sourceId = `source-${pIdx}`;
      nds.push({
        id: sourceId,
        type: "tautNode",
        position: { x: xCenter - 120, y: yStart },
        data: {
          label: path.source || "req.body",
          nodeType: "source",
          severity: "clean",
          filePath: path.filePath,
          lineNumber: path.lineNumber,
        },
        style: {
          background: "#1c1917",
          color: "#fbbf24",
          border: "2px solid #f59e0b",
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "10px",
          fontWeight: 700,
          fontFamily: "monospace",
          minWidth: 100,
          textAlign: "center",
        },
      });
      nodeId++;

      const sanitizers = path.sanitizers || [];
      const sinks = path.sinks || [];
      const allIntermediates = [...sanitizers.map((s, si) => ({ name: s, type: "sanitizer" as const, idx: si }))];
      const totalNodes = allIntermediates.length + sinks.length;

      allIntermediates.forEach((san, idx) => {
        const prevId = idx === 0 ? sourceId : `san-${pIdx}-${idx - 1}`;
        const sanId = `san-${pIdx}-${idx}`;
        const x = xCenter - 40 + idx * 90;
        nds.push({
          id: sanId,
          position: { x, y: yStart + 60 },
          data: { label: san.name, nodeType: "sanitizer" },
          style: {
            background: "#022c22",
            color: "#6ee7b7",
            border: "2px solid #22c55e",
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "9px",
            fontWeight: 600,
            fontFamily: "monospace",
            textAlign: "center",
          },
        });
        edgs.push({
          id: `e-src-san-${pIdx}-${idx}`,
          source: prevId,
          target: sanId,
          type: "smoothstep",
          style: { stroke: "#22c55e", strokeWidth: 1.5, opacity: 0.7 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e", width: 10, height: 10 },
        });
      });

      sinks.forEach((sink, sIdx) => {
        const prevId = allIntermediates.length === 0 ? sourceId : `san-${pIdx}-${allIntermediates.length - 1}`;
        const sinkId = `sink-${pIdx}-${sIdx}`;
        const x = xCenter + 100 + sIdx * 90;
        const sinkSeverity = sink.severity || sev;
        const sinkEdgeColor = RISK_LEVEL_COLOR[sinkSeverity] || "#ef4444";
        nds.push({
          id: sinkId,
          position: { x, y: yStart + 130 },
          data: { label: sink.name, nodeType: "sink", severity: sinkSeverity || "high" },
          style: {
            background: "#450a0a",
            color: "#fca5a5",
            border: `2px solid ${sinkEdgeColor}`,
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "9px",
            fontWeight: 700,
            fontFamily: "monospace",
            textAlign: "center",
            boxShadow: `0 0 8px ${sinkEdgeColor}40`,
          },
        });
        edgs.push({
          id: `e-to-sink-${pIdx}-${sIdx}`,
          source: prevId,
          target: sinkId,
          type: "smoothstep",
          style: { stroke: sinkEdgeColor, strokeWidth: 2, opacity: 0.85 },
          markerEnd: { type: MarkerType.ArrowClosed, color: sinkEdgeColor, width: 10, height: 10 },
          animated: true,
        });
      });

      const lastNodeId = sinks.length > 0 ? `sink-${pIdx}-${sinks.length - 1}` : (allIntermediates.length > 0 ? `san-${pIdx}-${allIntermediates.length - 1}` : sourceId);
      const riskBadge = `risk-${pIdx}`;
      nds.push({
        id: riskBadge,
        type: "badge",
        position: { x: xCenter + 220, y: yStart + 30 },
        data: { label: `${sev.toUpperCase()}` },
        style: {
          background: `${riskColor}20`,
          color: riskColor,
          border: `1px solid ${riskColor}50`,
          borderRadius: "4px",
          padding: "3px 6px",
          fontSize: "8px",
          fontWeight: 800,
          fontFamily: "monospace",
          letterSpacing: "0.05em",
        },
      });
      edgs.push({
        id: `e-badge-${pIdx}`,
        source: sourceId,
        target: riskBadge,
        type: "step",
        style: { stroke: riskColor, strokeWidth: 1, strokeDasharray: "3 3", opacity: 0.4 },
      });
      yOffset += V_SPACING + 10;
    });

    if (paths.length === 0) {
      crossLanguageFindings.slice(0, 3).forEach((f, i) => {
        const sev = f.severity || "high";
        const col = RISK_LEVEL_COLOR[sev] || "#f97316";
        nds.push({
          id: `xf-${i}-src`,
          position: { x: 80 + i * 280, y: 20 },
          data: { label: f.filePath?.split("/").pop() || f.title || "Boundary", nodeType: "source" },
          style: { background: "#1c1917", color: "#fbbf24", border: "2px solid #f59e0b", borderRadius: 8, padding: "6px 10px", fontSize: "9px", fontFamily: "monospace", textAlign: "center" },
        });
        nds.push({
          id: `xf-${i}-sink`,
          position: { x: 80 + i * 280, y: 140 },
          data: { label: "Unsanitized Sink", nodeType: "sink", severity: sev },
          style: { background: "#450a0a", color: "#fca5a5", border: `2px solid ${col}`, borderRadius: 8, padding: "6px 10px", fontSize: "9px", fontFamily: "monospace", textAlign: "center", boxShadow: `0 0 8px ${col}40` },
        });
        edgs.push({
          id: `e-xf-${i}`,
          source: `xf-${i}-src`,
          target: `xf-${i}-sink`,
          type: "smoothstep",
          style: { stroke: col, strokeWidth: 2, opacity: 0.85 },
          markerEnd: { type: MarkerType.ArrowClosed, color: col, width: 10, height: 10 },
          animated: true,
          label: sev,
          labelStyle: { fill: col, fontSize: 9, fontWeight: 700 },
        });
      });
    }

    if (paths.length === 0 && crossLanguageFindings.length === 0) {
      nds.push(
        {
          id: "nostate-1",
          position: { x: 180, y: 60 },
          data: { label: "No taint paths detected", nodeType: "clean" },
          style: { background: "transparent", color: "#94a3b8", border: "1px dashed #334155", borderRadius: 8, padding: "12px 20px", fontSize: "12px", fontFamily: "monospace", textAlign: "center", width: 300 },
        }
      );
    }

    return { nodes: nds, edges: edgs };
  }, [taintPaths, crossLanguageFindings, maxPaths]);

  const totalPaths = taintPaths.length;
  const criticalCount = taintPaths.filter((p) => p.severity === "critical").length;
  const highCount = taintPaths.filter((p) => p.severity === "high").length;

  return (
    <div className={`rounded-2xl border overflow-hidden ${isLight ? "bg-white border-gray-200" : "bg-[#0a0a0f] border-white/10"}`}>
      <div className={`px-5 py-3.5 border-b flex items-center gap-3 ${isLight ? "border-gray-100 bg-gray-50/50" : "border-white/[0.06] bg-white/[0.02]"}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-amber-100 border border-amber-200" : "bg-amber-500/15 border border-amber-500/25"}`}>
          <Activity className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h3 className={`text-sm font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>Taint Flow Visualizer</h3>
          <p className={`text-[10px] ${isLight ? "text-gray-400" : "text-white/40"}`}>
            {totalPaths} path{totalPaths !== 1 ? "s" : ""} traced
            {criticalCount > 0 && <span className="text-red-400 ml-1.5">• {criticalCount} critical</span>}
            {highCount > 0 && <span className="text-orange-400 ml-1.5">• {highCount} high</span>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {[
            { label: "Source", color: "#fbbf24" },
            { label: "Sanitizer", color: "#6ee7b7" },
            { label: "Sink", color: "#fca5a5" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className={`text-[9px] font-medium ${isLight ? "text-gray-400" : "text-white/30"}`}>{l.label}</span>
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
          <Background color={isLight ? "#e5e7eb" : "#1e293b"} gap={20} size={1} style={{ opacity: 0.4 }} />
          <Controls
            showInteractive={false}
            style={{
              background: isLight ? "rgba(255,255,255,0.9)" : "rgba(17,24,39,0.9)",
              border: isLight ? "1px solid #e5e7eb" : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
            }}
          />
        </ReactFlow>
      </div>

      <div className={`px-4 py-2.5 border-t flex items-center justify-between ${isLight ? "border-gray-100 bg-gray-50/50" : "border-white/[0.05] bg-white/[0.01]"}`}>
        <span className={`text-[9px] font-mono ${isLight ? "text-gray-400" : "text-white/20"}`}>
          ⚠ Source → [Sanitizer] → Sink · Edges: amber=clean · red=unprotected
        </span>
        <span className={`text-[9px] font-mono ${isLight ? "text-gray-400" : "text-white/20"}`}>
          Showing {Math.min(totalPaths, maxPaths)} of {totalPaths}
        </span>
      </div>
    </div>
  );
}
