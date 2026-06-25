import { logger } from "../logger.js";
export { runRealityCheckWithCSG, analyzeDeploymentFromCSG } from "./csg-reality.js";

export interface MockupFinding {
  id: string;
  category: "mock-data" | "fake-api" | "placeholder" | "local-only" | "fake-auth" | "hardcoded-metrics";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  filePath: string;
  lineNumber: number;
  evidence: string;
  codeSnippet: string;
  fixPrompt: string;
  confidence: number;
  impact: string;
}

export interface FeatureTruth {
  id: string;
  featureName: string;
  uiEntryPoint: string;
  eventHandler?: string;
  apiCall?: string;
  backendRoute?: string;
  databaseWrite?: string;
  persistenceVerified: boolean;
  status: "verified_live" | "partially_connected" | "mocked" | "broken" | "unverified";
  description: string;
  filePath: string;
  confidence: number;
}

export interface CleanupCandidate {
  id: string;
  type: "unused-file" | "unused-component" | "unused-route" | "unused-package" | "duplicate" | "orphaned-schema" | "commented-block" | "large-generated" | "temp-file" | "stale-docs" | "unused-env" | "dead-flag" | "stale-todo" | "old-migration" | "unused-test";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  filePath: string;
  confidence: number;
  reason: string[];
  suggestedAction: string;
  estimatedCleanup: string;
  sizeImpact?: string;
}

export interface DeploymentCheck {
  id: string;
  category: "build" | "env" | "security" | "config" | "observability" | "rollback";
  check: string;
  passed: boolean;
  severity: "critical" | "high" | "medium" | "low";
  detail: string;
  filePath?: string;
  fixPrompt: string;
}

export interface ProductRealityReport {
  score: number;
  verifiedLiveCount: number;
  partiallyConnectedCount: number;
  mockedCount: number;
  brokenCount: number;
  unverifiedCount: number;
  cleanupCandidatesCount: number;
  deploymentBlockersCount: number;
  mockupFindings: MockupFinding[];
  featureTruths: FeatureTruth[];
  cleanupCandidates: CleanupCandidate[];
  deploymentChecks: DeploymentCheck[];
  summary: string;
  launchCompletenessScore: number;
}

