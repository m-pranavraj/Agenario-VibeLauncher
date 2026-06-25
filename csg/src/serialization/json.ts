import type { CSGGraph, NodeId, CFGBlock, RouteEndpoint, CallSite, FunctionScope } from '../types.js';

export interface JSONGraph {
  version: 1;
  generatedAt: string;
  stats: {
    files: number;
    astNodes: number;
    cfgBlocks: number;
    imports: number;
    exports: number;
    routes: number;
    functions: number;
    calls: number;
  };
  files: Array<{
    path: string;
    hash: string;
    language: string;
  }>;
  cfg: {
    blocks: Array<CFGBlock & { id: string }>;
    entryBlock: string | null;
    exitBlock: string | null;
  };
  modules: {
    imports: Array<{
      source: string;
      target: string;
      type: string;
      specifiers: Array<{ local: string; exported: string | null }>;
    }>;
    exports: Array<{
      source: string;
      type: string;
      specifiers: Array<{ local: string; exported: string }>;
    }>;
    dependencyMap: Record<string, string[]>;
    entryPoints: string[];
    cycles: string[][];
  };
  routes: {
    endpoints: Array<{
      method: string;
      path: string;
      fullPath: string;
      params: Array<{ name: string; pattern: string; position: string }>;
      handler: string | null;
      framework: string;
    }>;
  };
  callGraph: {
    functions: Array<{
      id: string;
      name: string | null;
      type: string;
      params: string[];
      async: boolean;
      generator: boolean;
      isExported: boolean;
    }>;
    calls: Array<{
      caller: string;
      callee: string;
      calleeName: string | null;
      kind: string;
      async: boolean;
    }>;
    entryPoints: string[];
    unresolved: Array<{ calleeName: string | null; caller: string }>;
  };
}

export function toJSON(graph: CSGGraph): JSONGraph {
  const json: JSONGraph = {
    version: 1,
    generatedAt: new Date().toISOString(),
    stats: {
      files: graph.files.size,
      astNodes: graph.astNodes.size,
      cfgBlocks: graph.cfg.blocks.size,
      imports: graph.moduleGraph.imports.length,
      exports: graph.moduleGraph.exports.length,
      routes: graph.routeMap.endpoints.length,
      functions: graph.callGraph.functions.size,
      calls: graph.callGraph.calls.length,
    },
    files: [],
    cfg: {
      blocks: [],
      entryBlock: graph.cfg.entryBlock,
      exitBlock: graph.cfg.exitBlock,
    },
    modules: {
      imports: [],
      exports: [],
      dependencyMap: {},
      entryPoints: graph.moduleGraph.entryPoints,
      cycles: graph.moduleGraph.cycles,
    },
    routes: {
      endpoints: [],
    },
    callGraph: {
      functions: [],
      calls: [],
      entryPoints: graph.callGraph.entryPoints,
      unresolved: graph.callGraph.unresolved.map(c => ({
        calleeName: c.calleeName,
        caller: c.caller,
      })),
    },
  };

  for (const [path, info] of graph.files) {
    json.files.push({
      path,
      hash: info.hash,
      language: info.language,
    });
  }

  for (const [, block] of graph.cfg.blocks) {
    json.cfg.blocks.push({ ...block, id: block.id });
  }

  for (const imp of graph.moduleGraph.imports) {
    json.modules.imports.push({
      source: imp.source,
      target: imp.target,
      type: imp.type,
      specifiers: imp.specifiers.map(s => ({
        local: s.localName,
        exported: s.exportedName,
      })),
    });
  }

  for (const exp of graph.moduleGraph.exports) {
    json.modules.exports.push({
      source: exp.source,
      type: exp.type,
      specifiers: exp.specifiers.map(s => ({
        local: s.localName,
        exported: s.exportedName ?? '',
      })),
    });
  }

  for (const [from, deps] of graph.moduleGraph.dependencyMap) {
    json.modules.dependencyMap[from] = deps;
  }

  for (const ep of graph.routeMap.endpoints) {
    json.routes.endpoints.push({
      method: ep.method,
      path: ep.path,
      fullPath: ep.fullPath,
      params: ep.params.map(p => ({ name: p.name, pattern: p.pattern, position: p.position })),
      handler: ep.handler,
      framework: ep.framework,
    });
  }

  for (const [id, fn] of graph.callGraph.functions) {
    json.callGraph.functions.push({
      id,
      name: fn.name,
      type: fn.type,
      params: fn.params,
      async: fn.async,
      generator: fn.generator,
      isExported: fn.isExported,
    });
  }

  for (const call of graph.callGraph.calls) {
    json.callGraph.calls.push({
      caller: call.caller,
      callee: call.callee,
      calleeName: call.calleeName,
      kind: call.kind,
      async: call.isAsync,
    });
  }

  return json;
}
