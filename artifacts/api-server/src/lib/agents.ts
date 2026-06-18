import Groq from "groq-sdk";
import { logger } from "./logger.js";

// Primary: Groq (fast, high TPM free tier) — optional if GROQ_API_KEY not set
const groq = process.env["GROQ_API_KEY"]
  ? new Groq({ apiKey: process.env["GROQ_API_KEY"] })
  : null;

// Secondary: OpenRouter (multiple free models for load distribution)
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const openrouterKey = process.env["OPENROUTER_API_KEY"];
const openrouter = openrouterKey
  ? new Groq({ apiKey: openrouterKey, baseURL: OPENROUTER_BASE })
  : null;

// Tertiary: Cerebras (OpenAI-compatible endpoint)
const cerebras = process.env["CEREBRAS_API_KEY"]
  ? new Groq({
      apiKey: process.env["CEREBRAS_API_KEY"],
      baseURL: "https://api.cerebras.ai/v1",
    })
  : null;

// Fast small model on Groq — for all parallel per-agent calls
const FAST_MODEL = "llama-3.1-8b-instant";
// Smart model on Groq — reserved for synthesis/forecast
const SMART_MODEL = "llama-3.3-70b-versatile";
// Cerebras model — full 70b fallback
const CEREBRAS_MODEL = "llama-3.3-70b";

// OpenRouter free models — round-robin across these for load balancing
const OPENROUTER_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "cohere/north-mini-code:free",
  "poolside/laguna-m.1:free",
];
let orModelIndex = 0;
function nextOpenRouterModel(): string {
  const m = OPENROUTER_MODELS[orModelIndex % OPENROUTER_MODELS.length];
  orModelIndex++;
  return m;
}

// Return first available AI client (for direct synthesis calls outside callWithFallback)
function getAnyClient(): Groq {
  const client = groq ?? openrouter ?? cerebras;
  if (!client) throw new Error("No AI provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY.");
  return client;
}
function smartModel(): string {
  if (groq) return SMART_MODEL;
  if (openrouter) return "meta-llama/llama-3.3-70b-instruct:free";
  return CEREBRAS_MODEL;
}
function fastModel(): string {
  if (groq) return FAST_MODEL;
  if (openrouter) return "meta-llama/llama-3.1-8b-instruct:free";
  return CEREBRAS_MODEL;
}

export interface AgentIssue {
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  fixPrompt: string;
  confidence?: number;
  evidence?: string;
  // Evidence Standard fields
  filePath?: string;
  lineNumber?: number;
  codeSnippet?: string;
  impact?: string;
  sourceEvidence?: string;
  retestResult?: string;
}

export interface AgentResult {
  agentName: string;
  issues: AgentIssue[];
}

export interface RiskForecast {
  appType: string;
  churnRisk: "low" | "medium" | "high" | "critical";
  conversionLoss: string;
  authBreakageProbability: string;
  checkoutFailureRisk: "low" | "medium" | "high" | "critical";
  incidentProbability: string;
  supportLoadEstimate: string;
  revenueAtRisk: string;
  topFailureModes: string[];
  executiveRecommendation: string;
}

export interface RevenueIntelligence {
  overallRevenueRisk: "low" | "medium" | "high" | "critical";
  leaks: Array<{
    category: string;
    severity: "critical" | "high" | "medium" | "low";
    impact: string;
    description: string;
    fix: string;
  }>;
  estimatedMonthlyImpact: string;
  quickWins: string[];
}

export interface ComplianceResult {
  framework: string;
  score: number;
  status: "pass" | "partial" | "fail";
  findings: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
}

