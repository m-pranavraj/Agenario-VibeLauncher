import path from "node:path";
import type {
  CombinedSemanticGraph,
  CsgNode,
  CsgEdge,
  CsgNodeType,
  CsgEdgeType,
  CsgAdjacency,
} from "./types.js";
import type { ParsedFile, AstEntity } from "./parser.js";

let nodeCounter = 0;
let edgeCounter = 0;

function makeNodeId(): string {
  return `n_${++nodeCounter}`;
}
function makeEdgeId(): string {
  return `e_${++edgeCounter}`;
}

function addNode(
  graph: CombinedSemanticGraph,
  type: CsgNodeType,
  name: string,
  file: string,
  line: number,
  column: number,
  endLine: number,
  endColumn: number,
  code: string,
  meta: Record<string, unknown> = {},
): CsgNode {
  const id = makeNodeId();
  const node: CsgNode = {
    id,
    type,
    name,
    file,
    line,
    column,
    endLine,
    endColumn,
    code,
    meta,
  };
  graph.nodes.set(id, node);
  graph.adjacency.set(id, { out: [], in: [] });
  return node;
}

function addEdge(
  graph: CombinedSemanticGraph,
  sourceId: string,
  targetId: string,
  type: CsgEdgeType,
  confidence: number = 1.0,
  meta: Record<string, unknown> = {},
): CsgEdge {
  const id = makeEdgeId();
  const edge: CsgEdge = { id, sourceId, targetId, type, confidence, meta };
  graph.edges.set(id, edge);

  const srcAdj = graph.adjacency.get(sourceId);
  const tgtAdj = graph.adjacency.get(targetId);
  if (srcAdj) srcAdj.out.push(edge);
  if (tgtAdj) tgtAdj.in.push(edge);

  return edge;
}

function getOrCreateNode(
  graph: CombinedSemanticGraph,
  type: CsgNodeType,
  name: string,
  file: string,
  line: number,
): CsgNode {
  for (const node of graph.nodes.values()) {
    if (node.type === type && node.name === name && node.file === file && node.line === line) {
      return node;
    }
  }
  return addNode(graph, type, name, file, line, 0, line, 0, "");
}

export function buildCSG(
  parsedFiles: ParsedFile[],
  astEntities: AstEntity[],
  framework: string,
): CombinedSemanticGraph {
  nodeCounter = 0;
  edgeCounter = 0;

  const graph: CombinedSemanticGraph = {
    nodes: new Map(),
    edges: new Map(),
    adjacency: new Map(),
    entryPoints: [],
    metadata: {
      filesParsed: parsedFiles.length,
      totalLines: parsedFiles.reduce((s, f) => s + f.lines.length, 0),
      language: "multi",
      framework,
    },
  };

  const entityNodeMap = new Map<string, string>();

  for (const entity of astEntities) {
    const node = addNode(
      graph,
      entity.type,
      entity.name,
      entity.file,
      entity.line,
      entity.column,
      entity.endLine,
      entity.endColumn,
      entity.code,
      entity.meta,
    );
    entityNodeMap.set(entity.id, node.id);
  }

  for (const pf of parsedFiles) {
    detectRoutes(graph, pf);
    detectComponents(graph, pf);
    detectDbQueries(graph, pf);
    detectApiCalls(graph, pf);
    detectImports(graph, pf, entityNodeMap, astEntities);
    detectControlFlow(graph, pf);
    detectDataFlow(graph, pf);
    detectAuthMiddleware(graph, pf);
  }

  if (framework === "next" || framework === "nextjs") {
    detectNextJsRoutes(graph, parsedFiles);
  }

  return graph;
}

