import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CombinedSemanticGraph } from './index.js';

const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h') || args.length === 0;

const usage = `
CSG Analysis Toolkit v2.0 — 10-Dimension Code Analysis

Usage:
  csg <command> [options]

Commands:
  scan         Parse source files and build the semantic graph
  infra        DeploySafe — scan Dockerfiles, CI/CD, K8s manifests
  resilience   FailSafe — analyze try/catch & resilience patterns
  observability ObsCover — trace telemetry coverage
  cognitive    CogFlow — measure cognitive complexity
  architecture ArchScan — detect circular deps & Martin's metrics
  deps         Time-Aware Dependency Calculus — npm registry decay
  reality      RealityCheck — detect mockups, hardcoded data, stubs, placeholders
  all          Run all analysis commands

Options:
  --src <dir>       Source directory to scan (default: ./src)
  --infra <dir>     Infrastructure directory to scan
  --package-json    Path(s) to package.json for dep analysis
  --output <file>   Write JSON report to file
  --help, -h        Show this help

Examples:
  csg scan --src ./myapp/src
  csg infra --infra ./
  csg reality --src ./src
  csg all --src ./src --infra ./deploy --package-json ./package.json
`;

async function main() {
  if (showHelp) {
    console.log(usage);
    process.exit(0);
  }

  const command = args[0];
  const srcDir = getArg('--src') || './src';
  const infraDir = getArg('--infra') || srcDir;
  const pkgJsonPaths = getArgs('--package-json') || [];
  const outputFile = getArg('--output');

  const csg = new CombinedSemanticGraph();

  const results: Record<string, any> = {};

  try {
    if (command === 'scan' || command === 'all') {
      console.log(`\n[1/6] Building Combined Semantic Graph from: ${resolve(srcDir)}`);
      scanDir(csg, srcDir);
      csg.build();
      printSummary(csg);
      results.graph = csg.summary();
    }

    if (command === 'infra' || command === 'all') {
      console.log(`\n[2/6] DeploySafe — Infrastructure Scan`);
      const infraReport = csg.scanInfrastructure(infraDir);
      printInfraReport(infraReport);
      results.deploySafe = infraReport;
    }

    if (command === 'resilience' || command === 'all') {
      console.log(`\n[3/6] FailSafe — Resilience Analysis`);
      if (!csg.getGraph()) { scanDir(csg, srcDir); csg.build(); }
      const fsReport = csg.analyzeResilience();
      printFailSafeReport(fsReport);
      results.failSafe = fsReport;
    }

    if (command === 'observability' || command === 'all') {
      console.log(`\n[4/6] ObsCover — Observability Matrix`);
      if (!csg.getGraph()) { scanDir(csg, srcDir); csg.build(); }
      const obsReport = csg.analyzeObservability();
      printObsCoverReport(obsReport);
      results.obsCover = obsReport;
    }

    if (command === 'cognitive' || command === 'all') {
      console.log(`\n[5/6] CogFlow — Cognitive Load Profiler`);
      if (!csg.getGraph()) { scanDir(csg, srcDir); csg.build(); }
      const cogReport = csg.analyzeCognitiveLoad();
      printCogFlowReport(cogReport);
      results.cogFlow = cogReport;
    }

    if (command === 'architecture' || command === 'all') {
      console.log(`\n[5b/6] ArchScan — Architectural Smell Detection`);
      if (!csg.getGraph()) { scanDir(csg, srcDir); csg.build(); }
      const archReport = csg.analyzeArchitecture();
      printArchScanReport(archReport);
      results.archScan = archReport;
    }

    if (command === 'deps' || command === 'all') {
      console.log(`\n[6/6] Time-Aware Dependency Calculus`);
      if (pkgJsonPaths.length === 0) {
        pkgJsonPaths.push(join(process.cwd(), 'package.json'));
      }
      const depsReport = await csg.analyzeDependencyDecay(pkgJsonPaths);
      printDepsReport(depsReport);
      results.timeAwareDeps = depsReport;
    }

    if (command === 'reality' || command === 'all') {
      console.log(`\n[7/7] RealityCheck — Mockup & Hardcoded Detection`);
      const mockReport = csg.analyzeMockups(srcDir);
      printRealityCheckReport(mockReport);
      results.realityCheck = mockReport;
    }

    if (outputFile) {
      writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf-8');
      console.log(`\nReport written to: ${resolve(outputFile)}`);
    }

    if (command !== 'all' && !['scan','infra','resilience','observability','cognitive','architecture','deps','reality'].includes(command)) {
      console.error(`Unknown command: ${command}`);
      console.log(usage);
      process.exit(1);
    }

    console.log('\nDone.');
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

function getArg(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

function getArgs(name: string): string[] {
  const results: string[] = [];
  let idx = args.indexOf(name);
  while (idx !== -1 && idx + 1 < args.length) {
    const v = args[idx + 1];
    if (v.startsWith('--')) break;
    results.push(v);
    idx = args.indexOf(name, idx + 1);
  }
  return results;
}

function scanDir(csg: CombinedSemanticGraph, dir: string) {
  const { readdirSync, statSync } = require('node:fs');
  const { extname } = require('node:path');
  const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts']);
  function walk(d: string) {
    let entries: string[];
    try { entries = readdirSync(d); } catch { return; }
    for (const e of entries) {
      const full = join(d, e);
      try {
        const s = statSync(full);
        if (s.isDirectory() && !e.startsWith('.') && e !== 'node_modules' && e !== 'dist') walk(full);
        else if (s.isFile() && exts.has(extname(full).toLowerCase())) csg.parseFile(full);
      } catch { /* skip */ }
    }
  }
  walk(dir);
}

function printSummary(csg: CombinedSemanticGraph) {
  const s = csg.summary();
  console.log(`  Files: ${s.files} | AST Nodes: ${s.astNodes} | Functions: ${s.functions}`);
  console.log(`  CFG Blocks: ${s.cfgBlocks} | Routes: ${s.routes} | Imports: ${s.imports}`);
  console.log(`  Call Sites: ${s.callSites} | Cycles: ${s.cycles} | Unresolved Calls: ${s.unresolvedCalls}`);
}

function printInfraReport(r: any) {
  console.log(`  Score: ${r.score}/100 | Docker: ${r.dockerfileIssues} | CI/CD: ${r.cicdIssues} | Secrets: ${r.secretExposures}`);
  for (const f of r.findings) {
    const icon = f.severity === 'critical' ? '🔴' : f.severity === 'high' ? '🟠' : f.severity === 'medium' ? '🟡' : '⚪';
    console.log(`  ${icon} [${f.ruleId}] ${f.message} (${f.file}:${f.line})`);
    console.log(`     Fix: ${f.remediation}`);
  }
}

function printFailSafeReport(r: any) {
  console.log(`  Score: ${r.score}/100 | Try/Catch: ${r.tryCatchBlocks.length} | Empty: ${r.emptyCatchCount} | No Logging: ${r.missingLoggingCount}`);
  for (const t of r.tryCatchBlocks) {
    const issues: string[] = [];
    if (t.hasEmptyCatch) issues.push('EMPTY CATCH');
    if (!t.hasLoggedError) issues.push('NO LOGGING');
    if (!t.hasRetry && t.surroundingApiCall) issues.push('NO RETRY');
    if (!t.hasTimeout && t.surroundingApiCall) issues.push('NO TIMEOUT');
    if (issues.length > 0) {
      console.log(`  ⚠  ${t.file}:${t.line} [${issues.join(', ')}] ${t.surroundingApiCall ? '→ ' + t.surroundingApiCall : ''}`);
    }
  }
}

function printObsCoverReport(r: any) {
  console.log(`  Debt Score: ${r.observabilityDebtScore}/100 | Covered: ${r.coveredPct}%`);
  console.log(`  Total: ${r.totalBlocks} | Covered: ${r.coveredBlocks} | Partial: ${r.partialBlocks} | Uncovered: ${r.uncoveredBlocks}`);
  for (const a of r.recommendedActions) console.log(`  → ${a}`);
}

function printCogFlowReport(r: any) {
  console.log(`  Score: ${r.score}/100 | Max: ${r.maxComplexity} | Avg: ${r.avgComplexity} | High/Extreme: ${r.totalHighComplexity}`);
  for (const f of r.functions.filter((f: any) => f.category === 'high' || f.category === 'extreme')) {
    console.log(`  ⚠  ${f.functionName} (${f.file}:${f.line}) — ${f.complexity} pts [${f.category}]`);
  }
}

function printArchScanReport(r: any) {
  console.log(`  Score: ${r.score}/100 | Trend: ${r.instabilityTrend}`);
  console.log(`  Circular Deps: ${r.circularDependencies.length} | Hotspots: ${r.hotSpots.length}`);
  for (const c of r.circularDependencies) {
    console.log(`  🔄 Cycle: ${c.cycle.join(' → ')}`);
  }
  for (const h of r.hotSpots.slice(0, 10)) {
    console.log(`  🔥 ${h.file} I=${h.instability} D=${h.distance}`);
  }
}

function printDepsReport(r: any) {
  console.log(`  Score: ${r.score}/100 | Total: ${r.totalDeps} | Deprecated: ${r.deprecatedCount} | Stale: ${r.staleCount} | Vulnerable: ${r.vulnerableCount}`);
  console.log(`  Mean Decay: ${r.meanDecayDays}d | Mean Maintainers: ${r.meanMaintainers}`);
  for (const p of r.packages.filter((p: any) => p.deprecated || p.daysSinceLastPublish > 365 || p.openVulnerabilities > 0)) {
    const reasons: string[] = [];
    if (p.deprecated) reasons.push('DEPRECATED');
    if (p.daysSinceLastPublish > 365) reasons.push(`${p.daysSinceLastPublish}d stale`);
    if (p.openVulnerabilities > 0) reasons.push(`${p.openVulnerabilities} vulns`);
    console.log(`  ⚠  ${p.name}@${p.currentVersion} [${reasons.join(', ')}]`);
  }
}

function printRealityCheckReport(r: any) {
  console.log(`  Score: ${r.score}/100 | Files: ${r.totalFilesScanned}`);
  console.log(`  Mock Data: ${r.mockDataCount} | Fake Endpoints: ${r.fakeEndpointCount} | Stubs: ${r.stubFunctionCount}`);
  console.log(`  Dummy Auth: ${r.dummyAuthCount} | Hardcoded Env: ${r.hardcodedEnvCount}`);
  if (r.productRealityNarrative) {
    console.log(`\n  Product Reality: ${r.productRealityNarrative}`);
  }
  if (r.topRecommendations && r.topRecommendations.length > 0) {
    console.log(`\n  Top Fix Recommendations:`);
    for (const rec of r.topRecommendations) {
      console.log(`    → ${rec}`);
    }
  }
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const sorted = [...(r.findings || [])].sort((a: any, b: any) => (sevOrder[a.severity] ?? 99) - (sevOrder[b.severity] ?? 99));
  for (const f of sorted.slice(0, 30)) {
    const icon = f.severity === 'critical' ? '🔴' : f.severity === 'high' ? '🟠' : f.severity === 'medium' ? '🟡' : '⚪';
    console.log(`  ${icon} [${f.severity}] ${f.pattern} — ${f.file}:${f.line} (${(f.confidence * 100).toFixed(0)}% confidence)`);
    if (f.fixPrompt) console.log(`     Fix: ${f.fixPrompt.slice(0, 150)}`);
  }
  if (r.findings && r.findings.length > 30) {
    console.log(`  ... and ${r.findings.length - 30} more findings`);
  }
}

main();
