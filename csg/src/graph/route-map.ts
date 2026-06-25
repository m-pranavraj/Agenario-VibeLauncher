import traverse from '../utils/traverse.js';
import type { Node, CallExpression, MemberExpression, ArrowFunctionExpression, FunctionExpression, ObjectExpression, Identifier, StringLiteral } from '@babel/types';
import type { RouteEndpoint, HTTPMethod, RouterFramework, RouteParam, CSGGraph, NodeId, ParseResult } from '../types.js';
import { routeEndpointId } from '../utils/id.js';

const HTTP_METHODS = new Set<string>(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'all', 'use']);

const ROUTE_PATTERNS: Array<{
  framework: RouterFramework;
  detect: (callee: string) => boolean;
}> = [
  { framework: 'express', detect: (c) => /^express\.(Router)?\(\)/.test(c) || c.includes('Router') || HTTP_METHODS.has(c.split('.').pop() || '') },
  { framework: 'fastify', detect: (c) => c.includes('fastify') },
  { framework: 'koa', detect: (c) => c.includes('koa') || c.includes('Koa') || c.includes('router') },
  { framework: 'hono', detect: (c) => c.includes('hono') || c.includes('Hono') },
  { framework: 'nextjs-app', detect: (c) => false },  // file-based, handled separately
  { framework: 'nextjs-pages', detect: (c) => false },
  { framework: 'unknown', detect: () => true },
];

export class RouteMapBuilder {
  private graph!: CSGGraph;

  build(parsed: ParseResult[], graph: CSGGraph): void {
    this.graph = graph;

    for (const p of parsed) {
      this.processFile(p);
    }

    // Build router tree
    for (const ep of graph.routeMap.endpoints) {
      const existing = graph.routeMap.routerTree.get(ep.path) || [];
      existing.push(ep);
      graph.routeMap.routerTree.set(ep.fullPath, existing);
    }

    // Fill param registry
    for (const ep of graph.routeMap.endpoints) {
      for (const param of ep.params) {
        const existing = graph.routeMap.paramRegistry.get(param.name) || [];
        existing.push(param);
        graph.routeMap.paramRegistry.set(param.name, existing);
      }
    }
  }

  private processFile(parsed: ParseResult): void {
    // Detect framework
    const framework = this.detectFramework(parsed);

    // Next.js file-based routes
    if (this.isNextJsRoute(parsed.file)) {
      this.processNextJsRoute(parsed.file, framework, parsed);
      return;
    }

    // Walk AST for route registrations
    traverse(parsed.ast, {
      CallExpression: (path) => {
        const node = path.node as CallExpression;
        const callee = node.callee;

        // Match patterns like: app.get('/path', handler), router.post('/path', handler)
        if (callee.type === 'MemberExpression') {
          const member = callee as MemberExpression;
          const prop = (member.property as Identifier)?.name?.toLowerCase();

          if (prop && HTTP_METHODS.has(prop)) {
            const pathArg = node.arguments[0];
            const handlerArg = node.arguments[1];
            const method = prop === 'use' ? 'USE' : prop.toUpperCase() as HTTPMethod;

            if (pathArg?.type === 'StringLiteral') {
              const pathStr = (pathArg as StringLiteral).value;
              const fullPath = this.resolveFullPath(pathStr, parsed.file);

              const endpoint: RouteEndpoint = {
                id: routeEndpointId(),
                method,
                path: pathStr,
                fullPath,
                params: this.extractParams(pathStr),
                handler: handlerArg ? this.findASTNodeId(handlerArg) : null,
                handlerName: this.getHandlerName(handlerArg),
                middleware: node.arguments.slice(2).map(a => this.findASTNodeId(a)).filter((id): id is NodeId => id !== null),
                framework: framework,
                loc: {
                  file: parsed.file,
                  start: { line: node.loc?.start.line ?? 0, col: node.loc?.start.column ?? 0 },
                  end: { line: node.loc?.end.line ?? 0, col: node.loc?.end.column ?? 0 },
                },
                file: parsed.file,
                line: node.loc?.start.line ?? 0,
              };

              this.graph.routeMap.endpoints.push(endpoint);
            }
          }
        }

        // Express.Router() usage
        if (this.isRouteUsePattern(node, callee)) {
          const pathArg = node.arguments[0];
          const routerArg = node.arguments[1];
          if (pathArg?.type === 'StringLiteral' && routerArg) {
            const pathStr = (pathArg as StringLiteral).value;
            const endpoint: RouteEndpoint = {
              id: routeEndpointId(),
              method: 'USE',
              path: pathStr,
              fullPath: pathStr,
              params: this.extractParams(pathStr),
              handler: this.findASTNodeId(routerArg),
              handlerName: this.getHandlerName(routerArg),
              middleware: [],
              framework,
              loc: {
                file: parsed.file,
                start: { line: node.loc?.start.line ?? 0, col: node.loc?.start.column ?? 0 },
                end: { line: node.loc?.end.line ?? 0, col: node.loc?.end.column ?? 0 },
              },
              file: parsed.file,
              line: node.loc?.start.line ?? 0,
            };
            this.graph.routeMap.endpoints.push(endpoint);
          }
        }
      },
    });
  }

