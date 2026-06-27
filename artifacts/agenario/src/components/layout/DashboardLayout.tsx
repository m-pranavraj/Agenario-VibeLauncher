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
  useSidebar
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Code2, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  Activity,
  Box,
  Fingerprint
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "New Project", url: "/scans/new", icon: Box },
  { title: "Integrations", url: "/settings", icon: Code2 },
  { title: "Security Rules", url: "/settings", icon: ShieldAlert },
  { title: "API Keys", url: "/settings", icon: Fingerprint },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50 dark:bg-black/95 transition-colors duration-300 font-sans">
        
        {/* Sidebar */}
        <Sidebar className="border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#0a0a0f]">
          <SidebarHeader className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-white/5">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold font-heading">
              <Activity className="h-5 w-5 text-indigo-500" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-lg">
                Agenario
              </span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-4 py-6">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location === item.url || (item.url !== "/dashboard" && location.startsWith(item.url))}
                        className="data-[active=true]:bg-indigo-50 dark:data-[active=true]:bg-indigo-500/10 data-[active=true]:text-indigo-600 dark:data-[active=true]:text-indigo-400"
                      >
                        <Link href={item.url} className="flex items-center gap-3 py-2 px-3">
                          <item.icon className="h-4 w-4" />
                          <span className="font-medium text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-100 dark:border-white/5 p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                System
              </span>
              <ThemeToggle />
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => logout()} className="text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400">
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Topbar (Mobile trigger & global actions) */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-black/50 backdrop-blur-md px-4 md:px-8">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              {/* Optional top-bar actions */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Zero-Retention Mode Active
              </div>
            </div>
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
