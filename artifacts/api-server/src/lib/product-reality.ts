/**
 * Product Reality & Feature Truth Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes a codebase to determine which features are real vs mockup.
 *
 * For each detected feature (auth, payment, dashboard, etc.), checks:
 * - Frontend: Does UI code exist for this feature?
 * - API: Are there backend routes/handlers?
 * - Database: Are there schema definitions?
 * - Persistence: Is data actually saved/retrieved?
 * - Runtime: Can the feature be exercised end-to-end?
 *
 * Produces a "Product Reality Score" — what percentage of claimed features
 * actually work vs are just UI mockups.
 */

import { logger } from "./logger.js";
import { runMockupDetector } from "./mockup-detector.js";

export interface FeatureCheck {
  name: string;
  slug: string;
  frontend: boolean;
  api: boolean;
  database: boolean;
  persistence: boolean;
  runtime: boolean;
  confidence: number; // 0-100, how sure are we this feature works
  issues: string[];
}

export interface ProductRealityReport {
  realityScore: number; // 0-100
  totalFeatures: number;
  verifiedFeatures: number; // all 5 checks pass
  partialFeatures: number; // some checks pass
  mockFeatures: number; // only frontend exists, no backend
  brokenFlows: number; // explicitly broken (errors, exceptions)
  deploymentBlockers: string[];
  features: FeatureCheck[];
  mockupFindings: ReturnType<typeof runMockupDetector>;
  summary: string;
}

interface FeaturePattern {
  slug: string;
  name: string;
  frontend: RegExp[];
  api: RegExp[];
  database: RegExp[];
  persistence: RegExp[];
  runtime: RegExp[];
}

