import type { BoundaryMatch, StructuralIntegrityIssue, TypeMismatch } from './types-clt.js';
import { edgeId } from '../utils/id.js';

function analyzeBodyFieldCoverage(match: BoundaryMatch): StructuralIntegrityIssue[] {
  const issues: StructuralIntegrityIssue[] = [];
  const fe = match.frontendCall;
  const be = match.backendRoute;
  const feBody = fe.payload.bodyShape;

  if (!feBody) return issues;

  const beBodyFields = new Set(be.handler.bodyReferences);
  const beParamFields = new Set(be.handler.paramReferences);

  for (const [field, info] of Object.entries(feBody)) {
    if (field.startsWith('...')) continue;

    const fieldInBackend = beBodyFields.has(field) || be.handler.parameterNames.includes(field);
    if (!fieldInBackend && !be.paramPatterns.includes(field)) {
      issues.push({
        id: `struct:unused-field:${match.id}:${field}`,
        type: 'extra_field',
        severity: 'low',
        boundaryMatch: match,
        description: `Frontend sends '${field}' (${info.type}) but backend handler never reads it`,
        frontendLocation: {
          file: fe.filePath,
          line: fe.lineStart,
          code: `${field}: ${info.source || '<value>'}`,
        },
        backendLocation: null,
        fixPrompt: `Remove unused field '${field}' from the frontend request, or add backend handling for it.`,
        confidence: 85,
      });
    }
  }

  if (beBodyFields.size > 0 && Object.keys(feBody).length === 0) {
    issues.push({
      id: `struct:missing-body:${match.id}`,
      type: 'missing_field',
      severity: 'high',
      boundaryMatch: match,
      description: `Backend expects body fields (${[...beBodyFields].join(', ')}) but frontend sends no body`,
      frontendLocation: {
        file: fe.filePath,
        line: fe.lineStart,
        code: fe.calleeName + "('" + fe.route + "')",
      },
      backendLocation: {
        file: be.filePath,
        line: be.lineStart,
        code: `req.body.${[...beBodyFields][0] || '?'}`,
      },
      fixPrompt: `Add required body fields to frontend request: ${[...beBodyFields].join(', ')}`,
      confidence: 90,
    });
  }

  return issues;
}

function analyzeAuthBoundaryGaps(match: BoundaryMatch): StructuralIntegrityIssue[] {
  const issues: StructuralIntegrityIssue[] = [];
  const fe = match.frontendCall;
  const be = match.backendRoute;

  if (!be.handler.hasAuthCheck && be.handler.dbQueries.length > 0) {
    issues.push({
      id: `struct:auth-gap:${match.id}`,
      type: 'auth_gap',
      severity: 'critical',
      boundaryMatch: match,
      description: `Route ${be.method} ${be.path} executes DB queries without ownership/auth check — potential IDOR across boundary`,
      frontendLocation: {
        file: fe.filePath,
        line: fe.lineStart,
        code: `${fe.calleeName}('${fe.route}')`,
      },
      backendLocation: {
        file: be.filePath,
        line: be.lineStart,
        code: `handler for ${be.method} ${be.path}`,
      },
      fixPrompt: `Add authorization middleware or ownership check to ${be.method} ${be.path} before executing DB queries. Verify that req.session.userId owns the resource.`,
      confidence: 88,
    });
  }

  return issues;
}

function analyzeTypeMismatches(match: BoundaryMatch): StructuralIntegrityIssue[] {
  const issues: StructuralIntegrityIssue[] = [];

  for (const tm of match.typeMismatches) {
    const sevMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      error: 'high',
      warning: 'medium',
      info: 'low',
    };

    issues.push({
      id: `struct:type-mismatch:${match.id}:${tm.field}`,
      type: 'type_mismatch',
      severity: sevMap[tm.severity] || 'medium',
      boundaryMatch: match,
      description: tm.description,
      frontendLocation: tm.field === 'authorization' || tm.field === 'body'
        ? { file: match.frontendCall.filePath, line: match.frontendCall.lineStart, code: `${match.frontendCall.calleeName}('${match.frontendCall.route}')` }
        : tm.field.includes(',')
          ? { file: match.frontendCall.filePath, line: match.frontendCall.lineStart, code: match.frontendCall.route }
          : null,
      backendLocation: tm.field === 'authorization'
        ? { file: match.backendRoute.filePath, line: match.backendRoute.lineStart, code: 'handler' }
        : null,
      fixPrompt: `Align frontend-backend contract for field '${tm.field}': ${tm.description}`,
      confidence: 85,
    });
  }

  return issues;
}

function analyzeValidationGaps(match: BoundaryMatch): StructuralIntegrityIssue[] {
  const issues: StructuralIntegrityIssue[] = [];
  const be = match.backendRoute;

  const hasValidation = /\.(parse|safeParse|validate)\s*\(/.test(be.handler.handlerBody) ||
    /z\.(object|string|number|boolean|array|enum)/.test(be.handler.handlerBody);

  const hasBodyRead = be.handler.bodyReferences.length > 0;
  if (hasBodyRead && !hasValidation) {
    issues.push({
      id: `struct:validation-gap:${match.id}`,
      type: 'validation_gap',
      severity: 'high',
      boundaryMatch: match,
      description: `Backend reads req.body but has no Zod/Joi/validation — tainted data crosses boundary unsanitized`,
      frontendLocation: null,
      backendLocation: {
        file: be.filePath,
        line: be.lineStart,
        code: `req.body.${be.handler.bodyReferences[0] || '?'}`,
      },
      fixPrompt: `Add input validation (Zod schema) to ${be.method} ${be.path} handler: const schema = z.object({ ... }); const validated = schema.parse(req.body);`,
      confidence: 90,
    });
  }

  return issues;
}

export function analyzeStructuralIntegrity(matches: BoundaryMatch[]): StructuralIntegrityIssue[] {
  const allIssues: StructuralIntegrityIssue[] = [];

  for (const match of matches) {
    allIssues.push(...analyzeBodyFieldCoverage(match));
    allIssues.push(...analyzeAuthBoundaryGaps(match));
    allIssues.push(...analyzeTypeMismatches(match));
    allIssues.push(...analyzeValidationGaps(match));
  }

  return deduplicateIssues(allIssues);
}

function deduplicateIssues(issues: StructuralIntegrityIssue[]): StructuralIntegrityIssue[] {
  const seen = new Set<string>();
  return issues.filter(i => {
    const key = `${i.type}:${i.description.slice(0, 60)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
