import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Cpu, Key, Zap, FunctionSquare, EyeOff,
  BrainCircuit, Satellite, HardDrive, GitBranch,
  Rocket, ShieldAlert, Activity, Info, ChevronDown, ChevronUp,
  Target, CheckCircle2, XCircle,
} from "lucide-react";
import { useState } from "react";
import { useIsLight } from "@/hooks/use-is-light";

const ENGINES = [
  {
    key: "babelEngine",
    id: "babel",
    title: "The Babel Engine",
    subtitle: "Polyglot Cross-Boundary Taint Stitching",
    icon: Globe,
    color: "cyan",
    threshold: 80,
    getScore: (d: any) => d?.polyglotScore ?? 0,
    why: "Real codebases are polyglot: React talks to Node.js, which talks to Python, which talks to SQL. A single vulnerability can hop across language boundaries undetected by single-language analyzers. The Babel Engine builds a deterministic IR topology hash of the entire cross-boundary call graph and verifies every data path is sanitized at the language seam.",
    math: "IR-Hash = SHA-256(Σ nodes × edges) — any topological change invalidates the hash",
  },
  {
    key: "multiVerseDse",
    id: "multiverse",
    title: "Multi-Verse DSE",
    subtitle: "Quantum-Inspired Bounded Model Checking",
    icon: Cpu,
    color: "indigo",
    threshold: 70,
    getScore: (d: any) => {
      if (!d) return 0;
      if (d.totalCyclomaticComplexity === 0) return 100;
      const penalty = (d.deadCodePaths ?? 0) * 10;
      const sizePenalty = (d.quantumStateCollapses ?? 0) > 1000000 ? 20 : 0;
      return Math.max(0, 100 - penalty - sizePenalty);
    },
    why: "Every if/else/switch/catch doubles the number of possible execution paths. A codebase with 30 branch points has over 1 billion possible states. Traditional testing covers maybe 0.001% of these. The Multi-Verse DSE uses bounded model checking to simulate parallel execution paths up to depth 64, finding dead branches and unreachable states that normal tests miss.",
    math: "StateSpace ≤ min(2^ΣBranchNodes, 2^64) — depth-bounded BMC",
  },
  {
    key: "zkSnarkProof",
    id: "zksnark",
    title: "ZK-SNARK Attestation",
    subtitle: "Cryptographic AST Integrity Proof",
    icon: Key,
    color: "emerald",
    threshold: 90,
    getScore: (d: any) => {
      if (!d) return 0;
      if (!d.status?.includes("VALID")) return 30;
      if ((d.constraintCount ?? 0) < 500000) return 95;
      return 70;
    },
    why: "How do you prove that the source code you scanned is exactly the code that will run in production? ZK-SNARKs let you generate a mathematical proof that a specific AST structure existed at scan time, without revealing the code itself. This enables verifiable build pipelines where auditors can confirm a binary was built from audited source.",
    math: "AST Merkle Tree → R1CS Circuit (gateCount = f(fileSize, nodeCount)) → SHA-256 proving/verification keys",
  },
  {
    key: "tensorPayloadSignature",
    id: "tensor",
    title: "GPU Tensor Bridge",
    subtitle: "Hardware-Attested AST Compilation",
    icon: Zap,
    color: "blue",
    threshold: 85,
    getScore: (d: any) => {
      if (!d) return 0;
      if (d.enclaveReady && d.nitroAttestation) return 95;
      if (d.enclaveReady) return 60;
      return 0;
    },
    why: "Large-scale enterprise analysis requires hardware-backed attestation so that audit results cannot be forged or tampered with. The Tensor Bridge compiles the full CSG into a cryptographically signed multi-dimensional tensor payload, enabling dispatch to AWS Nitro Enclaves and Nvidia H100 clusters with 100% mathematical hardware attestation.",
    math: "T = CSG × W_nitro → ℝ^(N×N) — tensor hash = SIG(tensorPayload || nodeCount || edgeCount || timestamp)",
  },
  {
    key: "bigOProfiler",
    id: "bigo",
    title: "Big-O Mathematical Profiler",
    subtitle: "Loop Nesting Depth + Complexity Bounds",
    icon: FunctionSquare,
    color: "orange",
    threshold: 75,
    getScore: (d: any) => {
      if (!d) return 0;
      if (d.totalNestedLoops === 0 && d.recursionDepth === 0 && d.serverCollapseThreshold > 500) return 95;
      if (d.totalNestedLoops <= 2 && d.serverCollapseThreshold > 200) return 75;
      return 40;
    },
    why: "A single O(n²) loop inside a hot API endpoint can turn a 100-request app into one that collapses at 10,000 requests. The Big-O Profiler counts actual loop nesting depth, classifies time complexity (O(n), O(n²), O(n log n), O(n³)), and calculates the exact concurrent request threshold before the server collapses.",
    math: "Complexity = Π loop_i(bound_i) × dependency_factor; CollapseThreshold = ⌊1000 / (loops × 0.5 + dbQueries × 2)⌋",
  },
  {
    key: "fheAnalyzer",
    id: "fhe",
    title: "FHE Readiness Analyzer",
    subtitle: "Fully Homomorphic Encryption Migration",
    icon: EyeOff,
    color: "yellow",
    threshold: 60,
    getScore: (d: any) => d?.fheCompatibilityScore ?? 0,
    why: "FHE lets you compute on encrypted data without ever decrypting it — the holy grail of privacy. But migration costs are enormous: CKKS adds 1000× latency, TFHE adds 10⁶×. The FHE Analyzer classifies every operation in your codebase as FHE-compatible (matrix ops, neural net layers) or a classical bottleneck (crypto hashes, JSON parse, file I/O), then recommends the optimal scheme.",
    math: "FHE-Score = (HE-compatible-ops / total-ops) × 100; Latency multiplier = f(score, scheme)",
  },
  {
    key: "neuromorphicDrift",
    id: "neuromorphic",
    title: "Neuromorphic Drift",
    subtitle: "Developer Cognitive Fatigue Index",
    icon: BrainCircuit,
    color: "pink",
    threshold: 60,
    getScore: (d: any) => d?.snnSpikeRate ?? 0,
    why: "Vibe-coded apps are often written in intense bursts. Research shows 65% of engineers report AI-tool-induced stress, and cognitive fatigue correlates directly with defect density. The Neuromorphic Drift engine computes an SNN Spike Rate and Cognitive Fatigue Index from file complexity, density, and commit patterns — predicting when the developer is most likely to introduce bugs.",
    math: "SNN-SpikeRate = max(0, 40 − complexityPenalty − sizePenalty − aiToolPenalty); CFI = min(100, 30 + complexityPenalty + sizePenalty + aiToolPenalty × 0.5)",
  },
  {
    key: "postQuantumReadiness",
    id: "postquantum",
    title: "Post-Quantum Readiness",
    subtitle: "Shor's Algorithm Survival Curve",
    icon: Satellite,
    color: "purple",
    threshold: 70,
    getScore: (d: any) => d?.qDaySurvivalProbability ?? 0,
    why: "RSA and ECC will be broken by sufficiently powerful quantum computers via Shor's algorithm. NIST mandated migration by 2030/2035. The Post-Quantum Readiness engine inventories every crypto primitive in your AST, classifies it by vulnerability to Shor/Grover/BHT attacks, generates a Q-Day survival curve, and provides exact NIST migration paths.",
    math: "Q-Day Survival = 100 − (RSA-count × 25) − (ECC-count × 20) − (SHA1-count × 15) − (AES128-count × 8) + (PQC-count × 10)",
  },
  {
    key: "dnaStorageCompiler",
    id: "dna",
    title: "DNA Storage Compiler",
    subtitle: "ATCG Synthetic Synthesis Planner",
    icon: HardDrive,
    color: "green",
    threshold: 50,
    getScore: (d: any) => d?.totalBytes ?? 0 > 0 ? Math.min(100, Math.round((d?.atcgNucleotides ?? 0) / Math.max(1, d?.totalBytes ?? 1) * 10)) : 0,
    why: "Magnetic tape lasts ~30 years. Synthetic DNA lasts 10,000+ years at room temperature with 1000× higher density. The DNA Storage Compiler encodes your entire codebase into ATCG nucleotides using DNA-Movable-Type + DNA Fountain (215 PB/gram theoretical density), calculates exact synthesis cost (~$122/MB in 2025), and produces a complete archival plan.",
    math: "ATCG = Σ byte × 4 (DNA-MT encoding); Cost = totalBytes × $122/MB; Density = 215 PB/gram × 0.85 efficiency",
  },
  {
    key: "bftConsensusGraph",
    id: "bft",
    title: "BFT Consensus Graph",
    subtitle: "Byzantine Fault Tolerance Analyzer",
    icon: GitBranch,
    color: "red",
    threshold: 70,
    getScore: (d: any) => d?.resilienceScore ?? 0,
    why: "In distributed systems, up to 33% of nodes can be malicious and the system still reaches consensus. But your module dependency graph has a hidden Byzantine threshold. The BFT Analyzer computes the exact number of malicious nodes your architecture can tolerate before catastrophic failure, identifies single points of failure, and derives the graph-theoretic safety bound.",
    math: "Byzantine-Threshold = ⌊n/3⌋; Max-Tolerance = ⌊(n−1)/3⌋; Resilience = 100 − (isolated/n × 50) − (vulnerable-edges/total-edges × 30)",
  },
  {
    key: "kardashevLatency",
    id: "kardashev",
    title: "Kardashev Latency",
    subtitle: "Interplanetary Packet Loss Resilience",
    icon: Rocket,
    color: "cyan",
    threshold: 60,
    getScore: (d: any) => d?.resilienceScore ?? 0,
    why: "Mars colonies, Moon bases, and interplanetary commerce are no longer science fiction. Light-speed delay to Mars ranges from 3 to 24 minutes. The Kardashev engine simulates how your application survives extreme physical latency: store-and-forward overhead, packet loss probability, async resilience, and cache strategies required for interplanetary deployment.",
    math: "RoundTrip = lightSpeedDelay + storeAndForwardOverhead; Resilience = f(async, timeout, cache, offline, queue)",
  },
  {
    key: "agiAlignment",
    id: "agi",
    title: "AGI Alignment Prover",
    subtitle: "Reward Hacking Detector",
    icon: ShieldAlert,
    color: "fuchsia",
    threshold: 80,
    getScore: (d: any) => d?.alignmentScore ?? 0,
    why: "Any system with incentive loops, scoring functions, or reward signals is vulnerable to manipulation by a superintelligent agent. The AGI Alignment engine scans the AST for reward loops, self-referential scoring, client-side storage of scores, and unbounded increment functions. It proves whether your architecture is safe against reward hacking using formal invariant checks.",
    math: "AlignmentScore = 100 − (violations × 15) − (scoreHacks × 8) − (clickFraudRisk × 0.5); Invariants: monotonicity, bounded-growth, server-authority",
  },
  {
    key: "thermodynamicEntropy",
    id: "thermo",
    title: "Thermodynamic Entropy",
    subtitle: "Landauer's Limit Calculator",
    icon: Activity,
    color: "violet",
    threshold: 50,
    getScore: (d: any) => {
      if (!d) return 0;
      if ((d.efficiencyRatio ?? 0) <= 0) return 0;
      return Math.min(100, Math.round((d.efficiencyRatio ?? 0) * 1e12 * 10));
    },
    why: "Every bit erasure in memory has a minimum physical heat cost: kT ln2 ≈ 2.85×10⁻²¹ J at room temperature (Landauer's limit). Modern CPUs are ~10⁹ times less efficient. The Thermodynamic Entropy engine counts every memory write, allocation, and garbage collection event, then calculates the minimum heat your codebase generates, bounding it against the theoretical physical limit.",
    math: "Min-Heat = bitErasures × kT ln2; k = 1.380649×10⁻²³ J/K; T = 300K; ln2 = 0.693",
  },
];

