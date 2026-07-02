import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findFunctionCalls, findStringLiterals, findMemberExpressions } from '../engine/ast-utils.js';

export class CORSWildcardOriginRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-API-001', name: 'CORS Wildcard Origin', description: 'Detects CORS configurations using wildcard (*) origin with credentials enabled', category: 'security-networking', severity: 'high', cwe: 'CWE-942', owasp: 'A01:2021', techniqueNumber: 151, pillar: 1, tags: ['cors', 'api', 'wildcard'] };
  async execute(ctx: RuleContext): Promise<void> {
    const calls = findFunctionCalls(ctx.parsed, c => c.fullName === 'cors' || c.fullName === 'app.use' || c.methodName === 'setHeader');
    for (const c of calls) {
      const args = (c.args || []).map(a => 'value' in a ? String((a as any).value) : '').join(' ') || '';
      if (args.includes('*') && (args.includes('credentials') || args.includes('Access-Control-Allow-Origin'))) {
        this.emit(ctx, { title: 'CORS wildcard origin with credentials', message: 'CORS configured with Access-Control-Allow-Origin: * and credentials: true — defeats same-origin policy', file: c.file, line: c.line, confidence: 92, remediation: 'Set explicit allowed origins instead of wildcard when credentials are enabled' });
      }
    }
  }
}

export class GraphQLIntrospectionProdRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-API-002', name: 'GraphQL Introspection Enabled in Production', description: 'Detects GraphQL introspection enabled in non-development environments', category: 'security-networking', severity: 'high', cwe: 'CWE-200', owasp: 'A01:2021', techniqueNumber: 152, pillar: 1, tags: ['graphql', 'introspection', 'api'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => s.includes('introspection'));
    for (const s of strings) {
      const context = s.value.toLowerCase();
      if (context.includes('true') || context.includes('enabled') || context === 'introspection') {
        this.emit(ctx, { title: 'GraphQL introspection may be enabled', message: 'GraphQL introspection query enabled — exposes entire schema to attackers in production', file: s.file, line: s.line, confidence: 75, remediation: 'Disable introspection in production or restrict by environment' });
      }
    }
  }
}

export class MissingRateLimitingRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-API-003', name: 'Missing API Rate Limiting', description: 'Detects API endpoints without rate limiting middleware', category: 'security-networking', severity: 'medium', cwe: 'CWE-770', owasp: 'A01:2021', techniqueNumber: 153, pillar: 1, tags: ['rate-limit', 'api', 'dos'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasRateLimit = findFunctionCalls(ctx.parsed, c => c.fullName.includes('rateLimit') || c.fullName.includes('rate-limit') || c.fullName.includes('express-rate-limit') || c.methodName === 'rateLimit');
    const hasRoutes = ctx.graph?.routeMap?.endpoints?.length > 0;
    if (hasRoutes && hasRateLimit.length === 0) {
      this.emit(ctx, { title: 'No rate limiting detected', message: 'API routes detected but no rate-limiting middleware found — vulnerable to brute-force and DoS', file: '', line: 1, confidence: 88, remediation: 'Add express-rate-limit or similar middleware to all API routes' });
    }
  }
}

export class OpenAPISpecExposureRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-API-004', name: 'OpenAPI Spec Exposure', description: 'Detects OpenAPI/Swagger spec endpoints exposed in production', category: 'security-networking', severity: 'medium', cwe: 'CWE-200', owasp: 'A01:2021', techniqueNumber: 154, pillar: 1, tags: ['openapi', 'swagger', 'api-docs'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /swagger|openapi|api-docs|api\.json|swagger\.json/i.test(s));
    for (const s of strings) {
      this.emit(ctx, { title: 'API documentation endpoint exposed', message: `Swagger/OpenAPI spec detected at route pattern containing "${s.value}" — may leak API surface in production`, file: s.file, line: s.line, confidence: 70, remediation: 'Conditionally disable API docs in production or add authentication' });
    }
  }
}

export class JWTRefreshTokenRotationRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-API-005', name: 'JWT Refresh Token Without Rotation', description: 'Detects refresh token implementations without rotation detection', category: 'security-crypto', severity: 'high', cwe: 'CWE-613', owasp: 'A02:2021', techniqueNumber: 155, pillar: 1, tags: ['jwt', 'refresh-token', 'auth'] };
  async execute(ctx: RuleContext): Promise<void> {
    const calls = findFunctionCalls(ctx.parsed, c => c.fullName.includes('refresh') || c.fullName.includes('refreshToken') || c.methodName === 'refresh');
    const hasRotation = findStringLiterals(ctx.parsed, s => /rotate|rotation|reuse|family/i.test(s));
    if (calls.length > 0 && hasRotation.length === 0) {
      this.emit(ctx, { title: 'Refresh token without rotation detection', message: 'Refresh token endpoint found but no token rotation/reuse detection implemented — vulnerable to token theft', file: calls[0].file, line: calls[0].line, confidence: 78, remediation: 'Implement refresh token rotation and reuse detection' });
    }
  }
}

export class APIKeyInURLRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-API-006', name: 'API Key in URL Parameters', description: 'Detects API keys passed as URL query parameters', category: 'security-crypto', severity: 'high', cwe: 'CWE-598', owasp: 'A01:2021', techniqueNumber: 156, pillar: 1, tags: ['api-key', 'url', 'exposure'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /api.?key|api_key|apikey|token=/i.test(s) && s.includes('='));
    for (const s of strings) {
      this.emit(ctx, { title: 'API key may be exposed in URL', message: `API key/query parameter "${s.value.slice(0, 40)}" appears to be passed in URL — logged in server logs, browser history`, file: s.file, line: s.line, confidence: 85, remediation: 'Move API keys to Authorization header instead of URL query parameters' });
    }
  }
}

export class MissingHelmetSecurityHeadersRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-API-007', name: 'Missing Security Headers (Helmet)', description: 'Detects Express apps without helmet.js for security headers', category: 'security-networking', severity: 'medium', cwe: 'CWE-693', owasp: 'A05:2021', techniqueNumber: 157, pillar: 1, tags: ['helmet', 'headers', 'express'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasHelmet = findFunctionCalls(ctx.parsed, c => c.fullName === 'helmet' || c.fullName === 'require(helmet)' || c.fullName.includes('helmet'));
    const isExpress = findFunctionCalls(ctx.parsed, c => c.fullName === 'express' || c.fullName === 'require(express)');
    if (isExpress.length > 0 && hasHelmet.length === 0) {
      this.emit(ctx, { title: 'Missing Helmet security headers', message: 'Express app detected without helmet.js — missing security headers (CSP, HSTS, X-Frame-Options, etc.)', file: isExpress[0].file, line: isExpress[0].line, confidence: 90, remediation: 'Add helmet() middleware to set secure HTTP headers' });
    }
  }
}

export class HostHeaderValidationRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-API-008', name: 'Missing Host Header Validation', description: 'Detects apps vulnerable to host header injection', category: 'security-networking', severity: 'high', cwe: 'CWE-644', owasp: 'A01:2021', techniqueNumber: 158, pillar: 1, tags: ['host-header', 'injection', 'express'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasValidation = findFunctionCalls(ctx.parsed, c => c.fullName.includes('hostOnly') || c.fullName.includes('trust proxy') || c.fullName.includes('allowedHosts'));
    if (hasValidation.length === 0) {
      this.emit(ctx, { title: 'Possible host header injection vulnerability', message: 'No host header validation detected — attackers can manipulate Host header for cache poisoning or password reset poisoning', file: '', line: 1, confidence: 65, remediation: 'Validate Host header against whitelist of allowed hostnames' });
    }
  }
}

export class BodyParserSizeLimitRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-API-009', name: 'Missing Body Parser Size Limit', description: 'Detects JSON body parser without size limit, enabling DoS', category: 'security-networking', severity: 'medium', cwe: 'CWE-770', owasp: 'A01:2021', techniqueNumber: 159, pillar: 1, tags: ['body-parser', 'dos', 'limit'] };
  async execute(ctx: RuleContext): Promise<void> {
    const calls = findFunctionCalls(ctx.parsed, (c, args) => c.fullName.includes('json(') || c.fullName === 'bodyParser.json' || (c.fullName === 'express.json' && !args.some(a => 'value' in a && typeof (a as any).value === 'string' && (a as any).value.includes('limit'))));
    for (const c of calls) {
      if (!c.args?.some(a => 'value' in a && typeof (a as any).value === 'string' && ((a as any).value.includes('limit') || (a as any).value.includes('100kb')))) {
        this.emit(ctx, { title: 'JSON body parser without size limit', message: 'express.json() or body-parser used without a size limit — vulnerable to DoS via large payloads', file: c.file, line: c.line, confidence: 80, remediation: 'Add limit: "10mb" or appropriate size limit to JSON body parser' });
      }
    }
  }
}

