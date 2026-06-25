import type { CSGGraph, CSGOptions, CSGDiagnostic, SourceLocation, ParseResult } from './types.js';
import type {
  DeploySafeReport, FailSafeReport, ObsCoverReport,
  CogFlowReport, ArchScanReport, DependencyDecayReport,
} from './types.js';
import { Parser } from './parser/index.js';
import { CFGBuilder } from './graph/cfg.js';
import { ModuleGraphBuilder } from './graph/module-graph.js';
import { RouteMapBuilder } from './graph/route-map.js';
import { CallGraphBuilder } from './graph/call-graph.js';
import { toDot } from './serialization/dot.js';
import { toJSON } from './serialization/json.js';
import { toMermaid } from './serialization/mermaid.js';
import { contentHash, resetIdCounter } from './utils/hash.js';
import { DeploySafe } from './analysis/deploy-safe.js';
import { FailSafe } from './analysis/fail-safe.js';
import { ObsCover } from './analysis/obs-cover.js';
import { CogFlow } from './analysis/cog-flow.js';
import { ArchScan } from './analysis/arch-scan.js';
import { TimeAwareDeps } from './analysis/time-aware-deps.js';

export class CombinedSemanticGraph {
  private options: CSGOptions;
  private parser: Parser;
  private cfgBuilder: CFGBuilder;
  private moduleBuilder: ModuleGraphBuilder;
  private routeBuilder: RouteMapBuilder;
  private callGraphBuilder: CallGraphBuilder;
  private parsed: ParseResult[] = [];
  private graph: CSGGraph | null = null;
  deploySafe: DeploySafe;
  failSafe: FailSafe;
  obsCover: ObsCover;
  cogFlow: CogFlow;
  archScan: ArchScan;
  timeAwareDeps: TimeAwareDeps;

  constructor(options: CSGOptions = {}) {
    this.options = {
      jsx: true,
      typescript: true,
      decorators: true,
      stage3: true,
      ...options,
    };
    this.parser = new Parser(this.options);
    this.cfgBuilder = new CFGBuilder();
    this.moduleBuilder = new ModuleGraphBuilder();
    this.routeBuilder = new RouteMapBuilder();
    this.callGraphBuilder = new CallGraphBuilder();
    this.deploySafe = new DeploySafe();
    this.failSafe = new FailSafe();
    this.obsCover = new ObsCover();
    this.cogFlow = new CogFlow();
    this.archScan = new ArchScan();
    this.timeAwareDeps = new TimeAwareDeps();
  }

  /**
   * Parse a file and add it to the analysis set.
   * Returns self for chaining.
   */
  parseFile(filePath: string): this {
    const result = this.parser.parseFile(filePath);
    if (result) {
      this.parsed.push(result);
    } else {
      this.addDiagnostic('warning', `Could not parse file: ${filePath}`, null, 'PARSE_SKIP');
    }
    return this;
  }

  /**
   * Parse source code directly.
   */
  parseSource(
    content: string,
    filePath: string,
    language: 'js' | 'ts' | 'jsx' | 'tsx' = 'js'
  ): this {
    const result = this.parser.parseContent(content, filePath, language);
    this.parsed.push(result);
    return this;
  }

  /**
   * Parse multiple files at once.
   */
  parseFiles(filePaths: string[]): this {
    for (const fp of filePaths) {
      this.parseFile(fp);
    }
    return this;
  }

