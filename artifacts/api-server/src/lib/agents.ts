import Groq from "groq-sdk";
import { logger } from "./logger.js";
import { getAttackPackPrompt, getAttackPack } from "./attack-packs.js";

import { KeyRotator } from "./key-rotator.js";

const groqRotator = new KeyRotator("Groq", process.env["GROQ_API_KEY"] ?? process.env["GROQ_KEYS"]);
const openRouterRotator = new KeyRotator("OpenRouter", process.env["OPENROUTER_API_KEY"] ?? process.env["OPENROUTER_KEYS"]);
const cerebrasRotator = new KeyRotator("Cerebras", process.env["CEREBRAS_API_KEY"] ?? process.env["CEREBRAS_KEYS"]);
const anthropicRotator = new KeyRotator("Anthropic", process.env["ANTHROPIC_API_KEY"] ?? process.env["ANTHROPIC_KEYS"]);
const openaiRotator = new KeyRotator("OpenAI", process.env["OPENAI_API_KEY"] ?? process.env["OPENAI_KEYS"]);

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

const FAST_MODEL = "llama-3.1-8b-instant";
const SMART_MODEL = "llama-3.3-70b-versatile";
const CEREBRAS_MODEL = "llama-3.3-70b";
const ANTHROPIC_FAST = "claude-3-haiku-20240307";
const ANTHROPIC_SMART = "claude-3-5-sonnet-20241022";
const OPENAI_FAST = "gpt-4o-mini";
const OPENAI_SMART = "gpt-4o";

const OPENROUTER_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen3-14b:free",
];
let orModelIndex = 0;
function nextOpenRouterModel(): string {
  const m = OPENROUTER_MODELS[orModelIndex % OPENROUTER_MODELS.length]!;
  orModelIndex++;
  return m;
}

function getAnyClient(): Groq {
  const orKey = openRouterRotator.getNextKey();
  if (orKey) return new Groq({ apiKey: orKey, baseURL: OPENROUTER_BASE });
  const groqKey = groqRotator.getNextKey();
  if (groqKey) return new Groq({ apiKey: groqKey });
  const cerebrasKey = cerebrasRotator.getNextKey();
  if (cerebrasKey) return new Groq({ apiKey: cerebrasKey, baseURL: "https://api.cerebras.ai/v1" });
  const anthropicKey = anthropicRotator.getNextKey();
  if (anthropicKey) return new Groq({ apiKey: anthropicKey, baseURL: "https://api.anthropic.com/v1" });
  const openaiKey = openaiRotator.getNextKey();
  if (openaiKey) return new Groq({ apiKey: openaiKey });
  throw new Error("No AI provider keys available.");
}

function smartModel(): string {
  if (openRouterRotator.hasKeys()) return "meta-llama/llama-3.3-70b-instruct:free";
  if (groqRotator.hasKeys()) return SMART_MODEL;
  if (anthropicRotator.hasKeys()) return ANTHROPIC_SMART;
  if (openaiRotator.hasKeys()) return OPENAI_SMART;
  return CEREBRAS_MODEL;
}
function fastModel(): string {
  if (openRouterRotator.hasKeys()) return "meta-llama/llama-3.1-8b-instruct:free";
  if (groqRotator.hasKeys()) return FAST_MODEL;
  if (anthropicRotator.hasKeys()) return ANTHROPIC_FAST;
  if (openaiRotator.hasKeys()) return OPENAI_FAST;
  return CEREBRAS_MODEL;
}

/** Extract JSON from model output — handles markdown code fences and stray text */
function extractJson(raw: string): string {
  if (!raw) return "{}";
  // Already valid JSON
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  // Strip ```json ... ``` or ``` ... ```
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) return fence[1].trim();
  // Find first { ... } block
  const obj = trimmed.match(/(\{[\s\S]*\})/);
  if (obj?.[1]) return obj[1];
  return "{}";
}

