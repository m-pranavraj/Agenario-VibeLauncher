import { logger } from "../logger.js";
import { buildCSG, bfsForward, type CSG } from "../csg-builder.js";
import type { MockupFinding, FeatureTruth, CleanupCandidate, DeploymentCheck, ProductRealityReport } from "./index.js";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = typeof _traverse === 'function' ? _traverse : (_traverse as any).default;

// ─── Mechanism 1: Regex-Based Mock Detection (20 patterns) ────────────────
const MOCK_PATTERNS: Array<{ pattern: RegExp; category: MockupFinding["category"]; severity: MockupFinding["severity"]; title: string; fix: string; impact: string }> = [
  { pattern: /mockData|dummyData|fakeUsers|sampleOrders|testData|placeholderData|staticData|hardcodedData/gi, category: "mock-data", severity: "high", title: "Hardcoded mock data in production code", fix: "Replace hardcoded ${match} with a fetch() call to your real API endpoint.", impact: "Feature displays static/test data, not real user data." },
  { pattern: /(fakeSuccess|simulateApi|mockResponse|dummyResponse|fakeApi|mockApi)/gi, category: "fake-api", severity: "critical", title: "Simulated API response detected", fix: "Replace simulated API response with a real endpoint call. Remove the mock wrapper.", impact: "Feature appears functional but never reaches a real server." },
  { pattern: /setTimeout\s*\(\s*\(\s*\)\s*=>\s*\{[^}]{0,200}(setState|set\w+|data|result|success|res|response)/gis, category: "fake-api", severity: "critical", title: "setTimeout simulating async API call", fix: "Replace setTimeout mock with real async/await fetch() call. Add loading states and error handling.", impact: "API simulation creates false sense of connectivity." },
  { pattern: /toast\s*\(\s*['"`]Success|toast\.success|setToast.*success.*true|notify.*success/gi, category: "placeholder", severity: "high", title: "Fake success toast without backend call", fix: "Only show success toast after receiving a 2xx response from the actual API call.", impact: "Users see success messages even when backend fails." },
  { pattern: /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}|onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*undefined\s*\}/g, category: "placeholder", severity: "high", title: "Empty onClick handler", fix: "Remove empty onClick or wire it to an actual function that makes an API call or navigates.", impact: "Button/clickable element does nothing when clicked." },
  { pattern: /href\s*=\s*["']#["']/g, category: "placeholder", severity: "medium", title: "Placeholder href=\"#\" link", fix: "Replace href=\"#\" with actual route path (e.g., href=\"/dashboard\") or use a <button> with onClick.", impact: "Link does not navigate anywhere." },
  { pattern: /preventDefault\s*\(\s*\)[\s\S]{0,200}(?!fetch|axios|useMutation|await\s+fetch)/gis, category: "local-only", severity: "high", title: "Form with preventDefault but no persistence call", fix: "After preventDefault(), add an async function that calls your API with form data and handles the response.", impact: "Form appears to submit but data is never saved." },
  { pattern: /const\s+\w*\s*=\s*\[[\s\S]{30,300}\];\s*$/gm, category: "mock-data", severity: "medium", title: "Large hardcoded array (potential mock data)", fix: "Extract this data to a database or API endpoint. Fetch it dynamically.", impact: "Data is static and will not reflect real database state." },
  { pattern: /data\s*:\s*\{[\s\S]{30,}\}|dataset\s*:\s*\[[\s\S]{30,}\]/g, category: "mock-data", severity: "medium", title: "Hardcoded chart/metric data", fix: "Replace hardcoded chart data with data fetched from your analytics API or database.", impact: "Charts show static demo data, not real metrics." },
  { pattern: /\/\/\s*(TODO|FIXME|HACK|XXX|TEMP|temp|workaround)/gi, category: "placeholder", severity: "low", title: "Unresolved TODO/FIXME in code", fix: "Address the ${match.toLowerCase()} — it marks unfinished or known-broken code.", impact: "Known technical debt left unaddressed in codebase." },
  { pattern: /console\s*\.\s*(log|debug|info|warn|error)\s*\(/g, category: "placeholder", severity: "low", title: "console.log/debug statement in production code", fix: "Remove console.${match} or replace with structured logger calls (pino/winston).", impact: "Debug output may leak sensitive data to browser console." },
  { pattern: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g, category: "local-only", severity: "high", title: "Empty catch block silently swallowing errors", fix: "At minimum log the error. Add proper error handling: show user feedback, retry logic, or fallback UI.", impact: "Errors are invisible — bugs go undetected until production." },
  { pattern: /Math\.random\s*\(\s*\)\s*[\s\S]{0,50}(id|key|token|ref|order)/gi, category: "fake-api", severity: "critical", title: "Math.random() used to generate identifiers", fix: "Use crypto.randomUUID(), database auto-increment, or UUID library instead of Math.random().", impact: "Non-unique/non-secure IDs — collisions and security issues." },
  { pattern: /(\/\/\s*├|<\/?mock|<\/?stub|<!--\s*mock)/gi, category: "placeholder", severity: "low", title: "Commented-out mock/stub code", fix: "Remove dead commented code. If the feature is needed, implement it properly.", impact: "Dead code increases maintenance burden." },
  { pattern: /import\s+\{\s*\w*\s*\}\s+from\s+['"]\.\/mock|import\s+\w*\s+from\s+['"]\.\/mock/gi, category: "mock-data", severity: "high", title: "Import from mock/fixture data file", fix: "Replace mock data import with real API call or database query.", impact: "Feature uses fake data file instead of real backend." },
  { pattern: /(await|\.then\s*\(\s*)\s*(new Promise\s*\(\s*resolve\s*=>\s*setTimeout|Promise\.resolve\s*\(\s*\{)/gis, category: "fake-api", severity: "critical", title: "Promise-based setTimeout simulating async behavior", fix: "Replace fake Promise+setTimeout with actual async API call using fetch/axios.", impact: "Creates illusion of backend connectivity." },
  { pattern: /\.env\s*\.\s*NODE_ENV\s*!==\s*['"]production['"]\s*&&\s*\{[\s\S]{0,100}(mock|fake|dummy)/gi, category: "placeholder", severity: "medium", title: "Dev-only mock enabled via environment flag", fix: "Use a proper API mocking library (MSW) or remove dev-only conditionals before production.", impact: "Mock code may accidentally ship to production." },
  { pattern: /const\s+\w*\s*=\s*(users|orders|products|posts|todos|items|data|list)\s*:\s*\[/gi, category: "mock-data", severity: "high", title: "Static array used as data source", fix: "Move this data to a database table or API endpoint. Fetch with useQuery/SWR.", impact: "Data is hardcoded and will not persist across sessions." },
  { pattern: /render\s*\(\s*\)\s*\{[\s\S]{0,500}return\s+null\s*;/g, category: "placeholder", severity: "medium", title: "Component renders nothing (returns null)", fix: "Implement the render method with actual UI, or remove the component if unused.", impact: "Dead component adding bundle size with no visible output." },
  { pattern: /(\/\*[\s\S]{100,5000}\*\/)/g, category: "placeholder", severity: "low", title: "Large commented-out code block", fix: "Remove the commented block entirely. Use version control for history.", impact: "Dead code obscures real logic and increases file size." },
];

function findMockupRegex(files: Array<{ path: string; content: string }>): MockupFinding[] {
  const findings: MockupFinding[] = [];
  for (const file of files) {
    if (file.path.includes("node_modules")) continue;
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      for (const rule of MOCK_PATTERNS) {
        rule.pattern.lastIndex = 0;
        const match = line.match(rule.pattern);
        if (!match) continue;
        findings.push({
          id: `mock-${findings.length + 1}`,
          category: rule.category,
          severity: rule.severity,
          title: rule.title,
          description: `[${rule.category.toUpperCase()}] ${rule.title} in ${file.path}:${lineNum}`,
          filePath: file.path,
          lineNumber: lineNum,
          evidence: match[0].slice(0, 120),
          codeSnippet: line.trim().slice(0, 150),
          fixPrompt: rule.fix.replace("${match}", match[0].slice(0, 30)),
          confidence: rule.severity === "critical" ? 95 : rule.severity === "high" ? 85 : 75,
          impact: rule.impact,
        });
        break;
      }
    }
  }
  return findings;
}

// ─── Mechanism 2: AST-Level Mock Detection via Babel ──────────────────────
function findMockupAST(files: Array<{ path: string; content: string }>): MockupFinding[] {
  const findings: MockupFinding[] = [];
  for (const file of files) {
    if (!/\.(tsx|jsx|ts|js)$/.test(file.path) || file.path.includes("node_modules")) continue;
    try {
      const ast = parse(file.content, { sourceType: "module", plugins: ["jsx", "typescript", "decorators"] });
      traverse(ast, {
        JSXAttribute(path: any) {
          // Detect onClick={() => {}} (empty arrow function handler)
          if (path.node.name?.name === "onClick" && path.node.value?.expression?.type === "ArrowFunctionExpression") {
            const body = path.node.value.expression.body;
            if (body.type === "BlockStatement" && body.body.length === 0) {
              findings.push({
                id: `mock-ast-emptyhandler-${findings.length + 1}`,
                category: "placeholder",
                severity: "high",
                title: "Empty onClick handler (AST detected)",
                description: `Button/clickable in ${file.path} has an empty onClick handler.`,
                filePath: file.path,
                lineNumber: path.node.loc?.start?.line ?? 0,
                evidence: `onClick={() => {}}`,
                codeSnippet: file.content.split("\n").slice(Math.max(0, (path.node.loc?.start?.line ?? 1) - 1), (path.node.loc?.start?.line ?? 1) + 2).join("\n").slice(0, 200),
                fixPrompt: "Wire onClick to a function that makes an API call or navigates to a route.",
                confidence: 98,
                impact: "Button does nothing when clicked — blocks user flow.",
              });
            }
          }
          // Detect href="#" with no onClick
          if (path.node.name?.name === "href" && path.node.value?.value === "#") {
            const hasOnClick = path.parentPath?.node?.attributes?.some((a: any) => a.name?.name === "onClick");
            if (!hasOnClick) {
              findings.push({
                id: `mock-ast-href-${findings.length + 1}`,
                category: "placeholder",
                severity: "medium",
                title: "Link with href=\"#\" (AST detected)",
                description: `Anchor/link in ${file.path} uses href="#" with no onClick handler.`,
                filePath: file.path,
                lineNumber: path.node.loc?.start?.line ?? 0,
                evidence: `href="#"`,
                codeSnippet: file.content.split("\n").slice(Math.max(0, (path.node.loc?.start?.line ?? 1) - 1), (path.node.loc?.start?.line ?? 1) + 2).join("\n").slice(0, 200),
                fixPrompt: "Replace href=\"#\" with the actual route path or add an onClick handler.",
                confidence: 95,
                impact: "Link does not navigate anywhere.",
              });
            }
          }
        },
        CallExpression(path: any) {
          // Detect preventDefault() in form handler without fetch in same function
          if (path.node.callee?.property?.name === "preventDefault") {
            const parentFn = path.getFunctionParent();
            if (parentFn) {
              const fnBody = parentFn.toString();
              const hasAsync = fnBody.includes("async") || path.node.type === "AwaitExpression";
              const hasFetch = fnBody.includes("fetch(") || fnBody.includes("axios.") || fnBody.includes("useMutation") || fnBody.includes("await ");
              if (!hasFetch) {
                findings.push({
                  id: `mock-ast-form-${findings.length + 1}`,
                  category: "local-only",
                  severity: "high",
                  title: "Form preventDefault without persistence (AST detected)",
                  description: `Form handler in ${file.path} calls preventDefault() but no fetch/axios call found in the same function.`,
                  filePath: file.path,
                  lineNumber: path.node.loc?.start?.line ?? 0,
                  evidence: `preventDefault() without fetch/axios`,
                  codeSnippet: file.content.split("\n").slice(Math.max(0, (path.node.loc?.start?.line ?? 1) - 2), (path.node.loc?.start?.line ?? 1) + 5).join("\n").slice(0, 250),
                  fixPrompt: "After preventDefault(), add an async function that calls your API endpoint with form data and handles the response.",
                  confidence: 92,
                  impact: "Form appears to submit but data is never persisted.",
                });
              }
            }
          }
          // Detect setTimeout(() => { setState(...) }) simulating API
          if (path.node.callee?.name === "setTimeout" && path.node.arguments.length >= 1) {
            const cb = path.node.arguments[0];
            if (cb.type === "ArrowFunctionExpression" || cb.type === "FunctionExpression") {
              const cbStr = file.content.slice(cb.start!, cb.end!);
              if (/set\w+|dispatch|data|result|success/i.test(cbStr) && !/fetch|axios|await/.test(cbStr)) {
                findings.push({
                  id: `mock-ast-timeout-${findings.length + 1}`,
                  category: "fake-api",
                  severity: "critical",
                  title: "setTimeout simulating API call (AST detected)",
                  description: `Code in ${file.path} uses setTimeout to simulate an async response without actually calling an API.`,
                  filePath: file.path,
                  lineNumber: path.node.loc?.start?.line ?? 0,
                  evidence: cbStr.slice(0, 150),
                  codeSnippet: file.content.split("\n").slice(Math.max(0, (path.node.loc?.start?.line ?? 1) - 1), (path.node.loc?.start?.line ?? 1) + 3).join("\n").slice(0, 300),
                  fixPrompt: "Replace setTimeout + setState with real async/await fetch(). Add loading/error states.",
                  confidence: 96,
                  impact: "Creates illusion of backend connectivity — no real data is fetched.",
                });
              }
            }
          }
        },
        VariableDeclarator(path: any) {
          // Detect const data = [...] or const data = {...} large static arrays/objects
          if (path.node.init && (path.node.init.type === "ArrayExpression" || path.node.init.type === "ObjectExpression")) {
            const elements = path.node.init.type === "ArrayExpression" ? path.node.init.elements : [path.node.init];
            if (elements.length >= 5) {
              const fnScope = path.scope.getFunctionParent();
              const isInComponent = !fnScope || /Component|Page|View|Screen|Layout/.test(fnScope.block?.id?.name ?? "");
              const isMockName = /(users|orders|data|items|list|sample|mock|fixture|dummy|placeholder)/i.test(path.node.id?.name ?? "");
              if (isInComponent || isMockName) {
                findings.push({
                  id: `mock-ast-static-${findings.length + 1}`,
                  category: "mock-data",
                  severity: "high",
                  title: "Large static array/object in component (AST detected)",
                  description: `Component in ${file.path} has a static ${path.node.init.type === "ArrayExpression" ? "array" : "object"} with ${elements.length} elements. This data should come from an API.`,
                  filePath: file.path,
                  lineNumber: path.node.loc?.start?.line ?? 0,
                  evidence: `${path.node.id?.name ?? "data"} = ${path.node.init.type}(${elements.length} items)`,
                  codeSnippet: file.content.split("\n").slice(Math.max(0, (path.node.loc?.start?.line ?? 1) - 1), Math.min((path.node.loc?.end?.line ?? path.node.loc?.start?.line ?? 1) + 1, (path.node.loc?.start?.line ?? 1) + 4)).join("\n").slice(0, 300),
                  fixPrompt: `Create an API endpoint for "${path.node.id?.name ?? "this data"}" and fetch it with useQuery/SWR.`,
                  confidence: 88,
                  impact: "Data is static and will not reflect real database state.",
                });
              }
            }
          }
        },
      });
    } catch {
      // Skip unparseable files — AST detection is best-effort
    }
  }
  return findings;
}

// ─── Mechanism 3: File-System & Import Graph Analysis ─────────────────────
function findOrphanedFiles(files: Array<{ path: string; content: string }>): MockupFinding[] {
  const findings: MockupFinding[] = [];
  const allImports = new Set<string>();
  const fileNames = new Set<string>();
  const IMPORT_RE = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
  const relImportToPath = new Map<string, string>();

  for (const file of files) {
    const name = file.path.split("/").pop()?.replace(/\.(tsx|ts|jsx|js)$/, "") ?? "";
    fileNames.add(name);
    relImportToPath.set(name, file.path);
    let m: RegExpExecArray | null;
    const re = new RegExp(IMPORT_RE.source, "g");
    while ((m = re.exec(file.content)) !== null) {
      const imp = m[1];
      if (imp.startsWith(".") || imp.startsWith("/")) {
        const resolved = imp.split("/").pop()?.replace(/\.(tsx|ts|jsx|js)$/, "") ?? "";
        allImports.add(resolved);
      } else if (!imp.startsWith("node:")) {
        allImports.add(imp.startsWith("@") ? imp.split("/").slice(0, 2).join("/") : imp.split("/")[0]);
      }
    }
  }

  // Find source files not imported anywhere
  for (const file of files) {
    if (file.path.includes("node_modules") || file.path.includes(".generated")) continue;
    const isSource = /src\/(components|pages|app|lib|hooks|contexts|utils)/.test(file.path);
    if (!isSource) continue;
    const name = file.path.split("/").pop()?.replace(/\.(tsx|ts|jsx|js)$/, "") ?? "";
    if (name === "index" || name.startsWith("_")) continue;
    if (!allImports.has(name)) {
      const isEntryPoint = file.path.includes("main.tsx") || file.path.includes("App.tsx") || file.path.includes("index.ts");
      if (!isEntryPoint) {
        findings.push({
          id: `mock-orphan-${findings.length + 1}`,
          category: "placeholder",
          severity: "low",
          title: `Unreferenced component/file: ${file.path.split("/").pop()}`,
          description: `File ${file.path} exists in source tree but is not imported by any other file.`,
          filePath: file.path,
          lineNumber: 0,
          evidence: "No import references found",
          codeSnippet: file.content.slice(0, 120),
          fixPrompt: "Verify this file is needed. If not, remove it. If it is, ensure it's exported and imported properly.",
          confidence: 70,
          impact: "Dead code increasing maintenance burden and bundle size.",
        });
      }
    }
  }

  // Detect routes defined in UI that don't exist in backend
  const uiRoutes = new Set<string>();
  const backendRoutes = new Set<string>();
  const ROUTE_RE = /\/(dashboard|settings|profile|users|orders|products|admin|login|register|api\/\w+)/g;
  for (const file of files) {
    const routes = file.content.match(ROUTE_RE);
    if (routes) {
      if (file.path.includes("route") || file.path.includes("api/") || file.path.includes("server")) {
        routes.forEach(r => backendRoutes.add(r));
      } else {
        routes.forEach(r => uiRoutes.add(r));
      }
    }
  }

  for (const route of uiRoutes) {
    if (!backendRoutes.has(route) && !route.startsWith("/api/")) {
      const refFile = files.find(f => f.content.includes(route) && !f.path.includes("node_modules") && !f.path.includes("route") && !f.path.includes("api/"));
      if (refFile) {
        findings.push({
          id: `mock-route-${findings.length + 1}`,
          category: "placeholder",
          severity: "high",
          title: `UI references nonexistent route: ${route}`,
          description: `Route "${route}" is referenced in ${refFile.path} but no matching backend route handler was found.`,
          filePath: refFile.path,
          lineNumber: 0,
          evidence: `UI references ${route} but no backend handler exists`,
          codeSnippet: route,
          fixPrompt: `Create a backend route handler for ${route} or update the UI to navigate to an existing route.`,
          confidence: 82,
          impact: "Navigation leads to 404 or broken page.",
        });
      }
    }
  }

  return findings;
}

// ─── Mechanism 4: Graph-Based Persistence Verification ────────────────────
function buildRealityGraph(files: Array<{ path: string; content: string }>): CSG {
  const csg = buildCSG(files);
  for (const file of files) {
    if (/\.(tsx|jsx|vue|svelte)$/.test(file.path) && !file.path.includes("node_modules")) {
      if (/import.*react|import.*vue|import.*svelte/i.test(file.content) || /\.(tsx|jsx|vue|svelte)$/.test(file.path)) {
        const compNodeId = `component:${file.path}`;
        const existing = csg.nodes.get(compNodeId);
        if (existing) {
          existing.meta.isUIComponent = true;
          const meta = existing.meta as any;
          meta.hasLocalState = /useState|useReducer|useLocalStorageState/.test(file.content);
          meta.hasFetch = /fetch\s*\(|useQuery|useSWR|useAxios|axios\./.test(file.content);
          meta.hasForm = /handleSubmit|form\s|onSubmit/.test(file.content);
          meta.isEmptyHandler = /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/.test(file.content);
          meta.hasSetTimeout = /setTimeout\s*\(/.test(file.content);
          meta.hasToast = /toast\.|notify|showToast/.test(file.content);
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
  const allFindings: MockupFinding[] = [];

  // Mechanism 1: Regex detection
  allFindings.push(...findMockupRegex(files));

  // Mechanism 2: AST detection (Babel-powered)
  allFindings.push(...findMockupAST(files));

  // Mechanism 3: File system / import graph
  allFindings.push(...findOrphanedFiles(files));

  // Deduplicate by filePath + lineNumber + title
  const seen = new Set<string>();
  const uniqueFindings: MockupFinding[] = [];
  for (const f of allFindings) {
    const key = `${f.filePath}:${f.lineNumber}:${f.title.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueFindings.push(f);
  }

  // Cross-reference with CSG graph to boost confidence
  const uiComponentNodes = [...csg.nodes.values()].filter(n => n.type === "component" && n.meta.isUIComponent);
  const dbQueryNodes = [...csg.nodes.values()].filter(n => n.type === "dbquery");

  for (const finding of uniqueFindings) {
    const compNode = uiComponentNodes.find(n => n.filePath === finding.filePath);
    if (!compNode) continue;
    const reachable = bfsForward(csg, [compNode.id], ["calls", "handles", "queries", "data_flow", "renders"], 12);
    const reachesDB = dbQueryNodes.some(db => reachable.has(db.id));
    if (!reachesDB) {
      finding.description += " [CSG: No database path found — disconnected from persistence]";
      finding.confidence = Math.max(finding.confidence, 88);
    }
  }

  return { csg, mockupFindings: uniqueFindings };
}

export function analyzeFeatureTruths(
  csg: CSG,
  files: Array<{ path: string; content: string }>,
): FeatureTruth[] {
  const truths: FeatureTruth[] = [];
  const uiComponents = [...csg.nodes.values()].filter(n => n.type === "component" && n.meta.isUIComponent);
  const dbQueryNodes = [...csg.nodes.values()].filter(n => n.type === "dbquery");
  const routeNodes = [...csg.nodes.values()].filter(n => n.type === "route");
  const apiCallNodes = [...csg.nodes.values()].filter(n => n.type === "apicall");

  for (const comp of uiComponents) {
    const reachable = bfsForward(csg, [comp.id], ["calls", "handles", "queries", "renders", "data_flow"], 10);
    const reachesDB = dbQueryNodes.some(db => reachable.has(db.id));
    const reachesRoute = routeNodes.some(r => reachable.has(r.id));
    const reachesAPI = apiCallNodes.some(a => reachable.has(a.id));

    let status: FeatureTruth["status"] = "unverified";
    let description = "";
    let confidence = 40;

    if (reachesDB && reachesRoute) { status = "verified_live"; description = `Component reaches backend route + database via ${reachable.size} graph edges.`; confidence = 92; }
    else if (reachesRoute && !reachesDB) { status = "partially_connected"; description = "Component triggers backend route but no database write downstream."; confidence = 72; }
    else if (reachesAPI && !reachesRoute) { status = "partially_connected"; description = "Component calls external API but no local backend route."; confidence = 65; }
    else { status = "mocked"; description = "No path from component to any backend handler or database query."; confidence = 78; }

    const meta = comp.meta as any;
    if (meta.hasLocalState && !meta.hasFetch) { status = "mocked"; description = "Component manages local React state only — no fetch/Axios call."; confidence = 85; }
    if (meta.isEmptyHandler) { status = "broken"; description = "Component has empty onClick handlers — UI elements do nothing."; confidence = 95; }
    if (meta.hasSetTimeout && !meta.hasFetch) { status = "mocked"; description = "Component uses setTimeout to simulate async behavior — no real API call."; confidence = 90; }

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

  checks.push(
    { id: "deploy-1", category: "build", check: "Production build configuration", passed: hasBuildConfig, severity: "critical", detail: hasBuildConfig ? "Build config detected" : "No production build config found.", fixPrompt: "Add Dockerfile or platform-specific build config." },
    { id: "deploy-2", category: "env", check: "Environment variable management", passed: hasEnvFiles, severity: "high", detail: hasEnvFiles ? ".env files found" : "No .env files or env schema detected.", fixPrompt: "Add .env.example with all required variables." },
    { id: "deploy-3", category: "security", check: "Security headers (CSP + HTTPS)", passed: hasCSP && hasHTTPS, severity: "high", detail: hasCSP ? "CSP present" : "No Content-Security-Policy detected.", fixPrompt: "Add helmet/CSP middleware and enable HTTPS." },
    { id: "deploy-4", category: "config", check: "CORS allowlist", passed: hasCORS, severity: "high", detail: hasCORS ? "CORS configured" : "No CORS headers detected.", fixPrompt: "Configure CORS allowlist for production origins." },
    { id: "deploy-5", category: "config", check: "Error boundary / 404 page", passed: hasErrorBoundary, severity: "medium", detail: hasErrorBoundary ? "Error handling found" : "No error boundary or 404 page.", fixPrompt: "Add ErrorBoundary.tsx and a NotFound route." },
    { id: "deploy-6", category: "observability", check: "Logging configured", passed: hasLogging, severity: "medium", detail: hasLogging ? "Logging detected" : "No logging configured.", fixPrompt: "Add pino/winston logger." },
    { id: "deploy-7", category: "security", check: "Rate limiting", passed: hasRateLimit, severity: "high", detail: hasRateLimit ? "Rate limiter found" : "No rate limiting detected.", fixPrompt: "Add express-rate-limit or platform rate limits." },
    { id: "deploy-8", category: "rollback", check: "Database migrations ready", passed: hasMigrations, severity: "medium", detail: hasMigrations ? "Migrations found" : "No migration system detected.", fixPrompt: "Add Drizzle/Knex/Prisma migrations." },
    { id: "deploy-9", category: "observability", check: "Health check endpoint", passed: hasHealthCheck, severity: "medium", detail: hasHealthCheck ? "Health endpoint found" : "No health check endpoint.", fixPrompt: "Add GET /health returning 200." },
    { id: "deploy-10", category: "security", check: "Source maps / debug mode disabled for production", passed: !hasSourceMaps && !hasDebugMode, severity: "medium", detail: (!hasSourceMaps && !hasDebugMode) ? "Clean production build" : "Source maps or debug mode detected.", fixPrompt: "Disable source maps and DEBUG mode in production builds." },
  );
  return checks;
}

function scanCleanupCandidates(
  files: Array<{ path: string; content: string }>,
  packageJson?: Record<string, unknown>,
): { candidates: CleanupCandidate[]; specialCharFiles: string[] } {
  const candidates: CleanupCandidate[] = [];
  const specialCharFiles: string[] = [];
  const sourceExts = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".mjs", ".cjs"]);

  for (const file of files) {
    const ext = file.path.slice(file.path.lastIndexOf(".")).toLowerCase();
    if (sourceExts.has(ext)) {
      const specialChars = file.content.match(/[\u2000-\u200F\u2028-\u202F\u2060-\u2069\uFEFF\u00AD\u200B-\u200D\u202A-\u202E]/g);
      if (specialChars && specialChars.length > 0) {
        specialCharFiles.push(file.path);
        const lineNum = file.content.split("\n").findIndex(l => /[\u2000-\u200F\u2028-\u202F\u2060-\u2069\uFEFF\u00AD\u200B-\u200D\u202A-\u202E]/.test(l)) + 1;
        candidates.push({
          id: `cleanup-sc-${candidates.length + 1}`, type: "temp-file", severity: "low",
          title: `Hidden unicode/special characters in ${file.path.split("/").pop()}`,
          description: `${specialChars.length} invisible unicode characters in ${file.path}. Can cause cryptic parsing bugs.`,
          filePath: file.path, confidence: 95,
          reason: [`${specialChars.length} zero-width/invisible unicode chars`, `First at line ${lineNum}`, "Causes cryptic CI/rendering failures"],
          suggestedAction: "Run a linter with unicode rules or use 'sed' to remove zero-width spaces.",
          estimatedCleanup: "1 file, 5-minute fix",
        });
      }
    }
    if (ext === ".md" && (file.path.includes("/src/") || file.path.includes("\\src\\"))) {
      if (file.content.length < 500) {
        candidates.push({
          id: `cleanup-md-${candidates.length + 1}`, type: "stale-docs", severity: "low",
          title: `Stale .md in src/: ${file.path.split("/").pop()}`,
          description: `${file.path.split("/").pop()} (${file.content.length} chars) in source tree.`,
          filePath: file.path, confidence: 80,
          reason: ["Markdown inside src/", "Very short content (<500 chars)", "Likely scaffolding placeholder"],
          suggestedAction: "Move to docs/ or delete if unused.",
          estimatedCleanup: "1 file, 0 KB",
        });
      }
    }
  }

  // Duplicate detection by size
  const seenSizes = new Map<number, string[]>();
  for (const file of files) {
    if (!sourceExts.has(file.path.slice(file.path.lastIndexOf(".")).toLowerCase())) continue;
    const sz = file.content.length;
    if (!seenSizes.has(sz)) seenSizes.set(sz, []);
    seenSizes.get(sz)!.push(file.path);
  }
  for (const [sizeBytes, paths] of seenSizes) {
    if (paths.length < 2) continue;
    for (let i = 0; i < Math.min(paths.length, 5); i++) {
      for (let j = i + 1; j < Math.min(paths.length, 5); j++) {
        const a = paths[i], b = paths[j];
        if (a === b) continue;
        candidates.push({
          id: `cleanup-dup-${candidates.length + 1}`, type: "duplicate", severity: "low",
          title: `Possible duplicate: ${a.split("/").pop()} ≈ ${b.split("/").pop()}`,
          description: `${a} and ${b} have identical size (${sizeBytes} bytes).`,
          filePath: a, confidence: 65,
          reason: [`Both files are ${sizeBytes} bytes`, "Same extension"],
          suggestedAction: `Diff: 'diff ${a} ${b}'. Remove one and update imports.`,
          estimatedCleanup: "1 file, ~2-50 KB",
        });
      }
    }
  }

  // Unused npm packages
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
    const SKIP = new Set(["typescript", "esbuild", "vite", "drizzle-kit", "ts-node", "rimraf", "concurrently", "nodemon", "vercel", "prettier"]);
    for (const [dep] of Object.entries(deps)) {
      if (!allImports.has(dep) && ![...SKIP].some(s => dep.startsWith(s) || dep.includes(s))) {
        candidates.push({
          id: `cleanup-pkg-${candidates.length + 1}`, type: "unused-package", severity: "low",
          title: `Unused dependency: ${dep}`,
          description: `"${dep}" in package.json but not imported in scanned files.`,
          filePath: "package.json", confidence: 70,
          reason: ["No import referencing this package", "Declared in package.json"],
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
    ? `Product reality verified: ${verifiedLiveCount} live features, ${mockedCount} mocked, ${cleanupCandidates.length} cleanup items, ${deploymentBlockersCount} deployment blockers.`
    : score >= 60
      ? `Product has real foundations but gaps remain: ${mockedCount} features mocked, ${mockupFindings.length} mock patterns, ${cleanupCandidates.length} files to clean, ${deploymentBlockersCount} blockers.`
      : `Significant reality gap: ${mockedCount} mocked/broken features, ${mockupFindings.length} mock patterns found, ${cleanupCandidates.length} cleanup candidates, ${deploymentBlockersCount} critical blockers.`;

  logger.info({ score, verifiedLiveCount, mockedCount, mockups: mockupFindings.length, cleanup: cleanupCandidates.length, deploy: deploymentBlockersCount }, "Reality Check complete");

  return {
    score, verifiedLiveCount, partiallyConnectedCount, mockedCount, brokenCount, unverifiedCount,
    cleanupCandidatesCount: cleanupCandidates.length, deploymentBlockersCount,
    mockupFindings, featureTruths, cleanupCandidates, deploymentChecks, summary, launchCompletenessScore,
  };
}