const AGENTS = [
  {
    name: "Security & Access Control",
    role: `You are a world-class application security engineer and penetration tester specializing in AI-generated codebases. 
Analyze the app for:
- Exposed API keys, secrets, or tokens in client-side code or env files
- Broken authentication: session fixation, weak password policies, missing MFA hooks
- Broken Access Control (IDOR): can user A access user B's resources by changing an ID?
- Missing authorization middleware on sensitive routes
- CORS misconfigurations allowing cross-origin attacks
- SQL/NoSQL injection via unsanitized inputs
- XSS: missing Content-Security-Policy, unsanitized innerHTML
- Insecure direct object references in file uploads
- Missing rate limiting on auth endpoints (brute force risk)
- JWT/token security: algorithm confusion, missing expiry, weak secrets
- Server-Side Request Forgery (SSRF) via user-controlled URLs
- Path traversal in file operations
- Mass assignment vulnerabilities

For each issue, provide: exact reproduction steps if possible, business impact (data breach, account takeover, financial loss), and a specific Cursor/Bolt fix prompt.`,
  },
  {
    name: "Compliance & Regulatory",
    role: `You are a compliance engineer specializing in multi-framework software regulatory requirements.
Analyze the app against these 8 frameworks:

GDPR: Missing consent mechanisms, data retention policies, right-to-deletion, DPA requirements, cross-border data transfer
OWASP Top 10 (2021): A01-A10 — injection, auth failures, data exposure, XXE, security misconfig, vulnerable components, auth/session, SSRF
PCI-DSS v4.0: Card data handling, TLS enforcement, no storing CVV, audit logging
HIPAA: PHI protection, access controls, audit trails, encryption at rest/transit
SOC 2 Type II: Availability, confidentiality, processing integrity, security controls
ISO 27001: Information security management gaps
CCPA: California consumer rights — opt-out, disclosure, deletion rights
WCAG 2.1 AA: Accessibility violations creating legal liability

For each finding, specify which framework(s) it violates, the specific clause, and the penalty risk.`,
  },
  {
    name: "Revenue & Business Logic",
    role: `You are a revenue engineering expert who has audited 500+ SaaS products.
Analyze the app for revenue-killing issues:

PAYMENT FLOWS: Double charges, failed webhook handling, missing idempotency keys, no retry on payment failure, subscription lifecycle gaps (dunning, cancellation, reactivation)
CHECKOUT FRICTION: Steps to conversion, missing progress indicators, confusing error messages, abandoned cart scenarios
BILLING EDGE CASES: Trial expiry without notification, proration errors, invoice generation failures, tax calculation missing
FRAUD VECTORS: Coupon abuse, trial account abuse, chargebacks not handled, free tier bypass
ONBOARDING LEAKS: Where users drop off before activation, missing onboarding emails, no progress tracking
PRICING PAGE GAPS: Missing social proof, no urgency mechanism, unclear value proposition, no comparison table
UPSELL GAPS: No contextual upgrade prompts, feature gates not shown, no usage-based billing signals
RETENTION SIGNALS: No usage analytics, no re-engagement triggers, no success milestones

Quantify revenue impact in dollar/rupee estimates where possible.`,
  },
  {
    name: "Performance & Scalability",
    role: `You are a principal performance engineer who has scaled products to millions of users.
Analyze for:

BUNDLE PERFORMANCE: JavaScript bundle size, code splitting, tree shaking, lazy loading of routes/components
DATABASE: N+1 queries, missing indexes on filter/sort columns, unbounded queries without pagination, connection pool misconfiguration
CACHING: Missing Redis/CDN caching, cache stampede risks, stale-while-revalidate patterns
RENDERING: Unnecessary re-renders, missing memo/useMemo/useCallback, large component trees
API LATENCY: Missing compression, no streaming for large payloads, synchronous blocking operations
SCALABILITY LIMITS: Single-instance assumptions, no horizontal scaling design, hardcoded limits
MEMORY: Memory leaks in event listeners, unbounded data growth, large object retention
REAL-WORLD TRAFFIC: What breaks first at 100 concurrent users? At 1,000? At 10,000?

Provide specific performance improvement estimates (load time, query time, throughput).`,
  },
  {
    name: "User Experience & Conversion",
    role: `You are a UX engineer and conversion rate optimization expert.
Analyze for:

CRITICAL FLOWS: Sign up → activation → first value (time to value), purchase flow completion rate
LOADING STATES: Skeleton screens vs spinners vs nothing, perceived performance
MOBILE EXPERIENCE: Touch targets (min 44px), viewport issues, horizontal scroll, font sizes
ERROR HANDLING: User-facing error messages (jargon-free?), recovery paths, form validation
ACCESSIBILITY: Screen reader compatibility, keyboard navigation, color contrast (4.5:1 minimum), ARIA labels
EMPTY STATES: First-time user experience, zero-data states, onboarding hints
MICRO-INTERACTIONS: Button feedback, form progression, success confirmations
TRUST SIGNALS: Security badges, testimonials, privacy assurance at conversion points

Estimate conversion impact in %-points for each issue.`,
  },
  {
    name: "Reliability & Error Handling",
    role: `You are a Senior SRE (Site Reliability Engineer) with experience at high-scale production systems.
Analyze for:

ERROR BOUNDARIES: Missing React error boundaries that cause full white-screen crashes
RETRY LOGIC: No exponential backoff on failed API calls, no circuit breaker for external dependencies
TIMEOUTS: Missing request timeouts (both client and server), no AbortController usage
GRACEFUL DEGRADATION: What happens when Stripe is down? When the DB is slow? When Groq/OpenAI fails?
RACE CONDITIONS: Parallel state updates, missing optimistic update rollbacks, duplicate submissions
UNHANDLED REJECTIONS: Bare async/await without try-catch, unhandled Promise.reject()
DATA LOSS SCENARIOS: Form data lost on navigation, optimistic updates not rolled back on failure
MONITORING GAPS: No uptime monitoring, no alerting on error rate spikes, no SLA definition

Estimate MTTR (Mean Time To Recovery) impact for each issue.`,
  },
  {
    name: "Data Integrity & Architecture",
    role: `You are a software architect and data integrity expert with 15+ years experience.
Analyze for:

API VALIDATION: Missing server-side validation (trusting client data), no schema enforcement
DATABASE TRANSACTIONS: Missing ACID transactions for multi-step operations, potential partial writes
DATA CORRUPTION: Race conditions in concurrent writes, missing row-level locking
ARCHITECTURE SMELLS: Tight coupling creating cascading failures, circular dependencies, god objects/components
TECHNICAL DEBT: Dead code from AI scaffolding, over-engineered solutions, wrong abstractions
SOFT DELETE: Hard deletes breaking referential integrity, no audit trail
DATA MODELING: Missing foreign keys, no normalization strategy, blob columns hiding structured data
BACKUP STRATEGY: No backup configuration, no point-in-time recovery plan, no disaster recovery

Estimate technical debt accumulation rate and remediation cost.`,
  },
  {
    name: "Observability & Launch Readiness",
    role: `You are a DevOps and observability engineer.
Analyze for:

LOGGING: Missing structured logs for critical business events (sign up, payment, error), PII in logs
ERROR TRACKING: No Sentry/Datadog/equivalent configured, errors silently swallowed
ANALYTICS: No conversion funnel tracking, no feature usage analytics, flying blind on user behavior
HEALTH CHECKS: Missing /healthz endpoint, no database connectivity check, no external dependency checks
ENV VALIDATION: App starts with missing required env vars (should fail fast on startup)
RATE LIMITING: Public APIs unprotected, no DDoS mitigation
SECURITY HEADERS: Missing CSP, HSTS, X-Frame-Options, X-Content-Type-Options
DEPLOYMENT: No zero-downtime deployment strategy, missing rollback plan, no blue-green/canary
ALERTS: No PagerDuty/alerting on error spike, payment failure rate, or latency degradation
RUNBOOKS: No incident response documentation

Score: would a new engineer be able to debug a production incident in < 1 hour?`,
  },
  {
    name: "AI Code Quality",
    role: `You are the world's leading expert on AI-generated code quality and vibe-coding anti-patterns, with a pattern database of known failures from each major AI coding tool.

VIBE TOOL SIGNATURES (identify which tool built this, then apply its known failure patterns):
- REPLIT AI: monolithic App.tsx (900+ lines), PORT hardcoded, express with no helmet/rate-limiting, no .env.example, secrets referenced directly from process.env without validation, missing CORS origins whitelist
- CURSOR AI: multiple conflicting implementations of same function (different AI sessions), "TODO: implement this" placeholders in production paths, inconsistent TypeScript strictness (some files strict, others not), over-use of 'as' type casts
- LOVABLE/BOLT: Firebase/Supabase with no RLS enabled (all data publicly readable), API keys in client-side code, auth checked only on frontend (no server-side guard), single-file components exceeding 2000 lines
- WINDSURF/CODEIUM: duplicate utility functions with slight variations, missing cleanup in useEffect, async functions without try-catch in 60%+ of cases
- GITHUB COPILOT: boilerplate security gaps (auth checking with comment "// TODO: validate user"), SQL queries with string interpolation, error swallowing (catch(e) {}), debug console.logs left in

HALLUCINATED APIS: Import statements for libraries that don't exist, methods called on wrong types
AI COPY-PASTE DEBT: Duplicate logic from different AI sessions — same validation written 3 different ways
MONOLITHIC FILES: 500+ line components that AI generated but should be split into 5+ files
INCORRECT HOOKS: useEffect with wrong/missing deps array, stale closures, missing cleanup
AI SECURITY PATTERNS: console.log(password), hardcoded test credentials, NODE_ENV=production hardcoded
PROMPT ARTIFACT DEBT: Comments "TODO: add auth here", "placeholder", "replace with real data" in production
AI SCAFFOLDING BLOAT: Unused imports from AI scaffolding, dead components never rendered, mockData in prod

For each finding: cite the exact file + line from the code context. The vibe tool detection finding should state the tool name, confidence level, and top 3 tool-specific failure patterns found.`,
  },
  {
    name: "Founder Blind Spots",
    role: `You are a battle-hardened technical co-founder and startup advisor who has seen 200+ products launch.
This is the "what founders miss" analysis. Look for:

DAY-ONE EXPLOITS: Rate limit bypass, signup spam, resource exhaustion attacks that will happen within 24h of launch
ADMIN TOOLING: No way to ban users, reset passwords, view/manage customer data without direct DB access
FEATURE FLAGS: Zero ability to disable a broken feature without a redeploy (kills you at 3am)
EMAIL DELIVERABILITY: Transactional emails going to spam, missing SPF/DKIM, no bounce handling
LEGAL EXPOSURE: Missing privacy policy, terms of service, cookie consent (GDPR fine risk)
SCALE ASSUMPTIONS: "We'll fix it when we have users" — but which thing breaks first at 100 users?
SUPPORT TOOLING: No way for customer support to impersonate/help a specific user
ENVIRONMENT HYGIENE: Using production Stripe keys in development, no staging environment
BACKUP STRATEGY: One DB drop and they lose everything — no automated backups
FOUNDER KNOWLEDGE: The app only works because the founder knows the magic URL — no documentation

Final answer: If this app launched on Product Hunt tomorrow, what would break in the first 24 hours?`,
  },
  {
    name: "Mobile & PWA Audit",
    role: `You are a senior mobile UX engineer specializing in Progressive Web Apps and responsive design.
Analyze for:

TOUCH TARGETS: Buttons/links smaller than 44px — tap accuracy issues on mobile
VIEWPORT CONFIG: Missing meta viewport, content wider than screen, horizontal scroll
FONT LEGIBILITY: Text below 12px on mobile, poor contrast on small screens
OFFLINE CAPABILITY: No service worker, no offline fallback page, no manifest.json for PWA
MOBILE PERFORMANCE: Unoptimized images for mobile, no lazy loading, large JS bundles blocking LCP
GESTURE CONFLICTS: Swipe navigation conflicts, pinch-zoom disabled where unhelpful
NATIVE FEEL: No splash screen, no app icon, missing theme-color meta
iOS SAFARI QUIRKS: 100vh issues, position:fixed bugs, overscroll behavior, input zoom
ANDROID QUIRKS: Back button handling, custom scrollbars broken, input type issues
MOBILE AUTH: Autofill not enabled, password manager compatibility, biometric auth not considered

Estimate % of mobile users affected by each issue.`,
  },
  {
    name: "i18n & Accessibility Deep Scan",
    role: `You are an internationalization and accessibility specialist with WCAG 2.2 and ARIA expertise.
Analyze for:

HARDCODED STRINGS: English text in JSX that should be in i18n keys, date/currency without locale formatting
RTL SUPPORT: CSS that breaks right-to-left layouts (Arabic, Hebrew, Farsi markets)
PLURALIZATION: Missing plural forms for different languages (0 items vs 1 item vs N items)
ARIA ROLES: Missing role attributes on interactive elements, wrong ARIA usage
KEYBOARD NAVIGATION: Focus order incorrect, focus trap in modals, no skip-to-content
SCREEN READER: Images without alt text, icon-only buttons without aria-label, live region announcements
COLOR CONTRAST: Text/background combinations below 4.5:1 WCAG AA ratio
FORM ACCESSIBILITY: Labels not associated with inputs, required fields not announced
DYNAMIC CONTENT: Async content updates not announced to screen readers
LEGAL RISK: WCAG failures creating ADA/EAA (European Accessibility Act) liability

Rate each finding by WCAG criterion (e.g., 1.1.1, 2.4.7).`,
  },
  {
    name: "Supply Chain Security",
    role: `You are a supply chain security engineer specializing in npm/yarn ecosystem threats.
Analyze for:

DEPENDENCY CONFUSION: Package names that could be typosquatted (lodash vs lodasj)
UNPINNED VERSIONS: ^ and ~ semver ranges allowing malicious minor updates
DIRECT vs TRANSITIVE: High-severity vulns hiding in transitive deps
ABANDONED PACKAGES: Dependencies with no updates in 2+ years, no security patches
LICENSE RISKS: GPL/AGPL deps in commercial product, license incompatibility
LOCKFILE INTEGRITY: Missing package-lock.json / yarn.lock, or lockfile not committed
SCRIPTS: postinstall scripts from third-party packages that execute arbitrary code
PRIVATE REGISTRY: No scoped registry for internal packages — namespace squatting risk
SBOM: No Software Bill of Materials generated — compliance and audit gap
SIGNING: No package signing verification (npm provenance, Sigstore)

Flag each package by name with the specific CVE or risk pattern.`,
  },
  {
    name: "Cloud Cost Efficiency",
    role: `You are a FinOps engineer and cloud cost optimization specialist.
Analyze for:

OVER-PROVISIONING: Default instance sizes that are 10x larger than needed for MVP traffic
UNOPTIMIZED QUERIES: N+1 queries that cause unnecessary read units / DTUs in managed DBs
MISSING CDN: Static assets served from app server instead of CDN — unnecessary compute cost
NO CACHING: Repeated identical API calls to paid external services (OpenAI, Stripe, Twilio)
STORAGE WASTE: No lifecycle policies on user uploads, logs accumulating without rotation
AUTO-SCALING: No horizontal scaling config — will need vertical scaling (10x price jump)
PAID API OVERUSE: No rate limiting / memoization on expensive AI or SMS API calls
COLD STARTS: Serverless functions with heavy dependencies causing expensive cold starts
LOG RETENTION: Indefinite log retention in paid observability tools
COST BLIND SPOTS: No billing alerts, no cost allocation tags, no budget caps set

Estimate monthly cost impact in USD/INR for each finding.`,
  },
  {
    name: "Business Logic Attack Lab",
    role: `You are an elite application security researcher specializing in business logic vulnerabilities — the class of exploits that steal real money and bypass all standard security controls. These require deep understanding of how the app is supposed to work and where implementation diverges from intent.

SUBSCRIPTION & ENTITLEMENT BYPASS:
- Downgrade attack: subscribe to paid plan → cancel → continue accessing paid features (missing server-side plan check on every request)
- Trial abuse: multiple accounts from same IP/email pattern to extend trials indefinitely
- Plan hopping: upgrade during high-usage period → immediately downgrade (prorating edge case)
- Feature flag bypass: paid features gated only by frontend flag, not validated on API endpoint

PRICE & PAYMENT MANIPULATION:
- Negative quantity attack: add -1 items to cart to receive credit (missing server-side quantity validation > 0)
- Price parameter tampering: POST /checkout with {price: 1} — does server accept client-provided price?
- Discount stacking: apply multiple promo codes simultaneously (race condition on coupon redemption)
- Coupon reuse: apply same coupon after refund/cancellation (no redemption count reset guard)
- Currency confusion: submit price in different currency unit (cents vs rupees vs dollars)

RACE CONDITION EXPLOITS:
- Double-purchase: send identical checkout request twice simultaneously (missing idempotency key)
- Inventory oversell: multiple users purchase last item simultaneously (no SKIP LOCKED / SELECT FOR UPDATE)
- Referral self-abuse: refer yourself via multiple accounts to earn rewards
- Reward double-claim: claim reward, then trigger refund to keep both reward and refund

MULTI-STEP FLOW ABUSE:
- Checkout step-skip: complete order without going through payment step (only last step validates?)
- Email verification bypass: complete signup without confirming email (feature gating missing downstream)
- OTP replay: reuse one-time password within validity window by replaying intercepted request
- State machine bypass: navigate directly to /onboarding/step-5 without completing steps 1-4

FRAUD VECTORS:
- Chargeback after digital delivery: purchase, receive digital goods, dispute with bank
- Account takeover via password reset timing: predictable reset token or no expiry
- API rate limit bypass: same action via different user agents, IPs, or API versions
- Free-tier API abuse: call a paid endpoint through the free-tier route

For each finding: provide exact HTTP request to reproduce (method, path, body), business impact in ₹/$ (estimated monthly loss if exploited), and the specific code path that's vulnerable.`,
  },
];

