import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import type { ParseResult } from '../../../types.js';
import type { RuleContext } from './types.js';

export interface CallExpressionMatch {
  node: t.CallExpression;
  callee: string;
  args: t.Expression[];
  file: string;
  line: number;
}

export interface StringConcatMatch {
  parts: string[];
  file: string;
  line: number;
  node: t.BinaryExpression;
}

export interface FuncCallInfo {
  objectName: string;
  methodName: string;
  fullName: string;
}

export function parseFuncCall(expr: t.Expression | t.V8IntrinsicIdentifier): FuncCallInfo | null {
  if (!t.isCallExpression(expr) && !t.isMemberExpression(expr)) return null;
  if (t.isCallExpression(expr)) {
    const inner = expr.callee;
    if (t.isMemberExpression(inner)) {
      const obj = inner.object;
      const prop = inner.property;
      if (t.isIdentifier(obj) && t.isIdentifier(prop)) {
        return { objectName: obj.name, methodName: prop.name, fullName: `${obj.name}.${prop.name}` };
      }
      if (t.isMemberExpression(obj) && t.isIdentifier(obj.object) && t.isIdentifier(obj.property) && t.isIdentifier(prop)) {
        return { objectName: `${obj.object.name}.${obj.property.name}`, methodName: prop.name, fullName: `${obj.object.name}.${obj.property.name}.${prop.name}` };
      }
    }
    if (t.isIdentifier(inner)) {
      return { objectName: '', methodName: inner.name, fullName: inner.name };
    }
  }
  if (t.isMemberExpression(expr)) {
    const obj = expr.object;
    const prop = expr.property;
    if (t.isIdentifier(obj) && t.isIdentifier(prop)) {
      return { objectName: obj.name, methodName: prop.name, fullName: `${obj.name}.${prop.name}` };
    }
  }
  return null;
}

export function findFunctionCalls(
  parsed: ParseResult[],
  predicate: (info: FuncCallInfo, args: t.Expression[], node: t.CallExpression) => boolean
): CallExpressionMatch[] {
  const results: CallExpressionMatch[] = [];
  for (const p of parsed) {
    traverse(p.ast, {
      CallExpression(path: NodePath<t.CallExpression>) {
        const info = parseFuncCall(path.node);
        if (info && predicate(info, path.node.arguments as t.Expression[], path.node)) {
          results.push({
            node: path.node,
            callee: info.fullName,
            args: path.node.arguments as t.Expression[],
            file: p.file,
            line: (path.node.loc?.start.line ?? 0),
          });
        }
      },
      TaggedTemplateExpression(path: NodePath<t.TaggedTemplateExpression>) {
        const tag = path.node.tag;
        let info: FuncCallInfo | null = null;
        if (t.isMemberExpression(tag) && t.isIdentifier(tag.object) && t.isIdentifier(tag.property)) {
          info = { objectName: tag.object.name, methodName: tag.property.name, fullName: `${tag.object.name}.${tag.property.name}` };
        } else if (t.isIdentifier(tag)) {
          info = { objectName: '', methodName: tag.name, fullName: tag.name };
        }
        if (info && predicate(info, [path.node.quasi], path.node as any)) {
          results.push({
            node: path.node as any,
            callee: info.fullName,
            args: [path.node.quasi],
            file: p.file,
            line: (path.node.loc?.start.line ?? 0),
          });
        }
      },
    });
  }
  return results;
}

export function findStringLiterals(parsed: ParseResult[], predicate: (str: string, node: t.StringLiteral) => boolean): Array<{ value: string; node: t.StringLiteral; file: string; line: number }> {
  const results: Array<{ value: string; node: t.StringLiteral; file: string; line: number }> = [];
  for (const p of parsed) {
    traverse(p.ast, {
      StringLiteral(path: NodePath<t.StringLiteral>) {
        if (predicate(path.node.value, path.node)) {
          results.push({ value: path.node.value, node: path.node, file: p.file, line: (path.node.loc?.start.line ?? 0) });
        }
      },
    });
  }
  return results;
}

export function findMemberExpressions(
  parsed: ParseResult[],
  predicate: (obj: string, prop: string, node: t.MemberExpression) => boolean
): Array<{ object: string; property: string; node: t.MemberExpression; file: string; line: number }> {
  const results: Array<{ object: string; property: string; node: t.MemberExpression; file: string; line: number }> = [];
  for (const p of parsed) {
    traverse(p.ast, {
      MemberExpression(path: NodePath<t.MemberExpression>) {
        const obj = path.node.object;
        const prop = path.node.property;
        if (t.isIdentifier(obj) && t.isIdentifier(prop)) {
          if (predicate(obj.name, prop.name, path.node)) {
            results.push({ object: obj.name, property: prop.name, node: path.node, file: p.file, line: (path.node.loc?.start.line ?? 0) });
          }
        }
      },
    });
  }
  return results;
}

