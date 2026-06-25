import * as babelParser from '@babel/parser';
import _traverse from '@babel/traverse';
import type { BackendRoute, HTTPMethod, BackendLanguage, RouteHandler } from './types-clt.js';

const traverse = typeof _traverse === 'function' ? _traverse : (_traverse as any).default;

interface FileInput {
  path: string;
  content: string;
}

const EXPRESS_PATTERNS = [
  { re: /router\.(get|post|put|patch|delete|use|all)\s*\(\s*['"`]([^'"`]+)['"`]/g, framework: 'express' },
  { re: /app\.(get|post|put|patch|delete|use|all)\s*\(\s*['"`]([^'"`]+)['"`]/g, framework: 'express' },
];

const FASTIFY_PATTERNS = [
  { re: /(?:app|server|fastify)\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/g, framework: 'fastify' },
];

const KOA_PATTERNS = [
  { re: /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g, framework: 'koa' },
  { re: /app\.use\s*\(\s*['"`]([^'"`]+)['"`]/g, framework: 'koa' },
];

const PYTHON_PATTERNS = [
  { re: /@(?:app|router)\.(?:route|get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g, framework: 'flask' },
  { re: /@(?:app|router)\.(?:route|get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g, framework: 'fastapi' },
  { re: /\.add_route\s*\(\s*['"]([^'"]+)['"]/g, framework: 'starlette' },
  { re: /@web\.route\s*\(\s*['"]([^'"]+)['"]/g, framework: 'aiohttp' },
];

const GO_PATTERNS = [
  { re: /router\.(?:GET|POST|PUT|PATCH|DELETE)\s*\(\s*['"]([^'"]+)['"]/g, framework: 'gin' },
  { re: /mux\.(?:HandleFunc|Handle)\s*\(\s*['"]([^'"]+)['"]/g, framework: 'gorilla' },
  { re: /r\.(?:GET|POST|PUT|PATCH|DELETE)\s*\(\s*['"]([^'"]+)['"]/g, framework: 'echo' },
  { re: /http\.Handle(?:Func)?\s*\(\s*['"]([^'"]+)['"]/g, framework: 'net/http' },
];

function detectLanguage(filePath: string): BackendLanguage {
  const ext = filePath.toLowerCase().split('.').pop();
  switch (ext) {
    case 'js': case 'jsx': return 'javascript';
    case 'ts': case 'tsx': return 'typescript';
    case 'py': return 'python';
    case 'go': return 'go';
    case 'rs': return 'rust';
    case 'java': return 'java';
    default: return 'unknown';
  }
}

function extractRouteTemplate(path: string): string {
  return path
    .replace(/:(\w+)/g, ':param')
    .replace(/\{(\w+)\}/g, ':param')
    .replace(/\[(\w+)\]/g, ':param')
    .replace(/<(\w+)>/g, ':param');
}

function getContentSnippet(content: string, startLine: number, endLine: number): string {
  const lines = content.split('\n');
  return lines.slice(startLine - 1, endLine).join('\n');
}

function analyzeHandlerBody(body: string): RouteHandler {
  const parameterNames: string[] = [];
  const bodyReferences: string[] = [];
  const queryReferences: string[] = [];
  const paramReferences: string[] = [];
  const dbQueries: string[] = [];
  const sinkCalls: string[] = [];
  const middleware: string[] = [];

  const bodyMatch = body.match(/req\.(\w+)/g);
  if (bodyMatch) {
    for (const m of bodyMatch) {
      const ref = m.replace('req.', '');
      if (ref === 'body') bodyReferences.push(ref);
      else if (ref === 'query') queryReferences.push(ref);
      else if (ref === 'params') paramReferences.push(ref);
    }
  }

  const dbMatch = body.match(/(?:db|prisma|knex|sequelize|typeorm)\.\w+\.\w+/g);
  if (dbMatch) {
    for (const m of dbMatch) {
      if (!dbQueries.includes(m)) dbQueries.push(m);
    }
  }

  const sinkMatch = body.match(/(?:eval|exec|spawn|execSync|innerHTML|dangerouslySetInnerHTML|fs\.writeFile|res\.redirect|res\.send|res\.json|res\.render|\.query\s*\(|\.execute\s*\()/g);
  if (sinkMatch) {
    for (const m of sinkMatch) {
      if (!sinkCalls.includes(m)) sinkCalls.push(m);
    }
  }

  const middlewareMatch = body.match(/(?:requireAuth|authenticate|verifyToken|authorize|authenticateToken|checkAuth|protect)/g);
  if (middlewareMatch) {
    for (const m of middlewareMatch) {
      if (!middleware.includes(m)) middleware.push(m);
    }
  }

  const hasAuthCheck = /\b(?:req\.session\.userId|req\.user|req\.user\.id|isAuthenticated|isAdmin|role\s*===)\b/.test(body);

  return {
    handlerName: null,
    handlerBody: body,
    filePath: '',
    lineStart: 0,
    lineEnd: 0,
    parameterNames,
    bodyReferences,
    queryReferences,
    paramReferences,
    dbQueries,
    sinkCalls,
    middleware,
    hasAuthCheck,
  };
}

function detectRoutePatterns(content: string): BackendRoute[] {
  const routes: BackendRoute[] = [];
  const allPatterns = [
    ...EXPRESS_PATTERNS,
    ...FASTIFY_PATTERNS,
    ...KOA_PATTERNS,
  ];

  for (const { re, framework } of allPatterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const method = m[1].toUpperCase();
      const path = m[2];
      const lineNum = content.substring(0, m.index).split('\n').length;

      const routeId = `be-route:${framework}:${method}:${path}`;

      const handlerSnippet = content.slice(m.index, m.index + 1000);
      const handler = analyzeHandlerBody(handlerSnippet);

      routes.push({
        id: routeId,
        method: method as HTTPMethod,
        path,
        pathTemplate: extractRouteTemplate(path),
        framework,
        language: 'javascript',
        filePath: '',
        lineStart: lineNum,
        lineEnd: lineNum + 20,
        handler,
        paramPatterns: [...path.matchAll(/:(\w+)/g)].map(m2 => m2[1]),
      });
    }
  }

  return routes;
}

export function detectBackendRoutes(files: FileInput[]): BackendRoute[] {
  const routes: BackendRoute[] = [];

  for (const file of files) {
    const language = detectLanguage(file.path);
    if (file.content.length > 500000) continue;

    if (language === 'javascript' || language === 'typescript') {
      let ast: any;
      try {
        ast = babelParser.parse(file.content, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript', 'optionalChaining', 'nullishCoalescingOperator'],
          errorRecovery: true,
        });
      } catch {
        const detected = detectRoutePatterns(file.content);
        for (const r of detected) { r.filePath = file.path; r.language = language; }
        routes.push(...detected);
        continue;
      }

      const detected = detectRoutePatterns(file.content);
      for (const r of detected) {
        r.filePath = file.path;
        r.language = language;
        routes.push(r);
      }

      traverse(ast, {
        CallExpression(path: any) {
          const node = path.node;
          const callee = node.callee;
          if (callee?.type === 'MemberExpression') {
            const obj = callee.object;
            const prop = callee.property;
            if ((obj?.name === 'router' || obj?.name === 'app') && prop?.type === 'Identifier') {
              const method = prop.name.toUpperCase();
              if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'USE', 'ALL'].includes(method)) return;
              const firstArg = node.arguments[0];
              if (!firstArg || firstArg.type !== 'StringLiteral') return;
              const pathStr = firstArg.value;
              const lineNum = node.loc?.start?.line || 1;
              const routeId = `be-route:express:${method}:${pathStr}`;
              if (routes.some(r => r.id === routeId)) return;

              const handlerSnippet = getContentSnippet(file.content, lineNum, lineNum + 20);
              const handler = analyzeHandlerBody(handlerSnippet);

              routes.push({
                id: routeId,
                method: method as HTTPMethod,
                path: pathStr,
                pathTemplate: extractRouteTemplate(pathStr),
                framework: 'express',
                language,
                filePath: file.path,
                lineStart: lineNum,
                lineEnd: lineNum + 20,
                handler,
                paramPatterns: [...pathStr.matchAll(/:(\w+)/g)].map(m2 => m2[1]),
              });
            }
          }
        },
      });
    }
  }

  return routes;
}