function detectRoutes(
  graph: CombinedSemanticGraph,
  pf: ParsedFile,
): void {
  const content = pf.content;
  const routePatterns = [
    /router\.(get|post|put|delete|patch)\s*\(\s*['"`](\/[^'"`]*)['"`]/g,
    /app\.(get|post|put|delete|patch)\s*\(\s*['"`](\/[^'"`]*)['"`]/g,
    /Route\s+path=['"`](\/[^'"`]*)['"`]/g,
    /route\s*:\s*['"`](\/[^'"`]*)['"`]/g,
  ];

  for (const pattern of routePatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const method = match[1]?.toLowerCase() ?? "get";
      const routePath = match[2] ?? match[1];
      const lineNum = content.substring(0, match.index).split("\n").length;

      const routeNode = addNode(
        graph,
        "route",
        `${method.toUpperCase()} ${routePath}`,
        pf.relPath,
        lineNum,
        match.index - content.lastIndexOf("\n", match.index) - 1,
        lineNum,
        0,
        match[0],
        { method, routePath },
      );
      graph.entryPoints.push(routeNode.id);
    }
  }
}

function detectComponents(
  graph: CombinedSemanticGraph,
  pf: ParsedFile,
): void {
  const content = pf.content;
  const componentPatterns = [
    /(?:function|const)\s+([A-Z]\w+)\s*[=\(]/g,
    /export\s+(?:default\s+)?(?:function|const)\s+([A-Z]\w+)/g,
  ];

  for (const pattern of componentPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const compName = match[1];
      const lineNum = content.substring(0, match.index).split("\n").length;

      const compNode = addNode(
        graph,
        "component",
        compName,
        pf.relPath,
        lineNum,
        match.index - content.lastIndexOf("\n", match.index) - 1,
        lineNum,
        0,
        match[0],
        { isExport: match[0].includes("export") },
      );
    }
  }
}

function detectDbQueries(
  graph: CombinedSemanticGraph,
  pf: ParsedFile,
): void {
  const content = pf.content;
  const dbPatterns = [
    /(?:db|prisma|knex|mongoose|drizzle)\s*\.\s*(\w+)\s*\(/g,
    /\.\$(?:queryRaw|executeRaw|queryRawUnsafe|executeRawUnsafe)\s*\(/g,
    /(?:query|execute|raw)\s*\(\s*[`'"]/g,
  ];

  for (const pattern of dbPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split("\n").length;
      const dbNode = addNode(
        graph,
        "db_query",
        match[0].substring(0, 60),
        pf.relPath,
        lineNum,
        match.index - content.lastIndexOf("\n", match.index) - 1,
        lineNum,
        0,
        match[0],
        { isRaw: match[0].includes("Raw") || match[0].includes("raw") },
      );
    }
  }
}

function detectApiCalls(
  graph: CombinedSemanticGraph,
  pf: ParsedFile,
): void {
  const content = pf.content;
  const apiPatterns = [
    /(?:fetch|axios|got|superagent|request)\s*\(/g,
    /\b(?:stripe|paypal|razorpay|lemonsqueezy)\s*\./g,
  ];

  for (const pattern of apiPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split("\n").length;
      addNode(
        graph,
        "api_call",
        match[0].substring(0, 40),
        pf.relPath,
        lineNum,
        match.index - content.lastIndexOf("\n", match.index) - 1,
        lineNum,
        0,
        match[0],
        {},
      );
    }
  }
}

function detectImports(
  graph: CombinedSemanticGraph,
  pf: ParsedFile,
  entityNodeMap: Map<string, string>,
  astEntities: AstEntity[],
): void {
  const content = pf.content;
  const importPatterns = [
    /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"`]([^'"`]+)['"`]/g,
    /(?:const|let|var)\s+\w+\s*=\s*require\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /import\s+['"`]([^'"`]+)['"`]/g,
  ];

  for (const pattern of importPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];
      const lineNum = content.substring(0, match.index).split("\n").length;

      addNode(
        graph,
        "import",
        importPath,
        pf.relPath,
        lineNum,
        match.index - content.lastIndexOf("\n", match.index) - 1,
        lineNum,
        0,
        match[0],
        { importPath },
      );
    }
  }
}

function detectControlFlow(
  graph: CombinedSemanticGraph,
  pf: ParsedFile,
): void {
  const content = pf.content;
  const controlPatterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bswitch\s*\(/g,
    /\bwhile\s*\(/g,
    /\bfor\s*\(/g,
    /\btry\s*\{/g,
    /\bcatch\s*\(/g,
    /\?\.\s*\(/g,
  ];

  for (const pattern of controlPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split("\n").length;

      const nodeType: CsgNodeType = match[0].includes("try") || match[0].includes("catch")
        ? "try_catch"
        : "conditional";

      const condNode = addNode(
        graph,
        nodeType,
        match[0].substring(0, 30),
        pf.relPath,
        lineNum,
        match.index - content.lastIndexOf("\n", match.index) - 1,
        lineNum,
        0,
        match[0],
        {},
      );

      if (nodeType === "conditional") {
        const varMatch = content.substring(match.index, match.index + 80).match(/\(([^)]+)\)/);
        if (varMatch) {
          const varName = varMatch[1].trim();
          const potentialVarNodes = findVariableNodes(graph, pf.relPath, varName);
          for (const vn of potentialVarNodes) {
            addEdge(graph, vn.id, condNode.id, "control_flow", 0.8, {
              description: `${varName} controls this branch`,
            });
          }
        }
      }
    }
  }
}

function detectDataFlow(
  graph: CombinedSemanticGraph,
  pf: ParsedFile,
): void {
  const content = pf.content;
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const assignMatch = line.match(/(\w+)\s*=\s*(.+)/);
    if (assignMatch) {
      const target = assignMatch[1];
      const source = assignMatch[2];

      const targetNode = getOrCreateNode(graph, "variable", target, pf.relPath, i + 1);
      const sourceNodes = findVariablesInExpr(graph, pf.relPath, source);
      for (const sn of sourceNodes) {
        addEdge(graph, sn.id, targetNode.id, "data_flow", 0.9, {
          sourceExpr: source.substring(0, 60),
        });
      }
    }
  }
}

function detectAuthMiddleware(
  graph: CombinedSemanticGraph,
  pf: ParsedFile,
): void {
  const content = pf.content;
  const authPatterns = [
    /requireAuth/g,
    /authenticate/g,
    /isAuthenticated/g,
    /authMiddleware/g,
    /clerkMiddleware/g,
    /auth\(\)/g,
  ];

  for (const pattern of authPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split("\n").length;
      addNode(
        graph,
        "middleware",
        match[0],
        pf.relPath,
        lineNum,
        match.index - content.lastIndexOf("\n", match.index) - 1,
        lineNum,
        0,
        match[0],
        { type: "auth" },
      );
    }
  }
}

function detectNextJsRoutes(
  graph: CombinedSemanticGraph,
  parsedFiles: ParsedFile[],
): void {
  for (const pf of parsedFiles) {
    if (pf.relPath.includes("/route.") || pf.relPath.includes("/page.")) {
      const segments = pf.relPath.replace(/\\/g, "/").split("/");
      const routeParts: string[] = [];
      for (const seg of segments) {
        if (seg.startsWith("(") && seg.endsWith(")")) continue;
        if (seg === "page.tsx" || seg === "page.ts" || seg === "page.jsx" || seg === "page.js") {
          routeParts.push("");
          break;
        }
        if (seg === "route.tsx" || seg === "route.ts" || seg === "route.js") {
          break;
        }
        if (seg.startsWith("[") && seg.endsWith("]")) {
          routeParts.push(`:${seg.slice(1, -1)}`);
        } else if (!seg.includes(".")) {
          routeParts.push(seg);
        }
      }
      const routePath = "/" + routeParts.join("/");
      addNode(
        graph,
        "route",
        `GET ${routePath}`,
        pf.relPath,
        1,
        0,
        1,
        0,
        `// Next.js route: ${routePath}`,
        { method: "GET", routePath, framework: "nextjs" },
      );
    }
  }
}

function findVariableNodes(
  graph: CombinedSemanticGraph,
  file: string,
  name: string,
): CsgNode[] {
  const results: CsgNode[] = [];
  for (const node of graph.nodes.values()) {
    if (node.file === file && node.type === "variable" && node.name === name) {
      results.push(node);
    }
  }
  return results;
}

function findVariablesInExpr(
  graph: CombinedSemanticGraph,
  file: string,
  expr: string,
): CsgNode[] {
  const results: CsgNode[] = [];
  const varMatches = expr.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g);
  if (!varMatches) return results;

  const uniqueVars = new Set(varMatches.filter(
    (v) => !["null", "undefined", "true", "false", "this", "typeof", "new", "return", "if", "else", "function", "const", "let", "var", "import", "export", "default", "from", "async", "await", "try", "catch", "throw", "for", "while", "in", "of", "class", "extends", "super"].includes(v),
  ));

  for (const varName of uniqueVars) {
    const nodes = findVariableNodes(graph, file, varName);
    results.push(...nodes);
  }
  return results;
}
