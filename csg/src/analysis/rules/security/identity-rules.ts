import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findFunctionCalls, findStringLiterals } from '../engine/ast-utils.js';

export class WeakPasswordPolicyRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-001', name: 'Weak Password Policy', description: 'Detects missing or weak password complexity requirements', category: 'security-crypto', severity: 'high', cwe: 'CWE-521', techniqueNumber: 184, pillar: 1, tags: ['password', 'auth', 'policy'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasPolicy = findStringLiterals(ctx.parsed, s => /minLength|min_length|password.*[6-8]|password.*complex/i.test(s) && !s.includes('minLength'));
    if (hasPolicy.length === 0) {
      this.emit(ctx, { title: 'No password complexity policy', message: 'No minimum password length or complexity requirements detected', file: '', line: 1, confidence: 85, remediation: 'Enforce minimum 8 characters, mixed case, numbers, and special characters' });
    }
  }
}

export class IdentityAccountLockoutRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-002', name: 'Missing Account Lockout', description: 'Detects missing account lockout after failed attempts', category: 'security-crypto', severity: 'high', cwe: 'CWE-307', techniqueNumber: 185, pillar: 1, tags: ['lockout', 'brute-force', 'auth'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasLockout = findStringLiterals(ctx.parsed, s => /lockout|maxAttempts|max_attempts|lock.*account|temporary.*lock/i.test(s));
    if (hasLockout.length === 0) {
      this.emit(ctx, { title: 'Account lockout not implemented', message: 'No account lockout mechanism detected — vulnerable to brute force attacks', file: '', line: 1, confidence: 80, remediation: 'Implement account lockout after 5 failed login attempts with temporary duration' });
    }
  }
}

export class IdentityMFARule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-003', name: 'Missing Multi-Factor Authentication', description: 'Detects applications without MFA support', category: 'security-crypto', severity: 'high', cwe: 'CWE-308', techniqueNumber: 186, pillar: 1, tags: ['mfa', '2fa', 'auth'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasMFA = findStringLiterals(ctx.parsed, s => /mfa|2fa|two.?factor|totp|authenticator|otp|multi.?factor/i.test(s));
    if (hasMFA.length === 0) {
      this.emit(ctx, { title: 'Multi-factor authentication not available', message: 'No MFA/2FA support detected — single-factor authentication increases account takeover risk', file: '', line: 1, confidence: 75, remediation: 'Add TOTP or SMS-based multi-factor authentication option' });
    }
  }
}

export class SessionTimeoutMissingRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-004', name: 'Missing Session Timeout', description: 'Detects missing idle session timeout configuration', category: 'security-crypto', severity: 'medium', cwe: 'CWE-613', techniqueNumber: 187, pillar: 1, tags: ['session', 'timeout', 'auth'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasTimeout = findStringLiterals(ctx.parsed, s => /maxAge|max_age|session.*timeout|expires|rolling|ttl|cookie.*max/i.test(s));
    if (hasTimeout.length === 0) {
      this.emit(ctx, { title: 'No session idle timeout configured', message: 'Sessions may persist indefinitely — users who walk away remain authenticated', file: '', line: 1, confidence: 70, remediation: 'Set session maxAge to 24h and implement idle timeout of 30min' });
    }
  }
}

export class IdentityJWTNoExpirationRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-005', name: 'JWT Without Expiration', description: 'Detects JWTs created without expiration claims', category: 'security-crypto', severity: 'high', cwe: 'CWE-613', techniqueNumber: 188, pillar: 1, tags: ['jwt', 'expiration', 'token'] };
  async execute(ctx: RuleContext): Promise<void> {
    const calls = findFunctionCalls(ctx.parsed, c => c.fullName.includes('jwt.sign') || c.fullName.includes('jwt.verify') || c.methodName === 'sign');
    for (const c of calls) {
      const argsStr = c.args.map(a => a.type === 'StringLiteral' ? a.value : '').join(' ');
      if (!argsStr.includes('expiresIn') && !argsStr.includes('exp')) {
        this.emit(ctx, { title: 'JWT token without expiration', message: 'JWT signed without expiresIn option — token never expires', file: c.file, line: c.line, confidence: 90, remediation: 'Add expiresIn: "24h" or "7d" to jwt.sign() options' });
      }
    }
  }
}

export class OAuthStateMissingRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-006', name: 'OAuth Missing State Parameter', description: 'Detects OAuth flows without state parameter (CSRF)', category: 'security-crypto', severity: 'high', cwe: 'CWE-352', techniqueNumber: 189, pillar: 1, tags: ['oauth', 'csrf', 'state'] };
  async execute(ctx: RuleContext): Promise<void> {
    const oauthCalls = findFunctionCalls(ctx.parsed, c => c.fullName.includes('oauth') || c.fullName.includes('passport.authenticate') || c.fullName.includes('authorizationUrl'));
    const hasState = findStringLiterals(ctx.parsed, s => /state|csrfToken|antiForgery/i.test(s));
    if (oauthCalls.length > 0 && hasState.length === 0) {
      this.emit(ctx, { title: 'OAuth flow missing state parameter', message: 'OAuth authorization detected without state parameter — vulnerable to CSRF login attacks', file: '', line: 1, confidence: 85, remediation: 'Generate and validate a cryptographically random state parameter in OAuth flow' });
    }
  }
}

