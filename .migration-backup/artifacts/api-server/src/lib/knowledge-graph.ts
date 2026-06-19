import fs from "fs";
import path from "path";

export interface GraphNode {
  id: string;
  label: string;
  type: "file" | "function" | "route" | "table" | "dependency";
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildKnowledgeGraph(
  dir: string | undefined,
  packageJson: Record<string, unknown> | undefined,
  routesStr: string | undefined,
  fileTreeStr: string | undefined,
  keyFiles?: Array<{ path: string; content: string }>
): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const addedNodes = new Set<string>();

  function addNode(id: string, label: string, type: GraphNode["type"]) {
    const key = `${type}:${id}`;
    if (!addedNodes.has(key)) {
      nodes.push({ id, label, type });
      addedNodes.add(key);
    }
  }

  function addEdge(from: string, to: string, label?: string) {
    const exists = edges.some(e => e.from === from && e.to === to);
    if (!exists) {
      edges.push({ from, to, label });
    }
  }

  // 1. Process Dependencies from package.json
  const deps = {
    ...(packageJson?.dependencies as Record<string, string> ?? {}),
    ...(packageJson?.devDependencies as Record<string, string> ?? {}),
  };
  for (const dep of Object.keys(deps)) {
    addNode(dep, dep, "dependency");
  }

  // 2. Process Files from file tree
  const fileLines = fileTreeStr ? fileTreeStr.split(/\r?\n/) : [];
  const files: string[] = [];
  for (const line of fileLines) {
    const cleaned = line.trim();
    if (cleaned && /\.(ts|tsx|js|jsx|py|go|json)$/.test(cleaned) && !cleaned.includes("node_modules")) {
      files.push(cleaned);
      addNode(cleaned, cleaned.split("/").pop() || cleaned, "file");
    }
  }

  // 3. Process Routes
  const routeLines = routesStr ? routesStr.split(/\r?\n/) : [];
  for (const r of routeLines) {
    const cleaned = r.trim();
    if (cleaned) {
      addNode(cleaned, cleaned.split("/").pop() || cleaned, "route");
      addEdge(cleaned, cleaned, "registers");
    }
  }

  // 4. Process Key Files to extract Functions and DB Tables
  const filesToScan = keyFiles ?? [];
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(|(?:export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
  const tableRegex = /\b([a-zA-Z0-9_]+Table|[a-zA-Z0-9_]+_table|db\.[a-zA-Z0-9_]+)\b/g;

  for (const kf of filesToScan) {
    const filePath = kf.path;
    const content = kf.content;

    addNode(filePath, filePath.split("/").pop() || filePath, "file");

    // Extract functions
    let funcMatch;
    functionRegex.lastIndex = 0;
    let funcCount = 0;
    while ((funcMatch = functionRegex.exec(content)) !== null) {
      const funcName = funcMatch[1] || funcMatch[2];
      if (funcName && !["use", "req", "res", "next", "import", "require"].includes(funcName)) {
        const funcId = `${filePath}:${funcName}`;
        addNode(funcId, funcName, "function");
        addEdge(filePath, funcId, "defines");
        funcCount++;
        if (funcCount > 8) break; 
      }
    }

    // Extract DB Tables
    let tableMatch;
    tableRegex.lastIndex = 0;
    let tableCount = 0;
    while ((tableMatch = tableRegex.exec(content)) !== null) {
      let tableName = tableMatch[1];
      if (tableName && !["db.select", "db.update", "db.insert", "db.delete", "db.from"].includes(tableName)) {
        tableName = tableName.replace("db.", "");
        addNode(tableName, tableName, "table");
        addEdge(filePath, tableName, "queries");
        tableCount++;
        if (tableCount > 5) break; 
      }
    }

    // Connect routes to files if file names match
    for (const r of routeLines) {
      const routeFileName = r.trim().split("/").pop()?.replace(/\.\w+$/, "");
      const kfFileName = filePath.split("/").pop()?.replace(/\.\w+$/, "");
      if (routeFileName && kfFileName && routeFileName === kfFileName) {
        addEdge(r.trim(), filePath, "routes_to");
      }
    }

    // Match dependencies used
    for (const dep of Object.keys(deps)) {
      if (content.includes(`"${dep}"`) || content.includes(`'${dep}'`)) {
        addEdge(filePath, dep, "imports");
      }
    }
  }

  return { nodes, edges };
}
