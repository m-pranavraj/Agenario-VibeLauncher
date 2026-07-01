import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { Command } from 'commander';
import { CombinedSemanticGraph } from './index.js';
import type { ParseResult } from './types.js';
import { createRuleEngine } from './analysis/rules/index.js';
import { toSarif } from './serialization/sarif.js';
import { toHtml } from './serialization/html-report.js';
import { AutoPwnGenerator, ExploitWriter } from './analysis/autopwn/exploit-generator.js';

const program = new Command();

program
  .name('csg')
  .description('Agenario CSG — 10-Dimension Code Analysis Toolkit')
  .version('2.0.0');

program
  .command('scan')
  .description('Parse source files and build the semantic graph')
  .option('--src <dir>', 'Source directory to scan', './src')
  .option('--output <file>', 'Write JSON report to file')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    const csg = new CombinedSemanticGraph();
    scanDir(csg, opts.src);
    csg.build();
    const s = csg.summary();
    if (opts.json || opts.output) {
      const out = JSON.stringify(s, null, 2);
      if (opts.output) { writeFileSync(opts.output, out, 'utf-8'); console.log(`Written to ${opts.output}`); }
      else console.log(out);
    } else {
      console.log(`\n[CSG Scan] ${resolve(opts.src)}`);
      console.log(`  Files: ${s.files} | AST Nodes: ${s.astNodes} | Functions: ${s.functions}`);
      console.log(`  CFG Blocks: ${s.cfgBlocks} | Routes: ${s.routes} | Imports: ${s.imports}`);
      console.log(`  Call Sites: ${s.callSites} | Cycles: ${s.cycles} | Unresolved Calls: ${s.unresolvedCalls}`);
    }
  });