const FEATURE_PATTERNS: FeaturePattern[] = [
  {
    slug: "auth",
    name: "Authentication",
    frontend: [/login|signin|signup|register|log-?in|sign-?in/i, /password/i, /auth(?:icate|orize|enticat)/i],
    api: [/(?:POST|GET|PUT|DELETE)\s*\(\s*["']\/api\/auth|requireAuth|authMiddleware/i, /session|token|jwt|passport/i],
    database: [/user.*table|usersTable|CREATE TABLE.*user|model\s+User/i, /passwordHash|password_hash|bcrypt/i],
    persistence: [/save\(\)|INSERT INTO|prisma\.\w+\.create|\.save\(\)|\.create\(/, /session\.[a-z]+\s*=|req\.session/i],
    runtime: [/cookie|httpOnly|setCookie|session\.userId/i, /bcrypt\.compare|verifyToken|jwt\.verify/i],
  },
  {
    slug: "payment",
    name: "Payments",
    frontend: [/stripe|checkout|payment|pay\s*now|pricing|subscribe/i, /card.?number|credit.?card|billing/i],
    api: [/(?:POST|GET)\s*\(\s*["']\/api\/payment|stripe\.webhooks|razorpay|checkout\.sessions/i, /createPayment|processPayment/i],
    database: [/订单|payment.*table|paymentsTable|subscriptions|invoices/i, /amount|currency|status.*payment/i],
    persistence: [/payment\.create|order\.save|subscription\.create/i, /INSERT INTO.*payment|UPDATE.*payment/i],
    runtime: [/stripe\.checkout|swebhook.*signature|razorpay.*verify/i, /paymentIntent|order\.status/i],
  },
  {
    slug: "dashboard",
    name: "Dashboard",
    frontend: [/dashboard|overview|analytics|stats/i, /chart|graph|recharts|d3|chart\.js/i],
    api: [/(?:GET)\s*\(\s*["']\/api\/dashboard|\/api\/stats|\/api\/analytics/i, /getStats|getAnalytics/i],
    database: [/(?:SELECT|select).*FROM.*(?:COUNT|SUM|AVG)/i, /aggregate|groupBy/i],
    persistence: [/\.find\(|\.aggregate\(|rawQuery/i],
    runtime: [/\bformatNumber\b/, /\btoLocaleString\b.*\d{4}/],
  },
  {
    slug: "search",
    name: "Search",
    frontend: [/search|filter|query/i, /input.*search|searchBar/i],
    api: [/(?:GET|POST)\s*\(\s*["']\/api\/search|searchHandler/i, /LIKE|FTS|fulltext|elasticsearch/i],
    database: [/CREATE.*INDEX|GIN.*index|to_tsvector|search_vector/i, /LIKE.*%|regex.*search/i],
    persistence: [/\.find\(.*\$text|\.search\(|WHERE.*description/i],
    runtime: [/setSearchResults|onSearch|handleSearch/i],
  },
  {
    slug: "notifications",
    name: "Notifications",
    frontend: [/notification|toast|alert|message|inbox/i, /sendNotification|showToast/i],
    api: [/(?:POST|GET)\s*\(\s*["']\/api\/notification|pushNotification/i, /webpush|firebase.*messaging/i],
    database: [/notification.*table|notificationsTable/i, /CREATE TABLE.*notif/i],
    persistence: [/\.create.*notif|INSERT INTO.*notif|markAsRead/i],
    runtime: [/new\s+Notification|Notification\.permission|serviceWorker/i],
  },
  {
    slug: "ai_chat",
    name: "AI Chat",
    frontend: [/chat|message|prompt|assistant/i, /sendMessage|chatInput/i],
    api: [/(?:POST)\s*\(\s*["']\/api\/chat|openai|groq|claude|gemini/i, /stream.*response|chatCompletion/i],
    database: [/conversation.*table|messagesTable/i],
    persistence: [/\.create.*message|saveMessage/],
    runtime: [/EventSource|ReadableStream|text\/event-stream/i],
  },
  {
    slug: "subscription",
    name: "Subscriptions",
    frontend: [/subscription|plan|upgrade|billing|premium/i, /pro|enterprise|free.?plan/i],
    api: [/(?:POST|GET)\s*\(\s*["']\/api\/subscription|webhook.*subscription/i, /cancelSubscription|createSubscription/i],
    database: [/subscription.*table|plan.*table/i, /stripe.*customer|razorpay.*subscription/i],
    persistence: [/\.create.*subscription|UPDATE.*plan/i],
    runtime: [/subscription\.status|trial_end|current_period_end/i],
  },
];

export function runProductRealityEngine(keyFiles: Array<{ path: string; content: string }>): ProductRealityReport {
  const mockupResult = runMockupDetector(keyFiles);
  const features: FeatureCheck[] = [];

  // Combine all file content for pattern matching
  const allContent = keyFiles.map((f) => f.content).join("\n");
  const allFilePaths = keyFiles.map((f) => f.path);

  for (const pattern of FEATURE_PATTERNS) {
    const checkFeature = (patterns: RegExp[]): boolean =>
      patterns.some((p) => keyFiles.some((f) => p.test(f.content)));

    const frontend = checkFeature(pattern.frontend);
    const api = checkFeature(pattern.api);
    const database = checkFeature(pattern.database);
    const persistence = checkFeature(pattern.persistence);
    const runtime = checkFeature(pattern.runtime);

    // Only report features that have at least frontend
    if (!frontend) continue;

    const checks = [frontend, api, database, persistence, runtime];
    const passingChecks = checks.filter(Boolean).length;
    const confidence = Math.round((passingChecks / checks.length) * 100);

    const issues: string[] = [];
    if (!api) issues.push("No backend API routes found");
    if (!database) issues.push("No database schema or queries found");
    if (!persistence) issues.push("Data is not being saved to database");
    if (!runtime) issues.push("Cannot verify end-to-end flow");

    features.push({
      name: pattern.name,
      slug: pattern.slug,
      frontend,
      api,
      database,
      persistence,
      runtime,
      confidence,
      issues,
    });
  }

  // Calculate reality score
  const totalFeatures = features.length;
  const verifiedFeatures = features.filter((f) => f.confidence >= 80).length;
  const partialFeatures = features.filter((f) => f.confidence >= 40 && f.confidence < 80).length;
  const mockFeatures = features.filter((f) => f.confidence < 40).length;

  const realityScore = totalFeatures > 0
    ? Math.round(
        features.reduce((sum, f) => sum + f.confidence, 0) / totalFeatures
      )
    : 100;

  // Deployment blockers
  const deploymentBlockers: string[] = [];
  if (mockupResult.totalFindings > 5) deploymentBlockers.push("Multiple mockup patterns detected");
  if (features.some((f) => f.slug === "auth" && f.confidence < 50)) deploymentBlockers.push("Authentication not properly implemented");
  if (features.some((f) => f.slug === "payment" && f.confidence < 50)) deploymentBlockers.push("Payment flow appears non-functional");
  if (mockupResult.findings.some((f) => f.type === "simulated_auth")) deploymentBlockers.push("Hardcoded/simulated authentication");
  if (mockupResult.findings.some((f) => f.type === "fake_payment")) deploymentBlockers.push("Fake payment processing");

  const brokenFlows = features.filter((f) => f.frontend && !f.persistence).length;

  let summary: string;
  if (realityScore >= 80) {
    summary = `Strong product. ${verifiedFeatures} of ${totalFeatures} features fully functional. ${mockFeatures > 0 ? `${mockFeatures} feature(s) need backend work.` : "All features verified."}`;
  } else if (realityScore >= 60) {
    summary = `${verifiedFeatures} features work end-to-end. ${partialFeatures} are partial (UI exists but backend missing). ${mockFeatures} are mockups only.`;
  } else if (realityScore >= 40) {
    summary = `${mockFeatures} of ${totalFeatures} features appear to be mockups. UI exists but backend, database, or persistence is missing.`;
  } else {
    summary = `Mostly mockup. Only ${Math.round(realityScore)}% of features have real implementations. Significant backend work needed before launch.`;
  }

  logger.info({ realityScore, totalFeatures, verified: verifiedFeatures, mock: mockFeatures }, "Product Reality Engine complete");

  return {
    realityScore,
    totalFeatures,
    verifiedFeatures,
    partialFeatures,
    mockFeatures,
    brokenFlows,
    deploymentBlockers,
    features,
    mockupFindings: mockupResult,
    summary,
  };
}
