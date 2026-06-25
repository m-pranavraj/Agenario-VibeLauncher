import traverse from '../utils/traverse.js';
import type { Node, Function as BabelFunction, IfStatement, SwitchStatement, TryStatement, ForStatement, WhileStatement, DoWhileStatement, ForInStatement, ForOfStatement, ConditionalExpression, LogicalExpression, ThrowStatement, ReturnStatement, LabeledStatement } from '@babel/types';
import type { CFGBlock, CFGBlockType, CSGGraph, NodeId, SourceLocation, ParseResult } from '../types.js';
import { cfgBlockId, astNodeId } from '../utils/id.js';

export class CFGBuilder {
  build(parsed: ParseResult[], graph: CSGGraph): void {
    for (const p of parsed) {
      this.buildFileCFG(p, graph);
    }
  }

  private buildFileCFG(parsed: ParseResult, graph: CSGGraph): void {
    const { ast } = parsed;

    // Create file entry/exit blocks
    const entry = this.createBlock('entry', `${parsed.file}:entry`, null);
    const exit = this.createBlock('exit', `${parsed.file}:exit`, null);
    graph.cfg.entryBlock = entry.id;
    graph.cfg.exitBlock = exit.id;

    // Build CFG per function
    traverse(ast, {
      Function: (path) => {
        const fnNode = path.node as BabelFunction;
        const fnId = this.findASTNodeId(fnNode, graph);
        if (!fnId) return;

        const entryBlock = this.createBlock('entry', `${fnNode.type?.startsWith('Arrow') ? 'arrow' : 'function'}:${(fnNode as any).id?.name || 'anonymous'}`, fnNode.loc as any);
        const exitBlock = this.createBlock('exit', 'return', null);

        const fnCFG: { entry: NodeId; exit: NodeId; blocks: NodeId[] } = {
          entry: entryBlock.id,
          exit: exitBlock.id,
          blocks: [entryBlock.id, exitBlock.id],
        };

        entryBlock.successors.push(exitBlock.id);
        exitBlock.predecessors.push(entryBlock.id);

        graph.cfg.functionCFGs.set(fnId, fnCFG);
        graph.cfg.blocks.set(entryBlock.id, entryBlock);
        graph.cfg.blocks.set(exitBlock.id, exitBlock);

        // Walk the function body for control flow
        if (fnNode.body) {
          this.walkBlock(fnNode.body, entryBlock, exitBlock, graph, parsed);
        }
      },
    });
  }

  private walkBlock(
    body: Node,
    entry: CFGBlock,
    exit: CFGBlock,
    graph: CSGGraph,
    parsed: ParseResult
  ): void {
    const bodyNode = body as any;
    let currentBlock = entry;

    if (bodyNode.body && Array.isArray(bodyNode.body)) {
      for (const stmt of bodyNode.body) {
        const block = this.processStatement(stmt, currentBlock, exit, graph, parsed);
        if (block) currentBlock = block;
      }
    } else if (bodyNode.body) {
      const block = this.processStatement(bodyNode.body, currentBlock, exit, graph, parsed);
      if (block) currentBlock = block;
    }
  }

  private processStatement(
    stmt: Node,
    current: CFGBlock,
    exit: CFGBlock,
    graph: CSGGraph,
    parsed: ParseResult
  ): CFGBlock | null {
    switch (stmt.type) {
      case 'IfStatement': return this.processIf(stmt as IfStatement, current, exit, graph, parsed);
      case 'SwitchStatement': return this.processSwitch(stmt as SwitchStatement, current, exit, graph, parsed);
      case 'TryStatement': return this.processTry(stmt as TryStatement, current, exit, graph, parsed);
      case 'ForStatement': case 'WhileStatement': case 'DoWhileStatement':
      case 'ForInStatement': case 'ForOfStatement':
        return this.processLoop(stmt, current, exit, graph, parsed);
      case 'ThrowStatement': return this.processThrow(stmt as ThrowStatement, current, graph, parsed);
      case 'ReturnStatement': return this.processReturn(stmt as ReturnStatement, current, exit, graph, parsed);
      case 'LabeledStatement': return this.processLabeled(stmt as LabeledStatement, current, exit, graph, parsed);
      case 'ExpressionStatement': case 'VariableDeclaration':
      case 'FunctionDeclaration': case 'ClassDeclaration':
        return this.addToBlock(stmt, current, graph, parsed);
      default:
        return this.addToBlock(stmt, current, graph, parsed);
    }
  }