// ── Smart Token Budget Optimizer ─────────────────────────────────────────────
// Each agent gets a targeted code context (2-3x smaller), improving quality
// and reducing token usage by ~60% across all 10 parallel agents.

const AGENT_FILE_KEYWORDS: Record<string, string[]> = {
  "Security & Access Control": ["auth", "middleware", "session", "jwt", "cors", "token", "password", "secret", "permission", "guard", "protect", "login", "signup", "oauth", "cookie", "csrf"],
  "Compliance & Regulatory": ["privacy", "cookie", "consent", "gdpr", "terms", "policy", "data", "collect", "retention", "delete", "export", "personal"],
  "Revenue & Business Logic": ["payment", "billing", "stripe", "razorpay", "checkout", "subscription", "plan", "price", "charge", "invoice", "webhook", "order", "cart", "coupon", "promo"],
  "Performance & Scalability": ["db", "database", "query", "index", "cache", "redis", "api", "fetch", "bundle", "build", "config", "vite", "webpack", "pool", "connection"],
  "User Experience & Conversion": ["component", "page", "form", "button", "input", "loading", "error", "modal", "toast", "ui", "signup", "onboard", "dashboard"],
  "Reliability & Error Handling": ["error", "catch", "try", "throw", "timeout", "retry", "fallback", "boundary", "handler", "exception", "abort", "signal"],
  "Data Integrity & Architecture": ["schema", "model", "migration", "transaction", "orm", "drizzle", "prisma", "typeorm", "entity", "relation", "foreign", "index"],
  "Observability & Launch Readiness": ["log", "logger", "monitor", "health", "env", "config", "alert", "rate", "limit", "sentry", "datadog", "metric", "trace"],
  "AI Code Quality": [],
  "Founder Blind Spots": [],
  "Mobile & PWA Audit": ["component", "page", "css", "viewport", "touch", "mobile", "responsive", "manifest", "serviceworker"],
  "i18n & Accessibility Deep Scan": ["component", "page", "form", "button", "input", "aria", "label", "i18n", "locale", "translate"],
  "Supply Chain Security": ["package", "package.json", "node_modules", "yarn.lock", "package-lock", "dependency", "dep"],
  "Cloud Cost Efficiency": ["config", "env", "api", "fetch", "cache", "db", "database", "query", "upload", "storage", "log"],
  "Business Logic Attack Lab": ["payment", "billing", "stripe", "razorpay", "checkout", "subscription", "plan", "price", "charge", "invoice", "webhook", "order", "cart", "coupon", "promo", "refund", "trial", "auth", "session", "middleware", "route"],
};

