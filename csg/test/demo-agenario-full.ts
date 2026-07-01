/**
 * AGENARIO — Full Engine Demo
 * ===========================
 * Demonstrates the complete 4-pillar rule engine integrated
 * with the existing CSG (Combined Semantic Graph) analysis.
 *
 * Run: npx tsx test/demo-agenario-full.ts
 */

import { CombinedSemanticGraph } from '../src/index.js';
import { createRuleEngine } from '../src/analysis/rules/index.js';
import { AutoPwnGenerator, ExploitWriter } from '../src/analysis/autopwn/exploit-generator.js';

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     AGENARIO — Continuous Verification       ║');
  console.log('║          Full Engine Demo v2.0              ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ── Step 1: Initialize CSG Engine (10 dimensions) ──
  console.log('[1/4] Initializing CSG Engine...');
  const csg = new CombinedSemanticGraph({
    jsx: true,
    typescript: true,
    decorators: true,
  });

  // ── Step 2: Load vulnerable test fixtures ──
  console.log('[2/4] Loading test fixtures...');
  const testFiles = [
    // Security vulnerabilities
    { code: insecureSQLLogin(), file: 'src/routes/auth.ts' },
    { code: insecureNoSQLLogin(), file: 'src/routes/login.ts' },
    { code: insecureCommandExec(), file: 'src/utils/exec.ts' },
    { code: insecureJWT(), file: 'src/middleware/jwt.ts' },
    { code: insecurePrototype(), file: 'src/utils/merge.ts' },
    { code: insecureCORS(), file: 'src/app.ts' },
    // Performance issues
    { code: nPlusOneQuery(), file: 'src/services/users.ts' },
    { code: syncBlocking(), file: 'src/routes/api.ts' },
    { code: reactLeak(), file: 'src/components/Chat.tsx' },
    // UX issues
    { code: missingA11y(), file: 'src/components/Button.tsx' },
    { code: silentCatch(), file: 'src/hooks/useData.ts' },
    // Compliance issues
    { code: piiLeak(), file: 'src/services/logging.ts' },
    { code: missingAudit(), file: 'src/routes/admin.ts' },
    { code: cookieConsent(), file: 'src/App.tsx' },
  ];

  for (const tf of testFiles) {
    const lang = tf.file.endsWith('.tsx') ? 'tsx' : tf.file.endsWith('.ts') ? 'ts' : 'js';
    csg.parseSource(tf.code, tf.file, lang as any);
  }

  // ── Step 3: Build the CSG Graph ──
  console.log('[3/4] Building Combined Semantic Graph...');
  const graph = csg.build();

  const summary = csg.summary();
  console.log(`  • Files parsed: ${summary.files}`);
  console.log(`  • AST nodes: ${summary.astNodes}`);
  console.log(`  • CFG blocks: ${summary.cfgBlocks}`);
  console.log(`  • Functions: ${summary.functions}`);
  console.log(`  • Routes: ${summary.routes}`);
  console.log(`  • Imports: ${summary.imports}`);

  // ── Step 4: Run Rule Engine (all 4 pillars) ──
  console.log('\n[4/4] Running Agenario Rule Engine...');
  const engine = createRuleEngine();
  const report = await engine.execute(csg['parsed'], graph);

  console.log(`\n  ═══════ AGENARIO SCAN RESULTS ═══════`);
  console.log(`  Total Findings: ${report.totalFindings}`);
  console.log(`  Total Rules Loaded: ${report.totalRules}`);

  console.log(`\n  ── By Severity ──`);
  for (const [sev, count] of Object.entries(report.bySeverity)) {
    if (count > 0) console.log(`    ${sev.padEnd(10)}: ${count}`);
  }

  console.log(`\n  ── By Category ──`);
  for (const [cat, count] of Object.entries(report.byCategory)) {
    if (count > 0) console.log(`    ${cat.padEnd(28)}: ${count}`);
  }

  console.log(`\n  ── Taint Paths Tracked ──`);
  for (const tp of report.taintPaths.slice(0, 10)) {
    console.log(`    ${tp.variable}: ${tp.sources.join(' → ')} → ${tp.sinks.join(', ')} (${tp.sliceCount} slices)`);
  }

  // ── Step 5: Auto-Pwn Exploit Generation ──
  console.log(`\n  ── Auto-Pwn Exploits Generated ──`);
  const pwnGen = new AutoPwnGenerator();
  const exploits = pwnGen.generateAll(report.findings, ['curl', 'supertest']);
  for (const exp of exploits) {
    console.log(`    [${exp.strategy.padEnd(20)}] ${exp.description.slice(0, 60)}...`);
  }
  const writer = new ExploitWriter();
  const files = writer.writeAll(exploits, './autopwn-output');
  console.log(`    Written ${files.length} files to autopwn-output/`);

  // ── Print Top 10 Critical Findings ──
  console.log(`\n  ── Top Critical/High Findings ──`);
  const criticalHigh = report.findings
    .filter(f => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 10);

  for (const f of criticalHigh) {
    console.log(`    [${f.severity.padEnd(8)}] ${f.title.slice(0, 70)}`);
    console.log(`           ${f.file}:${f.line}`);
    if (f.exploitPayload) console.log(`           Payload: ${f.exploitPayload.slice(0, 80)}`);
    console.log();
  }

  console.log(`\n  Done. ${report.totalFindings} findings from ${report.totalRules} rules.`);
}

