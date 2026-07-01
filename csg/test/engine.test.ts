import { describe, it, expect, beforeEach } from 'vitest';
import * as babelParser from '@babel/parser';
import type { ParseResult, CSGGraph } from '../src/types.js';
import { RuleEngine, RuleRegistry } from '../src/analysis/rules/engine/rule-engine.js';
import { BaseRule } from '../src/analysis/rules/engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../src/analysis/rules/engine/types.js';
import { createRuleEngine } from '../src/analysis/rules/index.js';

function makeParseResult(code: string, file: string = 'test.ts'): ParseResult {
  const ast = babelParser.parse(code, { sourceType: 'unambiguous', plugins: ['jsx', 'typescript'] });
  return { ast: ast!, astNodes: new Map(), file, language: 'ts' };
}

function makeEmptyGraph(): CSGGraph {
  return {
    astNodes: new Map(),
    files: new Map(),
    cfg: { blocks: new Map(), entryBlock: null, exitBlock: null, functionCFGs: new Map() },
    moduleGraph: { imports: [], exports: [], dependencyMap: new Map(), entryPoints: [], cycles: [] },
    routeMap: { endpoints: [], routerTree: new Map(), paramRegistry: new Map() },
    callGraph: { functions: new Map(), calls: [], entryPoints: [], unresolved: [], asyncChains: [] },
    dimensionIndex: new Map(),
    diagnostics: [],
  } as unknown as CSGGraph;
}

describe('RuleEngine', () => {
  it('registers and runs rules', async () => {
    const registry = new RuleRegistry();
    const testRule = new (class extends BaseRule {
      meta: RuleMeta = {
        id: 'TEST-001', name: 'Test Rule', description: 'A test rule',
        category: 'security-injection', severity: 'high', techniqueNumber: 1, pillar: 1, tags: ['test'],
      };
      async execute(ctx: RuleContext) {
        this.emit(ctx, { title: 'Test Finding', message: 'Test', file: 'test.ts', line: 1 });
      }
    })();
    registry.register(testRule);
    const engine = new RuleEngine(registry);
    const parsed = [makeParseResult('const x = 1;')];
    const report = await engine.execute(parsed, makeEmptyGraph());
    expect(report.totalFindings).toBe(1);
    expect(report.totalRules).toBe(1);
    expect(report.findings[0].ruleId).toBe('TEST-001');
  });

  it('filters by category', async () => {
    const engine = createRuleEngine();
    const parsed = [makeParseResult('const x = 1;')];
    const report = await engine.execute(parsed, makeEmptyGraph(), { categories: ['security-injection'] });
    expect(report.totalRules).toBeGreaterThan(0);
    const allNonInjection = Object.entries(report.byCategory)
      .filter(([cat]) => cat !== 'security-injection');
    expect(allNonInjection.every(([, count]) => count === 0)).toBe(true);
  });

  it('handles rule errors gracefully', async () => {
    const registry = new RuleRegistry();
    const brokenRule = new (class extends BaseRule {
      meta: RuleMeta = {
        id: 'BROKEN-001', name: 'Broken', description: 'Throws on execute',
        category: 'security-injection', severity: 'critical', techniqueNumber: 1, pillar: 1, tags: [],
      };
      async execute(_ctx: RuleContext) { throw new Error('oops'); }
    })();
    registry.register(brokenRule);
    const engine = new RuleEngine(registry);
    const parsed = [makeParseResult('const x = 1;')];
    const report = await engine.execute(parsed, makeEmptyGraph());
    expect(report.findings.length).toBeGreaterThan(0);
    const errorFinding = report.findings.find(f => f.ruleId === 'BROKEN-001');
    expect(errorFinding).toBeDefined();
    expect(errorFinding!.severity).toBe('info');
    expect(errorFinding!.title).toContain('oops');
  });
});

describe('RuleRegistry', () => {
  it('counts registered rules', () => {
    const engine = createRuleEngine();
    expect(engine.getRegistry().count()).toBeGreaterThan(300);
  });

  it('retrieves rules by category', () => {
    const engine = createRuleEngine();
    const secInj = engine.getRegistry().getByCategory('security-injection');
    expect(secInj.length).toBeGreaterThan(0);
  });
});
