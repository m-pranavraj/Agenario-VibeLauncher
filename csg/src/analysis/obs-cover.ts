import * as traverse from '@babel/traverse';
import type { ParseResult, CSGGraph } from '../types.js';
import type { TelemetryBoundary, ObsCoverReport } from '../types.js';

const LOGGING_METHODS = [
  'logger.error', 'logger.warn', 'logger.info', 'logger.debug',
  'console.log', 'console.error', 'console.warn', 'console.info', 'console.debug',
  'pino.error', 'pino.warn', 'pino.info', 'pino.debug',
  'winston.error', 'winston.warn', 'winston.info', 'winston.debug',
  'log.error', 'log.warn', 'log.info',
];

const TRACING_METHODS = [
  'tracer.startSpan', 'tracer.startActiveSpan',
  'span.setAttribute', 'span.addEvent',
  'OpenTelemetry', 'opentelemetry',
  'datadog', 'dd-trace', 'ddtrace',
  'Sentry.startTransaction', 'Sentry.startSpan',
  'newrelic', 'newRelic',
];

const DB_QUERY_PATTERNS = [
  /\.(find|findOne|findMany|create|update|delete|upsert|aggregate|query|execute)\s*\(/,
  /\.\$\./, /prisma\./, /model\./, /knex\(/, /sequelize\./,
  /query\(/, /execute\(/, /sql`/,
  /mongo/, /mongodb/,
];

export class ObsCover {
  private boundaries: TelemetryBoundary[] = [];

  analyze(parsed: ParseResult[], graph: CSGGraph): ObsCoverReport {
    this.boundaries = [];

    for (const p of parsed) {
      const defaultTraverse = (traverse.default || traverse) as typeof traverse.default;
      defaultTraverse(p.ast, {
        Function: (path: any) => {
          const node = path.node;
          const codeStr = this.nodeToCode(node);
          const loc = node.loc;

          if (this.isApiEndpoint(path, codeStr)) {
            this.checkBoundary(path, p, 'api-endpoint');
          }

          if (this.hasDbQuery(codeStr)) {
            this.checkBoundary(path, p, 'db-query');
          }

          if (this.isExternalCall(codeStr)) {
            this.checkBoundary(path, p, 'external-call');
          }
        },
        CatchClause: (path: any) => {
          this.checkBoundary(path, p, 'error-catch');
        },
      });
    }

    const totalBlocks = this.boundaries.length;
    const coveredBlocks = this.boundaries.filter(b => b.coverage === 'covered').length;
    const partialBlocks = this.boundaries.filter(b => b.coverage === 'partial').length;
    const uncoveredBlocks = this.boundaries.filter(b => b.coverage === 'uncovered').length;

    const coveragePct = totalBlocks === 0 ? 100 : Math.round((coveredBlocks / totalBlocks) * 100);
    const observabilityDebtScore = totalBlocks === 0 ? 0 : Math.round(((uncoveredBlocks * 2 + partialBlocks) / (totalBlocks * 2)) * 100);

    const recommendedActions: string[] = [];
    if (uncoveredBlocks > 0) recommendedActions.push(`Add logging/tracing to ${uncoveredBlocks} uncovered code blocks`);
    if (partialBlocks > 0) recommendedActions.push(`Complete partial observability on ${partialBlocks} code blocks`);
    const apiMissing = this.boundaries.filter(b => b.blockType === 'api-endpoint' && b.coverage !== 'covered').length;
    if (apiMissing > 0) recommendedActions.push(`Instrument ${apiMissing} API endpoints with tracing spans`);
    const dbMissing = this.boundaries.filter(b => b.blockType === 'db-query' && !b.hasTracing).length;
    if (dbMissing > 0) recommendedActions.push(`Add tracing spans to ${dbMissing} database query sites`);
    const catchMissing = this.boundaries.filter(b => b.blockType === 'error-catch' && !b.hasLogging).length;
    if (catchMissing > 0) recommendedActions.push(`Add error logging to ${catchMissing} catch blocks`);

    return {
      boundaries: this.boundaries, totalBlocks, coveredBlocks, partialBlocks, uncoveredBlocks,
      observabilityDebtScore, coveragePct, recommendedActions,
    };
  }

  private checkBoundary(path: any, p: ParseResult, blockType: TelemetryBoundary['blockType']): void {
    const node = path.node;
    const body = node.body || node;
    const codeStr = this.nodeToCode(node);
    const nodeId = `obs_${this.boundaries.length}`;

    const hasLogging = LOGGING_METHODS.some(m => codeStr.includes(m));
    const hasTracing = TRACING_METHODS.some(m => codeStr.includes(m));
    const loggingMethod = LOGGING_METHODS.find(m => codeStr.includes(m)) || null;
    const tracingSpan = this.findTracingSpan(codeStr);

    let coverage: TelemetryBoundary['coverage'];
    if (hasLogging && hasTracing) coverage = 'covered';
    else if (hasLogging || hasTracing) coverage = 'partial';
    else coverage = 'uncovered';

    const loc = node.loc;
    const file = p.file;

    this.boundaries.push({
      nodeId, file, line: loc?.start?.line ?? 0,
      codeBlock: codeStr.slice(0, 120).replace(/\n/g, ' ').trim(),
      blockType, hasLogging, hasTracing,
      loggingMethod, tracingSpan, coverage,
    });
  }

  private isApiEndpoint(path: any, code: string): boolean {
    const parent = path.parent;
    if (!parent) return false;
    const pCode = this.nodeToCode(parent);
    const parentType = parent.type;
    if (parentType === 'ExpressionStatement' || parentType === 'VariableDeclaration') return false;
    return /(?:app|router|route)\s*\.\s*(get|post|put|patch|delete|all|use)\s*\(/.test(pCode)
      || /router\.|route\.|app\.(get|post|all|use|route)\s*\(/.test(code)
      || /@(Get|Post|Put|Delete|Patch|Route)\(/.test(code);
  }

  private hasDbQuery(code: string): boolean {
    return DB_QUERY_PATTERNS.some(p => p.test(code));
  }

  private isExternalCall(code: string): boolean {
    return /fetch\(|axios\.|got\(|superagent|request\(|http\.request|https\.request/.test(code);
  }

  private findTracingSpan(code: string): string | null {
    for (const t of TRACING_METHODS) {
      if (code.includes(t)) return t;
    }
    const spanMatch = code.match(/['"]([^'"]+)['"]\s*[\),].*span/);
    return spanMatch ? spanMatch[1] : null;
  }

  private nodeToCode(node: any): string {
    if (!node) return '';
    try {
      const { default: generate } = require('@babel/generator');
      return generate(node).code;
    } catch { return ''; }
  }
}
