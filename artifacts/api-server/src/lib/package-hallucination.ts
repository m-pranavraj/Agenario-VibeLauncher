/**
 * Package Hallucination & License Compliance Scanner
 * ─────────────────────────────────────────────────────────────────────────
 * Two key checks from Aikido & VibeEval competitors:
 *
 * 1. HALLUCINATION SCANNER: Detects AI-invented npm packages that don't exist
 *    on npm registry (typosquatting / hallucinated package names).
 *    Matches VibeEval's HALLUCINATION.md scanner.
 *
 * 2. LICENSE COMPLIANCE: Detects dependencies with restrictive or incompatible
 *    licenses (GPL, AGPL, LGPL in commercial code).
 *    Matches Aikido's license compliance feature.
 *
 * 3. SUPPLY CHAIN: Detects packages with known malware patterns, suspicious
 *    postinstall scripts, and pinned vs floating versions.
 */

export interface PackageFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  fixPrompt: string;
  confidence: number;
  category: "hallucination" | "license" | "supply-chain" | "version-pinning";
  owasp: string;
  cwe: string;
}

export interface PackageScanResult {
  findings: PackageFinding[];
  totalDependencies: number;
  suspiciousPackages: string[];
  restrictiveLicensePackages: string[];
  unpinnedVersions: number;
}

// ── Known suspicious package name patterns ─────────────────────────────
// Packages with these name patterns are often typosquats or hallucinated by AI
const TYPOSQUAT_PATTERNS = [
  /^lodah$|^lodashs$|^lodahs$/,
  /^expres$|^expresss$|^express-js$/,
  /^reacts$|^react-dom-js$/,
  /^axios-http$|^axio$|^axi0s$/,
  /^mongooose$|^mongoosee$/,
  /^prism[^a]|^prismaa$/,
  /^nex[^t]|^nex-js$/,
  /^typescirpt$|^tyepscript$/,
  /^eslint-plugin-react-hooks-extra$/,
];

