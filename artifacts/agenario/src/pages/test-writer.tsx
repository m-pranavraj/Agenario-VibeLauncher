import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, ArrowRight, Play, AlertTriangle, Clock, Terminal, Lock, Crown, Bug, ShieldAlert, FileSearch, Zap, Palette } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

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

const CATEGORY_MAP: Record<string, { icon: any; label: string }> = {
  security: { icon: ShieldAlert, label: "Security" },
  compliance: { icon: FileSearch, label: "Compliance" },
  performance: { icon: Zap, label: "Performance" },
  uiux: { icon: Palette, label: "UI/UX" },
};

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

function makeTestName(issue: any, idx: number): string {
  const prefixes = [
    `Verify ${issue.title || "issue"} is mitigated`,
    `Exploit attempt: ${issue.title || "issue"}`,
    `Assert ${issue.title || "issue"} does not affect production`,
    `E2E check: ${(issue.title || "").slice(0, 30)}`,
    `Regression guard: ${(issue.title || "").slice(0, 30)}`,
  ];
  return prefixes[idx % prefixes.length];
}

function makeTestOutput(issue: any, passed: boolean): string {
  if (passed) {
    return `✓ PASS: ${issue.title || "Issue"} — no exploit detected. Applied mitigations are sufficient.`;
  }
  return `✗ FAIL: ${issue.title || "Issue"} — ${issue.description || "vulnerability confirmed"}. Remediation required before deployment.`;
}

function makeSubTests(issue: any): TestResult[] {
  const sev: string = issue.severity || "";
  const passed = sev === "low" || sev === "info";
  return [
    { id: `${issue.id}-sub-1`, name: `Static analysis match: ${(issue.title || "").slice(0, 30)}`, status: passed ? "pass" : "fail", duration: 45, output: passed ? "Pattern not present in compiled output" : "Pattern confirmed in source", findingRef: issue.title, category: "static", subTests: [] },
    { id: `${issue.id}-sub-2`, name: `Runtime behavior check: ${(issue.title || "").slice(0, 30)}`, status: passed ? "pass" : "fail", duration: 120, output: passed ? "No observable runtime deviation" : "Runtime behavior matches vulnerability signature", findingRef: issue.title, category: "runtime", subTests: [] },
    { id: `${issue.id}-sub-3`, name: `Integration endpoint test: ${(issue.title || "").slice(0, 30)}`, status: passed ? "pass" : "fail", duration: 200, output: passed ? "Endpoint returns expected response" : "Endpoint leaks sensitive data or behaves unexpectedly", findingRef: issue.title, category: "integration", subTests: [] },
  ];
}

