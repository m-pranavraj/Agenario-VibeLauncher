import type { CSGGraph, ParseResult } from '../../../types.js';
import type { Rule, RuleContext, RuleFinding, RuleMeta, RuleSeverity, RuleEngineReport, TaintSlice } from './types.js';
import { buildSharedAstIndex, type SharedAstIndex } from './ast-index.js';

export type RuleConstructor = new () => Rule;

export class RuleRegistry {
  private rules: Map<string, Rule> = new Map();
  private categories: Map<string, Set<string>> = new Map();

  register(rule: Rule): void {
    this.rules.set(rule.meta.id, rule);
    const cat = rule.meta.category;
    if (!this.categories.has(cat)) this.categories.set(cat, new Set());
    this.categories.get(cat)!.add(rule.meta.id);
  }

  get(id: string): Rule | undefined {
    return this.rules.get(id);
  }

  getByCategory(category: string): Rule[] {
    const ids = this.categories.get(category);
    if (!ids) return [];
    return [...ids].map(id => this.rules.get(id)!).filter(Boolean);
  }

  getAll(): Rule[] {
    return [...this.rules.values()];
  }

  count(): number {
    return this.rules.size;
  }
}

export class RuleEngine {
  private registry: RuleRegistry;
  private findings: RuleFinding[] = [];
  private taintStore: Map<string, TaintSlice[]> = new Map();

  constructor(registry?: RuleRegistry) {
    this.registry = registry || new RuleRegistry();
  }

  getRegistry(): RuleRegistry {
    return this.registry;
  }

  registerRule(rule: Rule): void {
    this.registry.register(rule);
  }

  async execute(
    parsed: ParseResult[],
    graph: CSGGraph,
    options?: { categories?: string[]; ruleIds?: string[] }
  ): Promise<RuleEngineReport> {
    this.findings = [];
    this.taintStore = new Map();

    let rulesToRun: Rule[];

    if (options?.ruleIds) {
      rulesToRun = options.ruleIds.map(id => this.registry.get(id)).filter(Boolean) as Rule[];
    } else if (options?.categories) {
      rulesToRun = options.categories.flatMap(c => this.registry.getByCategory(c));
    } else {
      rulesToRun = this.registry.getAll();
    }

    const uniqueRules = [...new Set(rulesToRun)];

    for (const rule of uniqueRules) {
      try {
        const ctx: RuleContext = {
          graph,
          parsed,
          findings: this.findings,
          taintStore: this.taintStore,
          astIndex: buildSharedAstIndex(parsed),
          addFinding: (finding: RuleFinding) => {
            this.findings.push(finding);
          },
          getTaint: (varName: string) => this.taintStore.get(varName) || [],
          setTaint: (varName: string, slices: TaintSlice[]) => {
            this.taintStore.set(varName, slices);
          },
          propagateTaint: (fromVar: string, toVar: string) => {
            const slices = this.taintStore.get(fromVar);
            if (slices) {
              const existing = this.taintStore.get(toVar) || [];
              this.taintStore.set(toVar, [...existing, ...slices]);
            }
          },
        };

        await rule.initialize(ctx);
        await rule.execute(ctx);
      } catch (err: any) {
        this.findings.push({
          id: `${rule.meta.id}-ERROR`,
          ruleId: rule.meta.id,
          severity: 'info',
          title: `Rule ${rule.meta.id} threw: ${err.message}`,
          message: err.stack || err.message,
          category: rule.meta.category,
          file: '',
          line: 0,
          column: 0,
          confidence: 0,
        });
      }
    }

    return this.report();
  }

  report(): RuleEngineReport {
    const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const byCategory: Record<string, number> = {};

    for (const f of this.findings) {
      bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    }

    return {
      findings: this.findings,
      totalFindings: this.findings.length,
      totalRules: this.registry.count(),
      bySeverity,
      byCategory,
      taintPaths: [...this.taintStore.entries()].map(([v, s]) => ({
        variable: v,
        sliceCount: s.length,
        sources: [...new Set(s.flatMap(sl => sl.sources))],
        sinks: [...new Set(s.flatMap(sl => sl.sinks))],
      })),
    };
  }

  getFindings(): RuleFinding[] {
    return this.findings;
  }

  reset(): void {
    this.findings = [];
    this.taintStore.clear();
  }
}
