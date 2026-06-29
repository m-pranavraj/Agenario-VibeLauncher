import { useIsLight } from "@/hooks/use-is-light";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Github, Webhook, Globe, Database, Cloud, Code2, 
  CheckCircle2, ArrowRight, ExternalLink, Zap, Plus
} from "lucide-react";

const INTEGRATIONS = [
  {
    category: "Source Control",
    items: [
      { name: "GitHub", icon: Github, description: "Connect repositories for continuous scanning. Trigger scans on every push or pull request.", status: "available", badge: "Popular" },
      { name: "GitLab", icon: Code2, description: "Connect GitLab repositories and pipelines for automated security analysis.", status: "available" },
      { name: "Bitbucket", icon: Code2, description: "Integrate Bitbucket repos and CI pipelines.", status: "coming-soon" },
    ]
  },
  {
    category: "CI / CD Pipelines",
    items: [
      { name: "GitHub Actions", icon: Zap, description: "Add Agenario to your GitHub Actions workflow with a single YAML step.", status: "available" },
      { name: "Vercel", icon: Globe, description: "Trigger a full deep-tech scan on every Vercel deployment.", status: "available" },
      { name: "Railway", icon: Cloud, description: "Hook into Railway deployments for pre-launch security gates.", status: "coming-soon" },
    ]
  },
  {
    category: "Webhooks",
    items: [
      { name: "Custom Webhook", icon: Webhook, description: "Receive real-time scan events at your own endpoint. Authenticate with your webhook secret.", status: "available" },
      { name: "Slack Notifications", icon: Database, description: "Get scan results and critical findings posted directly to your Slack channel.", status: "coming-soon" },
    ]
  },
];

export default function IntegrationsPage() {
  const isLight = useIsLight();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        <div>
          <h1 className={`text-2xl md:text-3xl font-extrabold font-heading tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            Integrations
          </h1>
          <p className={`text-sm mt-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>
            Connect Agenario to your development workflow for continuous automated analysis.
          </p>
        </div>

        {/* GitHub Quick Connect */}
        <div className={`p-6 rounded-2xl border ${isLight ? "bg-indigo-50 border-indigo-200" : "bg-indigo-500/10 border-indigo-500/20"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLight ? "bg-white border border-indigo-200" : "bg-indigo-500/20 border border-indigo-500/30"}`}>
                <Github className={`w-6 h-6 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} />
              </div>
              <div>
                <h3 className={`font-bold ${isLight ? "text-indigo-900" : "text-indigo-200"}`}>GitHub Repository Scanner</h3>
                <p className={`text-sm ${isLight ? "text-indigo-700/70" : "text-indigo-300/60"}`}>Scan any public or private GitHub repo instantly</p>
              </div>
            </div>
            <a
              href="/scans/new"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all"
            >
              <Plus className="w-4 h-4" />
              Connect Repository
            </a>
          </div>
        </div>

        {/* CI/CD YAML snippet */}
        <div className={`rounded-2xl border overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
          <div className={`px-5 py-4 border-b ${isLight ? "border-slate-200" : "border-white/10"}`}>
            <h2 className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>GitHub Actions — Quick Start</h2>
            <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-white/40"}`}>Add this to <code className="font-mono">.github/workflows/agenario.yml</code></p>
          </div>
          <div className={`p-5 font-mono text-xs leading-relaxed overflow-x-auto ${isLight ? "bg-slate-50 text-slate-700" : "bg-black/40 text-green-300"}`}>
            <pre>{`name: Agenario Security Scan
on: [push, pull_request]

jobs:
  agenario:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Agenario Deep Scan
        uses: agenario/scan-action@v1
        with:
          api-key: \${{ secrets.AGENARIO_API_KEY }}
          source-type: github
          fail-on: critical`}</pre>
          </div>
        </div>

        {/* Integration categories */}
        {INTEGRATIONS.map((cat) => (
          <div key={cat.category}>
            <h2 className={`text-lg font-bold mb-4 ${isLight ? "text-slate-900" : "text-white"}`}>{cat.category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cat.items.map((item) => {
                const Icon = item.icon;
                const available = item.status === "available";
                return (
                  <div key={item.name} className={`p-5 rounded-2xl border flex items-start gap-4 ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"} ${!available ? "opacity-60" : ""}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLight ? "bg-slate-100" : "bg-white/5"}`}>
                      <Icon className={`w-5 h-5 ${isLight ? "text-slate-700" : "text-white/70"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>{item.name}</span>
                        {(item as any).badge && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold">{(item as any).badge}</span>
                        )}
                        {!available && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isLight ? "bg-slate-100 text-slate-500" : "bg-white/5 text-white/30"} font-medium`}>Coming Soon</span>
                        )}
                        {available && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${isLight ? "text-slate-500" : "text-white/40"}`}>{item.description}</p>
                    </div>
                    {available && (
                      <button className={`shrink-0 p-1.5 rounded-lg border transition-colors ${isLight ? "border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200" : "border-white/10 text-white/30 hover:text-indigo-400 hover:border-indigo-500/30"}`}>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      </div>
    </DashboardLayout>
  );
}
