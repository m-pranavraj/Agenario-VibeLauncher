import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';

/* ───────────── Rule: SEC-MEM-001 — Prototype pollution via merge ───────────── */
export class PrototypePollutionMergeRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-001',
    name: 'Prototype Pollution via Object Merge/Assign',
    description: 'Detects deep-merge or clone operations that do not filter __proto__, constructor, or prototype keys',
    category: 'security-memory',
    severity: 'critical',
    cwe: 'CWE-1321',
    owasp: 'A04:2021',
    techniqueNumber: 71,
    pillar: 1,
    tags: ['prototype-pollution', 'merge', 'assign', 'rce'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const mergePattern = line.match(/(?:Object\.assign|\.\.\.|merge|extend|clone|deepMerge|mergeDeep|assign)\s*\(/i);
        if (!mergePattern) continue;

        const hasUserInput = /\b(req|body|params|query|input|data|payload)\b/i.test(line);
        if (!hasUserInput) continue;

        const hasSanitizer = /__proto__|constructor|prototype|hasOwnProperty|hasOwn|filterKeys|omit|pick|allowlist/i.test(line);
        const confidence = hasSanitizer ? 35 : 88;

        this.emit(ctx, {
          title: 'Prototype Pollution — Object Merge Without Key Filtering',
          message: `Object merge/clone at line ${i + 1} accepts user-controlled data without filtering "__proto__", "constructor", or "prototype" keys.${hasSanitizer ? ' (Partial sanitization detected but may be incomplete)' : ''}`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence,
          taintPath: ['User Input', `Object Merge (${mergePattern[1]})`, '__proto__ Injection', 'Prototype Chain', 'Application RCE'],
          remediation: 'Filter keys before merging: explicitly reject __proto__, constructor, and prototype. Use libraries like lodash.mergeWith with a customizer that drops dangerous keys.',
          autoFixCode: `// Before:\nconst config = { ...defaults, ...req.body };\n// After:\nconst dangerousKeys = ['__proto__', 'constructor', 'prototype'];\nconst safe = Object.keys(req.body).filter(k => !dangerousKeys.includes(k)).reduce((o, k) => ({ ...o, [k]: req.body[k] }), {});\nconst config = { ...defaults, ...safe };`,
          owaspMapping: 'A04:2021-Insecure Design',
          cweMapping: 'CWE-1321',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-002 — Prototype pollution via setter ───────────── */
export class PrototypePollutionSetterRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-002',
    name: 'Prototype Pollution via Recursive Setter Functions',
    description: 'Detects recursive set/dot notation setters that can traverse to __proto__',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-1321',
    owasp: 'A04:2021',
    techniqueNumber: 72,
    pillar: 1,
    tags: ['prototype-pollution', 'setter', 'recursive'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const setterPattern = line.match(/set\s*\(|setIn|setPath|_.set|lodash\.set|dotSet|deepSet/i);
        if (!setterPattern) continue;
        if (!/\b(req|body|params|query|input)\b/i.test(line)) continue;

        this.emit(ctx, {
          title: 'Prototype Pollution — Recursive Setter Allows __proto__ Traversal',
          message: `Recursive setter function (${setterPattern[0]}) at line ${i + 1} accepts user-controlled path. Attacker can set properties on Object.prototype via "__proto__.polluted".`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 85,
          taintPath: ['User Input Path', 'Recursive Setter', '__proto__ Traversal', 'Prototype Pollution'],
          remediation: 'Block paths containing __proto__, prototype, and constructor. Use path allowlisting.',
          owaspMapping: 'A04:2021-Insecure Design',
          cweMapping: 'CWE-1321',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-003 — Mass assignment (ORM) ───────────── */
export class MassAssignmentORMRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-003',
    name: 'Mass Assignment — Unfiltered req.body in ORM Update',
    description: 'Detects ORM create/update calls receiving entire req.body without field whitelisting',
    category: 'security-memory',
    severity: 'critical',
    cwe: 'CWE-915',
    owasp: 'A04:2021',
    techniqueNumber: 81,
    pillar: 1,
    tags: ['mass-assignment', 'orm', 'prisma', 'typeorm', 'mongoose'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      const ormUpdates = [
        /\.update\s*\(\s*[^,]+,\s*req\.body/,
        /\.updateOne\s*\(\s*[^,]+,\s*req\.body/,
        /\.findByIdAndUpdate\s*\(\s*[^,]+,\s*req\.body/,
        /\.findOneAndUpdate\s*\(\s*[^,]+,\s*req\.body/,
        /\.create\s*\(\s*req\.body/,
        /\.insert\s*\(\s*req\.body/,
        /\.save\s*\(\s*req\.body/,
        /\.$update\s*\(\s*req\.body/,
        /prisma\.\w+\.update\s*\(\s*{\s*data:\s*req\.body/,
        /prisma\.\w+\.create\s*\(\s*{\s*data:\s*req\.body/,
      ];

      for (let i = 0; i < lines.length; i++) {
        for (const op of ormUpdates) {
          op.lastIndex = 0;
          if (!op.test(lines[i])) continue;

          const hasSan = /pick|omit|select|allowlist|whitelist|schema|parse|safeParse|strip|fields/i.test(lines[i]);

          this.emit(ctx, {
            title: 'Mass Assignment — ORM Update/Create with Entire req.body',
            message: `ORM operation at line ${i + 1} passes entire req.body to create/update${hasSan ? '' : ' without field whitelisting'}.${hasSan ? ' (Partial validation detected)' : ' Attacker can escalate privileges by setting "role":"admin", "isAdmin":true, etc.'}`,
            file: p.file,
            line: i + 1,
            snippet: lines[i].slice(0, 300),
            confidence: hasSan ? 40 : 90,
            taintPath: ['req.body', 'ORM Create/Update', 'Database Write'],
            remediation: 'Use Zod/Joi schema validation to strictly define which fields are allowed. Never pass req.body directly.',
            autoFixCode: `// Before:\nawait prisma.user.update({ where: { id }, data: req.body });\n// After:\nconst schema = z.object({ name: z.string().optional(), email: z.string().optional() });\nconst safe = schema.parse(req.body);\nawait prisma.user.update({ where: { id }, data: safe });`,
            owaspMapping: 'A04:2021-Insecure Design',
            cweMapping: 'CWE-915',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-004 — Insecure deserialization (yaml.load) ───────────── */
export class InsecureDeserializationYamlRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-004',
    name: 'Insecure Deserialization — yaml.load() Instead of safeLoad',
    description: 'Detects yaml.load() (unsafe) which can execute arbitrary code during deserialization',
    category: 'security-memory',
    severity: 'critical',
    cwe: 'CWE-502',
    owasp: 'A08:2021',
    techniqueNumber: 91,
    pillar: 1,
    tags: ['deserialization', 'yaml', 'rce'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/yaml\.load\s*\(/) && !line.match(/yaml\.safeLoad|safeLoad/)) {
          const hasUserInput = /\b(req|body|params|query|input|file|data|content)\b/i.test(line);

          this.emit(ctx, {
            title: 'Insecure Deserialization — yaml.load() Allows Code Execution',
            message: `yaml.load() at line ${i + 1}${hasUserInput ? ' deserializes user-controlled input' : ''}. YAML load() can execute arbitrary JavaScript via !!js/undocumented tags. Use yaml.safeLoad() instead.`,
            file: p.file,
            line: i + 1,
            snippet: line.slice(0, 200),
            confidence: hasUserInput ? 95 : 75,
            remediation: 'Always use yaml.safeLoad() or yaml.parse() for untrusted YAML. Never use yaml.load() which enables arbitrary code execution.',
            autoFixCode: `// Before:\nconst data = yaml.load(userInput);\n// After:\nconst data = yaml.safeLoad(userInput);`,
            owaspMapping: 'A08:2021-Software and Data Integrity Failures',
            cweMapping: 'CWE-502',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-005 — Insecure deserialization (JSON.parse with reviver) ───────────── */
export class InsecureDeserializationJSONRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-005',
    name: 'Insecure Deserialization — JSON.parse with Unsafe Reviver',
    description: 'Detects JSON.parse with a reviver function that can be exploited for prototype pollution',
    category: 'security-memory',
    severity: 'medium',
    cwe: 'CWE-502',
    owasp: 'A08:2021',
    techniqueNumber: 92,
    pillar: 1,
    tags: ['deserialization', 'json', 'reviver', 'prototype-pollution'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.match(/JSON\.parse\s*\([^,]+,\s*(function|\(|=>)/)) continue;
        if (!line.match(/__proto__|constructor|prototype/i)) continue;

        this.emit(ctx, {
          title: 'Insecure JSON Reviver — Potential Prototype Pollution',
          message: `JSON.parse() with reviver at line ${i + 1} references __proto__/constructor. Reviver can be used to set properties on Object.prototype.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 65,
          remediation: 'Avoid using reviver functions with JSON.parse. If needed, ensure __proto__ and constructor keys are dropped.',
          owaspMapping: 'A08:2021-Software and Data Integrity Failures',
          cweMapping: 'CWE-502',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-006 — eval/Function constructor → RCE ───────────── */
export class EvalFunctionConstructorRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-006',
    name: 'Arbitrary Code Execution via eval() or Function()',
    description: 'Detects eval() or new Function() calls with user-controlled input',
    category: 'security-memory',
    severity: 'critical',
    cwe: 'CWE-95',
    owasp: 'A03:2021',
    techniqueNumber: 93,
    pillar: 1,
    tags: ['rce', 'eval', 'function-constructor'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const evalCall = line.match(/\beval\s*\(/) || line.match(/new\s+Function\s*\(/) || line.match(/setTimeout\s*\(\s*['"`]/) || line.match(/setInterval\s*\(\s*['"`]/);
        if (!evalCall) continue;
        if (!/\b(req|body|params|query|input|user|header|cookie|data)\b/i.test(line)) continue;

        const context = /Function/.test(evalCall[0]) ? 'new Function()' : /setTimeout|setInterval/.test(evalCall[0]) ? `${evalCall[0]} with string code` : 'eval()';

        this.emit(ctx, {
          title: `Arbitrary Code Execution — ${context} with User Input`,
          message: `${context} at line ${i + 1} receives user-controlled input. This allows arbitrary JavaScript execution on the server.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: context === 'eval()' ? 93 : 85,
          taintPath: ['User Input', context, 'Server-Side Code Execution'],
          remediation: 'Eliminate eval() entirely. Use JSON.parse for data parsing. Never pass user code to Function constructor.',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-95',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-007 — Type juggling (loose equality) ───────────── */
export class TypeJugglingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-007',
    name: 'Type Juggling — Loose Equality in Auth Middleware',
    description: 'Detects loose equality (==) in authentication/authorization checks enabling type coercion bypass',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-843',
    owasp: 'A04:2021',
    techniqueNumber: 101,
    pillar: 1,
    tags: ['type-juggling', 'loose-equality', 'auth-bypass'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const authContext = /role|admin|user|auth|login|permission|session|token|password|hash|verify/i.test(line);
        if (!authContext) continue;

        const looseEquals = line.match(/(\w+)\s*==\s*(\w+)/);
        if (!looseEquals) continue;

        if (line.includes('===')) continue;

        this.emit(ctx, {
          title: 'Type Juggling — Loose Equality in Security Context',
          message: `Loose equality (==) used at line ${i + 1} comparing "${looseEquals[1]}" and "${looseEquals[2]}". Type coercion can cause unexpected matches (e.g., "0" == false, "" == 0).`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 200),
          confidence: 72,
          remediation: 'Always use strict equality (===) in security contexts. For hash comparison, use crypto.timingSafeEqual().',
          autoFixCode: '// Before:\nif (user.role == "admin") { ... }\n// After:\nif (user.role === "admin") { ... }',
          owaspMapping: 'A04:2021-Insecure Design',
          cweMapping: 'CWE-843',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-008 — Deep clone without proto check ───────────── */
export class DeepCloneProtoPollutionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-008',
    name: 'Deep Clone Without __proto__ Filter',
    description: 'Detects structuredClone or custom deep clone without checking __proto__/constructor',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-1321',
    owasp: 'A04:2021',
    techniqueNumber: 73,
    pillar: 1,
    tags: ['prototype-pollution', 'deep-clone'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/structuredClone|cloneDeep|deepClone|deepCopy|_.clone/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|payload)\b/i.test(lines[i])) continue;
        if (/__proto__|constructor|hasOwnProperty|hasOwn/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Deep Clone Without __proto__ Filter',
          message: 'Deep clone at line ' + ln + ' copies user input without filtering __proto__/constructor. Prototype pollution.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 82,
          taintPath: ['User Input', 'Deep Clone', '__proto__ Injection'],
          remediation: 'Filter __proto__, constructor keys before cloning. Use lodash.cloneDeep with customizer.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-1321',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-009 — Object.assign pollution ───────────── */
export class ObjectAssignPollutionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-009',
    name: 'Object.assign Prototype Pollution',
    description: 'Detects Object.assign with user input enabling __proto__ injection',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-1321',
    owasp: 'A04:2021',
    techniqueNumber: 74,
    pillar: 1,
    tags: ['prototype-pollution', 'object-assign'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/Object\.assign\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|payload)\b/i.test(lines[i])) continue;
        if (/__proto__|constructor|hasOwnProperty/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Object.assign Prototype Pollution',
          message: 'Object.assign at line ' + ln + ' merges user input without key filtering. __proto__ injection possible.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
          remediation: 'Use Object.assign with key allowlist or filter __proto__/constructor before merge.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-1321',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-010 — Deserialization via eval-based parsers ───────────── */
export class DeserializationEvalRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-010',
    name: 'Insecure Deserialization via eval-based Parser',
    description: 'Detects JSON.parse or custom parsers using reviver that can execute code',
    category: 'security-memory',
    severity: 'critical',
    cwe: 'CWE-502',
    owasp: 'A08:2021',
    techniqueNumber: 94,
    pillar: 1,
    tags: ['deserialization', 'eval', 'rce'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/JSON\.parse\s*\([^,]+,\s*(?:function|\(|=>)\s*(?:[^)]*)\s*\{[^}]*eval\s*\(/i.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Deserialization via eval-based JSON Reviver',
          message: 'JSON.parse with reviver containing eval at line ' + ln + '. Attacker achieves RCE via crafted JSON.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 92,
          remediation: 'Never use eval inside JSON reviver. Use static mapping functions instead.',
          owaspMapping: 'A08:2021-Software and Data Integrity Failures', cweMapping: 'CWE-502',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-011 — Insecure serialization format ───────────── */
export class PickleDeserializationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-011',
    name: 'Insecure Python Pickle/Node Serialize Deserialization',
    description: 'Detects pickle.load() or node-serialize unserialize() operating on HTTP input',
    category: 'security-memory',
    severity: 'critical',
    cwe: 'CWE-502',
    owasp: 'A08:2021',
    techniqueNumber: 95,
    pillar: 1,
    tags: ['deserialization', 'pickle', 'rce'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/unserialize\s*\(|deserialize\s*\(|pickle\.load|node-serialize/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|session|cookie)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Insecure Deserialization - Binary Format',
          message: 'Dangerous deserialization at line ' + ln + ' on HTTP-controlled data. Arbitrary code execution possible.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 90,
          remediation: 'Use JSON.parse for serialization. Never use pickle/node-serialize with untrusted data.',
          owaspMapping: 'A08:2021-Software and Data Integrity Failures', cweMapping: 'CWE-502',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-012 — Prototype pollution via lodash/defaults ───────────── */
export class LodashDefaultsPollutionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-012',
    name: 'Prototype Pollution via lodash defaults/defaultsDeep',
    description: 'Detects lodash defaults/defaultsDeep/merge with user input',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-1321',
    owasp: 'A04:2021',
    techniqueNumber: 75,
    pillar: 1,
    tags: ['prototype-pollution', 'lodash', 'defaults'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/_.(?:defaults|defaultsDeep|merge)\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|payload|opts|options)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Prototype Pollution via lodash defaults',
          message: 'lodash defaults/defaultsDeep at line ' + ln + ' with user input. Known CVE vector for prototype pollution.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          remediation: 'Use lodash.mergeWith with customizer that drops __proto__/constructor. Prefer Object.assign with allowlist.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-1321',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-013 — Type juggling via loose array search ───────────── */
export class TypeJugglingArrayRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-013',
    name: 'Type Juggling via Loose Array Search (in_array, indexOf)',
    description: 'Detects loose type comparison in array search functions for auth/role checks',
    category: 'security-memory',
    severity: 'medium',
    cwe: 'CWE-843',
    owasp: 'A04:2021',
    techniqueNumber: 102,
    pillar: 1,
    tags: ['type-juggling', 'array-search'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/in_array|array_search|indexOf|includes/.test(lines[i])) continue;
        if (!/\b(role|admin|permission|auth|user|type|status)\b/i.test(lines[i])) continue;
        if (/===/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Type Juggling via Loose Array Search',
          message: 'Loose array search at line ' + ln + ' in security context. Type coercion can bypass checks (0 == "admin").',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Use strict comparison (===) or type-safe checks in security contexts.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-843',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-014 — Mass assignment via GraphQL ───────────── */
export class GraphQLMassAssignmentRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-014',
    name: 'Mass Assignment via GraphQL Mutations',
    description: 'Detects GraphQL mutations that pass entire input object to DB create/update',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-915',
    owasp: 'A04:2021',
    techniqueNumber: 82,
    pillar: 1,
    tags: ['mass-assignment', 'graphql', 'mutation'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/resolver|mutation|Mutation|type Mutation/i.test(lines[i])) continue;
        if (!/\.(?:create|update)\s*\(\s*(?:input|args|data|_|parent)/.test(lines[i])) continue;
        if (/pick|omit|select|allowlist|whitelist|schema|parse|safeParse/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Mass Assignment via GraphQL Mutation',
          message: 'GraphQL resolver at line ' + ln + ' passes entire input to create/update. Attacker sets arbitrary fields.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 78,
          remediation: 'Map input fields explicitly per mutation. Never spread input arguments directly.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-915',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-015 — Symbol-keyed Prototype Pollution (well-known Symbols) ───────────── */
export class SymbolKeyedPollutionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-015',
    name: 'Prototype Pollution via Well-Known Symbol Injection',
    description: 'Detects user-controlled data assigned to Symbol.species, Symbol.iterator, Symbol.toPrimitive, or Symbol.hasInstance on prototypes',
    category: 'security-memory',
    severity: 'critical',
    cwe: 'CWE-1321',
    owasp: 'A04:2021',
    techniqueNumber: 76,
    pillar: 1,
    tags: ['prototype-pollution', 'symbol', 'well-known-symbol', 'internal-slot'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/Symbol\.(?:species|iterator|toPrimitive|hasInstance|isConcatSpreadable|unscopables|match|replace|search|split)/.test(lines[i])) continue;
        if (!/prototype|__proto__|constructor|Object\.setPrototypeOf/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|user|payload|arg|value)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Prototype Pollution via Well-Known Symbol Injection',
          message: 'Well-known Symbol assignment at line ' + ln + ' with user data on prototype. Hijacks built-in operations (species controls constructor in Array.map/filter, iterator controls for...of loops).',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 92,
          remediation: 'Never assign user-controlled values to well-known Symbol properties on prototypes. Use Object.freeze on prototypes in production.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-1321',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-016 — Error.prepareStackTrace pollution (V8 RCE vector) ───────────── */
export class ErrorPrepareStackTraceRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-016',
    name: 'Prototype Pollution via Error.prepareStackTrace (V8 RCE)',
    description: 'Detects user input polluting Error.prepareStackTrace which V8 calls with the error object as `this`',
    category: 'security-memory',
    severity: 'critical',
    cwe: 'CWE-1321',
    owasp: 'A04:2021',
    techniqueNumber: 77,
    pillar: 1,
    tags: ['prototype-pollution', 'error-stack', 'v8', 'rce', 'prepareStackTrace'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/Error\.(?:prepareStackTrace|stackTraceLimit)/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|user|payload|value)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Error.prepareStackTrace Pollution — V8 RCE Vector',
          message: 'Error.prepareStackTrace at line ' + ln + ' set by user input. V8 invokes this function with CallSite objects; attacker can execute arbitrary code whenever .stack is accessed.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 95,
          remediation: 'Never expose Error.prepareStackTrace to user control. Remove any Object.assign/merge that touches Error properties.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-1321',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-017 — URL/URLSearchParams prototype pollution ───────────── */
export class URLPrototypePollutionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-017',
    name: 'Prototype Pollution via URL Constructor / URLSearchParams',
    description: 'Detects URLSearchParams used with user-controlled URL that can set __proto__ as a search param key',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-1321',
    owasp: 'A04:2021',
    techniqueNumber: 78,
    pillar: 1,
    tags: ['prototype-pollution', 'url', 'urlsearchparams', 'querystring'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/new\s+(?:URL|URLSearchParams)\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|url|href|link)\b/i.test(lines[i])) continue;
        const snippet = lines.slice(i, i + 3).join(' ');
        if (!/(?:entries|forEach|for\s*\(|spread|Object\.assign|reduce|fromEntries|params\.get)/.test(snippet)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Prototype Pollution via URL Constructor / URLSearchParams',
          message: 'URLSearchParams at line ' + ln + ' from user URL iterated into object. Param key "__proto__" or "constructor" sets prototype. new URL("http://x?a=__proto__").searchParams.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
          remediation: 'Filter search param keys before converting to objects. Strip __proto__, constructor, prototype keys.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-1321',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-018 — Proxy-based prototype pollution bypass ───────────── */
export class ProxyPrototypeBypassRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-018',
    name: 'Proxy-based Prototype Pollution Filter Bypass',
    description: 'Detects Proxy wrapping objects to bypass __proto__ filters in merge/clone operations',
    category: 'security-memory',
    severity: 'critical',
    cwe: 'CWE-1321',
    owasp: 'A04:2021',
    techniqueNumber: 79,
    pillar: 1,
    tags: ['prototype-pollution', 'proxy', 'filter-bypass'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/new\s+Proxy\s*\(/.test(lines[i])) continue;
        if (!/has\s*:|set\s*:|get\s*:|ownKeys\s*:|getPrototypeOf\s*:/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|payload|obj|target)\b/i.test(lines[i])) continue;
        const hasFilterBypass = lines.slice(i, i + 8).some(l => /__proto__|constructor|prototype/.test(l) && /return\s+true|Reflect\.|trap/.test(l));
        if (hasFilterBypass) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Proxy-based Prototype Pollution Filter Bypass',
            message: 'Proxy at line ' + ln + + ' wrapping user input intercepts has/set traps. Can bypass __proto__ filters by intercepting property checks.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 88,
            remediation: 'Check Proxy trap implementations for __proto__/constructor return values. Proxy has traps that lie about property existence can defeat filter logic.',
            owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-1321',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-019 — RegExp.prototype pollution ───────────── */
export class RegExpPrototypePollutionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-019',
    name: 'Prototype Pollution via RegExp.prototype (Input Validation Bypass)',
    description: 'Detects user input polluting RegExp.prototype properties (dotAll, flags, source, exec) to bypass regex validation',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-1321',
    owasp: 'A04:2021',
    techniqueNumber: 80,
    pillar: 1,
    tags: ['prototype-pollution', 'regexp', 'validation-bypass'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/RegExp\.prototype|\.prototype\.(?:exec|test|source|flags|dotAll|unicode|sticky)/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|user|payload|value)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'RegExp.prototype Pollution — Input Validation Bypass',
          message: 'RegExp.prototype property at line ' + ln + ' set by user input. Changes behavior of ALL regex operations; .test() and .exec() can be hijacked to always return true.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 90,
          remediation: 'Object.freeze(RegExp.prototype) in production. Never merge user data onto RegExp.prototype.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-1321',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-020 — Array flatten pollution ───────────── */
export class ArrayFlattenPollutionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-020',
    name: 'Prototype Pollution via Array.flat() / flatMap() Spread',
    description: 'Detects spread of flattened arrays from user input into object literals enabling prototype pollution',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-1321',
    owasp: 'A04:2021',
    techniqueNumber: 83,
    pillar: 1,
    tags: ['prototype-pollution', 'array-flatten', 'spread'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.flat\s*\(|\.flatMap\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|payload)\b/i.test(lines[i])) continue;
        const hasSpreadIntoObject = lines.slice(i, i + 5).some(l => /\{.*\.\.\./.test(l) || /Object\.assign|Object\.fromEntries/.test(l));
        if (!hasSpreadIntoObject) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Prototype Pollution via Array.flat() Spread into Object',
          message: 'Array.flat() at line ' + ln + ' from user input spread into object. Flattened[0] can be {__proto__: {polluted: true}} spreading into target.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          remediation: 'Do not spread user-flattened arrays into objects. Validate each element before spread.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-1321',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-021 — Deserialization via msgpack/bson/cbor ───────────── */
export class BinaryDeserializationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-021',
    name: 'Insecure Binary Deserialization (msgpack/bson/cbor) — __proto__ Injection',
    description: 'Detects msgpack/bson/cbor deserialization on user-controlled input without schema validation',
    category: 'security-memory',
    severity: 'critical',
    cwe: 'CWE-502',
    owasp: 'A08:2021',
    techniqueNumber: 96,
    pillar: 1,
    tags: ['deserialization', 'msgpack', 'bson', 'cbor', 'binary'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:msgpack|@msgpack|bson|cbor|protocol-buffers|protobuf|encode|decode|serialize|deserialize|pack|unpack)\s*\(/.test(lines[i])) continue;
        if (!/\.(?:decode|deserialize|unpack|parse)\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|payload|buffer|binary)\b/i.test(lines[i])) continue;
        if (/(?:schema|validate|parse|assert|strict|verify)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Insecure Binary Deserialization — __proto__ via msgpack/bson/cbor',
          message: 'Binary deserialization at line ' + ln + ' on HTTP input. msgpack/bson/cbor encode __proto__/constructor keys; reconstructed objects pollute prototypes.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 88,
          remediation: 'Use schema validation before deserializing. Avoid binary formats with user input. JSON.parse with reviver is safer.',
          owaspMapping: 'A08:2021-Software and Data Integrity Failures', cweMapping: 'CWE-502',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-022 — Deserialization via JNDI/LDAP lookup ───────────── */
export class LDAPDeserializationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-022',
    name: 'Insecure Deserialization via LDAP/JNDI Lookup Injection',
    description: 'Detects user-controlled LDAP DN or filter flowing into ldapjs search/bind without sanitization',
    category: 'security-memory',
    severity: 'critical',
    cwe: 'CWE-90',
    owasp: 'A03:2021',
    techniqueNumber: 97,
    pillar: 1,
    tags: ['deserialization', 'ldap', 'jndi', 'injection'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/ldapjs|ldap\.|ActiveDirectory|activedirectory2|passport-ldapauth/i.test(lines[i])) continue;
        if (!/\.(?:search|bind|modify|add|del|modifyDN|find|authenticate)\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|user|username|password|dn|filter)\b/i.test(lines[i])) continue;
        if (/escape|sanitize|encode|filterEscape|dnEscape/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'LDAP Injection — Authentication Bypass / Info Leak',
          message: 'LDAP search/bind at line ' + ln + ' with user-controlled filter/DN. Attacker injects (&(uid=admin)(userPassword=*)) to bypass auth or enumerate attributes.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
          remediation: 'Escape LDAP DN and filter special characters. Use parameterized LDAP queries (LDAP injection equivalent of prepared statements).',
          owaspMapping: 'A03:2021-Injection', cweMapping: 'CWE-90',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-023 — Type juggling via loose password comparison ───────────── */
export class LoosePasswordCompareRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-023',
    name: 'Type Juggling via Loose Password/Secret Comparison (== vs ===)',
    description: 'Detects loose equality (==) used for password, API key, or HMAC comparison enabling type coercion bypass',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-843',
    owasp: 'A04:2021',
    techniqueNumber: 103,
    pillar: 1,
    tags: ['type-juggling', 'loose-equality', 'password', 'auth'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/==\s*(?:req\.|body\.|params\.|query\.|user\.|password|secret|token|key|hash|hmac|signature)/i.test(lines[i]) && !/(?:req\.|body\.|params\.|query\.|user\.|password|secret|token|key|hash|hmac|signature)\s*==/i.test(lines[i])) continue;
        if (/===/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Type Juggling via Loose Password/Secret Comparison',
          message: 'Loose equality (==) at line ' + ln + ' for password/secret. In PHP this is catastrophic (0e123 == "hash"), in JS, obj == "string" can coerce via valueOf().',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          remediation: 'Use === or crypto.timingSafeEqual for all security-critical comparisons.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-843',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-024 — Type juggling via Object.is edge cases ───────────── */
export class ObjectIsTypeCoercionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-024',
    name: 'Type Juggling via Object.is() / SameValueZero Edge Cases',
    description: 'Detects -0 vs 0 and NaN comparison edge cases in auth/session logic using Object.is or SameValueZero semantics',
    category: 'security-memory',
    severity: 'medium',
    cwe: 'CWE-843',
    owasp: 'A04:2021',
    techniqueNumber: 104,
    pillar: 1,
    tags: ['type-juggling', 'object-is', 'samevaluezero', 'edge-case'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/Object\.is\s*\(/.test(lines[i]) && !/\.includes\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|user|value|amount|balance|score|count|limit|status)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Type Juggling via Object.is() / SameValueZero Edge Cases',
          message: 'Object.is or .includes at line ' + ln + ' with user input. Object.is(-0, 0) === false, NaN === NaN check differences can bypass auth or balance checks.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Be aware of -0 !== 0 in Object.is. Use strict equality (===) for security checks, not .includes() on Arrays.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-843',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-025 — Mass assignment via MongoDB $set operator ───────────── */
export class MongoSetMassAssignmentRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-025',
    name: 'Mass Assignment via MongoDB $set / $push / $addToSet',
    description: 'Detects MongoDB update operations using user input directly in $set/$push operators',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-915',
    owasp: 'A04:2021',
    techniqueNumber: 84,
    pillar: 1,
    tags: ['mass-assignment', 'mongodb', 'set-operator'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\$set\s*:\s*\{\s*\$\$|\$set\s*:\s*req|\.updateOne\s*\(|\.updateMany\s*\(|\.findOneAndUpdate\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|payload)\b/i.test(lines[i])) continue;
        if (/\$set\s*:\s*\{\s*(role|admin|permissions|isAdmin|isVerified)\s*:/i.test(lines[i]) && /\b(req|body|params|query|input)\b/i.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Mass Assignment via MongoDB $set — Privilege Escalation',
            message: 'MongoDB update at line ' + ln + ' passes user input into $set targeting role/permissions field. Direct privilege escalation.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 90,
            remediation: 'Never pass req.body directly to $set. Whitelist allowed fields and strip sensitive fields server-side.',
            owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-915',
          });
          continue;
        }
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Mass Assignment via MongoDB $set',
          message: 'MongoDB update at line ' + ln + ' uses user input in $set operator. Attacker can set arbitrary fields including role/isAdmin.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          remediation: 'Whitelist fields per operation. Use Zod/Joi schema validation before $set.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-915',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-026 — Arbitrary code execution via vm.runInThisContext ───────────── */
export class VMRunInThisContextRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-026',
    name: 'Arbitrary Code Execution via vm.runInThisContext / vm.compileFunction',
    description: 'Detects vm.runInThisContext, vm.compileFunction, or vm.Script with user-controlled code',
    category: 'security-memory',
    severity: 'critical',
    cwe: 'CWE-94',
    owasp: 'A03:2021',
    techniqueNumber: 100,
    pillar: 1,
    tags: ['rce', 'vm', 'sandbox-escape', 'code-execution'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/vm\.(?:runInThisContext|compileFunction|Script)\s*\(/.test(lines[i]) && !/new\s+vm\.Script/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|code|script|expression|formula|template)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Arbitrary Code Execution via vm.runInThisContext / vm.compileFunction',
          message: 'vm sandbox at line ' + ln + ' executes user-controlled code. runInThisContext has full access to the global scope — not sandboxed.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 92,
          remediation: 'Do not use vm.runInThisContext with user input. If sandboxing is needed, use vm.createContext with frozen prototypes and no global leaks.',
          owaspMapping: 'A03:2021-Injection', cweMapping: 'CWE-94',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-027 — Prototype pollution via prototype chain in reduce ───────────── */
export class ReducePrototypePollutionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-027',
    name: 'Prototype Pollution via Array.reduce Building Objects from User Keys',
    description: 'Detects Array.reduce that builds objects from user-controlled key-value pairs without __proto__ filtering',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-1321',
    owasp: 'A04:2021',
    techniqueNumber: 85,
    pillar: 1,
    tags: ['prototype-pollution', 'reduce', 'accumulator'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.reduce\s*\(/.test(lines[i])) continue;
        if (!/\{.*\}[^)]*\{\s*return\s+.*\[\s*\w+\s*\]\s*=\s*|\{.*return.*\.\.\.acc/.test(lines[i]) && !/acc\[|accumulator\[|obj\[/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|payload|entries|pairs)\b/i.test(lines[i])) continue;
        if (/__proto__|constructor|hasOwnProperty|hasOwn/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Prototype Pollution via Array.reduce Building Object',
          message: 'reduce() at line ' + ln + ' constructs object from user input keys without filtering __proto__/constructor. Key "__proto__" in input pollutes Object.prototype.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 82,
          remediation: 'Filter __proto__ and constructor keys inside the reduce callback. Use Object.fromEntries(Map) with key validation instead.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-1321',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-028 — Mass assignment via Prisma/NestJS spread ───────────── */
export class PrismaMassAssignmentRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-028',
    name: 'Mass Assignment via Prisma ORM / TypeORM Spread of Input',
    description: 'Detects Prisma .create({data: ...req.body}) or TypeORM .save(req.body) without field filtering',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-915',
    owasp: 'A04:2021',
    techniqueNumber: 86,
    pillar: 1,
    tags: ['mass-assignment', 'prisma', 'typeorm', 'orm'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:prisma|db\..*\.create|db\..*\.update|repository\.save|repository\.create|entity\.save|dataSource\.manager\.save)\s*\(/.test(lines[i])) continue;
        if (!/(?:data\s*:|\.save\s*\()\s*(?:req|body|input|dto)/i.test(lines[i]) && !/\.create\(\s*(?:req|body|input|dto)/i.test(lines[i])) continue;
        if (/pick|omit|select|partial|Dto|validator|validate|class-validator|zod|joi/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Mass Assignment via ORM Spread',
          message: 'ORM create/update at line ' + ln + ' spreads entire user input. Attacker sets arbitrary columns including isAdmin, role, balance.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
          remediation: 'Use DTOs/validators (class-validator, Zod) to whitelist fields before ORM operations.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-915',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-029 — Prototype pollution via json5/bfj/flatted parsers ───────────── */
export class ExoticJSONParserPollutionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-029',
    name: 'Prototype Pollution via Exotic JSON Parsers (json5, bfj, flatted, lossless-json)',
    description: 'Detects non-standard JSON parsers (json5, bfj, flatted) that may preserve __proto__ keys unlike JSON.parse',
    category: 'security-memory',
    severity: 'high',
    cwe: 'CWE-1321',
    owasp: 'A08:2021',
    techniqueNumber: 98,
    pillar: 1,
    tags: ['deserialization', 'json5', 'bfj', 'flatted', 'prototype-pollution'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:json5|bfj|flatted|lossless-json|json-bigint|json-stream|stream-json)\s*\.\s*(?:parse|stringify)\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|payload|file|config)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Prototype Pollution via Exotic JSON Parser',
          message: 'Exotic JSON parser at line ' + ln + ' on user input. Unlike JSON.parse, json5 retains __proto__ keys. bfj may not filter constructor keys.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 78,
          remediation: 'Use standard JSON.parse with reviver that drops __proto__/constructor keys. If exotic parser is required, sanitize output.',
          owaspMapping: 'A08:2021-Software and Data Integrity Failures', cweMapping: 'CWE-1321',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-MEM-030 — __defineGetter__ / __defineSetter__ pollution ───────────── */
export class DefineGetterSetterPollutionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-MEM-030',
    name: 'Prototype Pollution via __defineGetter__ / __defineSetter__ Deprecated API',
    description: 'Detects deprecated __defineGetter__ / __defineSetter__ or Object.defineProperty with user-controlled getter code',
    category: 'security-memory',
    severity: 'critical',
    cwe: 'CWE-1321',
    owasp: 'A04:2021',
    techniqueNumber: 86,
    pillar: 1,
    tags: ['prototype-pollution', 'defineGetter', 'defineProperty', 'getter'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/__defineGetter__|__defineSetter__|Object\.defineProperty\s*\(/.test(lines[i])) continue;
        if (!/(?:prototype|__proto__|constructor\.prototype)/i.test(lines[i])) continue;
        if (!/\b(get|set)\s*:\s*(?:function|\(|=>)/i.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|data|user|payload|value|code|fn|fun)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Prototype Pollution via __defineGetter__ / __defineSetter__',
          message: '__defineGetter__/defineProperty at line ' + ln + ' on prototype with user-controlled getter function. Executes arbitrary code when property is accessed.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 93,
          remediation: 'Never use __defineGetter__ on prototypes in modern code. For Object.defineProperty with user data, validate the getter/setter parameter.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-1321',
        });
      }
    }
  }
}
