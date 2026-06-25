import * as babelParser from '@babel/parser';
import type { Node, File as BabelFile } from '@babel/types';
import { fingerprintFunction, compareFingerprints, fingerprintDistance } from '../src/analysis/ast-fingerprint.js';
import { CloneDetector, VULNERABILITY_PATTERNS } from '../src/analysis/clone-detector.js';
import { buildFSMFromGraph, analyzeFSM } from '../src/analysis/fsm.js';
import { parseLTL, modelCheck, verifyTemporalProperty, formatLTL } from '../src/analysis/ltl.js';
import { StateSpaceChecker } from '../src/analysis/state-checker.js';
import { Parser } from '../src/parser/index.js';
import { CFGBuilder } from '../src/graph/cfg.js';
import type { CSGGraph } from '../src/types.js';

function createEmptyGraph(): CSGGraph {
  return {
    astNodes: new Map(),
    files: new Map(),
    cfg: { blocks: new Map(), entryBlock: null, exitBlock: null, functionCFGs: new Map() },
    moduleGraph: { imports: [], exports: [], dependencyMap: new Map(), entryPoints: [], cycles: [] },
    routeMap: { endpoints: [], routerTree: new Map(), paramRegistry: new Map() },
    callGraph: { functions: new Map(), calls: [], entryPoints: [], unresolved: [], asyncChains: [] },
    dimensionIndex: new Map(),
    diagnostics: [],
  };
}

// ════════════════════════════════════════════
//  PART 1: HOMOMORPHIC AST FINGERPRINTING
// ════════════════════════════════════════════