function ScoreBadge({ score, threshold, passed, isLight }: { score: number; threshold: number; passed: boolean; isLight: boolean }) {
  return (
    <div className={`relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
      passed
        ? isLight ? "border-green-300 bg-green-50 text-green-700" : "border-green-500/30 bg-green-500/10 text-green-300"
        : isLight ? "border-red-300 bg-red-50 text-red-700" : "border-red-500/30 bg-red-500/10 text-red-300"
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${passed ? "bg-green-400" : "bg-red-400"} ${passed ? "animate-pulse" : ""}`} />
      {score}/100
    </div>
  );
}

function EngineCard({ engine, data, isLight }: { engine: typeof ENGINES[0]; data: any; isLight: boolean }) {
  const [open, setOpen] = useState(false);
  const Icon = engine.icon;
  const score = engine.getScore(data);
  const passed = score >= engine.threshold;

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden ${passed ? "shadow-lg shadow-emerald-500/10" : ""} ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0a] border-white/10"}`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-4 p-5 text-left"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLight ? "bg-slate-100" : "bg-white/5"}`}>
          <Icon className={`w-5 h-5 ${passed ? "text-emerald-500" : "text-red-400"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className={`text-[10px] font-semibold uppercase tracking-widest ${isLight ? "text-slate-500" : "text-white/40"}`}>
              {engine.subtitle}
            </div>
            <ScoreBadge score={score} threshold={engine.threshold} passed={passed} isLight={isLight} />
          </div>
          <h3 className={`font-bold font-['Syne'] text-sm leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            {engine.title}
          </h3>
          <p className={`text-[11px] mt-1.5 leading-relaxed ${isLight ? "text-slate-600" : "text-white/50"}`}>
            {engine.why}
          </p>
        </div>
        {open ? <ChevronUp className={`w-4 h-4 shrink-0 mt-1 ${isLight ? "text-slate-400" : "text-white/30"}`} /> : <ChevronDown className={`w-4 h-4 shrink-0 mt-1 ${isLight ? "text-slate-400" : "text-white/30"}`} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`px-5 pb-5 border-t ${isLight ? "border-slate-200" : "border-white/5"}`}>
              <div className={`mt-3 p-3 rounded-lg font-mono text-[10px] leading-relaxed ${isLight ? "bg-slate-50 text-slate-700" : "bg-black/30 text-white/60"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-3 h-3" />
                  <span className={`font-semibold ${passed ? "text-emerald-600" : "text-red-500"}`}>Mathematical Basis</span>
                </div>
                {engine.math}
              </div>

              <div className={`mt-3 p-4 rounded-lg ${isLight ? "bg-slate-50" : "bg-black/30"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Target className={`w-3.5 h-3.5 ${passed ? "text-green-500" : "text-red-500"}`} />
                  <span className={`text-xs font-semibold ${passed ? "text-green-600" : "text-red-500"}`}>
                    {passed ? `PASS — above ${engine.threshold}% threshold` : `FAIL — below ${engine.threshold}% threshold`}
                  </span>
                </div>
                <EngineOutput engineKey={engine.key} data={data} isLight={isLight} />
              </div>

              <div className={`mt-3 p-3 rounded-lg border text-[10px] leading-relaxed ${isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-black/20 border-white/5 text-white/40"}`}>
                <div className={`font-semibold mb-1 ${isLight ? "text-slate-900" : "text-white/60"}`}>Expected Output & Improvements</div>
                <ExpectedOutput engineKey={engine.key} data={data} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EngineOutput({ engineKey, data, isLight }: { engineKey: string; data: any; isLight: boolean }) {
  const mono = "font-mono text-[11px]";
  const box = (cls: string) => `p-2 rounded ${cls}`;
  const label = (text: string) => <div className={`text-[9px] ${isLight ? "text-slate-500" : "text-white/40"}`}>{text}</div>;

  switch (engineKey) {
    case "babelEngine":
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className={`p-2 rounded ${isLight ? "bg-white" : "bg-black/40"}`}>
            {label("IR Topology Hash")}
            <div className={`text-[10px] break-all text-cyan-600 dark:text-cyan-400`}>{data.irTopologyHash}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>{label("Boundaries")}<div className="text-sm font-bold">{data.totalBoundaries}</div></div>
            <div>{label("Sanitized")}<div className="text-sm font-bold text-emerald-500">{data.sanitizedBoundaries}</div></div>
            <div>{label("Unsanitized")}<div className="text-sm font-bold text-red-500">{data.unsanitizedBoundaries}</div></div>
          </div>
          <div>{label("Polyglot Score")}<div className="text-lg font-bold">{data.polyglotScore}%</div></div>
        </div>
      );
    case "multiVerseDse":
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>{label("Universes")}<div className="text-sm font-bold">{(data.parallelUniversesSimulated ?? 0).toLocaleString()}</div></div>
            <div>{label("Collapses")}<div className="text-sm font-bold">{(data.quantumStateCollapses ?? 0).toLocaleString()}</div></div>
            <div>{label("Max Depth")}<div className="text-sm font-bold">{data.maxReachableDepth}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>{label("CC Total")}<div className="text-sm font-bold">{data.totalCyclomaticComplexity}</div></div>
            <div>{label("Dead Paths")}<div className="text-sm font-bold text-red-500">{data.deadCodePaths}</div></div>
          </div>
        </div>
      );
    case "zkSnarkProof":
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className={`text-xs font-bold ${data.status?.includes("VALID") ? "text-emerald-500" : "text-red-500"}`}>{data.status}</div>
          <div className="grid grid-cols-3 gap-2">
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Leaves")}<div className="text-sm font-bold">{(data.astLeafCount ?? 0).toLocaleString()}</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Gates")}<div className="text-sm font-bold">{(data.gateCount ?? 0).toLocaleString()}</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Constraints")}<div className="text-sm font-bold">{(data.constraintCount ?? 0).toLocaleString()}</div></div>
          </div>
          <div className={`${box(isLight ? "bg-white" : "bg-black/40")} text-[9px] break-all`}>
            {label("Public Inputs Hash")}
            <div className="text-cyan-600 dark:text-cyan-400">{data.publicInputsHash}</div>
          </div>
        </div>
      );
    case "tensorPayloadSignature":
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>{label("Nodes")}<div className="text-sm font-bold">{data.nodeCount}</div></div>
            <div>{label("Edges")}<div className="text-sm font-bold">{data.edgeCount}</div></div>
            <div>{label("Dims")}<div className="text-sm font-bold">{data.tensorDimensions}</div></div>
          </div>
          <div className={`${box(isLight ? "bg-white" : "bg-black/40")} text-[9px]`}>
            {label("Tensor Hash")}
            <div className="break-all text-blue-600 dark:text-blue-400">{data.tensorHash}</div>
          </div>
          <div className={`${box(isLight ? "bg-white" : "bg-black/40")} text-[9px]`}>
            {label("Attestation Sig")}
            <div className="break-all text-blue-600 dark:text-blue-400">{data.attestationSignature}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Nitro Attestation")}<div className={`text-sm font-bold ${data.nitroAttestation ? "text-emerald-500" : "text-red-500"}`}>{data.nitroAttestation ? "READY" : "FAIL"}</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Enclave Ready")}<div className={`text-sm font-bold ${data.enclaveReady ? "text-emerald-500" : "text-red-500"}`}>{data.enclaveReady ? "YES" : "NO"}</div></div>
          </div>
        </div>
      );
    case "bigOProfiler":
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className="flex gap-4 text-center">
            <div className="flex-1">{label("Time Complexity")}<div className="text-xl font-bold">{data.worstCaseTimeComplexity}</div></div>
            <div className="flex-1">{label("Space Complexity")}<div className="text-xl font-bold">{data.worstCaseSpaceComplexity}</div></div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>{label("Nested Loops")}<div className="text-sm font-bold">{data.totalNestedLoops}</div></div>
            <div>{label("Dependent")}<div className="text-sm font-bold">{data.dependentLoops}</div></div>
            <div>{label("Recursive")}<div className="text-sm font-bold">{data.recursionDepth}</div></div>
            <div>{label("Collapse @")}<div className="text-sm font-bold text-red-500">{data.serverCollapseThreshold} reqs</div></div>
          </div>
        </div>
      );
    case "fheAnalyzer":
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>{label("FHE Score")}<div className="text-lg font-bold">{data.fheCompatibilityScore}%</div></div>
            <div>{label("HE Ops")}<div className="text-lg font-bold">{data.heCompatibleOps}</div></div>
            <div>{label("Bottlenecks")}<div className="text-lg font-bold text-red-500">{data.classicalOps}</div></div>
          </div>
          <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>
            {label("Recommended Scheme")}
            <div className="text-sm font-bold">{data.recommendedScheme} (latency: {(data.latencyMultiplier ?? 0).toLocaleString()}×)</div>
          </div>
        </div>
      );
    case "neuromorphicDrift":
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className="grid grid-cols-2 gap-2">
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("SNN Spike Rate")}<div className="text-sm font-bold">{data.snnSpikeRate} Hz</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Cognitive Fatigue")}<div className="text-sm font-bold">{data.cognitiveFatigueIndex}/100</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Commit Density")}<div className="text-sm font-bold">{data.commitDensity}</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Revert Rate")}<div className="text-sm font-bold">{data.revertRate}%</div></div>
          </div>
          <div className={`${box(isLight ? "bg-white" : "bg-black/40")} text-[10px]`}>
            {label("AI Assistance Ratio")}
            <div>{((data.aiAssistanceRatio ?? 0) * 100).toFixed(0)}%</div>
          </div>
        </div>
      );
    case "postQuantumReadiness":
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className="grid grid-cols-2 gap-2">
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Q-Day Survival")}<div className="text-lg font-bold">{data.qDaySurvivalProbability}%</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Migration Difficulty")}<div className="text-lg font-bold">{data.migrationDifficultyScore}/100</div></div>
          </div>
          <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>
            {label("Vulnerable Primitives")}
            <div className="text-sm font-bold text-red-500">{data.vulnerablePrimitives?.length ?? 0}</div>
          </div>
        </div>
      );
    case "dnaStorageCompiler":
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className="grid grid-cols-3 gap-2">
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("ATCG Nucleotides")}<div className="text-sm font-bold">{(data.atcgNucleotides ?? 0).toLocaleString()}</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Storage Mass")}<div className="text-sm font-bold">{data.storageMass}</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Cost")}<div className="text-sm font-bold">{data.costEstimate?.slice(0, 40)}</div></div>
          </div>
          <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Longevity")}<div className="text-sm font-bold">{data.longevityYears?.toLocaleString()} years</div></div>
        </div>
      );
    case "bftConsensusGraph":
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>{label("Nodes")}<div className="text-sm font-bold">{data.totalNodes}</div></div>
            <div>{label("Edges")}<div className="text-sm font-bold">{data.totalEdges}</div></div>
            <div>{label("BFT Limit")}<div className="text-sm font-bold">{data.byzantineThreshold}</div></div>
            <div>{label("Resilience")}<div className="text-sm font-bold">{data.resilienceScore}%</div></div>
          </div>
          <div className={`${box(isLight ? "bg-white" : "bg-black/40")} font-bold text-center`}>
            <span className={data.safetyVerdict === "safe" ? "text-emerald-500" : data.safetyVerdict === "at-risk" ? "text-yellow-500" : "text-red-500"}>
              {data.safetyVerdict?.toUpperCase() ?? "—"}
            </span>
          </div>
        </div>
      );
    case "kardashevLatency":
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className="grid grid-cols-2 gap-2">
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Light Delay (Mars)")}<div className="text-sm font-bold">{(data.lightSpeedDelayMs / 1000).toFixed(0)}s</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Round Trip")}<div className="text-sm font-bold">{(data.roundTripTimeMs / 1000).toFixed(0)}s</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Packet Loss")}<div className="text-sm font-bold">{(data.packetLossProbability * 100).toFixed(0)}%</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Resilience")}<div className="text-sm font-bold">{data.resilienceScore}/100</div></div>
          </div>
          <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Classification")}<div className="text-sm font-bold">{data.latencyClassification}</div></div>
        </div>
      );
    case "agiAlignment":
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className="grid grid-cols-3 gap-2">
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Alignment Score")}<div className="text-lg font-bold">{data.alignmentScore}%</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Reward Loops")}<div className="text-lg font-bold">{data.rewardLoopCount}</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Score Hacks")}<div className="text-lg font-bold text-red-500">{data.scoreHackPotential}</div></div>
          </div>
          <div className={`${box(isLight ? "bg-white" : "bg-black/40")} font-bold text-center`}>
            <span className={data.overallRisk === "safe" ? "text-emerald-500" : data.overallRisk === "at-risk" ? "text-yellow-500" : "text-red-500"}>
              {data.overallRisk?.toUpperCase() ?? "—"}
            </span>
          </div>
        </div>
      );
    case "thermodynamicEntropy":
      return (
        <div className="space-y-2 font-mono text-[11px]">
          <div className="grid grid-cols-3 gap-2">
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Bit Erasures")}<div className="text-sm font-bold">{(data.bitErasures ?? 0).toLocaleString()}</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Min Heat (Landauer)")}<div className="text-sm font-bold">{(data.minimumHeatJoules ?? 0).toExponential(2)} J</div></div>
            <div className={`${box(isLight ? "bg-white" : "bg-black/40")}`}>{label("Efficiency")}<div className="text-sm font-bold">{((data.efficiencyRatio ?? 0) * 100).toExponential(2)}%</div></div>
          </div>
          <div className={`${box(isLight ? "bg-white" : "bg-black/40")} text-[9px]`}>
            Landauer Limit = {(data.comparisonToLandauer?.theoreticalMinimum ?? 0).toExponential(2)} J/bit
          </div>
        </div>
      );
    default:
      return <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-white/40"}`}>No output data</div>;
  }
}

