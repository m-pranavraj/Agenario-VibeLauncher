import { logger } from "../logger.js";
import { buildCSG, bfsForward, type CSG } from "../csg-builder.js";
import type { MockupFinding, FeatureTruth, CleanupCandidate, DeploymentCheck, ProductRealityReport } from "./index.js";

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

function findMockupRegex(files: Array<{ path: string; content: string }>): MockupFinding[] {
  const findings: MockupFinding[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      for (const pattern of MOCK_DATA_PATTERNS) {
        const match = line.match(pattern);
        if (!match) continue;
        const severity = /(mockData|dummyData|fakeUsers|sampleOrders|testData|placeholderData|staticData|hardcodedData)/i.test(match[0]) ? "high" : "medium";
        findings.push({
          id: `mockup-regex-${findings.length + 1}`,
          category: "mock-data",
          severity: severity as MockupFinding["severity"],
          title: "Hardcoded mock data in production component",
          description: `Hardcoded array/object or mock data variable detected in ${file.path}. This data will not update from a real backend.`,
          filePath: file.path,
          lineNumber: lineNum,
          evidence: match[0],
          codeSnippet: line.trim().slice(0, 120),
          fixPrompt: "Replace hardcoded data with a fetch/axios call to your backend API. Add loading and error states.",
          confidence: 92,
          impact: "Feature appears functional but displays static/temporary data only.",
        });
        break;
      }
    }
  }
  return findings;
}

