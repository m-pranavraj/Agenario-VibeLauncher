/**
 * Roadmap to Real System — honest assessment of what's currently real vs
 * what needs work, with a phased plan to make every component production-grade.
 *
 * This page shows:
 * 1. What's REAL (mathematically verified, compiler-backed, no LLM dependency)
 * 2. What's PARTIAL (works but has LLM dependency or gaps)
 * 3. What's PLANNED (not yet built)
 * 4. Phase-by-phase roadmap with concrete deliverables
 */

import { useState } from "react";
import { useRoute, Link } from "wouter";
import { CheckCircle2, XCircle, AlertTriangle, Clock, ArrowRight, Shield, Cpu, Eye, Zap, FileCheck, Lock, Globe, Activity, Crown, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type ComponentStatus = "real" | "partial" | "planned";

interface Component {
  name: string;
  status: ComponentStatus;
  description: string;
  tech: string;
  proof?: string;
  gap?: string;
}

const REAL_COMPONENTS: Component[] = [
  { name: "AST Merkle Hasher", status: "real", description: "SHA-256 Merkle tree over normalized source lines", tech: "Node.js crypto", proof: "Deterministic hash output, verifiable independently" },
  { name: "Graph Resilience Scorer", status: "real", description: "Tarjan SCC + BFS betweenness centrality on module graph", tech: "Graph theory algorithms", proof: "Mathematically proven SCC detection, measurable betweenness" },
  { name: "Reward Loop Detector", status: "real", description: "Pattern-based detection of gamification anti-patterns", tech: "Regex + AST pattern matching", proof: "Deterministic pattern matching, no LLM required" },
  { name: "Async Resilience Checker", status: "real", description: "Detects retry/timeout/caching/offline patterns", tech: "AST pattern matching", proof: "Weighted scoring based on detected patterns" },
  { name: "Memory Operation Counter", status: "real", description: "Counts allocations, deallocations, mutations at source level", tech: "Regex + line counting", proof: "Deterministic counts from source analysis" },
  { name: "Crypto Agility Checker", status: "real", description: "Detects weak crypto (MD5, SHA1, DES, RC4), hardcoded secrets", tech: "Pattern matching + entropy detection", proof: "Deterministic detection of known-weak algorithms" },
  { name: "Static Secret Scanner", status: "real", description: "Detects API keys, tokens, passwords in source", tech: "Entropy analysis + pattern matching", proof: "Shannon entropy + regex, no LLM" },
  { name: "SQL Injection Detector", status: "real", description: "Detects string concatenation in SQL queries", tech: "AST analysis + taint tracking", proof: "Data-flow analysis from source to sink" },
  { name: "XSS Detector", status: "real", description: "Detects innerHTML, document.write, eval usage", tech: "AST pattern matching", proof: "Deterministic sink detection" },
  { name: "IDOR Detector", status: "real", description: "Detects direct object references without auth checks", tech: "Route analysis + auth pattern detection", proof: "Structural pattern matching" },
  { name: "CORS Misconfiguration", status: "real", description: "Detects wildcard origins, missing headers", tech: "Pattern matching on middleware config", proof: "Deterministic config analysis" },
  { name: "Dependency Vulnerability Scan", status: "real", description: "Checks package.json against known CVE patterns", tech: "Version range matching", proof: "Deterministic version comparison" },
  { name: "Tensor Feature Hasher", status: "real", description: "CPU-optimized AST fingerprinting using Float32Array + Merkle-Damgård", tech: "Node.js crypto + typed arrays", proof: "Deterministic hash output" },
  { name: "Post-Quantum Readiness", status: "real", description: "Detects algorithms vulnerable to Shor's/Grover's quantum attacks", tech: "Pattern matching + NIST migration paths", proof: "Deterministic detection of known-weak algorithms" },
  { name: "Circular Dependency Detector", status: "real", description: "DFS-based cycle detection on module import graph", tech: "Graph theory DFS", proof: "Mathematically correct cycle detection" },
  { name: "Complexity Drift Tracker", status: "real", description: "Cyclomatic complexity, god modules, file size analysis", tech: "Pattern counting + distribution analysis", proof: "Deterministic metrics from source" },
];

const PARTIAL_COMPONENTS: Component[] = [
  { name: "Playwright Browser Sandbox", status: "partial", description: "Real Chromium screenshots + video, but requires Chromium binary on host", tech: "playwright-core", proof: "Real browser automation", gap: "Needs Chromium install on deployment host" },
  { name: "AI Code Analysis Agents", status: "partial", description: "LLM-powered analysis for complex security findings", tech: "Groq/OpenAI/Claude", proof: "Real LLM output, but hallucination risk", gap: "LLM dependency, not deterministic" },
  { name: "Remediation Engine", status: "partial", description: "Rule-based + AI patch generation, sandbox testing", tech: "Pattern matching + LLM", proof: "Real patches for common issues", gap: "Complex issues need LLM, sandbox needs Chromium" },
  { name: "Revenue Intelligence", status: "partial", description: "Estimates revenue impact from security issues", tech: "Heuristic scoring", proof: "Based on real issue severity + category", gap: "Estimates, not actual revenue data" },
  { name: "Product Hunt Readiness", status: "partial", description: "Checks launch readiness based on issue counts", tech: "Weighted scoring", proof: "Deterministic scoring from real findings", gap: "Subjective weights" },
];

const PLANNED_COMPONENTS: Component[] = [
  { name: "WebGPU Tensor Hashing", status: "planned", description: "GPU-accelerated AST feature hashing (CPU version already built)", tech: "WebGPU compute shaders", gap: "GPU access required — not available on 512MB Render" },
  { name: "ZK-SNARK Proofs (snarkjs)", status: "planned", description: "Real zero-knowledge proofs of code properties", tech: "snarkjs + circom circuits", gap: "Circuit design needed per property" },
  { name: "SMT Solver Integration (Z3)", status: "planned", description: "Formal verification of code paths via SAT solving (DPLL engine already built)", tech: "z3-solver WASM", gap: "WASM bundle + constraint extraction" },
  { name: "BFT Chaos Analysis", status: "planned", description: "Analyze module failures and measure cascade effects", tech: "Graph algorithms + Monte Carlo", gap: "Not yet implemented" },
];

const ROADMAP_PHASES = [
  {
    phase: "Phase 1",
    title: "Foundation (Current)",
    status: "active",
    items: [
      "All static analysis engines (real, deterministic)",
      "AST Merkle hashing (real crypto)",
      "Graph resilience scoring (real graph theory)",
      "Pattern-based security detection (real)",
      "Basic Playwright screenshots (real, needs Chromium)",
    ],
  },
  {
    phase: "Phase 2",
    title: "Verification Hardening",
    status: "next",
    items: [
      "Chromium headless shell in Docker (build-time install)",
      "Real video recording of exploit proofs",
      "HTTP probe engine (13+ endpoint checks)",
      "Sandbox app execution (npm install + run)",
      "Evidence tier system (T1-T5 with real data)",
    ],
  },
  {
    phase: "Phase 3",
    title: "Formal Methods",
    status: "planned",
    items: [
      "WebGPU tensor hashing for large codebases",
      "SMT solver integration (Z3 WASM) for path verification",
      "BFT chaos analysis on module graph",
      "Real ZK-SNARK proofs via snarkjs (circuit per property)",
      "Abstract interpretation confidence scoring",
    ],
  },
  {
    phase: "Phase 4",
    title: "Automation & CI/CD",
    status: "planned",
    items: [
      "Automated test file generation from findings",
      "GitHub Actions integration with SARIF output",
      "GitLab CI / Jenkins plugins",
      "Pre-commit hooks for real-time scanning",
      "Regression detection (compare scans over time)",
    ],
  },
  {
    phase: "Phase 5",
    title: "Full Autonomy",
    status: "planned",
    items: [
      "Self-healing code (auto-apply verified patches)",
      "Continuous monitoring (cron-based re-scans)",
      "Compliance reporting (SOC2, GDPR, PCI-DSS)",
      "Supply chain verification (SBOM + provenance)",
      "Multi-language support (Swift, Kotlin, Go, Rust)",
    ],
  },
];

export default function RoadmapPage() {
  const [activeTab, setActiveTab] = useState<"real" | "partial" | "planned" | "roadmap">("roadmap");
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
  if (!user || (user.plan !== "creator" && user.plan !== "enterprise")) return <UpgradeScreen />;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-['Syne']">Roadmap to Real System</h1>
          <p className="text-sm text-white/50">
            Honest assessment of what&apos;s mathematically verified vs what needs work.
            Every &quot;real&quot; component is deterministic and compiler-backed — no LLM dependency.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <div className="text-2xl font-bold text-emerald-400 font-['Syne']">{REAL_COMPONENTS.length}</div>
            <div className="text-xs text-white/40 mt-1">Real & Verified</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
            <div className="text-2xl font-bold text-amber-400 font-['Syne']">{PARTIAL_COMPONENTS.length}</div>
            <div className="text-xs text-white/40 mt-1">Partial (LLM or infra dependency)</div>
          </div>
          <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
            <div className="text-2xl font-bold text-violet-400 font-['Syne']">{PLANNED_COMPONENTS.length}</div>
            <div className="text-xs text-white/40 mt-1">Planned (not yet built)</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-white/[0.06] pb-2">
          {[
            { id: "roadmap", label: "Phased Roadmap", icon: Clock },
            { id: "real", label: `Real (${REAL_COMPONENTS.length})`, icon: CheckCircle2 },
            { id: "partial", label: `Partial (${PARTIAL_COMPONENTS.length})`, icon: AlertTriangle },
            { id: "planned", label: `Planned (${PLANNED_COMPONENTS.length})`, icon: Zap },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white/[0.1] text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "roadmap" && (
          <div className="space-y-6">
            {ROADMAP_PHASES.map((phase, idx) => (
              <div key={phase.phase} className={`p-6 rounded-2xl border ${
                phase.status === "active"
                  ? "bg-emerald-500/5 border-emerald-500/15"
                  : phase.status === "next"
                  ? "bg-amber-500/5 border-amber-500/15"
                  : "bg-white/[0.02] border-white/[0.05]"
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    phase.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                    phase.status === "next" ? "bg-amber-500/20 text-amber-400" :
                    "bg-white/[0.05] text-white/30"
                  }`}>{phase.phase.slice(-1)}</div>
                  <div>
                    <h3 className="font-bold text-sm">{phase.title}</h3>
                    <p className="text-[10px] text-white/40">{phase.phase} {phase.status === "active" ? "(In Progress)" : phase.status === "next" ? "(Next)" : "(Planned)"}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {phase.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                      <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-white/20" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {activeTab === "real" && (
          <div className="space-y-3">
            {REAL_COMPONENTS.map((comp) => (
              <ComponentCard key={comp.name} component={comp} />
            ))}
          </div>
        )}

        {activeTab === "partial" && (
          <div className="space-y-3">
            {PARTIAL_COMPONENTS.map((comp) => (
              <ComponentCard key={comp.name} component={comp} />
            ))}
          </div>
        )}

        {activeTab === "planned" && (
          <div className="space-y-3">
            {PLANNED_COMPONENTS.map((comp) => (
              <ComponentCard key={comp.name} component={comp} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UpgradeScreen() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <div className="text-center max-w-md space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center mx-auto">
          <Crown className="w-8 h-8 text-violet-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold font-['Syne'] text-white">Roadmap to Real System</h1>
          <p className="text-sm text-white/40">Full roadmap access with detailed component assessment is available on the Creator plan and above.</p>
        </div>
        <Link href="/pricing">
          <button className="flex items-center gap-2 bg-white text-black font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-white/90 transition-all shadow-lg mx-auto">
            Upgrade to Creator - Rs.299/mo <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}

function ComponentCard({ component: c }: { component: Component }) {
  const statusColor = c.status === "real" ? "text-emerald-400" : c.status === "partial" ? "text-amber-400" : "text-violet-400";
  const statusBg = c.status === "real" ? "bg-emerald-500/10 border-emerald-500/20" : c.status === "partial" ? "bg-amber-500/10 border-amber-500/20" : "bg-violet-500/10 border-violet-500/20";
  const StatusIcon = c.status === "real" ? CheckCircle2 : c.status === "partial" ? AlertTriangle : Clock;

  return (
    <div className={`p-4 rounded-xl border ${statusBg}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${statusColor}`} />
            <h4 className="font-medium text-sm">{c.name}</h4>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusBg} ${statusColor}`}>
              {c.status.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-1">{c.description}</p>
          <p className="text-[10px] text-white/30 mt-1">Tech: {c.tech}</p>
          {c.proof && <p className="text-[10px] text-emerald-400/60 mt-0.5">Proof: {c.proof}</p>}
          {c.gap && <p className="text-[10px] text-amber-400/60 mt-0.5">Gap: {c.gap}</p>}
        </div>
      </div>
    </div>
  );
}
