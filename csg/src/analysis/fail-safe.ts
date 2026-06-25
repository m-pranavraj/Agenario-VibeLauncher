import type { Node } from '@babel/types';
import * as traverse from '@babel/traverse';
import type { CSGGraph, ParseResult } from '../types.js';
import type {
  TryCatchBlock, ResiliencePattern, FailSafeReport,
} from '../types.js';

const RESILIENCE_API_PATTERNS = [
  /stripe\./i, /Stripe\(/i, /new Stripe/i,
  /prisma/, /typeorm/, /sequelize/, /mongoose/, /knex/,
  /redis/, /ioredis/, /amqplib/, /kafka/, /bull/,
  /pg\./, /mysql/, /mssql/,
  /fetch\(/, /axios/, /got\(/, /superagent/,
  /sqs/, /sns/, /s3\./, /dynamodb/, /lambda/,
  /grpc/, /soap/,
];

export class FailSafe {
  private tryCatchBlocks: TryCatchBlock[] = [];
  private resiliencePatterns: ResiliencePattern[] = [];

  analyze(parsed: ParseResult[], graph: CSGGraph): FailSafeReport {
    this.tryCatchBlocks = [];
    this.resiliencePatterns = [];

    for (const p of parsed) {
      const defaultTraverse = (traverse.default || traverse) as typeof traverse.default;
      defaultTraverse(p.ast, {
        TryStatement: (path) => {
          this.analyzeTryCatch(path, p.file, p.astNodes);
        },
        CallExpression: (path) => {
          this.detectResilienceWrappers(path, p.file);
        },
      });
    }

    const emptyCatchCount = this.tryCatchBlocks.filter(t => t.hasEmptyCatch).length;
    const missingLoggingCount = this.tryCatchBlocks.filter(t => !t.hasLoggedError).length;
    const missingRetryCount = this.tryCatchBlocks.filter(t => !t.hasRetry).length;
    const missingTimeoutCount = this.tryCatchBlocks.filter(t => !t.hasTimeout).length;
    const total = this.tryCatchBlocks.length;
    const score = total === 0 ? 100
      : Math.round(100 - (
        (emptyCatchCount * 15 + missingLoggingCount * 5 + missingRetryCount * 3 + missingTimeoutCount * 2) / total
      ));

    return {
      tryCatchBlocks: this.tryCatchBlocks, emptyCatchCount, missingLoggingCount,
      missingRetryCount, missingTimeoutCount, resiliencePatterns: this.resiliencePatterns,
      score: Math.max(0, Math.min(100, score)),
    };
  }

  private analyzeTryCatch(path: any, file: string, astNodes: Map<string, any>): void {
    const node = path.node;
    const tryBlock = node.block;
    const catchClause = node.handler;
    const finallyBlock = node.finalizer;

    if (!catchClause) return;

    const tryBodyStr = this.nodeToCode(tryBlock);
    const surroundingApi = RESILIENCE_API_PATTERNS
      .map(p => { const m = tryBodyStr.match(p); return m ? m[0] : null; })
      .filter(Boolean) as string[];

    const catchBody = catchClause.body;
    const catchLines = this.getNodeLines(catchBody);
    const hasEmptyCatch = !catchBody || !catchBody.body || catchBody.body.length === 0
      || (catchBody.body.length === 1 && catchBody.body[0].type === 'BlockStatement' && catchBody.body[0].body.length === 0);
    const hasLoggedError = this.hasLogging(catchBody);
    const hasRetry = this.hasRetryPattern(tryBlock) || this.hasRetryPattern(catchBody);
    const hasTimeout = this.hasTimeoutPattern(tryBodyStr);
    const hasFinally = !!finallyBlock;

    const id = `fs_${this.tryCatchBlocks.length}`;
    this.tryCatchBlocks.push({
      id, file, line: node.loc?.start?.line ?? 0,
      tryBlockLine: tryBlock.loc?.start?.line ?? 0,
      catchBlockLines: [catchClause.loc?.start?.line ?? 0, catchClause.loc?.end?.line ?? 0],
      hasEmptyCatch, hasLoggedError, hasRetry, hasTimeout, hasFinally,
      surroundingApiCall: surroundingApi.length > 0 ? surroundingApi[0] : null,
    });

    if (!hasRetry && surroundingApi.length > 0) {
      this.resiliencePatterns.push({
        present: false, pattern: 'retry', location: null, confidence: 0.7,
      });
    }
    if (!hasTimeout && surroundingApi.length > 0) {
      this.resiliencePatterns.push({
        present: false, pattern: 'timeout', location: null, confidence: 0.6,
      });
    }
  }

  private detectResilienceWrappers(path: any, file: string): void {
    const node = path.node;
    const code = this.nodeToCode(node);

    if (/retry|p-retry|async-retry|retry\./i.test(code)) {
      this.resiliencePatterns.push({
        present: true, pattern: 'retry',
        location: this.toLocation(node.loc, file), confidence: 0.9,
      });
    }
    if (/setTimeout|AbortSignal\.timeout|p-timeout|timeout\./i.test(code)) {
      this.resiliencePatterns.push({
        present: true, pattern: 'timeout',
        location: this.toLocation(node.loc, file), confidence: 0.9,
      });
    }
    if (/circuit-breaker|opossum|circuitBreaker|CircuitBreaker/i.test(code)) {
      this.resiliencePatterns.push({
        present: true, pattern: 'circuit-breaker',
        location: this.toLocation(node.loc, file), confidence: 0.95,
      });
    }
    if (/fallback|catch\(.*default|orElse\(|otherwise\(/i.test(code)) {
      this.resiliencePatterns.push({
        present: true, pattern: 'fallback',
        location: this.toLocation(node.loc, file), confidence: 0.7,
      });
    }
    if (/bulkhead|semaphore|p-limit|p-queue/i.test(code)) {
      this.resiliencePatterns.push({
        present: true, pattern: 'bulkhead',
        location: this.toLocation(node.loc, file), confidence: 0.85,
      });
    }
  }

  private hasLogging(body: any): boolean {
    if (!body) return false;
    const nodes = body.body || [body];
    const code = nodes.map((n: any) => this.nodeToCode(n)).join(' ');
    return /logger\.(error|warn|info|debug)|console\.(error|warn)|pinson\.(error|warn)|winston\.(error|warn)|log\.(error|warn)/i.test(code);
  }

  private hasRetryPattern(body: any): boolean {
    if (!body) return false;
    const nodes = body.body || [body];
    const code = nodes.map((n: any) => this.nodeToCode(n)).join(' ');
    return /retry|maxRetries|retries|attempts|\.retry\(|retryCount|backoff|exponential/i.test(code);
  }

  private hasTimeoutPattern(code: string): boolean {
    return /timeout|abortSignal|signal:\s*AbortSignal|maxDuration|\.timeout\(/i.test(code);
  }

  private nodeToCode(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.type) {
      const { default: generate } = require('@babel/generator');
      return generate(node).code;
    }
    return '';
  }

  private getNodeLines(node: any): [number, number] {
    if (!node || !node.loc) return [0, 0];
    return [node.loc.start.line, node.loc.end.line];
  }

  private toLocation(loc: any, file: string): any {
    if (!loc) return null;
    return { file, start: { line: loc.start.line, col: loc.start.column ?? 0 }, end: { line: loc.end.line, col: loc.end.column ?? 0 } };
  }
}