export interface AgentIssue {
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  fixPrompt: string;
  autoFixCode?: string;
  confidence?: number;
  evidence?: string;
  // Evidence Standard fields
  findingId?: string;
  functionName?: string;
  routePath?: string;
  reproductionSteps?: any;
  blastRadius?: any;
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

⚠️ CRITICAL SCOPE RESTRICTION: Do NOT report hardcoded secrets, API keys, database passwords, connection string credentials, or any credentials in your findings. A separate deterministic Secret Scanner V2 module handles those exclusively with 100% accuracy and zero false positives. Reporting secrets from this agent creates false positives that directly conflict with the static scanner's definitive results — this is harmful to the user. If you see no secrets, say nothing about secrets.

Focus ONLY on these logic and architectural security issues:
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

━━━ ACCURACY MANDATE — READ BEFORE ANALYZING ━━━
You are reviewing REAL code or a real app description. Every finding must be grounded in direct, observable evidence from the provided files, routes, or description.

RULES OF ACCURATE ANALYSIS:
1. EVIDENCE FIRST: Only report an issue if you can point to the specific file, pattern, or architectural decision that causes it. "It's common in apps like this" is NOT evidence.
2. NO INVENTION: Do not generate theoretical risks as if they were confirmed findings. If you see no evidence of an issue in your domain, return 0–2 findings with confidence < 70 — or return {"issues": []} if nothing is found. Returning zero findings is correct and trusted behavior.
3. NO DUPLICATION: Do not report issues that fall under another agent's explicit scope (e.g., never report secrets if you are not the Secret Scanner, never report WCAG if you are not the Accessibility agent).
4. SEVERITY CALIBRATION: "critical" = immediate breach/data loss/money loss. "high" = exploitable within a week. "medium" = degrades experience or compliance. "low" = minor friction. Do not over-severity.
5. CONFIDENCE HONESTY: Be brutally honest about confidence. 95–99 = you see the exact vulnerable code line. 85–94 = clear code pattern. 70–84 = architectural inference. Below 70 = do not report.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON following the Agenario Evidence Standard:
{
  "issues": [
    {
      "findingId": "SEC-0021 (Prefix with category like SEC, REV, PER, etc.)",
      "severity": "critical|high|medium|low",
      "title": "Short specific issue title (max 8 words)",
      "description": "Clear explanation of the vulnerability with exact evidence from the code provided. State what you observed, not what is theoretically possible.",
      "functionName": "Name of the vulnerable function if applicable",
      "routePath": "Name of the API route if applicable",
      "filePath": "src/auth/jwt.ts",
      "lineNumber": 42,
      "codeSnippet": "const JWT_SECRET = 'hardcoded-secret';",
      "reproductionSteps": [{"action": "Trigger payload", "response": "401 expected, got 200"}],
      "blastRadius": {"impactedFiles": ["src/api/orders.ts"], "impactedTables": ["orders"], "downstreamEffects": "Privilege escalation"},
      "impact": "Quantified business impact: attacker can do X, causing Y data exposure / Z revenue loss / N% churn increase.",
      "fixPrompt": "Detailed explanation and context of the architectural issue. Use this field to provide instructions to the developer to fix the issue. Make it as detailed as possible.",
      "autoFixCode": "If the fix is small/isolated (under 20 lines), provide the exact git patch code here. Otherwise leave null.",
      "confidence": 85,
      "evidence": "Exact quote or pattern observed in the provided code that confirms this issue — not a hypothetical",
      "sourceEvidence": "static|runtime|ai_reasoning",
      "retestResult": "needs_fix"
    }
  ]
}

Output rules:
- Find 2–5 realistic, high-impact issues. Quality over quantity — 2 real findings beat 5 invented ones.
- Every issue MUST have a clear production consequence (breach, revenue loss, outage, user drop-off).
- filePath: exact relative path from the code context (e.g. "src/routes/auth.ts"). Required when real code provided.
- lineNumber: best estimate of the vulnerable line number. Required when filePath is set.
- codeSnippet: the exact vulnerable code line or pattern (1–3 lines). Required when filePath is set.
- impact: quantified statement — "Attacker can access all user records (GDPR violation, ₹20L fine risk)" not "security risk".
- confidence: 95–99 runtime-provable, 85–94 direct code evidence, 70–84 pattern inference. Do NOT report below 70.
- sourceEvidence: "static" if from code analysis, "runtime" if from HTTP/browser probe, "ai_reasoning" if inferred.
- fixPrompt: Must provide high-level contextual instructions or deep architectural guides for Cursor/Claude.
- autoFixCode: Only populate this if the fix is a simple, direct patch. Format as raw code without markdown blocks.
- retestResult: always "needs_fix" for new findings.
- If the code context is clean in your domain, return {"issues": []} — this is a positive outcome, not an error.`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Hard per-call timeout — no single provider call can stall the pipeline
const CALL_TIMEOUT_MS = 16_000;

function withCallTimeout<T>(fn: () => Promise<T>, label: string): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${CALL_TIMEOUT_MS}ms`)),
        CALL_TIMEOUT_MS,
      ),
    ),
  ]);
}

