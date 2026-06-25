import { logger } from "./logger.js";
import type { CSG } from "../lib/csg-builder.js";

export interface MarketReadinessTracker {
  stage: "Working Demo" | "Hardened MVP" | "Market-Ready" | "Enterprise Scalable";
  progress: number;
  description: string;
  requirements: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
}

export interface GreenLightVerdict {
  color: "green" | "yellow" | "red";
  status: string;
  message: string;
  score: number;
  blockers: string[];
}

function hasDatabaseIntegrity(files: Array<{ path: string; content: string }>, csg: CSG): { passed: boolean; detail: string } {
  const hasMigrations = files.some(f => /migration|migrate|schema\.sql|drizzle|prisma/.test(f.path));
  const hasDBQueries = csg.nodes.size > 0 && [...csg.nodes.values()].some(n => n.type === "dbquery");
  const hasSchema = files.some(f => /schema|model|entity/i.test(f.path) && /\.(ts|js|prisma|sql)$/.test(f.path));

  const passed = hasMigrations && hasDBQueries && hasSchema;
  return {
    passed,
    detail: passed
      ? "Migrations, schema models, and DB queries detected."
      : hasMigrations
        ? "Migrations found, but missing schema definition or active DB queries."
        : hasDBQueries
          ? "DB queries exist, but no migration/schema system detected."
          : "No database layer detected — data persistence is missing.",
  };
}

function hasInputValidation(files: Array<{ path: string; content: string }>, csg: CSG): { passed: boolean; detail: string } {
  const hasZod = files.some(f => /zod|z\.object|z\.string|safeParse/.test(f.content));
  const hasExpressValidator = files.some(f => /express-validator|check\(|validationResult/.test(f.content));
  const hasJoi = files.some(f => /joi|Joi\./.test(f.content));
  const hasValibot = files.some(f => /valibot|v\.object|v\.string/.test(f.content));
  const hasAnyValidation = hasZod || hasExpressValidator || hasJoi || hasValibot;

  const hasSanitizers = [...csg.nodes.values()].some(n => n.type === "sanitizer");

  const passed = hasAnyValidation || hasSanitizers;
  return {
    passed,
    detail: passed
      ? "Input validation library detected (zod/joi/valibot/express-validator)."
      : "No input validation library found — all inputs are trusted.",
  };
}

function hasRoleBasedSecurity(files: Array<{ path: string; content: string }>, csg: CSG): { passed: boolean; detail: string } {
  const hasAuthMiddleware = files.some(f => /requireAuth|authenticate|verifyToken|isAuthenticated|hasRole|canAccess|middleware/.test(f.content));
  const hasRoleChecks = [...csg.nodes.values()].some(n => n.type === "conditional" && n.meta.isAuthCheck);
  const hasRBAC = files.some(f => /role|permission|scopes|rbac|abilities/.test(f.content));

  const passed = hasAuthMiddleware || hasRoleChecks || hasRBAC;
  return {
    passed,
    detail: passed
      ? "Authentication middleware or role-based access control detected."
      : "No auth middleware or role checks found.",
  };
}

function hasErrorHandling(files: Array<{ path: string; content: string }>, csg: CSG): { passed: boolean; detail: string } {
  const hasTryCatch = [...csg.nodes.values()].some(n => n.type === "try_catch");
  const hasErrorBoundary = files.some(f => /ErrorBoundary|error\.tsx|componentDidCatch|getDerivedStateFromError/.test(f.content));
  const hasLogging = files.some(f => /logger|winston|pino|sentry|captureException/.test(f.content));

  const passed = hasTryCatch || hasErrorBoundary || hasLogging;
  return {
    passed,
    detail: passed
      ? "Error handling, logging, or error boundaries detected."
      : "No structured error handling found.",
  };
}

function hasTesting(files: Array<{ path: string; content: string }>): { passed: boolean; detail: string } {
  const hasTestFiles = files.some(f => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f.path));
  const hasTestCommands = files.some(f => /"test"\s*:|vitest|jest|mocha|cypress|playwright/.test(f.content));

  const passed = hasTestFiles || hasTestCommands;
  return {
    passed,
    detail: passed
      ? "Test files or test framework configuration found."
      : "No tests detected.",
  };
}

