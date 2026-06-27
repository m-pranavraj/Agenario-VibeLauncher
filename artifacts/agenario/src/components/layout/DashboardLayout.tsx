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
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50 dark:bg-[#050505] transition-colors duration-300 font-sans">

        {/* Sidebar */}
        <Sidebar className="border-r border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a0a0f]">
          <SidebarHeader className="flex h-16 items-center px-5 border-b border-slate-100 dark:border-white/[0.06]">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Agenario" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                Agenario
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-3 py-5">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
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
                            "text-slate-600 dark:text-slate-400",
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
              </SidebarGroupContent>
            </SidebarGroup>
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