export function findAssignmentsToMember(
  parsed: ParseResult[],
  objName: string,
  propName: string
): Array<{ value: t.Expression; node: t.AssignmentExpression; file: string; line: number }> {
  const results: Array<{ value: t.Expression; node: t.AssignmentExpression; file: string; line: number }> = [];
  for (const p of parsed) {
    traverse(p.ast, {
      AssignmentExpression(path: NodePath<t.AssignmentExpression>) {
        const lhs = path.node.left;
        if (t.isMemberExpression(lhs) && t.isIdentifier(lhs.object) && t.isIdentifier(lhs.property)) {
          if (lhs.object.name === objName && lhs.property.name === propName) {
            results.push({ value: path.node.right, node: path.node, file: p.file, line: (path.node.loc?.start.line ?? 0) });
          }
        }
      },
    });
  }
  return results;
}

export function extractTemplateLiterals(
  parsed: ParseResult[],
  predicate: (quasis: string[], expressions: t.Expression[]) => boolean
): Array<{ quasis: string[]; expressions: t.Expression[]; node: t.TemplateLiteral; file: string; line: number }> {
  const results: Array<{ quasis: string[]; expressions: t.Expression[]; node: t.TemplateLiteral; file: string; line: number }> = [];
  for (const p of parsed) {
    traverse(p.ast, {
      TemplateLiteral(path: NodePath<t.TemplateLiteral>) {
        const quasis = path.node.quasis.map(q => q.value.raw);
        const exprs = path.node.expressions as t.Expression[];
        if (predicate(quasis, exprs)) {
          results.push({ quasis, expressions: exprs, node: path.node, file: p.file, line: (path.node.loc?.start.line ?? 0) });
        }
      },
    });
  }
  return results;
}

export function findBinaryExpressionConcat(
  parsed: ParseResult[],
  predicate: (parts: string[], node: t.BinaryExpression) => boolean
): StringConcatMatch[] {
  const results: StringConcatMatch[] = [];
  function extractConcatParts(expr: t.Expression): string[] {
    const parts: string[] = [];
    function walk(e: t.Expression) {
      if (t.isBinaryExpression(e) && e.operator === '+') {
        walk(e.left as t.Expression);
        walk(e.right as t.Expression);
      } else if (t.isStringLiteral(e)) {
        parts.push(e.value);
      } else if (t.isTemplateLiteral(e)) {
        parts.push(e.quasis.map(q => q.value.raw).join('${...}'));
      } else if (t.isIdentifier(e)) {
        parts.push(e.name);
      } else if (t.isCallExpression(e) && t.isIdentifier(e.callee)) {
        parts.push(`${e.callee.name}()`);
      } else if (t.isMemberExpression(e) && t.isIdentifier(e.object) && t.isIdentifier(e.property)) {
        parts.push(`${e.object.name}.${e.property.name}`);
      } else {
        parts.push('?');
      }
    }
    walk(expr);
    return parts;
  }
  for (const p of parsed) {
    traverse(p.ast, {
      BinaryExpression(path: NodePath<t.BinaryExpression>) {
        if (path.node.operator !== '+') return;
        const parts = extractConcatParts(path.node);
        if (predicate(parts, path.node)) {
          results.push({ parts, file: p.file, line: (path.node.loc?.start.line ?? 0), node: path.node });
        }
      },
    });
  }
  return results;
}

export function detectUserInputSources(parsed: ParseResult[]): Array<{ source: string; node: t.Node; file: string; line: number }> {
  const results: Array<{ source: string; node: t.Node; file: string; line: number }> = [];
  for (const p of parsed) {
    traverse(p.ast, {
      MemberExpression(path: NodePath<t.MemberExpression>) {
        const obj = path.node.object;
        const prop = path.node.property;
        if (t.isIdentifier(obj) && t.isIdentifier(prop)) {
          const fullName = `${obj.name}.${prop.name}`;
          if (/^(req|request)\.(body|query|params)$/.test(fullName) ||
              /^(body|query|params)\./.test(fullName) ||
              /\.userInput|\binput\b|\bvalue\b/.test(fullName)) {
            results.push({ source: fullName, node: path.node, file: p.file, line: (path.node.loc?.start.line ?? 0) });
          }
        }
        if (t.isIdentifier(obj) && t.isIdentifier(prop) && /^(req|request|ctx)\.(body|query|params)/.test(`${obj.name}.${prop.name}`)) {
          results.push({ source: `${obj.name}.${prop.name}`, node: path.node, file: p.file, line: (path.node.loc?.start.line ?? 0) });
        }
      },
    });
  }
  return results;
}

export function getSnippet(code: string, line: number, contextLines: number = 3): string {
  const lines = code.split('\n');
  const start = Math.max(0, line - 1 - contextLines);
  const end = Math.min(lines.length, line + contextLines);
  return lines.slice(start, end).join('\n');
}