function selectFilesForAgent(
  agentName: string,
  keyFiles: Array<{ path: string; content: string }>,
): Array<{ path: string; content: string }> {
  const keywords = AGENT_FILE_KEYWORDS[agentName] ?? [];
  if (keywords.length === 0) return keyFiles.slice(0, 6); // all-purpose agents get more files

  const scored = keyFiles.map((f) => {
    const pathLower = f.path.toLowerCase();
    const score = keywords.filter((kw) => pathLower.includes(kw)).length;
    return { ...f, score };
  });

  // Take top scored files (relevant) + 1 fallback (general context)
  const relevant = scored
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const fallback = scored
    .filter((f) => f.score === 0)
    .slice(0, 1);

  const selected = [...relevant, ...fallback];
  return selected.length > 0 ? selected : keyFiles.slice(0, 2);
}

// Per-agent token budget: how many chars to allocate per file
const AGENT_FILE_BUDGET: Record<string, number> = {
  "Security & Access Control": 1200,
  "Compliance & Regulatory": 800,
  "Revenue & Business Logic": 1200,
  "Performance & Scalability": 1000,
  "User Experience & Conversion": 900,
  "Reliability & Error Handling": 900,
  "Data Integrity & Architecture": 1000,
  "Observability & Launch Readiness": 800,
  "AI Code Quality": 600,
  "Founder Blind Spots": 700,
};