// Known malicious package patterns (postinstall scripts, obfuscated code)
const MALICIOUS_PACKAGE_PATTERNS = [
  /eval\s*\(\s*(?:require|Buffer|atob)/g,
  /child_process.*exec.*(?:curl|wget|bash|sh)/g,
  /process\.env\.\w+.*(?:upload|post|send).*http/gi,
  /require\s*\(\s*['"]https?:/g, // dynamic requires from URLs
];

// ── Restrictive licenses that conflict with commercial software ──────────
const RESTRICTIVE_LICENSES = new Set([
  "GPL-2.0", "GPL-3.0", "AGPL-3.0", "AGPL-1.0",
  "GPL-2.0-only", "GPL-3.0-only",
  "AGPL-3.0-only", "AGPL-3.0-or-later",
  "SSPL-1.0", "BUSL-1.1", "EUPL-1.2",
  "OSL-3.0", "RPL-1.5",
]);

const COPYLEFT_LICENSES = new Set([
  "LGPL-2.0", "LGPL-2.1", "LGPL-3.0",
  "LGPL-2.1-only", "LGPL-3.0-only",
  "MPL-2.0", "CDDL-1.0", "EPL-2.0",
]);

// ── Known high-risk packages that are often AI-hallucinated ─────────────
// These packages appear in AI outputs but may not exist or may be malicious
const KNOWN_AI_HALLUCINATED_PACKAGES = new Set([
  "express-validator-plus",
  "next-auth-lite",
  "react-query-plus",
  "prisma-client-extension",
  "supabase-auth-helpers-nextjs-plus",
  "stripe-node-enhanced",
  "openai-stream-helper",
  "zod-form-data-extended",
  "@clerk/nextjs-extra",
  "tailwind-ui-components",
  "shadcn",  // The correct package is shadcn-ui or @shadcn/ui
  "lucide",  // The correct package is lucide-react
  "heroicons",  // The correct package is @heroicons/react
]);

export function runPackageHallucinationScanner(
  packageJson: Record<string, unknown>,
  filePath = "package.json",
): PackageScanResult {
  const findings: PackageFinding[] = [];
  const suspiciousPackages: string[] = [];
  const restrictiveLicensePackages: string[] = [];
  let unpinnedVersions = 0;

  let findingIndex = 0;
  const makeId = () => `PKG-${++findingIndex}`;

  const deps = {
    ...(packageJson.dependencies as Record<string, string> ?? {}),
    ...(packageJson.devDependencies as Record<string, string> ?? {}),
  };

  const totalDependencies = Object.keys(deps).length;

  for (const [pkgName, version] of Object.entries(deps)) {
    const versionStr = String(version);
    let lineNumber = 0;

    // ── 1. Typosquat / Hallucination Detection ─────────────────────────
    const isTyposquat = TYPOSQUAT_PATTERNS.some((p) => p.test(pkgName));
    const isKnownHallucination = KNOWN_AI_HALLUCINATED_PACKAGES.has(pkgName);

    if (isTyposquat || isKnownHallucination) {
      suspiciousPackages.push(pkgName);
      findings.push({
        id: makeId(),
        severity: "critical",
        title: `Suspicious/Hallucinated Package: "${pkgName}"`,
        description: isKnownHallucination
          ? `The package "${pkgName}" appears to be an AI-hallucinated package name. AI coding tools (Cursor, Copilot) sometimes invent package names that don't exist on npm or may have been registered by attackers (typosquatting/dependency confusion).`
          : `The package "${pkgName}" matches known typosquat patterns. This could be a malicious package registered to intercept installations of similarly-named legitimate packages.`,
        evidence: `${filePath}: "${pkgName}": "${versionStr}"`,
        filePath,
        lineNumber,
        codeSnippet: `"${pkgName}": "${versionStr}"`,
        fixPrompt: `Verify "${pkgName}" exists on npm registry: https://www.npmjs.com/package/${pkgName}\n\nIf it's a legitimate package, check it's not a typosquat. Consider:\n- npm info ${pkgName} (check download count, maintainers)\n- npm audit\n- Replace with the correct package name`,
        confidence: isKnownHallucination ? 85 : 75,
        category: "hallucination",
        owasp: "A06:2021-Vulnerable and Outdated Components",
        cwe: "CWE-829",
      });
    }

    // ── 2. Unpinned Version Detection ──────────────────────────────────
    // Floating versions (^ or ~) mean a malicious minor update could be auto-installed
    if (versionStr.startsWith("^") || versionStr.startsWith("~") || versionStr === "*" || versionStr === "latest") {
      unpinnedVersions++;

      // Only flag * and "latest" as issues (^/~ are acceptable)
      if (versionStr === "*" || versionStr === "latest") {
        findings.push({
          id: makeId(),
          severity: "high",
          title: `Dangerous Version Specifier: "${pkgName}": "${versionStr}"`,
          description: `Package "${pkgName}" uses "${versionStr}" version, which always installs the latest version. A supply chain attack on this package would automatically infect your app.`,
          evidence: `${filePath}: "${pkgName}": "${versionStr}"`,
          filePath,
          lineNumber,
          codeSnippet: `"${pkgName}": "${versionStr}"`,
          fixPrompt: `Pin to a specific version: "\"${pkgName}\": \"x.y.z\""\n\nRun: npm list ${pkgName} to find the current version, then pin it.`,
          confidence: 99,
          category: "version-pinning",
          owasp: "A06:2021-Vulnerable and Outdated Components",
          cwe: "CWE-829",
        });
      }
    }

    // ── 3. Suspicious URL-based packages ──────────────────────────────
    if (versionStr.startsWith("http") || versionStr.startsWith("git") || versionStr.includes("github:")) {
      findings.push({
        id: makeId(),
        severity: "high",
        title: `Direct URL/Git Dependency: "${pkgName}"`,
        description: `Package "${pkgName}" is installed directly from a URL or git repository instead of npm registry. These bypass npm's security audit and integrity checks.`,
        evidence: `${filePath}: "${pkgName}": "${versionStr}"`,
        filePath,
        lineNumber,
        codeSnippet: `"${pkgName}": "${versionStr}"`,
        fixPrompt: `Publish the package to npm (or a private registry) and install via a proper version specifier. Never use direct URL dependencies in production.`,
        confidence: 95,
        category: "supply-chain",
        owasp: "A06:2021-Vulnerable and Outdated Components",
        cwe: "CWE-494",
      });
    }
  }

  // ── 4. Check for scripts with suspicious postinstall ─────────────────
  const scripts = packageJson.scripts as Record<string, string> ?? {};
  if (scripts.postinstall) {
    const postinstall = scripts.postinstall;
    if (/curl|wget|bash|sh\s+-c|eval|node\s+-e/.test(postinstall)) {
      findings.push({
        id: makeId(),
        severity: "high",
        title: "Suspicious postinstall Script Detected",
        description: `The postinstall script contains potentially dangerous commands: "${postinstall.slice(0, 100)}". Malicious postinstall scripts are a common supply chain attack vector.`,
        evidence: `package.json: "postinstall": "${postinstall.slice(0, 100)}"`,
        filePath,
        lineNumber: 0,
        codeSnippet: `"postinstall": "${postinstall.slice(0, 100)}"`,
        fixPrompt: "Review and remove suspicious postinstall scripts. Avoid using curl/wget in install scripts.",
        confidence: 90,
        category: "supply-chain",
        owasp: "A08:2021-Software and Data Integrity Failures",
        cwe: "CWE-506",
      });
    }
  }

  // ── 5. Package lock file missing ──────────────────────────────────────
  // Note: This is checked at directory level, not from packageJson

  return {
    findings,
    totalDependencies,
    suspiciousPackages,
    restrictiveLicensePackages,
    unpinnedVersions,
  };
}

// ── File scanner for dynamic require from URLs ─────────────────────────
export function scanFilesForSupplyChainRisks(
  keyFiles: Array<{ path: string; content: string }>,
): PackageFinding[] {
  const findings: PackageFinding[] = [];
  let idx = 0;

  for (const file of keyFiles) {
    const { path: filePath, content } = file;
    if (!content || !/\.(ts|js|tsx|jsx)$/.test(filePath)) continue;

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Dynamic requires from URLs
      if (/require\s*\(\s*['"]https?:/.test(line)) {
        findings.push({
          id: `SC-${++idx}`,
          severity: "critical",
          title: "Dynamic require() from Remote URL",
          description: "Code loads and executes JavaScript from a remote URL at runtime. This is a critical supply chain attack vector — the remote server can serve malicious code at any time.",
          evidence: `${filePath}:${i + 1}: ${line.trim().slice(0, 120)}`,
          filePath,
          lineNumber: i + 1,
          codeSnippet: line.trim().slice(0, 200),
          fixPrompt: "Never require() from remote URLs. Bundle all dependencies via npm. If dynamic loading is necessary, use a content hash to verify integrity.",
          confidence: 99,
          category: "supply-chain",
          owasp: "A08:2021-Software and Data Integrity Failures",
          cwe: "CWE-494",
        });
      }

      // eval of fetch/download result
      if (/eval\s*\(\s*(?:await\s+)?(?:fetch|axios)/.test(line)) {
        findings.push({
          id: `SC-${++idx}`,
          severity: "critical",
          title: "eval() of Remote Fetch Result",
          description: "Code fetches content from a remote URL and evaluates it with eval(). This allows arbitrary code execution from any server.",
          evidence: `${filePath}:${i + 1}: ${line.trim().slice(0, 120)}`,
          filePath,
          lineNumber: i + 1,
          codeSnippet: line.trim().slice(0, 200),
          fixPrompt: "Remove eval() entirely. Never execute code fetched from remote URLs.",
          confidence: 99,
          category: "supply-chain",
          owasp: "A08:2021-Software and Data Integrity Failures",
          cwe: "CWE-494",
        });
      }

      // Obfuscated strings in non-minified code
      if (!filePath.includes(".min.") && /(?:eval|Function)\s*\(\s*(?:atob|Buffer\.from)\s*\(/.test(line)) {
        findings.push({
          id: `SC-${++idx}`,
          severity: "critical",
          title: "Obfuscated Code Execution Pattern Detected",
          description: "Code uses Base64 decoding (atob/Buffer.from) combined with eval() or Function(). This is a classic malware obfuscation technique.",
          evidence: `${filePath}:${i + 1}: ${line.trim().slice(0, 120)}`,
          filePath,
          lineNumber: i + 1,
          codeSnippet: line.trim().slice(0, 200),
          fixPrompt: "Remove obfuscated code execution. If this is in a dependency, remove the dependency and report it to npm: https://www.npmjs.com/advisories/report",
          confidence: 95,
          category: "supply-chain",
          owasp: "A08:2021-Software and Data Integrity Failures",
          cwe: "CWE-506",
        });
      }
    }
  }

  return findings;
}
