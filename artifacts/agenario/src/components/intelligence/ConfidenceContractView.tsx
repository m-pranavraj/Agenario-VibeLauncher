import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  CircleDashed, 
  ShieldCheck, 
  ChevronRight, 
  Activity, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  TrendingUp, 
  Plus, 
  Play, 
  Code, 
  Database, 
  FileCode2,
  Terminal, 
  AlertCircle,
  HelpCircle
} from "lucide-react";

interface Step {
  name: string;
  type: "frontend" | "backend" | "db" | "permission" | "test";
  detail: string;
  status: "pass" | "warn" | "fail" | "pending";
}

interface Epic {
  name: string;
  target: string;
  score: number;
  steps: Step[];
}

export function ConfidenceContractView({ scan, isLight }: { scan: any; isLight: boolean }) {
  const [progress, setProgress] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [selectedEpic, setSelectedEpic] = useState<number>(0);
  const [activeStepTab, setActiveStepTab] = useState<"all" | "frontend" | "backend" | "db">("all");
  const [newGoalText, setNewGoalText] = useState("");
  const [goals, setGoals] = useState<Epic[]>([
    {
      name: "Authentication & Authorization Flow",
      target: "Users should sign up, verify their email, login, and successfully load their private user dashboard.",
      score: 95,
      steps: [
        { name: "Frontend Signup Form", type: "frontend", detail: "Form container at /src/pages/register.tsx with dynamic password validation hooks.", status: "pass" },
        { name: "Backend /register API endpoint", type: "backend", detail: "POST endpoint matching controller validation filters.", status: "pass" },
        { name: "DB Insert user record", type: "db", detail: "Drizzle insertion hook validates schema constraints.", status: "pass" },
        { name: "Email dispatch queue", type: "backend", detail: "SMTP event firing verified, verification token generated.", status: "pass" },
        { name: "Token authentication endpoint", type: "backend", detail: "GET /api/auth/verify handles token validation.", status: "pass" },
        { name: "Frontend Login Form", type: "frontend", detail: "Session token persisted in HTTPOnly cookies.", status: "pass" },
        { name: "Dashboard Protected Route", type: "permission", detail: "Auth check middleware guards /dashboard routing.", status: "pass" },
        { name: "E2E Playwright verification", type: "test", detail: "E2E test spec runs headless signup -> verification flow successfully.", status: "pass" }
      ]
    },
    {
      name: "Cart Checkout & Payment Pipeline",
      target: "Users can manage items in the cart, initiate Stripe payment sessions, and verify DB writes order details.",
      score: 68,
      steps: [
        { name: "Localstorage cart state", type: "frontend", detail: "Zustand store handles addition, subtraction, and clears on logout.", status: "pass" },
        { name: "Checkout payload validation", type: "backend", detail: "Zustand model maps to POST /api/checkout schemas.", status: "pass" },
        { name: "Stripe integration checks", type: "backend", detail: "Mock credentials fallback active, Stripe session created.", status: "warn" },
        { name: "Order record creation", type: "db", detail: "DB writes Order record correctly but state defaults to pending.", status: "pass" },
        { name: "Stripe Webhook handler", type: "backend", detail: "POST /api/webhooks/stripe lacks signature verification check.", status: "fail" },
        { name: "Order retrieval API", type: "backend", detail: "GET /api/orders/:id returns order status.", status: "pass" },
        { name: "RLS read restriction", type: "permission", detail: "Missing row-level security policy; users can potentially guess other order IDs.", status: "fail" }
      ]
    },
    {
      name: "API Webhook System",
      target: "External service integrations should register webhook endpoints and receive signed payloads on event triggers.",
      score: 42,
      steps: [
        { name: "Webhook settings panel", type: "frontend", detail: "React form lets creator customize webhook endpoint URL.", status: "pass" },
        { name: "Webhook registration POST", type: "backend", detail: "Endpoint validates URL syntax and generates payload secrets.", status: "pass" },
        { name: "DB writes Webhook endpoint", type: "db", detail: "DB stores endpoints list tied to workspace ID.", status: "pass" },
        { name: "Signature signing middleware", type: "backend", detail: "No SHA256 HMAC payload signature headers generated before dispatch.", status: "fail" },
        { name: "Event dispatch queue", type: "backend", detail: "Webhooks dispatch synchronously instead of background sidekiq/bullmq.", status: "warn" },
        { name: "Failing endpoint retries", type: "backend", detail: "No retry mechanism (e.g. exponential backoff) for non-200 responses.", status: "fail" }
      ]
    }
  ]);

  // "Finish My Feature" Generator
  const [featureGeneratorGoal, setFeatureGeneratorGoal] = useState("");
  const [generatedChecklist, setGeneratedChecklist] = useState<any | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          setAnimating(false);
          return 100;
        }
        return p + 4;
      });
    }, 30);
    return () => clearInterval(timer);
  }, []);

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    
    const newEpic: Epic = {
      name: newGoalText,
      target: "Auto-detected by Agenario codebase parsing...",
      score: 0,
      steps: [
        { name: "Scan source code references", type: "frontend", detail: "Searching for routes and components matching name...", status: "pending" },
        { name: "Identify backend routes", type: "backend", detail: "Probing API controllers...", status: "pending" },
        { name: "Analyze DB Schema relationships", type: "db", detail: "Schema checking tables...", status: "pending" }
      ]
    };
    
    setGoals([...goals, newEpic]);
    setSelectedEpic(goals.length);
    setNewGoalText("");
    
    // Simulate analyzing
    setTimeout(() => {
      setGoals(current => {
        const updated = [...current];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          target: `Verified launch readiness for epic: ${newGoalText}`,
          score: 35,
          steps: [
            { name: `${newGoalText} Frontend UI`, type: "frontend", detail: "Mock UI file found in components list, needs binding.", status: "warn" },
            { name: `${newGoalText} Controller`, type: "backend", detail: "No API route handler registered for this epic yet.", status: "fail" },
            { name: `Database migrations`, type: "db", detail: "Migration stubs exist but tables have not been created.", status: "warn" }
          ]
        };
        return updated;
      });
    }, 2000);
  };

  const handleFinishFeature = () => {
    if (!featureGeneratorGoal.trim()) return;
    setGenerating(true);
    setTimeout(() => {
      setGeneratedChecklist({
        epic: featureGeneratorGoal,
        score: "85%",
        findings: [
          {
            type: "Database Migration",
            title: "Generate SQL schema for " + featureGeneratorGoal,
            code: "CREATE TABLE " + featureGeneratorGoal.toLowerCase().replace(/[^a-z0-9]/g, "_") + " (\n  id SERIAL PRIMARY KEY,\n  workspace_id INTEGER REFERENCES workspaces(id),\n  created_at TIMESTAMP DEFAULT NOW(),\n  status VARCHAR(50) DEFAULT 'draft'\n);"
          },
          {
            type: "Backend API Router",
            title: "Register route handler in api-server",
            code: "router.post('/api/" + featureGeneratorGoal.toLowerCase().replace(/[^a-z0-9]/g, "_") + "', authMiddleware, async (req, res) => {\n  const parsed = schema.safeParse(req.body);\n  if (!parsed.success) return res.status(400).json(parsed.error);\n  const record = await db.insert(...).returning();\n  return res.json(record);\n});"
          },
          {
            type: "E2E Contract Test",
            title: "Simulate playwright assertion flow",
            code: "test('Verify " + featureGeneratorGoal + " flow', async ({ page }) => {\n  await page.goto('/" + featureGeneratorGoal.toLowerCase().replace(/[^a-z0-9]/g, "_") + "');\n  await page.fill('input[name=name]', 'Test Epic');\n  await page.click('button[type=submit]');\n  await expect(page.locator('.toast-success')).toBeVisible();\n});"
          }
        ]
      });
      setGenerating(false);
    }, 2500);
  };

  const getStatusIcon = (status: string) => {
    if (status === "pass") return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
    if (status === "warn") return <Activity className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />;
    if (status === "fail") return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
    return <Loader2 className="w-5 h-5 text-indigo-500 shrink-0 animate-spin" />;
  };

  const getStepIconClass = (status: string) => {
    if (status === "pass") return isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/10 border-emerald-500/20";
    if (status === "warn") return isLight ? "bg-amber-50 border-amber-200" : "bg-amber-500/10 border-amber-500/20";
    if (status === "fail") return isLight ? "bg-rose-50 border-rose-200" : "bg-rose-500/10 border-rose-500/20";
    return isLight ? "bg-indigo-50 border-indigo-200" : "bg-indigo-500/10 border-indigo-500/20";
  };

  const currentEpic = goals[selectedEpic] || goals[0];

  const filteredSteps = currentEpic.steps.filter(step => {
    if (activeStepTab === "all") return true;
    if (activeStepTab === "frontend") return step.type === "frontend";
    if (activeStepTab === "backend") return step.type === "backend";
    if (activeStepTab === "db") return step.type === "db";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Overview Block */}
      <div className={`p-6 md:p-8 rounded-2xl border ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0a0a0f] border-white/10"}`}>
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <ShieldCheck className="w-6 h-6 text-indigo-500" />
              </div>
              <h2 className={`font-black font-['Syne'] text-2xl ${isLight ? "text-slate-900" : "text-white"}`}>
                Confidence Platform & Experience Contract
              </h2>
            </div>
            <p className={`text-sm ${isLight ? "text-slate-600" : "text-slate-400"} max-w-2xl leading-relaxed`}>
              Vibe coders don't care about parsing log lines. They care if the <b>Sign up</b> or <b>Payment</b> button actually functions. 
              The Experience Contract verifies feature completion end-to-end by tracing front-ends, backend endpoints, and DB writes.
            </p>
          </div>
          
          <div className={`flex flex-col items-center justify-center p-4 rounded-xl border min-w-[140px] text-center ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/[0.08]"}`}>
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">Global Confidence</span>
            <span className={`text-4xl font-black font-heading ${isLight ? "text-slate-950" : "text-indigo-400"}`}>
              {scan?.score ?? 85}%
            </span>
            <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> +{Math.max(1, Math.round((scan?.score ?? 85) - Math.round((scan?.score ?? 85) * 0.88)))}% vs yesterday
            </span>
          </div>
        </div>

        {/* Confidence Graph */}
        <div className="mt-8 pt-6 border-t border-dashed border-white/10">
          <div className="flex items-center justify-between mb-4">
            <span className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>Launch Confidence Timeline</span>
            <span className="text-xs text-indigo-500 font-semibold flex items-center gap-1"><Sparkles className="w-3 h-3" /> Auto-syncing live progress</span>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {[
              { day: "Day 1", pct: Math.max(15, Math.round((scan?.score ?? 85) * 0.45)) },
              { day: "Day 2", pct: Math.max(25, Math.round((scan?.score ?? 85) * 0.58)) },
              { day: "Day 3", pct: Math.max(40, Math.round((scan?.score ?? 85) * 0.72)) },
              { day: "Day 4", pct: Math.max(55, Math.round((scan?.score ?? 85) * 0.85)) },
              { day: "Day 5", pct: Math.max(70, Math.round((scan?.score ?? 85) * 0.94)) },
              { day: "Current", pct: scan?.score ?? 85, active: true }
            ].map((day, idx) => (
              <div key={idx} className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                day.active 
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold" 
                  : (isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-[#06060c] border-white/[0.04] text-white/50")
              }`}>
                <span className="text-[10px] uppercase font-semibold">{day.day}</span>
                <span className="text-sm font-black mt-2 font-heading">{day.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Epics Checklist */}
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#07070b] border-white/10"}`}>
            <h3 className={`font-bold text-sm uppercase tracking-wider mb-4 ${isLight ? "text-slate-900" : "text-white"}`}>Stated Product Epics</h3>
            
            <div className="space-y-2">
              {goals.map((epic, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedEpic(idx)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    selectedEpic === idx
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold"
                      : (isLight ? "bg-slate-50 border-slate-100 hover:bg-slate-100" : "bg-[#0b0b13] border-white/[0.04] text-white/70 hover:bg-white/[0.02]")
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs truncate font-bold">{epic.name}</span>
                    <span className="text-xs font-semibold bg-white/10 px-2 py-0.5 rounded-md">{epic.score}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1 rounded-full mt-3 overflow-hidden">
                    <div className="bg-indigo-500 h-full" style={{ width: `${epic.score}%` }} />
                  </div>
                </button>
              ))}
            </div>

            <form onSubmit={handleAddGoal} className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Add epic goal (e.g. Subscriptions)"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                className={`flex-1 px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0a0a0f] border-white/10 text-white"}`}
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Finish My Feature Engine */}
          <div className={`p-5 rounded-2xl border ${isLight ? "bg-gradient-to-br from-indigo-50 to-white border-indigo-100" : "bg-gradient-to-br from-[#120a2e]/30 to-[#07070b] border-indigo-500/20"}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h3 className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>Finish My Feature</h3>
            </div>
            <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"} leading-relaxed mb-4`}>
              Missing stubs blocking 100% readiness? Type the feature and Agenario will generate the schema migrations, API routes, and E2E integration verification hooks.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="e.g. Email verification trigger"
                value={featureGeneratorGoal}
                onChange={(e) => setFeatureGeneratorGoal(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10 text-white"}`}
              />
              
              <button
                onClick={handleFinishFeature}
                disabled={generating}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing codebase contracts...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" /> Compile Contract Verification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Depth Verification Steps */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Verification Checklist */}
          <div className={`p-6 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#07070b] border-white/10"}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 mb-4 gap-4">
              <div>
                <h3 className={`font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>{currentEpic.name}</h3>
                <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>Target Requirement: {currentEpic.target}</p>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl shrink-0">
                {(["all", "frontend", "backend", "db"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveStepTab(tab)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase ${
                      activeStepTab === tab
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filteredSteps.map((step, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex items-start gap-4 transition-all hover:bg-white/[0.01] ${getStepIconClass(step.status)}`}>
                  {getStatusIcon(step.status)}
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{step.name}</h4>
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md flex items-center gap-1 ${
                        step.type === "frontend" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        step.type === "backend" ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" :
                        step.type === "db" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {step.type === "frontend" && <FileCode2 className="w-2.5 h-2.5" />}
                        {step.type === "backend" && <Code className="w-2.5 h-2.5" />}
                        {step.type === "db" && <Database className="w-2.5 h-2.5" />}
                        {step.type}
                      </span>
                    </div>
                    <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generated Code Window */}
          {generatedChecklist && (
            <div className={`p-6 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-[#090910] border-indigo-500/20"} space-y-4`}>
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                  <h4 className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                    Remediation Code Drafts: {generatedChecklist.epic}
                  </h4>
                </div>
                <button
                  onClick={() => setGeneratedChecklist(null)}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-4">
                {generatedChecklist.findings.map((f: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">{f.type}</span>
                      <span className="text-[10px] text-indigo-400 font-semibold">{f.title}</span>
                    </div>
                    <pre className="p-3 bg-black rounded-xl overflow-x-auto text-[11px] font-mono text-emerald-400 border border-white/[0.04] leading-relaxed">
                      <code>{f.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
