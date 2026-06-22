import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, type Node as RFNode, type Edge as RFEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Activity } from 'lucide-react';

interface GraphVisualizerProps {
  isImplicitFlow: boolean;
  sourceLabel?: string;
  sinkLabel?: string;
}

export const RtIfcGraphVisualizer: React.FC<GraphVisualizerProps> = ({ isImplicitFlow, sourceLabel, sinkLabel }) => {
  
  const nodes: RFNode[] = useMemo(() => [
    {
      id: 'source',
      type: 'default',
      position: { x: 50, y: 50 },
      data: { label: sourceLabel || 'Taint Source' },
      style: { background: '#1e293b', color: '#f87171', border: '1px solid #7f1d1d', borderRadius: '8px', fontSize: '12px' },
    },
    {
      id: 'gate',
      type: 'default',
      position: { x: 250, y: 50 },
      data: { label: isImplicitFlow ? 'if (condition)' : 'Data Transformation' },
      style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' },
    },
    {
      id: 'sink',
      type: 'default',
      position: { x: 450, y: 50 },
      data: { label: sinkLabel || 'External Sink' },
      style: { background: '#1e293b', color: '#fb923c', border: '1px solid #9a3412', borderRadius: '8px', fontSize: '12px' },
    }
  ], [isImplicitFlow, sourceLabel, sinkLabel]);

  const edges: RFEdge[] = useMemo(() => [
    {
      id: 'e1',
      source: 'source',
      target: 'gate',
      animated: true,
      label: 'data_flow',
      style: { stroke: '#ef4444', strokeWidth: 2 },
    },
    {
      id: 'e2',
      source: 'gate',
      target: 'sink',
      animated: true,
      label: isImplicitFlow ? 'control_flow' : 'data_flow',
      style: { stroke: isImplicitFlow ? '#a855f7' : '#ef4444', strokeWidth: 2, strokeDasharray: isImplicitFlow ? '5,5' : 'none' },
      labelStyle: { fill: isImplicitFlow ? '#a855f7' : '#ef4444', fontWeight: 'bold' }
    }
  ], [isImplicitFlow]);

  return (
    <div className="mt-4 bg-slate-900/50 rounded-lg p-5 border border-rose-500/30">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-rose-400" />
        <h4 className="text-sm font-semibold text-rose-300 uppercase tracking-wider">
          RT-IFC / CSG Traversal Proof
        </h4>
      </div>
      
      <div className="h-40 bg-slate-950/80 rounded-md border border-slate-800 overflow-hidden relative">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background color="#334155" gap={16} />
        </ReactFlow>
      </div>
      
      {isImplicitFlow && (
        <div className="mt-3 text-xs text-purple-400 bg-purple-950/30 p-2 rounded border border-purple-900/50">
          <strong>Implicit Flow Detected:</strong> The system identified a control-dependency edge where the evaluation of tainted data indirectly influences the sink. Standard data-flow analyzers miss this.
        </div>
      )}
    </div>
  );
};
