import type { SecurityFinding, SecurityFindingStats } from "./security-rules.js";
import type { ComplianceFinding } from "./compliance-rules.js";
import type { PerformanceFinding, PerformanceStats } from "./performance-rules.js";
import type { UxFinding, UxStats } from "./ux-rules.js";

export type CsgNodeType =
  | "variable"
  | "function"
  | "component"
  | "route"
  | "db_query"
  | "api_call"
  | "conditional"
  | "assignment"
  | "import"
  | "expression"
  | "literal"
  | "parameter"
  | "return"
  | "try_catch"
  | "middleware"
  | "sanitizer"
  | "source"
  | "sink";

export type CsgEdgeType =
  | "data_flow"
  | "control_flow"
  | "calls"
  | "renders"
  | "handles"
  | "queries"
  | "imports"
  | "assigns"
  | "returns"
  | "contains"
  | "catches"
  | "sanitizes"
  | "reads"
  | "writes";

export interface CsgNode {
  id: string;
  type: CsgNodeType;
  name: string;
  file: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  code: string;
  meta: Record<string, unknown>;
}

export interface CsgEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: CsgEdgeType;
  confidence: number;
  meta: Record<string, unknown>;
}

export interface CsgAdjacency {
  out: CsgEdge[];
  in: CsgEdge[];
}

export interface CombinedSemanticGraph {
  nodes: Map<string, CsgNode>;
  edges: Map<string, CsgEdge>;
  adjacency: Map<string, CsgAdjacency>;
  entryPoints: string[];
  metadata: {
    filesParsed: number;
    totalLines: number;
    language: string;
    framework: string;
  };
}

export interface TaintPath {
  nodes: CsgNode[];
  edges: CsgEdge[];
  confidence: number;
  flowType: "explicit" | "implicit";
}

export interface VibeTaintFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  file: string;
  line: number;
  column: number;
  source: {
    file: string;
    line: number;
    column: number;
    code: string;
    name: string;
  };
  sink: {
    file: string;
    line: number;
    column: number;
    code: string;
    name: string;
  };
  path: TaintPath;
  sanitized: boolean;
  confidence: number;
  framework: string;
  ruleId: string;
}

export interface ScanResult {
  summary: {
    totalFindings: number;
    high: number;
    medium: number;
    low: number;
    critical: number;
    info: number;
    totalFiles: number;
    totalLines: number;
    scanDurationMs: number;
  };
  findings: VibeTaintFinding[];
  csgStats: {
    nodeCount: number;
    edgeCount: number;
    entryPoints: number;
    filesParsed: number;
  };
  taintStats?: {
    explicitPathsTraced: number;
    implicitPathsTraced: number;
    sanitizersApplied: number;
    totalTaintPaths: number;
    durationMs: number;
  };
  timeAwareStats?: {
    packagesScanned: number;
    vulnerablePackages: number;
    abandonedPackages: number;
    durationMs: number;
  };
  securityFindings?: SecurityFinding[];
  securityStats?: SecurityFindingStats;
  complianceFindings?: ComplianceFinding[];
  complianceStats?: {
    totalFrameworks: number;
    totalRules: number;
    totalFindings: number;
    byFramework: Record<string, { count: number; severity: string; maxPenalty: number }>;
    bySeverity: { critical: number; high: number; medium: number; low: number };
    penaltyEstimateEur: { totalMaxEur: number; byFramework: Record<string, number> };
    durationMs: number;
  };
  performanceFindings?: PerformanceFinding[];
  performanceStats?: PerformanceStats;
  uxFindings?: UxFinding[];
  uxStats?: UxStats;
  errors?: string[];
}
