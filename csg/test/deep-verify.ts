import { fingerprintFunction, compareFingerprints } from '../src/analysis/ast-fingerprint.js';
import { CloneDetector } from '../src/analysis/clone-detector.js';
import { warmReferencePatterns } from '../src/analysis/reference-samples.js';
import { parseLTL, modelCheck, verifyTemporalProperty, formatLTL } from '../src/analysis/ltl.js';
import { buildFSMFromGraph, analyzeFSM } from '../src/analysis/fsm.js';
import type { CSGGraph } from '../src/types.js';
import { Parser } from '../src/parser/index.js';
import { CFGBuilder } from '../src/graph/cfg.js';

const PRODUCTION_APP = [
  "const express = require('express');",
  "const app = express();",
  "const { Pool } = require('pg');",
  "const pool = new Pool();",
  "",
  "// --- VULNERABLE: IDOR — no ownership check on order lookup",
  "app.get('/api/order/:id', async (req, res) => {",
  "  const orderId = req.params.id;",
  "  const result = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);",
  "  res.json(result.rows[0]);",
  "});",
  "",
  "// --- VULNERABLE: Prototype pollution via unsafe for-in merge",
  "function merge(a, b) {",
  "  for (let k in b) { a[k] = b[k]; }",
  "  return a;",
  "}",
  "",
  "// --- SAFE: IDOR with ownership verification guard",
  "app.get('/api/order/:id/safe', async (req, res) => {",
  "  const orderId = req.params.id;",
  "  const userId = req.session.userId;",
  "  const result = await pool.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [orderId, userId]);",
  "  if (!result.rows[0]) return res.status(403).json({ error: 'forbidden' });",
  "  res.json(result.rows[0]);",
  "});",
  "",
  "// --- VULNERABLE: SSRF — user-controlled URL fetched without validation",
  "app.get('/api/proxy', async (req, res) => {",
  "  const target = req.query.url;",
  "  const resp = await fetch(target);",
  "  const text = await resp.text();",
  "  res.send(text);",
  "});",
  "",
  "// --- VULNERABLE: SQL injection via string concatenation",
  "app.get('/api/search', async (req, res) => {",
  "  const term = req.query.q;",
  "  const result = await pool.query('SELECT * FROM items WHERE name LIKE ' + term);",
  "  res.json(result.rows);",
  "});",
  "",
  "// --- SAFE: Parameterized query, no injection",
  "app.get('/api/search/safe', async (req, res) => {",
  "  const term = req.query.q;",
  "  const result = await pool.query('SELECT * FROM items WHERE name LIKE $1', [term]);",
  "  res.json(result.rows);",
  "});",
].join('\n');

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║    HOMOMORPHIC AST FINGERPRINTING + LTL STATE-SPACE CHECKER     ║');
  console.log('║         Real-time Deep Analysis — Research-Grade Engine         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // ── Phase 0: Warm reference patterns ──
  console.log('[0] Warming reference vulnerability patterns...');
  warmReferencePatterns();
  console.log('    Reference patterns loaded from real parsed source code.\n');

  // ── Phase 1: Parse ──
  console.log('[1] Parsing production application code...');
  const parser = new Parser();
  const parsed = parser.parseContent(PRODUCTION_APP, 'app.js', 'js');

  // ── Phase 2: Extract functions and fingerprint ──
  console.log('[2] Extracting functions and computing AST fingerprints...\n');

  function extractFns(node: any, parentName: string, acc: Array<{ name: string; body: any; loc: any }>): void {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'FunctionDeclaration') {
      acc.push({ name: node.id?.name || 'anon', body: node.body, loc: node.loc });
    }
    if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
      if (parentName && !acc.find(a => a.name === parentName)) {
        acc.push({ name: parentName, body: node.body, loc: node.loc });
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'leadingComments' || key === 'trailingComments' || key === 'extra') continue;
      const val = node[key];
      if (Array.isArray(val)) val.forEach(v => extractFns(v, parentName, acc));
      else if (val && typeof val === 'object') extractFns(val, parentName, acc);
    }
  }

  const body = (parsed.ast as any).program.body;
  const rawFns: Array<{ name: string; body: any; loc: any; source?: string }> = [];

  function extractRouteHandlers(node: any): void {
    if (node.type === 'ExpressionStatement' && node.expression?.type === 'CallExpression') {
      const callee = node.expression.callee;
      if (callee?.type === 'MemberExpression') {
        const method = callee.property?.name || '';
        const route = node.expression.arguments?.[0]?.value || '';
        const handler = node.expression.arguments?.[1];
        if (handler && (handler.type === 'ArrowFunctionExpression' || handler.type === 'FunctionExpression')) {
          rawFns.push({ name: `${method}:${route}`, body: handler.body, loc: handler.loc,
            source: PRODUCTION_APP.substring(handler.loc?.start?.offset || 0, handler.loc?.end?.offset || 0)
          });
        }
      }
    }
  }

  body.forEach((n: any) => extractRouteHandlers(n));
  body.forEach((n: any) => extractFns(n, '', rawFns));

  const detector = new CloneDetector();
  const fingerprints: Array<{ name: string; fp: ReturnType<typeof fingerprintFunction>; source?: string }> = [];
  const usedNames = new Set<string>();

  for (const fn of rawFns) {
    if (usedNames.has(fn.name)) continue;
    usedNames.add(fn.name);
    const fp = fingerprintFunction(fn.name, fn.body, fn.loc ? { start: { line: fn.loc.start.line }, end: { line: fn.loc.end.line } } : null);
    detector.ingest(fp);
    fingerprints.push({ name: fn.name, fp, source: fn.source });
  }

  // ── Phase 3: Print fingerprint table ──
  for (const { name, fp } of fingerprints) {
    const label = name.includes('safe') ? '(SAFE)' :
      name === 'merge' ? '(PP)' :
      name === 'GET:/api/proxy' ? '(SSRF)' :
      name === 'GET:/api/search' ? '(SQLI)' :
      name === 'GET:/api/order/:id' ? '(IDOR)' : '';
    console.log(`  ${name.padEnd(30)} ${label.padEnd(8)} hash=${fp.structuralHash.slice(0, 12)} depth=${fp.depth} nodes=${fp.nodeCount} sig=[${fp.minHashSig.slice(0, 4).join(',')}]`);
  }

  // ── Phase 4: Deep vulnerability detection ──
  console.log('\n[3] Deep vulnerability analysis (structural + taint + differential)...\n');

  for (const { name, fp, source } of fingerprints) {
    const vulns = detector.detectVulnerabilities(fp, source || null);

    if (vulns.length === 0) {
      console.log(`  ✅ ${name}: CLEAN (no match)`);
      continue;
    }

    const best = vulns[0];
    const icon = best.deepResult.verdict === 'match' ? '🔴' :
                best.deepResult.verdict === 'zero-day' ? '🟠' :
                best.deepResult.verdict === 'looks-clean' ? '🟢' : '⚪';

    console.log(`  ${icon} ${name}`);
    console.log(`     Verdict: ${best.deepResult.verdict.toUpperCase()} | Class: ${best.matchedPattern.class} | CWE: ${best.matchedPattern.cwe}`);
    console.log(`     Structural similarity: ${(best.deepResult.structuralSimilarity * 100).toFixed(1)}%`);
    console.log(`     Zero-day probability: ${(best.deepResult.zeroDayProbability * 100).toFixed(0)}%`);

    if (best.deepResult.differentialScore !== 0) {
      console.log(`     Differential (vuln-clean): ${(best.deepResult.differentialScore * 100).toFixed(1)}%`);
    }
    if (best.deepResult.taintFlowConfirmed) {
      const taint = `sources=[${best.deepResult.matchedSources.join(',')}] sinks=[${best.deepResult.matchedSinks.join(',')}] sanitizers=[${best.deepResult.matchedSanitizers.join(',')}]`;
      console.log(`     Taint: ${taint}`);
    }
    for (const ev of best.deepResult.evidence.slice(0, 3)) {
      console.log(`     → ${ev}`);
    }
  }

  // ── Phase 5: Clone matrix ──
  console.log('\n[4] Structural clone matrix (identical topological shapes)...\n');

  const cloneGroups = detector.buildCloneGroups(fingerprints);
  if (cloneGroups.length === 0) {
    console.log('  No clone groups found above threshold.');
  } else {
    for (const g of cloneGroups) {
      console.log(`  Group: ${g.members.join(', ')} (similarity: ${(g.similarity * 100).toFixed(0)}%)`);
    }
  }

  // ── Phase 6: LTL model checking ──
  console.log('\n[5] Building FSM from control flow graph...');
  const graph: CSGGraph = {
    astNodes: parsed.astNodes,
    files: new Map([['app.js', { size: PRODUCTION_APP.length, hash: 'demo', language: 'js' }]]),
    cfg: { blocks: new Map(), entryBlock: null, exitBlock: null, functionCFGs: new Map() },
    moduleGraph: { imports: [], exports: [], dependencyMap: new Map(), entryPoints: [], cycles: [] },
    routeMap: { endpoints: [], routerTree: new Map(), paramRegistry: new Map() },
    callGraph: { functions: new Map(), calls: [], entryPoints: [], unresolved: [], asyncChains: [] },
    dimensionIndex: new Map(),
    diagnostics: [],
  };

  new CFGBuilder().build([parsed], graph);
  const fsm = buildFSMFromGraph(graph, 'ProductionApp');

  console.log(`  FSM built: ${fsm.states.size} states, ${fsm.events.length} transitions`);
  const report = analyzeFSM(fsm);
  console.log(`  Reachability: ${fsm.states.size - report.unreachableStates.length}/${fsm.states.size} states reachable`);
  console.log(`  Deadlocks: ${report.deadlockStates.length}, Race conditions: ${report.raceConditions.length}`);

  console.log('\n[6] Checking LTL temporal properties...\n');

  const SECURITY_PROPERTIES = [
    { id: 'P1', formula: 'G(RequestInput -> F(AuthCheck))', desc: 'All request inputs must eventually go through auth check' },
    { id: 'P2', formula: 'G(DBQuery -> F(Authorize))', desc: 'All database queries must be preceded by authorization' },
    { id: 'P3', formula: 'G(Write -> F(Authorize))', desc: 'All write operations must be preceded by authorization' },
    { id: 'P4', formula: 'G(AuthCheck -> F(Authorize))', desc: 'All auth checks must succeed in authorization' },
  ];

  for (const prop of SECURITY_PROPERTIES) {
    const formula = parseLTL(prop.formula);
    const result = modelCheck(fsm, formula);
    const icon = result.holds ? '✅' : '❌';
    const status = result.holds ? 'HOLDS' : 'VIOLATED';
    console.log(`  ${icon} ${prop.id}: ${prop.formula}`);
    console.log(`     ${status} | ${result.verifiedStates}/${result.verifiedStates + result.violatingStates} states | ${result.timeMs}ms`);
  }

  // ── Phase 7: Generate full report ──
  console.log('\n[7] Generating full analysis report...\n');
  const reportData = detector.generateReport(fingerprints.map(f => ({ name: f.name, fp: f.fp, source: f.source })));

  console.log(`  ┌────────────────────────────────────────────┐`);
  console.log(`  │  ANALYSIS SUMMARY                          │`);
  console.log(`  ├────────────────────────────────────────────┤`);
  console.log(`  │  Functions analyzed:     ${String(reportData.summary.totalFunctions).padStart(4)}          │`);
  console.log(`  │  Vulnerable:             ${String(reportData.summary.vulnerableFunctions).padStart(4)}          │`);
  console.log(`  │  Zero-day candidates:    ${String(reportData.summary.zeroDayFunctions).padStart(4)}          │`);
  console.log(`  │  Clone groups found:     ${String(reportData.summary.cloneGroupsFound).padStart(4)}          │`);
  console.log(`  │  Vuln classes detected:  ${reportData.summary.uniqueVulnerabilityClasses.length}          │`);
  console.log(`  └────────────────────────────────────────────┘\n`);

  if (reportData.summary.vulnerableFunctions > 0) {
    console.log('  Vulnerabilities by function:');
    for (const v of reportData.vulnerabilities) {
      const tag = v.isZeroDay ? 'ZERO-DAY' : 'CONFIRMED';
      console.log(`    ${tag.padEnd(10)} | ${v.matchedPattern.class.padEnd(18)} | ${v.fingerprint.functionName}`);
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ANALYSIS COMPLETE — Real-time, no mockups, deep algorithmic     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