  private processIf(
    stmt: IfStatement,
    current: CFGBlock,
    exit: CFGBlock,
    graph: CSGGraph,
    parsed: ParseResult
  ): CFGBlock {
    const branch = this.createBlock('branch', `if (${this.exprSummary(stmt.test)})`, stmt.loc as any);
    branch.condition = this.exprSummary(stmt.test);
    this.linkBlocks(current, branch, graph);

    const merge = this.createBlock('merge', 'if-merge', null);

    // Consequent
    const conseqBlock = this.createBlock('basic', 'if-true', null);
    this.linkBlocks(branch, conseqBlock, graph);
    branch.branchTargets.set('true', conseqBlock.id);
    const afterConseq = this.processStatement(stmt.consequent, conseqBlock, exit, graph, parsed) || conseqBlock;
    this.linkBlocks(afterConseq, merge, graph);

    // Alternate
    if (stmt.alternate) {
      const altBlock = this.createBlock('basic', 'if-false', null);
      this.linkBlocks(branch, altBlock, graph);
      branch.branchTargets.set('false', altBlock.id);
      const afterAlt = this.processStatement(stmt.alternate, altBlock, exit, graph, parsed) || altBlock;
      this.linkBlocks(afterAlt, merge, graph);
    } else {
      branch.branchTargets.set('false', merge.id);
      this.linkBlocks(branch, merge, graph);
    }

    graph.cfg.blocks.set(merge.id, merge);
    return merge;
  }

  private processSwitch(
    stmt: SwitchStatement,
    current: CFGBlock,
    exit: CFGBlock,
    graph: CSGGraph,
    parsed: ParseResult
  ): CFGBlock {
    const branch = this.createBlock('switch-case', `switch (${this.exprSummary(stmt.discriminant)})`, stmt.loc as any);
    this.linkBlocks(current, branch, graph);

    const merge = this.createBlock('merge', 'switch-merge', null);
    graph.cfg.blocks.set(merge.id, merge);

    let lastCaseBlock = branch;
    for (const caseClause of stmt.cases) {
      const label = caseClause.test ? `case ${this.exprSummary(caseClause.test)}` : 'default';
      const caseBlock = this.createBlock('switch-case', label, caseClause.loc as any);
      this.linkBlocks(lastCaseBlock, caseBlock, graph);
      if (lastCaseBlock === branch) {
        branch.branchTargets.set(label, caseBlock.id);
      }
      lastCaseBlock = caseBlock;

      for (const conv of caseClause.consequent) {
        const handled = this.processStatement(conv, lastCaseBlock, exit, graph, parsed);
        if (handled && conv.type === 'BreakStatement') {
          this.linkBlocks(lastCaseBlock, merge, graph);
          lastCaseBlock = merge;
        } else if (handled) {
          lastCaseBlock = handled;
        }
      }
    }

    // Fall-through to merge
    if (lastCaseBlock !== merge) {
      this.linkBlocks(lastCaseBlock, merge, graph);
    }

    return merge;
  }

  private processTry(
    stmt: TryStatement,
    current: CFGBlock,
    exit: CFGBlock,
    graph: CSGGraph,
    parsed: ParseResult
  ): CFGBlock {
    const tryBlock = this.createBlock('try', 'try', stmt.loc as any);
    this.linkBlocks(current, tryBlock, graph);

    const catchBlock = stmt.handler
      ? this.createBlock('catch', `catch${stmt.handler.param ? ` (${(stmt.handler.param as any).name || 'param'})` : ''}`, stmt.handler.loc as any)
      : null;
    const finallyBlock = stmt.finalizer
      ? this.createBlock('finally', 'finally', stmt.finalizer.loc as any)
      : null;
    const merge = this.createBlock('merge', 'try-merge', null);

    // Try body -> exit or catch
    this.walkBlock(stmt.block.body as any, tryBlock, exit, graph, parsed);
    this.linkBlocks(tryBlock, catchBlock || merge, graph);

    if (catchBlock) {
      graph.cfg.blocks.set(catchBlock.id, catchBlock);
      this.walkBlock(stmt.handler!.body.body as any, catchBlock, exit, graph, parsed);
      this.linkBlocks(catchBlock, finallyBlock || merge, graph);
    }

    if (finallyBlock) {
      graph.cfg.blocks.set(finallyBlock.id, finallyBlock);
      this.linkBlocks(finallyBlock, merge, graph);
    }

    graph.cfg.blocks.set(merge.id, merge);
    return merge;
  }

