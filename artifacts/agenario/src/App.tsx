import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Home from "@/pages/home";
import LoginPage from "@/pages/login";
import ResetPasswordPage from "@/pages/reset-password";
import UpdatePasswordPage from "@/pages/update-password";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import NewScanPage from "@/pages/new-scan";
import ScanResultsPage from "@/pages/scan-results";
import ScanProgressPage from "@/pages/scan-progress";
import PricingPage from "@/pages/pricing";
import DocsPage from "@/pages/docs";
import PortfolioPage from "@/pages/portfolio";
import MonitoringPage from "@/pages/monitoring";
import AboutPage from "@/pages/about";
import IntelligencePage from "@/pages/intelligence";
import ContactPage from "@/pages/contact";
import ThankYouPage from "@/pages/thank-you";
import CareersPage from "@/pages/careers";
import AdminPage from "@/pages/admin";
import CertPage from "@/pages/cert";
import ReportPage from "@/pages/report";
import IntegrationsPage from "@/pages/integrations";
import ApiKeysPage from "@/pages/api-keys";
import RemediationPage from "@/pages/remediation";
import IssueChecklistPage from "@/pages/issue-checklist";
import RoadmapPage from "@/pages/roadmap";
import TestWriterPage from "@/pages/test-writer";
import EvidenceTiersPage from "@/pages/evidence-tiers";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import RefundsPage from "@/pages/refunds";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/update-password" component={UpdatePasswordPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/scans/new" component={NewScanPage} />
      <Route path="/scan/new" component={NewScanPage} />
      <Route path="/scans/:id/progress" component={ScanProgressPage} />
      <Route path="/scans/:id/remediate" component={RemediationPage} />
      <Route path="/scans/:id/issues" component={IssueChecklistPage} />
      <Route path="/scans/:id/tests" component={TestWriterPage} />
      <Route path="/scans/:id/evidence" component={EvidenceTiersPage} />
      <Route path="/scans/:id/:section">
        {(params) => <ScanResultsPage key={`${params.id}-${params.section}`} />}
      </Route>
      <Route path="/scans/:id">
        {(params) => <ScanResultsPage key={`${params.id}-overview`} />}
      </Route>
      <Route path="/pricing" component={PricingPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/portfolio" component={PortfolioPage} />
      <Route path="/monitoring" component={MonitoringPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/intelligence" component={IntelligencePage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/thank-you" component={ThankYouPage} />
      <Route path="/careers" component={CareersPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/cert/:id" component={CertPage} />
      <Route path="/report/:id" component={ReportPage} />
      <Route path="/roadmap" component={RoadmapPage} />
      <Route path="/integrations" component={IntegrationsPage} />
      <Route path="/api-keys" component={ApiKeysPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/refunds" component={RefundsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" forcedTheme="dark" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <ErrorBoundary>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
            </ErrorBoundary>
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
