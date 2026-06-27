import { useState } from "react";
import { useIsLight } from "@/hooks/use-is-light";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  ShieldAlert, ShieldCheck, ShieldOff, ToggleLeft, ToggleRight,
  AlertTriangle, Info, Zap, Lock, Eye, Search
} from "lucide-react";

interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  enabled: boolean;
}

const DEFAULT_RULES: Rule[] = [
  { id: "SEC-001", name: "SQL Injection Detection", description: "Detect unsanitized user input flowing into SQL queries.", category: "Injection", severity: "critical", enabled: true },
  { id: "SEC-002", name: "XSS Vector Analysis", description: "Identify cross-site scripting vulnerabilities in template rendering.", category: "Injection", severity: "critical", enabled: true },
  { id: "SEC-003", name: "Hardcoded Secrets Scanner", description: "Flag API keys, tokens, and passwords committed to source code.", category: "Secrets", severity: "critical", enabled: true },
  { id: "SEC-004", name: "CSRF Protection Check", description: "Validate that state-changing endpoints require CSRF tokens.", category: "Authentication", severity: "high", enabled: true },
  { id: "SEC-005", name: "Authentication Bypass", description: "Detect logic flaws that allow unauthenticated access to protected routes.", category: "Authentication", severity: "critical", enabled: true },
  { id: "SEC-006", name: "Insecure Direct Object Reference", description: "Identify missing authorization checks on resource access.", category: "Authorization", severity: "high", enabled: true },
  { id: "SEC-007", name: "Dependency Vulnerability Scan", description: "Cross-reference npm/pip packages against NVD and GitHub Advisory DB.", category: "Dependencies", severity: "high", enabled: true },
  { id: "SEC-008", name: "Missing Security Headers", description: "Check for HSTS, CSP, X-Frame-Options and other security headers.", category: "Configuration", severity: "medium", enabled: true },
  { id: "SEC-009", name: "Rate Limiting Gaps", description: "Identify API endpoints without proper rate limiting.", category: "Availability", severity: "medium", enabled: false },
  { id: "SEC-010", name: "Sensitive Data Exposure", description: "Detect PII, financial data, or medical info flowing to logs or external APIs.", category: "Data Privacy", severity: "high", enabled: true },
  { id: "SEC-011", name: "Insecure Cryptography", description: "Flag use of MD5, SHA1, DES or other deprecated cryptographic algorithms.", category: "Cryptography", severity: "high", enabled: true },
  { id: "SEC-012", name: "Path Traversal Detection", description: "Identify directory traversal vulnerabilities in file system operations.", category: "Injection", severity: "high", enabled: true },
  { id: "SEC-013", name: "JWT Validation Audit", description: "Validate JWT signing, expiry enforcement, and algorithm pinning.", category: "Authentication", severity: "high", enabled: true },
  { id: "SEC-014", name: "CORS Misconfiguration", description: "Detect overly permissive CORS policies allowing unauthorized origins.", category: "Configuration", severity: "medium", enabled: false },
  { id: "SEC-015", name: "Open Redirect", description: "Find unvalidated redirects that can be abused for phishing.", category: "Configuration", severity: "medium", enabled: false },
];

const SEV_CONFIG = {
  critical: { label: "Critical", color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
  high: { label: "High", color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
  medium: { label: "Medium", color: "text-amber-500", bg: "bg-amber-400/10 border-amber-400/20" },
  low: { label: "Low", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-400/20" },
};

export default function SecurityRulesPage() {
  const isLight = useIsLight();
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");

  const categories = ["All", ...Array.from(new Set(DEFAULT_RULES.map(r => r.category)))];

  const filtered = rules.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || r.category === filterCat;
    return matchSearch && matchCat;
  });

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const enabledCount = rules.filter(r => r.enabled).length;
  const criticalCount = rules.filter(r => r.severity === "critical" && r.enabled).length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-extrabold font-heading tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Security Rules
            </h1>
            <p className={`text-sm mt-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>
              Configure which security checks run on every scan.
            </p>
          </div>
          <div className="flex gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{enabledCount}</span>
              <span className={`text-xs ${isLight ? "text-slate-500" : "text-white/40"}`}>active</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isLight ? "bg-red-50 border-red-200" : "bg-red-500/10 border-red-500/20"}`}>
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold text-red-500">{criticalCount}</span>
              <span className={`text-xs ${isLight ? "text-red-400" : "text-red-400/60"}`}>critical</span>
            </div>
          </div>
        </div>

        {/* Search and filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border flex-1 ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
            <Search className={`w-4 h-4 shrink-0 ${isLight ? "text-slate-400" : "text-white/30"}`} />
            <input
              type="text"
              placeholder="Search rules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`bg-transparent border-none outline-none text-sm flex-1 ${isLight ? "text-slate-900 placeholder:text-slate-400" : "text-white placeholder:text-white/30"}`}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterCat === cat
                    ? isLight ? "bg-indigo-600 border-indigo-600 text-white" : "bg-indigo-500 border-indigo-500 text-white"
                    : isLight ? "bg-white border-slate-200 text-slate-600 hover:border-slate-300" : "bg-[#0a0a0f] border-white/10 text-white/50 hover:border-white/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Rules list */}
        <div className={`rounded-2xl border overflow-hidden ${isLight ? "bg-white border-slate-200" : "bg-[#0a0a0f] border-white/10"}`}>
          <div className={`divide-y ${isLight ? "divide-slate-100" : "divide-white/5"}`}>
            {filtered.map((rule) => {
              const sev = SEV_CONFIG[rule.severity];
              return (
                <div key={rule.id} className={`p-4 flex items-start gap-4 transition-colors ${isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.02]"}`}>
                  <div className="pt-0.5">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className="transition-colors"
                      title={rule.enabled ? "Disable rule" : "Enable rule"}
                    >
                      {rule.enabled 
                        ? <ToggleRight className={`w-6 h-6 ${isLight ? "text-indigo-600" : "text-indigo-400"}`} />
                        : <ToggleLeft className={`w-6 h-6 ${isLight ? "text-slate-300" : "text-white/20"}`} />
                      }
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-mono font-bold ${isLight ? "text-slate-400" : "text-white/30"}`}>{rule.id}</span>
                      <span className={`font-semibold text-sm ${rule.enabled ? (isLight ? "text-slate-900" : "text-white") : (isLight ? "text-slate-400" : "text-white/30")}`}>{rule.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sev.bg} ${sev.color}`}>{sev.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${isLight ? "bg-slate-100 text-slate-500" : "bg-white/5 text-white/30"}`}>{rule.category}</span>
                    </div>
                    <p className={`text-xs mt-1.5 leading-relaxed ${isLight ? "text-slate-500" : "text-white/40"}`}>{rule.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info note */}
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${isLight ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-blue-500/10 border-blue-500/20 text-blue-300"}`}>
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            Rule changes take effect on your next scan. Critical and High severity rules are enabled by default to ensure maximum security coverage. Custom rules and organization-level rule sets are available on the Enterprise plan.
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
}
