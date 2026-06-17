import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import NewScanPage from "@/pages/new-scan";
import ScanResultsPage from "@/pages/scan-results";
import PricingPage from "@/pages/pricing";
import DocsPage from "@/pages/docs";
import PortfolioPage from "@/pages/portfolio";
import MonitoringPage from "@/pages/monitoring";
import AboutPage from "@/pages/about";
import IntelligencePage from "@/pages/intelligence";
import ContactPage from "@/pages/contact";
import ThankYouPage from "@/pages/thank-you";
import CareersPage from "@/pages/careers";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/scans/new" component={NewScanPage} />
      <Route path="/scans/:id" component={ScanResultsPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/portfolio" component={PortfolioPage} />
      <Route path="/monitoring" component={MonitoringPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/intelligence" component={IntelligencePage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/thank-you" component={ThankYouPage} />
      <Route path="/careers" component={CareersPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
