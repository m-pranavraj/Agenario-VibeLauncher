import type { Node, File as BabelFile } from '@babel/types';

/* ─── Parse Result ─── */
export interface ParseResult {
  ast: BabelFile;
  astNodes: Map<NodeId, CSGASTNode>;
  file: string;
  language: 'js' | 'ts' | 'jsx' | 'tsx';
}

/* ─── Graph Node & Edge Identifiers ─── */
export type NodeId = string;
export type EdgeId = string;

/* ─── Source Location ─── */
export interface SourceLocation {
  file: string;
  start: { line: number; col: number };
  end: { line: number; col: number };
}

/* ─── AST Node Wrapper ─── */
export interface CSGASTNode {
  id: NodeId;
  type: string;
  loc: SourceLocation;
  raw: Node | null;
  parentId: NodeId | null;
  children: NodeId[];
}

/* ─── Control Flow Graph ─── */
export type CFGBlockType =
  | 'entry'
  | 'exit'
  | 'basic'
  | 'branch'
  | 'merge'
  | 'loop-header'
  | 'loop-back'
  | 'try'
  | 'catch'
  | 'finally'
  | 'throw'
  | 'switch-case';

export interface CFGBlock {
  id: NodeId;
  type: CFGBlockType;
  label: string;
  astNodes: NodeId[];
  loc: SourceLocation | null;
  predecessors: NodeId[];
  successors: NodeId[];
  /** For branch blocks: condition expression */
  condition: string | null;
  /** True/False or Case-label targets */
  branchTargets: Map<string, NodeId>;
}

/* ─── Module Dependency Edge ─── */
export type ExportType =
  | 'named'
  | 'default'
  | 'all'
  | 'named-reexport'
  | 'default-reexport';

export type ImportType = 'named' | 'default' | 'all' | 'dynamic' | 'side-effect';

export interface ModuleSpec {
  localName: string;
  exportedName: string | null;
  loc: SourceLocation;
}

export interface ImportEdge {
  id: EdgeId;
  type: ImportType;
  source: string;         // module file path
  target: string;         // imported from path
  specifiers: ModuleSpec[];
  isDynamic: boolean;
  loc: SourceLocation;
}

export interface ExportEdge {
  id: EdgeId;
  type: ExportType;
  source: string;
  specifiers: ModuleSpec[];
  loc: SourceLocation;
}

/* ─── Route Map ─── */
export type HTTPMethod =
  | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  | 'OPTIONS' | 'HEAD' | 'ALL' | 'USE';

export type RouterFramework = 'express' | 'fastify' | 'koa' | 'nextjs-app' | 'nextjs-pages' | 'hono' | 'unknown';

export interface RouteParam {
  name: string;
  pattern: string;      // e.g. ":id", "{id}", "[id]", "[...slug]"
  position: 'path' | 'query' | 'body';
  type: string | null;  // inferred type if available
}

export interface RouteEndpoint {
  id: EdgeId;
  method: HTTPMethod;
  path: string;
  fullPath: string;     // resolved full route
  params: RouteParam[];
  handler: NodeId | null;  // AST node of handler function
  handlerName: string | null;
  middleware: NodeId[];
  framework: RouterFramework;
  loc: SourceLocation;
  file: string;
  line: number;
}

/* ─── Call Graph ─── */
export type CallKind = 'direct' | 'method' | 'constructor' | 'dynamic' | 'callback' | 'promise-then';

export interface CallSite {
  id: EdgeId;
  kind: CallKind;
  caller: NodeId;       // function node that contains the call
  callee: NodeId;       // function node being called (resolved)
  calleeName: string | null;
  arguments: NodeId[];
  loc: SourceLocation;
  isAsync: boolean;
  isTailCall: boolean;
}

export interface FunctionScope {
  id: NodeId;
  name: string | null;
  type: 'function' | 'arrow' | 'method' | 'class' | 'async' | 'generator' | 'getter' | 'setter';
  params: string[];
  body: NodeId;
  loc: SourceLocation;
  parentScope: NodeId | null;   // lexical parent
  childScopes: NodeId[];
  captures: string[];           // closed-over variables
  calls: CallSite[];
  isExported: boolean;
  async: boolean;
  generator: boolean;
}

/* ─── Unified Graph ─── */
export interface CSGGraph {
  /** All AST nodes keyed by id */
  astNodes: Map<NodeId, CSGASTNode>;

