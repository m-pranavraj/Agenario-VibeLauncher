/**
 * Report Sidebar Navigation
 * ─────────────────────────────────────────────────────────────────────────────
 * Proper sidebar navigation for the scan report with segregated sections:
 * - Overview (report home)
 * - Issue Checklist (dedicated issue management)
 * - Evidence Tiers (T1-T5 with real data)
 * - Deep Tech (advanced analysis)
 * - Intelligence (revenue, product hunt, market)
 * - Sandbox (runtime proofs & screenshots)
 * - Pre-Launch Checklist (separate from issues)
 * - Automated Tests (test writer & results)
 * - Roadmap (to fully real system)
 * - Technical Cofounder (report-based Q&A)
 */

import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, ListChecks, Shield, Cpu, Activity, Terminal,
  ClipboardCheck, FlaskConical, Map, MessageSquare, Lock,
  FileText, Eye, BarChart3, AlertTriangle
} from "lucide-react";

interface SidebarProps {
  scanId: number;
  activeTab: string;
  issueCount: number;
  hasRuntimeProofs: boolean;
  hasDeepTech: boolean;
  hasIssues: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  badge?: number;
  badgeColor?: string;
  disabled?: boolean;
}

export function ReportSidebar({ scanId, activeTab, issueCount, hasRuntimeProofs, hasDeepTech, hasIssues }: SidebarProps) {
  const [, setLocation] = useLocation();

  const navSections: Array<{ title: string; items: NavItem[] }> = [
    {
      title: "Analysis",
      items: [
        { id: "overview", label: "Overview", icon: LayoutDashboard, path: `/scans/${scanId}` },
        { id: "issues", label: "Issue Checklist", icon: ListChecks, path: `/scans/${scanId}/issues`, badge: issueCount, badgeColor: issueCount > 0 ? "red" : "green" },
        { id: "confidence", label: "Confidence Contract", icon: Shield, path: `/scans/${scanId}/confidence` },
      ],
    },
    {
      title: "Verification",
      items: [
        { id: "sandbox", label: "Runtime Proofs", icon: Eye, path: `/scans/${scanId}/sandbox`, disabled: !hasRuntimeProofs },
        { id: "evidence", label: "Evidence Tiers", icon: Activity, path: `/scans/${scanId}/evidence` },
        { id: "tests", label: "Automated Tests", icon: FlaskConical, path: `/scans/${scanId}/tests` },
      ],
    },
    {
      title: "Intelligence",
      items: [
        { id: "intelligence", label: "Revenue & Market", icon: BarChart3, path: `/scans/${scanId}/intelligence` },
        { id: "reality", label: "Product Reality", icon: AlertTriangle, path: `/scans/${scanId}/reality` },
        { id: "compliance", label: "Compliance", icon: ClipboardCheck, path: `/scans/${scanId}/compliance` },
      ],
    },
    {
      title: "Advanced",
      items: [
        { id: "deeptech", label: "Deep Tech", icon: Cpu, path: `/scans/${scanId}/deeptech`, disabled: !hasDeepTech },
        { id: "graph", label: "Knowledge Graph", icon: FileText, path: `/scans/${scanId}/graph` },
      ],
    },
    {
      title: "Launch",
      items: [
        { id: "checklist", label: "Pre-Launch Checklist", icon: ClipboardCheck, path: `/scans/${scanId}/checklist`, disabled: !hasIssues },
        { id: "roadmap", label: "Roadmap to Real", icon: Map, path: "/roadmap" },
        { id: "cofounder", label: "Tech Cofounder", icon: MessageSquare, path: `/scans/${scanId}/cofounder` },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 overflow-y-auto border-r border-white/[0.06] bg-[#050505]/95 backdrop-blur-2xl">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold font-['Syne'] text-sm">Agenario</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="px-2 mb-2 text-[9px] font-bold uppercase tracking-widest text-white/20">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => !item.disabled && setLocation(item.path)}
                    disabled={item.disabled}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                      item.disabled
                        ? "opacity-30 cursor-not-allowed text-white/20"
                        : isActive
                        ? "bg-white/[0.08] text-white border border-white/[0.1]"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-medium truncate flex-1">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        item.badgeColor === "red" ? "bg-red-500/15 text-red-400" :
                        item.badgeColor === "green" ? "bg-emerald-500/15 text-emerald-400" :
                        "bg-white/[0.08] text-white/50"
                      }`}>{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-white/[0.06] bg-[#050505]">
        <div className="text-[9px] text-white/20 text-center">
          No mockups. No hardcoded data.
          <br />
          Real verifiers only.
        </div>
      </div>
    </aside>
  );
}
