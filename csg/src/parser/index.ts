import * as babelParser from '@babel/parser';
import { readFileSync, existsSync } from 'node:fs';
import { extname } from 'node:path';
import type { Node, File as BabelFile } from '@babel/types';
import type { CSGOptions, SourceLocation, CSGASTNode, NodeId, ParseResult } from '../types.js';
import { astNodeId } from '../utils/id.js';

export class Parser {
  private options: CSGOptions;

  constructor(options: CSGOptions = {}) {
    this.options = {
      jsx: true,
      typescript: true,
      decorators: true,
      stage3: true,
      followDynamicImports: false,
      maxDepth: 1000,
      ...options,
    };
  }

  parseFile(filePath: string): ParseResult | null {
    if (!existsSync(filePath)) return null;

    const ext = extname(filePath).toLowerCase();
    const language = this.detectLanguage(ext);
    if (!language) return null;

    const content = readFileSync(filePath, 'utf-8');
    return this.parseContent(content, filePath, language);
  }

  parseContent(
    content: string,
    filePath: string,
    language: 'js' | 'ts' | 'jsx' | 'tsx'
  ): ParseResult {
    const plugins = this.buildPlugins(language);
    const ast = babelParser.parse(content, {
      sourceType: 'unambiguous',
      sourceFilename: filePath,
      plugins,
      errorRecovery: true,
      allowImportExportEverywhere: false,
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: false,
      allowSuperOutsideMethod: false,
      allowUndeclaredExports: false,
      createParenthesizedExpressions: false,
    });

    const astNodes = new Map<NodeId, CSGASTNode>();
    this.flattenAST(ast, filePath, astNodes, null);

    return { ast, astNodes, file: filePath, language };
  }

  private flattenAST(
    node: Node,
    file: string,
    map: Map<NodeId, CSGASTNode>,
    parentId: NodeId | null,
    depth = 0
  ): NodeId {
    if (depth > (this.options.maxDepth ?? 1000)) {
      const id = astNodeId();
      map.set(id, {
        id,
        type: '__MAX_DEPTH__',
        loc: this.toSourceLocation(node.loc, file),
        raw: null,
        parentId,
        children: [],
      });
      return id;
    }

    const id = astNodeId();
    const children: NodeId[] = [];

    const csgNode: CSGASTNode = {
      id,
      type: node.type,
      loc: this.toSourceLocation(node.loc, file),
      raw: node,
      parentId,
      children,
    };

    map.set(id, csgNode);

    // Recurse into child nodes via key iteration
    const nodeObj = node as any;
    for (const key of Object.keys(nodeObj)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') continue;
      const val = nodeObj[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item.type === 'string') {
            const childId = this.flattenAST(item as Node, file, map, id, depth + 1);
            children.push(childId);
          }
        }
      } else if (val && typeof val.type === 'string') {
        const childId = this.flattenAST(val as Node, file, map, id, depth + 1);
        children.push(childId);
      }
    }

    csgNode.children = children;
    return id;
  }

  private detectLanguage(ext: string): 'js' | 'ts' | 'jsx' | 'tsx' | null {
    switch (ext) {
      case '.js': case '.mjs': case '.cjs': return 'js';
      case '.jsx': return 'jsx';
      case '.ts': case '.mts': case '.cts': return 'ts';
      case '.tsx': return 'tsx';
      default: return null;
    }
  }

  private buildPlugins(language: 'js' | 'ts' | 'jsx' | 'tsx'): babelParser.ParserPlugin[] {
    const plugins: babelParser.ParserPlugin[] = [];

    if (language === 'jsx' || language === 'tsx') {
      plugins.push('jsx');
    }
    if (language === 'ts' || language === 'tsx') {
      plugins.push('typescript');
    }
    if (this.options.decorators) {
      plugins.push('decorators-legacy');
    }
    if (this.options.stage3) {
      plugins.push('importAssertions');
      plugins.push('optionalChaining');
      plugins.push('nullishCoalescingOperator');
      plugins.push('classProperties');
      plugins.push('numericSeparator');
    }
    if (this.options.plugins) {
      for (const p of this.options.plugins) {
        plugins.push(p as babelParser.ParserPlugin);
      }
    }

    return plugins;
  }

  private toSourceLocation(
    loc: Node['loc'],
    file: string
  ): SourceLocation {
    if (!loc) {
      return {
        file,
        start: { line: 0, col: 0 },
        end: { line: 0, col: 0 },
      };
    }
    return {
      file,
      start: { line: loc.start.line, col: loc.start.column ?? 0 },
      end: { line: loc.end.line, col: loc.end.column ?? 0 },
    };
  }
}
