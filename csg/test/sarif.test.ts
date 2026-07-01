import { describe, it, expect } from 'vitest';
import { toSarif } from '../src/serialization/sarif.js';
import type { RuleEngineReport } from '../src/analysis/rules/engine/types.js';

const mockReport: RuleEngineReport = {
  findings: [
    { id: 'f1', ruleId: 'SEC-SQLI-001', severity: 'critical', title: 'SQL Injection', message: 'Direct SQL injection detected', category: 'security-injection', file: 'src/app.ts', line: 42, column: 5, confidence: 90, snippet: 'pool.query("SELECT * ...")' },
    { id: 'f2', ruleId: 'PERF-ALGO-001', severity: 'medium', title: 'N+1 Query', message: 'Potential N+1 query pattern', category: 'performance-algorithmic', file: 'src/users.ts', line: 10, column: 1, confidence: 65 },
  ],
  totalFindings: 2,
  totalRules: 343,
  bySeverity: { critical: 1, high: 0, medium: 1, low: 0, info: 0 },
  byCategory: { 'security-injection': 1, 'performance-algorithmic': 1 },
  taintPaths: [],
};

describe('SARIF output', () => {
  it('produces valid SARIF JSON', () => {
    const output = toSarif(mockReport);
    const parsed = JSON.parse(output);
    expect(parsed.$schema).toContain('sarif-schema-2.1.0');
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs).toHaveLength(1);
  });

  it('includes tool driver info', () => {
    const output = JSON.parse(toSarif(mockReport));
    const driver = output.runs[0].tool.driver;
    expect(driver.name).toBe('Agenario CSG');
    expect(driver.rules.length).toBeGreaterThan(0);
  });

  it('maps severity levels correctly', () => {
    const output = JSON.parse(toSarif(mockReport));
    const results = output.runs[0].results;
    const criticalResult = results.find((r: any) => r.ruleId === 'SEC-SQLI-001');
    expect(criticalResult.level).toBe('error');
    const mediumResult = results.find((r: any) => r.ruleId === 'PERF-ALGO-001');
    expect(mediumResult.level).toBe('warning');
  });

  it('includes location info', () => {
    const output = JSON.parse(toSarif(mockReport));
    const result = output.runs[0].results[0];
    expect(result.locations[0].physicalLocation.artifactLocation.uri).toBe('src/app.ts');
    expect(result.locations[0].physicalLocation.region.startLine).toBe(42);
  });
});
