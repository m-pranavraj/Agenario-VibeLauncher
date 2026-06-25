import traverse from '../utils/traverse.js';
import type { Node, ImportDeclaration, ExportNamedDeclaration, ExportDefaultDeclaration, ExportAllDeclaration, CallExpression, VariableDeclarator } from '@babel/types';
import { extname, resolve, dirname, relative } from 'node:path';
import { existsSync } from 'node:fs';
import type { ImportEdge, ExportEdge, ModuleSpec, CSGGraph, NodeId, ParseResult } from '../types.js';
import { edgeId } from '../utils/id.js';

export class ModuleGraphBuilder {
  private graph!: CSGGraph;

  build(parsed: ParseResult[], graph: CSGGraph): void {
    this.graph = graph;

    for (const p of parsed) {
      this.processFile(p);
    }

    // Build dependency map
    for (const imp of graph.moduleGraph.imports) {
      const deps = graph.moduleGraph.dependencyMap.get(imp.source) || [];
      if (!deps.includes(imp.target)) {
        deps.push(imp.target);
      }
      graph.moduleGraph.dependencyMap.set(imp.source, deps);
    }

    // Detect cycles
    graph.moduleGraph.cycles = this.detectCycles(graph.moduleGraph.dependencyMap);

    // Identify entry points
    const allSources = new Set(graph.moduleGraph.imports.map(i => i.source));
    const allTargets = new Set(graph.moduleGraph.imports.map(i => i.target));
    for (const p of parsed) {
      if (!allTargets.has(p.file)) {
        graph.moduleGraph.entryPoints.push(p.file);
      }
    }
  }

  private processFile(parsed: ParseResult): void {
    traverse(parsed.ast, {
      ImportDeclaration: (path) => {
        const node = path.node as ImportDeclaration;
        const sourcePath = this.resolveModule(parsed.file, node.source.value);
        if (!sourcePath) return;

        const specs: ModuleSpec[] = node.specifiers.map(spec => ({
          localName: spec.local.name,
          exportedName: spec.type === 'ImportDefaultSpecifier'
            ? 'default'
            : spec.type === 'ImportNamespaceSpecifier'
              ? '*'
              : (spec as any).imported?.name || spec.local.name,
          loc: {
            file: parsed.file,
            start: { line: spec.loc?.start.line ?? 0, col: spec.loc?.start.column ?? 0 },
            end: { line: spec.loc?.end.line ?? 0, col: spec.loc?.end.column ?? 0 },
          },
        }));

        const edge: ImportEdge = {
          id: edgeId(),
          type: node.importKind === 'type' ? 'side-effect' : this.getImportType(node),
          source: parsed.file,
          target: sourcePath,
          specifiers: specs,
          isDynamic: false,
          loc: {
            file: parsed.file,
            start: { line: node.loc?.start.line ?? 0, col: node.loc?.start.column ?? 0 },
            end: { line: node.loc?.end.line ?? 0, col: node.loc?.end.column ?? 0 },
          },
        };

        this.graph.moduleGraph.imports.push(edge);
        this.indexDimension(parsed.file, 'module');
      },

      ExportNamedDeclaration: (path) => {
        const node = path.node as ExportNamedDeclaration;
        const specs: ModuleSpec[] = node.specifiers.map(spec => ({
          localName: (spec as any)?.local?.name || (spec as any)?.exported?.name || '*',
          exportedName: (spec as any)?.exported?.name || (spec as any)?.local?.name || '*',
          loc: {
            file: parsed.file,
            start: { line: spec.loc?.start.line ?? 0, col: spec.loc?.start.column ?? 0 },
            end: { line: spec.loc?.end.line ?? 0, col: spec.loc?.end.column ?? 0 },
          },
        }));

        // Re-export
        if (node.source) {
          const sourcePath = this.resolveModule(parsed.file, node.source.value);
          if (sourcePath) {
            const edge: ImportEdge = {
              id: edgeId(),
              type: 'named',
              source: parsed.file,
              target: sourcePath,
              specifiers: specs,
              isDynamic: false,
              loc: {
                file: parsed.file,
                start: { line: node.loc?.start.line ?? 0, col: node.loc?.start.column ?? 0 },
                end: { line: node.loc?.end.line ?? 0, col: node.loc?.end.column ?? 0 },
              },
            };
            this.graph.moduleGraph.imports.push(edge);
          }
        }

        const rootNodeId = this.findASTNodeId(node);
        const exportEdge: ExportEdge = {
          id: edgeId(),
          type: 'named',
          source: parsed.file,
          specifiers: specs,
          loc: {
            file: parsed.file,
            start: { line: node.loc?.start.line ?? 0, col: node.loc?.start.column ?? 0 },
            end: { line: node.loc?.end.line ?? 0, col: node.loc?.end.column ?? 0 },
          },
        };
        this.graph.moduleGraph.exports.push(exportEdge);
      },

      ExportDefaultDeclaration: (path) => {
        const node = path.node as ExportDefaultDeclaration;
        const decl = node.declaration;
        const rootNodeId = this.findASTNodeId(node);

        const spec: ModuleSpec = {
          localName: (decl as any)?.id?.name || 'default',
          exportedName: 'default',
          loc: {
            file: parsed.file,
            start: { line: node.loc?.start.line ?? 0, col: node.loc?.start.column ?? 0 },
            end: { line: node.loc?.end.line ?? 0, col: node.loc?.end.column ?? 0 },
          },
        };

        const edge: ExportEdge = {
          id: edgeId(),
          type: 'default',
          source: parsed.file,
          specifiers: [spec],
          loc: {
            file: parsed.file,
            start: { line: node.loc?.start.line ?? 0, col: node.loc?.start.column ?? 0 },
            end: { line: node.loc?.end.line ?? 0, col: node.loc?.end.column ?? 0 },
          },
        };
        this.graph.moduleGraph.exports.push(edge);
      },

      ExportAllDeclaration: (path) => {
        const node = path.node as ExportAllDeclaration;
        const sourcePath = this.resolveModule(parsed.file, node.source.value);
        if (!sourcePath) return;

        const edge: ImportEdge = {
          id: edgeId(),
          type: 'all',
          source: parsed.file,
          target: sourcePath,
          specifiers: [],
          isDynamic: false,
          loc: {
            file: parsed.file,
            start: { line: node.loc?.start.line ?? 0, col: node.loc?.start.column ?? 0 },
            end: { line: node.loc?.end.line ?? 0, col: node.loc?.end.column ?? 0 },
          },
        };
        this.graph.moduleGraph.imports.push(edge);
      },

      CallExpression: (path) => {
        const node = path.node as CallExpression;
        if ((node.callee as any)?.type === 'Import') {
          // dynamic import()
          const source = (node.arguments[0] as any)?.value;
          if (typeof source === 'string') {
            const sourcePath = this.resolveModule(parsed.file, source);
            if (sourcePath) {
              const edge: ImportEdge = {
                id: edgeId(),
                type: 'dynamic',
                source: parsed.file,
                target: sourcePath,
                specifiers: [],
                isDynamic: true,
                loc: {
                  file: parsed.file,
                  start: { line: node.loc?.start.line ?? 0, col: node.loc?.start.column ?? 0 },
                  end: { line: node.loc?.end.line ?? 0, col: node.loc?.end.column ?? 0 },
                },
              };
              this.graph.moduleGraph.imports.push(edge);
            }
          }
        }

        // require() calls
        if ((node.callee as any)?.name === 'require') {
          const source = (node.arguments[0] as any)?.value;
          if (typeof source === 'string') {
            const sourcePath = this.resolveModule(parsed.file, source);
            if (sourcePath) {
              const edge: ImportEdge = {
                id: edgeId(),
                type: 'side-effect',
                source: parsed.file,
                target: sourcePath,
                specifiers: [],
                isDynamic: false,
                loc: {
                  file: parsed.file,
                  start: { line: node.loc?.start.line ?? 0, col: node.loc?.start.column ?? 0 },
                  end: { line: node.loc?.end.line ?? 0, col: node.loc?.end.column ?? 0 },
                },
              };
              this.graph.moduleGraph.imports.push(edge);
            }
          }
        }
      },
    });
  }

