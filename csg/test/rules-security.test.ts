import { describe, it, expect } from 'vitest';
import * as babelParser from '@babel/parser';
import type { ParseResult, CSGGraph } from '../src/types.js';
import { RuleEngine, RuleRegistry } from '../src/analysis/rules/engine/rule-engine.js';
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

describe('Security Rules — SQL Injection', () => {
  const engine = createRuleEngine();

  it('detects direct SQL injection via string concat with req.body', async () => {
    const code = `
      const express = require('express');
      const app = express();
      const pool = require('./db');
      app.post('/login', (req, res) => {
        const query = "SELECT * FROM users WHERE username = '" + req.body.username + "' AND password = '" + req.body.password + "'";
        pool.query(query);
      });
    `;
    const parsed = [makeParseResult(code, 'routes/auth.ts')];
    const report = await engine.execute(parsed, makeEmptyGraph(), { categories: ['security-injection'] });
    const sqliFindings = report.findings.filter(f =>
      f.ruleId.startsWith('SEC-SQLI') && f.severity === 'critical'
    );
    expect(sqliFindings.length).toBeGreaterThan(0);
  });

  it('does NOT flag parameterized queries', async () => {
    const code = `
      const pool = require('./db');
      app.get('/user/:id', (req, res) => {
        pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
      });
    `;
    const parsed = [makeParseResult(code, 'routes/user.ts')];
    const report = await engine.execute(parsed, makeEmptyGraph(), { categories: ['security-injection'] });
    const sqliFindings = report.findings.filter(f =>
      f.ruleId.startsWith('SEC-SQLI') && f.severity === 'critical' && f.file === 'routes/user.ts'
    );
    // Should not flag parameterized queries as critical
    const criticalSqli = sqliFindings.filter(f => f.severity === 'critical');
    expect(criticalSqli.length).toBe(0);
  });
});

describe('Security Rules — NoSQL Injection', () => {
  const engine = createRuleEngine();

  it('detects NoSQL injection via $where with user input', async () => {
    const code = `
      const MongoClient = require('mongodb').MongoClient;
      app.post('/login', async (req, res) => {
        const db = await MongoClient.connect('mongodb://localhost:27017');
        const user = await db.collection('users').find({ $where: "this.username === '" + req.body.username + "'" }).toArray();
      });
    `;
    const parsed = [makeParseResult(code, 'routes/mongo.ts')];
    const report = await engine.execute(parsed, makeEmptyGraph(), { categories: ['security-injection'] });
    const nosqlFindings = report.findings.filter(f =>
      f.ruleId.startsWith('SEC-NOSQL') && f.file === 'routes/mongo.ts'
    );
    expect(nosqlFindings.length).toBeGreaterThan(0);
  });
});

describe('Security Rules — Command Injection', () => {
  const engine = createRuleEngine();

  it('detects shell command injection via exec with user input', async () => {
    const code = `
      const { exec } = require('child_process');
      app.post('/ping', (req, res) => {
        exec('ping -c 4 ' + req.body.host);
      });
    `;
    const parsed = [makeParseResult(code, 'routes/ping.ts')];
    const report = await engine.execute(parsed, makeEmptyGraph(), { categories: ['security-injection'] });
    const cmdFindings = report.findings.filter(f =>
      f.ruleId.startsWith('SEC-CMD') && f.file === 'routes/ping.ts'
    );
    expect(cmdFindings.length).toBeGreaterThan(0);
  });
});

describe('Security Rules — SSTI', () => {
  const engine = createRuleEngine();

  it('detects SSTI via template engine with user input', async () => {
    const code = `
      const express = require('express');
      const app = express();
      app.set('view engine', 'ejs');
      app.get('/greet', (req, res) => {
        res.render('greet', { name: req.query.name });
      });
      // In the template: <h1>Hello <%= name %></h1>
    `;
    const parsed = [makeParseResult(code, 'routes/greet.ts')];
    const report = await engine.execute(parsed, makeEmptyGraph(), { categories: ['security-injection'] });
    const sstiFindings = report.findings.filter(f =>
      f.ruleId.startsWith('SEC-SSTI') && f.file === 'routes/greet.ts'
    );
    expect(sstiFindings.length).toBeGreaterThan(0);
  });
});

describe('Security Rules — Crypto/Auth', () => {
  const engine = createRuleEngine();

  it('detects hardcoded JWT secret', async () => {
    const code = `const jwt = require('jsonwebtoken');
      const secret = 'my-secret-key-12345';
      const token = jwt.sign({ userId: 1 }, secret, { expiresIn: '1h' });
    `;
    const parsed = [makeParseResult(code, 'middleware/auth.ts')];
    const report = await engine.execute(parsed, makeEmptyGraph(), { categories: ['security-crypto'] });
    const cryptoFindings = report.findings.filter(f =>
      f.ruleId.startsWith('SEC-CRYPTO') && f.file === 'middleware/auth.ts'
    );
    expect(cryptoFindings.length).toBeGreaterThan(0);
  });
});
