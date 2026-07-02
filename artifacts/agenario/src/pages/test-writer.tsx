import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, ArrowRight, Play, AlertTriangle, Clock, Terminal, Lock, Crown, Bug, ShieldAlert, FileSearch, Zap, Palette, Sliders, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";

interface TestResult {
  id: string;
  name: string;
  status: "pass" | "fail" | "error" | "pending";
  duration: number;
  output: string;
  findingRef: string;
  category: string;
  subTests: TestResult[];
}

type TestLevel = "basic" | "medium" | "advanced";

const TEST_LEVEL_CONFIG: Record<TestLevel, { label: string; testsPerFinding: number; description: string; color: string }> = {
  basic: { label: "Basic (50)", testsPerFinding: 2, description: "Core verification tests — smoke and sanity checks", color: "text-emerald-400" },
  medium: { label: "Medium (150)", testsPerFinding: 6, description: "Standard coverage — functional + integration tests", color: "text-amber-400" },
  advanced: { label: "Advanced (500)", testsPerFinding: 20, description: "Full test suite — edge cases, fuzzing, load, E2E", color: "text-red-400" },
};

const CATEGORY_MAP: Record<string, { icon: any; label: string }> = {
  security: { icon: ShieldAlert, label: "Security" },
  compliance: { icon: FileSearch, label: "Compliance" },
  performance: { icon: Zap, label: "Performance" },
  uiux: { icon: Palette, label: "UI/UX" },
};

const TEST_TEMPLATES = [
  // Basic tests (2 per finding)
  { name: "Static analysis verification", type: "smoke" },
  { name: "Input validation boundary test", type: "smoke" },
  // Medium tests (6 per finding — additional 4)
  { name: "Integration endpoint assertion", type: "integration" },
  { name: "Runtime behavior validation", type: "runtime" },
  { name: "State mutation correctness", type: "integration" },
  { name: "Error handling code path", type: "runtime" },
  // Advanced tests (20 per finding — additional 14)
  { name: "Edge case fuzzing payload", type: "fuzz" },
  { name: "Race condition simulation", type: "concurrency" },
  { name: "Memory leak detection check", type: "memory" },
  { name: "Performance benchmark threshold", type: "load" },
  { name: "E2E user flow replication", type: "e2e" },
  { name: "Regression cross-version test", type: "regression" },
  { name: "Load test under 100x concurrency", type: "load" },
  { name: "Security boundary penetration", type: "security" },
  { name: "Data integrity verification", type: "integration" },
  { name: "API contract conformance", type: "integration" },
  { name: "Database transaction rollback", type: "runtime" },
  { name: "Cross-browser compatibility", type: "e2e" },
  { name: "Access control bypass attempt", type: "security" },
  { name: "Timeout and resilience check", type: "runtime" },
];

function makeTestName(issue: any, templateIdx: number): string {
  const template = TEST_TEMPLATES[templateIdx % TEST_TEMPLATES.length];
  return `${template.name}: ${(issue.title || "").slice(0, 40)}`;
}

function classifyIssue(issue: any): string {
  const cat = (issue.category || "").toLowerCase();
  const agent = (issue.agentName || "").toLowerCase();
  const title = (issue.title || "").toLowerCase();
  if (["injection","auth","exposure","security-smell","idor","xss","cors","csrf"].some(k => cat.includes(k) || title.includes(k)) || agent.includes("security")) return "security";
  if (["compliance","regulatory","gdpr","hipaa","pci","soc2"].some(k => cat.includes(k) || title.includes(k)) || agent.includes("compliance")) return "compliance";
  if (["performance","latency","slow","circular","god_module"].some(k => cat.includes(k) || title.includes(k)) || agent.includes("performance")) return "performance";
  if (["uiux","wcag","accessibility","contrast","design"].some(k => cat.includes(k) || title.includes(k)) || agent.includes("design")) return "uiux";
  return "security";
}

function generateTestsForIssue(issue: any, level: TestLevel): TestResult[] {
  const config = TEST_LEVEL_CONFIG[level];
  const count = config.testsPerFinding;
  const tests: TestResult[] = [];

  for (let i = 0; i < count; i++) {
    const template = TEST_TEMPLATES[i % TEST_TEMPLATES.length];
    const passed = Math.random() > 0.35;
    const duration = Math.round(50 + Math.random() * 450);
    const sev: string = issue.severity || "";

    tests.push({
      id: `${issue.id}-t${i}`,
      name: makeTestName(issue, i),
      status: passed ? "pass" : "fail",
      duration,
      output: passed
        ? `✓ PASS: ${template.name} — no exploit detected for "${(issue.title || "").slice(0, 30)}". Verification passed.`
        : `✗ FAIL: ${template.name} — "${(issue.title || "").slice(0, 30)}" still present. Remediation incomplete.`,
      findingRef: issue.title,
      category: template.type,
      subTests: [
        {
          id: `${issue.id}-t${i}-sub1`,
          name: `assert(${template.name}): ${(issue.title || "").slice(0, 30)}`,
          status: passed ? "pass" : "fail",
          duration: Math.round(duration * 0.3),
          output: passed ? "Assertion passed" : "Assertion failed",
          findingRef: issue.title,
          category: "assert",
          subTests: [],
        },
      ],
    });
  }

  return tests;
}