  /** File-level metadata */
  files: Map<string, { size: number; hash: string; language: 'js' | 'ts' | 'jsx' | 'tsx' }>;

  /* ── Dimension 1: Control Flow Graph ── */
  cfg: {
    blocks: Map<NodeId, CFGBlock>;
    entryBlock: NodeId | null;
    exitBlock: NodeId | null;
    functionCFGs: Map<NodeId, { entry: NodeId; exit: NodeId; blocks: NodeId[] }>;
  };

  /* ── Dimension 2: Module Dependency Graph ── */
  moduleGraph: {
    imports: ImportEdge[];
    exports: ExportEdge[];
    dependencyMap: Map<string, string[]>;  // file -> [dependency files]
    entryPoints: string[];
    cycles: string[][];
  };

  /* ── Dimension 3: Route Map ── */
  routeMap: {
    endpoints: RouteEndpoint[];
    routerTree: Map<string, RouteEndpoint[]>;
    paramRegistry: Map<string, RouteParam[]>;
  };

  /* ── Dimension 4: Call Graph ── */
  callGraph: {
    functions: Map<NodeId, FunctionScope>;
    calls: CallSite[];
    entryPoints: NodeId[];
    unresolved: CallSite[];   // calls we couldn't resolve statically
    asyncChains: NodeId[][];
  };

  /** Cross-dimensional index: for every AST node, which dimensions reference it */
  dimensionIndex: Map<NodeId, Set<'cfg' | 'module' | 'route' | 'call'>>;

  /** Build errors / warnings */
  diagnostics: CSGDiagnostic[];
}

export type CSGSeverity = 'error' | 'warning' | 'info';

export interface CSGDiagnostic {
  severity: CSGSeverity;
  message: string;
  loc: SourceLocation | null;
  code: string;
}

/* ─── Options ─── */
export interface CSGOptions {
  /** Parse JSX */
  jsx?: boolean;
  /** Parse TypeScript */
  typescript?: boolean;
  /** Parse decorators (legacy) */
  decorators?: boolean;
  /** Enable stage 3 proposals */
  stage3?: boolean;
  /** Extra babel plugins */
  plugins?: string[];
  /** Include node_modules */
  includeNodeModules?: boolean;
  /** Follow dynamic imports */
  followDynamicImports?: boolean;
  /** Max AST depth */
  maxDepth?: number;
  /** Route detection patterns */
  routePatterns?: Array<{
    framework: RouterFramework;
    method: string;
    pathIndex: number;
    handlerIndex: number;
  }>;
  /** Export serialization format */
  exportFormat?: 'json' | 'dot' | 'mermaid';
}

/* ═══════════════════════════════════════════════
   Dimension 5-10: Extended Analysis Types
   ═══════════════════════════════════════════════ */

/* ─── 5. DeploySafe: Infrastructure Verifier ─── */
export type InfraFindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface InfraFinding {
  id: string;
  ruleId: string;
  severity: InfraFindingSeverity;
  message: string;
  file: string;
  line: number;
  column: number;
  remediation: string;
  category: 'docker' | 'cicd' | 'deployment' | 'env' | 'secret';
}

export interface DeploySafeReport {
  findings: InfraFinding[];
  filesScanned: string[];
  score: number;            // 0-100, higher is better
  dockerfileIssues: number;
  cicdIssues: number;
  secretExposures: number;
}

/* ─── 6. FailSafe: Topology Checker ─── */
export interface TryCatchBlock {
  id: NodeId;
  file: string;
  line: number;
  tryBlockLine: number;
  catchBlockLines: [number, number];
  hasEmptyCatch: boolean;
  hasLoggedError: boolean;
  hasRetry: boolean;
  hasTimeout: boolean;
  hasFinally: boolean;
  surroundingApiCall: string | null;
}

export interface ResiliencePattern {
  present: boolean;
  pattern: 'retry' | 'timeout' | 'circuit-breaker' | 'fallback' | 'bulkhead';
  location: SourceLocation | null;
  confidence: number;
}

export interface FailSafeReport {
  tryCatchBlocks: TryCatchBlock[];
  emptyCatchCount: number;
  missingLoggingCount: number;
  missingRetryCount: number;
  missingTimeoutCount: number;
  resiliencePatterns: ResiliencePattern[];
  score: number;            // 0-100
}

