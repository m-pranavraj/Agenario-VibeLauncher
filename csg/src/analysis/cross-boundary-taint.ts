import type { BoundaryMatch, BoundaryTaintPath, FrontendAPICall, BackendRoute } from './types-clt.js';
import { edgeId } from '../utils/id.js';

const SANITIZER_PATTERNS = [
  /\.parse\s*\(/,
  /\.safeParse\s*\(/,
  /DOMPurify\.sanitize/,
  /validator\.escape/,
  /encodeURIComponent\s*\(/,
  /parseInt\s*\(/,
  /Number\s*\(/,
  /escapeHtml\s*\(/,
  /xss\s*\(/,
  /z\.\w+\(\)\.parse/,
];

const SINK_PATTERNS = [
  { pattern: /\$\{[^}]+\}.*(?:SELECT|INSERT|UPDATE|DELETE|WHERE)/i, label: 'SQL injection via template', vulnType: 'sqli' },
  { pattern: /\.query\s*\(\s*[`"']/, label: 'DB query', vulnType: 'sqli' },
  { pattern: /\.execute\s*\(\s*[`"']/, label: 'DB execute', vulnType: 'sqli' },
  { pattern: /db\.(?:select|insert|update|delete|execute|raw)\s*\(/, label: 'DB operation', vulnType: 'sqli' },
  { pattern: /eval\s*\(/, label: 'eval() call', vulnType: 'code_injection' },
  { pattern: /innerHTML\s*=/, label: 'innerHTML assignment', vulnType: 'xss' },
  { pattern: /dangerouslySetInnerHTML/, label: 'dangerouslySetInnerHTML', vulnType: 'xss' },
  { pattern: /res\.redirect\s*\(/, label: 'open redirect', vulnType: 'open_redirect' },
  { pattern: /exec\s*\(/, label: 'exec() call', vulnType: 'cmd_injection' },
  { pattern: /spawn\s*\(/, label: 'spawn() call', vulnType: 'cmd_injection' },
];

function detectSanitizer(code: string): { sanitized: boolean; location: string | null } {
  for (const pat of SANITIZER_PATTERNS) {
    pat.lastIndex = 0;
    if (pat.test(code)) {
      return { sanitized: true, location: code.slice(0, 80) };
    }
  }
  return { sanitized: false, location: null };
}

function detectBackendSink(handler: BackendRoute['handler']): { found: boolean; label: string; line: number | null } {
  for (const sk of SINK_PATTERNS) {
    sk.pattern.lastIndex = 0;
    const m = sk.pattern.exec(handler.handlerBody);
    if (m) {
      const beforeMatch = handler.handlerBody.slice(0, m.index);
      const line = beforeMatch.split('\n').length + handler.lineStart;
      return { found: true, label: sk.label, line };
    }
  }
  return { found: false, label: '', line: null };
}

function buildTaintChain(fe: FrontendAPICall, be: BackendRoute, sources: string[]): string[] {
  const chain: string[] = [];

  if (fe.taintSources.length > 0) {
    for (const src of fe.taintSources) {
      chain.push(`[frontend] ${src} → ${fe.calleeName}('${fe.route}')`);
    }
  } else if (fe.payload.bodyShape) {
    for (const [field, info] of Object.entries(fe.payload.bodyShape)) {
      if (info.tainted) {
        chain.push(`[frontend] ${info.source || field} → body.${field}`);
      }
    }
  } else {
    chain.push(`[frontend] ${fe.calleeName}('${fe.route}')`);
  }

  chain.push(`[boundary] ${fe.method} ${fe.route} → ${be.method} ${be.path}`);

  if (be.handler.bodyReferences.length > 0) {
    chain.push(`[backend] req.body → handler`);
  }
  if (be.handler.paramReferences.length > 0) {
    for (const p of be.handler.paramReferences) {
      chain.push(`[backend] req.params → ${p}`);
    }
  }
  if (be.handler.queryReferences.length > 0) {
    for (const q of be.handler.queryReferences) {
      chain.push(`[backend] req.query → ${q}`);
    }
  }
  if (be.handler.dbQueries.length > 0) {
    for (const q of be.handler.dbQueries) {
      chain.push(`[backend] ${q}`);
    }
  }
  if (be.handler.sinkCalls.length > 0) {
    for (const s of be.handler.sinkCalls) {
      chain.push(`[backend] sink: ${s}`);
    }
  }

  return chain;
}

export function trackBoundaryTaint(matches: BoundaryMatch[]): BoundaryTaintPath[] {
  const paths: BoundaryTaintPath[] = [];

  for (const match of matches) {
    const fe = match.frontendCall;
    const be = match.backendRoute;

    if (fe.taintSources.length === 0 && !fe.payload.bodyShape) continue;

    let hasTaintedPayload = fe.taintSources.length > 0;
    if (fe.payload.bodyShape) {
      for (const [, info] of Object.entries(fe.payload.bodyShape)) {
        if (info.tainted) { hasTaintedPayload = true; break; }
      }
    }
    if (!hasTaintedPayload) continue;

    const sanitizerResult = detectSanitizer(be.handler.handlerBody);
    const sinkResult = detectBackendSink(be.handler);

    if (!sinkResult.found && be.handler.dbQueries.length === 0) continue;

    const appSinkLabel = sinkResult.found ? sinkResult.label : (be.handler.dbQueries[0] || 'db_query');
    const appSinkLine = sinkResult.line || be.lineStart + 5;

    const chain = buildTaintChain(fe, be, fe.taintSources);

    paths.push({
      id: `taint-path:${match.id}`,
      boundaryMatch: match,
      frontendSource: fe.taintSources[0] || 'user_input',
      frontendSourceLine: fe.lineStart,
      frontendSourceFile: fe.filePath,
      boundaryVariable: `body.${Object.keys(fe.payload.bodyShape || {}).join(', ') || fe.route}`,
      backendVariable: 'req.' + (be.handler.bodyReferences.length > 0 ? 'body' : be.handler.paramReferences.length > 0 ? 'params' : 'query'),
      backendSink: appSinkLabel,
      backendSinkLine: appSinkLine,
      backendSinkFile: be.filePath,
      pathChain: chain,
      sanitized: sanitizerResult.sanitized,
      sanitizerLocation: sanitizerResult.location,
      implicitFlow: false,
      confidence: sanitizerResult.sanitized ? 65 : match.matchConfidence === 'exact' ? 92 : 78,
    });
  }

  return paths;
}