program
  .command('agenario')
  .description('Run Agenario rule engine across all 4 pillars (343+ rules)')
  .option('--src <dir>', 'Source directory to scan', './src')
  .option('--categories <cats>', 'Comma-separated categories to run (e.g., security-injection,ux-accessibility)')
  .option('--output <file>', 'Write JSON report to file')
  .option('--sarif <file>', 'Write SARIF report to file (GitHub Code Scanning)')
  .option('--html <file>', 'Write HTML report to file')
  .option('--autopwn', 'Generate Auto-Pwn exploits')
  .option('--autopwn-dir <dir>', 'Auto-Pwn output directory', 'autopwn-output')
  .option('--severity-threshold <level>', 'Minimum severity: critical|high|medium|low|info', 'low')
  .action(async (opts) => {
    const csg = new CombinedSemanticGraph();
    scanDir(csg, opts.src);
    csg.build();
    const graph = csg.getGraph()!;

    const engine = createRuleEngine();
    const parsed = (csg as any).parsed as ParseResult[];

    const categories = opts.categories ? opts.categories.split(',').map((s: string) => s.trim()) : undefined;
    const report = await engine.execute(parsed, graph, categories ? { categories } : undefined);
    const { findings, totalFindings, totalRules, bySeverity, byCategory } = report;

    console.log(`\n[Agenario Scan] ${resolve(opts.src)}`);
    console.log(`  Total Findings: ${totalFindings}  |  Total Rules: ${totalRules}`);
    console.log(`  By Severity: ${Object.entries(bySeverity).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    console.log(`  By Category: ${Object.entries(byCategory).map(([k, v]) => `${k}=${v}`).join(', ')}`);

    const thresholdLevels: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    const threshold = thresholdLevels[opts.severityThreshold] ?? 3;
    const filtered = findings.filter(f => (thresholdLevels[f.severity] ?? 4) <= threshold);

    if (opts.output) {
      writeFileSync(opts.output, JSON.stringify({ totalFindings, totalRules, bySeverity, byCategory, findings }, null, 2), 'utf-8');
      console.log(`\nJSON report → ${resolve(opts.output)}`);
    }

    if (opts.sarif) {
      writeFileSync(opts.sarif, toSarif(report), 'utf-8');
      console.log(`SARIF report → ${resolve(opts.sarif)}`);
    }

    if (opts.html) {
      writeFileSync(opts.html, toHtml(report), 'utf-8');
      console.log(`HTML report → ${resolve(opts.html)}`);
    }

    if (opts.autopwn) {
      const autopwn = new AutoPwnGenerator();
      const writer = new ExploitWriter();
      const allFormats: Array<'curl' | 'supertest' | 'playwright' | 'python' | 'bash' | 'httpie'> =
        ['curl', 'supertest', 'playwright', 'python', 'bash', 'httpie'];
      const exploits = autopwn.generateAll(filtered, allFormats);
      const count = writer.writeAll(exploits, opts.autopwnDir);
      console.log(`Auto-Pwn: ${count} exploit files → ${resolve(opts.autopwnDir)}/`);
    }

    if (filtered.length > 0 && !opts.output && !opts.sarif && !opts.html) {
      console.log('\n  Top Findings:');
      for (const f of filtered.slice(0, 15)) {
        console.log(`    [${f.severity.padEnd(8)}] ${f.title}`);
        console.log(`           ${f.file}:${f.line}`);
      }
      if (filtered.length > 15) console.log(`    ... and ${filtered.length - 15} more`);
    }
  });

program
  .command('infra')
  .description('DeploySafe — scan Dockerfiles, CI/CD, K8s manifests')
  .option('--infra <dir>', 'Infrastructure directory', './')
  .action(async (opts) => {
    const csg = new CombinedSemanticGraph();
    console.log(`\n[Infra Scan] ${resolve(opts.infra)}`);
    const r = csg.scanInfrastructure(opts.infra);
    console.log(`  Score: ${r.score}/100 | Docker: ${r.dockerfileIssues} | CI/CD: ${r.cicdIssues} | Secrets: ${r.secretExposures}`);
  });

program
  .command('resilience')
  .description('FailSafe — analyze try/catch & resilience patterns')
  .option('--src <dir>', 'Source directory', './src')
  .action(async (opts) => {
    const csg = new CombinedSemanticGraph();
    scanDir(csg, opts.src); csg.build();
    const r = csg.analyzeResilience();
    console.log(`\n[FailSafe] Score: ${r.score}/100`);
    console.log(`  Try/Catch: ${r.tryCatchBlocks.length} | Empty: ${r.emptyCatchCount} | No Logging: ${r.missingLoggingCount}`);
  });

program
  .command('deps')
  .description('Time-Aware Dependency Calculus — npm registry decay')
  .option('--package-json <paths...>', 'Path(s) to package.json')
  .action(async (opts) => {
    const csg = new CombinedSemanticGraph();
    const paths = opts.packageJson && opts.packageJson.length > 0
      ? opts.packageJson : [join(process.cwd(), 'package.json')];
    const r = await csg.analyzeDependencyDecay(paths);
    console.log(`\n[Deps] Score: ${r.score}/100 | Deprecated: ${r.deprecatedCount} | Stale: ${r.staleCount} | Vulnerable: ${r.vulnerableCount}`);
  });

program
  .command('reality')
  .description('RealityCheck — detect mockups, hardcoded data, stubs, placeholders')
  .option('--src <dir>', 'Source directory', './src')
  .action(async (opts) => {
    const csg = new CombinedSemanticGraph();
    const r = csg.analyzeMockups(opts.src);
    console.log(`\n[RealityCheck] Score: ${r.score}/100`);
    console.log(`  Mock Data: ${r.mockDataCount} | Stubs: ${r.stubFunctionCount} | Dummy Auth: ${r.dummyAuthCount}`);
  });

program
  .command('all')
  .description('Run all analysis commands')
  .option('--src <dir>', 'Source directory', './src')
  .option('--infra <dir>', 'Infrastructure directory')
  .option('--package-json <paths...>', 'Path(s) to package.json')
  .option('--output <file>', 'Write JSON report')
  .option('--sarif <file>', 'Write SARIF report')
  .option('--html <file>', 'Write HTML report')
  .option('--autopwn', 'Generate Auto-Pwn exploits')
  .action(async (opts) => {
    const srcDir = opts.src;
    const infraDir = opts.infra || srcDir;
    const csg = new CombinedSemanticGraph();
    scanDir(csg, srcDir);
    csg.build();
    const graph = csg.getGraph()!;

    console.log(`\n[CSG] ${resolve(srcDir)}`);
    const s = csg.summary();
    console.log(`  Files: ${s.files} | AST Nodes: ${s.astNodes} | Functions: ${s.functions}`);

    const engine = createRuleEngine();
    const parsed = (csg as any).parsed as ParseResult[];
    const report = await engine.execute(parsed, graph);

    console.log(`\n[Agenario] Findings: ${report.totalFindings} | Rules: ${report.totalRules}`);
    console.log(`  ${Object.entries(report.bySeverity).map(([k, v]) => `${k}=${v}`).join(', ')}`);

    const results: Record<string, unknown> = {
      graphSummary: s,
      agenario: { totalFindings: report.totalFindings, totalRules: report.totalRules, bySeverity: report.bySeverity, byCategory: report.byCategory },
    };

    if (opts.output) {
      writeFileSync(opts.output, JSON.stringify({ ...results, findings: report.findings }, null, 2), 'utf-8');
      console.log(`JSON → ${resolve(opts.output)}`);
    }
    if (opts.sarif) {
      writeFileSync(opts.sarif, toSarif(report), 'utf-8');
      console.log(`SARIF → ${resolve(opts.sarif)}`);
    }
    if (opts.html) {
      writeFileSync(opts.html, toHtml(report), 'utf-8');
      console.log(`HTML → ${resolve(opts.html)}`);
    }
    if (opts.autopwn) {
      const autopwn = new AutoPwnGenerator();
      const writer = new ExploitWriter();
      const allFormats: Array<'curl' | 'supertest' | 'playwright' | 'python' | 'bash' | 'httpie'> =
        ['curl', 'supertest', 'playwright', 'python', 'bash', 'httpie'];
      const exploits = autopwn.generateAll(report.findings, allFormats);
      const count = writer.writeAll(exploits, 'autopwn-output');
      console.log(`Auto-Pwn: ${count} files → autopwn-output/`);
    }
  });

function scanDir(csg: CombinedSemanticGraph, dir: string) {
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

program.parse(process.argv);
