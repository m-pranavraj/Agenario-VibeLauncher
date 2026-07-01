import type { CSGGraph, ParseResult, NodeId, SourceLocation } from '../../../types.js';
import type { SharedAstIndex } from './ast-index.js';

export type RuleSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type RuleCategory =
  | 'security-injection'
  | 'security-crypto'
  | 'security-memory'
  | 'security-networking'
  | 'performance-algorithmic'
  | 'performance-memory'
  | 'performance-event-loop'
  | 'performance-rendering'
  | 'ux-accessibility'
  | 'ux-interaction'
  | 'ux-perceived-perf'
  | 'compliance-privacy'
  | 'compliance-framework'
  | 'compliance-retention';

export interface RuleMeta {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  cwe?: string;
  owasp?: string;
  techniqueNumber: number;
  pillar: 1 | 2 | 3 | 4;
  tags: string[];
}

export interface TaintSlice {
  variable: string;
  sources: string[];
  sinks: string[];
  sanitizers: string[];
  file: string;
  line: number;
  confidence: number;
  hopCount: number;
}

export interface RuleFinding {
  id: string;
  ruleId: string;
  severity: RuleSeverity;
  title: string;
  message: string;
  category: RuleCategory;
  file: string;
  line: number;
  column: number;
  snippet?: string;
  functionName?: string;
  routePath?: string;
  confidence: number;
  taintPath?: string[];
  remediation?: string;
  autoFixCode?: string;
  owaspMapping?: string;
  cweMapping?: string;
  evidence?: string;
  exploitPayload?: string;
}

export interface RuleContext {
  graph: CSGGraph;
  parsed: ParseResult[];
  findings: RuleFinding[];
  taintStore: Map<string, TaintSlice[]>;
  astIndex: SharedAstIndex;
  addFinding: (finding: RuleFinding) => void;
  getTaint: (varName: string) => TaintSlice[];
  setTaint: (varName: string, slices: TaintSlice[]) => void;
  propagateTaint: (fromVar: string, toVar: string) => void;
}

export interface Rule {
  meta: RuleMeta;
  initialize(ctx: RuleContext): Promise<void> | void;
  execute(ctx: RuleContext): Promise<void> | void;
}

export interface RuleEngineReport {
  findings: RuleFinding[];
  totalFindings: number;
  totalRules: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  taintPaths: Array<{
    variable: string;
    sliceCount: number;
    sources: string[];
    sinks: string[];
  }>;
}