function buildUserPrompt(
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
  agentName?: string,
): string {
  let contextSection = "";

  if (codeContext) {
    const fileBudget = agentName ? (AGENT_FILE_BUDGET[agentName] ?? 800) : 800;
    const selectedFiles = agentName
      ? selectFilesForAgent(agentName, codeContext.keyFiles)
      : codeContext.keyFiles.slice(0, 4);

    // Compress routes: security/observability agents get full routes, others get summary
    const routesContent = (agentName === "Security & Access Control" || agentName === "Observability & Launch Readiness")
      ? codeContext.routes.slice(0, 2000)
      : codeContext.routes.slice(0, 800);

    contextSection = `
REAL CODE CONTEXT (evidence-based findings required):
Framework: ${codeContext.framework} | Tool: ${codeContext.vibeTool} | Type: ${codeContext.businessType} | Files: ${codeContext.totalFiles}

API Routes:
${routesContent}
${codeContext.schemas ? `\nDB Schema:\n${codeContext.schemas.slice(0, 1000)}` : ""}

Relevant Source Files:
${selectedFiles.map((f) => `--- ${f.path} ---\n${f.content.slice(0, fileBudget)}`).join("\n\n")}
`;
  }

  return `Analyze this app and find real, specific, production-critical issues within your area of expertise.

Source: ${sourceInput} (type: ${sourceType})
${appDescription ? `Developer's Description: ${appDescription}` : ""}
${contextSection}

Return ONLY valid JSON following the Agenario Evidence Standard:
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "title": "Short specific issue title (max 8 words)",
      "description": "Clear explanation of the vulnerability with real production context.",
      "filePath": "src/auth/jwt.ts",
      "lineNumber": 42,
      "codeSnippet": "const JWT_SECRET = 'hardcoded-secret';",
      "impact": "Quantified business impact: attacker can do X, causing Y data exposure / Z revenue loss / N% churn increase.",
      "fixPrompt": "Ready-to-paste fix prompt for Cursor/Claude with exact file + function names",
      "confidence": 85,
      "evidence": "Direct observation or pattern that proves this issue exists",
      "sourceEvidence": "static|runtime|ai_reasoning",
      "retestResult": "needs_fix"
    }
  ]
}

