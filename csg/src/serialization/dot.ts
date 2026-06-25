import type { CSGGraph, CFGBlock, NodeId } from '../types.js';

export function toDot(graph: CSGGraph, options?: {
  showCFG?: boolean;
  showModule?: boolean;
  showRoutes?: boolean;
  showCalls?: boolean;
  colors?: boolean;
}): string {
  const cfg = options?.showCFG ?? true;
  const mod = options?.showModule ?? true;
  const routes = options?.showRoutes ?? true;
  const calls = options?.showCalls ?? true;
  const useColor = options?.colors ?? true;

  const lines: string[] = [];
  lines.push('digraph CombinedSemanticGraph {');
  lines.push('  rankdir=LR;');
  lines.push('  compound=true;');
  lines.push('  node [shape=box, style=rounded, fontname="Consolas"];');
  lines.push('  edge [fontname="Consolas", fontsize=10];');

  if (useColor) {
    lines.push('  // CFG blocks');
    lines.push('  node [fontcolor="#1a1a2e"];');
  }

  // ── CFG ──
  if (cfg) {
    lines.push('');
    lines.push('  // ===== Control Flow Graph =====');
    lines.push('  subgraph cluster_cfg {');
    lines.push('    label="Control Flow Graph";');
    lines.push('    style=dashed;');
    lines.push('    color="#4ecdc4";');
    lines.push('    fontcolor="#4ecdc4";');
    lines.push('    fontsize=14;');

    for (const [id, block] of graph.cfg.blocks) {
      const color = blockColor(block.type);
      const label = escapeDot(block.label || block.type);
      const shape = blockShape(block.type);
      lines.push(`    "${id}" [label="${label}", shape=${shape}, fillcolor="${color}", style=filled];`);
    }

    // Edges
    for (const [id, block] of graph.cfg.blocks) {
      for (const succ of block.successors) {
        const label = block.branchTargets.size > 0
          ? [...block.branchTargets.entries()].find(([, v]) => v === succ)?.[0]
          : '';
        const labelAttr = label ? ` [label="${escapeDot(label)}", fontcolor="#999"]` : '';
        lines.push(`    "${id}" -> "${succ}"${labelAttr};`);
      }
    }

    lines.push('  }');
  }

  // ── Module Dependencies ──
  if (mod) {
    lines.push('');
    lines.push('  // ===== Module Dependency Graph =====');
    lines.push('  subgraph cluster_module {');
    lines.push('    label="Module Dependencies";');
    lines.push('    style=dashed;');
    lines.push('    color="#45b7d1";');
    lines.push('    fontcolor="#45b7d1";');
    lines.push('    fontsize=14;');

    const files = new Set<string>();
    for (const imp of graph.moduleGraph.imports) {
      files.add(imp.source);
      files.add(imp.target);
    }
    for (const exp of graph.moduleGraph.exports) {
      files.add(exp.source);
    }

    for (const file of files) {
      const shortName = file.split(/[/\\]/).pop() || file;
      const isEntry = graph.moduleGraph.entryPoints.includes(file);
      const color = isEntry ? '#f9ca24' : '#45b7d1';
      const style = isEntry ? 'filled,bold' : 'filled';
      lines.push(`    "module_${escapeDot(file)}" [label="${escapeDot(shortName)}", fillcolor="${color}", style="${style}", shape=folder];`);
    }

    for (const imp of graph.moduleGraph.imports) {
      const label = imp.isDynamic ? 'dynamic' : imp.type;
      const style = imp.isDynamic ? 'dashed' : 'solid';
      lines.push(`    "module_${escapeDot(imp.source)}" -> "module_${escapeDot(imp.target)}" [label="${label}", style="${style}", fontcolor="#999"];`);
    }

    lines.push('  }');
  }

  // ── Routes ──
  if (routes) {
    lines.push('');
    lines.push('  // ===== Route Map =====');
    lines.push('  subgraph cluster_routes {');
    lines.push('    label="Route Map";');
    lines.push('    style=dashed;');
    lines.push('    color="#e17055";');
    lines.push('    fontcolor="#e17055";');
    lines.push('    fontsize=14;');

    for (const ep of graph.routeMap.endpoints) {
      const methodColor = methodColorMap(ep.method);
      const label = `${ep.method} ${ep.path}` + (ep.params.length ? `\\nparams: ${ep.params.map(p => p.pattern).join(', ')}` : '');
      lines.push(`    "route_${ep.id}" [label="${escapeDot(label)}", fillcolor="${methodColor}", style=filled, shape=note];`);
    }

    // Group by path
    const pathGroups = new Map<string, typeof graph.routeMap.endpoints>();
    for (const ep of graph.routeMap.endpoints) {
      const group = pathGroups.get(ep.path) || [];
      group.push(ep);
      pathGroups.set(ep.path, group);
    }

    for (const [, group] of pathGroups) {
      if (group.length > 1) {
        for (let i = 1; i < group.length; i++) {
          lines.push(`    "route_${group[i - 1].id}" -> "route_${group[i].id}" [style=dotted, color="#ccc", arrowhead=none];`);
        }
      }
    }

    lines.push('  }');
  }

  // ── Call Graph ──
  if (calls) {
    lines.push('');
    lines.push('  // ===== Call Graph =====');
    lines.push('  subgraph cluster_calls {');
    lines.push('    label="Call Graph";');
    lines.push('    style=dashed;');
    lines.push('    color="#6c5ce7";');
    lines.push('    fontcolor="#6c5ce7";');
    lines.push('    fontsize=14;');

    for (const [id, fn] of graph.callGraph.functions) {
      const name = fn.name || '(anonymous)';
      const extra = fn.async ? ' ⚡' : fn.generator ? ' 🔄' : '';
      const color = fn.isExported ? '#a29bfe' : (fn.async ? '#fd79a8' : '#6c5ce7');
      const style = fn.isExported ? 'filled,bold' : 'filled';
      const params = fn.params.slice(0, 3).join(', ') + (fn.params.length > 3 ? '...' : '');
      const label = `${name}(${params})${extra}`;
      lines.push(`    "fn_${id}" [label="${escapeDot(label)}", fillcolor="${color}", style="${style}", shape=ellipse];`);
    }

    for (const call of graph.callGraph.calls) {
      if (call.caller && call.callee) {
        const label = call.isAsync ? 'await' : '';
        const style = call.isAsync ? 'dashed' : 'solid';
        const color = call.isAsync ? '#fd79a8' : '#6c5ce7';
        lines.push(`    "fn_${call.caller}" -> "fn_${call.callee}" [label="${label}", style="${style}", color="${color}"];`);
      }
    }

    lines.push('  }');
  }

  lines.push('}');
  return lines.join('\n');
}