  private detectFramework(parsed: ParseResult): RouterFramework {
    const content = parsed.ast.program.body.map(n => n.type).join(' ');

    if (content.includes('require') || content.includes('import')) {
      for (const pat of ROUTE_PATTERNS) {
        // Try to detect from import/require statements
        let found = false;
        traverse(parsed.ast, {
          ImportDeclaration: (path) => {
            const source = path.node.source.value;
            if (
              (source === 'express' && pat.framework === 'express') ||
              (source === 'fastify' && pat.framework === 'fastify') ||
              (source === 'koa' && pat.framework in ['koa']) ||
              (source === 'hono' && pat.framework === 'hono') ||
              (source === 'next' && pat.framework.startsWith('nextjs'))
            ) {
              found = true;
            }
          },
          CallExpression: (path) => {
            if ((path.node.callee as any)?.name === 'require') {
              const arg = path.node.arguments[0] as any;
              if (arg?.value === 'express' && pat.framework === 'express') found = true;
              if (arg?.value === 'fastify' && pat.framework === 'fastify') found = true;
              if (arg?.value === 'koa' && pat.framework === 'koa') found = true;
              if (arg?.value === 'hono' && pat.framework === 'hono') found = true;
            }
          },
        });
        if (found) return pat.framework;
      }
    }

    if (parsed.file.includes('pages/api') || parsed.file.includes('app/api')) {
      return 'nextjs-app';
    }

    return 'unknown';
  }

  private isNextJsRoute(file: string): boolean {
    const normalized = file.replace(/\\/g, '/');
    return normalized.includes('/pages/api/') ||
           normalized.includes('/app/api/') ||
           normalized.match(/\/app\/.*\/route\.(ts|js|tsx|jsx)$/) !== null;
  }

