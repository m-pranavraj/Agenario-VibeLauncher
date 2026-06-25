import type { ParseResult, CSGGraph } from '../types.js';
import type { CircularDependency, ModuleMetrics, ArchScanReport } from '../types.js';

export class ArchScan {
  analyze(parsed: ParseResult[], graph: CSGGraph): ArchScanReport {
    const imports = graph.moduleGraph.imports;
    const exports = graph.moduleGraph.exports;
    const files = Array.from(graph.files.keys());

    const adjList = new Map<string, string[]>();
    const revAdjList = new Map<string, string[]>();

    for (const f of files) {
      adjList.set(f, []);
      revAdjList.set(f, []);
    }

    for (const imp of imports) {
      const src = imp.source;
      const tgt = imp.target;
      if (adjList.has(src) && files.some(f => f === tgt || f.endsWith(tgt))) {
        const targets = adjList.get(src)!;
        if (!targets.includes(tgt)) targets.push(tgt);
      }
      if (revAdjList.has(tgt) && files.some(f => f === src || f.endsWith(src))) {
        const sources = revAdjList.get(tgt)!;
        if (!sources.includes(src)) sources.push(src);
      }
    }

    const tarjanCycles = this.findCircularDependencies(adjList, files);
    const graphCycles = (graph.moduleGraph.cycles || []).map(c => ({
      cycle: c.map(n => n.replace(/^.*[\\/]/, '')),
      files: c,
      length: c.length,
    }));
    const seenKeys = new Set<string>();
    const circularDeps: CircularDependency[] = [];
    for (const c of [...tarjanCycles, ...graphCycles]) {
      const key = [...c.cycle].sort().join('->');
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        circularDeps.push(c);
      }
    }

    const moduleMetrics: ModuleMetrics[] = [];
    for (const f of files) {
      const outgoing = adjList.get(f) || [];
      const incoming = revAdjList.get(f) || [];

      const filteredOutgoing = outgoing.filter(t => t !== f);
      const filteredIncoming = incoming.filter(s => s !== f);

      const ce = filteredOutgoing.length;
      const ca = filteredIncoming.length;
      const instability = ca + ce === 0 ? 0 : ce / (ca + ce);
      const abstractness = 0;
      const distance = Math.abs(abstractness + instability - 1);

      moduleMetrics.push({
        file: f, afferentCoupling: ca, efferentCoupling: ce,
        instability: Math.round(instability * 1000) / 1000,
        abstractness, distance: Math.round(distance * 1000) / 1000,
      });
    }

    const hotSpots = moduleMetrics.filter(m =>
      m.instability > 0.7 || m.distance > 0.5
    ).sort((a, b) => b.instability - a.instability);

    const avgInstability = moduleMetrics.length > 0
      ? moduleMetrics.reduce((s, m) => s + m.instability, 0) / moduleMetrics.length
      : 0;

    let instabilityTrend: ArchScanReport['instabilityTrend'];
    if (avgInstability < 0.3) instabilityTrend = 'stable';
    else if (avgInstability < 0.6) instabilityTrend = 'moderate';
    else instabilityTrend = 'unstable';

    const cyclePenalty = circularDeps.length * 10;
    const hotSpotPenalty = hotSpots.length * 5;
    const instabilityScore = avgInstability * 30;
    const score = Math.max(0, Math.min(100, Math.round(100 - cyclePenalty - hotSpotPenalty - instabilityScore)));

    return {
      circularDependencies: circularDeps, moduleMetrics, hotSpots,
      instabilityTrend, score,
    };
  }

  private findCircularDependencies(adjList: Map<string, string[]>, files: string[]): CircularDependency[] {
    const cycles: CircularDependency[] = [];
    const indexMap = new Map<string, number>();
    const lowLink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    let globalIndex = 0;

    const strongConnect = (v: string): void => {
      indexMap.set(v, globalIndex);
      lowLink.set(v, globalIndex);
      globalIndex++;
      stack.push(v);
      onStack.add(v);

      const neighbors = adjList.get(v) || [];
      for (const w of neighbors) {
        if (!files.includes(w)) continue;
        if (!indexMap.has(w)) {
          strongConnect(w);
          lowLink.set(v, Math.min(lowLink.get(v)!, lowLink.get(w)!));
        } else if (onStack.has(w)) {
          lowLink.set(v, Math.min(lowLink.get(v)!, indexMap.get(w)!));
        }
      }

      if (lowLink.get(v) === indexMap.get(v)) {
        const scc: string[] = [];
        let w: string | undefined;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          scc.push(w);
        } while (w !== v);

        if (scc.length > 1 || (scc.length === 1 && (adjList.get(scc[0]) || []).includes(scc[0]))) {
          const normalized = scc.map(n => n.replace(/^.*[\\/]/, ''));
          const key = [...normalized].sort().join('->');
          if (!cycles.some(c => [...c.files].sort().join('->') === key)) {
            cycles.push({ cycle: normalized, files: scc, length: scc.length });
          }
        }
      }
    };

    for (const f of files) {
      if (!indexMap.has(f)) {
        strongConnect(f);
      }
    }
    return cycles;
  }
}