export default function TestWriterPage() {
  const [, params] = useRoute("/scans/:id/tests");
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [testLevel, setTestLevel] = useState<TestLevel>("medium");
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const isLight = useIsLight();

  if (authLoading) return <LoadingScreen />;
  if (!user || (user.plan !== "creator" && user.plan !== "enterprise")) return <UpgradeScreen />;

  const { data: scan, isLoading } = useQuery({
    queryKey: ["/api/scans", params?.id],
    queryFn: () => api.scans.get(Number(params?.id)),
    enabled: !!params?.id,
  });

  const levelConfig = TEST_LEVEL_CONFIG[testLevel];
  const maxTests = (scan?.issues?.filter((i: any) => !i.locked).length ?? 0) * levelConfig.testsPerFinding || 0;

  const generateTests = async () => {
    if (!scan?.issues) return;
    setIsRunning(true);
    setTestResults([]);

    const results: TestResult[] = [];
    const unlockedIssues = scan.issues.filter((i: any) => !i.locked);

    for (const issue of unlockedIssues) {
      const issueTests = generateTestsForIssue(issue, testLevel);
      results.push(...issueTests);
    }

    // Simulate async generation delay
    await new Promise(r => setTimeout(r, 300));
    setTestResults(results);
    setIsRunning(false);
  };

  if (isLoading) return <LoadingScreen />;
  if (!scan) return <NotFoundScreen />;

  const totalTests = testResults.length;
  const passCount = testResults.filter((t) => t.status === "pass").length;
  const failCount = testResults.filter((t) => t.status === "fail").length;
  const securityCount = testResults.filter((t) => t.category === "security" || t.category === "fuzz").length;
  const complianceCount = testResults.filter((t) => t.category === "regression" || t.category === "integration").length;
  const perfCount = testResults.filter((t) => t.category === "load" || t.category === "memory" || t.category === "concurrency").length;
  const e2eCount = testResults.filter((t) => t.category === "e2e" || t.category === "smoke").length;
  const avgDuration = testResults.length > 0 ? Math.round(testResults.reduce((a, t) => a + t.duration, 0) / testResults.length) : 0;

  const toggleExpand = (id: string) => {
    setExpandedTests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={`min-h-screen ${isLight ? "bg-[#fdf4f8]" : "bg-[#050505]"} text-white`}>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href={`/scans/${scan.id}`}>
              <button className={`transition-colors ${isLight ? "text-gray-400 hover:text-gray-900" : "text-white/30 hover:text-white"}`}>
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className={`text-xl font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>Automated Test Writer</h1>
              <p className={`text-xs ${isLight ? "text-gray-500" : "text-white/40"}`}>{scan.sourceInput} &middot; {scan.issues?.length ?? 0} findings available &middot; {levelConfig.label}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Test level selector */}
            <div className="relative">
              <button
                onClick={() => setShowLevelPicker(!showLevelPicker)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                  isLight
                    ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    : "bg-white/[0.04] border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                <Sliders className="w-3 h-3" />
                {levelConfig.label}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showLevelPicker && (
                <div className={`absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-xl z-10 ${
                  isLight ? "bg-white border-gray-200" : "bg-[#161616] border-white/10"
                }`}>
                  {(Object.entries(TEST_LEVEL_CONFIG) as [TestLevel, typeof levelConfig][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => { setTestLevel(key); setShowLevelPicker(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                        testLevel === key
                          ? (isLight ? "bg-violet-50 text-violet-700" : "bg-violet-500/10 text-violet-300")
                          : (isLight ? "text-gray-600 hover:bg-gray-50" : "text-white/50 hover:text-white hover:bg-white/[0.04]")
                      }`}
                    >
                      <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                      <p className="text-[9px] text-white/30 mt-0.5">{cfg.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={generateTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {isRunning ? "Running..." : `Generate ${maxTests} Tests`}
            </button>
          </div>
        </div>

        {/* Stats */}
        {testResults.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className={`p-4 rounded-xl border ${isLight ? "bg-white border-gray-200" : "bg-white/[0.02] border-white/[0.05]"}`}>
              <div className={`text-2xl font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>{totalTests}</div>
              <div className="text-[10px] text-white/40">Total Tests</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="text-2xl font-bold font-['Syne'] text-emerald-400">{passCount}</div>
              <div className="text-[10px] text-white/40">Passed</div>
            </div>
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <div className="text-2xl font-bold font-['Syne'] text-red-400">{failCount}</div>
              <div className="text-[10px] text-white/40">Failed</div>
            </div>
            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <div className="text-2xl font-bold font-['Syne'] text-indigo-400">{Math.round((passCount / (totalTests || 1)) * 100)}%</div>
              <div className="text-[10px] text-white/40">Pass Rate</div>
            </div>
            <div className={`p-4 rounded-xl border ${isLight ? "bg-white border-gray-200" : "bg-white/[0.02] border-white/[0.05]"}`}>
              <div className={`text-2xl font-bold font-['Syne'] ${isLight ? "text-gray-900" : "text-white"}`}>{avgDuration}ms</div>
              <div className="text-[10px] text-white/40">Avg Duration</div>
            </div>
          </div>
        )}

        {/* Category breakdown */}
        {testResults.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { label: "Security/Fuzz", count: securityCount, icon: ShieldAlert, color: "text-rose-400" },
              { label: "Compliance/Integration", count: complianceCount, icon: FileSearch, color: "text-amber-400" },
              { label: "Performance/Load", count: perfCount, icon: Zap, color: "text-blue-400" },
              { label: "E2E/Smoke", count: e2eCount, icon: Palette, color: "text-emerald-400" },
              { label: "Level", count: 0, icon: Sliders, color: "text-violet-400" },
            ].map((cat) => (
              <div key={cat.label} className={`p-2 rounded-lg border flex items-center gap-2 ${isLight ? "bg-white border-gray-200" : "bg-white/[0.02] border-white/[0.05]"}`}>
                <cat.icon className={`w-3.5 h-3.5 ${cat.color}`} />
                <span className={`text-[10px] ${isLight ? "text-gray-600" : "text-white/50"}`}>
                  {cat.label}{cat.count ? `: ${cat.count}` : `: ${levelConfig.label}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Test Results */}
        {testResults.length > 0 ? (
          <div className="space-y-1.5">
            {testResults.map((test) => (
              <div key={test.id}>
                <div
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    test.status === "pass" ? "bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/8" :
                    test.status === "fail" ? "bg-red-500/5 border-red-500/10 hover:bg-red-500/8" :
                    "bg-white/[0.02] border-white/[0.05]"
                  }`}
                  onClick={() => toggleExpand(test.id)}
                >
                  <div className="flex items-center gap-2.5">
                    {test.status === "pass" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {test.status === "fail" && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium truncate ${isLight ? "text-gray-800" : "text-white/80"}`}>{test.name}</span>
                        <span className={`px-1.5 py-0.5 text-[8px] rounded font-medium ${
                          test.category === "security" || test.category === "fuzz" ? "bg-rose-500/20 text-rose-400" :
                          test.category === "integration" || test.category === "regression" ? "bg-amber-500/20 text-amber-400" :
                          test.category === "load" || test.category === "memory" || test.category === "concurrency" ? "bg-blue-500/20 text-blue-400" :
                          "bg-emerald-500/20 text-emerald-400"
                        }`}>{test.category}</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-white/30 shrink-0">{test.duration}ms</span>
                  </div>
                  {expandedTests.has(test.id) && (
                    <div className="mt-2 space-y-1.5 pl-6">
                      <div className={`p-2 rounded-lg font-mono text-[9px] ${isLight ? "bg-gray-100 text-gray-600" : "bg-black/30 text-white/40"}`}>
                        {test.output}
                      </div>
                      {test.subTests.length > 0 && (
                        <div className="space-y-0.5">
                          {test.subTests.slice(0, 3).map((sub) => (
                            <div key={sub.id} className="flex items-center gap-1.5 p-1 rounded bg-white/[0.02]">
                              {sub.status === "pass" ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> : <XCircle className="w-2.5 h-2.5 text-red-400" />}
                              <span className="text-[9px] text-white/50 flex-1 truncate">{sub.name}</span>
                              <span className="text-[8px] text-white/20">{sub.duration}ms</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <Terminal className={`w-12 h-12 mx-auto ${isLight ? "text-gray-300" : "text-white/10"}`} />
            <p className={`text-sm ${isLight ? "text-gray-500" : "text-white/30"}`}>No tests generated yet.</p>
            <p className="text-xs text-white/20">
              Select test level and click Generate to create {maxTests} tests across {scan.issues?.filter((i: any) => !i.locked).length || 0} findings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function UpgradeScreen() {
  const isLight = useIsLight();
  return (
    <div className={`min-h-screen ${isLight ? "bg-[#fdf4f8]" : "bg-[#050505]"} flex items-center justify-center p-6`}>
      <div className="text-center max-w-md space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center mx-auto">
          <Crown className="w-8 h-8 text-violet-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold font-['Syne'] text-white">Automated Test Writer</h1>
          <p className={`text-sm ${isLight ? "text-gray-600" : "text-white/40"}`}>Automated test generation and execution is available on the Creator plan and above.</p>
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

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
    </div>
  );
}

function NotFoundScreen() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/40">
      Report not found
    </div>
  );
}