  /**
   * Build the full Combined Semantic Graph from all parsed files.
   * This runs all four analysis dimensions.
   */
  build(): CSGGraph {
    resetIdCounter();

    if (this.parsed.length === 0) {
      this.addDiagnostic('error', 'No files parsed. Call parseFile() or parseSource() first.', null, 'NO_INPUT');
      this.graph = this.createEmptyGraph();
      return this.graph;
    }

    // Initialize graph structure
    this.graph = this.createEmptyGraph();

    // Populate AST nodes and file metadata
    for (const p of this.parsed) {
      for (const [id, node] of p.astNodes) {
        this.graph.astNodes.set(id, node);
      }
      const h = contentHash(p.file);
      this.graph.files.set(p.file, {
        size: h.length,
        hash: h,
        language: p.language,
      });
    }

    // Dimension 1: Control Flow Graph
    try {
      this.cfgBuilder.build(this.parsed, this.graph);
    } catch (err: any) {
      this.addDiagnostic('error', `CFG build failed: ${err.message}`, null, 'CFG_ERROR');
    }

    // Dimension 2: Module Dependency Graph
    try {
      this.moduleBuilder.build(this.parsed, this.graph);
    } catch (err: any) {
      this.addDiagnostic('error', `Module graph build failed: ${err.message}`, null, 'MODULE_ERROR');
    }

    // Dimension 3: Route Map
    try {
      this.routeBuilder.build(this.parsed, this.graph);
    } catch (err: any) {
      this.addDiagnostic('error', `Route map build failed: ${err.message}`, null, 'ROUTE_ERROR');
    }

    // Dimension 4: Call Graph
    try {
      this.callGraphBuilder.build(this.parsed, this.graph);
    } catch (err: any) {
      this.addDiagnostic('error', `Call graph build failed: ${err.message}`, null, 'CALLGRAPH_ERROR');
    }

    // Build dimension index
    this.buildDimensionIndex();

    return this.graph;
  }

  /**
   * Get the built graph. Throws if build() hasn't been called.
   */
  getGraph(): CSGGraph {
    if (!this.graph) {
      throw new Error('Graph not built yet. Call build() first.');
    }
    return this.graph;
  }

  /**
   * Export to DOT format for Graphviz.
   */
  toDot(options?: { showCFG?: boolean; showModule?: boolean; showRoutes?: boolean; showCalls?: boolean; colors?: boolean }): string {
    if (!this.graph) return '';
    return toDot(this.graph, options);
  }

  /**
   * Export to JSON.
   */
  toJSON(): string {
    if (!this.graph) return '{}';
    return JSON.stringify(toJSON(this.graph), null, 2);
  }

  /**
   * Export to Mermaid flowchart syntax.
   */
  toMermaid(options?: { showCFG?: boolean; showModule?: boolean; showRoutes?: boolean; showCalls?: boolean }): string {
    if (!this.graph) return '';
    return toMermaid(this.graph, options);
  }

  /**
   * Get diagnostics from the build process.
   */
  getDiagnostics(): CSGDiagnostic[] {
    return this.graph?.diagnostics ?? [];
  }

  /**
   * Get a summary of the graph.
   */
  summary(): Record<string, number> {
    if (!this.graph) return {};
    return {
      files: this.graph.files.size,
      astNodes: this.graph.astNodes.size,
      cfgBlocks: this.graph.cfg.blocks.size,
      functions: this.graph.callGraph.functions.size,
      callSites: this.graph.callGraph.calls.length,
      imports: this.graph.moduleGraph.imports.length,
      exports: this.graph.moduleGraph.exports.length,
      routes: this.graph.routeMap.endpoints.length,
      cycles: this.graph.moduleGraph.cycles.length,
      unresolvedCalls: this.graph.callGraph.unresolved.length,
    };
  }

  /**
   * Reset the engine, clearing all parsed files and graph state.
   */
  reset(): void {
    this.parsed = [];
    this.graph = null;
    resetIdCounter();
  }

  /* ═══════════════════════════════════════════════
     Dimension 5-10: Extended Analysis Tools
     ═══════════════════════════════════════════════ */

  /**
   * DeploySafe: Scan infrastructure files for security risks.
   */
  scanInfrastructure(directory: string): DeploySafeReport {
    this.deploySafe.scanDirectory(directory);
    return this.deploySafe.report();
  }

