import React from 'react';
import { Network, Database, Zap, Sparkles } from 'lucide-react';

interface DempsterShaferProps {
  engineConfidence: number;
  aiConfidence: number;
  finalConfidence: number;
  aiContext: string;
}

export const DempsterShaferVisualizer: React.FC<DempsterShaferProps> = ({
  engineConfidence,
  aiConfidence,
  finalConfidence,
  aiContext
}) => {
  const m1_A = engineConfidence / 100;
  const m2_A = aiConfidence / 100;
  
  return (
    <div className="mt-4 bg-slate-900/50 rounded-lg p-5 border border-indigo-500/30">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-indigo-400" />
        <h4 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider">
          Dempster-Shafer Mathematical Evidence Fusion
        </h4>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-slate-950/50 p-4 rounded-md border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase mb-2">
            <Database className="w-4 h-4" />
            <span>Static Engine Mass (m₁)</span>
          </div>
          <div className="text-2xl font-mono text-slate-200">{(m1_A).toFixed(2)}</div>
          <div className="text-xs text-slate-500 mt-1">m₁(Θ) = {(1 - m1_A).toFixed(2)}</div>
        </div>

        <div className="bg-slate-950/50 p-4 rounded-md border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase mb-2">
            <Network className="w-4 h-4" />
            <span>LLM Context Mass (m₂)</span>
          </div>
          <div className="text-2xl font-mono text-slate-200">{(m2_A).toFixed(2)}</div>
          <div className="text-xs text-slate-500 mt-1">m₂(Θ) = {(1 - m2_A).toFixed(2)}</div>
        </div>

        <div className="bg-indigo-950/30 p-4 rounded-md border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Zap className="w-12 h-12" />
          </div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs uppercase mb-2 relative z-10">
            <Sparkles className="w-4 h-4" />
            <span>Orthogonal Sum (Combined)</span>
          </div>
          <div className="text-3xl font-bold font-mono text-indigo-400 relative z-10">{finalConfidence}%</div>
          <div className="text-xs text-indigo-300/60 mt-1 relative z-10">Probability of True Positive</div>
        </div>
      </div>

      <div className="bg-slate-950/50 p-4 rounded-md border border-slate-800 font-mono text-xs text-slate-300">
        <div className="text-indigo-400 mb-2">Formal Proof & Equation:</div>
        <div className="mb-2 text-slate-500">
          m₁₂(A) = (m₁(A) * m₂(A)) + (m₁(A) * m₂(Θ)) + (m₁(Θ) * m₂(A)) / (1 - K)
        </div>
        <div className="leading-relaxed whitespace-pre-wrap text-emerald-400/90 bg-emerald-950/20 p-3 rounded border border-emerald-900/50">
          {aiContext}
        </div>
      </div>
    </div>
  );
};
