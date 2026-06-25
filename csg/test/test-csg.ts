import { CombinedSemanticGraph } from '../src/index.js';

// ──────────────────────────────────────────────
// Test: Combined Semantic Graph — Full Pipeline
// ──────────────────────────────────────────────

const __dirname = new URL('.', import.meta.url).pathname;
const fixturesDir = `${__dirname}fixtures`.replace(/^\/([A-Z]:)/, '$1');

const files = [
  `${fixturesDir}/server.js`,
  `${fixturesDir}/users.js`,
  `${fixturesDir}/middleware.js`,
  `${fixturesDir}/utils.ts`,
];

console.log('\n═══════════════════════════════════════');
console.log('  Combined Semantic Graph — Test Suite');
console.log('═══════════════════════════════════════\n');

// ── Build the CSG ──
console.log('📂 Parsing files...');
const csg = new CombinedSemanticGraph({
  jsx: false,
  typescript: true,
  decorators: false,
});

for (const f of files) {
  console.log(`   → ${f.split(/[/\\]/).pop()}`);
  csg.parseFile(f);
}

console.log('\n🔨 Building Combined Semantic Graph...');
const graph = csg.build();

// ── Summary ──
console.log('\n📊 Graph Summary:');
const s = csg.summary();
console.log(JSON.stringify(s, null, 2));

// ── Validate each dimension ──
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`   ✅ ${label}`);
    passed++;
  } else {
    console.log(`   ❌ ${label}`);
    failed++;
  }
}

console.log('\n── Dimension 1: Control Flow Graph ──');
check('CFG has blocks', graph.cfg.blocks.size > 0);
check('CFG has entry block', graph.cfg.entryBlock !== null);
check('CFG has exit block', graph.cfg.exitBlock !== null);
check('CFG has function CFGs', graph.cfg.functionCFGs.size > 0);

console.log('\n── Dimension 2: Module Dependencies ──');
check('Has import edges', graph.moduleGraph.imports.length > 0);
check('Has export edges', graph.moduleGraph.exports.length > 0);
check('Has dependency map', graph.moduleGraph.dependencyMap.size > 0);

console.log('\n── Dimension 3: Route Map ──');
check('Has route endpoints', graph.routeMap.endpoints.length > 0);
check('Routes have params', graph.routeMap.endpoints.some(e => e.params.length > 0));
check('Has unique paths', new Set(graph.routeMap.endpoints.map(e => e.path)).size > 0);

console.log('\n── Dimension 4: Call Graph ──');
check('Has function scopes', graph.callGraph.functions.size > 0);
check('Has call sites', graph.callGraph.calls.length > 0);
check('Has entry points', graph.callGraph.entryPoints.length > 0);

console.log('\n── Cross-Dimension Index ──');
check('Dimension index populated', graph.dimensionIndex.size > 0);
check('Has CFG-dimensioned nodes', [...graph.dimensionIndex.values()].some(d => d.has('cfg')));
check('Has module-dimensioned nodes', [...graph.dimensionIndex.values()].some(d => d.has('module')));
check('Has call-dimensioned nodes', [...graph.dimensionIndex.values()].some(d => d.has('call')));

// ── Cycle detection ──
console.log('\n── Cycle Detection ──');
check('No cycles detected (or handled)', graph.moduleGraph.cycles.length <= 10);

// ── Serialization smoke tests ──
console.log('\n── Serialization ──');
const dot = csg.toDot({ colors: true });
check('DOT output generated', dot.length > 0 && dot.includes('digraph'));
const json = csg.toJSON();
check('JSON output generated', json.length > 0 && json.includes('version'));
const mermaid = csg.toMermaid({ showCFG: true, showModule: true, showRoutes: true, showCalls: true });
check('Mermaid output generated', mermaid.length > 0 && mermaid.includes('flowchart'));

// ── Diagnostics ──
console.log('\n── Diagnostics ──');
const diags = csg.getDiagnostics();
if (diags.length > 0) {
  for (const d of diags) {
    console.log(`   ${d.severity === 'error' ? '🔴' : '🟡'} [${d.code}] ${d.message}`);
  }
} else {
  console.log('   ✅ No diagnostics');
}

// ── Detailed dump (sampled) ──
console.log('\n── Route Map Details ──');
for (const ep of graph.routeMap.endpoints) {
  const params = ep.params.length ? ` [params: ${ep.params.map(p => p.pattern).join(', ')}]` : '';
  console.log(`   ${ep.method} ${ep.path}${params} → ${ep.handlerName || '(anon)'}`);
}

console.log('\n── Call Graph Details (first 10) ──');
let callCount = 0;
for (const call of graph.callGraph.calls) {
  if (callCount++ >= 10) break;
  const callerName = graph.callGraph.functions.get(call.caller)?.name || '?';
  const calleeName = call.calleeName || graph.callGraph.functions.get(call.callee)?.name || '?';
  console.log(`   ${callerName} → ${calleeName}${call.isAsync ? ' [async]' : ''}`);
}

console.log('\n── Function Scopes ──');
for (const [id, fn] of graph.callGraph.functions) {
  const children = fn.childScopes.length > 0 ? ` [children: ${fn.childScopes.length}]` : '';
  console.log(`   ${fn.name || '(anonymous)'} (${fn.type})${fn.isExported ? ' [exported]' : ''}${children}`);
}

// ── Final verdict ──
console.log(`\n═══════════════════════════════════════`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`═══════════════════════════════════════\n`);

if (failed > 0) process.exit(1);