  private getImportType(node: ImportDeclaration): ImportEdge['type'] {
    if (node.importKind === 'type') return 'side-effect';
    if (node.specifiers.length === 0) return 'side-effect';
    if (node.specifiers.some(s => s.type === 'ImportDefaultSpecifier')) return 'default';
    if (node.specifiers.some(s => s.type === 'ImportNamespaceSpecifier')) return 'all';
    return 'named';
  }

  private resolveModule(fromFile: string, specifier: string): string | null {
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
      // Package import — mark but don't resolve physically
      return specifier;
    }

    const dir = dirname(fromFile);
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '/index.ts', '/index.js', '/index.tsx', '/index.jsx'];

    // Try exact
    const exact = resolve(dir, specifier);
    if (existsSync(exact)) {
      // If it's a directory, try index files
      if (!extname(exact)) {
        for (const ext of extensions) {
          const candidate = exact + ext;
          if (existsSync(candidate)) return candidate;
        }
        // Try as directory with index
        for (const ext of extensions) {
          const candidate = resolve(exact, `index${ext}`);
          if (existsSync(candidate)) return candidate;
        }
      }
      return exact;
    }

    if (!extname(specifier)) {
      for (const ext of extensions) {
        const candidate = resolve(dir, specifier + ext);
        if (existsSync(candidate)) return candidate;
        // Try /index
        const indexCandidate = resolve(dir, specifier, `index${ext}`);
        if (existsSync(indexCandidate)) return indexCandidate;
      }
    } else {
      const candidate = resolve(dir, specifier);
      for (const ext of extensions) {
        const c = extname(specifier)
          ? resolve(dir, specifier.replace(extname(specifier), ext))
          : resolve(dir, specifier + ext);
        if (existsSync(c)) return c;
      }
    }

    // Return the unresolved specifier with a relative path for record-keeping
    if (specifier.startsWith('.')) {
      return resolve(dir, specifier);
    }
    return specifier;
  }

  private detectCycles(depMap: Map<string, string[]>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string) => {
      if (inStack.has(node)) {
        const cycleStart = path.indexOf(node);
        if (cycleStart >= 0) {
          cycles.push([...path.slice(cycleStart), node]);
        }
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      inStack.add(node);
      path.push(node);

      const deps = depMap.get(node) || [];
      for (const dep of deps) {
        if (typeof dep === 'string' && (dep.endsWith('.ts') || dep.endsWith('.js') || dep.endsWith('.tsx') || dep.endsWith('.jsx'))) {
          dfs(dep);
        }
      }

      path.pop();
      inStack.delete(node);
    };

    for (const node of depMap.keys()) {
      dfs(node);
    }

    return cycles;
  }

  private indexDimension(file: string, dim: 'cfg' | 'module' | 'route' | 'call'): void {
    for (const [id, node] of this.graph.astNodes) {
      if (node.loc.file === file) {
        const dims = this.graph.dimensionIndex.get(id) || new Set();
        dims.add(dim);
        this.graph.dimensionIndex.set(id, dims);
      }
    }
  }

  private findASTNodeId(node: Node): NodeId | null {
    for (const [id, csgNode] of this.graph.astNodes) {
      if (csgNode.raw === node) return id;
    }
    return null;
  }
}
