/**
 * Cleanup Agent — Static code hygiene analyzer
 * Scans source files for tech debt, debug noise, dead code, type safety gaps,
 * and environment issues. Returns actionable cleanup recommendations.
 */

export type CleanupSeverity = "error" | "warn" | "info";

export interface CleanupFinding {
  id: string;
  category: CleanupCategory;
  severity: CleanupSeverity;
  title: string;
  detail: string;
  file: string;
  lineHint?: string;
  count?: number;
  fixSuggestion: string;
  autoFixable: boolean;
}

export type CleanupCategory =
  | "debug-noise"
  | "tech-debt"
  | "dead-code"
  | "type-safety"
  | "env-hygiene"
  | "doc-clutter"
  | "security-smell"
  | "file-hygiene";

export interface CleanupReport {
  totalFindings: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  autoFixableCount: number;
  estimatedCleanupMinutes: number;
  hasCritical: boolean;
  categories: Record<CleanupCategory, number>;
  findings: CleanupFinding[];
  topFiles: Array<{ path: string; issueCount: number }>;
  debtScore: number; // 0–100, lower is more debt
  summary: string;
}

// ── Regex pattern banks ───────────────────────────────────────────────────────
const CONSOLE_PATTERNS = [
  /console\.(log|debug|info|warn|error|trace|dir|table)\s*\(/g,
];
const TODO_PATTERNS = [
  /\/\/\s*(TODO|FIXME|HACK|XXX|TEMP|BUG|KLUDGE|NOSONAR)\b/gi,
  /#\s*(TODO|FIXME|HACK|XXX|TEMP|BUG)\b/gi,
];
const COMMENTED_CODE_PATTERNS = [
  /\/\/\s*(const|let|var|function|class|import|export|return|if|for|while)\b/g,
  /\/\*[\s\S]{40,}?\*\//g,
];
const HARDCODED_URL_PATTERNS = [
  /https?:\/\/localhost(:\d+)?/g,
  /https?:\/\/127\.0\.0\.1(:\d+)?/g,
  /https?:\/\/0\.0\.0\.0(:\d+)?/g,
];
const ANY_TYPE_PATTERNS = [/:\s*any\b/g, /as\s+any\b/g];
const ENV_NO_FALLBACK = [/process\.env\.\w+(?!\s*\?\?|\s*\|\||\s*!)/g];
const UNHANDLED_PROMISE = [/\.then\s*\([^)]+\)(?!\s*\.catch)/g];
const EMPTY_CATCH = [/catch\s*\([^)]*\)\s*\{\s*\}/g];
const HARDCODED_CREDS = [
  /password\s*[:=]\s*['"][^'"]{3,}['"]/gi,
  /api_?key\s*[:=]\s*['"][a-zA-Z0-9_\-]{10,}['"]/gi,
  /secret\s*[:=]\s*['"][^'"]{8,}['"]/gi,
];
const MD_FILE_PATTERN = /\.md$/i;
const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;
const BAK_FILE_PATTERN = /\.(bak|tmp|old|backup|orig)$/i;
const DEBUGGER_STMT = /\bdebugger\b/g;
const ALERT_STMT = /\balert\s*\(/g;

function countMatches(content: string, patterns: RegExp[]): number {
  let count = 0;
  for (const re of patterns) {
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    const matches = content.match(globalRe);
    if (matches) count += matches.length;
  }
  return count;
}

function getFirstMatch(content: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const globalRe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    const m = content.match(globalRe);
    if (m && m[0]) return m[0].slice(0, 60);
  }
  return null;
}

function findLineHint(content: string, pattern: RegExp): string {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const re = new RegExp(pattern.source, pattern.flags.replace("g", ""));
    if (re.test(lines[i])) {
      return `line ${i + 1}: ${lines[i].trim().slice(0, 50)}`;
    }
  }
  return "";
}

