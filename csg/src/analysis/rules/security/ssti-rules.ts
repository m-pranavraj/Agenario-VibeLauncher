import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';

const ENGINE_PATTERNS = [
  { engine: 'Handlebars', patterns: [/Handlebars\.compile/, /express\-handlebars/, /hbs\./] },
  { engine: 'Pug', patterns: [/pug\.compile/, /pug\.render/, /\.pug/] },
  { engine: 'EJS', patterns: [/ejs\.compile/, /ejs\.render/, /new EJS/, /\.ejs/] },
  { engine: 'Nunjucks', patterns: [/nunjucks\.compile/, /nunjucks\.render/, /Nunjucks/] },
  { engine: 'Mustache', patterns: [/Mustache\.render/] },
  { engine: 'Underscore', patterns: [/_.template/] },
  { engine: 'Lodash', patterns: [/_.template/] },
  { engine: 'React', patterns: [/dangerouslySetInnerHTML/, /renderToString/] },
];

/* ───────────── Rule: SEC-SSTI-001 — SSTI via Template Engine ───────────── */
export class SSTIDirectRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SSTI-001',
    name: 'Server-Side Template Injection — Direct User Input in Template',
    description: 'Detects when user-controlled input is passed directly into template engine compilation/render calls',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-1336',
    owasp: 'A03:2021',
    techniqueNumber: 31,
    pillar: 1,
    tags: ['ssti', 'template-injection', 'rce'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const ep of ENGINE_PATTERNS) {
          const matches = ep.patterns.some(pat => { pat.lastIndex = 0; return pat.test(line); });
          if (!matches) continue;

          const hasUserInput = /\b(req|body|params|query|input|user|name|msg|message|content)\b/i.test(line);
          if (!hasUserInput) continue;

          const hasRenderCall = line.match(/\.(?:compile|render|template)\s*\(/);
          if (!hasRenderCall) continue;

          const userRef = line.match(/\b(req\.\w+|body\.\w+|params\.\w+)/);
          const refName = userRef ? userRef[1] : 'user_input';

          this.emit(ctx, {
            title: `Server-Side Template Injection (SSTI) — ${ep.engine}`,
            message: `${ep.engine} engine at line ${i + 1} receives user-controlled data ("${refName}") in compile/render call. Attacker can inject template directives for RCE or data exfiltration.`,
            file: p.file,
            line: i + 1,
            snippet: line.slice(0, 300),
            confidence: 90,
            taintPath: ['User Input', `${ep.engine}.compile/render`, 'Template AST', 'Code Execution'],
            remediation: 'Never pass user input into template compilation. Pre-compile templates. If dynamic content is needed, use a sandboxed render context.',
            owaspMapping: 'A03:2021-Injection',
            cweMapping: 'CWE-1336',
            exploitPayload: ep.engine === 'Handlebars' ? '{{#with "s" as |string|}}{{#with "e"}}{{#with split as |conslist|}}{{this.pop}}{{this.push (lookup string.sub "constructor")}}{{this.pop}}{{#with string.split as |codelist|}}{{this.pop}}{{this.push "return require(\'child_process\').execSync(\'id\')"}}{{this.pop}}{{#each conslist}}{{#with (string.sub.apply 0 codelist)}}{{this}}}}{{/each}}{{/with}}{{/with}}{{/with}}{{/with}}' : '{{7*7}}',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-SSTI-002 — SSTI via template variable injection ───────────── */
export class SSTIVariableInjectionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SSTI-002',
    name: 'SSTI via Template Variable Pollution',
    description: 'Detects when user input is set as template variables without escaping, enabling prototype pollution in template context',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-1336',
    owasp: 'A03:2021',
    techniqueNumber: 32,
    pillar: 1,
    tags: ['ssti', 'variable-pollution', 'context-injection'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const hasContextMerge = line.match(/Object\.assign\s*\(\s*\{\s*\}\)/) || line.match(/\.assign\s*\(\s*\{\s*,\s*req\.body/);
        if (!hasContextMerge) continue;

        const isTemplateContext = /render|template|context|locals/.test(line);
        if (!isTemplateContext) continue;

        this.emit(ctx, {
          title: 'SSTI via Template Context Variable Pollution',
          message: `User-controlled input (req.body) is merged into template render context at line ${i + 1}. Attacker can override internal template variables like "settings", "layout", or "block".`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 82,
          taintPath: ['req.body', 'Template Context Merge', 'Variable Override'],
          remediation: 'Explicitly whitelist which user fields are passed to templates. Never spread req.body into template context.',
          autoFixCode: `// Before:\nres.render('template', { ...req.body, user: session.user });\n// After:\nres.render('template', { message: sanitize(req.body.message), user: session.user });`,
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-1336',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-SSTI-003 — SSTI via unsafe template inheritance ───────────── */
export class SSTIExtendsInjectionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SSTI-003',
    name: 'SSTI via Dynamic Template Inheritance/Includes',
    description: 'Detects when user input controls which template is extended, included, or inherited',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-1336',
    owasp: 'A03:2021',
    techniqueNumber: 33,
    pillar: 1,
    tags: ['ssti', 'template-inheritance', 'include-injection'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const hasExtends = /extends\s+|include\s+|layout\s+|partial/.test(line);
        if (!hasExtends) continue;
        if (!/\b(req|body|params|query|theme|layout|template)\b/i.test(line)) continue;

        this.emit(ctx, {
          title: 'SSTI via Dynamic Template Inheritance/Include',
          message: `Template extends/include/layout at line ${i + 1} is determined by user-controlled input. Attacker can point to arbitrary files (local file inclusion) or inject template syntax via path traversal.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 88,
          taintPath: ['User Input', 'Template Path', 'File Inclusion'],
          remediation: 'Use a strict mapping of allowed template names. Never construct template paths from user input.',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-1336',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-SSTI-004 — SSTI via auto-escape bypass ───────────── */
export class SSTIAutoEscapeBypassRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SSTI-004',
    name: 'SSTI via Auto-Escape Bypass',
    description: 'Detects when template engine auto-escaping is disabled or bypassed with user input',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-1336',
    owasp: 'A03:2021',
    techniqueNumber: 34,
    pillar: 1,
    tags: ['ssti', 'auto-escape-bypass', 'xss'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const escapeDisabled = /noEscape|escape:\s*false|autoescape:\s*false|escapeFunction|null/.test(line);
        if (!escapeDisabled) continue;
        if (!/\b(req|body|params|query|input|content|html|message)\b/i.test(line)) continue;

        this.emit(ctx, {
          title: 'SSTI via Auto-Escape Bypass',
          message: `Template engine auto-escaping is disabled at line ${i + 1} and user input is rendered. This creates a direct XSS + SSTI vector.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 85,
          taintPath: ['User Input', 'Unescaped Template Output', 'XSS + SSTI'],
          remediation: 'Enable auto-escaping. If you need raw HTML, use a dedicated sanitizer like DOMPurify.',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-1336',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-SSTI-005 — SSTI in error pages ───────────── */
export class SSTIErrorPageRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SSTI-005',
    name: 'SSTI via Error Page Template Injection',
    description: 'Detects when user-controlled input appears in error page rendering with a template engine',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-1336',
    owasp: 'A03:2021',
    techniqueNumber: 35,
    pillar: 1,
    tags: ['ssti', 'error-page', 'debug-mode'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].match(/error|err|stack|message/i)) continue;
        if (!lines[i].match(/render|template|compile/i)) continue;
        if (!/\b(req|body|params|query|err|error)\b/i.test(lines[i])) continue;

        this.emit(ctx, {
          title: 'SSTI via Error Page Template Rendering',
          message: `Error details containing user-controlled input are rendered via template engine at line ${i + 1}. Error messages often bypass security controls.`,
          file: p.file,
          line: i + 1,
          snippet: lines[i].slice(0, 250),
          confidence: 75,
          taintPath: ['User Input', 'Error Object', 'Template Render'],
          remediation: 'Never render raw error messages containing user input through template engines. Use static error pages.',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-1336',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-SSTI-006 — Raw output without escaping ───────────── */
export class SSTIRawOutputRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SSTI-006',
    name: 'SSTI via Raw Unescaped Output',
    description: 'Detects triple-brace or raw filter usage in template engines',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-1336',
    owasp: 'A03:2021',
    techniqueNumber: 36,
    pillar: 1,
    tags: ['ssti', 'raw-output', 'xss'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/{{{|\|safe\b|\|raw\b/i.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|content|html|message|user)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'SSTI via Raw Unescaped Output',
          message: 'Raw unescaped output at line ' + ln + ' renders user input without escaping. XSS + SSTI combined.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
          taintPath: ['User Input', 'Unescaped Output', 'XSS'],
          remediation: 'Remove raw output directives. Use auto-escaped template syntax.',
          owaspMapping: 'A03:2021-Injection', cweMapping: 'CWE-1336',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-SSTI-007 — Template cache poisoning ───────────── */
export class SSTICachePoisoningRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SSTI-007',
    name: 'SSTI via Template Cache Poisoning',
    description: 'Detects template caching with user-controlled cache keys',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-1336',
    owasp: 'A03:2021',
    techniqueNumber: 37,
    pillar: 1,
    tags: ['ssti', 'cache-poisoning'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:cache|cached)\s*:\s*true|\.compile\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|key|name)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'SSTI via Template Cache Poisoning',
          message: 'Template cache key at line ' + ln + ' uses user input. Cache poisoned with malicious template.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          taintPath: ['User Input', 'Cache Key', 'Template Cache', 'Stored SSTI'],
          remediation: 'Never use user input as template cache keys.',
          owaspMapping: 'A03:2021-Injection', cweMapping: 'CWE-1336',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-SSTI-008 — Debug mode ───────────── */
export class SSTIDebugModeRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SSTI-008',
    name: 'SSTI via Debug Mode',
    description: 'Detects template debug/pretty mode enabled in production',
    category: 'security-injection',
    severity: 'medium',
    cwe: 'CWE-1336',
    owasp: 'A03:2021',
    techniqueNumber: 38,
    pillar: 1,
    tags: ['ssti', 'debug-mode'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:debug|pretty|compileDebug)\s*:\s*true/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'SSTI via Debug Mode',
          message: 'Template debug mode at line ' + ln + '. May leak compiled source with user input.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Disable debug mode in production.',
          owaspMapping: 'A03:2021-Injection', cweMapping: 'CWE-1336',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-SSTI-009 — Partial injection ───────────── */
export class SSTIInlinePartialRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SSTI-009',
    name: 'SSTI via Inline Partial Injection',
    description: 'Detects user input as partial/block name in template includes',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-1336',
    owasp: 'A03:2021',
    techniqueNumber: 39,
    pillar: 1,
    tags: ['ssti', 'partial-injection'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/partial|block|section|yield|render\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|name|template)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'SSTI via Partial Injection',
          message: 'Partial/block name at line ' + ln + ' from user input. Attacker controls which template renders.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 78,
          taintPath: ['User Input', 'Partial Name', 'Template Inclusion'],
          remediation: 'Use strict mapping of allowed partial names.',
          owaspMapping: 'A03:2021-Injection', cweMapping: 'CWE-1336',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-SSTI-010 — Whitespace control ───────────── */
export class SSTIWhitespaceControlRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SSTI-010',
    name: 'SSTI via Whitespace Trimming',
    description: 'Detects whitespace control used to hide injected template code',
    category: 'security-injection',
    severity: 'medium',
    cwe: 'CWE-1336',
    owasp: 'A03:2021',
    techniqueNumber: 40,
    pillar: 1,
    tags: ['ssti', 'whitespace-control'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\{%-|-%\}|{{-|-}}/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|user)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'SSTI via Whitespace Control',
          message: 'Whitespace trimming at line ' + ln + ' with user input. Conceals injected code in output.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Use strict CSP. Sanitize input before template context.',
          owaspMapping: 'A03:2021-Injection', cweMapping: 'CWE-1336',
        });
      }
    }
  }
}