/**
 * callWithFallback — FIVE-TIER AI PROVIDER CHAIN with cost-aware routing
 *
 * Tier 1: OpenRouter — cycles ALL 6 free models with 16s per-call timeout.
 * Tier 2: Groq      — native JSON mode, 16s timeout.
 * Tier 3: Cerebras  — high-throughput Llama, 16s timeout.
 * Tier 4: Anthropic — Claude Haiku/Sonnet, 16s timeout.
 * Tier 5: OpenAI    — GPT-4o-mini/4o, 16s timeout.
 *
 * NEVER THROWS. Returns "{}" when all providers fail so callers always get
 * a parseable result and can return 0 issues rather than crashing the scan.
 */
async function callWithFallback(
  messages: { role: "system" | "user"; content: string }[],
  opts: { model: string; cerebrasModel?: string; maxTokens?: number; useSmart?: boolean },
): Promise<string> {
  const messages_typed = messages as { role: "system" | "user" | "assistant"; content: string }[];
  const maxTok = opts.maxTokens ?? 700;
  const useSmart = opts.useSmart ?? false;

  // ── Tier 1: OpenRouter (free tier — try all models) ──────────────────
  if (openRouterRotator.hasKeys()) {
    for (let attempt = 0; attempt < OPENROUTER_MODELS.length; attempt++) {
      const orModel = nextOpenRouterModel();
      const orKey = openRouterRotator.getNextKey();
      if (!orKey) break;
      const orClient = new Groq({ apiKey: orKey, baseURL: OPENROUTER_BASE });
      try {
        const response = await withCallTimeout(
          () => orClient.chat.completions.create({
            model: orModel,
            messages: messages_typed,
            max_tokens: maxTok,
          }),
          `OpenRouter[${orModel}]`,
        );
        const raw = response.choices[0]?.message?.content ?? "";
        const content = extractJson(raw);
        if (content && content !== "{}") {
          return content;
        }
      } catch (err: any) {
        if (err?.status === 429) openRouterRotator.markRateLimited(orKey);
        logger.warn({ model: orModel, attempt, err: err?.message?.slice(0, 120) }, "OpenRouter failed");
      }
    }
  }

  // ── Tier 2: Groq (fast — native JSON mode) ──────────────────────────
  if (groqRotator.hasKeys()) {
    const groqKey = groqRotator.getNextKey();
    if (groqKey) {
      const groqClient = new Groq({ apiKey: groqKey });
      try {
        const response = await withCallTimeout(
          () => groqClient.chat.completions.create({
            model: useSmart ? SMART_MODEL : FAST_MODEL,
            messages: messages_typed,
            response_format: { type: "json_object" },
            max_tokens: maxTok,
          }),
          "Groq",
        );
        const content = response.choices[0]?.message?.content ?? "{}";
        if (content && content !== "{}") return content;
      } catch (err: any) {
        if (err?.status === 429) groqRotator.markRateLimited(groqKey);
        logger.warn({ err: err?.message?.slice(0, 120) }, "Groq failed");
      }
    }
  }

  // ── Tier 3: Cerebras (high-throughput Llama) ─────────────────────────
  if (cerebrasRotator.hasKeys()) {
    const cerebrasKey = cerebrasRotator.getNextKey();
    if (cerebrasKey) {
      const cerebrasClient = new Groq({ apiKey: cerebrasKey, baseURL: "https://api.cerebras.ai/v1" });
      try {
        const response = await withCallTimeout(
          () => cerebrasClient.chat.completions.create({
            model: opts.cerebrasModel ?? CEREBRAS_MODEL,
            messages: messages_typed,
            max_tokens: maxTok,
          }),
          "Cerebras",
        );
        const content = extractJson(response.choices[0]?.message?.content ?? "{}");
        if (content && content !== "{}") return content;
      } catch (err: any) {
        if (err?.status === 429) cerebrasRotator.markRateLimited(cerebrasKey);
        logger.warn({ err: err?.message?.slice(0, 120) }, "Cerebras failed");
      }
    }
  }

  // ── Tier 4: Anthropic (Claude — best for complex reasoning) ──────────
  if (anthropicRotator.hasKeys()) {
    const anthropicKey = anthropicRotator.getNextKey();
    if (anthropicKey) {
      const model = useSmart ? ANTHROPIC_SMART : ANTHROPIC_FAST;
      try {
        const { default: Anthropic } = await import("@anthropic-ai/sdk") as any;
        const anthropic = new Anthropic({ apiKey: anthropicKey });
        const response = await withCallTimeout(
          () => anthropic.messages.create({
            model,
            max_tokens: maxTok,
            system: messages_typed.find(m => m.role === "system")?.content ?? "",
            messages: messages_typed.filter(m => m.role !== "system").map((m: any) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          }),
          `Anthropic[${model}]`,
        );
        const raw = response.content.map((b: any) => b.type === "text" ? b.text : "").join("");
        const content = extractJson(raw);
        if (content && content !== "{}") return content;
      } catch (err: any) {
        if (err?.status === 429) anthropicRotator.markRateLimited(anthropicKey);
        logger.warn({ err: err?.message?.slice(0, 120) }, "Anthropic failed");
      }
    }
  }

  // ── Tier 5: OpenAI (GPT-4o — best for structured output) ────────────
  if (openaiRotator.hasKeys()) {
    const openaiKey = openaiRotator.getNextKey();
    if (openaiKey) {
      const model = useSmart ? OPENAI_SMART : OPENAI_FAST;
      try {
        const { default: OpenAI } = await import("openai") as any;
        const openai = new OpenAI({ apiKey: openaiKey });
        const response = await withCallTimeout(
          () => openai.chat.completions.create({
            model,
            messages: messages_typed,
            response_format: { type: "json_object" },
            max_tokens: maxTok,
          }),
          `OpenAI[${model}]`,
        );
        const content = response.choices[0]?.message?.content ?? "{}";
        if (content && content !== "{}") return content;
      } catch (err: any) {
        if (err?.status === 429) openaiRotator.markRateLimited(openaiKey);
        logger.warn({ err: err?.message?.slice(0, 120) }, "OpenAI failed");
      }
    }
  }

  logger.error("All AI providers exhausted — returning empty JSON");
  return "{}";
}

// Hard per-agent timeout — no agent can block the pipeline beyond this
const AGENT_TIMEOUT_MS = 22_000;

async function runAgentWithRetry(
  agent: (typeof AGENTS)[0],
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
): Promise<AgentResult> {
  // Inject business-type-specific attack vectors for security-adjacent agents
  const securityAgents = ["Security & Access Control", "Revenue & Business Logic", "Business Logic Attack Lab", "Data Integrity & Architecture", "Supply Chain Security"];
  let systemPrompt = agent.role;
  if (codeContext?.businessType && codeContext.businessType !== "unknown" && securityAgents.includes(agent.name)) {
    systemPrompt += getAttackPackPrompt(codeContext.businessType);
  }
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: buildUserPrompt(sourceType, sourceInput, appDescription, codeContext, agent.name) },
  ];

  // One attempt, no sleep on rate limit — fail fast, return empty
  const agentWork = (async (): Promise<AgentResult> => {
    try {
      const raw = await callWithFallback(messages, { model: FAST_MODEL, maxTokens: 700 });
      const parsed = JSON.parse(extractJson(raw)) as { issues?: AgentIssue[] };
      return {
        agentName: agent.name,
        issues: (parsed.issues ?? []).map((issue) => ({
          ...issue,
          findingId: issue.findingId ?? undefined,
          functionName: issue.functionName ?? undefined,
          routePath: issue.routePath ?? undefined,
          reproductionSteps: issue.reproductionSteps ?? undefined,
          blastRadius: issue.blastRadius ?? undefined,
          confidence: issue.confidence ?? 65,
          evidence: issue.evidence ?? undefined,
          autoFixCode: issue.autoFixCode ?? undefined,
          filePath: issue.filePath ?? undefined,
          lineNumber: issue.lineNumber ?? undefined,
          codeSnippet: issue.codeSnippet ?? undefined,
          impact: issue.impact ?? undefined,
          sourceEvidence: issue.sourceEvidence ?? "ai_reasoning",
          retestResult: issue.retestResult ?? "needs_fix",
        })),
      };
    } catch (err: unknown) {
      logger.warn({ agent: agent.name, err: (err as Error).message?.slice(0, 120) }, "Agent skipped");
      return { agentName: agent.name, issues: [] };
    }
  })();

  // Race against hard timeout — never block more than 22s per agent
  const timeout = new Promise<AgentResult>((resolve) =>
    setTimeout(() => {
      logger.warn({ agent: agent.name }, "Agent timed out at 22s — skipping");
      resolve({ agentName: agent.name, issues: [] });
    }, AGENT_TIMEOUT_MS),
  );

  return Promise.race([agentWork, timeout]);
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
    const raw = await callWithFallback(
      [
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
      { model: SMART_MODEL, maxTokens: 1024 },
    );
    return JSON.parse(extractJson(raw)) as RiskForecast;
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
    const raw = await callWithFallback(
      [
        {
          role: "system",
          content: `You are a revenue growth expert who identifies exactly where products lose money. Focus on concrete, specific revenue leaks.
CRITICAL CONSTRAINT: Do NOT guess or show absolute currency leakage amounts (such as lakhs of Rupees or thousands of Dollars) unless the target is explicitly verified as a large-scale, high-traffic enterprise company. For small repositories, indie projects, personal portfolios, or simple tools, do NOT use absolute financial leak figures (especially Lakhs of Rupees); instead, specify impacts in terms of percentages (e.g., "15% of checkout flow") or qualitative terms (e.g., "Loss of potential conversions").`,
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
      "impact": "Describe the leakage scale. For small/medium apps, specify percentages or qualitative impact (e.g., '10-15% conversion drop'). Do NOT output absolute Lakhs/Thousands rupee figures unless it is a verified big enterprise/company.",
      "description": "Specific description of the revenue leak",
      "fix": "Concrete fix prompt for Cursor/Claude"
    }
  ],
  "estimatedMonthlyImpact": "Use qualitative terms or percentage scale for small/medium apps. Do NOT output high rupee/dollar amounts unless verified enterprise.",
  "quickWins": ["Quick win 1 that can be done in < 1 day", "Quick win 2", "Quick win 3"]
}`,
        },
      ],
      { model: FAST_MODEL, maxTokens: 1500 },
    );
    return JSON.parse(extractJson(raw)) as RevenueIntelligence;
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
    const raw = await callWithFallback(
      [
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
      { model: FAST_MODEL, maxTokens: 2000 },
    );
    const parsed = JSON.parse(extractJson(raw)) as { results?: ComplianceResult[] };
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

// ── Post-pipeline conflict resolution & deduplication ─────────────────────
// Prevents the #1 trust killer: two agents contradicting each other.
//
// Rule 1 — Secrets ownership:
//   Any finding that looks like a credential/secret DETECTION must come
//   exclusively from "Secret Scanner V2". All other agents are forbidden
//   from reporting secrets by their system prompts, but LLMs can still
//   hallucinate these. We strip them here as a deterministic guard.
//
// Rule 2 — Cross-agent deduplication:
//   Same vulnerability reported by multiple agents → keep the one with
//   the highest confidence. Identical severity + near-identical title
//   (first 40 normalised chars) = duplicate.

const SECRET_SCANNER_NAMES = new Set([
  "Secret Scanner V2", "Secret Scanner", "Secrets Scanner", "Secret & Credential Scanner",
]);

function isSecretsDetectionFinding(title: string): boolean {
  const t = title.toLowerCase();
  // Pattern: "X detected/exposed/found/leaked/hardcoded" where X is a credential noun
  const credentialNouns = /\b(api[_\s-]?key|secret|password|credential|token|access[_\s-]?key|private[_\s-]?key|connection[_\s-]?string|service[_\s-]?account)\b/;
  const detectionVerbs = /\b(detected|exposed|found|leaked|hardcoded|hard-coded|committed|embedded|visible|plain.?text|in\s+(code|source|env|client|bundle|repo))\b/;
  // Also catch "Supabase/Firebase/DB password/key" patterns
  const serviceCredentials = /\b(supabase|firebase|postgres|mysql|mongo|redis|stripe|razorpay|openai|twilio|sendgrid|aws|gcp|azure)\s+(password|key|url|credential|secret|token)\b/;
  return (credentialNouns.test(t) && detectionVerbs.test(t)) || serviceCredentials.test(t);
}

function reconcileIssues(agentResults: AgentResult[]): AgentResult[] {
  // ── Step 1: Strip secrets-detection findings from non-scanner agents ──────
  const step1 = agentResults.map((result) => {
    if (SECRET_SCANNER_NAMES.has(result.agentName)) return result; // canonical scanner untouched
    const filtered = result.issues.filter((issue) => {
      if (isSecretsDetectionFinding(issue.title)) {
        logger.warn(
          { agentName: result.agentName, title: issue.title },
          "reconcile: removing conflicting secrets finding from non-scanner agent",
        );
        return false;
      }
      return true;
    });
    return { ...result, issues: filtered };
  });

  // ── Step 2: Cross-agent deduplication by fingerprint ─────────────────────
  type Tagged = { agentIdx: number; issueIdx: number; confidence: number };
  const bestByFp = new Map<string, Tagged>();

  step1.forEach((result, ai) => {
    result.issues.forEach((issue, ii) => {
      // Fingerprint: severity + first 40 chars of normalised title
      const fp = `${issue.severity}:${issue.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().slice(0, 40)}`;
      const conf = issue.confidence ?? 75;
      const existing = bestByFp.get(fp);
      if (!existing || conf > existing.confidence) {
        bestByFp.set(fp, { agentIdx: ai, issueIdx: ii, confidence: conf });
      }
    });
  });

  const keepKeys = new Set(
    [...bestByFp.values()].map((t) => `${t.agentIdx}:${t.issueIdx}`),
  );

  return step1.map((result, ai) => ({
    ...result,
    issues: result.issues.filter((_, ii) => keepKeys.has(`${ai}:${ii}`)),
  }));
}

// ── Pipeline result type ──────────────────────────────────────────────────
type PipelineData = {
  agentResults: AgentResult[];
  complianceResults: ComplianceResult[];
  revenueIntelligence: RevenueIntelligence | null;
  riskForecast: RiskForecast | null;
  allIssues: AgentIssue[];
};

// Hard 80s pipeline cap — scan ALWAYS completes within this window
const PIPELINE_TIMEOUT_MS = 80_000;

export async function runAllAgents(
  sourceType: string,
  sourceInput: string,
  appDescription?: string | null,
  codeContext?: CodeContext | null,
): Promise<ScanAnalysisResult> {
  logger.info({ sourceType, sourceInput }, "Starting deep analysis");

  const pipeline = (async (): Promise<PipelineData> => {
    // Agents in batches of 5 with 1s delays — 3× faster than previous (3 agents, 5s delay)
    // Each agent has its own 22s hard timeout, so no single agent can block a batch
    const agentTasks = AGENTS.map(
      (agent) => () => runAgent(agent, sourceType, sourceInput, appDescription, codeContext),
    );

    // Run agents + compliance concurrently (compliance used to run after all agents = wasted time)
    const [agentResults, complianceResults] = await Promise.all([
      runBatched(agentTasks, 5, 1000),
      runComplianceAnalysis(sourceType, sourceInput, appDescription, codeContext).catch((err) => {
        logger.warn({ err }, "Compliance analysis failed — skipping");
        return [] as ComplianceResult[];
      }),
    ]);

    // ── Conflict resolution: strip contradictory findings & deduplicate ───
    const reconciledResults = reconcileIssues(agentResults);
    const allIssues = reconciledResults.flatMap((r) => r.issues);

    // Run revenue + riskForecast concurrently after agents (they need issue data for risk)
    const [revenueIntelligence, riskForecast] = await Promise.all([
      runRevenueIntelligence(sourceType, sourceInput, appDescription, codeContext).catch(() => null),
      runLaunchRiskForecast(sourceType, sourceInput, appDescription, codeContext, allIssues).catch(() => null),
    ]);

    return { agentResults: reconciledResults, complianceResults, revenueIntelligence, riskForecast, allIssues };
  })();

  // Hard 80s timeout — return partial results rather than hanging forever
  const timeoutData = new Promise<PipelineData>((resolve) =>
    setTimeout(() => {
      logger.warn("Pipeline reached 80s hard cap — returning partial results");
      resolve({ agentResults: [], complianceResults: [], revenueIntelligence: null, riskForecast: null, allIssues: [] });
    }, PIPELINE_TIMEOUT_MS),
  );

  const {
    agentResults,
    complianceResults,
    revenueIntelligence,
    riskForecast,
    allIssues,
  } = await Promise.race([pipeline, timeoutData]);

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
    riskForecast: riskForecast ?? undefined,
    revenueIntelligence: revenueIntelligence ?? undefined,
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
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(extractJson(content)) as LaunchImpact;
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
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(extractJson(content)) as ProductHuntScore;
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