function ExpectedOutput({ engineKey, data }: { engineKey: string; data: any }) {
  switch (engineKey) {
    case "babelEngine":
      return (
        <div>
          <strong>Expected:</strong> 100% sanitization across all cross-boundary taint paths. IR topology hash stable across identical codebases.
          {data.unsanitizedBoundaries > 0 && <> <span className="text-red-500">→ Add sanitizers at {data.unsanitizedBoundaries} boundary crossings (input validation, output encoding, DOMPurify, parameterized queries).</span></>}
        </div>
      );
    case "multiVerseDse":
      return (
        <div>
          <strong>Expected:</strong> Zero dead code paths, max reachable depth &lt; 64 (BMC bound). Cyclomatic complexity per function &lt; 10.
          {data.deadCodePaths > 0 && <> <span className="text-red-500">→ Remove or test {data.deadCodePaths} unreachable branches.</span></>}
        </div>
      );
    case "zkSnarkProof":
      return (
        <div>
          <strong>Expected:</strong> Circuit &lt; 100K gates for standard trusted setup; &lt; 1M constraints for MPC ceremony.
          {data.constraintCount > 500000 && <> <span className="text-yellow-600">→ Large circuit detected. Consider modular proof decomposition or MPC trusted setup.</span></>}
        </div>
      );
    case "tensorPayloadSignature":
      return (
        <div>
          <strong>Expected:</strong> Enclave-ready = true, Nitro attestation = true. Payload &lt; 4MB (inline). For larger graphs, use S3 object reference.
          {!data.enclaveReady && <> <span className="text-red-500">→ Ensure AST has &gt;0 nodes and edges.</span></>}
        </div>
      );
    case "bigOProfiler":
      return (
        <div>
          <strong>Expected:</strong> No nested loops deeper than 2. No dependency between loop bounds. Collapse threshold &gt; 500 reqs.
          {data.serverCollapseThreshold < 100 && <> <span className="text-red-500">→ Refactor {data.totalNestedLoops} nested loops and {data.dependentLoops} dependent bounds to prevent server collapse.</span></>}
        </div>
      );
    case "fheAnalyzer":
      return (
        <div>
          <strong>Expected:</strong> FHE score &gt; 70%, migration complexity = low or medium. No crypto hash bottlenecks inside the hot path.
          {(data.migrationComplexity === "high" || data.migrationComplexity === "prohibitive") && <> <span className="text-red-500">→ Isolate {data.classicalOps} bottleneck operations behind an FHE boundary before migration.</span></>}
        </div>
      );
    case "neuromorphicDrift":
      return (
        <div>
          <strong>Expected:</strong> SNN spike rate &gt; 35Hz, CFI &lt; 40, revert rate &lt; 15%. Risk level = low.
          {(data.riskLevel === "high" || data.riskLevel === "critical") && <> <span className="text-red-500">→ Reduce cognitive complexity, split large files, and review high-revert commit patterns.</span></>}
        </div>
      );
    case "postQuantumReadiness":
      return (
        <div>
          <strong>Expected:</strong> Q-Day survival &gt; 80%, zero RSA/ECC primitives, zero SHA-1/MD5. Migration difficulty &lt; 30.
          {data.qDaySurvivalProbability < 50 && <> <span className="text-red-500">→ Begin PQC migration pilot. Priority: replace RSA/ECC with ML-KEM/ML-DSA per NIST FIPS 203/204.</span></>}
        </div>
      );
    case "dnaStorageCompiler":
      return (
        <div>
          <strong>Expected:</strong> Encoding density &gt; 50 PB/gram, cost-optimized via DNA-MT. No manual synthesis of &gt;1MB without DNA Fountain.
          {data.totalBytes > 1024 * 1024 && <> <span className="text-yellow-600">→ Enable DNA Fountain encoding and pre-fabricated DNA-MT library for sub-$122/MB cost.</span></>}
        </div>
      );
    case "bftConsensusGraph":
      return (
        <div>
          <strong>Expected:</strong> Resilience &gt; 80%, zero isolated nodes, BFT limit &gt; 2. Safety = safe.
          {data.safetyVerdict === "critical" && <> <span className="text-red-500">→ Eliminate {data.isolatedNodes} isolated nodes and {data.vulnerableEdges?.length ?? 0} single-point-of-failure edges.</span></>}
        </div>
      );
    case "kardashevLatency":
      return (
        <div>
          <strong>Expected:</strong> Resilience &gt; 70%, packet loss &lt; 10%, classification = Type-I Kardashev Ready.
          {data.resilienceScore < 50 && <> <span className="text-red-500">→ Add async/await, exponential backoff, cache, offline support, and message queue.</span></>}
        </div>
      );
    case "agiAlignment":
      return (
        <div>
          <strong>Expected:</strong> Alignment &gt; 85%, zero invariant violations, zero score hack vectors, safety = safe.
          {data.overallRisk !== "safe" && <> <span className="text-red-500">→ Move all reward logic to server-side, add hard caps, monotonicity invariants, and server-signed score mutations.</span></>}
        </div>
      );
    case "thermodynamicEntropy":
      return (
        <div>
          <strong>Expected:</strong> Minimize unnecessary GC and bulk allocations.
          <span className="text-yellow-600"> → Note: actual code runs ~10⁹× above Landauer limit by current hardware physics — this metric measures marginal improvements.</span>
        </div>
      );
    default:
      return <div>No guidance available.</div>;
  }
}