  private processNextJsRoute(file: string, framework: RouterFramework, parsed: ParseResult): void {
    const normalized = file.replace(/\\/g, '/');

    // Extract method from export names (GET, POST, etc.)
    const methodMap: Record<string, HTTPMethod> = {};

    traverse(parsed.ast, {
      ExportNamedDeclaration: (path) => {
        const decl = path.node.declaration as any;
        if (decl?.type === 'FunctionDeclaration' || decl?.type === 'VariableDeclaration') {
          const name = decl?.id?.name || decl?.declarations?.[0]?.id?.name;
          if (name && HTTP_METHODS.has(name.toLowerCase())) {
            methodMap[name] = name.toUpperCase() as HTTPMethod;
          }
        }
      },
    });

    // Build path from file structure
    let path = normalized;
    // Strip root and extension
    const apiMatch = path.match(/(?:pages\/api|app\/api)\/(.+?)\.(ts|js|tsx|jsx)$/);
    if (apiMatch) {
      path = '/' + apiMatch[1]
        .replace(/\\/g, '/')
        .replace(/\/index$/, '')
        .replace(/\/route$/, '')
        .replace(/\[\.\.\.(.+?)\]/, '*$1')
        .replace(/\[(.+?)\]/g, ':$1');
    } else {
      // Check if it's an app router route.ts
      const appRouteMatch = path.match(/\/app\/(.+?)\/route\.(ts|js|tsx|jsx)$/);
      if (appRouteMatch) {
        path = '/' + appRouteMatch[1]
          .replace(/\\/g, '/')
          .replace(/\/route$/, '')
          .replace(/\/index$/, '')
          .replace(/\[\.\.\.(.+?)\]/, '*$1')
          .replace(/\[(.+?)\]/g, ':$1');
      } else {
        return;
      }
    }

    // If no specific exports found, assume ALL methods
    const methods = Object.keys(methodMap).length > 0
      ? Object.entries(methodMap)
      : [['GET', 'GET' as HTTPMethod]];

    for (const [name, method] of methods as Array<[string, HTTPMethod]>) {
      const endpoint: RouteEndpoint = {
        id: routeEndpointId(),
        method,
        path,
        fullPath: path,
        params: this.extractParams(path),
        handler: this.findHandlerForMethod(name, parsed),
        handlerName: name,
        middleware: [],
        framework,
        loc: {
          file: parsed.file,
          start: { line: 0, col: 0 },
          end: { line: 0, col: 0 },
        },
        file: parsed.file,
        line: 0,
      };
      this.graph.routeMap.endpoints.push(endpoint);
    }
  }

  private findHandlerForMethod(methodName: string, parsed: ParseResult): NodeId | null {
    let foundId: NodeId | null = null;

    traverse(parsed.ast, {
      ExportNamedDeclaration: (path) => {
        const decl = path.node.declaration as any;
        if (decl?.type === 'FunctionDeclaration' && decl?.id?.name === methodName) {
          foundId = this.findASTNodeId(decl);
        }
      },
    });

    return foundId;
  }

  private isRouteUsePattern(node: CallExpression, callee: Node): boolean {
    return (callee as any)?.property?.name === 'use' &&
           node.arguments.length >= 2 &&
           node.arguments[0]?.type === 'StringLiteral';
  }

  private resolveFullPath(routePath: string, file: string): string {
    // For now, just return the route path.
    // In a full implementation, we'd walk up parent routers' base paths.
    return routePath;
  }

  private extractParams(path: string): RouteParam[] {
    const params: RouteParam[] = [];

    // Express-style: /users/:id/posts/:postId
    const expressMatch = path.match(/:(\w+)/g);
    if (expressMatch) {
      for (const m of expressMatch) {
        params.push({
          name: m.slice(1),
          pattern: m,
          position: 'path',
          type: null,
        });
      }
    }

    // Next.js style: [param], [...param]
    const nextMatch = path.match(/\[(\.\.\.)?(\w+)\]/g);
    if (nextMatch) {
      for (const m of nextMatch) {
        const isSpread = m.includes('...');
        const name = m.replace(/[\[\]\.]/g, '');
        params.push({
          name,
          pattern: m,
          position: 'path',
          type: isSpread ? 'string[]' : 'string',
        });
      }
    }

    // Fastify-style: /users/:id
    // Already covered by Express pattern

    // {param} style (some frameworks)
    const curlyMatch = path.match(/\{(\w+)\}/g);
    if (curlyMatch) {
      for (const m of curlyMatch) {
        const name = m.slice(1, -1);
        if (!params.find(p => p.name === name)) {
          params.push({
            name,
            pattern: m,
            position: 'path',
            type: null,
          });
        }
      }
    }

    return params;
  }

  private getHandlerName(node: Node | null | undefined): string | null {
    if (!node) return null;
    if (node.type === 'Identifier') return (node as Identifier).name;
    if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') return '(anonymous)';
    if ((node as any)?.name) return (node as any).name;
    return null;
  }

  private findASTNodeId(node: Node): NodeId | null {
    for (const [id, csgNode] of this.graph.astNodes) {
      if (csgNode.raw === node) return id;
    }
    return null;
  }
}
