import * as parser from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = typeof _traverse === 'function' ? _traverse : (_traverse as any).default;

import { CSG, CSGNode, CSGEdge } from "./csg-builder.js";
import { EXTERNAL_DEP_PATTERNS, BUNDLE_COST_DB, ASYNC_COST_DB } from "./csg-builder.js";

// Complexity calculation using AST
function computeComplexityFromAST(path: any) {
  let cyclomatic = 1;
  let cognitive = 0;
  
  path.traverse({
    IfStatement(p: any) { cyclomatic++; cognitive += p.scope.path.listKey ? 1 : 0; },
    ForStatement() { cyclomatic++; cognitive++; },
    ForInStatement() { cyclomatic++; cognitive++; },
    ForOfStatement() { cyclomatic++; cognitive++; },
    WhileStatement() { cyclomatic++; cognitive++; },
    DoWhileStatement() { cyclomatic++; cognitive++; },
    CatchClause() { cyclomatic++; cognitive++; },
    ConditionalExpression() { cyclomatic++; cognitive++; },
    LogicalExpression(p: any) { 
      if (p.node.operator === '&&' || p.node.operator === '||') {
        cyclomatic++; cognitive++;
      }
    },
    SwitchCase(p: any) { 
      if (p.node.test) { cyclomatic++; cognitive++; }
    }
  });

  return { cyclomatic, cognitive };
}

function addNode(csg: CSG, node: CSGNode): void {
  csg.nodes.set(node.id, node);

  const typeList = csg.nodesByType.get(node.type) ?? [];
  typeList.push(node.id);
  csg.nodesByType.set(node.type, typeList);

  const fileList = csg.nodesByFile.get(node.filePath) ?? [];
  fileList.push(node.id);
  csg.nodesByFile.set(node.filePath, fileList);

  if (node.meta.isSource) csg.sourceNodes.push(node.id);
  if (node.meta.isSink) csg.sinkNodes.push(node.id);
  if (node.meta.isSanitizer) csg.sanitizerNodes.push(node.id);
}

function addEdge(csg: CSG, edge: CSGEdge): void {
  csg.edges.push(edge);

  const outList = csg.outEdges.get(edge.from) ?? [];
  outList.push(edge);
  csg.outEdges.set(edge.from, outList);

  const inList = csg.inEdges.get(edge.to) ?? [];
  inList.push(edge);
  csg.inEdges.set(edge.to, inList);
}

