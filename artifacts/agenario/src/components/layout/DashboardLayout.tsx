import React from "react";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, ChevronLeft, Folder, ShieldCheck, Activity,
  Code2,
  ShieldAlert,
  Settings,
  LogOut,
  Box,
  Fingerprint,
  Bell,
  ChevronRight,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsLight } from "@/hooks/use-is-light";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "New Project", url: "/scans/new", icon: Box },
  { title: "Integrations", url: "/integrations", icon: Code2 },
  { title: "Security Rules", url: "/security-rules", icon: ShieldAlert },
  { title: "API Keys", url: "/api-keys", icon: Fingerprint },
  { title: "Settings", url: "/settings", icon: Settings },
];

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free:       { label: "Free",       color: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/50" },
  starter:    { label: "Starter",    color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
  creator:    { label: "Creator",    color: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" },
  enterprise: { label: "Enterprise", color: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const isLight = useIsLight();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  // Get page title from location
  const getPageTitle = () => {
    if (location === "/dashboard") return "Dashboard";
    if (location.startsWith("/scans/new") || location.startsWith("/scan/new")) return "New Project";
    if (location.startsWith("/scans/") && location.includes("/progress")) return "Scan Progress";
    if (location.startsWith("/scans/")) return "Report";
    if (location === "/integrations") return "Integrations";
    if (location === "/security-rules") return "Security Rules";
    if (location === "/api-keys") return "API Keys";
    if (location === "/settings") return "Settings";
    if (location === "/monitoring") return "Monitoring";
    if (location === "/intelligence") return "Intelligence";
    return "Agenario";
  };

  const planInfo = user ? (PLAN_LABELS[user.plan] ?? PLAN_LABELS.free) : null;

  const isReportPage = location.startsWith("/scans/") && 
                       !location.endsWith("/progress") && 
                       !location.endsWith("/new");

  const getSidebarContent = () => {
    if (isReportPage) {
      const scanId = location.split("/")[2];
      const activeHash = window.location.hash.replace("#", "") || "overview";
      return (
        <div className="space-y-4 w-full">
          {/* Back button */}
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="font-semibold text-[10px] uppercase tracking-wider">Back to Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {/* Group 1: Overview & Environment */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3">
              Overview & Environment
            </SidebarGroupLabel>
            <SidebarGroupContent className="mt-1 px-1">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activeHash === "overview"}
                    className="transition-all duration-150 rounded-xl py-2 px-3 hover:bg-slate-100 dark:hover:bg-white/[0.05] data-[active=true]:bg-indigo-50 dark:data-[active=true]:bg-indigo-500/[0.12] data-[active=true]:text-indigo-600 dark:data-[active=true]:text-indigo-400 text-slate-700 dark:text-slate-200"
                  >
                    <a href="#overview" className="flex items-center gap-3">
                      <LayoutDashboard className="h-4 w-4 shrink-0" />
                      <span className="font-medium text-sm">Readiness Score</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={activeHash === "sandbox"}
                    className="transition-all duration-150 rounded-xl py-2 px-3 hover:bg-slate-100 dark:hover:bg-white/[0.05] data-[active=true]:bg-indigo-50 dark:data-[active=true]:bg-indigo-500/[0.12] data-[active=true]:text-indigo-600 dark:data-[active=true]:text-indigo-400 text-slate-700 dark:text-slate-200"
                  >
                    <a href="#sandbox" className="flex items-center gap-3">
                      <Box className="h-4 w-4 shrink-0" />
                      <span className="font-medium text-sm">Sandbox Proofs</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Group 2: Core Issues */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3">
              Core Issues
            </SidebarGroupLabel>
            <SidebarGroupContent className="mt-1 px-1">
              <SidebarMenu>
                {[
                  { label: "Security Vulnerabilities", hash: "issues-security", color: "bg-rose-500", tourId: "tab-issues" },
                  { label: "Compliance & Safety", hash: "issues-compliance", color: "bg-amber-500" },
                  { label: "Performance Sinks", hash: "issues-performance", color: "bg-blue-500" },
                  { label: "UI / UX Bottlenecks", hash: "issues-uiux", color: "bg-emerald-500" },
                ].map((sub) => (
                  <SidebarMenuItem key={sub.hash}>
                    <SidebarMenuButton
                      asChild
                      isActive={activeHash === sub.hash}
                      className="transition-all duration-150 rounded-xl py-2 px-3 hover:bg-slate-100 dark:hover:bg-white/[0.05] data-[active=true]:bg-indigo-50 dark:data-[active=true]:bg-indigo-500/[0.12] data-[active=true]:text-indigo-600 dark:data-[active=true]:text-indigo-400 text-slate-700 dark:text-slate-200"
                    >
                      <a
                        href={`#${sub.hash}`}
                        data-tour={sub.tourId}
                        className="flex items-center gap-2.5"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${sub.color}`} />
                        <span className="font-medium text-xs truncate">{sub.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Group 3: Deep Tech Analysis */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3">
              Deep Tech Analysis
            </SidebarGroupLabel>
            <SidebarGroupContent className="mt-1 px-1">
              <div className="pl-3.5 space-y-1 border-l border-slate-200 dark:border-white/10 ml-5 mr-3">
                {[
                  { label: "Core Semantic Graph", key: "A" },
                  { label: "Cryptographic Proof", key: "B" },
                  { label: "Formal Verification", key: "C" },
                  { label: "Infrastructure", key: "D" },
                  { label: "AI Safety & Alignment", key: "E" },
                  { label: "Architecture & Perf", key: "F" },
                  { label: "Compliance & Reality", key: "G" },
                  { label: "Advanced Engines", key: "H" },
                  { label: "Distributed Systems", key: "I" },
                ].map((sub) => {
                  const isSubActive = activeHash === `deeptech-${sub.key}`;
                  return (
                    <a
                      key={sub.key}
                      href={`#deeptech-${sub.key}`}
                      className={`block text-[11px] font-medium py-1 px-2.5 rounded-md transition-colors ${
                        isSubActive
                          ? "bg-indigo-50/80 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-semibold"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400/60 dark:hover:text-white/90"
                      }`}
                    >
                      {sub.label}
                    </a>
                  );
                })}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Group 4: Launch Impact */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3">
              Launch Impact & Reality
            </SidebarGroupLabel>
            <SidebarGroupContent className="mt-1 px-1">
              <SidebarMenu>
                {[
                  { label: "Revenue Intelligence", hash: "impact-revenue", tourId: "tab-intelligence" },
                  { label: "Product Hunt Readiness", hash: "impact-producthunt" },
                  { label: "Product Reality Narrative", hash: "reality" },
                ].map((sub) => (
                  <SidebarMenuItem key={sub.hash}>
                    <SidebarMenuButton
                      asChild
                      isActive={activeHash === sub.hash}
                      className="transition-all duration-150 rounded-xl py-2 px-3 hover:bg-slate-100 dark:hover:bg-white/[0.05] data-[active=true]:bg-indigo-50 dark:data-[active=true]:bg-indigo-500/[0.12] data-[active=true]:text-indigo-600 dark:data-[active=true]:text-indigo-400 text-slate-700 dark:text-slate-200"
                    >
                      <a
                        href={`#${sub.hash}`}
                        data-tour={sub.tourId}
                        className="flex items-center gap-2.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-white/30 shrink-0" />
                        <span className="font-medium text-xs truncate">{sub.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Group 5: Codebase Navigator */}
          <SidebarGroup className="p-0">
            <SidebarMenu className="px-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activeHash === "files"}
                  className="transition-all duration-150 rounded-xl py-2 px-3 hover:bg-slate-100 dark:hover:bg-white/[0.05] data-[active=true]:bg-indigo-50 dark:data-[active=true]:bg-indigo-500/[0.12] data-[active=true]:text-indigo-600 dark:data-[active=true]:text-indigo-400 text-slate-700 dark:text-slate-200"
                >
                  <a href="#files" className="flex items-center gap-3">
                    <Folder className="h-4 w-4 shrink-0" />
                    <span className="font-medium text-sm">Codebase Files</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          {/* Group 6: Shares */}
          <SidebarGroup className="pt-3 border-t border-slate-100 dark:border-white/[0.04] px-3">
            <SidebarMenu className="space-y-1.5">
              <SidebarMenuItem>
                <button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/cert/${scanId}`;
                    navigator.clipboard.writeText(shareUrl);
                    alert("Launch Certificate link copied to clipboard!");
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 shadow-md transition-all cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Share Certificate</span>
                </button>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Report Link copied to clipboard!");
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all cursor-pointer"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>Copy Report Link</span>
                </button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </div>
      );
    }

        const showAdmin = (user as any)?.role === "admin" || (user as any)?.email === "admin@agenario.tech" || (user as any)?.email?.includes("admin");
    const activeNavItems = showAdmin 
      ? [...navItems, { title: "Admin Panel", url: "/admin", icon: ShieldAlert }] 
      : navItems;

    return (
      <SidebarMenu>
        {activeNavItems.map((item) => {
          const isActive =
            location === item.url ||
            (item.url !== "/dashboard" && location.startsWith(item.url));
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                className={[
                  "transition-all duration-150 rounded-xl py-2 px-3",
                  "hover:bg-slate-100 dark:hover:bg-white/[0.05]",
                  "data-[active=true]:bg-indigo-50 dark:data-[active=true]:bg-indigo-500/[0.12]",
                  "data-[active=true]:text-indigo-600 dark:data-[active=true]:text-indigo-400",
                  "text-slate-700 dark:text-slate-200",
                ].join(" ")}
              >
                <Link href={item.url} className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-sm">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50 dark:bg-[#050505] transition-colors duration-300 font-sans">

        {/* Sidebar */}
        <Sidebar className="border-r border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a0a0f]">
          <SidebarHeader className="flex h-16 items-center px-5 border-b border-slate-100 dark:border-white/[0.06]">
            <Link href="/dashboard" className="flex items-center gap-2.5 ml-2">
              <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                Agenario
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-3 py-5">
            {getSidebarContent()}
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-100 dark:border-white/[0.06] p-3 space-y-2">
            {/* User info */}
            {user && (
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isLight ? "bg-slate-50" : "bg-white/[0.04]"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isLight ? "bg-indigo-100 text-indigo-700" : "bg-indigo-500/20 text-indigo-400"}`}>
                  {(user.name || user.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                    {user.name || user.email.split("@")[0]}
                  </p>
                  <p className={`text-[10px] truncate ${isLight ? "text-slate-400" : "text-white/30"}`}>
                    {user.email}
                  </p>
                </div>
                {planInfo && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${planInfo.color}`}>
                    {planInfo.label}
                  </span>
                )}
              </div>
            )}

            {/* Appearance & Logout */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                  Theme
                </span>
                <ThemeToggle />
              </div>
              <button
                onClick={handleLogout}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                  isLight
                    ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
                    : "text-slate-500 hover:text-red-400 hover:bg-red-500/[0.08]"
                }`}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Topbar */}
          <header className={`flex h-14 shrink-0 items-center gap-3 border-b px-4 md:px-6 ${
            isLight
              ? "bg-white/90 border-slate-200 backdrop-blur-md"
              : "bg-[#050505]/80 border-white/[0.06] backdrop-blur-md"
          }`}>
            <SidebarTrigger className={`md:hidden ${isLight ? "text-slate-600" : "text-slate-400"}`} />

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm">
              <span className={`font-medium ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                Agenario
              </span>
              {location !== "/dashboard" && (
                <>
                  <ChevronRight className={`w-3.5 h-3.5 ${isLight ? "text-slate-300" : "text-slate-600"}`} />
                  <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                    {getPageTitle()}
                  </span>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* Right side: user pill */}
            {user && (
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                isLight
                  ? "bg-slate-50 border-slate-200 text-slate-700"
                  : "bg-white/[0.05] border-white/[0.08] text-white/70"
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${isLight ? "bg-indigo-100 text-indigo-700" : "bg-indigo-500/20 text-indigo-400"}`}>
                  {(user.name || user.email)[0].toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate">{user.name || user.email.split("@")[0]}</span>
                {planInfo && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${planInfo.color}`}>
                    {planInfo.label}
                  </span>
                )}
              </div>
            )}
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl p-4 md:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