function buildRealityGraph(files: Array<{ path: string; content: string }>): CSG {
  const csg = buildCSG(files);
  const IMPORT_RE = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;

  for (const file of files) {
    const moduleId = `module:${file.path}`;
    let m: RegExpExecArray | null;

    // Tag mock data sources
    for (const pat of MOCK_DATA_PATTERNS) {
      const re = new RegExp(pat.source, "g");
      while ((m = re.exec(file.content)) !== null) {
        const lineNum = file.content.substring(0, m.index).split("\n").length;
        const mockId = `mock:${file.path}:${lineNum}`;
        const existing = csg.nodes.get(mockId);
        if (existing && existing.type === "source") {
          existing.meta.isMockSource = true;
        }
      }
    }

    // Find all React/Vue/Svelte component files
    if (/\.(tsx|jsx|vue|svelte)$/.test(file.path) && !file.path.includes("node_modules")) {
      const re2 = new RegExp(IMPORT_RE.source, "g");
      const imports = new Set<string>();
      while ((m = re2.exec(file.content)) !== null) imports.add(m[1]);

      // Tag as component if it looks like UI
      if (/import.*react|import.*vue|import.*svelte/i.test(file.content) || /\.(tsx|jsx|vue|svelte)$/.test(file.path)) {
        const compNodeId = `component:${file.path}`;
        const existing = csg.nodes.get(compNodeId);
        if (existing) {
          existing.meta.isUIComponent = true;
          (existing.meta as any).hasLocalState = /useState|useReducer|useLocalStorageState/.test(file.content);
          (existing.meta as any).hasFetch = /fetch\s*\(|useQuery|useSWR|useAxios|axios\./.test(file.content);
          (existing.meta as any).hasForm = /handleSubmit|form\s|onSubmit/.test(file.content);
        }
      }
    }
  }

  return csg;
}

export function buildCSGAndDetectMockups(
  files: Array<{ path: string; content: string }>,
): { csg: CSG; mockupFindings: MockupFinding[] } {
  const csg = buildRealityGraph(files);
  const regexFindings = findMockupRegex(files);

  // For each mockup regex finding, check if the file/component has any path to a real DB sink
  const uiComponentNodes = [...csg.nodes.values()].filter(
    n => n.type === "component" && n.meta.isUIComponent,
  );
  const dbQueryNodes = [...csg.nodes.values()].filter(n => n.type === "dbquery");

  for (const finding of regexFindings) {
    const compNode = uiComponentNodes.find(n => n.filePath === finding.filePath);
    if (!compNode) continue;

    const reachable = bfsForward(csg, [compNode.id], ["calls", "handles", "queries", "data_flow", "renders"], 12);
    const reachesDB = dbQueryNodes.some(db => reachable.has(db.id));

    if (!reachesDB) {
      finding.description += " No path to a real database query was found in the CSG — this component is disconnected from any persistence layer.";
      finding.confidence = Math.max(finding.confidence, 88);
    } else {
      finding.description += " A database connection was found via graph analysis, suggesting partial connectivity.";
      finding.severity = "medium";
      finding.confidence = 75;
    }
  }

  return { csg, mockupFindings: regexFindings };
}

export function analyzeFeatureTruths(
  csg: CSG,
  files: Array<{ path: string; content: string }>,
): FeatureTruth[] {
  const truths: FeatureTruth[] = [];
  const uiComponents = [...csg.nodes.values()].filter(
    n => n.type === "component" && n.meta.isUIComponent,
  );

  const dbQueryNodes = [...csg.nodes.values()].filter(n => n.type === "dbquery");
  const routeNodes = [...csg.nodes.values()].filter(n => n.type === "route");
  const apiCallNodes = [...csg.nodes.values()].filter(n => n.type === "apicall");

  for (const comp of uiComponents) {
    const compId = comp.id;
    const reachable = bfsForward(csg, [compId], ["calls", "handles", "queries", "renders", "data_flow"], 10);
    const reachesDB = dbQueryNodes.some(db => reachable.has(db.id));
    const reachesRoute = routeNodes.some(r => reachable.has(r.id));
    const reachesAPI = apiCallNodes.some(a => reachable.has(a.id));

    let status: FeatureTruth["status"] = "unverified";
    let description = "";
    let confidence = 40;

    if (reachesDB && reachesRoute) {
      status = "verified_live";
      description = `Component reaches a backend route and a database query via ${reachable.size} graph edges.`;
      confidence = 92;
    } else if (reachesRoute && !reachesDB) {
      status = "partially_connected";
      description = "Component triggers a backend route, but no database write was found downstream.";
      confidence = 72;
    } else if (reachesAPI && !reachesRoute) {
      status = "partially_connected";
      description = "Component calls an external API but no local backend route handles the request.";
      confidence = 65;
    } else if (!reachesRoute && !reachesAPI && reachesDB) {
      status = "mocked";
      description = "Component can reach a DB query, but no event handler or API route connects the UI to it.";
      confidence = 60;
    } else {
      status = "mocked";
      description = "No path from this component to any backend handler or database query was found.";
      confidence = 78;
    }

    const meta = comp.meta as any;
    if (meta.hasLocalState && !meta.hasFetch) {
      status = "mocked";
      description = "Component manages local React state only — no fetch/Axios call found.";
      confidence = 85;
    }

    truths.push({
      id: `truth-${truths.length + 1}`,
      featureName: comp.label,
      uiEntryPoint: comp.filePath,
      persistenceVerified: reachesDB && reachesRoute,
      status,
      description,
      filePath: comp.filePath,
      confidence,
    });
  }

  return truths;
}

export function analyzeDeploymentFromCSG(csg: CSG, files: Array<{ path: string; content: string }>): DeploymentCheck[] {
  const checks: DeploymentCheck[] = [];
  const allContent = files.map(f => f.content).join("\n");

  const hasBuildConfig = files.some(f => /vite\.config|next\.config|webpack\.config|Dockerfile|vercel\.json|netlify\.toml/.test(f.path));
  const hasEnvFiles = files.some(f => /\.env/.test(f.path));
  const hasCSP = /Content-Security-Policy|CSP/.test(allContent);
  const hasHTTPS = /https|secure|TLS/.test(allContent);
  const hasCORS = /cors|Access-Control-Allow-Origin/.test(allContent);
  const hasRateLimit = /rate|throttle|limiter/.test(allContent);
  const hasLogging = /logger|pino|winston|console\.(log|error|warn)/.test(allContent);
  const hasHealthCheck = /health|ping|alive/.test(allContent) && /route|router|app\.(get|use)/.test(allContent);
  const hasErrorBoundary = /ErrorBoundary|error\.tsx|404|Not Found/.test(allContent);
  const hasMigrations = /migration|migrate|schema\.sql/.test(allContent);
  const hasSourceMaps = /source.?map|devtool/.test(allContent);
  const hasDebugMode = /process\.env\.NODE_ENV.*production|DEBUG|development/.test(allContent);
  const hasRollback = /rollback|revert|previous.?version/.test(allContent);

  checks.push(
    { id: "deploy-cs-1", category: "build", check: "Production build configuration", passed: hasBuildConfig, severity: "critical", detail: hasBuildConfig ? "Build config detected" : "No production build config found.", fixPrompt: "Add Dockerfile or platform-specific build config." },
    { id: "deploy-cs-2", category: "env", check: "Environment variable management", passed: hasEnvFiles, severity: "high", detail: hasEnvFiles ? ".env files found" : "No .env files or env schema detected.", fixPrompt: "Add .env.example with all required variables." },
    { id: "deploy-cs-3", category: "security", check: "Security headers (CSP + HTTPS)", passed: hasCSP && hasHTTPS, severity: "high", detail: hasCSP ? "CSP present" : "No Content-Security-Policy detected.", fixPrompt: "Add helmet/CSP middleware and enable HTTPS in production." },
    { id: "deploy-cs-4", category: "config", check: "CORS allowlist", passed: hasCORS, severity: "high", detail: hasCORS ? "CORS configured" : "No CORS headers detected.", fixPrompt: "Configure CORS allowlist for production origins." },
    { id: "deploy-cs-5", category: "config", check: "Error boundary / 404 page", passed: hasErrorBoundary, severity: "medium", detail: hasErrorBoundary ? "Error handling found" : "No error boundary or 404 page.", fixPrompt: "Add ErrorBoundary.tsx and a NotFound route." },
    { id: "deploy-cs-6", category: "observability", check: "Logging configured", passed: hasLogging, severity: "medium", detail: hasLogging ? "Logging detected" : "No logging configured.", fixPrompt: "Add pino/winston logger." },
    { id: "deploy-cs-7", category: "security", check: "Rate limiting", passed: hasRateLimit, severity: "high", detail: hasRateLimit ? "Rate limiter found" : "No rate limiting detected.", fixPrompt: "Add express-rate-limit or platform rate limits." },
    { id: "deploy-cs-8", category: "rollback", check: "Database migrations ready", passed: hasMigrations, severity: "medium", detail: hasMigrations ? "Migrations found" : "No migration system detected.", fixPrompt: "Add Drizzle/Knex/Prisma migrations." },
    { id: "deploy-cs-9", category: "observability", check: "Health check endpoint", passed: hasHealthCheck, severity: "medium", detail: hasHealthCheck ? "Health endpoint found" : "No health check endpoint.", fixPrompt: "Add GET /health returning 200." },
    { id: "deploy-cs-10", category: "security", check: "Source maps / debug mode disabled for production", passed: !hasSourceMaps && !hasDebugMode, severity: "medium", detail: (!hasSourceMaps && !hasDebugMode) ? "Clean production build" : "Source maps or debug mode detected in production code.", fixPrompt: "Disable source maps and DEBUG mode in production builds." },
  );

  return checks;
}

function scanCleanupCandidates(
  files: Array<{ path: string; content: string }>,
  packageJson?: Record<string, unknown>,
): { candidates: CleanupCandidate[]; specialCharFiles: string[] } {
  const candidates: CleanupCandidate[] = [];
  const specialCharFiles: string[] = [];

  const pathSet = new Set(files.map(f => f.path));
  const sourceExts = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".mjs", ".cjs"]);
  const docExts = new Set([".md", ".mdx", ".txt"]);

  for (const file of files) {
    const ext = file.path.slice(file.path.lastIndexOf(".")).toLowerCase();

    // Detect special/hidden unicode characters in source files
    if (sourceExts.has(ext)) {
      const specialChars = file.content.match(/[\u2000-\u200F\u2028-\u202F\u2060-\u2069\uFEFF\u00AD\u200B-\u200D\u202A-\u202E]/g);
      if (specialChars && specialChars.length > 0) {
        specialCharFiles.push(file.path);
        const lineNum = file.content.split("\n").findIndex(l => /[\u2000-\u200F\u2028-\u202F\u2060-\u2069\uFEFF\u00AD\u200B-\u200D\u202A-\u202E]/.test(l)) + 1;
        candidates.push({
          id: `cleanup-sc-${candidates.length + 1}`,
          type: "temp-file",
          severity: "low",
          title: `Hidden unicode/special characters in ${file.path.split("/").pop()}`,
          description: `${specialChars.length} invisible unicode characters detected in ${file.path}. These can cause hard-to-debug rendering or parsing issues.`,
          filePath: file.path,
          confidence: 95,
          reason: [
            `${specialChars.length} zero-width / invisible unicode chars found`,
            "Characters include zero-width spaces, soft hyphens, or BOM markers",
            `First occurrence at line ${lineNum}`,
            "Can cause cryptic CI failures or text rendering bugs",
          ],
          suggestedAction: `Run 'sed -i 's/\\xe2\\x80\\x8b//g' ${file.path}' to remove zero-width spaces, or use a linter with unicode rules.`,
          estimatedCleanup: "1 file, 5-minute fix",
        });
      }
    }

    // Flag unnecessary .md files in src/ directories
    if (ext === ".md" && (file.path.includes("/src/") || file.path.includes("\\src\\"))) {
      const mdName = file.path.split("/").pop() ?? file.path;
      if (file.content.length < 500) {
        candidates.push({
          id: `cleanup-md-${candidates.length + 1}`,
          type: "stale-docs",
          severity: "low",
          title: `Stale/minimal .md file in src: ${mdName}`,
          description: `${mdName} (${file.content.length} chars) in source tree may be leftover scaffolding.`,
          filePath: file.path,
          confidence: 80,
          reason: [
            "Markdown file inside src/ directory",
            "Very short content (<500 chars)",
            "Likely a stale placeholder or generated README",
          ],
          suggestedAction: "Move to docs/ or delete if content is not referenced by any component.",
          estimatedCleanup: "1 file, 0 KB",
        });
      }
    }
  }

  // Detect duplicate file content by size + path pattern
  const seenSizes = new Map<number, string[]>();
  for (const file of files) {
    if (!sourceExts.has(file.path.slice(file.path.lastIndexOf(".")).toLowerCase())) continue;
    const hash = file.content.length;
    if (!seenSizes.has(hash)) seenSizes.set(hash, []);
    seenSizes.get(hash)!.push(file.path);
  }
  for (const [, paths] of seenSizes) {
    if (paths.length < 2) continue;
    for (let i = 0; i < Math.min(paths.length, 5); i++) {
      for (let j = i + 1; j < Math.min(paths.length, 5); j++) {
        const a = paths[i], b = paths[j];
        const nameA = a.split("/").pop() ?? "";
        const nameB = b.split("/").pop() ?? "";
        if (a === b) continue;
        candidates.push({
          id: `cleanup-dup-${candidates.length + 1}`,
          type: "duplicate",
          severity: "low",
          title: `Possible duplicate: ${nameA} ≈ ${nameB}`,
          description: `${a} and ${b} have identical byte sizes (${hash} bytes). They may be duplicates.`,
          filePath: a,
          confidence: 65,
          reason: [
            `Both files are ${hash} bytes`,
            "Same extension and similar path structure",
            "Check content manually before deleting",
          ],
          suggestedAction: `Diff: 'diff ${a} ${b}'. If identical, remove one and update imports.`,
          estimatedCleanup: "1 file, ~2-50 KB",
        });
      }
    }
  }

  // Detect unused npm packages
  if (packageJson) {
    const allImports = new Set<string>();
    const IMPORT_RE = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
    for (const file of files) {
      let m: RegExpExecArray | null;
      const re = new RegExp(IMPORT_RE.source, "g");
      while ((m = re.exec(file.content)) !== null) {
        const pkg = m[1];
        if (!pkg.startsWith(".") && !pkg.startsWith("/") && !pkg.startsWith("node:")) {
          allImports.add(pkg.startsWith("@") ? pkg.split("/").slice(0, 2).join("/") : pkg.split("/")[0]);
        }
      }
    }
    const deps = { ...(packageJson.dependencies as Record<string, string> ?? {}), ...(packageJson.devDependencies as Record<string, string> ?? {}) };
    const SKIP = new Set(["typescript", "esbuild", "vite", "drizzle-kit", "ts-node", "rimraf", "concurrently", "nodemon", "vercel", "prettier", "@types"]);
    for (const [dep] of Object.entries(deps)) {
      if (!allImports.has(dep) && ![...SKIP].some(s => dep.startsWith(s) || dep.includes(s))) {
        candidates.push({
          id: `cleanup-pkg-${candidates.length + 1}`,
          type: "unused-package",
          severity: "low",
          title: `Unused dependency: ${dep}`,
          description: `"${dep}" declared in package.json but not imported in any scanned file.`,
          filePath: "package.json",
          confidence: 70,
          reason: ["No import statement referencing this package", "Declared in package.json dependencies"],
          suggestedAction: `npm uninstall ${dep}`,
          estimatedCleanup: "1 package, ~50-500 KB",
        });
      }
    }
  }

  return { candidates, specialCharFiles };
}

