import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';

const NOSQL_OPERATORS = ['$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin', '$or', '$and', '$not', '$nor', '$where', '$regex', '$exists', '$type', '$expr', '$jsonSchema', '$mod', '$text', '$search'];

const NOSQL_SANITIZERS = [
  /z\.object/, /\.safeParse/, /\.parse/, /Joi\./,
  /class-validator/, /validate\s*\(/, /sanitize/,
  /allowlist/, /denylist/, /stripUnknown/,
];

function hasNoSqlSanitizer(code: string): boolean {
  for (const p of NOSQL_SANITIZERS) {
    p.lastIndex = 0;
    if (p.test(code)) return true;
  }
  return false;
}

function extractDynamicKeys(code: string): string[] {
  const keys: string[] = [];
  const patterns = [
    /\{\s*\[([^\]]+)\]\s*:/g,
    /\[\s*['"]?\$(?:gt|gte|lt|lte|ne|in|nin|or|and|not|nor|where|regex|exists)\b/g,
    /\.set\s*\(\s*['"][$]\w+/g,
    /find\([^)]*\$\w+/g,
  ];
  for (const pat of patterns) {
    pat.lastIndex = 0;
    let m;
    while ((m = pat.exec(code)) !== null) {
      keys.push(m[0].slice(0, 40));
    }
  }
  return keys;
}

/* ───────────── Rule: SEC-NOSQL-001 — MongoDB Operator Injection ───────────── */
export class NoSQLOperatorInjectionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NOSQL-001',
    name: 'NoSQL Operator Injection — Dynamic Query Keys from User Input',
    description: 'Detects when user-controlled input is used as dynamic keys in MongoDB queries, enabling operator injection',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-943',
    owasp: 'A03:2021',
    techniqueNumber: 11,
    pillar: 1,
    tags: ['nosql', 'mongodb', 'operator-injection', 'dynamic-key'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const lineText = lines[i];
        const hasDynamicKey = /\{\s*\[/.test(lineText) || /\b(?:req\.body|body\.\w+|req\.query\.\w+)\s*\[/.test(lineText);
        if (!hasDynamicKey) continue;

        const isMongoContext = /\.(?:find|findOne|findByIdAndUpdate|updateOne|deleteOne|aggregate|insertOne)\s*\(/.test(lineText);
        if (!isMongoContext) continue;

        const hasSan = hasNoSqlSanitizer(lineText);
        const keys = extractDynamicKeys(lineText);
        const confidence = hasSan ? 40 : 88;

        ctx.setTaint(`nosql:sink:${p.file}:${i + 1}`, [{
          variable: `nosql_sink_${i}`,
          sources: ['req.body', 'user_input'],
          sinks: ['MongoDB_operator'],
          sanitizers: hasSan ? ['schema_validation'] : [],
          file: p.file,
          line: i + 1,
          confidence,
          hopCount: 0,
        }]);

        this.emit(ctx, {
          title: 'NoSQL Operator Injection — User Input as MongoDB Query Key',
          message: `Dynamic keys detected in MongoDB query at line ${i + 1}. User-controlled input flowing into computed property keys enables NoSQL operator injection (e.g., {"$gt": ""} bypass).`,
          file: p.file,
          line: i + 1,
          snippet: lineText.slice(0, 300),
          confidence,
          taintPath: ['req.body/req.query', 'Dynamic Key', 'MongoDB Query'],
          remediation: 'Use a schema validation library (Zod, Joi) to strip unknown keys and reject operator-containing fields before passing to MongoDB.',
          autoFixCode: `// Before:\nconst user = await User.find({ [req.body.field]: req.body.value });\n// After:\nconst schema = z.object({ username: z.string() });\nconst safe = schema.parse(req.body);\nconst user = await User.find({ username: safe.username });`,
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-943',
          exploitPayload: '{"username": {"$gt": ""}}',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NOSQL-002 — Auth Bypass via NoSQL ───────────── */
export class NoSQLAuthBypassRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NOSQL-002',
    name: 'NoSQL Authentication Bypass via Operator Injection',
    description: 'Detects login/authentication MongoDB queries where user input can inject operators to bypass credential checks',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-943',
    owasp: 'A03:2021',
    techniqueNumber: 12,
    pillar: 1,
    tags: ['nosql', 'auth-bypass', 'login-bypass'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const authPatterns = [/login/, /signin/, /authenticate/, /auth/, /loginUser/i];

      for (let i = 0; i < lines.length; i++) {
        const isAuthContext = authPatterns.some(ap => ap.test(lines[i]));
        if (!isAuthContext) continue;

        const mongoCall = lines[i].match(/\.(?:findOne|find)\s*\(\s*\{/);
        if (!mongoCall) continue;

        const hasBodyRef = /\b(password|passwd|pwd|token|secret)\s*:\s*(?:req\.body\.\w+|body\.\w+)/.test(lines[i]);
        if (!hasBodyRef) continue;

        const hasSan = hasNoSqlSanitizer(lines[i]);
        const confidence = hasSan ? 50 : 92;

        this.emit(ctx, {
          title: 'NoSQL Authentication Bypass — Credential Query with User Input',
          message: `Authentication query at line ${i + 1} passes user input directly to MongoDB findOne. Attacker can bypass login by injecting {"$gt": ""} as password.`,
          file: p.file,
          line: i + 1,
          snippet: lines.slice(Math.max(0, i - 1), i + 4).join('\n').slice(0, 300),
          confidence,
          evidence: 'User-controlled password field flows directly into MongoDB query predicate without schema validation.',
          exploitPayload: 'POST /login {"email": "admin@test.com", "password": {"$gt": ""}}',
          taintPath: ['req.body.password', 'MongoDB Query Predicate', 'Auth Gate'],
          remediation: 'Validate credentials server-side after querying the user record. Never pass raw user input as query predicates.',
          autoFixCode: `// Before:\nconst user = await User.findOne({ email: req.body.email, password: req.body.password });\n// After:\nconst user = await User.findOne({ email: req.body.email });\nif (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) { throw new AuthError(); }`,
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-943',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NOSQL-003 — NoSQL $where injection ───────────── */
export class NoSQLWhereInjectionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NOSQL-003',
    name: 'NoSQL $where JavaScript Injection',
    description: 'Detects $where operator usage with user-controlled input enabling server-side JavaScript injection in MongoDB',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-943',
    owasp: 'A03:2021',
    techniqueNumber: 13,
    pillar: 1,
    tags: ['nosql', 'where-injection', 'javascript-injection'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].match(/\$where\b/i)) continue;
        if (!/\b(req|body|params|query|input)\b/.test(lines[i])) continue;

        this.emit(ctx, {
          title: 'NoSQL $where JavaScript Injection — Server-Side Code Execution',
          message: `$where operator at line ${i + 1} uses user-controlled input. Allows attacker to execute arbitrary JavaScript on the MongoDB server.`,
          file: p.file,
          line: i + 1,
          snippet: lines[i].slice(0, 300),
          confidence: 90,
          evidence: '$where accepts JavaScript expressions; user input creates code injection vector.',
          taintPath: ['User Input', '$where Operator', 'MongoDB JS Execution'],
          remediation: 'Avoid $where entirely. Use MongoDB aggregation pipeline with $expr instead.',
          exploitPayload: '{"$where": "this.password.startsWith(\"a\") || sleep(5000) || true"}',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-943',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NOSQL-004 — NoSQL $regex injection ───────────── */
export class NoSQLRegexInjectionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NOSQL-004',
    name: 'NoSQL $regex Injection — Blind Data Extraction',
    description: 'Detects $regex operator with user input enabling blind data extraction via regex patterns',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-943',
    owasp: 'A03:2021',
    techniqueNumber: 14,
    pillar: 1,
    tags: ['nosql', 'regex-injection', 'blind-extraction'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].match(/\$regex\b/i)) continue;
        if (!/\b(req|body|params|query|search|filter)\b/.test(lines[i])) continue;

        const isRegexObj = /\{\s*\$regex/.test(lines[i]) || /\$regex\s*:\s*\w/.test(lines[i]);
        if (!isRegexObj) continue;

        this.emit(ctx, {
          title: 'NoSQL $regex Injection — Blind Data Extraction Vector',
          message: `$regex operator at line ${i + 1} accepts user-controlled input. Attacker can use boolean-based regex queries to extract data character by character.`,
          file: p.file,
          line: i + 1,
          snippet: lines[i].slice(0, 300),
          confidence: 82,
          evidence: '$regex with user input enables blind injection similar to SQL blind injection.',
          taintPath: ['User Input', '$regex Operator', 'Pattern Matching'],
          remediation: 'Use MongoDB text indexes with $text instead of $regex for search. Apply strict length limits if $regex is required.',
          exploitPayload: '{"username": {"$regex": "^a.*"}} → true/false reveals first character',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-943',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NOSQL-005 — NoSQL Mass Assignment ───────────── */
export class NoSQLMassAssignmentRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NOSQL-005',
    name: 'NoSQL Mass Assignment — Unfiltered Update Fields',
    description: 'Detects MongoDB update operations accepting all fields from req.body without field allowlisting',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-943',
    owasp: 'A03:2021',
    techniqueNumber: 15,
    pillar: 1,
    tags: ['nosql', 'mass-assignment', 'update-injection'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const massAssign = lines[i].match(/\.(?:updateOne|findByIdAndUpdate|findOneAndUpdate|updateMany|replaceOne)\s*\(\s*(?:req\.body|body)/);
        if (!massAssign) continue;

        const hasSan = /pick|omit|select|whitelist|allowlist|strip|schema\.parse/.test(lines[i]);
        this.emit(ctx, {
          title: 'NoSQL Mass Assignment — Unfiltered Update from req.body',
          message: `MongoDB update at line ${i + 1} passes entire req.body to update document. Attacker can escalate privileges by setting "role": "admin" or "$unset": {"password": ""}.`,
          file: p.file,
          line: i + 1,
          snippet: lines.slice(Math.max(0, i - 1), i + 4).join('\n').slice(0, 300),
          confidence: hasSan ? 30 : 88,
          taintPath: ['req.body', 'Update Document', 'MongoDB Update'],
          remediation: 'Use Zod/Joi to pick only allowed fields before passing to update. Never pass req.body directly.',
          autoFixCode: `// Before:\nawait User.findByIdAndUpdate(id, req.body);\n// After:\nconst schema = z.object({ name: z.string().optional(), email: z.string().optional() });\nconst safe = schema.parse(req.body);\nawait User.findByIdAndUpdate(id, safe);`,
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-943',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NOSQL-006 — $expr injection ───────────── */
export class NoSQLExprInjectionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NOSQL-006',
    name: 'NoSQL $expr Injection',
    description: 'Detects $expr operator allowing attacker-controlled field references',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-943',
    owasp: 'A03:2021',
    techniqueNumber: 16,
    pillar: 1,
    tags: ['nosql', 'expr-injection', 'aggregation'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\$expr\b/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|field)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'NoSQL $expr Injection',
          message: '$expr at line ' + ln + ' uses user-controlled field reference. Enables blind data comparison.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 78,
          taintPath: ['User Input', '$expr', 'Field Comparison'],
          remediation: 'Avoid $expr with user input. Use strict field allowlists.',
          owaspMapping: 'A03:2021-Injection', cweMapping: 'CWE-943',
          exploitPayload: '{"$expr": {"$eq": ["$password", {"$substr": ["$secret",0,1]}]}}',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NOSQL-007 — $function injection ───────────── */
export class NoSQLFunctionInjectionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NOSQL-007',
    name: 'NoSQL $function Injection',
    description: 'Detects $function with user-controlled JavaScript in aggregation',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-943',
    owasp: 'A03:2021',
    techniqueNumber: 17,
    pillar: 1,
    tags: ['nosql', 'function-injection', 'rce'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\$function\b|\$accumulator\b/i.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|code|fn)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'NoSQL $function Injection - JS Code Execution',
          message: '$function at line ' + ln + ' accepts user JS. Full RCE on MongoDB server.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 92,
          taintPath: ['User Input', '$function', 'MongoDB JS Engine', 'RCE'],
          remediation: 'Never pass user JavaScript to $function. Use native aggregation operators.',
          owaspMapping: 'A03:2021-Injection', cweMapping: 'CWE-943',
          exploitPayload: '{"$function": {"body": "sleep(5000);return true;", "args":[], "lang":"js"}}',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NOSQL-008 — Aggregation pipeline injection ───────────── */
export class NoSQLAggregationPipelineRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NOSQL-008',
    name: 'Aggregation Pipeline Injection',
    description: 'Detects user input spliced into MongoDB aggregation pipeline stages',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-943',
    owasp: 'A03:2021',
    techniqueNumber: 18,
    pillar: 1,
    tags: ['nosql', 'aggregation', 'pipeline-injection'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.aggregate\s*\(/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|pipeline)\b/i.test(lines[i])) continue;
        if (!/\$\{[^}]+\}|\.push\s*\(|\.concat\s*\(/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Aggregation Pipeline Injection',
          message: 'User input in aggregate() pipeline at line ' + ln + '. Attacker modifies pipeline logic.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 82,
          taintPath: ['User Input', 'Pipeline Stage', 'Aggregation'],
          remediation: 'Use fixed pipeline definitions. Validate pipeline parameters.',
          owaspMapping: 'A03:2021-Injection', cweMapping: 'CWE-943',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NOSQL-009 — $lookup injection ───────────── */
export class NoSQLLookupInjectionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NOSQL-009',
    name: 'NoSQL $lookup Injection',
    description: 'Detects $lookup with user-controlled "from" or "let" fields',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-943',
    owasp: 'A03:2021',
    techniqueNumber: 19,
    pillar: 1,
    tags: ['nosql', 'lookup-injection', 'cross-collection'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\$lookup\b/.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|from|collection)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'NoSQL $lookup Injection',
          message: '$lookup at line ' + ln + ' uses user-controlled "from"/"let". Cross-collection extraction.',
          file: p.file, line: ln, snippet: lines.slice(Math.max(0,i-1),i+3).join('\n').slice(0,300), confidence: 75,
          taintPath: ['User Input', '$lookup', 'Cross-Collection Access'],
          remediation: 'Hardcode $lookup collection names.',
          owaspMapping: 'A03:2021-Injection', cweMapping: 'CWE-943',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-NOSQL-010 — Schema validation bypass ───────────── */
export class NoSQLSchemaBypassRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-NOSQL-010',
    name: 'Schema Validation Bypass',
    description: 'Detects $jsonSchema with user input bypassing validation',
    category: 'security-injection',
    severity: 'medium',
    cwe: 'CWE-943',
    owasp: 'A03:2021',
    techniqueNumber: 20,
    pillar: 1,
    tags: ['nosql', 'schema-bypass', 'jsonSchema'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\$jsonSchema\b/i.test(lines[i])) continue;
        if (!/\b(req|body|params|query|input|schema|validation)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: '$jsonSchema Validation Bypass',
          message: '$jsonSchema at line ' + ln + ' uses user input. Attacker bypasses schema validation.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Define validation server-side, not from user input.',
          owaspMapping: 'A03:2021-Injection', cweMapping: 'CWE-943',
        });
      }
    }
  }
}