export class InsecureCookieConfigRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-007', name: 'Insecure Cookie Configuration', description: 'Detects cookies without Secure/HttpOnly/SameSite flags', category: 'security-crypto', severity: 'high', cwe: 'CWE-614', techniqueNumber: 190, pillar: 1, tags: ['cookies', 'secure', 'httponly'] };
  async execute(ctx: RuleContext): Promise<void> {
    const cookieSets = findFunctionCalls(ctx.parsed, c => c.fullName.includes('cookie') || c.fullName.includes('setCookie') || c.fullName.includes('res.cookie'));
    for (const c of cookieSets) {
      const argsStr = c.args.map(a => a.type === 'StringLiteral' ? a.value : '').join(' ');
      if (!argsStr.includes('secure') || !argsStr.includes('httpOnly')) {
        this.emit(ctx, { title: 'Cookie without Secure/HttpOnly flags', message: 'Cookie set without Secure and HttpOnly flags — susceptible to XSS and MITM attacks', file: c.file, line: c.line, confidence: 88, remediation: 'Set { secure: true, httpOnly: true, sameSite: "lax" } on all cookies' });
      }
    }
  }
}

export class CAPTCHAMissingRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-008', name: 'Missing CAPTCHA on Public Forms', description: 'Detects public forms without bot protection', category: 'security-networking', severity: 'medium', cwe: 'CWE-799', techniqueNumber: 191, pillar: 1, tags: ['captcha', 'bot', 'form'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasCaptcha = findStringLiterals(ctx.parsed, s => /captcha|recaptcha|turnstile|hcaptcha|challenge|bot.*protect/i.test(s));
    const hasForms = findStringLiterals(ctx.parsed, s => /<form|onSubmit|method="(POST|post)"/i.test(s));
    if (hasForms.length > 0 && hasCaptcha.length === 0) {
      this.emit(ctx, { title: 'Public forms without bot protection', message: 'HTML forms detected but no CAPTCHA or bot protection found — vulnerable to automated abuse', file: '', line: 1, confidence: 60, remediation: 'Add reCAPTCHA, Turnstile, or hCaptcha to public-facing forms' });
    }
  }
}

export class MissingCSPRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-009', name: 'Missing Content Security Policy', description: 'Detects missing CSP headers in HTTP responses', category: 'security-networking', severity: 'medium', cwe: 'CWE-693', techniqueNumber: 192, pillar: 1, tags: ['csp', 'xss', 'headers'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasCSP = findStringLiterals(ctx.parsed, s => /Content-Security-Policy|contentSecurityPolicy|csp/i.test(s) && !s.includes('//'));
    if (hasCSP.length === 0) {
      this.emit(ctx, { title: 'Content Security Policy not implemented', message: 'No CSP header or meta tag detected — application vulnerable to XSS and data injection attacks', file: '', line: 1, confidence: 78, remediation: 'Add Content-Security-Policy header with script-src, style-src, and object-src directives' });
    }
  }
}

export class InsecureDirectObjectReferenceRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-010', name: 'Insecure Direct Object Reference (IDOR)', description: 'Detects potential IDOR vulnerabilities in API routes', category: 'security-networking', severity: 'critical', cwe: 'CWE-639', techniqueNumber: 193, pillar: 1, tags: ['idor', 'access-control', 'api'] };
  async execute(ctx: RuleContext): Promise<void> {
    const routes = ctx.graph?.routeMap?.endpoints || [];
    const idorRoutes = routes.filter(r => /\/\d+|\/:id|\/{id}/.test(r.path || ''));
    const hasAuthCheck = findFunctionCalls(ctx.parsed, c => c.fullName.includes('authorize') || c.fullName.includes('canAccess') || c.fullName.includes('ownership'));
    if (idorRoutes.length > 2 && hasAuthCheck.length === 0) {
      this.emit(ctx, { title: 'Potential IDOR — API routes with direct object references', message: `${idorRoutes.length} routes use direct object IDs without ownership verification — users may access others data`, file: '', line: 1, confidence: 75, remediation: 'Implement ownership checks on all ID-based routes. Use random UUIDs instead of sequential IDs' });
    }
  }
}