export function buildCSGFromAST(keyFiles: Array<{ path: string; content: string }>): CSG {
  const csg: CSG = {
    nodes: new Map(),
    edges: [],
    outEdges: new Map(),
    inEdges: new Map(),
    nodesByType: new Map(),
    nodesByFile: new Map(),
    sourceNodes: [],
    sinkNodes: [],
    sanitizerNodes: [],
  };

  for (const file of keyFiles) {
    try {
      const ast = parser.parse(file.content, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
        errorRecovery: true
      });

      const moduleId = `module:${file.path}`;
      addNode(csg, {
        id: moduleId,
        type: "module",
        label: file.path.split("/").pop() ?? file.path,
        filePath: file.path,
        lineStart: 1,
        meta: {},
      });

      traverse(ast, {
        ImportDeclaration(path: any) {
          const importedFrom = path.node.source.value;
          const importedNames = path.node.specifiers.map((s: any) => s.local.name);
          const lineNum = path.node.loc?.start.line || 1;
          const importId = `import:${file.path}:${importedFrom}:${lineNum}`;
          
          addNode(csg, {
            id: importId,
            type: "import",
            label: `import from '${importedFrom}'`,
            filePath: file.path,
            lineStart: lineNum,
            meta: {
              importedFrom,
              importedNames,
              estimatedBundleKb: BUNDLE_COST_DB[importedFrom],
            },
          });
          
          addEdge(csg, {
            from: moduleId,
            to: importId,
            type: "imports",
          });
        },
        Function(path: any) {
          let funcName = "anonymous";
          if (path.node.id) {
            funcName = path.node.id.name;
          } else if (path.parent.type === 'VariableDeclarator' && path.parent.id.type === 'Identifier') {
            funcName = path.parent.id.name;
          } else if (path.parent.type === 'ObjectProperty' && path.parent.key.type === 'Identifier') {
            funcName = path.parent.key.name;
          } else if (path.parent.type === 'ClassMethod' && path.parent.key.type === 'Identifier') {
            funcName = path.parent.key.name;
          }

          if (["use", "if", "for", "while", "switch"].includes(funcName)) return;

          const lineNum = path.node.loc?.start.line || 1;
          const isAsync = path.node.async || false;
          const isExported = path.parentPath?.parent?.type === 'ExportNamedDeclaration' || path.parent?.type === 'ExportDefaultDeclaration';
          const paramCount = path.node.params.length;
          
          const { cyclomatic, cognitive } = computeComplexityFromAST(path);
          
          let hasReturn = false;
          let containsAsyncCall = false;
          
          path.traverse({
            ReturnStatement() { hasReturn = true; },
            AwaitExpression() { containsAsyncCall = true; },
            CallExpression(p: any) {
              if (p.node.callee.type === 'MemberExpression' && p.node.callee.property.name === 'then') {
                containsAsyncCall = true;
              }
            }
          });

          const funcId = `func:${file.path}:${funcName}:${lineNum}`;
          addNode(csg, {
            id: funcId,
            type: "function",
            label: funcName,
            filePath: file.path,
            lineStart: lineNum,
            meta: {
              isAsync,
              isExported,
              paramCount,
              cyclomaticComplexity: cyclomatic,
              cognitiveComplexity: cognitive,
              hasReturn,
              containsAsyncCall,
            },
          });

          addEdge(csg, {
            from: moduleId,
            to: funcId,
            type: "defines",
            lineNumber: lineNum,
          });

          // Inside the function, let's also find route handlers, db queries, etc.
          path.traverse({
            CallExpression(p: any) {
              const callee = p.node.callee;
              const cl = p.node.loc?.start.line || lineNum;
              
              if (callee.type === 'MemberExpression') {
                const obj = callee.object;
                const prop = callee.property;
                
                // Route handler detection
                if (obj.type === 'Identifier' && (obj.name === 'router' || obj.name === 'app')) {
                  if (prop.type === 'Identifier' && ['get', 'post', 'put', 'patch', 'delete', 'use'].includes(prop.name)) {
                    const routePath = p.node.arguments[0]?.type === 'StringLiteral' ? p.node.arguments[0].value : 'unknown';
                    const routeId = `route:${file.path}:${prop.name.toUpperCase()}:${routePath}`;
                    
                    addNode(csg, {
                      id: routeId,
                      type: "route",
                      label: `${prop.name.toUpperCase()} ${routePath}`,
                      filePath: file.path,
                      lineStart: cl,
                      meta: {
                        httpMethod: prop.name.toUpperCase(),
                        routePath,
                        hasAuthMiddleware: p.node.arguments.length > 2, // heuristic
                      },
                    });
                    
                    addEdge(csg, { from: funcId, to: routeId, type: "handles" });
                  }
                }
                
                // DB Query detection
                if (obj.type === 'Identifier' && (obj.name === 'db' || obj.name === 'prisma')) {
                  const qtype = prop.name === 'select' || prop.name === 'findMany' || prop.name === 'findFirst' || prop.name === 'findUnique' ? 'select' :
                               prop.name === 'insert' || prop.name === 'create' ? 'insert' :
                               prop.name === 'update' ? 'update' :
                               prop.name === 'delete' ? 'delete' :
                               prop.name === 'query' || prop.name === 'execute' ? 'raw' : null;
                               
                  if (qtype) {
                    const dbId = `dbquery:${file.path}:${cl}:${qtype}`;
                    const isParameterized = p.node.arguments[0]?.type !== 'TemplateLiteral';
                    
                    addNode(csg, {
                      id: dbId,
                      type: "dbquery",
                      label: `DB ${qtype}`,
                      filePath: file.path,
                      lineStart: cl,
                      meta: { 
                        queryType: qtype as any, 
                        isParameterized, 
                        estimatedCostMs: qtype === "select" ? ASYNC_COST_DB.db_query_simple : ASYNC_COST_DB.db_query_simple 
                      },
                    });
                    
                    addEdge(csg, { from: funcId, to: dbId, type: "queries" });
                  }
                }
              }
            }
          });
        },
        // Detect Taint Sources
        MemberExpression(path: any) {
          const obj = path.node.object;
          const prop = path.node.property;
          const lineNum = path.node.loc?.start.line || 1;
          
          if (obj.type === 'Identifier' && obj.name === 'req') {
            if (prop.type === 'Identifier' && ['body', 'query', 'params', 'headers', 'cookies'].includes(prop.name)) {
              const srcId = `source:${file.path}:${lineNum}:req.${prop.name}`;
              if (!csg.nodes.has(srcId)) {
                addNode(csg, {
                  id: srcId,
                  type: "source",
                  label: `req.${prop.name}`,
                  filePath: file.path,
                  lineStart: lineNum,
                  meta: { isSource: true, isTainted: true },
                });
              }
            }
          }
        },
        // Detect Taint Sinks
        CallExpression(path: any) {
          const callee = path.node.callee;
          const lineNum = path.node.loc?.start.line || 1;
          
          if (callee.type === 'Identifier' && callee.name === 'eval') {
            const sinkId = `sink:${file.path}:${lineNum}:code_injection`;
            addNode(csg, {
              id: sinkId,
              type: "sink",
              label: "eval() call",
              filePath: file.path,
              lineStart: lineNum,
              meta: { isSink: true, vulnType: "code_injection" } as any,
            });
          }
        }
      });
    } catch (e) {
      console.error(`Babel Parse Error in ${file.path}:`, e);
    }
  }

  return csg;
}
