import type { FrontendAPICall, BackendRoute, BoundaryMatch, MatchConfidence, TypeMismatch } from './types-clt.js';
import { edgeId } from '../utils/id.js';

function normalizePath(path: string): string {
  return path
    .replace(/^['"`]|['"`]$/g, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .toLowerCase();
}

function pathToRegex(pattern: string): RegExp {
  const normalized = normalizePath(pattern);
  const escaped = normalized
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\:param/g, '([^/]+)')
    .replace(/\\{param\\}/g, '([^/]+)')
    .replace(/\\\[param\\\]/g, '([^/]+)');
  return new RegExp(`^${escaped}$`);
}

function extractTemplateParams(frontendRoute: string): string[] {
  const params: string[] = [];
  const templateMatch = frontendRoute.match(/\$\{(\w+)\}/g);
  if (templateMatch) {
    for (const m of templateMatch) {
      params.push(m.slice(2, -1));
    }
  }
  return params;
}

function matchScore(fe: FrontendAPICall, be: BackendRoute): { confidence: MatchConfidence; score: number } {
  const fePath = normalizePath(fe.routeTemplate);
  const bePath = normalizePath(be.pathTemplate);

  if (fePath === bePath) {
    if (fe.method === be.method) {
      return { confidence: 'exact', score: 100 };
    }
    return { confidence: 'exact', score: 80 };
  }

  try {
    const re = pathToRegex(be.pathTemplate);
    if (re.test(fePath)) {
      if (fe.method === be.method) {
        return { confidence: 'template', score: 90 };
      }
      return { confidence: 'template', score: 70 };
    }
  } catch {}

  const feParts = fePath.split('/').filter(Boolean);
  const beParts = bePath.split('/').filter(Boolean);
  if (feParts.length === beParts.length) {
    let matchCount = 0;
    let paramCount = 0;
    for (let i = 0; i < feParts.length; i++) {
      if (feParts[i] === beParts[i]) matchCount++;
      else if (beParts[i] === ':param') paramCount++;
    }
    const ratio = (matchCount + paramCount * 0.5) / feParts.length;
    if (ratio > 0.6 && fe.method === be.method) {
      return { confidence: 'fuzzy', score: Math.round(ratio * 80) };
    }
  }

  const beRelevantParts = beParts.filter(p => p !== ':param');
  const feRelevantParts = feParts.filter(p => p !== undefined);
  if (beRelevantParts.length > 0) {
    const matchedSegments = beRelevantParts.filter(p => feRelevantParts.includes(p));
    if (matchedSegments.length >= Math.min(2, beRelevantParts.length)) {
      if (fe.method === be.method) {
        return { confidence: 'fuzzy', score: 50 };
      }
    }
  }

  return { confidence: 'none', score: 0 };
}

function detectTypeMismatches(fe: FrontendAPICall, be: BackendRoute): TypeMismatch[] {
  const mismatches: TypeMismatch[] = [];

  const feBody = fe.payload.bodyShape;
  if (feBody) {
    const beBodyRefs = new Set(be.handler.bodyReferences);
    for (const [field, info] of Object.entries(feBody)) {
      if (field.startsWith('...')) continue;
      if (field === 'id' && be.handler.paramReferences.length > 0) {
        if (!be.handler.hasAuthCheck) {
          mismatches.push({
            field,
            frontendType: info.type,
            backendType: 'param',
            severity: 'warning',
            description: `Field '${field}' sent in body but backend reads from params — potential IDOR if no auth check`,
          });
        }
      }
    }
  }

  if (be.handler.paramReferences.length > 0 && fe.payload.pathParams.length === 0) {
    const fePathParams = extractTemplateParams(fe.route);
      if (fePathParams.length === 0 && (be.paramPatterns?.length ?? 0) > 0) {
      mismatches.push({
        field: be.paramPatterns?.join(', ') || '',
        frontendType: 'null',
        backendType: 'param',
        severity: 'error',
        description: `Backend expects params (${(be.paramPatterns || []).join(', ')}) but frontend sends none`,
      });
    }
  }

  if (be.handler.bodyReferences.length > 0 && fe.method === 'GET') {
    mismatches.push({
      field: 'body',
      frontendType: 'GET (no body)',
      backendType: 'body',
      severity: 'error',
      description: `Backend reads from req.body but frontend uses GET (no body allowed)`,
    });
  }

  if (be.handler.dbQueries.length > 0 && !be.handler.hasAuthCheck) {
    mismatches.push({
      field: 'authorization',
      frontendType: 'user input',
      backendType: 'db query',
      severity: 'error',
      description: `Backend handler executes DB queries without ownership/auth check — potential IDOR`,
    });
  }

  return mismatches;
}

export function matchBoundaries(
  frontendCalls: FrontendAPICall[],
  backendRoutes: BackendRoute[],
  threshold = 30,
): BoundaryMatch[] {
  const matches: BoundaryMatch[] = [];

  for (const fe of frontendCalls) {
    let bestMatch: { route: BackendRoute; confidence: MatchConfidence; score: number } | null = null;

    for (const be of backendRoutes) {
      const result = matchScore(fe, be);
      if (result.score > (bestMatch?.score || 0)) {
        bestMatch = { route: be, ...result };
      }
    }

    if (bestMatch && bestMatch.score >= threshold) {
      const paramMapping = new Map<string, string>();
      const bodyFieldMapping = new Map<string, string>();

      const feParams = extractTemplateParams(fe.route);
      for (let i = 0; i < Math.min(feParams.length, (bestMatch.route.paramPatterns?.length ?? 0)); i++) {
        paramMapping.set(feParams[i], (bestMatch.route.paramPatterns || [])[i]);
      }

      const feBody = fe.payload.bodyShape;
      if (feBody && bestMatch.route.handler.bodyReferences.length > 0) {
        for (const [field] of Object.entries(feBody)) {
          if (!field.startsWith('...')) {
            bodyFieldMapping.set(field, field);
          }
        }
      }

      const typeMismatches = detectTypeMismatches(fe, bestMatch.route);

      matches.push({
        id: `boundary:${fe.id}:${bestMatch.route.id}`,
        frontendCall: fe,
        backendRoute: bestMatch.route,
        matchConfidence: bestMatch.confidence,
        matchScore: bestMatch.score,
        paramMapping,
        bodyFieldMapping,
        typeMismatches,
      });
    }
  }

  return matches;
}