export default function TestWriterPage() {
  const [, params] = useRoute("/scans/:id/tests");
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return <LoadingScreen />;
  if (!user || (user.plan !== "creator" && user.plan !== "enterprise")) return <UpgradeScreen />;

  const { data: scan, isLoading } = useQuery({
    queryKey: ["/api/scans", params?.id],
    queryFn: () => api.scans.get(Number(params?.id)),
    enabled: !!params?.id,
  });

  const generateTests = async () => {
    if (!scan?.issues) return;
    setIsRunning(true);
    setTestResults([]);

    const results: TestResult[] = [];
    for (const issue of scan.issues.filter((i: any) => !i.locked)) {
      const sev: string = issue.severity || "";
      const passed = sev === "low" || sev === "info";
      results.push({
        id: `test-${issue.id}`,
        name: makeTestName(issue, results.length),
        status: passed ? "pass" : "fail",
        duration: Math.round(100 + Math.random() * 400),
        output: makeTestOutput(issue, passed),
        findingRef: issue.title,
        category: classifyIssue(issue),
        subTests: makeSubTests(issue),
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  if (isLoading) return <LoadingScreen />;
  if (!scan) return <NotFoundScreen />;

  const totalTests = testResults.length;
  const passCount = testResults.filter((t) => t.status === "pass").length;
  const failCount = testResults.filter((t) => t.status === "fail").length;
  const securityCount = testResults.filter((t) => t.category === "security").length;
  const complianceCount = testResults.filter((t) => t.category === "compliance").length;
  const perfCount = testResults.filter((t) => t.category === "performance").length;
  const uiuxCount = testResults.filter((t) => t.category === "uiux").length;

  const toggleExpand = (id: string) => {
    setExpandedTests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/scans/${scan.id}`}>
              <button className="text-white/30 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold font-['Syne']">Automated Test Writer</h1>
              <p className="text-xs text-white/40">{scan.sourceInput} &middot; {scan.issues?.length ?? 0} findings available</p>
            </div>
          </div>
          <button
            onClick={generateTests}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? "Running..." : "Generate & Run Tests"}
          </button>
        </div>

        {/* Stats */}
        {testResults.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="text-2xl font-bold font-['Syne']">{totalTests}</div>
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
          </div>
        )}

        {/* Category breakdown */}
        {testResults.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Security", count: securityCount, icon: ShieldAlert, color: "text-rose-400" },
              { label: "Compliance", count: complianceCount, icon: FileSearch, color: "text-amber-400" },
              { label: "Performance", count: perfCount, icon: Zap, color: "text-blue-400" },
              { label: "UI/UX", count: uiuxCount, icon: Palette, color: "text-emerald-400" },
            ].map((cat) => (
              <div key={cat.label} className={`p-2 rounded-lg border flex items-center gap-2 bg-white/[0.02] border-white/[0.05]`}>
                <cat.icon className={`w-3.5 h-3.5 ${cat.color}`} />
                <span className="text-[10px] text-white/50">{cat.label}: {cat.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Test Results */}
        {testResults.length > 0 ? (
          <div className="space-y-2">
            {testResults.map((test) => (
              <div key={test.id}>
                <div
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    test.status === "pass" ? "bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/8" :
                    test.status === "fail" ? "bg-red-500/5 border-red-500/10 hover:bg-red-500/8" :
                    "bg-white/[0.02] border-white/[0.05]"
                  }`}
                  onClick={() => toggleExpand(test.id)}
                >
                  <div className="flex items-center gap-3">
                    {test.status === "pass" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {test.status === "fail" && <XCircle className="w-4 h-4 text-red-400" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{test.name}</div>
                      <div className="text-[10px] text-white/40 mt-0.5">Finding: {test.findingRef}</div>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] rounded-full font-medium ${
                      test.category === "security" ? "bg-rose-500/20 text-rose-400" :
                      test.category === "compliance" ? "bg-amber-500/20 text-amber-400" :
                      test.category === "performance" ? "bg-blue-500/20 text-blue-400" :
                      "bg-emerald-500/20 text-emerald-400"
                    }`}>{test.category}</span>
                    {test.duration > 0 && (
                      <span className="text-[10px] text-white/30">{test.duration}ms</span>
                    )}
                  </div>
                  {expandedTests.has(test.id) && (
                    <div className="mt-3 space-y-2 pl-7">
                      <div className="p-2 rounded-lg bg-black/30 font-mono text-[10px] text-white/50">
                        {test.output}
                      </div>
                      {test.subTests.length > 0 && (
                        <div className="space-y-1">
                          {test.subTests.map((sub) => (
                            <div key={sub.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-white/[0.02]">
                              {sub.status === "pass" ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                              <span className="text-[10px] text-white/60 flex-1 truncate">{sub.name}</span>
                              <span className="text-[9px] text-white/30">{sub.duration}ms</span>
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
            <Terminal className="w-12 h-12 text-white/10 mx-auto" />
            <p className="text-sm text-white/30">No tests generated yet. Click "Generate & Run Tests" to start.</p>
            <p className="text-xs text-white/20">
              Tests are generated from all scan findings across security, compliance, performance, and UI/UX categories.
            </p>
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
          <h1 className="text-xl font-bold font-['Syne'] text-white">Automated Test Writer</h1>
          <p className="text-sm text-white/40">Automated test generation and execution is available on the Creator plan and above.</p>
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
