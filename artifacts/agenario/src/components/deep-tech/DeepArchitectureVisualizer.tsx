import { useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, Controls, Node, Edge, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertTriangle, FileCode2 } from "lucide-react";

export function DeepArchitectureVisualizer({ issues, isLight }: { issues: any[], isLight: boolean }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Calculate exactly where the errors are to prove the topology
  const criticalFiles = new Set(issues.filter(i => i.severity === "critical" || i.severity === "high").map(i => i.filePath || "unknown"));

  useMemo(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];
    
    // Create Root Node
    initialNodes.push({
      id: "root",
      position: { x: 400, y: 50 },
      data: { 
        label: (
          <div className="flex flex-col items-center">
            <div className={`p-2 rounded-lg ${isLight ? "bg-slate-900" : "bg-white"} mb-2`}>
              <FileCode2 className={`w-5 h-5 ${isLight ? "text-white" : "text-slate-900"}`} />
            </div>
            <span className="font-bold text-sm">Application Root</span>
          </div>
        )
      },
      style: {
        background: isLight ? "#ffffff" : "#0f172a",
        border: `2px solid ${isLight ? "#e2e8f0" : "#334155"}`,
        borderRadius: "12px",
        padding: "15px",
        color: isLight ? "#0f172a" : "#f8fafc",
        width: 180,
      }
    });

    const fileMap = Array.from(new Set(issues.map(i => i.filePath).filter(Boolean)));
    
    fileMap.forEach((filePath, index) => {
      const isCritical = criticalFiles.has(filePath);
      const x = 100 + (index % 4) * 220;
      const y = 200 + Math.floor(index / 4) * 150;
      
      const fileName = (filePath || "").split('/').pop() || filePath;
      
      initialNodes.push({
        id: filePath!,
        position: { x, y },
        data: {
          label: (
            <div className="flex flex-col items-center relative">
              {isCritical && (
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)]">
                  <AlertTriangle className="w-3 h-3 text-white" />
                </div>
              )}
              <span className={`font-mono text-xs ${isCritical ? "text-red-600 dark:text-red-400 font-bold" : ""}`}>{fileName}</span>
            </div>
          )
        },
        style: {
          background: isCritical 
            ? (isLight ? "#fef2f2" : "rgba(239, 68, 68, 0.1)") 
            : (isLight ? "#f8fafc" : "#1e293b"),
          border: `1px solid ${isCritical ? "#ef4444" : (isLight ? "#cbd5e1" : "#475569")}`,
          borderRadius: "8px",
          padding: "10px",
          color: isLight ? "#334155" : "#cbd5e1",
          boxShadow: isCritical ? "0 0 20px rgba(239, 68, 68, 0.2)" : "none",
        }
      });

      initialEdges.push({
        id: `e-root-${filePath}`,
        source: "root",
        target: filePath!,
        animated: isCritical,
        style: { stroke: isCritical ? "#ef4444" : (isLight ? "#94a3b8" : "#475569"), strokeWidth: isCritical ? 2 : 1 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCritical ? "#ef4444" : (isLight ? "#94a3b8" : "#475569"),
        },
      });
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [issues, isLight]);

  return (
    <div className={`w-full h-[500px] rounded-xl overflow-hidden border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0a0a0a] border-white/10"}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        attributionPosition="bottom-right"
        className="w-full h-full"
      >
        <Background color={isLight ? "#cbd5e1" : "#333"} gap={16} />
        <Controls />
      </ReactFlow>
      <div className={`absolute bottom-4 left-4 p-3 rounded-lg border backdrop-blur-md ${isLight ? "bg-white/80 border-slate-200" : "bg-black/50 border-white/10"}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
          <span className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-white"}`}>Critical Logic Flaws</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full border ${isLight ? "border-slate-400" : "border-slate-600"}`}></div>
          <span className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>Verified Safe Nodes</span>
        </div>
      </div>
    </div>
  );
}
