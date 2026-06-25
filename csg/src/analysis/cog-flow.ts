import * as traverse from '@babel/traverse';
import type { ParseResult, CSGGraph } from '../types.js';
import type { CognitiveComplexityItem, DOMTreeDepth, CogFlowReport } from '../types.js';

const NESTING_BOOST = 1;
const LOGICAL_OP_BOOST = 1;
const CATCH_BOOST = 1;
const RECURSION_BOOST = 4;
const JUMP_BOOST = 2;

export class CogFlow {
  private functionResults: CognitiveComplexityItem[] = [];
  private domTrees: DOMTreeDepth[] = [];

  analyze(parsed: ParseResult[], graph: CSGGraph): CogFlowReport {
    this.functionResults = [];
    this.domTrees = [];

    for (const p of parsed) {
      this.analyzeFile(p);
      this.analyzeDOMDepth(p);
    }

    const complexities = this.functionResults.map(f => f.complexity);
    const maxComplexity = complexities.length > 0 ? Math.max(...complexities) : 0;
    const avgComplexity = complexities.length > 0
      ? Math.round(complexities.reduce((a, b) => a + b, 0) / complexities.length)
      : 0;
    const totalHighComplexity = this.functionResults.filter(f => f.category === 'high' || f.category === 'extreme').length;

    const score = maxComplexity === 0 ? 100
      : Math.max(0, Math.min(100, Math.round(100 - (avgComplexity / 30) * 50 - (totalHighComplexity / Math.max(this.functionResults.length, 1)) * 30)));

    return {
      functions: this.functionResults, domTrees: this.domTrees,
      maxComplexity, avgComplexity, totalHighComplexity, score,
    };
  }

  private analyzeFile(p: ParseResult): void {
    const defaultTraverse = (traverse.default || traverse) as typeof traverse.default;
    defaultTraverse(p.ast, {
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': (path: any) => {
        const node = path.node;
        const body = node.body;
        if (!body) return;

        const fnName = this.getFunctionName(node, path);
        const breakdown = this.computeComplexityBreakdown(node, path);
        const total = breakDownToTotal(breakdown);
        const category = this.classify(total);

        this.functionResults.push({
          functionName: fnName, file: p.file,
          line: node.loc?.start?.line ?? 0,
          complexity: total, breakdown, category,
        });
      },
    });
  }

  private computeComplexityBreakdown(node: any, path: any): CognitiveComplexityItem['breakdown'] {
    let nesting = 0;
    let logicalOps = 0;
    let recursion = 0;
    let jumps = 0;
    let catchBlocks = 0;
    let loops = 0;
    let conditionals = 0;

    const fnName = this.getFunctionName(node, path);

    path.traverse({
      'IfStatement|ConditionalExpression|SwitchCase': () => {
        conditionals++;
        nesting += NESTING_BOOST * this.getNestingLevel(path);
      },
      'ForStatement|ForInStatement|ForOfStatement|WhileStatement|DoWhileStatement': (p: any) => {
        loops++;
        nesting += NESTING_BOOST * this.getNestingLevel(p);
      },
      LogicalExpression: (p: any) => {
        if (p.node.operator === '&&' || p.node.operator === '||') logicalOps++;
      },
      CatchClause: () => { catchBlocks++; },
      BreakStatement: () => { jumps++; },
      ContinueStatement: () => { jumps++; },
      ReturnStatement: (p: any) => {
        const code = this.nodeToCode(p.node);
        if (code.length > 20) jumps++;
      },
      CallExpression: (p: any) => {
        const callee = this.nodeToCode(p.node.callee);
        if (callee === fnName || callee.endsWith(`.${fnName}`)) recursion++;
      },
    });

    return { nesting, logicalOps, recursion, jumps, catchBlocks, loops, conditionals };
  }

  private getNestingLevel(path: any): number {
    let level = 0;
    let current = path.parentPath;
    while (current) {
      if (this.isControlStructure(current)) level++;
      current = current.parentPath;
    }
    return level;
  }

  private isControlStructure(path: any): boolean {
    const type = path.node?.type;
    return !!type && [
      'IfStatement', 'SwitchCase', 'ForStatement', 'ForInStatement',
      'ForOfStatement', 'WhileStatement', 'DoWhileStatement',
      'CatchClause', 'ConditionalExpression',
    ].includes(type);
  }

  private getFunctionName(node: any, path: any): string {
    if (node.id?.name) return node.id.name;
    const parent = path.parentPath?.node;
    if (parent?.type === 'VariableDeclarator' && parent.id?.name) return parent.id.name;
    if (parent?.type === 'AssignmentExpression' && parent.left?.property?.name) return parent.left.property.name;
    if (parent?.type === 'ObjectProperty' && parent.key?.name) return parent.key.name;
    if (parent?.type === 'MethodDefinition' && parent.key?.name) return parent.key.name;
    return `anonymous_${node.loc?.start?.line ?? 0}`;
  }

  private analyzeDOMDepth(p: ParseResult): void {
    let maxDepth = 0;
    let totalDepth = 0;
    let elements = 0;

    const defaultTraverse = (traverse.default || traverse) as typeof traverse.default;
    defaultTraverse(p.ast, {
      JSXElement: (path: any) => {
        const depth = this.jsxDepth(path);
        maxDepth = Math.max(maxDepth, depth);
        totalDepth += depth;
        elements++;
      },
      JSXFragment: (path: any) => {
        const depth = this.jsxDepth(path);
        maxDepth = Math.max(maxDepth, depth);
        totalDepth += depth;
        elements++;
      },
    });

    if (elements > 0) {
      this.domTrees.push({
        file: p.file, maxDepth, avgDepth: Math.round((totalDepth / elements) * 10) / 10, elements,
      });
    }
  }

  private jsxDepth(path: any): number {
    let depth = 1;
    let current = path.parentPath;
    while (current) {
      if (current.node?.type === 'JSXElement' || current.node?.type === 'JSXFragment') depth++;
      current = current.parentPath;
    }
    return depth;
  }

  private classify(score: number): CognitiveComplexityItem['category'] {
    if (score <= 5) return 'low';
    if (score <= 15) return 'moderate';
    if (score <= 30) return 'high';
    return 'extreme';
  }

  private nodeToCode(node: any): string {
    if (!node) return '';
    try {
      const { default: generate } = require('@babel/generator');
      return generate(node).code;
    } catch { return ''; }
  }
}

function breakDownToTotal(b: CognitiveComplexityItem['breakdown']): number {
  return b.nesting + b.logicalOps + b.recursion + b.jumps + b.catchBlocks + b.loops + b.conditionals;
}