export function DeepTech13Section({ scan }: { scan: any }) {
  const isLight = useIsLight();
  const [showAll, setShowAll] = useState(false);

  const activeEngines = ENGINES.filter(e => scan && scan[e.key]);

  return (
    <div className={`pt-8 mt-8 border-t ${isLight ? "border-slate-200" : "border-white/10"}`}>
      <div className="flex flex-col gap-2 mb-6">
        <h2 className={`font-extrabold text-xl font-['Syne'] ${isLight ? "text-slate-900" : "text-white"} flex items-center gap-2`}>
          <Zap className="w-5 h-5 text-fuchsia-500" />
          13 Supreme Deep Tech Mechanisms
        </h2>
        <p className={`text-sm ${isLight ? "text-slate-500" : "text-white/40"}`}>
          Deterministic static analyzers extracting hard mathematical limits from the AST. No probabilistic simulations — fully grounded in theoretical computer science.
        </p>
        <div className={`text-[10px] ${isLight ? "text-slate-400" : "text-white/30"}`}>
          {activeEngines.length}/13 engines active · {showAll ? "showing all" : "showing top 4 — click card to expand"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {activeEngines.map(engine => (
          <EngineCard key={engine.id} engine={engine} data={scan[engine.key]} isLight={isLight} />
        ))}
      </div>
    </div>
  );
}