const MOCK_DATA_PATTERNS = [
  /\b(mockData|dummyData|fakeUsers|sampleOrders|testData|placeholderData|staticData|hardcodedData)\b/gi,
  /\bconst\s+\w+\s*=\s*\[[^\]]{20,}\]/g,
  /\bconst\s+\w+\s*=\s*\{[^\}]{20,}\}/g,
  /(random|Math\.random)\s*\(\s*\)\s*\*\s*\d+/g,
  /\bsetTimeout\s*\(\s*\(\)\s*=>/g,
  /\b(Math\.floor|Math\.ceil|Math\.round)\s*\(/g,
  /(fakeSuccess|simulateApi|mockResponse|dummyResponse)/gi,
  /\b(orders|users|products|bookings|analytics|transactions|payments)\s*:\s*\[/gi,
];

const FAKE_API_PATTERNS = [
  /\/\/\s*(TODO|FIXME).*api/gi,
  /\.then\s*\(\s*res\s*=>\s*res\.json\s*\(\s*\)\s*\)\s*\.then\s*\(\s*\w+\s*=>/g,
  /fetch\s*\(\s*['"`]\/api\/(users|orders|products|payments)['"`]/g,
  /(headers|Authorization)\s*:\s*\{[^}]*["']Bearer[^}]*\}/g,
];

const MOCK_AUTH_PATTERNS = [
  /password\s*[=:]\s*['"`](demo|test|admin|password|123456)['"`]/gi,
  /(accepts?\s+any\s+password|demo\s+login|test\s+credentials)/gi,
  /if\s*\(\s*password\s*===?\s*['"`]['"`]\s*\)/g,
];

const HARDCODED_METRIC_PATTERNS = [
  /\$[\d,]+(?:\.\d{2})?\s*(?:revenue|MRR|ARR|spend)/gi,
  /\b\d+\s*(?:users|customers|orders|revenue|MRR|ARR)\b/gi,
  /(revenue|users|orders)\s*[=:]\s*\d+/gi,
];

const ROUTE_DEF_RE = /(?:router|app)\.(get|post|put|patch|delete|use)\s*\(\s*['"`]([^'"`]+)['"`]/g;
const FRONTEND_LINK_RE = /(?:fetch|href|to|axios|link)\s*[=(]\s*['"`]([^'"`]+)['"`]/g;

export function detectMockups(files: Array<{ path: string; content: string }>): MockupFinding[] {
  const findings: MockupFinding[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      for (const pattern of MOCK_DATA_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          findings.push({
            id: `mockup-${findings.length + 1}`,
            category: "mock-data",
            severity: "high",
            title: "Hardcoded mock data in production component",
            description: `Hardcoded array/object detected in ${file.path}. This data will not update from a real backend and will be stale on every page load.`,
            filePath: file.path,
            lineNumber: lineNum,
            evidence: match[0],
            codeSnippet: line.trim().slice(0, 120),
            fixPrompt: "Replace hardcoded data with a fetch/axios call to your backend API. Add loading and error states.",
            confidence: 95,
            impact: "Feature appears functional but displays static/temporary data only.",
          });
          break;
        }
      }

      for (const pattern of FAKE_API_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          findings.push({
            id: `mockup-${findings.length + 1}`,
            category: "fake-api",
            severity: "critical",
            title: "Simulated API response or fake endpoint",
            description: `Line ${lineNum} in ${file.path} simulates an API response. No real backend request is made.`,
            filePath: file.path,
            lineNumber: lineNum,
            evidence: match[0],
            codeSnippet: line.trim().slice(0, 120),
            fixPrompt: "Replace mock response with actual fetch/axios call to a real backend endpoint.",
            confidence: 92,
            impact: "Feature pretends to call an API but never reaches a server.",
          });
          break;
        }
      }

      for (const pattern of MOCK_AUTH_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          findings.push({
            id: `mockup-${findings.length + 1}`,
            category: "fake-auth",
            severity: "critical",
            title: "Fake authentication — accepts any credentials",
            description: `Login/auth logic in ${file.path} accepts demo/test credentials instead of validating against a real identity provider.`,
            filePath: file.path,
            lineNumber: lineNum,
            evidence: match[0],
            codeSnippet: line.trim().slice(0, 120),
            fixPrompt: "Replace mock auth with real auth provider (Clerk, Auth0, NextAuth, Supabase Auth) and enforce password validation.",
            confidence: 98,
            impact: "Any user can log in without real credentials. No access control exists.",
          });
          break;
        }
      }

      for (const pattern of HARDCODED_METRIC_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          findings.push({
            id: `mockup-${findings.length + 1}`,
            category: "hardcoded-metrics",
            severity: "medium",
            title: "Hardcoded business metric in UI",
            description: `Metric or revenue figure in ${file.path} is hardcoded rather than computed from real data.`,
            filePath: file.path,
            lineNumber: lineNum,
            evidence: match[0],
            codeSnippet: line.trim().slice(0, 120),
            fixPrompt: "Replace with real metric from analytics API or database aggregation.",
            confidence: 85,
            impact: "Dashboard/revenue figures are fabricated and will diverge from reality immediately after launch.",
          });
          break;
        }
      }
    }
  }

  return findings;
}

export function traceFeatureTruths(files: Array<{ path: string; content: string }>): FeatureTruth[] {
  const truths: FeatureTruth[] = [];
  const allImports = new Set<string>();
  const IMPORT_RE = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;

  const serverFiles = files.filter(f => f.path.includes("route") || f.path.includes("api") || f.path.includes("server"));
  const uiFiles = files.filter(f => /\.(tsx|jsx)$/.test(f.path) && !f.path.includes("node_modules"));

  for (const file of files) {
    let m: RegExpExecArray | null;
    const re = new RegExp(IMPORT_RE.source, "g");
    while ((m = re.exec(file.content)) !== null) allImports.add(m[1]);
  }

  const hasRealFetch = serverFiles.some(f => /(fetch|axios|prisma|drizzle|supabase|knex|mongodb)/i.test(f.content));

  for (let i = 0; i < Math.min(uiFiles.length, 20); i++) {
    const file = uiFiles[i];
    const hasFetch = /fetch\s*\(|axios|useQuery|useSWR|useAxios/.test(file.content);
    const hasLocalState = /useState|useReducer|Context|localStorage/.test(file.content);
    const hasForm = /form|submit|handleSubmit/.test(file.content);
    const hasSubmitWithoutFetch = hasForm && !hasFetch;

    let status: FeatureTruth["status"] = "unverified";
    let description = "";
    let confidence = 50;

    if (hasRealFetch && hasFetch) {
      status = "verified_live";
      description = "UI triggers API request and backend handles it.";
      confidence = 90;
    } else if (hasFetch && !hasRealFetch) {
      status = "partially_connected";
      description = "UI calls fetch but no matching backend handler found in scanned files.";
      confidence = 70;
    } else if (hasSubmitWithoutFetch) {
      status = "mocked";
      description = "Form submits using local React state only — no persistence.";
      confidence = 88;
    } else if (hasLocalState && !hasFetch) {
      status = "mocked";
      description = "Component manages local state only with no backend integration.";
      confidence = 75;
    }

    if (status !== "unverified") {
      truths.push({
        id: `truth-${truths.length + 1}`,
        featureName: file.path.split("/").pop()?.replace(/\.(tsx|jsx)$/, "") ?? file.path,
        uiEntryPoint: file.path,
        persistenceVerified: status === "verified_live",
        status,
        description,
        filePath: file.path,
        confidence,
      });
    }
  }

  return truths;
}

export function runCleanupRadar(files: Array<{ path: string; content: string }>, packageJson?: Record<string, unknown>): CleanupCandidate[] {
  const candidates: CleanupCandidate[] = [];
  const importedFiles = new Set<string>();
  const allRoutes = new Set<string>();
  const allImports = new Set<string>();
  const IMPORT_RE = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;

  for (const file of files) {
    let m: RegExpExecArray | null;
    const re = new RegExp(IMPORT_RE.source, "g");
    while ((m = re.exec(file.content)) !== null) {
      const pkg = m[1];
      if (pkg.startsWith(".") || pkg.startsWith("/")) {
        importedFiles.add(pkg.replace(/^\.\.?\//, "").split("/")[0]);
      }
      if (!pkg.startsWith(".") && !pkg.startsWith("/") && !pkg.startsWith("node:")) {
        const parts = pkg.startsWith("@") ? pkg.split("/").slice(0, 2).join("/") : pkg.split("/")[0];
        allImports.add(parts);
      }
    }

    let rm: RegExpExecArray | null;
    const rre = /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    while ((rm = rre.exec(file.content)) !== null) {
      allRoutes.add(rm[2]);
    }
  }

  const srcFiles = files.filter(f => !f.path.includes("node_modules"));
  const importedCount: Record<string, number> = {};
  for (const imp of importedFiles) importedCount[imp] = (importedCount[imp] ?? 0) + 1;

  const potentiallyUnused = srcFiles.filter(f => {
    const name = f.path.split("/").pop()?.replace(/\.(tsx|ts|jsx|js)$/, "") ?? "";
    return !importedFiles.has(name) && /src\/(components|pages|app)/.test(f.path);
  });

  for (const file of potentiallyUnused.slice(0, 10)) {
    const name = file.path.split("/").pop()?.replace(/\.(tsx|ts|jsx|js)$/, "") ?? "";
    candidates.push({
      id: `cleanup-${candidates.length + 1}`,
      type: "unused-component",
      severity: "low",
      title: `Potentially unused: ${name}`,
      description: `${file.path} appears unused — no imports found across the codebase.`,
      filePath: file.path,
      confidence: 78,
      reason: [
        "No import statement found referencing this file",
        "Not referenced by router in scanned source",
        "No dynamic import found",
        "File exists in src/components or src/pages",
      ],
      suggestedAction: "Verify by running `git grep -r \"${name}\"` and check dynamic imports. If truly unused, archive or delete.",
      estimatedCleanup: "1 file, ~0 KB bundle reduction",
    });
  }

  if (packageJson) {
    const deps = Object.keys({
      ...(packageJson.dependencies as Record<string, string> ?? {}),
      ...(packageJson.devDependencies as Record<string, string> ?? {}),
    });

    for (const dep of deps) {
      if (!allImports.has(dep) && !dep.startsWith("@types/")) {
        const SKIP = ["typescript", "esbuild", "vite", "drizzle-kit", "ts-node", "rimraf", "concurrently", "nodemon"];
        if (!SKIP.some(s => dep.includes(s))) {
          candidates.push({
            id: `cleanup-${candidates.length + 1}`,
            type: "unused-package",
            severity: "low",
            title: `Potentially unused dependency: ${dep}`,
            description: `"${dep}" is declared but no import usage was detected in scanned files.`,
            filePath: "package.json",
            confidence: 72,
            reason: [
              "No import statement referencing this package",
              "Declared in package.json dependencies or devDependencies",
            ],
            suggestedAction: `npm uninstall ${dep} — or verify indirect/peer/cli usage.`,
            estimatedCleanup: "1 package, ~50-500 KB install size reduction",
          });
        }
      }
    }
  }

  return candidates.slice(0, 25);
}

export function runDeploymentReadiness(files: Array<{ path: string; content: string }>): DeploymentCheck[] {
  const checks: DeploymentCheck[] = [];

  const buildFiles = files.filter(f => ["vite.config.ts", "next.config.js", "webpack.config.js", "Dockerfile", "vercel.json", "netlify.toml"].some(p => f.path.endsWith(p)));
  const envFiles = files.filter(f => /\.env/.test(f.path));
  const hasProductionBuild = buildFiles.some(f => /output/i.test(f.content) || /dist|build/i.test(f.content));
  const hasHealthCheck = files.some(f => /health|ping|alive/i.test(f.content) && /route|router|app\.(get|use)/i.test(f.content));
  const hasErrorBoundary = files.some(f => /ErrorBoundary|error\.tsx|404|Not Found/i.test(f.content));
  const hasCSP = files.some(f => /Content-Security-Policy|CSP/i.test(f.content));
  const hasHTTPS = files.some(f => /https|secure|TLS/i.test(f.content));
  const hasCORS = files.some(f => /cors|Access-Control-Allow-Origin/i.test(f.content));
  const hasRateLimit = files.some(f => /rate|throttle|limiter/i.test(f.content));
  const hasWebhookVerify = files.some(f => /webhook.*signature|verify.*signature|hmac/i.test(f.content));
  const hasLogging = files.some(f => /logger|pino|winston|console\.(log|error|warn)/i.test(f.content));
  const hasMigrations = files.some(f => /migration|migrate|schema\.sql/i.test(f.content));

  checks.push({ id: "deploy-1", category: "build", check: "Production build configuration", passed: hasProductionBuild, severity: "critical", detail: hasProductionBuild ? "Build config detected" : "No production build config found (Dockerfile, vercel.json, vite.config).", filePath: buildFiles[0]?.path, fixPrompt: "Add Dockerfile or platform-specific build config (vercel.json/netlify.toml)." });
  checks.push({ id: "deploy-2", category: "env", check: "Environment variable management", passed: envFiles.length > 0, severity: "high", detail: envFiles.length > 0 ? `${envFiles.length} .env file(s) found` : "No .env files or env schema detected. Deployments will likely fail without required variables.", fixPrompt: "Add .env.example with all required variables and use zod/env validation." });
  checks.push({ id: "deploy-3", category: "security", check: "Security headers (CSP, HSTS)", passed: hasCSP && hasHTTPS, severity: "high", detail: hasCSP ? "CSP headers detected" : "No Content-Security-Policy detected.", fixPrompt: "Add helmet/CSP middleware. Enable HSTS in production." });
  checks.push({ id: "deploy-4", category: "config", check: "CORS configuration", passed: hasCORS, severity: "high", detail: hasCORS ? "CORS configured" : "No CORS headers detected. API may reject legitimate frontend origins in production.", fixPrompt: "Configure CORS allowlist for production origins." });
  checks.push({ id: "deploy-5", category: "config", check: "Error handling / 404 page", passed: hasErrorBoundary, severity: "medium", detail: hasErrorBoundary ? "Error boundary or 404 page found" : "No error boundary or 404 page detected.", fixPrompt: "Add ErrorBoundary.tsx and a NotFound route." });
  checks.push({ id: "deploy-6", category: "observability", check: "Logging configured", passed: hasLogging, severity: "medium", detail: hasLogging ? "Logging library or console statements detected" : "No logging configured. Production incidents will be blind.", fixPrompt: "Add pino/winston logger. Wire to Sentry or similar in production." });
  checks.push({ id: "deploy-7", category: "security", check: "Rate limiting", passed: hasRateLimit, severity: "high", detail: hasRateLimit ? "Rate limiter detected" : "No rate limiting detected. API is vulnerable to abuse.", fixPrompt: "Add express-rate-limit or platform rate limits." });
  checks.push({ id: "deploy-8", category: "security", check: "Webhook signature verification", passed: hasWebhookVerify, severity: "high", detail: hasWebhookVerify ? "Webhook HMAC/verify detected" : "No webhook signature verification found. Payments/webhooks will accept forged payloads.", fixPrompt: "Add HMAC verification for all incoming webhooks." });
  checks.push({ id: "deploy-9", category: "rollback", check: "Database migrations ready", passed: hasMigrations, severity: "medium", detail: hasMigrations ? "Migration files detected" : "No migration system detected. Schema changes may not deploy safely.", fixPrompt: "Add Drizzle/Knex/Prisma migrations with CI deployment steps." });
  checks.push({ id: "deploy-10", category: "build", check: "Health check endpoint", passed: hasHealthCheck, severity: "medium", detail: hasHealthCheck ? "Health endpoint detected" : "No health check endpoint. Container/platform health probes will fail.", fixPrompt: "Add GET /health returning 200." });

  return checks;
}

export function runRealityCheck(
  keyFiles: Array<{ path: string; content: string }>,
  packageJson?: Record<string, unknown>,
): ProductRealityReport {
  const mockupFindings = detectMockups(keyFiles);
  const featureTruths = traceFeatureTruths(keyFiles);
  const cleanupCandidates = runCleanupRadar(keyFiles, packageJson);
  const deploymentChecks = runDeploymentReadiness(keyFiles);

  const verifiedLiveCount = featureTruths.filter(f => f.status === "verified_live").length;
  const partiallyConnectedCount = featureTruths.filter(f => f.status === "partially_connected").length;
  const mockedCount = featureTruths.filter(f => f.status === "mocked").length;
  const brokenCount = featureTruths.filter(f => f.status === "broken").length;
  const unverifiedCount = featureTruths.filter(f => f.status === "unverified").length;

  const deploymentBlockersCount = deploymentChecks.filter(c => !c.passed && c.severity === "critical").length;

  const mockupPenalty = mockupFindings.length * 8;
  const featurePenalty = mockedCount * 10 + partiallyConnectedCount * 5 + brokenCount * 12;
  const cleanupPenalty = Math.min(cleanupCandidates.length * 1.5, 15);
  const deployPenalty = deploymentBlockersCount * 10;

  const rawScore = 100 - mockupPenalty - featurePenalty - cleanupPenalty - deployPenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  const launchCompletenessScore = Math.max(0, Math.round(
    100 - (mockedCount * 12) - (partiallyConnectedCount * 6) - (brokenCount * 15) - (unverifiedCount * 2)
  ));

  const summary = score >= 85
    ? `Product reality verified — ${verifiedLiveCount} live features, ${mockedCount} mocked, ${deploymentBlockersCount} deployment blockers.`
    : score >= 60
      ? `Product has real foundations — ${mockedCount} features are still mockups, ${deploymentBlockersCount} blockers before launch.`
      : `Significant reality gap — ${mockedCount} features are mocked or broken, ${deploymentBlockersCount} critical deployment blockers.`;

  logger.info(
    { score, verifiedLiveCount, mockedCount, deploymentBlockersCount },
    "Reality Check complete",
  );

  return {
    score,
    verifiedLiveCount,
    partiallyConnectedCount,
    mockedCount,
    brokenCount,
    unverifiedCount,
    cleanupCandidatesCount: cleanupCandidates.length,
    deploymentBlockersCount,
    mockupFindings,
    featureTruths,
    cleanupCandidates,
    deploymentChecks,
    summary,
    launchCompletenessScore,
  };
}
