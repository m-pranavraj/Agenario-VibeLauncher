import type { Node } from '@babel/types';
import { createHash } from 'node:crypto';

export interface NormalizedASTNode {
  type: string;
  children: NormalizedASTNode[];
  role: string | null;
}

export interface ASTFingerprint {
  functionName: string;
  loc: { start: { line: number }; end: { line: number } } | null;
  structuralHash: string;
  normalizedTree: NormalizedASTNode;
  minHashSig: number[];
  nodeTypeHistogram: Map<string, number>;
  depth: number;
  nodeCount: number;
  topologicalShape: string;
}

const IDENTIFIER_NODES = new Set([
  'Identifier', 'PrivateName', 'TypeParameter',
  'TSTypeParameter', 'TSQualifiedName',
]);

const NAME_BEARING_NODES = new Set([
  'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression',
  'ClassDeclaration', 'ClassExpression', 'MethodDefinition',
  'VariableDeclarator', 'AssignmentExpression',
  'ImportSpecifier', 'ImportDefaultSpecifier',
  'ExportSpecifier', 'ExportDefaultSpecifier',
  'LabeledStatement', 'BreakStatement', 'ContinueStatement',
]);

const LITERAL_VALUE_NODES = new Set([
  'StringLiteral', 'NumericLiteral', 'BooleanLiteral',
  'NullLiteral', 'RegExpLiteral', 'BigIntLiteral',
  'DecimalLiteral',
]);

const SKIP_KEYS = new Set([
  'loc', 'start', 'end', 'leadingComments', 'trailingComments',
  'innerComments', 'extra',
]);

const MINHASH_PERMUTATIONS = 64;
const MINHASH_PRIME = 4294967311;

function hashToInt(val: string): number {
  const h = createHash('md5').update(val).digest();
  return h.readUInt32BE(0) % MINHASH_PRIME;
}

function minHashSignature(tokens: string[]): number[] {
  const sig: number[] = new Array(MINHASH_PERMUTATIONS).fill(Infinity);
  for (let i = 0; i < MINHASH_PERMUTATIONS; i++) {
    const a = (i * 12345 + 67890) % MINHASH_PRIME;
    const b = (i * 54321 + 9876) % MINHASH_PRIME;
    for (const tok of tokens) {
      const h = (a * hashToInt(tok) + b) % MINHASH_PRIME;
      if (h < sig[i]) sig[i] = h;
    }
  }
  return sig;
}

function jaccardSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / a.length;
}

function stripNode(node: Node, role: string | null): NormalizedASTNode {
  const type = node.type;

  if (IDENTIFIER_NODES.has(type)) {
    return { type, children: [], role };
  }

  if (type === 'StringLiteral' || type === 'NumericLiteral' || type === 'BooleanLiteral') {
    return { type, children: [], role: null };
  }

  const children: NormalizedASTNode[] = [];
  const childRole = inferRole(node);

  const nodeObj = node as any;
  for (const key of Object.keys(nodeObj)) {
    if (SKIP_KEYS.has(key)) continue;
    if (key === 'type') continue;

    const val = nodeObj[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item.type === 'string') {
          children.push(stripNode(item as Node, key));
        }
      }
    } else if (val && typeof val.type === 'string') {
      children.push(stripNode(val as Node, key));
    }
  }

  return { type, children, role };
}

function inferRole(node: Node): string | null {
  const n = node as any;
  if (NAME_BEARING_NODES.has(node.type) && n.id?.name) return `def:${n.id.type}`;
  if (node.type === 'MemberExpression') return 'member_access';
  if (node.type === 'CallExpression') {
    const callee = n.callee;
    if (callee?.type === 'MemberExpression') {
      return 'method_call';
    }
    return 'function_call';
  }
  return null;
}

function serializeTree(node: NormalizedASTNode): string {
  if (node.children.length === 0) return node.type;
  const childStrs = node.children.map(serializeTree);
  return `${node.type}(${childStrs.join(',')})`;
}

function topologicalFingerprint(node: NormalizedASTNode): string {
  const serialized = serializeTree(node);
  return createHash('sha256').update(serialized).digest('hex');
}

function collectNodeTypes(node: NormalizedASTNode, hist: Map<string, number>): void {
  hist.set(node.type, (hist.get(node.type) || 0) + 1);
  for (const c of node.children) collectNodeTypes(c, hist);
}

function computeDepth(node: NormalizedASTNode): number {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(computeDepth));
}

function computeNodeCount(node: NormalizedASTNode): number {
  let count = 1;
  for (const c of node.children) count += computeNodeCount(c);
  return count;
}

function collectStructuralTokens(node: NormalizedASTNode): string[] {
  const tokens: string[] = [node.type];
  for (const c of node.children) tokens.push(...collectStructuralTokens(c));
  return tokens;
}

export function fingerprintFunction(
  functionName: string,
  bodyNode: Node,
  loc: { start: { line: number }; end: { line: number } } | null
): ASTFingerprint {
  const normalized = stripNode(bodyNode, 'body');
  const topologicalShape = serializeTree(normalized);
  const structuralHash = topologicalFingerprint(normalized);
  const typeTokens = collectStructuralTokens(normalized);
  const minHashSig = minHashSignature(typeTokens);
  const nodeTypeHistogram = new Map<string, number>();
  collectNodeTypes(normalized, nodeTypeHistogram);
  const depth = computeDepth(normalized);
  const nodeCount = computeNodeCount(normalized);

  return {
    functionName,
    loc,
    structuralHash,
    normalizedTree: normalized,
    minHashSig,
    nodeTypeHistogram,
    depth,
    nodeCount,
    topologicalShape,
  };
}

export function compareFingerprints(
  a: ASTFingerprint,
  b: ASTFingerprint
): { structuralMatch: boolean; similarity: number; depthRatio: number; nodeRatio: number } {
  const structuralMatch = a.structuralHash === b.structuralHash;
  const similarity = jaccardSimilarity(a.minHashSig, b.minHashSig);
  const depthRatio = Math.min(a.depth, b.depth) / Math.max(a.depth, b.depth);
  const nodeRatio = Math.min(a.nodeCount, b.nodeCount) / Math.max(a.nodeCount, b.nodeCount);

  return { structuralMatch, similarity, depthRatio, nodeRatio };
}

export function fingerprintDistance(a: ASTFingerprint, b: ASTFingerprint): number {
  return 1 - jaccardSimilarity(a.minHashSig, b.minHashSig);
}

export { jaccardSimilarity };
