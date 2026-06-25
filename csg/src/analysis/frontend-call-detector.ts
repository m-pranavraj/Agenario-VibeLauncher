import * as babelParser from '@babel/parser';
import _traverse from '@babel/traverse';
import type { Node } from '@babel/types';
import type { FrontendAPICall, HTTPMethod, APICallPayload, APICallParameter, FrontendFramework } from './types-clt.js';

const traverse = typeof _traverse === 'function' ? _traverse : (_traverse as any).default;

interface FileInput {
  path: string;
  content: string;
}

const FETCH_PATTERNS = [
  { callee: 'fetch', methodIndex: (args: any[]) => {
    if (args.length >= 2 && args[1]?.type === 'ObjectExpression') {
      const methodProp = args[1].properties.find((p: any) => p.key?.name === 'method' || p.key?.value === 'method');
      return methodProp?.value?.value || 'GET';
    }
    return 'GET';
  }},
];

const AXIOS_PATTERNS = [
  { callee: 'axios.get', method: 'GET' },
  { callee: 'axios.post', method: 'POST' },
  { callee: 'axios.put', method: 'PUT' },
  { callee: 'axios.patch', method: 'PATCH' },
  { callee: 'axios.delete', method: 'DELETE' },
];

const API_CLIENT_PATTERNS = [
  { pattern: /\.get\s*\(/g, method: 'GET' },
  { pattern: /\.post\s*\(/g, method: 'POST' },
  { pattern: /\.put\s*\(/g, method: 'PUT' },
  { pattern: /\.patch\s*\(/g, method: 'PATCH' },
  { pattern: /\.delete\s*\(/g, method: 'DELETE' },
];

function extractRouteTemplate(route: string): string {
  return route
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/['"`]/g, '')
    .replace(/\/\//g, '/');
}

function inferFrontendFramework(files: FileInput[]): FrontendFramework {
  const allContent = files.map(f => f.content).join('\n');
  if (/\bnext\b/.test(allContent) && /next\.config/.test(allContent)) return 'nextjs';
  if (/from ['"]react['"]/.test(allContent) || /import.*react/.test(allContent)) return 'react';
  if (/from ['"]vue['"]/.test(allContent)) return 'vue';
  if (/from ['"]@angular/.test(allContent)) return 'angular';
  if (/from ['"]svelte['"]/.test(allContent)) return 'svelte';
  return 'unknown';
}

function getCode(node: any, content: string): string {
  if (!node || node.start === undefined || node.end === undefined) return '';
  return content.slice(node.start, node.end);
}

function extractBodyShape(bodyArg: any, content: string): Record<string, { type: string; tainted: boolean; source: string | null }> | null {
  if (!bodyArg) return null;
  if (bodyArg.type === 'ObjectExpression') {
    const shape: Record<string, { type: string; tainted: boolean; source: string | null }> = {};
    for (const prop of bodyArg.properties) {
      if (prop.type === 'SpreadElement') {
        shape['...spread'] = { type: 'object', tainted: true, source: getCode(prop.argument, content) };
        continue;
      }
      const key = prop.key?.name || prop.key?.value || '<computed>';
      const val = prop.value;
      shape[key] = {
        type: val?.type || 'unknown',
        tainted: val?.type === 'Identifier' || val?.type === 'CallExpression' || val?.type === 'MemberExpression',
        source: getCode(val, content),
      };
    }
    return shape;
  }
  if (bodyArg.type === 'Identifier') {
    return { '...dynamic': { type: 'identifier', tainted: true, source: getCode(bodyArg, content) } };
  }
  if (bodyArg.type === 'CallExpression') {
    return { '...call_result': { type: 'call_expression', tainted: true, source: getCode(bodyArg, content) } };
  }
  return null;
}

function extractQueryParams(url: string, args: any[], content: string): APICallParameter[] {
  const params: APICallParameter[] = [];
  const queryIdx = url.indexOf('?');
  if (queryIdx !== -1) {
    const qs = url.slice(queryIdx + 1);
    for (const part of qs.split('&')) {
      const [k, v] = part.split('=');
      if (k && v) {
        params.push({
          name: k,
          type: v.startsWith('${') ? 'template' : 'literal',
          source: v.startsWith('${') ? 'variable' : 'literal',
          taintProvenance: v.startsWith('${') ? v.slice(2, -1) : null,
        });
      }
    }
  }
  if (args.length >= 2 && args[1]?.type === 'ObjectExpression') {
    const paramsProp = args[1].properties.find((p: any) => p.key?.name === 'params' || p.key?.value === 'params');
    if (paramsProp?.value?.type === 'ObjectExpression') {
      for (const prop of paramsProp.value.properties) {
        params.push({
          name: prop.key?.name || prop.key?.value || '',
          type: prop.value?.type || 'unknown',
          source: prop.value?.type === 'Identifier' || prop.value?.type === 'TemplateLiteral' ? 'variable' : 'literal',
          taintProvenance: prop.value?.type === 'Identifier' ? getCode(prop.value, content) : null,
        });
      }
    }
  }
  return params;
}

function extractResponseHandler(node: any, content: string): FrontendAPICall['responseHandler'] {
  const parent = node.parent;
  if (parent?.type === 'CallExpression' && parent.callee === node) {
    const thenChain: string[] = [];
    let current = parent;
    while (current?.type === 'CallExpression' && current.callee?.type === 'MemberExpression' && current.callee?.property?.name === 'then') {
      const arg = current.arguments[0];
      if (arg?.type === 'ArrowFunctionExpression' || arg?.type === 'FunctionExpression') {
        const body = arg.body;
        if (body?.type === 'BlockStatement') {
          for (const stmt of body.body) {
            thenChain.push(getCode(stmt, content));
          }
        } else {
          thenChain.push(getCode(body, content));
        }
      }
      current = current.parent;
    }
    let variableAssignment: string | null = null;
    if (parent.parent?.type === 'VariableDeclarator' && parent.parent.id?.type === 'Identifier') {
      variableAssignment = parent.parent.id.name;
    } else if (parent.parent?.type === 'AssignmentExpression' && parent.parent.left?.type === 'Identifier') {
      variableAssignment = parent.parent.left.name;
    }
    return {
      type: 'json',
      thenChain,
      variableAssignment,
    };
  }
  if (parent?.type === 'AwaitExpression') {
    const awaitParent = parent.parent;
    if (awaitParent?.type === 'VariableDeclarator' && awaitParent.id?.type === 'Identifier') {
      return {
        type: 'json',
        thenChain: [],
        variableAssignment: awaitParent.id.name,
      };
    }
  }
  return { type: 'unknown', thenChain: [], variableAssignment: null };
}

function detectTaintSources(node: any, content: string, allSources: string[]): void {
  const code = getCode(node, content);
  const taintPatterns = [
    /req\.(body|query|params|headers|cookies)/g,
    /searchParams\.get\(/g,
    /localStorage\.getItem\(/g,
    /sessionStorage\.getItem\(/g,
    /document\.cookie/g,
    /location\.(search|hash)/g,
    /window\.location/g,
    /process\.env/g,
    /useSearchParams\(\)/g,
    /formData/g,
    /new FormData/g,
  ];
  for (const pat of taintPatterns) {
    pat.lastIndex = 0;
    let m;
    while ((m = pat.exec(code)) !== null) {
      allSources.push(m[0]);
    }
  }
}

function detectFetchCall(file: FileInput, node: any, callName: string): FrontendAPICall | null {
  const content = file.content;
  const args = node.arguments;
  if (args.length === 0) return null;

  const urlNode = args[0];
  const url = getCode(urlNode, content);
  const method = callName === 'fetch' && args.length >= 2 && args[1]?.type === 'ObjectExpression'
    ? (args[1].properties.find((p: any) => p.key?.name === 'method' || p.key?.value === 'method')?.value?.value || 'GET')
    : callName === 'fetch' ? 'GET'
    : callName.split('.').pop()?.toUpperCase() || 'GET';

  let bodyArg = null;
  if (args.length >= 2 && args[1]?.type === 'ObjectExpression') {
    if (method !== 'GET' && method !== 'DELETE') {
      const bodyProp = args[1].properties.find((p: any) => p.key?.name === 'body' || p.key?.value === 'body');
      bodyArg = bodyProp?.value || null;
    }
  }

  const lineStart = node.loc?.start?.line || 1;
  const lineEnd = node.loc?.end?.line || lineStart;

  const taintSources: string[] = [];
  for (const arg of args) {
    detectTaintSources(arg, content, taintSources);
  }

  return {
    id: `fe-call:${file.path}:${lineStart}:${method}`,
    method: method as HTTPMethod,
    route: url,
    routeTemplate: extractRouteTemplate(url),
    filePath: file.path,
    lineStart,
    lineEnd,
    calleeName: callName,
    payload: {
      bodyShape: method !== 'GET' ? extractBodyShape(bodyArg, content) : null,
      queryParams: extractQueryParams(url, args, content),
      pathParams: [],
      headers: {},
    },
    responseHandler: extractResponseHandler(node, content),
    enclosingFunction: null,
    taintSources,
    framework: 'unknown',
  };
}

function detectAxiosCall(file: FileInput, node: any, fullCallCode: string): FrontendAPICall | null {
  const content = file.content;
  const args = node.arguments;
  if (args.length === 0) return null;

  const urlNode = args[0];
  const url = getCode(urlNode, content);

  const methodMatch = fullCallCode.match(/axios\.(get|post|put|patch|delete)/);
  const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';

  let bodyArg = args[1];
  if (method === 'GET' || method === 'DELETE') {
    bodyArg = null;
  } else if (args.length >= 1 && args[0]?.type === 'StringLiteral' && args[1]?.type === 'ObjectExpression') {
    const dataProp = args[1].properties.find((p: any) => p.key?.name === 'data' || p.key?.value === 'data');
    if (dataProp) bodyArg = dataProp.value;
  }

  const lineStart = node.loc?.start?.line || 1;
  const lineEnd = node.loc?.end?.line || lineStart;

  const taintSources: string[] = [];
  for (const arg of args) {
    detectTaintSources(arg, content, taintSources);
  }

  return {
    id: `fe-call:${file.path}:${lineStart}:${method}`,
    method: method as HTTPMethod,
    route: url,
    routeTemplate: extractRouteTemplate(url),
    filePath: file.path,
    lineStart,
    lineEnd,
    calleeName: `axios.${method.toLowerCase()}`,
    payload: {
      bodyShape: bodyArg ? extractBodyShape(bodyArg, content) : null,
      queryParams: extractQueryParams(url, args, content),
      pathParams: [],
      headers: {},
    },
    responseHandler: extractResponseHandler(node, content),
    enclosingFunction: null,
    taintSources,
    framework: 'unknown',
  };
}

export function detectFrontendAPICalls(files: FileInput[]): FrontendAPICall[] {
  const calls: FrontendAPICall[] = [];
  const framework = inferFrontendFramework(files);

  for (const file of files) {
    if (file.content.length > 500000) continue;
    let ast: any;
    try {
      ast = babelParser.parse(file.content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'optionalChaining', 'nullishCoalescingOperator'],
        errorRecovery: true,
      });
    } catch {
      continue;
    }

    traverse(ast, {
      CallExpression(path: any) {
        const node = path.node;
        const callee = node.callee;
        const fullCode = getCode(node, file.content);

        if (callee?.type === 'Identifier' && callee.name === 'fetch') {
          const call = detectFetchCall(file, node, 'fetch');
          if (call) { call.framework = framework; calls.push(call); }
          return;
        }

        if (callee?.type === 'MemberExpression') {
          const obj = callee.object;
          const prop = callee.property;

          if (obj?.type === 'Identifier' && obj.name === 'axios' && prop?.type === 'Identifier') {
            const methodCall = `axios.${prop.name}`;
            const call = detectAxiosCall(file, node, methodCall);
            if (call) { call.framework = framework; calls.push(call); }
            return;
          }

          if (prop?.type === 'Identifier') {
            const method = prop.name.toUpperCase();
            if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
              const baseName = obj?.name || getCode(obj, file.content);
              if (baseName && !baseName.includes('axios') && !baseName.includes('fetch')) {
                const url = node.arguments[0] ? getCode(node.arguments[0], file.content) : '';
                const lineStart = node.loc?.start?.line || 1;
                const taintSources: string[] = [];
                for (const arg of node.arguments) detectTaintSources(arg, file.content, taintSources);

                calls.push({
                  id: `fe-call:${file.path}:${lineStart}:${method}`,
                  method: method as HTTPMethod,
                  route: url,
                  routeTemplate: extractRouteTemplate(url),
                  filePath: file.path,
                  lineStart,
                  lineEnd: node.loc?.end?.line || lineStart,
                  calleeName: `${baseName}.${prop.name}`,
                  payload: {
                    bodyShape: null,
                    queryParams: extractQueryParams(url, node.arguments, file.content),
                    pathParams: [],
                    headers: {},
                  },
                  responseHandler: extractResponseHandler(node, file.content),
                  enclosingFunction: null,
                  taintSources,
                  framework,
                });
              }
            }
          }
        }
      },
    });
  }

  return calls;
}
