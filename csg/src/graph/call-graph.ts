import traverse from '../utils/traverse.js';
import type { Node, Function as BabelFunction, CallExpression, NewExpression, ArrowFunctionExpression, FunctionExpression, ClassMethod, ObjectMethod, VariableDeclarator, AssignmentExpression, ReturnStatement } from '@babel/types';
import type { CallSite, CallKind, FunctionScope, CSGGraph, NodeId, ParseResult } from '../types.js';
import { callSiteId, funcScopeId } from '../utils/id.js';

export class CallGraphBuilder {
  private graph!: CSGGraph;
  private localNameToFnId: Map<string, NodeId[]> = new Map();

  build(parsed: ParseResult[], graph: CSGGraph): void {
    this.graph = graph;
    this.localNameToFnId = new Map();

    // Pass 1: collect all function scopes
    for (const p of parsed) {
      this.collectFunctions(p);
    }

    // Pass 2: resolve call sites
    for (const p of parsed) {
      this.resolveCalls(p);
    }

    // Pass 3: detect entry points
    this.detectEntryPoints(parsed);

    // Pass 4: find async chains
    this.findAsyncChains();
  }

  private collectFunctions(parsed: ParseResult): void {
    traverse(parsed.ast, {
      Function: (path) => {
        const node = path.node as BabelFunction;
        const fnId = this.graph.astNodes.size > 0 ? this.findASTNodeId(node) : null;
        if (!fnId) return;

        const name = (node as any).id?.name
          || ((path.parent as any)?.id?.name)
          || ((path.parent as any)?.key?.name)
          || null;

        const scope: FunctionScope = {
          id: fnId,
          name,
          type: this.getFunctionType(node),
          params: node.params.map(p => (p as any)?.name || (p as any)?.left?.name || '?'),
          body: this.findASTNodeId(node.body) || '',
          loc: {
            file: parsed.file,
            start: { line: node.loc?.start.line ?? 0, col: node.loc?.start.column ?? 0 },
            end: { line: node.loc?.end.line ?? 0, col: node.loc?.end.column ?? 0 },
          },
          parentScope: null,
          childScopes: [],
          captures: [],
          calls: [],
          isExported: false,
          async: node.async ?? false,
          generator: node.generator ?? false,
        };

        this.graph.callGraph.functions.set(fnId, scope);

        if (name) {
          const existing = this.localNameToFnId.get(name) || [];
          existing.push(fnId);
          this.localNameToFnId.set(name, existing);
        }
      },

      VariableDeclarator: (path) => {
        const node = path.node as VariableDeclarator;
        const init = node.init;
        if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')) {
          const fnId = this.findASTNodeId(init);
          if (fnId) {
            const name = (node.id as any)?.name || null;
            const scope = this.graph.callGraph.functions.get(fnId);
            if (scope && name && !scope.name) {
              scope.name = name;
              const existing = this.localNameToFnId.get(name) || [];
              existing.push(fnId);
              this.localNameToFnId.set(name, existing);
            }
          }
        }
      },

      AssignmentExpression: (path) => {
        const node = path.node as AssignmentExpression;
        const rhs = node.right;
        if (rhs && (rhs.type === 'ArrowFunctionExpression' || rhs.type === 'FunctionExpression')) {
          const fnId = this.findASTNodeId(rhs);
          if (fnId) {
            const name = this.getAssignmentLHS(node);
            const scope = this.graph.callGraph.functions.get(fnId);
            if (scope && name && !scope.name) {
              scope.name = name;
              const existing = this.localNameToFnId.get(name) || [];
              existing.push(fnId);
              this.localNameToFnId.set(name, existing);
            }
          }
        }
      },
    });