export class MassAssignmentRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-011', name: 'Mass Assignment Vulnerability', description: 'Detects unsafe object updates from request body', category: 'security-memory', severity: 'high', cwe: 'CWE-915', techniqueNumber: 194, pillar: 1, tags: ['mass-assignment', 'orm', 'prisma'] };
  async execute(ctx: RuleContext): Promise<void> {
    const calls = findFunctionCalls(ctx.parsed, c => c.fullName.includes('update') || c.fullName.includes('create') || c.methodName === 'save');
    for (const c of calls) {
      const argsStr = c.args.map(a => a.type === 'StringLiteral' ? a.value : '').join(' ');
      if (argsStr.includes('req.body') || argsStr.includes('body') && !argsStr.includes('select') && !argsStr.includes('pick')) {
        this.emit(ctx, { title: 'Mass assignment risk in ORM operation', message: `ORM update/create in ${c.file} passes req.body directly — attacker can modify any field`, file: c.file, line: c.line, confidence: 82, remediation: 'Use pick() or select() to whitelist allowed fields before ORM update' });
      }
    }
  }
}

export class BrokenAuthorizationRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-012', name: 'Broken Function Level Authorization', description: 'Detects admin routes without role checks', category: 'security-networking', severity: 'critical', cwe: 'CWE-285', techniqueNumber: 195, pillar: 1, tags: ['authorization', 'rbac', 'admin'] };
  async execute(ctx: RuleContext): Promise<void> {
    const adminRoutes = findStringLiterals(ctx.parsed, s => /admin|dashboard|settings.*admin/i.test(s) && (s.includes('/api/') || s.includes('app.')));
    const hasRoleCheck = findFunctionCalls(ctx.parsed, c => c.fullName.includes('isAdmin') || c.fullName.includes('isAuthenticated') || c.fullName.includes('requireAuth') || c.fullName.includes('middleware'));
    if (adminRoutes.length > 0 && hasRoleCheck.length === 0) {
      this.emit(ctx, { title: 'Admin routes without authorization checks', message: 'Admin-level API routes detected without middleware authorization — unauthorized users may access admin functions', file: '', line: 1, confidence: 85, remediation: 'Add role-based authorization middleware to all admin API routes' });
    }
  }
}

export class GraphQLBatchAttackRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-013', name: 'GraphQL Batching Attack Surface', description: 'Detects GraphQL without query batching limits', category: 'security-networking', severity: 'medium', cwe: 'CWE-770', techniqueNumber: 196, pillar: 1, tags: ['graphql', 'batching', 'dos'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasGraphQL = findFunctionCalls(ctx.parsed, c => c.fullName.includes('graphql') || c.fullName.includes('ApolloServer'));
    const hasBatching = findFunctionCalls(ctx.parsed, c => c.fullName.includes('batch') || c.fullName.includes('maxBatch'));
    if (hasGraphQL.length > 0 && hasBatching.length === 0) {
      this.emit(ctx, { title: 'No GraphQL batching limitation', message: 'GraphQL endpoint detected without data-loader or batching limits — attackers can exhaust DB connections', file: '', line: 1, confidence: 70, remediation: 'Implement dataloader and max batch size limits for GraphQL resolvers' });
    }
  }
}

export class WebSocketCSRFRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-014', name: 'WebSocket Without Origin Validation', description: 'Detects WebSocket connections missing origin validation (CSWSH)', category: 'security-networking', severity: 'high', cwe: 'CWE-1385', techniqueNumber: 197, pillar: 1, tags: ['websocket', 'origin', 'csrf'] };
  async execute(ctx: RuleContext): Promise<void> {
    const wsCalls = findFunctionCalls(ctx.parsed, c => c.fullName.includes('WebSocket') || c.fullName.includes('ws://') || c.fullName.includes('wss://'));
    const hasOriginCheck = findStringLiterals(ctx.parsed, s => /origin|crossSite/i.test(s) && (s.includes('Origin') || s.includes('origin')));
    if (wsCalls.length > 0 && hasOriginCheck.length === 0) {
      this.emit(ctx, { title: 'WebSocket without origin validation', message: 'WebSocket connections established without origin header validation — vulnerable to CSWSH', file: '', line: 1, confidence: 82, remediation: 'Validate Origin header on WebSocket upgrade requests against whitelist' });
    }
  }
}

export class CachePoisoningRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-ID-015', name: 'Web Cache Poisoning Surface', description: 'Detects unkeyed inputs that enable cache poisoning', category: 'security-networking', severity: 'high', cwe: 'CWE-644', techniqueNumber: 198, pillar: 1, tags: ['cache', 'poisoning', 'web'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasCache = findStringLiterals(ctx.parsed, s => /Cache-Control|cache|CDN|cloudflare|varnish/i.test(s));
    const unkeyedInputs = findStringLiterals(ctx.parsed, s => /req\.headers|x-forwarded|X-Forwarded|x-original-url|X-Original/i.test(s));
    if (hasCache.length > 0 && unkeyedInputs.length > 0) {
      this.emit(ctx, { title: 'Cache poisoning risk — unkeyed inputs with caching', message: 'Application uses caching and reads unkeyed headers — attackers can poison cached responses', file: '', line: 1, confidence: 60, remediation: 'Ensure all input-derived headers are part of the cache key or sanitized' });
    }
  }
}