  private processLoop(
    stmt: Node,
    current: CFGBlock,
    exit: CFGBlock,
    graph: CSGGraph,
    parsed: ParseResult
  ): CFGBlock {
    const header = this.createBlock('loop-header', stmt.type, (stmt as any).loc as any);
    this.linkBlocks(current, header, graph);

    const bodyBlock = this.createBlock('basic', `${stmt.type}-body`, null);
    this.linkBlocks(header, bodyBlock, graph);

    // Walk body
    const body = (stmt as any).body;
    if (body?.body && Array.isArray(body.body)) {
      for (const s of body.body) {
        this.processStatement(s, bodyBlock, exit, graph, parsed);
      }
    } else if (body) {
      this.processStatement(body, bodyBlock, exit, graph, parsed);
    }

    // Loop back to header
    const back = this.createBlock('loop-back', `${stmt.type}-back`, null);
    this.linkBlocks(bodyBlock, back, graph);
    this.linkBlocks(back, header, graph);

    // Exit edge
    const merge = this.createBlock('merge', `${stmt.type}-exit`, null);
    this.linkBlocks(header, merge, graph);

    graph.cfg.blocks.set(merge.id, merge);
    return merge;
  }

  private processThrow(
    stmt: ThrowStatement,
    current: CFGBlock,
    graph: CSGGraph,
    parsed: ParseResult
  ): CFGBlock {
    const block = this.createBlock('throw', `throw ${this.exprSummary(stmt.argument)}`, stmt.loc as any);
    this.linkBlocks(current, block, graph);
    // No successors — terminates
    return block;
  }

  private processReturn(
    stmt: ReturnStatement,
    current: CFGBlock,
    exit: CFGBlock,
    graph: CSGGraph,
    parsed: ParseResult
  ): CFGBlock {
    const block = this.createBlock('basic', stmt.argument ? `return ${this.exprSummary(stmt.argument)}` : 'return', stmt.loc as any);
    this.linkBlocks(current, block, graph);
    this.linkBlocks(block, exit, graph);
    return block;
  }

  private processLabeled(
    stmt: LabeledStatement,
    current: CFGBlock,
    exit: CFGBlock,
    graph: CSGGraph,
    parsed: ParseResult
  ): CFGBlock {
    const block = this.createBlock('basic', `${stmt.label.name}:`, stmt.loc as any);
    this.linkBlocks(current, block, graph);
    return this.processStatement(stmt.body, block, exit, graph, parsed) || block;
  }

  private addToBlock(
    stmt: Node,
    current: CFGBlock,
    graph: CSGGraph,
    _parsed: ParseResult
  ): CFGBlock {
    const nodeId = this.findASTNodeId(stmt, graph);
    if (nodeId) {
      current.astNodes.push(nodeId);
    }
    return current;
  }

  /* ─── helpers ─── */

  private createBlock(type: CFGBlockType, label: string, loc: any): CFGBlock {
    return {
      id: cfgBlockId(),
      type,
      label,
      astNodes: [],
      loc: loc ? { file: loc?.file || '', start: { line: loc.start.line, col: loc.start.column ?? 0 }, end: { line: loc.end.line, col: loc.end.column ?? 0 } } : null,
      predecessors: [],
      successors: [],
      condition: null,
      branchTargets: new Map(),
    };
  }

  private linkBlocks(from: CFGBlock, to: CFGBlock, graph: CSGGraph): void {
    if (!from || !to) return;

    // Don't register blocks that already exist in graph
    if (!graph.cfg.blocks.has(from.id)) {
      graph.cfg.blocks.set(from.id, from);
    }
    if (!graph.cfg.blocks.has(to.id)) {
      graph.cfg.blocks.set(to.id, to);
    }

    if (!from.successors.includes(to.id)) {
      from.successors.push(to.id);
    }
    if (!to.predecessors.includes(from.id)) {
      to.predecessors.push(from.id);
    }
  }

  private linkBlocksById(fromId: NodeId, toId: NodeId, graph: CSGGraph): void {
    const from = graph.cfg.blocks.get(fromId);
    const to = graph.cfg.blocks.get(toId);
    if (from && to) this.linkBlocks(from, to, graph);
  }

  private exprSummary(expr: Node | null | undefined): string {
    if (!expr) return '∅';
    switch (expr.type) {
      case 'Identifier': return (expr as any).name;
      case 'NumericLiteral': case 'StringLiteral': case 'BooleanLiteral':
        return String((expr as any).value);
      case 'BinaryExpression':
        return `${this.exprSummary((expr as any).left)} ${(expr as any).operator} ${this.exprSummary((expr as any).right)}`;
      case 'CallExpression':
        return `${this.exprSummary((expr as any).callee)}(...)`;
      case 'MemberExpression':
        return `${this.exprSummary((expr as any).object)}.${(expr as any).property?.name || '(?)'}`;
      case 'UnaryExpression':
        return `${(expr as any).operator}${this.exprSummary((expr as any).argument)}`;
      default:
        return (expr as any).name || expr.type;
    }
  }

  private findASTNodeId(node: Node, graph: CSGGraph): NodeId | null {
    for (const [id, csgNode] of graph.astNodes) {
      if (csgNode.raw === node) return id;
    }
    return null;
  }
}