export class GraphQLDepthLimitRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-API-010', name: 'Missing GraphQL Query Depth Limit', description: 'Detects GraphQL without query depth limiting', category: 'security-networking', severity: 'medium', cwe: 'CWE-770', owasp: 'A01:2021', techniqueNumber: 160, pillar: 1, tags: ['graphql', 'depth-limit', 'dos'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasGraphQL = findFunctionCalls(ctx.parsed, c => c.fullName.includes('graphql') || c.fullName.includes('GraphQL') || c.fullName.includes('ApolloServer') || c.fullName.includes('graphqlHTTP'));
    const hasDepthLimit = findFunctionCalls(ctx.parsed, c => c.fullName.includes('depthLimit') || c.fullName.includes('depth-limit') || c.fullName.includes('queryDepth'));
    if (hasGraphQL.length > 0 && hasDepthLimit.length === 0) {
      this.emit(ctx, { title: 'No GraphQL query depth limiting', message: 'GraphQL server detected without query depth limit — vulnerable to recursive query DoS attacks', file: hasGraphQL[0].file, line: hasGraphQL[0].line, confidence: 85, remediation: 'Add graphql-depth-limit or depth-limiting validation middleware' });
    }
  }
}

export class APIVersioningMissingRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-API-011', name: 'Missing API Versioning', description: 'Detects API routes without versioning strategy', category: 'security-networking', severity: 'low', cwe: 'CWE-1104', techniqueNumber: 161, pillar: 1, tags: ['api', 'versioning', 'maintenance'] };
  async execute(ctx: RuleContext): Promise<void> {
    const routes = ctx.graph?.routeMap?.endpoints || [];
    const hasVersion = routes.some(r => r.path?.includes('/v1/') || r.path?.includes('/v2/') || r.path?.includes('/api/v'));
    if (routes.length > 5 && !hasVersion) {
      this.emit(ctx, { title: 'API routes lack versioning', message: `${routes.length} API routes detected without a versioning prefix (/v1/, /v2/) — breaking changes will affect all clients`, file: '', line: 1, confidence: 70, remediation: 'Add API versioning prefix (e.g., /api/v1/) to all routes' });
    }
  }
}

export class SSRFViaFetchRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-API-012', name: 'SSRF via User-Controlled URL', description: 'Detects fetch/request calls with user-controlled URLs', category: 'security-networking', severity: 'critical', cwe: 'CWE-918', owasp: 'A01:2021', techniqueNumber: 162, pillar: 1, tags: ['ssrf', 'fetch', 'user-input'] };
  async execute(ctx: RuleContext): Promise<void> {
    const userInputs = ctx.astIndex?.userInputs || [];
    const fetchCalls = findFunctionCalls(ctx.parsed, c => c.methodName === 'fetch' || c.methodName === 'request' || c.fullName === 'axios' || c.fullName === 'got');
    for (const fc of fetchCalls) {
      if (fc.args?.some(a => userInputs.some(u => 'value' in a && typeof (a as any).value === 'string' && (a as any).value.includes(u)))) {
        this.emit(ctx, { title: 'SSRF vulnerability — user-controlled URL in server-side request', message: `Server-side request made with user-controlled input — attackers can access internal services`, file: fc.file, line: fc.line, confidence: 88, remediation: 'Validate and whitelist allowed URLs/domains for server-side requests' });
      }
    }
  }
}

export class MissingHSTSRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-API-013', name: 'Missing HTTP Strict Transport Security', description: 'Detects missing HSTS header in security configuration', category: 'security-networking', severity: 'medium', cwe: 'CWE-523', owasp: 'A05:2021', techniqueNumber: 163, pillar: 1, tags: ['hsts', 'tls', 'headers'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasHSTS = findStringLiterals(ctx.parsed, s => /strict-transport-security|Strict-Transport-Security|max-age=/i.test(s));
    if (hasHSTS.length === 0) {
      this.emit(ctx, { title: 'Missing HSTS header', message: 'HTTP Strict-Transport-Security header not found — users vulnerable to SSL-strip attacks', file: '', line: 1, confidence: 75, remediation: 'Add Strict-Transport-Security header with a max-age of at least 1 year' });
    }
  }
}