/* ─── Vulnerability Fixtures ─── */

function insecureSQLLogin(): string {
  return `
import { Pool } from 'pg';
const pool = new Pool();

export async function login(req: any, res: any) {
  const { email, password } = req.body;
  const query = \`SELECT * FROM users WHERE email = '\${email}' AND password = '\${password}'\`;
  const result = await pool.query(query);
  if (result.rows.length > 0) {
    res.json({ token: 'fake-jwt-' + Math.random() });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}
`;
}

function insecureNoSQLLogin(): string {
  return `
import { MongoClient } from 'mongodb';

export async function loginHandler(req: any, res: any) {
  const db = MongoClient.connect('mongodb://localhost:27017');
  const user = await db.collection('users').findOne({
    email: req.body.email,
    password: req.body.password
  });
  if (user) {
    res.json({ token: 'fake-jwt' });
  } else {
    res.status(401).json({ error: 'Invalid' });
  }
}
`;
}

function insecureCommandExec(): string {
  return `
import { exec } from 'child_process';

export async function pingHandler(req: any, res: any) {
  const ip = req.query.ip;
  exec(\`ping \${ip}\`, (err, stdout) => {
    res.send(stdout);
  });
}
`;
}

function insecureJWT(): string {
  return `
import jwt from 'jsonwebtoken';

export function verifyToken(token: string, publicKey: string) {
  return jwt.verify(token, publicKey, { algorithms: ['HS256', 'RS256'] });
}
`;
}

function insecurePrototype(): string {
  return `
export function mergeConfig(defaults: any, overrides: any) {
  return { ...defaults, ...overrides };
}

app.post('/config', (req, res) => {
  const config = mergeConfig({ theme: 'light' }, req.body);
  res.json(config);
});
`;
}

function insecureCORS(): string {
  return `
import cors from 'cors';
app.use(cors({ origin: '*', credentials: true }));
`;
}

function nPlusOneQuery(): string {
  return `
import { prisma } from './db';

export async function getUsersWithPosts() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    user.posts = await prisma.post.findMany({ where: { userId: user.id } });
  }
  return users;
}
`;
}

function syncBlocking(): string {
  return `
import fs from 'fs';
import bcrypt from 'bcrypt';

app.post('/register', (req, res) => {
  const data = fs.readFileSync('/etc/config.json');
  const hash = bcrypt.hashSync(req.body.password, 10);
  res.json({ hash });
});
`;
}

function reactLeak(): string {
  return `
import { useEffect } from 'react';

function ChatComponent() {
  useEffect(() => {
    const ws = new WebSocket('wss://chat.example.com');
    window.addEventListener('resize', () => {
      ws.send(JSON.stringify({ type: 'resize' }));
    });
  }, []);
  return <div>Chat</div>;
}
`;
}

function missingA11y(): string {
  return `
function IconButton() {
  return (
    <div onClick={() => alert('clicked')}>
      <svg><circle cx="12" cy="12" r="10" /></svg>
    </div>
  );
}
`;
}

function silentCatch(): string {
  return `
import { useEffect } from 'react';

function useData(url: string) {
  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .catch(err => console.error(err));
  }, [url]);
}
`;
}

function piiLeak(): string {
  return `
const userSchema = {
  email: { type: 'string' },
  ssn: { type: 'string', encrypted: true },
  medicalRecord: { type: 'string' },
};

function logUser(user: any) {
  console.log('User data:', JSON.stringify(user));
}
`;
}

function missingAudit(): string {
  return `
app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  await prisma.user.delete({ where: { id: userId } });
  res.json({ success: true });
});
`;
}

function cookieConsent(): string {
  return `
function App() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX';
    document.head.appendChild(script);
  }, []);
  return <div>My App</div>;
}
`;
}

main().catch(console.error);
