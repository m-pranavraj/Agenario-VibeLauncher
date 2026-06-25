import type { CSGGraph } from '../types.js';

export function toMermaid(graph: CSGGraph, options?: {
  showCFG?: boolean;
  showModule?: boolean;
  showRoutes?: boolean;
  showCalls?: boolean;
}): string {
  const cfg = options?.showCFG ?? true;
  const mod = options?.showModule ?? true;
  const routes = options?.showRoutes ?? true;
  const calls = options?.showCalls ?? true;

  const lines: string[] = [];
  lines.push('---');
  lines.push('title: Combined Semantic Graph');
  lines.push('---');
  lines.push('');

  // ── Module Dependencies ──
  if (mod && graph.moduleGraph.imports.length > 0) {
    lines.push('%% Module Dependency Graph');
    lines.push('flowchart LR');
    lines.push('  subgraph Modules["📦 Module Dependencies"]');
    lines.push('    direction LR');

    const addedFiles = new Set<string>();
    for (const imp of graph.moduleGraph.imports) {
      const srcId = mermaidId(imp.source);
      const tgtId = mermaidId(imp.target);
      if (!addedFiles.has(imp.source)) {
        lines.push(`    ${srcId}["${shortPath(imp.source)}"]`);
        addedFiles.add(imp.source);
      }
      if (!addedFiles.has(imp.target)) {
        lines.push(`    ${tgtId}["${shortPath(imp.target)}"]`);
        addedFiles.add(imp.target);
      }
      const style = imp.isDynamic ? '-.->' : '-->';
      const label = imp.isDynamic ? '|dynamic|' : `|${imp.type}|`;
      lines.push(`    ${srcId} ${style} ${label} ${tgtId}`);
    }

    if (graph.moduleGraph.cycles.length > 0) {
      lines.push('  end');
      lines.push('');
      lines.push('  %% Cycles detected');
      for (const cycle of graph.moduleGraph.cycles) {
        const pathStr = cycle.map(p => shortPath(p)).join(' → ');
        lines.push(`  note["⚠️ Cycle: ${pathStr}"]`);
      }
    }

    lines.push('  end');
    lines.push('');
  }

  // ── Routes ──
  if (routes && graph.routeMap.endpoints.length > 0) {
    lines.push('%% Route Map');
    lines.push('flowchart TD');
    lines.push('  subgraph Routes["🛣️ Route Map"]');
    lines.push('    direction TB');

    for (const ep of graph.routeMap.endpoints) {
      const id = `route_${mermaidId(ep.id)}`;
      const params = ep.params.length > 0 ? ` [${ep.params.map(p => p.pattern).join(', ')}]` : '';
      const label = `${ep.method} ${ep.path}${params}`;
      const shape = ep.method === 'GET' ? 'round' : 'stadium';
      lines.push(`    ${id}("${label}")`);
    }

    lines.push('  end');
    lines.push('');
  }

  // ── Call Graph ──
  if (calls && graph.callGraph.calls.length > 0) {
    lines.push('%% Call Graph');
    lines.push('flowchart TD');
    lines.push('  subgraph Calls["📞 Call Graph"]');
    lines.push('    direction TB');

    const addedFns = new Set<string>();
    for (const [id, fn] of graph.callGraph.functions) {
      if (!addedFns.has(id)) {
        const name = fn.name || '(anonymous)';
        const params = fn.params.slice(0, 3).join(', ') + (fn.params.length > 3 ? '...' : '');
        const extra = fn.async ? '⚡' : fn.generator ? '🔄' : '';
        const label = `${name}(${params})${extra}`;
        const shape = fn.isExported ? '(( )) ' : '( )';
        lines.push(`    fn_${mermaidId(id)}${shape}"${label}"`);
        addedFns.add(id);
      }
    }

    for (const call of graph.callGraph.calls) {
      if (call.caller && call.callee) {
        const style = call.isAsync ? '-.->' : '-->';
        const label = '';
        lines.push(`    fn_${mermaidId(call.caller)} ${style} ${call.calleeName ? `|${call.calleeName}|` : ''} fn_${mermaidId(call.callee)}`);
      }
    }

    lines.push('  end');
    lines.push('');
  }

  // ── CFG ──
  if (cfg && graph.cfg.blocks.size > 0) {
    lines.push('%% Control Flow Graph');
    lines.push('flowchart TD');
    lines.push('  subgraph CFG["🔀 Control Flow Graph"]');
    lines.push('    direction TB');

    // Group by function
    const fnGroups = new Map<string, string[]>();
    for (const [fnId, fnCFG] of graph.cfg.functionCFGs) {
      const fn = graph.callGraph.functions.get(fnId);
      const name = fn?.name || '(anonymous)';
      lines.push(`    subgraph ${mermaidId(fnId)}["Function: ${name}"]`);
      for (const blockId of fnCFG.blocks) {
        const block = graph.cfg.blocks.get(blockId);
        if (!block) continue;
        const label = block.label || block.type;
        const shape = block.type === 'branch' ? '{}' : block.type === 'entry' || block.type === 'exit' ? '(())' : '[]';
        lines.push(`      ${mermaidId(blockId)}${shape}"${escapeMermaid(label)}"`);
      }
      // Edges within function
      for (const blockId of fnCFG.blocks) {
        const block = graph.cfg.blocks.get(blockId);
        if (!block) continue;
        for (const succ of block.successors) {
          if (fnCFG.blocks.includes(succ)) {
            const label = block.branchTargets.size > 0
              ? [...block.branchTargets.entries()].find(([, v]) => v === succ)?.[0]
              : '';
            lines.push(`      ${mermaidId(blockId)} -->${label ? `|${label}|` : ''} ${mermaidId(succ)}`);
          }
        }
      }
      lines.push('    end');
    }

    lines.push('  end');
  }

  return lines.join('\n');
}

function shortPath(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/');
  return parts.length > 2 ? parts.slice(-2).join('/') : p;
}

function mermaidId(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
}

function escapeMermaid(s: string): string {
  return s.replace(/"/g, '#quot;').replace(/\[/g, '&#91;').replace(/\]/g, '&#93;');
}