  /**
   * FailSafe: Analyze try/catch structures and resilience patterns.
   */
  analyzeResilience(): FailSafeReport {
    if (!this.graph || this.parsed.length === 0) throw new Error('Build graph first. Call build().');
    return this.failSafe.analyze(this.parsed, this.graph);
  }

  /**
   * ObsCover: Evaluate telemetry coverage across code boundaries.
   */
  analyzeObservability(): ObsCoverReport {
    if (!this.graph || this.parsed.length === 0) throw new Error('Build graph first. Call build().');
    return this.obsCover.analyze(this.parsed, this.graph);
  }

  /**
   * CogFlow: Profile cognitive complexity per function.
   */
  analyzeCognitiveLoad(): CogFlowReport {
    if (!this.graph || this.parsed.length === 0) throw new Error('Build graph first. Call build().');
    return this.cogFlow.analyze(this.parsed, this.graph);
  }

  /**
   * ArchScan: Detect circular deps and compute Martin's metrics.
   */
  analyzeArchitecture(): ArchScanReport {
    if (!this.graph || this.parsed.length === 0) throw new Error('Build graph first. Call build().');
    return this.archScan.analyze(this.parsed, this.graph);
  }

  /**
   * Time-Aware Deps: Analyze npm dependency decay.
   */
  async analyzeDependencyDecay(packageJsonPaths?: string[]): Promise<DependencyDecayReport> {
    if (packageJsonPaths) {
      for (const p of packageJsonPaths) this.timeAwareDeps.loadPackageJson(p);
    }
    return this.timeAwareDeps.analyze();
  }

  /* ─── Private ─── */

  private createEmptyGraph(): CSGGraph {
    return {
      astNodes: new Map(),
      files: new Map(),
      cfg: {
        blocks: new Map(),
        entryBlock: null,
        exitBlock: null,
        functionCFGs: new Map(),
      },
      moduleGraph: {
        imports: [],
        exports: [],
        dependencyMap: new Map(),
        entryPoints: [],
        cycles: [],
      },
      routeMap: {
        endpoints: [],
        routerTree: new Map(),
        paramRegistry: new Map(),
      },
      callGraph: {
        functions: new Map(),
        calls: [],
        entryPoints: [],
        unresolved: [],
        asyncChains: [],
      },
      dimensionIndex: new Map(),
      diagnostics: [],
    };
  }

  private addDiagnostic(
    severity: CSGDiagnostic['severity'],
    message: string,
    loc: SourceLocation | null,
    code: string
  ): void {
    if (!this.graph) return;
    this.graph.diagnostics.push({ severity, message, loc, code });
  }

  private buildDimensionIndex(): void {
    if (!this.graph) return;

    for (const [, block] of this.graph.cfg.blocks) {
      for (const astId of block.astNodes) {
        const dims = this.graph.dimensionIndex.get(astId) || new Set();
        dims.add('cfg');
        this.graph.dimensionIndex.set(astId, dims);
      }
    }

    for (const imp of this.graph.moduleGraph.imports) {
      for (const spec of imp.specifiers) {
        for (const [id, node] of this.graph.astNodes) {
          if (node.loc.start.line === spec.loc.start.line) {
            const dims = this.graph.dimensionIndex.get(id) || new Set();
            dims.add('module');
            this.graph.dimensionIndex.set(id, dims);
          }
        }
      }
    }

    for (const ep of this.graph.routeMap.endpoints) {
      if (ep.handler) {
        const dims = this.graph.dimensionIndex.get(ep.handler) || new Set();
        dims.add('route');
        this.graph.dimensionIndex.set(ep.handler, dims);
      }
    }

    for (const [, fn] of this.graph.callGraph.functions) {
      const dims = this.graph.dimensionIndex.get(fn.id) || new Set();
      dims.add('call');
      this.graph.dimensionIndex.set(fn.id, dims);
    }
  }
}