export function runRealityCheckWithCSG(
  keyFiles: Array<{ path: string; content: string }>,
  packageJson?: Record<string, unknown>,
): ProductRealityReport {
  const { csg, mockupFindings } = buildCSGAndDetectMockups(keyFiles);
  const featureTruths = analyzeFeatureTruths(csg, keyFiles);
  const deploymentChecks = analyzeDeploymentFromCSG(csg, keyFiles);
  const { candidates: cleanupCandidates } = scanCleanupCandidates(keyFiles, packageJson);

  const verifiedLiveCount = featureTruths.filter(f => f.status === "verified_live").length;
  const partiallyConnectedCount = featureTruths.filter(f => f.status === "partially_connected").length;
  const mockedCount = featureTruths.filter(f => f.status === "mocked").length;
  const brokenCount = featureTruths.filter(f => f.status === "broken").length;
  const unverifiedCount = featureTruths.filter(f => f.status === "unverified").length;

  const deploymentBlockersCount = deploymentChecks.filter(c => !c.passed && c.severity === "critical").length;
  const deploymentHighCount = deploymentChecks.filter(c => !c.passed && c.severity === "high").length;

  const mockupPenalty = mockupFindings.length * 6;
  const featurePenalty = mockedCount * 8 + partiallyConnectedCount * 4 + brokenCount * 10;
  const cleanupPenalty = Math.min(cleanupCandidates.length * 1.5, 15);
  const deployPenalty = (deploymentBlockersCount * 12) + (deploymentHighCount * 4);
  const rawScore = 100 - mockupPenalty - featurePenalty - cleanupPenalty - deployPenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  const launchCompletenessScore = Math.max(0, Math.round(
    100 - (mockedCount * 12) - (partiallyConnectedCount * 6) - (brokenCount * 15) - (unverifiedCount * 2) - (deploymentBlockersCount * 10) - (cleanupCandidates.length * 1)
  ));

  const summary = score >= 85
    ? `Product reality verified — ${verifiedLiveCount} live features, ${mockedCount} mocked, ${cleanupCandidates.length} cleanup candidates, ${deploymentBlockersCount} deployment blockers.`
    : score >= 60
      ? `Product has real foundations — ${mockedCount} features are still mockups, ${cleanupCandidates.length} files to clean up, ${deploymentBlockersCount} blockers before launch.`
      : `Significant reality gap — ${mockedCount} features are mocked or broken, ${cleanupCandidates.length} cleanup items, ${deploymentBlockersCount} critical deployment blockers.`;

  logger.info(
    { score, verifiedLiveCount, mockedCount, cleanupCandidates: cleanupCandidates.length, deploymentBlockersCount, featureCount: featureTruths.length },
    "Reality Check (CSG-powered) complete",
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