Rules:
- Find 2–5 realistic, high-impact issues. No filler.
- Every issue MUST have a clear production consequence (breach, revenue loss, outage, user drop-off).
- filePath: exact relative path from the code context (e.g. "src/routes/auth.ts"). Required when real code provided.
- lineNumber: best estimate of the vulnerable line number. Required when filePath is set.
- codeSnippet: the exact vulnerable code line or pattern (1–3 lines). Required when filePath is set.
- impact: quantified statement — "Attacker can access all user records (GDPR violation, ₹20L fine risk)" not "security risk".
- confidence: 95–99 runtime-provable, 85–94 direct code evidence, 70–84 pattern inference, 60–69 AI reasoning.
- sourceEvidence: "static" if from code analysis, "runtime" if from HTTP/browser probe, "ai_reasoning" if inferred.
- fixPrompt must be copy-paste ready — reference specific file/function names from the code context.
- retestResult: always "needs_fix" for new findings.`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callWithFallback(
  messages: { role: "system" | "user"; content: string }[],
  opts: { model: string; cerebrasModel?: string; maxTokens?: number },
): Promise<string> {
  const messages_typed = messages as Groq.ChatCompletionMessageParam[];

  // Try OpenRouter first (multiple free models, no rate limits on individual)
  if (openrouter) {
    const orModel = nextOpenRouterModel();
    try {
      const response = await openrouter.chat.completions.create({
        model: orModel,
        messages: messages_typed,
        response_format: { type: "json_object" },
        max_tokens: opts.maxTokens ?? 1500,
      });
      const content = response.choices[0]?.message?.content ?? "{}";
      if (content && content !== "{}") return content;
    } catch (orErr: unknown) {
      logger.warn({ orErr, model: orModel }, "OpenRouter model failed — trying Groq");
    }
  }

  // Fallback: Groq (if key is configured)
  if (groq) {
    try {
      const response = await groq.chat.completions.create({
        model: opts.model,
        messages: messages_typed,
        response_format: { type: "json_object" },
        max_tokens: opts.maxTokens ?? 1500,
      });
      return response.choices[0]?.message?.content ?? "{}";
    } catch (primaryErr: unknown) {
      const isRateLimit =
        primaryErr instanceof Error &&
        (primaryErr.message.includes("429") || primaryErr.message.includes("Rate limit"));

      // On Groq rate limit, try Cerebras
      if (isRateLimit && cerebras) {
        try {
          logger.info("Groq rate limited — falling back to Cerebras");
          const response = await cerebras.chat.completions.create({
            model: opts.cerebrasModel ?? CEREBRAS_MODEL,
            messages: messages_typed,
            response_format: { type: "json_object" },
            max_tokens: opts.maxTokens ?? 1500,
          });
          return response.choices[0]?.message?.content ?? "{}";
        } catch (cerebrasErr) {
          logger.warn({ cerebrasErr }, "Cerebras fallback also failed");
        }
      }
      throw primaryErr;
    }
  }

  // If only Cerebras is configured
  if (cerebras) {
    const response = await cerebras.chat.completions.create({
      model: opts.cerebrasModel ?? CEREBRAS_MODEL,
      messages: messages_typed,
      response_format: { type: "json_object" },
      max_tokens: opts.maxTokens ?? 1500,
    });
    return response.choices[0]?.message?.content ?? "{}";
  }

  throw new Error("No AI provider available. Set GROQ_API_KEY, OPENROUTER_API_KEY, or CEREBRAS_API_KEY.");
}

async function runAgentWithRetry(
  agent: (typeof AGENTS)[0],
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
  retries = 3,
): Promise<AgentResult> {
  const messages = [
    { role: "system" as const, content: agent.role },
    { role: "user" as const, content: buildUserPrompt(sourceType, sourceInput, appDescription, codeContext, agent.name) },
  ];

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const content = await callWithFallback(messages, { model: FAST_MODEL });
      const parsed = JSON.parse(content) as { issues?: AgentIssue[] };
      return {
        agentName: agent.name,
        issues: (parsed.issues ?? []).map((issue) => ({
          ...issue,
          confidence: issue.confidence ?? 65,
          evidence: issue.evidence ?? undefined,
          filePath: issue.filePath ?? undefined,
          lineNumber: issue.lineNumber ?? undefined,
          codeSnippet: issue.codeSnippet ?? undefined,
          impact: issue.impact ?? undefined,
          sourceEvidence: issue.sourceEvidence ?? "ai_reasoning",
          retestResult: issue.retestResult ?? "needs_fix",
        })),
      };
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error && (err.message.includes("429") || err.message.includes("Rate limit"));
      if (isRateLimit && attempt < retries) {
        const waitMs = 10000 * (attempt + 1);
        logger.warn({ agent: agent.name, attempt, waitMs }, "Both providers rate limited — waiting");
        await sleep(waitMs);
        continue;
      }
      logger.error({ err, agent: agent.name }, "Agent failed");
      return { agentName: agent.name, issues: [] };
    }
  }
  return { agentName: agent.name, issues: [] };
}

async function runAgent(
  agent: (typeof AGENTS)[0],
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
): Promise<AgentResult> {
  return runAgentWithRetry(agent, sourceType, sourceInput, appDescription, codeContext);
}

async function runBatched<T>(
  tasks: Array<() => Promise<T>>,
  batchSize: number,
  delayMs: number,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
    if (i + batchSize < tasks.length) {
      await sleep(delayMs);
    }
  }
  return results;
}

async function runLaunchRiskForecast(
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
  issues?: AgentIssue[],
): Promise<RiskForecast> {
  const issuesSummary = issues?.slice(0, 10).map((i) => `${i.severity}: ${i.title}`).join("\n") ?? "";
  const appType = codeContext?.businessType ?? "saas";

  try {
    const response = await getAnyClient().chat.completions.create({
      model: smartModel(),
      messages: [
        {
          role: "system",
          content: `You are a startup risk forecasting expert. Predict specific business failure probabilities based on app type and known issues.`,
        },
        {
          role: "user",
          content: `Analyze this app and predict launch failure risks:

App: ${sourceInput} (${sourceType})
Type: ${appType}
${appDescription ? `Description: ${appDescription}` : ""}
${codeContext?.framework ? `Framework: ${codeContext.framework}` : ""}

Known issues found:
${issuesSummary}

Return ONLY valid JSON:
{
  "appType": "saas|ecommerce|marketplace|restaurant|ai-app|portfolio|other",
  "churnRisk": "low|medium|high|critical",
  "conversionLoss": "e.g. 15-25% estimated conversion loss due to UX friction",
  "authBreakageProbability": "e.g. 40% chance of auth issues in first week based on patterns",
  "checkoutFailureRisk": "low|medium|high|critical",
  "incidentProbability": "e.g. 70% chance of P1 incident within 30 days of launch",
  "supportLoadEstimate": "e.g. 5-8 support tickets per 100 signups",
  "revenueAtRisk": "e.g. ₹50,000-₹2,00,000/mo at risk",
  "topFailureModes": ["specific failure mode 1", "specific failure mode 2", "specific failure mode 3"],
  "executiveRecommendation": "One paragraph board-level recommendation on launch readiness"
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content) as RiskForecast;
  } catch (err) {
    logger.error({ err }, "Risk forecast failed");
    return {
      appType: appType,
      churnRisk: "medium",
      conversionLoss: "Unknown — analysis incomplete",
      authBreakageProbability: "Unknown",
      checkoutFailureRisk: "medium",
      incidentProbability: "Unknown",
      supportLoadEstimate: "Unknown",
      revenueAtRisk: "Unknown",
      topFailureModes: ["Could not complete risk forecast"],
      executiveRecommendation: "Risk forecast unavailable. Review individual findings.",
    };
  }
}