/* ─── 7. ObsCover: Observability Matrix ─── */
export interface TelemetryBoundary {
  nodeId: NodeId;
  file: string;
  line: number;
  codeBlock: string;
  blockType: 'api-endpoint' | 'db-query' | 'error-catch' | 'external-call';
  hasLogging: boolean;
  hasTracing: boolean;
  loggingMethod: string | null;
  tracingSpan: string | null;
  coverage: 'covered' | 'partial' | 'uncovered';
}

export interface ObsCoverReport {
  boundaries: TelemetryBoundary[];
  totalBlocks: number;
  coveredBlocks: number;
  partialBlocks: number;
  uncoveredBlocks: number;
  observabilityDebtScore: number;  // 0-100, higher = more debt
  coveragePct: number;
  recommendedActions: string[];
}

/* ─── 8. CogFlow: Cognitive Load Profiler ─── */
export interface CognitiveComplexityItem {
  functionName: string;
  file: string;
  line: number;
  complexity: number;
  breakdown: {
    nesting: number;
    logicalOps: number;
    recursion: number;
    jumps: number;
    catchBlocks: number;
    loops: number;
    conditionals: number;
  };
  category: 'low' | 'moderate' | 'high' | 'extreme';
}

export interface DOMTreeDepth {
  file: string;
  maxDepth: number;
  avgDepth: number;
  elements: number;
}

export interface CogFlowReport {
  functions: CognitiveComplexityItem[];
  domTrees: DOMTreeDepth[];
  maxComplexity: number;
  avgComplexity: number;
  totalHighComplexity: number;
  score: number;             // 0-100, lower = better
}

/* ─── 9. ArchScan: Architectural Smell Detection ─── */
export interface CircularDependency {
  cycle: string[];
  files: string[];
  length: number;
}

export interface ModuleMetrics {
  file: string;
  afferentCoupling: number;   // Ca: incoming dependencies
  efferentCoupling: number;   // Ce: outgoing dependencies
  instability: number;        // I = Ce / (Ca + Ce), 0=stable, 1=unstable
  abstractness: number;       // A (if applicable)
  distance: number;           // D = |A + I - 1|
}

export interface ArchScanReport {
  circularDependencies: CircularDependency[];
  moduleMetrics: ModuleMetrics[];
  hotSpots: ModuleMetrics[];   // modules with I > 0.7 or D > 0.5
  instabilityTrend: 'stable' | 'moderate' | 'unstable';
  score: number;               // 0-100, higher = better
}

/* ─── 10. Time-Aware Dependency Calculus ─── */
export interface PackageRegistryInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  lastPublishDate: string | null;
  daysSinceLastPublish: number;
  deprecated: boolean;
  deprecationMessage: string | null;
  openVulnerabilities: number;
  maintainers: number;
  weeklyDownloads: number;
  hasTypes: boolean;
  license: string | null;
}

export interface DependencyDecayReport {
  packages: PackageRegistryInfo[];
  totalDeps: number;
  deprecatedCount: number;
  staleCount: number;          // >365 days since last publish
  vulnerableCount: number;
  meanDecayDays: number;
  meanMaintainers: number;
  score: number;               // 0-100, higher = healthier
}

/* ─── 11. RealityCheck: Mockup & Hardcoded Detection ─── */
export type MockupDetectionMethod = 'ast-hardcoded-data' | 'regex-mock-pattern' | 'entropy-high-string' | 'import-mock-library' | 'comment-indicator' | 'stub-function' | 'placeholder-endpoint' | 'fake-auth-token';

export type MockupSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface RealityFinding {
  id: string;
  method: MockupDetectionMethod;
  severity: MockupSeverity;
  category: 'mock-data' | 'fake-endpoint' | 'stub-function' | 'test-fixture' | 'placeholder-ui' | 'dummy-auth' | 'hardcoded-env';
  file: string;
  line: number;
  column: number;
  snippet: string;
  pattern: string;
  fixPrompt: string;
  confidence: number;       // 0-1
  context: string;          // surrounding code context
}

export interface RealityCheckReport {
  findings: RealityFinding[];
  totalFilesScanned: number;
  mockDataCount: number;
  fakeEndpointCount: number;
  stubFunctionCount: number;
  dummyAuthCount: number;
  hardcodedEnvCount: number;
  score: number;            // 0-100, higher = more real (less mockup)
  productRealityNarrative: string;
  topRecommendations: string[];
}