function hasCI(files: Array<{ path: string; content: string }>): { passed: boolean; detail: string } {
  const hasCI = files.some(f => /\.github\/workflows|\.gitlab-ci|\.circleci|azure-pipelines|\.netlify|\.vercel|Dockerfile/i.test(f.path));

  return {
    passed: hasCI,
    detail: hasCI
      ? "CI/CD configuration found."
      : "No CI/CD pipeline detected.",
  };
}

export function computeMarketReadiness(
  files: Array<{ path: string; content: string }>,
  csg: CSG,
  finalScore: number,
  issueCounts: { critical: number; high: number; medium: number; low: number },
  deploymentBlockers: number,
): MarketReadinessTracker {
  const db = hasDatabaseIntegrity(files, csg);
  const validation = hasInputValidation(files, csg);
  const auth = hasRoleBasedSecurity(files, csg);
  const errors = hasErrorHandling(files, csg);
  const testing = hasTesting(files);
  const ci = hasCI(files);

  const requirements = [
    { name: "Database Integrity", ...db },
    { name: "Input Validation", ...validation },
    { name: "Role-Based Security", ...auth },
    { name: "Error Handling", ...errors },
    { name: "Tests", ...testing },
    { name: "CI/CD", ...ci },
  ];

  const passedCount = requirements.filter(r => r.passed).length;
  const total = requirements.length;
  const progress = Math.round((passedCount / total) * 100);

  let stage: MarketReadinessTracker["stage"] = "Working Demo";
  if (passedCount === total && finalScore >= 85 && deploymentBlockers === 0 && issueCounts.critical === 0) {
    stage = "Enterprise Scalable";
  } else if (passedCount >= 5 && finalScore >= 70 && deploymentBlockers <= 1 && issueCounts.critical === 0) {
    stage = "Market-Ready";
  } else if (passedCount >= 3 && finalScore >= 55 && issueCounts.critical <= 1) {
    stage = "Hardened MVP";
  }

  const description =
    stage === "Enterprise Scalable"
      ? `All ${total} readiness gates passed. Architecture is production-grade and scalable.`
      : stage === "Market-Ready"
        ? `${passedCount}/${total} gates passed. Minor gaps remain but safe for controlled launch.`
        : stage === "Hardened MVP"
          ? `${passedCount}/${total} gates passed. Core functionality exists but hardening required before scale.`
          : `Only ${passedCount}/${total} gates passed. Significant architectural gaps remain.`;

  logger.info({ stage, progress, passedCount, total }, "Market Readiness assessment complete");

  return {
    stage,
    progress,
    description,
    requirements,
  };
}

export function computeTrafficLightVerdict(
  finalScore: number,
  issueCounts: { critical: number; high: number; medium: number; low: number },
  deploymentBlockers: number,
  marketReadiness: MarketReadinessTracker,
  productRealityScore: number,
): GreenLightVerdict {
  const blockers: string[] = [];

  if (issueCounts.critical > 0) blockers.push(`${issueCounts.critical} critical issue(s)`);
  if (deploymentBlockers > 0) blockers.push(`${deploymentBlockers} deployment blocker(s)`);
  if (productRealityScore < 50) blockers.push("Product reality gaps — mocked or disconnected features");
  if (marketReadiness.progress < 40) blockers.push("Market readiness stage below Hardened MVP");

  const hasRedConditions = issueCounts.critical >= 3 || deploymentBlockers >= 4 || productRealityScore < 30;
  const hasYellowConditions = issueCounts.critical > 0 || issueCounts.high >= 3 || deploymentBlockers > 0 || productRealityScore < 70 || marketReadiness.progress < 50;

  let color: GreenLightVerdict["color"];
  let status: string;
  let message: string;

  if (hasRedConditions) {
    color = "red";
    status = "RED LIGHT";
    message = `Significant refactoring required. ${blockers.join("; ")}. High risk of collapse if deployed.`;
  } else if (hasYellowConditions) {
    color = "yellow";
    status = "YELLOW LIGHT";
    message = `Needs minor fixes. Safe to test but not scale. ${blockers.length > 0 ? blockers.join("; ") : "Address remaining issues before production."}`;
  } else {
    color = "green";
    status = "GREEN LIGHT";
    message = "Ready for production deployment. Architecture is sound and all gates passed.";
  }

  logger.info({ color, status, blockers: blockers.length }, "Traffic-Light verdict computed");

  return {
    color,
    status,
    message,
    score: finalScore,
    blockers,
  };
}