function blockColor(type: string): string {
  switch (type) {
    case 'entry': return '#55efc4';
    case 'exit': return '#ff7675';
    case 'basic': return '#dfe6e9';
    case 'branch': return '#fdcb6e';
    case 'merge': return '#b2bec3';
    case 'loop-header': return '#81ecec';
    case 'loop-back': return '#00b894';
    case 'try': return '#fab1a0';
    case 'catch': return '#e17055';
    case 'finally': return '#d63031';
    case 'throw': return '#e17055';
    case 'switch-case': return '#ffeaa7';
    default: return '#dfe6e9';
  }
}

function blockShape(type: string): string {
  switch (type) {
    case 'entry': return 'oval';
    case 'exit': return 'oval';
    case 'branch': return 'diamond';
    case 'merge': return 'diamond';
    case 'loop-header': return 'invtrapezium';
    default: return 'box';
  }
}

function methodColorMap(method: string): string {
  switch (method) {
    case 'GET': return '#00b894';
    case 'POST': return '#0984e3';
    case 'PUT': return '#fdcb6e';
    case 'PATCH': return '#6c5ce7';
    case 'DELETE': return '#e17055';
    case 'USE': return '#b2bec3';
    default: return '#dfe6e9';
  }
}

function escapeDot(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/[<>]/g, (c) => c === '<' ? '\\<' : '\\>');
}
