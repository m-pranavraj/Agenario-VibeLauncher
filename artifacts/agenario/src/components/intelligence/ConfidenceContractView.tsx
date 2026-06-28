import React, { useState, useEffect } from "react";
import { CheckCircle2, CircleDashed, ShieldCheck, ChevronRight, Activity, ArrowRight, Loader2 } from "lucide-react";

export function ConfidenceContractView({ scan, isLight }: { scan: any, isLight: boolean }) {
  const [animating, setAnimating] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate the scanning animation for effect
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          setAnimating(false);
          return 100;
        }
        return p + 2;
      });
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      name: "Authentication Flow",
      target: "Users should sign up, verify email, login, and reach dashboard.",
      score: 95,
      steps: [
        { name: "Signup page exists", status: "pass" },
        { name: "Backend /register exists", status: "pass" },
        { name: "DB inserts user record", status: "pass" },
        { name: "Verification email triggered", status: "pass" },
        { name: "Token validation works", status: "pass" },
        { name: "Login authenticates", status: "pass" },
        { name: "Dashboard renders", status: "pass" },
      ]
    },
    {
      name: "Payments / Shopping Cart",
      target: "Users can add items, checkout, and DB updates order status.",
      score: 82,
      steps: [
        { name: "Cart state manages items", status: "pass" },
        { name: "Backend /checkout exists", status: "pass" },
        { name: "DB writes Order", status: "pass" },
        { name: "Stripe/Payment gateway mocked", status: "warn" },
        { name: "Payment webhook handles success", status: "fail" },
        { name: "Read Order works", status: "pass" },
        { name: "Permissions secure read", status: "pass" },
      ]
    }
  ];

  const renderStatusIcon = (status: string, index: number) => {
    const isRevealed = progress > (index * 10);
    if (!isRevealed) return <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />;
    
    if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === "warn") return <Activity className="w-4 h-4 text-amber-500" />;
    return <CircleDashed className="w-4 h-4 text-rose-500" />;
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 md:p-8 rounded-2xl border ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0a0a0f] border-white/10"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-6 h-6 text-indigo-500" />
              <h2 className={`font-black font-['Syne'] text-2xl ${isLight ? "text-slate-900" : "text-white"}`}>
                Confidence Contract
              </h2>
            </div>
            <p className={`text-sm ${isLight ? "text-slate-600" : "text-slate-400"} max-w-2xl leading-relaxed`}>
              Stop guessing if your code works. The Confidence Engine maps your stated product goals (e.g. "Users can sign up") directly to database writes, backend routes, and frontend state, verifying completion deterministically.
            </p>
          </div>
          
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-[10px] font-bold tracking-widest text-indigo-500 uppercase mb-1">Overall Confidence</span>
            <span className={`text-4xl font-black ${isLight ? "text-slate-900" : "text-white"}`}>
              88<span className="text-xl text-slate-500">%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {features.map((feature, idx) => (
          <div key={idx} className={`rounded-2xl border overflow-hidden ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#050508] border-white/[0.06]"}`}>
            <div className={`p-5 border-b ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/[0.06]"} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
              <div>
                <h3 className={`font-bold text-lg ${isLight ? "text-slate-900" : "text-white"}`}>{feature.name}</h3>
                <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>Goal: {feature.target}</p>
              </div>
              <div className="flex items-center gap-3 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 shrink-0">
                <span className="text-xs font-semibold text-indigo-500 uppercase">Production Ready</span>
                <span className="text-lg font-black text-indigo-500">{feature.score}%</span>
              </div>
            </div>
            
            <div className="p-6 overflow-x-auto">
              <div className="flex flex-col md:flex-row flex-wrap items-start gap-y-6 md:gap-y-8 relative min-w-max">
                {feature.steps.map((step, stepIdx) => {
                  const isLast = stepIdx === feature.steps.length - 1;
                  const isRevealed = progress > (stepIdx * 10);
                  
                  return (
                    <div key={stepIdx} className="flex items-center relative group w-full md:w-auto">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                          !isRevealed ? (isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/5") :
                          step.status === "pass" ? (isLight ? "border-emerald-500 bg-emerald-50" : "border-emerald-500/50 bg-emerald-500/20") :
                          step.status === "warn" ? (isLight ? "border-amber-500 bg-amber-50" : "border-amber-500/50 bg-amber-500/20") :
                          (isLight ? "border-rose-500 bg-rose-50" : "border-rose-500/50 bg-rose-500/20")
                        }`}>
                          {renderStatusIcon(step.status, stepIdx)}
                        </div>
                        <div className="mt-3 text-center w-28 hidden md:block">
                          <p className={`text-[10px] font-semibold leading-tight ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                            {step.name}
                          </p>
                        </div>
                      </div>
                      
                      {/* Desktop connector line */}
                      {!isLast && (
                        <div className="hidden md:flex items-center justify-center w-8 px-1">
                          <div className={`h-[2px] w-full transition-all duration-700 ${
                            !isRevealed ? (isLight ? "bg-slate-200" : "bg-white/10") :
                            step.status === "pass" ? "bg-emerald-500/50" :
                            "bg-amber-500/50"
                          }`} />
                          <ChevronRight className={`w-3 h-3 -ml-2 shrink-0 ${!isRevealed ? "text-slate-300" : "text-emerald-500"}`} />
                        </div>
                      )}
                      
                      {/* Mobile label next to node */}
                      <div className="ml-4 md:hidden flex-1">
                         <p className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                            {step.name}
                          </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
