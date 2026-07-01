import { describe, it, expect } from 'vitest';
import * as babelParser from '@babel/parser';
import type { ParseResult } from '../src/types.js';
import { findFunctionCalls, findStringLiterals, detectUserInputSources, findBinaryExpressionConcat } from '../src/analysis/rules/engine/ast-utils.js';

function makeParseResult(code: string, file: string = 'test.ts'): ParseResult {
  const ast = babelParser.parse(code, { sourceType: 'unambiguous', plugins: ['jsx', 'typescript'] });
  return { ast: ast!, astNodes: new Map(), file, language: 'ts' };
}

describe('ast-utils', () => {
  describe('findFunctionCalls', () => {
    it('finds simple function calls', () => {
      const parsed = [makeParseResult('pool.query("SELECT * FROM users")')];
      const calls = findFunctionCalls(parsed, (info) => info.methodName === 'query');
      expect(calls).toHaveLength(1);
      expect(calls[0].callee).toBe('pool.query');
    });

    it('finds chained method calls', () => {
      const parsed = [makeParseResult('db.$queryRaw`SELECT * FROM users`')];
      const calls = findFunctionCalls(parsed, (info) => info.methodName === '$queryRaw');
      expect(calls).toHaveLength(1);
      expect(calls[0].callee).toContain('$queryRaw');
    });

    it('returns empty for no matches', () => {
      const parsed = [makeParseResult('const x = 1 + 2;')];
      const calls = findFunctionCalls(parsed, (info) => info.methodName === 'query');
      expect(calls).toHaveLength(0);
    });
  });

  describe('findStringLiterals', () => {
    it('finds SQL-like string literals', () => {
      const parsed = [makeParseResult('const q = "SELECT * FROM users WHERE id = " + id;')];
      const literals = findStringLiterals(parsed, (s) => /SELECT/i.test(s));
      expect(literals.length).toBeGreaterThan(0);
      expect(literals[0].value).toContain('SELECT');
    });
  });

  describe('detectUserInputSources', () => {
    it('detects req.body access', () => {
      const parsed = [makeParseResult('const name = req.body.name;')];
      const sources = detectUserInputSources(parsed);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.some(s => s.source.includes('req.body'))).toBe(true);
    });

    it('detects req.query access', () => {
      const parsed = [makeParseResult('const id = req.query.id;')];
      const sources = detectUserInputSources(parsed);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.some(s => s.source.includes('req.query'))).toBe(true);
    });

    it('detects req.params access', () => {
      const parsed = [makeParseResult('const id = req.params.id;')];
      const sources = detectUserInputSources(parsed);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.some(s => s.source.includes('req.params'))).toBe(true);
    });
  });

  describe('findBinaryExpressionConcat', () => {
    it('finds string concatenation with identifiers', () => {
      const parsed = [makeParseResult('const q = "SELECT * FROM users WHERE id = " + userId;')];
      const concats = findBinaryExpressionConcat(parsed, (parts) => parts.length >= 2);
      expect(concats).toHaveLength(1);
      expect(concats[0].parts).toContain('userId');
    });
  });
});