    // Build scope hierarchy
    this.buildScopeHierarchy(parsed);
  }

  private getAssignmentLHS(node: AssignmentExpression): string | null {
    const left = node.left;
    if (left.type === 'Identifier') return left.name;
    if (left.type === 'MemberExpression') {
      return `${this.memberExprToString(left)}`;
    }
    return null;
  }

  private memberExprToString(expr: any): string {
    if (expr.type === 'Identifier') return expr.name;
    if (expr.type === 'MemberExpression') {
      return `${this.memberExprToString(expr.object)}.${this.memberExprToString(expr.property)}`;
    }
    if (expr.type === 'StringLiteral') return expr.value;
    return '?';
  }

  private buildScopeHierarchy(parsed: ParseResult): void {
    const fnIds = [...this.graph.callGraph.functions.keys()];

    for (const fnId of fnIds) {
      const scope = this.graph.callGraph.functions.get(fnId)!;
      const fnNode = this.findRawNode(fnId);
      if (!fnNode) continue;

      // Walk up to find parent function
      let parent: any = fnNode as any;
      while (parent) {
        parent = (parent as any)?.$parent || this.findParentScope(parent);

        if (parent && (parent.type === 'FunctionExpression' || parent.type === 'FunctionDeclaration' || parent.type === 'ArrowFunctionExpression' || parent.type === 'ObjectMethod' || parent.type === 'ClassMethod')) {
          const parentId = this.findASTNodeId(parent);
          if (parentId && this.graph.callGraph.functions.has(parentId)) {
            scope.parentScope = parentId;
            const parentScope = this.graph.callGraph.functions.get(parentId);
            if (parentScope && !parentScope.childScopes.includes(fnId)) {
              parentScope.childScopes.push(fnId);
            }
            break;
          }
        }
      }
    }
  }

  private findParentScope(node: Node): Node | null {
    // Walk the astNode parent chain
    const nodeId = this.findASTNodeId(node);
    if (!nodeId) return null;
    const csgNode = this.graph.astNodes.get(nodeId);
    if (!csgNode || !csgNode.parentId) return null;
    const parentId = csgNode.parentId;
    const parentCSG = this.graph.astNodes.get(parentId);
    return parentCSG?.raw || null;
  }

  private resolveCalls(parsed: ParseResult): void {
    traverse(parsed.ast, {
      CallExpression: (path) => {
        const node = path.node as CallExpression;
        this.processCall(node, 'direct', parsed);
      },

      NewExpression: (path) => {
        const node = path.node as NewExpression;
        this.processCall(node as any, 'constructor', parsed);
      },
    });
  }

  private processCall(node: CallExpression | any, kind: CallKind, parsed: ParseResult): void {
    const callerFn = this.findEnclosingFunction(node);
    const calleeName = this.getCalleeName(node);
    const calleeIds = calleeName ? (this.localNameToFnId.get(calleeName) || []) : [];

    const calleeNode = node.callee;
    const calleeFnId = calleeName
      ? (this.localNameToFnId.get(calleeName)?.[0] ?? this.findASTNodeId(calleeNode))
      : this.findASTNodeId(calleeNode);

    const isAsync = (node.callee as any)?.type === 'Import' || calleeName === 'async' || calleeName?.includes('then');

    const callSite: CallSite = {
      id: callSiteId(),
      kind,
      caller: callerFn || '',
      callee: calleeFnId || '',
      calleeName: calleeName || null,
      arguments: node.arguments?.map((a: Node) => this.findASTNodeId(a)).filter(Boolean) || [],
      loc: {
        file: parsed.file,
        start: { line: node.loc?.start.line ?? 0, col: node.loc?.start.column ?? 0 },
        end: { line: node.loc?.end.line ?? 0, col: node.loc?.end.column ?? 0 },
      },
      isAsync: isAsync ?? false,
      isTailCall: this.isTailCall(node, callerFn),
    };

    this.graph.callGraph.calls.push(callSite);

    if (callerFn) {
      const callerScope = this.graph.callGraph.functions.get(callerFn);
      if (callerScope) {
        callerScope.calls.push(callSite);
      }
    }

    if (!calleeFnId && calleeName) {
      this.graph.callGraph.unresolved.push(callSite);
    }
  }

  private findEnclosingFunction(node: Node): NodeId | null {
    let current: Node | null = node;

    // Walk up through parent nodes
    const nodeId = this.findASTNodeId(node);
    if (!nodeId) return null;

    let csgNode = this.graph.astNodes.get(nodeId);
    while (csgNode && csgNode.parentId) {
      const parentId = csgNode.parentId;
      const parent = this.graph.astNodes.get(parentId);
      if (!parent) break;

      if (parent.raw && (
        parent.raw.type === 'FunctionDeclaration' ||
        parent.raw.type === 'FunctionExpression' ||
        parent.raw.type === 'ArrowFunctionExpression' ||
        parent.raw.type === 'ObjectMethod' ||
        parent.raw.type === 'ClassMethod'
      )) {
        // Check if this function is registered in our call graph
        for (const [fnId] of this.graph.callGraph.functions) {
          const fnNode = this.graph.astNodes.get(fnId);
          if (fnNode?.raw === parent.raw) return fnId;
        }
      }

      csgNode = parent;
    }

    return null;
  }

  private getCalleeName(node: CallExpression): string | null {
    const callee = node.callee;
    if (callee.type === 'Identifier') return callee.name;
    if (callee.type === 'MemberExpression') {
      const prop = (callee as any).property;
      if (prop?.type === 'Identifier') return `${this.memberExprToString(callee.object)}.${prop.name}`;
      if (prop?.type === 'StringLiteral') return `${this.memberExprToString(callee.object)}.${prop.value}`;
    }
    return null;
  }

  private isTailCall(node: CallExpression, callerFnId: NodeId | null): boolean {
    if (!callerFnId) return false;
    const callerScope = this.graph.callGraph.functions.get(callerFnId);
    if (!callerScope) return false;

    // Check if the call expression is in return position
    const callerNode = this.findRawNode(callerFnId);
    if (!callerNode) return false;

    // Walk up from node to see if we're inside a return statement
    let current = node as any;
    while (current && (current as any).$parent) {
      const parent = (current as any).$parent;
      if (parent.type === 'ReturnStatement') return true;
      if (parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression') break;
      current = parent;
    }

    return false;
  }

  private detectEntryPoints(parsed: ParseResult[]): void {
    // Entry points are top-level function calls or exported functions
    for (const p of parsed) {
      traverse(p.ast, {
        ExpressionStatement: (path) => {
          const expr = path.node.expression;
          if (expr.type === 'CallExpression') {
            const topFn = this.findASTNodeId((expr as CallExpression).callee);
            if (topFn && this.graph.callGraph.functions.has(topFn)) {
              this.graph.callGraph.entryPoints.push(topFn);
            }
          }
        },
        // Exported functions are entry points for the module
        ExportDefaultDeclaration: (path) => {
          const decl = path.node.declaration;
          if ((decl as any)?.type === 'FunctionDeclaration' || (decl as any)?.type === 'FunctionExpression') {
            const fnId = this.findASTNodeId(decl);
            if (fnId) {
              this.graph.callGraph.entryPoints.push(fnId);
              const scope = this.graph.callGraph.functions.get(fnId);
              if (scope) scope.isExported = true;
            }
          }
        },
        ExportNamedDeclaration: (path) => {
          const decl = path.node.declaration as any;
          if (decl?.type === 'FunctionDeclaration' && decl.id) {
            const fnId = this.findASTNodeId(decl);
            if (fnId) {
              this.graph.callGraph.entryPoints.push(fnId);
              const scope = this.graph.callGraph.functions.get(fnId);
              if (scope) scope.isExported = true;
            }
          }
        },
      });
    }

    // Filter unique
    const unique = new Set(this.graph.callGraph.entryPoints);
    this.graph.callGraph.entryPoints = [...unique];
  }

  private findAsyncChains(): void {
    const visited = new Set<NodeId>();
    const chains: NodeId[][] = [];

    for (const entry of this.graph.callGraph.entryPoints) {
      const chain: NodeId[] = [];
      this.dfsAsync(entry, chain, chains, visited);
    }

    this.graph.callGraph.asyncChains = chains;
  }

  private dfsAsync(
    fnId: NodeId,
    chain: NodeId[],
    chains: NodeId[][],
    visited: Set<NodeId>
  ): void {
    if (visited.has(fnId)) return;
    const scope = this.graph.callGraph.functions.get(fnId);
    if (!scope || !scope.async) return;

    visited.add(fnId);
    chain.push(fnId);

    for (const call of scope.calls) {
      const calleeScope = this.graph.callGraph.functions.get(call.callee);
      if (calleeScope && calleeScope.async && !visited.has(call.callee)) {
        this.dfsAsync(call.callee, [...chain], chains, visited);
      }
    }

    if (chain.length > 1) {
      chains.push(chain);
    }
  }

  private getFunctionType(node: BabelFunction): FunctionScope['type'] {
    if (node.async) return 'async';
    if (node.generator) return 'generator';
    if (node.type === 'ArrowFunctionExpression') return 'arrow';
    if (node.type === 'FunctionExpression') return 'function';
    if (node.type === 'FunctionDeclaration') return 'function';
    if ((node as any)?.type === 'ObjectMethod') {
      const m = node as any;
      if (m.kind === 'get') return 'getter';
      if (m.kind === 'set') return 'setter';
      return 'method';
    }
    if ((node as any)?.type === 'ClassMethod') return 'method';
    return 'function';
  }

  private findRawNode(fnId: NodeId): Node | null {
    const csgNode = this.graph.astNodes.get(fnId);
    return csgNode?.raw || null;
  }

  private findASTNodeId(node: Node): NodeId | null {
    for (const [id, csgNode] of this.graph.astNodes) {
      if (csgNode.raw === node) return id;
    }
    return null;
  }
}