export function runCleanupAgent(
  keyFiles: Array<{ path: string; content: string }>,
  _appDescription?: string | null,
): CleanupReport {
  const findings: CleanupFinding[] = [];
  const fileIssueCounts: Record<string, number> = {};

  function addFinding(f: Omit<CleanupFinding, "id">): void {
    const id = `cleanup-${findings.length + 1}`;
    findings.push({ ...f, id });
    fileIssueCounts[f.file] = (fileIssueCounts[f.file] ?? 0) + 1;
  }

  for (const file of keyFiles) {
    const { path: filePath, content } = file;
    if (!content || content.trim().length === 0) {
      addFinding({
        category: "file-hygiene",
        severity: "info",
        title: "Empty file detected",
        detail: `${filePath} contains no meaningful code and can be safely removed.`,
        file: filePath,
        fixSuggestion: `git rm ${filePath}`,
        autoFixable: true,
      });
      continue;
    }

    // ── Debug noise: console.* ─────────────────────────────────────────
    const consoleCount = countMatches(content, CONSOLE_PATTERNS);
    if (consoleCount > 0) {
      const lineHint = findLineHint(content, /console\.(log|debug|info|warn|error)\s*\(/);
      addFinding({
        category: "debug-noise",
        severity: "warn",
        title: `${consoleCount} console.* statement${consoleCount > 1 ? "s" : ""} in production code`,
        detail: `Debug logs leak internal state in production. Replace with a structured logger (pino, winston) or strip with a build plugin.`,
        file: filePath,
        lineHint,
        count: consoleCount,
        fixSuggestion: `ESLint rule: "no-console": "error" — or use a logger wrapper that's a no-op in production.`,
        autoFixable: false,
      });
    }

    // ── Debugger statements ────────────────────────────────────────────
    const debuggerCount = countMatches(content, [DEBUGGER_STMT]);
    if (debuggerCount > 0) {
      const lineHint = findLineHint(content, DEBUGGER_STMT);
      addFinding({
        category: "debug-noise",
        severity: "error",
        title: "debugger statement in source code",
        detail: "A debugger statement will pause execution in all environments. This must not reach production.",
        file: filePath,
        lineHint,
        fixSuggestion: `Remove all 'debugger' statements before committing. Enable ESLint rule "no-debugger": "error".`,
        autoFixable: true,
      });
    }

    // ── Alert statements ───────────────────────────────────────────────
    const alertCount = countMatches(content, [ALERT_STMT]);
    if (alertCount > 0) {
      const lineHint = findLineHint(content, ALERT_STMT);
      addFinding({
        category: "debug-noise",
        severity: "warn",
        title: "alert() call in frontend code",
        detail: "alert() blocks the UI thread and gives a terrible UX in production apps. Use a toast/notification system.",
        file: filePath,
        lineHint,
        fixSuggestion: "Replace alert() with a toast notification library (sonner, react-hot-toast, shadcn/ui toast).",
        autoFixable: false,
      });
    }

    // ── Tech debt: TODO/FIXME ──────────────────────────────────────────
    const todoCount = countMatches(content, TODO_PATTERNS);
    if (todoCount > 0) {
      const lineHint = findLineHint(content, /\/\/\s*(TODO|FIXME|HACK)/i);
      addFinding({
        category: "tech-debt",
        severity: "info",
        title: `${todoCount} TODO/FIXME/HACK comment${todoCount > 1 ? "s" : ""} unresolved`,
        detail: "Unresolved TODO comments indicate known tech debt that may hide security or reliability risks at scale.",
        file: filePath,
        lineHint,
        count: todoCount,
        fixSuggestion: "Track tech debt in your issue tracker. Use GitHub Copilot or cursor to resolve common TODOs. For security-critical ones, create immediate tickets.",
        autoFixable: false,
      });
    }

    // ── Dead code: commented-out blocks ──────────────────────────────
    const deadCount = countMatches(content, COMMENTED_CODE_PATTERNS);
    if (deadCount > 2) {
      addFinding({
        category: "dead-code",
        severity: "info",
        title: `Heavy commented-out code detected (${deadCount} patterns)`,
        detail: "Large commented-out code sections bloat the file, confuse future developers, and hide real logic.",
        file: filePath,
        count: deadCount,
        fixSuggestion: "Delete commented-out code — it's in git history. Use: git log -p <file> to recover it if needed.",
        autoFixable: false,
      });
    }

    // ── Type safety: TypeScript `any` ─────────────────────────────────
    if (filePath.match(/\.(ts|tsx)$/)) {
      const anyCount = countMatches(content, ANY_TYPE_PATTERNS);
      if (anyCount > 0) {
        const lineHint = findLineHint(content, /:\s*any\b/);
        addFinding({
          category: "type-safety",
          severity: "warn",
          title: `${anyCount} TypeScript 'any' type${anyCount > 1 ? "s" : ""} — type safety gap`,
          detail: `Using 'any' disables TypeScript's safety net for that code path. In API handlers, this can hide runtime type errors that only surface in production.`,
          file: filePath,
          lineHint,
          count: anyCount,
          fixSuggestion: "Enable 'noImplicitAny: true' in tsconfig. Replace 'any' with 'unknown' and add type guards, or generate types from your OpenAPI spec.",
          autoFixable: false,
        });
      }
    }

    // ── Empty catch blocks ─────────────────────────────────────────────
    const emptyCatchCount = countMatches(content, EMPTY_CATCH);
    if (emptyCatchCount > 0) {
      const lineHint = findLineHint(content, /catch\s*\([^)]*\)\s*\{/);
      addFinding({
        category: "dead-code",
        severity: "warn",
        title: `${emptyCatchCount} empty catch block${emptyCatchCount > 1 ? "s" : ""} — silent failure`,
        detail: "Empty catch blocks silently swallow errors, making failures invisible. This is the #1 cause of 'it works on my machine' production bugs.",
        file: filePath,
        lineHint,
        count: emptyCatchCount,
        fixSuggestion: "At minimum: catch(err) { logger.error(err); throw err; }. Never swallow errors silently.",
        autoFixable: false,
      });
    }

    // ── Env hygiene: process.env without fallback ─────────────────────
    if (filePath.match(/\.(ts|tsx|js|jsx|mjs)$/)) {
      const envCount = countMatches(content, ENV_NO_FALLBACK);
      if (envCount > 3) {
        addFinding({
          category: "env-hygiene",
          severity: "warn",
          title: `${envCount} env variable reads without fallback`,
          detail: "Reading process.env.VAR without ?? fallback means a missing env variable causes a silent undefined — leading to subtle runtime bugs in production deployments.",
          file: filePath,
          count: envCount,
          fixSuggestion: "Use a validated env schema (zod): const env = z.object({ VAR: z.string() }).parse(process.env);",
          autoFixable: false,
        });
      }
    }

    // ── Security smells: hardcoded credentials ────────────────────────
    const credCount = countMatches(content, HARDCODED_CREDS);
    if (credCount > 0) {
      addFinding({
        category: "security-smell",
        severity: "error",
        title: "Potential hardcoded credential in source",
        detail: "A password, API key, or secret literal was detected in source code. This will be committed to git history and exposed to anyone with repo access.",
        file: filePath,
        fixSuggestion: "Immediately move to environment variables. Run: git filter-branch or BFG Repo Cleaner to purge from history.",
        autoFixable: false,
      });
    }

    // ── Env hygiene: hardcoded localhost URLs ─────────────────────────
    const urlCount = countMatches(content, HARDCODED_URL_PATTERNS);
    if (urlCount > 0) {
      const lineHint = findLineHint(content, /https?:\/\/localhost/);
      const snippet = getFirstMatch(content, HARDCODED_URL_PATTERNS);
      addFinding({
        category: "env-hygiene",
        severity: "warn",
        title: `${urlCount} hardcoded localhost URL${urlCount > 1 ? "s" : ""}`,
        detail: `Found hardcoded local URL: "${snippet}". This will silently fail in staging/production environments.`,
        file: filePath,
        lineHint,
        count: urlCount,
        fixSuggestion: "Use process.env.API_URL or relative URLs. For frontend, use Vite's import.meta.env.VITE_API_URL.",
        autoFixable: false,
      });
    }

    // ── MD files in src directory ─────────────────────────────────────
    if (MD_FILE_PATTERN.test(filePath) && filePath.includes("src/")) {
      addFinding({
        category: "doc-clutter",
        severity: "info",
        title: "Markdown file inside source directory",
        detail: `${filePath} is a markdown file inside the source tree. It won't be bundled but adds clutter and may confuse build tools.`,
        file: filePath,
        fixSuggestion: "Move docs to a /docs directory at project root, or to the project README. Keep src/ code-only.",
        autoFixable: true,
      });
    }

    // ── .bak / .tmp files ─────────────────────────────────────────────
    if (BAK_FILE_PATTERN.test(filePath)) {
      addFinding({
        category: "file-hygiene",
        severity: "warn",
        title: "Backup/temporary file in repository",
        detail: `${filePath} is a backup or temp file that should not be in version control.`,
        file: filePath,
        fixSuggestion: `git rm ${filePath} && echo "${filePath}" >> .gitignore`,
        autoFixable: true,
      });
    }

    // ── Test files with no assertions ─────────────────────────────────
    if (TEST_FILE_PATTERN.test(filePath)) {
      const assertionPatterns = [/expect\(/, /assert\(/, /toBe\(/, /toEqual\(/, /describe\(/];
      const hasAssertions = assertionPatterns.some((p) => p.test(content));
      if (!hasAssertions && content.length < 200) {
        addFinding({
          category: "tech-debt",
          severity: "info",
          title: "Empty or skeleton test file",
          detail: `${filePath} appears to be an empty or placeholder test file with no assertions. These pollute test suites and give false coverage confidence.`,
          file: filePath,
          fixSuggestion: "Add real tests or delete the file. Empty test files inflate perceived test coverage without providing safety.",
          autoFixable: false,
        });
      }
    }
  }

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warnCount = findings.filter((f) => f.severity === "warn").length;
  const infoCount = findings.filter((f) => f.severity === "info").length;
  const autoFixableCount = findings.filter((f) => f.autoFixable).length;

  const categories = findings.reduce(
    (acc, f) => {
      acc[f.category] = (acc[f.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<CleanupCategory, number>,
  );

  const topFiles = Object.entries(fileIssueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, issueCount]) => ({ path, issueCount }));

  const estimatedCleanupMinutes = errorCount * 20 + warnCount * 10 + infoCount * 5;

  // Debt score: 100 = spotless, 0 = severe debt
  const debtScore = Math.max(
    0,
    100 - Math.min(errorCount * 15, 40) - Math.min(warnCount * 6, 35) - Math.min(infoCount * 2, 15),
  );

  const hasCritical = errorCount > 0;
  const totalFindings = findings.length;

  const summary =
    debtScore >= 85
      ? `Clean codebase — ${totalFindings} minor hygiene issue${totalFindings !== 1 ? "s" : ""} found. Estimated ${estimatedCleanupMinutes} minutes to resolve.`
      : debtScore >= 60
        ? `Moderate tech debt — ${warnCount} issues need attention before launch. Focus on debug noise and type safety gaps.`
        : `Significant cleanup required — ${errorCount} critical issue${errorCount !== 1 ? "s" : ""} (hardcoded secrets or debugger statements) must be resolved before deployment.`;

  return {
    totalFindings,
    errorCount,
    warnCount,
    infoCount,
    autoFixableCount,
    estimatedCleanupMinutes,
    hasCritical,
    categories,
    findings,
    topFiles,
    debtScore,
    summary,
  };
}
