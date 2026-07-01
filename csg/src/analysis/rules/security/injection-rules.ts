import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta, TaintSlice } from '../engine/types.js';
import { findFunctionCalls, detectUserInputSources, findBinaryExpressionConcat, extractTemplateLiterals, getSnippet } from '../engine/ast-utils.js';

const SANITIZER_SQL_PATTERNS = [
  /\.escape\s*\(/, /escapeId\s*\(/, /placeholder\s*\(/,
  /param\s*\(/, /\?\s*\)/, /\$1/, /\$2/, /:param/,
  /pg\.escape/, /mysql\.escape/, /sql\.template/,
  /prisma\./, /drizzle\./, /queryBuilder/, /knex\./,
  /z\.\w+\(\)\.parse/, /\.safeParse\s*\(/,
];

const REPOSITORY_PATTERNS = [
  /extends\s+\w*Repository/, /@Repository/, /@Entity/,
  /\.save\s*\(/, /\.find\s*\(/, /\.findOne\s*\(/,
  /\.findById\s*\(/, /\.create\s*\(/, /\.update\s*\(/,
  /\.delete\s*\(/, /\.remove\s*\(/, /\.findAndUpdate/,
  /\.aggregate\s*\(/,
];

const RAW_SQL_PATTERNS = [
  /\.query\s*\(/, /\.execute\s*\(/, /\.raw\s*\(/,
  /pool\.query\s*\(/, /client\.query\s*\(/,
  /sequelize\.query\s*\(/, /knex\.raw\s*\(/,
  /db\.\$queryRaw/, /db\.\$executeRaw/,
  /sql`/, /SQL`/,
];

function hasSanitizer(code: string): boolean {
  for (const p of SANITIZER_SQL_PATTERNS) {
    p.lastIndex = 0;
    if (p.test(code)) return true;
  }
  return false;
}

function extractIdentifierReferences(code: string): string[] {
  const refs: string[] = [];
  const idPat = /\b(req\.body|req\.query|req\.params|body\.\w+|params\.\w+|query\.\w+)\b/g;
  let m;
  while ((m = idPat.exec(code)) !== null) {
    refs.push(m[1]);
  }
  return refs;
}

/* ───────────── Rule: SEC-SQLI-001 — Direct SQL injection detection ───────────── */
export class SQLInjectionDirectRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SQLI-001',
    name: 'Direct SQL Injection via Request Input',
    description: 'Detects user-controlled input flowing directly into raw SQL queries without sanitization',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    techniqueNumber: 1,
    pillar: 1,
    tags: ['sqli', 'injection', 'direct', 'raw-sql'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    const userSources = detectUserInputSources(ctx.parsed);

    const sqlCalls = findFunctionCalls(ctx.parsed, (info, args) => {
      const methods = ['query', 'execute', 'raw', '$queryRaw', '$executeRaw'];
      return methods.some(m => info.methodName === m || info.fullName.endsWith('.' + m));
    });

    for (const call of sqlCalls) {
      const code = JSON.stringify(call.args);
      const hasSan = SANITIZER_SQL_PATTERNS.some(p => { p.lastIndex = 0; return p.test(code); });

      const refs = userSources
        .filter(s => s.file === call.file && Math.abs(s.line - call.line) < 10)
        .map(s => s.source);
      const uniqueRefs = [...new Set(refs)];
      if (uniqueRefs.length === 0) continue;

      const hasInterpolation = extractTemplateLiterals(ctx.parsed, (quasis) =>
        quasis.some(q => /SELECT|INSERT|UPDATE|DELETE/i.test(q))
      ).some(t => t.file === call.file && Math.abs(t.line - call.line) < 10);

      const hasConcat = findBinaryExpressionConcat(ctx.parsed, (parts) =>
        parts.some(p => /SELECT|INSERT|UPDATE|DELETE/i.test(p))
      ).some(c => c.file === call.file && Math.abs(c.line - call.line) < 10);

      if (!hasInterpolation && !hasConcat) continue;

      const confidence = hasSan ? 40 : 90;

      ctx.setTaint(`sink:${call.file}:${call.line}`, [{
        variable: `sink:${call.file}:${call.line}`,
        sources: uniqueRefs,
        sinks: [call.callee],
        sanitizers: hasSan ? ['detected'] : [],
        file: call.file,
        line: call.line,
        confidence,
        hopCount: 0,
      }]);

      this.emit(ctx, {
        title: hasSan
          ? 'SQL Injection with Partial Sanitization — Bypass Possible'
          : 'Direct SQL Injection — Unsanitized User Input in Raw Query',
        message: `User-controlled input (${uniqueRefs.join(', ')}) flows into raw SQL query via ${call.callee} without parameterized binding at ${call.file}:${call.line}`,
        file: call.file,
        line: call.line,
        snippet: call.callee,
        confidence,
        remediation: 'Replace string interpolation with parameterized queries: use ? placeholders, $1, $2 syntax, or an ORM query builder.',
        autoFixCode: `// Before:\nconst result = await db.query(\`SELECT * FROM users WHERE id = \${req.params.id}\`);\n// After:\nconst result = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);`,
        owaspMapping: 'A03:2021-Injection',
        cweMapping: 'CWE-89',
      });
    }
  }
}

/* ───────────── Rule: SEC-SQLI-002 — Multi-hop DTO → Repository → SQL ───────────── */
export class SQLInjectionMultiHopRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SQLI-002',
    name: 'Multi-Hop SQL Injection via DTO-Repository Layer',
    description: 'Traces taint from req.body through DTO validation, into Repository layer, then to raw SQL execution across hop boundaries',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    techniqueNumber: 2,
    pillar: 1,
    tags: ['sqli', 'injection', 'multi-hop', 'dto', 'repository'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      // Phase 1: Detect DTO/repository boundary passage
      let dtoParams: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const refs = extractIdentifierReferences(line);
        if (refs.length > 0) {
          dtoParams.push(...refs);
          for (const ref of refs) {
            ctx.setTaint(`${p.file}:DTO:${ref}`, [{
              variable: ref,
              sources: [ref],
              sinks: [],
              sanitizers: [],
              file: p.file,
              line: i + 1,
              confidence: 80,
              hopCount: 0,
            }]);
          }
        }
      }

      if (dtoParams.length === 0) continue;

      // Phase 2: Track into repository patterns
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const repoPat of REPOSITORY_PATTERNS) {
          repoPat.lastIndex = 0;
          if (!repoPat.test(line)) continue;

          const repoCallLine = i + 1;
          const dtoInRepo = dtoParams.some(d => line.includes(d.split('.').pop() || d));

          if (!dtoInRepo) continue;

          ctx.propagateTaint(`${p.file}:DTO:${dtoParams[0]}`, `${p.file}:REPO:${repoCallLine}`);

          // Phase 3: Check if repo call flows into raw SQL
          const subsequentCode = lines.slice(i, i + 30).join('\n');
          for (const rawPat of RAW_SQL_PATTERNS) {
            rawPat.lastIndex = 0;
            if (!rawPat.test(subsequentCode)) continue;

            const hasSan = hasSanitizer(subsequentCode);
            const confidence = hasSan ? 35 : 85;

            this.emit(ctx, {
              title: `Multi-Hop SQL Injection — DTO → Repository → Raw SQL`,
              message: `Taint path: User input (${dtoParams.join(', ')}) → DTO layer → Repository call at line ${repoCallLine} → Raw SQL sink "${rawPat.source.slice(0, 30)}". Data crosses 3 structural boundaries without parameterization.`,
              file: p.file,
              line: repoCallLine,
              snippet: subsequentCode.slice(0, 250),
              confidence,
              taintPath: ['req.body/req.query', 'DTO Object', 'Repository Method', 'Raw SQL Query'],
              remediation: 'Apply parameterized queries at the repository layer. Use an ORM with built-in SQL injection protection (Prisma, Drizzle, TypeORM).',
              autoFixCode: `// Before:\nconst users = await userRepo.find({ where: { id: req.params.id } });\nawait db.query(\`SELECT * FROM users WHERE id = '\${users[0].id}'\`);\n// After:\nconst user = await userRepo.findOne({ where: { id: req.params.id } });`,
              owaspMapping: 'A03:2021-Injection',
              cweMapping: 'CWE-89',
            });
          }
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-SQLI-003 — Second-order SQL injection ───────────── */
export class SQLInjectionSecondOrderRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SQLI-003',
    name: 'Second-Order SQL Injection',
    description: 'Detects stored data retrieved from DB then used unsafely in subsequent SQL queries',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    techniqueNumber: 3,
    pillar: 1,
    tags: ['sqli', 'second-order', 'stored-injection'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      // Find DB reads that store into variables
      const dbReads: Array<{ varName: string; line: number }> = [];
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/(?:const|let|var)\s+(\w+)\s*=\s*.*(?:\.find(?:One|ById)?|\.query|\.execute|\.raw|\.select)\s*\(/);
        if (m) dbReads.push({ varName: m[1], line: i + 1 });
      }

      if (dbReads.length === 0) return;

      // Check if any DB-read variable is used in a second SQL query
      for (const read of dbReads) {
        for (let i = read.line; i < lines.length && i < read.line + 50; i++) {
          for (const rawPat of RAW_SQL_PATTERNS) {
            rawPat.lastIndex = 0;
            if (!rawPat.test(lines[i])) continue;

            const hasSan = hasSanitizer(lines[i]);
            if (lines[i].includes(read.varName)) {
              this.emit(ctx, {
                title: 'Second-Order SQL Injection — Stored Data Re-Enters Query',
                message: `Variable "${read.varName}" is populated from a DB read at line ${read.line} and subsequently used in a raw SQL query at line ${i + 1}. If stored data contains malicious input, this enables second-order injection.`,
                file: p.file,
                line: i + 1,
                snippet: lines.slice(Math.max(0, i - 2), i + 3).join('\n').slice(0, 300),
                confidence: hasSan ? 30 : 75,
                taintPath: ['User Input', 'DB Write (Store)', 'DB Read (Retrieve)', 'Raw SQL Query'],
                remediation: 'Parameterize ALL SQL queries regardless of data origin. Even data from your own DB can contain stored malicious payloads.',
                owaspMapping: 'A03:2021-Injection',
                cweMapping: 'CWE-89',
              });
            }
          }
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-SQLI-004 — ORM bypass injection ───────────── */
export class SQLInjectionORMBypassRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SQLI-004',
    name: 'ORM Bypass — Raw Query Fallback with User Input',
    description: 'Detects when ORM query builders are bypassed in favor of raw SQL with user-controlled input',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    techniqueNumber: 4,
    pillar: 1,
    tags: ['sqli', 'orm-bypass', 'raw-fallback'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const ormBypass = lines[i].match(/(?:knex|prisma|typeorm|sequelize|drizzle|mongoose)\..*?(?:raw|\$queryRaw|\$executeRaw|sequelize\.query)\s*\(/i);
        if (!ormBypass) continue;

        const refs = extractIdentifierReferences(lines[i]);
        if (refs.length === 0) {
          const varRefs = lines[i].match(/\b(req|body|params|query)\.\w+/g);
          if (!varRefs) continue;
          refs.push(...varRefs);
        }

        if (refs.length === 0) continue;

        const hasSan = hasSanitizer(lines[i]);
        const context = lines.slice(Math.max(0, i - 2), i + 4).join('\n');

        this.emit(ctx, {
          title: 'ORM Bypass — Raw Query Escape Hatch with User Input',
          message: `ORM's raw query method "${ormBypass[1]}.raw()" receives user-controlled data (${refs.join(', ')}). This bypasses ORM-level injection protections.`,
          file: p.file,
          line: i + 1,
          snippet: context.slice(0, 300),
          confidence: hasSan ? 45 : 88,
          taintPath: ['User Input', 'ORM Raw Method', 'SQL Execution'],
          remediation: 'Use the ORM\'s parameterized query API instead of raw escape hatches. Most ORMs support parameter binding in raw queries.',
          autoFixCode: `// Before:\nawait prisma.\$queryRawUnsafe(\`SELECT * FROM users WHERE id = \${req.params.id}\`);\n// After:\nawait prisma.\$queryRaw(\`SELECT * FROM users WHERE id = \${id}\`, req.params.id);`,
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-89',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-SQLI-005 — String concatenation in query builders ───────────── */
export class SQLInjectionConcatRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SQLI-005',
    name: 'SQL Injection via String Concatenation in Query Builder',
    description: 'Detects string concatenation or template literals inside ORM query builder calls (WHERE, ORDER BY, LIMIT)',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    techniqueNumber: 5,
    pillar: 1,
    tags: ['sqli', 'concatenation', 'query-builder'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const concatPatterns = [
        /\$\{[^}]+\}/, /['"]\s*\+\s*\w/, /\w\s*\+\s*['"]/,
        /where\s*\(\s*`/, /orderBy\s*\(\s*`/, /limit\s*\(\s*`/,
        /\.where\(\s*['"]/,
      ];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isQueryBuilder = /\b(where|orderBy|groupBy|having|limit|offset)\s*\(/.test(line);
        if (!isQueryBuilder) continue;

        for (const cp of concatPatterns) {
          cp.lastIndex = 0;
          if (!cp.test(line)) continue;

          const refs = extractIdentifierReferences(line);
          if (refs.length === 0 && !/\b(req|body|params|query)\.\w+/.test(line)) continue;

          this.emit(ctx, {
            title: 'SQL Injection via String Concatenation in Query Condition',
            message: `String interpolation or concatenation detected in query builder call at line ${i + 1}. This bypasses parameterized query protections. Variables: ${refs.join(', ') || 'req.* access'}`,
            file: p.file,
            line: i + 1,
            snippet: line.slice(0, 250),
            confidence: 80,
            remediation: 'Use the query builder\'s object-based filter syntax instead of string interpolation.',
            autoFixCode: `// Before:\nconst users = await db.users.find({ where: \`id = '\${req.params.id}'\` });\n// After:\nconst users = await db.users.find({ where: { id: req.params.id } });`,
            owaspMapping: 'A03:2021-Injection',
            cweMapping: 'CWE-89',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-SQLI-006 — Dynamic WHERE clause construction ───────────── */
export class SQLInjectionDynamicWhereRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SQLI-006',
    name: 'Dynamic WHERE Clause Construction from User Input',
    description: 'Detects building SQL WHERE clauses by concatenating user-controlled filter parameters',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    techniqueNumber: 6,
    pillar: 1,
    tags: ['sqli', 'dynamic-where', 'filter-injection'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes('WHERE') && !line.includes('where')) continue;
        if (!/\b(req|body|params|query|filter|filters)\b/.test(line)) continue;

        const hasConcat = /\$\{|['"]\s*\+/.test(line);
        if (!hasConcat) continue;

        this.emit(ctx, {
          title: 'Dynamic WHERE Clause Construction — SQL Injection Vector',
          message: `WHERE clause is constructed by concatenating user-controlled filter data at line ${i + 1}. Attacker can inject arbitrary SQL by crafting filter values.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 82,
          remediation: 'Use an allowlist approach for filterable columns and parameterized values. Never concatenate user input into WHERE clause strings.',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-89',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-SQLI-007 — ORDER BY injection ───────────── */
export class SQLInjectionOrderByRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SQLI-007',
    name: 'SQL Injection via ORDER BY Clause with User Input',
    description: 'Detects when user-controlled input is used in ORDER BY clauses, enabling blind SQL injection',
    category: 'security-injection',
    severity: 'medium',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    techniqueNumber: 7,
    pillar: 1,
    tags: ['sqli', 'order-by', 'blind-injection'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].match(/order\s*By|ORDER\s*BY|orderBy/i)) continue;
        if (!/\b(req|body|params|query|sort|order)\b/.test(lines[i])) continue;

        this.emit(ctx, {
          title: 'ORDER BY Injection — User-Controlled Sort Column',
          message: `ORDER BY clause at line ${i + 1} accepts user-controlled input. ORDER BY cannot be parameterized, making it a blind SQL injection vector.`,
          file: p.file,
          line: i + 1,
          snippet: lines[i].slice(0, 200),
          confidence: 75,
          remediation: 'Use a strict allowlist of valid column names for ORDER BY. Never pass raw user input into ORDER BY clauses.',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-89',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-SQLI-008 — IN clause injection ───────────── */
export class SQLInjectionInClauseRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SQLI-008',
    name: 'SQL Injection via IN Clause Array Splice',
    description: 'Detects when user input is spliced into SQL IN clauses without proper array parameterization',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    techniqueNumber: 8,
    pillar: 1,
    tags: ['sqli', 'in-clause', 'array-injection'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].match(/IN\s*\(|\.in\s*\(/i)) continue;
        const hasJoin = lines[i].match(/\.(?:join|map|split)\s*\(/);
        if (!hasJoin) continue;
        if (!/\b(req|body|params|query|ids|items)\b/.test(lines[i])) continue;

        this.emit(ctx, {
          title: 'IN Clause Injection — Array Join with User Input',
          message: `SQL IN clause at line ${i + 1} uses array joining with user-controlled data. Attacker can inject via array elements.`,
          file: p.file,
          line: i + 1,
          snippet: lines[i].slice(0, 250),
          confidence: 78,
          remediation: 'Use parameterized array syntax: `WHERE id = ANY($1)` for PostgreSQL or generate positional parameters for each array element.',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-89',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-SQLI-009 — LIKE clause wildcard injection ───────────── */
export class SQLInjectionLikeClauseRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SQLI-009',
    name: 'LIKE Clause Injection — Wildcard and Pattern Manipulation',
    description: 'Detects when user input is used in LIKE clauses allowing attacker-controlled wildcard patterns',
    category: 'security-injection',
    severity: 'medium',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    techniqueNumber: 9,
    pillar: 1,
    tags: ['sqli', 'like-clause', 'wildcard-injection'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].match(/LIKE|ILIKE|~\*/i)) continue;
        if (!/\b(req|body|params|query|search|filter)\b/.test(lines[i])) continue;

        const hasSan = /escape|sanitize|replace\s*\([^)]*[%_]/.test(lines[i]);
        const confidence = hasSan ? 40 : 70;

        this.emit(ctx, {
          title: 'LIKE Clause Injection — User-Controlled Search Pattern',
          message: `LIKE clause at line ${i + 1} uses user-controlled search input without escaping wildcard characters (% and _). Attacker can trigger expensive full-table scans or extract data via blind pattern matching.`,
          file: p.file,
          line: i + 1,
          snippet: lines[i].slice(0, 250),
          confidence,
          remediation: 'Escape % and _ characters in user input before using in LIKE clauses, or use full-text search instead of LIKE.',
          autoFixCode: `// Before:\nconst results = await db.query('SELECT * FROM products WHERE name LIKE $1', [\`%\${searchTerm}%\`]);\n// After:\nconst escaped = searchTerm.replace(/[%_]/g, '\\\\$&');\nconst results = await db.query('SELECT * FROM products WHERE name LIKE $1', [\`%\${escaped}%\`]);`,
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-89',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-SQLI-010 — Batch query injection ───────────── */
export class SQLInjectionBatchQueryRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-SQLI-010',
    name: 'Batch Query Injection — Multiple Statements in One Execute',
    description: 'Detects when raw SQL execution accepts multiple statements and user input, enabling stacked query injection',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-89',
    owasp: 'A03:2021',
    techniqueNumber: 10,
    pillar: 1,
    tags: ['sqli', 'batch-query', 'stacked-injection'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const hasMultipleStmts = /;\s*SELECT|;\s*INSERT|;\s*UPDATE|;\s*DELETE|;\s*DROP|;\s*CREATE/i.test(line);
        if (!hasMultipleStmts) continue;

        const refs = extractIdentifierReferences(line);
        if (refs.length === 0) continue;

        this.emit(ctx, {
          title: 'Batch/Stacked Query Injection — Multiple Statements with User Input',
          message: `Raw SQL execution at line ${i + 1} contains multiple statements with user-controlled input (${refs.join(', ')}). Enables stacked query injection (classic SQL injection).`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 92,
          remediation: 'Disable multiple statement execution in database driver config. Use parameterized queries for all input.',
          autoFixCode: `// PostgreSQL: Use pg-pool with statement limiting:\nconst pool = new Pool({ ...config, statement_timeout: 5000 });\n// Always use parameterized: db.query('SELECT * FROM users WHERE id = $1', [id]);`,
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-89',
        });
      }
    }
  }
}