const VULNERABLE_CODE_SAMPLES: Array<{ name: string; code: string }> = [
  {
    name: 'idor_get_user',
    code: `
function getUser(req, res) {
  const userId = req.params.id;
  db.query("SELECT * FROM users WHERE id = " + userId, (err, result) => {
    res.json(result);
  });
}`,
  },
  {
    name: 'idor_get_user_v2',
    code: `
function fetchProfile(request, response) {
  const profileId = request.params.id;
  database.query("SELECT * FROM profiles WHERE id = " + profileId, (err, data) => {
    response.json(data);
  });
}`,
  },
  {
    name: 'safe_get_user',
    code: `
function getUserSafe(req, res) {
  const userId = req.params.id;
  const sessionUser = req.session.userId;
  if (sessionUser !== userId && !req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  db.query("SELECT * FROM users WHERE id = ?", [userId], (err, result) => {
    res.json(result);
  });
}`,
  },
  {
    name: 'prototype_pollution',
    code: `
function mergeObjects(target, source) {
  for (const key in source) {
    target[key] = source[key];
  }
  return target;
}`,
  },
  {
    name: 'safe_merge',
    code: `
function safeMerge(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      Object.defineProperty(target, key, {
        value: source[key],
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  }
  return target;
}`,
  },
  {
    name: 'ssrf_vulnerable',
    code: `
async function fetchUrl(req, res) {
  const url = req.query.url;
  const response = await fetch(url);
  const data = await response.text();
  res.send(data);
}`,
  },
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  HOMOMORPHIC AST FINGERPRINTING — Structural Clone Detection');
console.log('═══════════════════════════════════════════════════════════════\n');

const parser = new Parser();
const detector = new CloneDetector();
const fingerprints: Array<{ name: string; fp: ReturnType<typeof fingerprintFunction> }> = [];

for (const sample of VULNERABLE_CODE_SAMPLES) {
  const parsed = parser.parseContent(sample.code, `demo:${sample.name}`, 'js');

  const fnNode = (parsed.ast as any).program.body.find(
    (n: any) => n.type === 'FunctionDeclaration'
  ) as any;

  if (fnNode) {
    const fp = fingerprintFunction(
      sample.name,
      fnNode.body,
      fnNode.loc ? { start: { line: fnNode.loc.start.line }, end: { line: fnNode.loc.end.line } } : null
    );

    fingerprints.push({ name: sample.name, fp });
    detector.ingest(fp);

    const vulnClass = sample.name.includes('safe') || sample.name.includes('safe')
      ? ' (CLEAN)'
      : sample.name.includes('idor') ? ' (IDOR PATTERN)' 
      : sample.name.includes('prototype') ? ' (PROTOTYPE POLLUTION PATTERN)'
      : sample.name.includes('ssrf') ? ' (SSRF PATTERN)'
      : '';

    console.log(`\n── ${sample.name}${vulnClass} ──`);
    console.log(`  Structural Hash: ${fp.structuralHash.slice(0, 16)}...`);
    console.log(`  Topological Shape: ${fp.topologicalShape.slice(0, 80)}...`);
    console.log(`  Depth: ${fp.depth}, Nodes: ${fp.nodeCount}`);
    console.log(`  MinHash Sig (first 8): [${fp.minHashSig.slice(0, 8).join(', ')}]`);
    console.log(`  Node Types: ${JSON.stringify(Object.fromEntries(fp.nodeTypeHistogram))}`);
  }
}

console.log('\n───────────────────────────────────────────────────────────────');
console.log('  CLONE DETECTION — Cross-Comparison');
console.log('───────────────────────────────────────────────────────────────\n');

for (let i = 0; i < fingerprints.length; i++) {
  for (let j = i + 1; j < fingerprints.length; j++) {
    const a = fingerprints[i];
    const b = fingerprints[j];
    const result = compareFingerprints(a.fp, b.fp);
    const dist = fingerprintDistance(a.fp, b.fp);

    if (result.similarity > 0.3) {
      const label = result.structuralMatch
        ? '⚠️ EXACT STRUCTURAL MATCH (clone)'
        : result.similarity > 0.7
        ? '🔴 HIGH SIMILARITY (near-clone)'
        : result.similarity > 0.5
        ? '🟡 MODERATE SIMILARITY'
        : '🟢 LOW SIMILARITY';

      console.log(`  ${a.name} <-> ${b.name}`);
      console.log(`    ${label}`);
      console.log(`    Similarity: ${(result.similarity * 100).toFixed(1)}%, Distance: ${dist.toFixed(3)}`);
      console.log(`    Depth ratio: ${result.depthRatio.toFixed(2)}, Node ratio: ${result.nodeRatio.toFixed(2)}`);
    }
  }
}

console.log('\n───────────────────────────────────────────────────────────────');
console.log('  VULNERABILITY PATTERN MATCHING');
console.log('───────────────────────────────────────────────────────────────\n');

for (const { name, fp } of fingerprints) {
  const vulns = detector.detectVulnerabilities(fp);
  if (vulns.length > 0) {
    console.log(`  ${name}:`);
    for (const v of vulns) {
      const status = v.matchScore >= 0.85 ? '🛑 MATCH' : v.isZeroDay ? '⚠️  ZERO-DAY CANDIDATE' : 'ℹ️  LOW CONFIDENCE';
      console.log(`    [${status}] ${v.matchedPattern.name} (${v.matchedPattern.class})`);
      console.log(`    Score: ${(v.matchScore * 100).toFixed(1)}% | CWE: ${v.matchedPattern.cwe}`);
      if (v.reasons.length > 0) {
        console.log(`    Reasons: ${v.reasons.join('; ')}`);
      }
    }
  } else {
    console.log(`  ${name}: ✅ No vulnerability pattern match`);
  }
}

// ════════════════════════════════════════════
//  PART 2: LTL TEMPORAL STATE-SPACE CHECKER
// ════════════════════════════════════════════

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('  LTL TEMPORAL STATE-SPACE CHECKER');
console.log('═══════════════════════════════════════════════════════════════\n');

const DEMO_APP_CODE = `
const express = require('express');
const app = express();

function authorize(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send('Unauthorized');
  req.user = { id: 1, role: 'user' };
  next();
}

function generateToken(req, res) {
  const user = req.user;
  const token = jwt.sign(user, process.env.JWT_SECRET);
  res.json({ token });
}

function getUser(id) {
  return db.query('SELECT * FROM users WHERE id = ?', [id]);
}

function deleteUser(id) {
  return db.query('DELETE FROM users WHERE id = ?', [id]);
}

app.get('/api/user/:id', authorize, (req, res) => {
  const user = getUser(req.params.id);
  res.json(user);
});

app.delete('/api/user/:id', authorize, (req, res) => {
  deleteUser(req.params.id);
  res.json({ deleted: true });
});

app.post('/api/login', (req, res) => {
  const user = db.query('SELECT * FROM users WHERE email = ?', [req.body.email]);
  if (user && bcrypt.compare(req.body.password, user.password_hash)) {
    generateToken(req, res);
  } else {
    res.status(401).send('Invalid credentials');
  }
});
`;

console.log('── Building FSM from application code ──\n');

const parsedApp = parser.parseContent(DEMO_APP_CODE, 'demo:app', 'js');
const graph = createEmptyGraph();

for (const [id, node] of parsedApp.astNodes) {
  graph.astNodes.set(id, node);
}

graph.files.set('demo:app', { size: DEMO_APP_CODE.length, hash: 'demo', language: 'js' });

const cfgBuilder = new CFGBuilder();
cfgBuilder.build([parsedApp], graph);

const checker = new StateSpaceChecker();
const fsm = checker.buildFromGraph(graph, 'DemoApp');

console.log(`FSM States: ${fsm.states.size}`);
console.log(`FSM Events: ${fsm.events.length}`);
console.log(`FSM Propositions: ${[...fsm.propositions].join(', ')}`);
console.log(`FSM Accepting States: ${fsm.acceptingStates.size}`);

const report = checker.analyzeFSM(fsm);
console.log(`\nState-Space Analysis:`);
console.log(`  Unreachable States: ${report.unreachableStates.length > 0 ? report.unreachableStates.join(', ') : 'None ✅'}`);
console.log(`  Deadlock States: ${report.deadlockStates.length > 0 ? report.deadlockStates.join(', ') : 'None ✅'}`);
console.log(`  Race Conditions: ${report.raceConditions.length > 0 ? report.raceConditions.length : 'None ✅'}`);

console.log('\n── Temporal Property Verification ──\n');

const TEST_PROPERTIES = [
  'G(Authorize -> F(GenerateToken))',
  'G(RequestInput -> F(AuthCheck))',
  'G(Write -> F(Authorize))',
  'F(GenerateToken)',
  'G(Delete -> F(Authorize))',
];

for (const propStr of TEST_PROPERTIES) {
  const result = verifyTemporalProperty(fsm, propStr);
  const status = result.holds ? '✅ HOLDS' : '❌ VIOLATED';
  console.log(`  ${propStr}`);
  console.log(`    ${status} | Verified: ${result.verifiedStates}, Violated: ${result.violatingStates}, Time: ${result.timeMs}ms`);
}

// Full check
const fullResult = checker.fullCheck(fsm, ['G(Authorize -> F(GenerateToken))']);
console.log(`\n── Full State-Space Security Check ──`);
console.log(`  Overall Secure: ${fullResult.overallSecure ? '✅ YES' : '❌ NO'}`);
if (fullResult.vulnerabilities.length > 0) {
  console.log(`  Vulnerabilities Found:`);
  for (const v of fullResult.vulnerabilities) {
    console.log(`    ⚠️  ${v}`);
  }
}

// ── LTL Formula Parser Demo ──
console.log('\n── LTL Formula Parsing ──\n');

const formulas = [
  'G(Authorize -> F(GenerateToken))',
  'G(RequestInput -> F(AuthCheck))',
  'F(GenerateToken)',
  'G(Write -> F(Authorize))',
  'G(Delete -> F(Authorize))',
  'G(AuthCheck)',
];

for (const f of formulas) {
  try {
    const parsed = parseLTL(f);
    const formatted = formatLTL(parsed);
    console.log(`  Input:  ${f}`);
    console.log(`  Parsed: ${formatted}`);
    console.log();
  } catch (err: any) {
    console.log(`  Error parsing '${f}': ${err.message}\n`);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  ANALYSIS COMPLETE');
console.log('═══════════════════════════════════════════════════════════════\n');