async function runRevenueIntelligence(
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
): Promise<RevenueIntelligence> {
  try {
    const response = await getAnyClient().chat.completions.create({
      model: fastModel(),
      messages: [
        {
          role: "system",
          content: `You are a revenue growth expert who identifies exactly where products lose money. Focus on concrete, specific revenue leaks with quantified impact.`,
        },
        {
          role: "user",
          content: `Identify revenue leaks and business growth blockers in this app:

App: ${sourceInput} (${sourceType})
${appDescription ? `Description: ${appDescription}` : ""}
${codeContext ? `Framework: ${codeContext.framework}, Business Type: ${codeContext.businessType}` : ""}
${codeContext?.routes ? `Routes: ${codeContext.routes.slice(0, 800)}` : ""}

Analyze for:
- Broken onboarding funnel (where users drop before activation)
- Abandoned checkout patterns (cart abandonment triggers)
- Missing activation events (what should the first "aha moment" be?)
- Weak pricing page (missing social proof, urgency, comparison)
- Invisible upsells (no contextual upgrade prompts)
- Poor retention loops (no re-engagement triggers)
- Payment failure handling (dunning management gaps)
- Revenue leakage (free tier abuse, trial extension, coupon stacking)

Return ONLY valid JSON:
{
  "overallRevenueRisk": "low|medium|high|critical",
  "leaks": [
    {
      "category": "Onboarding|Checkout|Retention|Pricing|Upsell|Payments|Fraud",
      "severity": "critical|high|medium|low",
      "impact": "e.g. ₹20,000-₹80,000/mo revenue impact",
      "description": "Specific description of the revenue leak",
      "fix": "Concrete fix prompt for Cursor/Claude"
    }
  ],
  "estimatedMonthlyImpact": "Total estimated monthly revenue impact across all leaks",
  "quickWins": ["Quick win 1 that can be done in < 1 day", "Quick win 2", "Quick win 3"]
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content) as RevenueIntelligence;
  } catch (err) {
    logger.error({ err }, "Revenue intelligence failed");
    return {
      overallRevenueRisk: "medium",
      leaks: [],
      estimatedMonthlyImpact: "Analysis incomplete",
      quickWins: [],
    };
  }
}

async function runComplianceAnalysis(
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
): Promise<ComplianceResult[]> {
  const frameworks = ["GDPR", "OWASP Top 10", "PCI-DSS", "HIPAA", "SOC 2", "WCAG 2.1", "CCPA", "ISO 27001"];

  try {
    const response = await getAnyClient().chat.completions.create({
      model: fastModel(),
      messages: [
        {
          role: "system",
          content: `You are a multi-framework compliance auditor. Score apps against 8 compliance frameworks with specific findings.`,
        },
        {
          role: "user",
          content: `Run a compliance audit for this app against all 8 major frameworks:

App: ${sourceInput} (${sourceType})
${appDescription ? `Description: ${appDescription}` : ""}
${codeContext ? `Framework: ${codeContext.framework}, Business Type: ${codeContext.businessType}` : ""}
${codeContext?.routes ? `Routes: ${codeContext.routes.slice(0, 600)}` : ""}

Frameworks to audit: ${frameworks.join(", ")}

Return ONLY valid JSON:
{
  "results": [
    {
      "framework": "GDPR",
      "score": 45,
      "status": "fail",
      "findings": ["Missing cookie consent banner", "No data retention policy"],
      "riskLevel": "high"
    }
  ]
}

For each framework:
- score: 0-100 (how compliant)
- status: "pass" (>80), "partial" (50-80), "fail" (<50)
- findings: 1-4 specific actionable items
- riskLevel: "low"|"medium"|"high"|"critical"`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { results?: ComplianceResult[] };
    return parsed.results ?? [];
  } catch (err) {
    logger.error({ err }, "Compliance analysis failed");
    return frameworks.map((f) => ({
      framework: f,
      score: 50,
      status: "partial" as const,
      findings: ["Analysis incomplete — rerun for full results"],
      riskLevel: "medium" as const,
    }));
  }
}

export interface CodeContext {
  framework: string;
  vibeTool: string;
  businessType: string;
  routes: string;
  schemas: string;
  packageJson: Record<string, unknown>;
  keyFiles: Array<{ path: string; content: string }>;
  fileTree: string;
  totalFiles: number;
}

export interface ScanAnalysisResult {
  score: number;
  summary: string;
  launchVerdict: string;
  issueCounts: { critical: number; high: number; medium: number; low: number };
  agentResults: AgentResult[];
  riskForecast?: RiskForecast;
  revenueIntelligence?: RevenueIntelligence;
  complianceResults?: ComplianceResult[];
}

export async function runAllAgents(
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
): Promise<ScanAnalysisResult> {
  logger.info({ sourceType, sourceInput }, "Starting deep analysis");

  // Run agents in batches of 3 with 5s delay between batches to stay within Groq TPM limits
  const agentTasks = AGENTS.map(
    (agent) => () => runAgent(agent, sourceType, sourceInput, appDescription, codeContext),
  );
  const agentResults = await runBatched(agentTasks, 3, 5000);

  // Run compliance + revenue after agents (sequential to avoid bursting TPM)
  await sleep(3000);
  const complianceResults = await runComplianceAnalysis(sourceType, sourceInput, appDescription, codeContext);
  await sleep(3000);
  const revenueIntelligence = await runRevenueIntelligence(sourceType, sourceInput, appDescription, codeContext);

  const allIssues = agentResults.flatMap((r) => r.issues);
  const issueCounts = {
    critical: allIssues.filter((i) => i.severity === "critical").length,
    high: allIssues.filter((i) => i.severity === "high").length,
    medium: allIssues.filter((i) => i.severity === "medium").length,
    low: allIssues.filter((i) => i.severity === "low").length,
  };

  const penalty =
    Math.min(issueCounts.critical * 12, 55) +
    Math.min(issueCounts.high * 5, 28) +
    Math.min(issueCounts.medium * 2, 12) +
    Math.min(issueCounts.low * 1, 5);

  const score = Math.max(0, 100 - penalty);

  // Run risk forecast after we know the issues
  const riskForecast = await runLaunchRiskForecast(
    sourceType,
    sourceInput,
    appDescription,
    codeContext,
    allIssues,
  );

  const criticalText =
    issueCounts.critical > 0
      ? ` including ${issueCounts.critical} critical ${issueCounts.critical === 1 ? "blocker" : "blockers"}`
      : "";

  const summary =
    score >= 80
      ? `Strong launch readiness. ${allIssues.length} issues identified${criticalText} — address these before going live to protect your users and revenue.`
      : score >= 55
        ? `Moderate launch risk. ${allIssues.length} issues detected${criticalText}. Resolve critical and high-priority items before exposing to real users.`
        : `High pre-launch risk — do not deploy yet. ${issueCounts.critical} critical issues pose serious threats to security, data integrity, or user experience. Significant remediation required.`;

  const launchVerdict =
    score >= 80 ? "ready" : score >= 55 ? "caution" : "do-not-launch";

  return {
    score,
    summary,
    launchVerdict,
    issueCounts,
    agentResults,
    riskForecast,
    revenueIntelligence,
    complianceResults,
  };
}

// ── Launch Impact Calculator ─────────────────────────────────────
export interface LaunchImpact {
  totalRevenueAtRisk: string;
  supportCostPerMonth: string;
  trustImpact: string;
  userImpact: string;
  breakdown: Array<{
    issueTitle: string;
    severity: string;
    revenueImpact: string;
    trustImpact: string;
    supportHours: string;
  }>;
  topRisk: string;
  founderWarning: string;
}

export async function runLaunchImpactCalculator(
  issues: Array<{ title: string; severity: string; agentName: string; description: string }>,
  businessType: string,
  sourceInput: string,
  appDescription?: string | null,
): Promise<LaunchImpact> {
  try {
    const issueList = issues
      .slice(0, 8)
      .map((i, idx) => `${idx + 1}. [${i.severity.toUpperCase()}] ${i.title}: ${i.description.slice(0, 120)}`)
      .join("\n");

    const response = await getAnyClient().chat.completions.create({
      model: smartModel(),
      messages: [
        {
          role: "system",
          content:
            "You are a startup financial risk analyst who translates technical security and quality issues into concrete business impact. Use realistic estimates in Indian Rupees for a typical early-stage SaaS/app. Be specific, credible, and alarming where warranted.",
        },
        {
          role: "user",
          content: `Translate these technical issues into concrete founder-level business impact.

App: ${sourceInput}
Business Type: ${businessType}
${appDescription ? `Description: ${appDescription}` : ""}

Issues found:
${issueList}

Calculate the real business cost per issue and aggregate totals.

Return ONLY valid JSON:
{
  "totalRevenueAtRisk": "₹1,50,000–₹4,00,000/mo",
  "supportCostPerMonth": "20–30 support hours/mo (₹15,000–₹25,000/mo)",
  "trustImpact": "One sentence on what a breach would do to brand trust",
  "userImpact": "e.g. 100% of users exposed if auth bypass exploited",
  "breakdown": [
    {
      "issueTitle": "Exact issue title",
      "severity": "critical",
      "revenueImpact": "₹50,000–₹2,00,000/mo",
      "trustImpact": "Brand-destroying — user data leak",
      "supportHours": "10–15 hrs/mo in incident response"
    }
  ],
  "topRisk": "Single sentence on the highest-risk issue and why",
  "founderWarning": "Direct warning: what happens if they launch with this"
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content) as LaunchImpact;
  } catch (err) {
    logger.error({ err }, "Launch impact calculator failed");
    return {
      totalRevenueAtRisk: "Analysis unavailable",
      supportCostPerMonth: "Analysis unavailable",
      trustImpact: "Run a full scan for impact analysis",
      userImpact: "Unknown",
      breakdown: [],
      topRisk: "Complete analysis for specific risk assessment",
      founderWarning: "Review all findings carefully before launching",
    };
  }
}

// ── Product Hunt Mode ────────────────────────────────────────────
export interface ProductHuntScore {
  score: number;
  verdict: string;
  categories: Array<{
    name: string;
    score: number;
    status: "pass" | "warning" | "fail";
    findings: string[];
  }>;
  topBlockers: string[];
  readyToHunt: boolean;
}

export async function runProductHuntAudit(
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
): Promise<ProductHuntScore> {
  try {
    const response = await getAnyClient().chat.completions.create({
      model: fastModel(),
      messages: [
        {
          role: "system",
          content:
            "You are a Product Hunt launch expert who has reviewed 1000+ product launches. You know exactly what makes products get featured, upvoted, and loved — and what gets them roasted in comments. Be tough — 70+ is actually Product Hunt ready.",
        },
        {
          role: "user",
          content: `Audit this app for Product Hunt launch readiness.

App: ${sourceInput} (${sourceType})
${appDescription ? `Description: ${appDescription}` : ""}
${codeContext ? `Framework: ${codeContext.framework}, Business Type: ${codeContext.businessType}` : ""}
${codeContext?.routes ? `Routes detected: ${codeContext.routes.slice(0, 600)}` : ""}

Evaluate across 6 Product Hunt-critical categories:
1. Mobile UX — responsive, touch-friendly, looks great on phone
2. First Run Experience — onboarding, empty states, activation moment
3. Analytics & Error Tracking — Mixpanel/Posthog, Sentry, feedback widget
4. Social & Viral Features — sharing, referrals, viral loops
5. Error Resilience — graceful errors, fallbacks, loading states
6. Launch-Day Traffic Readiness — rate limiting, connection pooling, CDN

Score 0–100 overall.

Return ONLY valid JSON:
{
  "score": 72,
  "verdict": "Almost Ready — 2 blockers to fix",
  "categories": [
    {
      "name": "Mobile UX",
      "score": 80,
      "status": "pass",
      "findings": ["Responsive layout detected", "Touch targets may be too small on checkout"]
    }
  ],
  "topBlockers": ["Missing error boundary — white screen on crash is a launch-killer", "No analytics = flying blind on launch day"],
  "readyToHunt": false
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(content) as ProductHuntScore;
  } catch (err) {
    logger.error({ err }, "Product Hunt audit failed");
    return {
      score: 0,
      verdict: "Analysis unavailable",
      categories: [],
      topBlockers: [],
      readyToHunt: false,
    };
  }
}
