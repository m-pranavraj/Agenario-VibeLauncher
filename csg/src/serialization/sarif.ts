import type { RuleFinding, RuleEngineReport } from '../analysis/rules/engine/types.js';

interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

interface SarifRun {
  tool: { driver: { name: string; version: string; informationUri: string; rules: SarifRule[] } };
  results: SarifResult[];
  properties?: Record<string, unknown>;
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  defaultConfiguration: { level: string };
  properties?: { tags?: string[]; precision?: string; securitySeverity?: string };
}

interface SarifResult {
  ruleId: string;
  ruleIndex: number;
  level: string;
  message: { text: string };
  locations: SarifLocation[];
  partialFingerprints?: Record<string, string>;
  properties?: Record<string, unknown>;
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string };
    region: { startLine: number; startColumn: number; snippet?: { text: string } };
  };
}

const SEVERITY_MAP: Record<string, string> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'note',
  info: 'note',
};

export function toSarif(report: RuleEngineReport): string {
  const seenRules = new Map<string, number>();
  const rules: SarifRule[] = [];
  const results: SarifResult[] = [];

  for (const finding of report.findings) {
    if (!seenRules.has(finding.ruleId)) {
      seenRules.set(finding.ruleId, rules.length);
      rules.push({
        id: finding.ruleId,
        name: finding.title,
        shortDescription: { text: finding.title.slice(0, 100) },
        fullDescription: { text: finding.message.slice(0, 500) },
        defaultConfiguration: { level: SEVERITY_MAP[finding.severity] || 'warning' },
        properties: {
          tags: [finding.category],
          precision: finding.confidence >= 80 ? 'high' : finding.confidence >= 50 ? 'medium' : 'low',
          securitySeverity: finding.severity === 'critical' ? '9.0' : finding.severity === 'high' ? '7.0' : '4.0',
        },
      });
    }

    const result: SarifResult = {
      ruleId: finding.ruleId,
      ruleIndex: seenRules.get(finding.ruleId)!,
      level: SEVERITY_MAP[finding.severity] || 'note',
      message: { text: finding.message },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: finding.file },
          region: {
            startLine: finding.line,
            startColumn: finding.column || 0,
            ...(finding.snippet ? { snippet: { text: finding.snippet } } : {}),
          },
        },
      }],
      partialFingerprints: {
        primaryLocationLineHash: `${finding.file}:${finding.line}:${finding.ruleId}`,
      },
      properties: {
        category: finding.category,
        confidence: finding.confidence,
        ...(finding.owaspMapping ? { owasp: finding.owaspMapping } : {}),
        ...(finding.cweMapping ? { cwe: finding.cweMapping } : {}),
      },
    };
    results.push(result);
  }

  const sarifLog: SarifLog = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'Agenario CSG',
          version: '2.0.0',
          informationUri: 'https://github.com/agenario/csg',
          rules,
        },
      },
      results,
      properties: {
        totalFindings: report.totalFindings,
        totalRules: report.totalRules,
        bySeverity: report.bySeverity,
        byCategory: report.byCategory,
      },
    }],
  };

  return JSON.stringify(sarifLog, null, 2);
}
