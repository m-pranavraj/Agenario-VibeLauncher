import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';

/* ───────────── Rule: PERF-ALGO-001 — N+1 Query in .map() loop ───────────── */
export class NPlusOneQueryRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-001',
    name: 'N+1 Query Explosion — ORM Query Inside Loop',
    description: 'Detects ORM query calls (find, findOne, findByPk) nested inside .map(), .forEach(), or for loops',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 1,
    pillar: 2,
    tags: ['performance', 'n-plus-one', 'orm', 'loop'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      let inLoop = false;
      let loopLine = 0;
      let loopType = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const loopStart = line.match(/\.(?:map|forEach|filter|reduce)\s*\(|for\s*\(|for\s+.*of|for\s+.*in|while\s*\(/);
        if (loopStart) {
          inLoop = true;
          loopLine = i + 1;
          loopType = loopStart[0].trim();
          continue;
        }

        if (inLoop) {
          const queryCall = line.match(/\.(?:find|findOne|findByPk|findOneBy|findById|get\b|load\b|count|findFirst|findMany|findUnique)\s*\(/i);
          if (queryCall) {
            this.emit(ctx, {
              title: 'N+1 Query Explosion — DB Query Inside Loop',
              message: `Database query "${queryCall[0].trim()}" detected inside ${loopType} loop (started line ${loopLine}) at line ${i + 1}. This executes one query per iteration, causing N+1 performance disaster.`,
              file: p.file,
              line: i + 1,
              snippet: lines.slice(Math.max(0, i - 1), i + 2).join('\n').slice(0, 250),
              confidence: 88,
              remediation: 'Use eager loading (include/relations) or batch queries with IN clause outside the loop. Reduce N round-trips to 1.',
              autoFixCode: `// Before:\nconst users = await getUsers();\nconst posts = users.map(u => db.post.find({ userId: u.id }));\n// After:\nconst users = await getUsers();\nconst posts = await db.post.findMany({ where: { userId: { in: users.map(u => u.id) } } });`,
              owaspMapping: 'A04:2021-Insecure Design',
              cweMapping: 'CWE-770',
            });
          }
          if (line.match(/^\s*\)/)) inLoop = false;
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-002 — Missing database index ───────────── */
export class MissingIndexRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-002',
    name: 'Missing Database Index — ORDER BY / WHERE on Non-Indexed Column',
    description: 'Cross-references ORDER BY and WHERE clauses with schema definitions to detect missing indexes',
    category: 'performance-algorithmic',
    severity: 'medium',
    cwe: 'CWE-770',
    techniqueNumber: 21,
    pillar: 2,
    tags: ['performance', 'database', 'index', 'slow-query'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      const orderByFields: Set<string> = new Set();
      const whereFields: Set<string> = new Set();
      const schemaFields: Set<string> = new Set();
      const indexedFields: Set<string> = new Set();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const obMatch = line.match(/orderBy\s*:\s*\{?\s*(\w+)/);
        if (obMatch) orderByFields.add(obMatch[1]);

        const whereMatch = line.match(/where\s*:\s*\{?\s*(\w+)/);
        if (whereMatch) whereFields.add(whereMatch[1]);

        const schemaMatch = line.match(/(\w+)\s*:\s*(?:Int|String|DateTime|Float|Boolean|BigInt|Decimal)/);
        if (schemaMatch) schemaFields.add(schemaMatch[1]);

        if (line.match(/@@index|@index|index\s*\(|indexed\s*\(/i)) {
          const idxMatch = line.match(/\(\s*['"]?(\w+)['"]?\s*\)/);
          if (idxMatch) indexedFields.add(idxMatch[1]);
        }
      }

      for (const field of orderByFields) {
        if (schemaFields.has(field) && !indexedFields.has(field)) {
          this.emit(ctx, {
            title: 'Missing Database Index — ORDER BY on Non-Indexed Field',
            message: `Field "${field}" is used in ORDER BY but has no index in schema definition. This causes full table sorts on every query.`,
            file: p.file,
            line: 0,
            snippet: `ORDER BY field: ${field}`,
            confidence: 65,
            remediation: `Add an index on "${field}" to avoid full table sorts. In Prisma: @@index([${field}])`,
            autoFixCode: `// Add to schema:\n@@index([${field}])`,
            owaspMapping: 'A04:2021-Insecure Design',
            cweMapping: 'CWE-770',
          });
        }
      }

      for (const field of whereFields) {
        if (schemaFields.has(field) && !indexedFields.has(field) && field !== 'id') {
          this.emit(ctx, {
            title: 'Missing Database Index — WHERE Filter on Non-Indexed Field',
            message: `Field "${field}" is used in WHERE filter but has no index. This causes sequential scans at scale.`,
            file: p.file,
            line: 0,
            snippet: `WHERE field: ${field}`,
            confidence: 55,
            remediation: `Add an index on "${field}" to optimize filter queries. In Prisma: @@index([${field}])`,
            autoFixCode: `// Add to schema:\n@@index([${field}])`,
            owaspMapping: 'A04:2021-Insecure Design',
            cweMapping: 'CWE-770',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-003 — Cartesian product JOIN ───────────── */
export class CartesianProductJoinRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-003',
    name: 'Cartesian Product JOIN — Unrestricted Multi-Table JOIN',
    description: 'Detects GraphQL resolvers or SQL queries with multiple JOINs without sufficient WHERE constraints',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 41,
    pillar: 2,
    tags: ['performance', 'cartesian', 'join', 'graphql'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.match(/JOIN\s+/i)) continue;

        const joinCount = (line.match(/JOIN\s+/gi) || []).length;
        if (joinCount < 2) continue;

        const hasWhere = /WHERE/i.test(lines.slice(i, i + 10).join(' '));
        const hasOn = /ON\s+/i.test(line);

        if (!hasWhere || !hasOn) {
          this.emit(ctx, {
            title: 'Cartesian Product JOIN — Unrestricted Multi-Table Join',
            message: `${joinCount} JOINs detected at line ${i + 1}${!hasOn ? ' without ON conditions' : ''}${!hasWhere ? ' without WHERE clause' : ''}. This can produce exponential result sets.`,
            file: p.file,
            line: i + 1,
            snippet: line.slice(0, 250),
            confidence: 75,
            remediation: 'Ensure every JOIN has an explicit ON condition and the query has WHERE constraints. Use pagination (LIMIT/OFFSET) for all multi-table queries.',
            owaspMapping: 'A04:2021-Insecure Design',
            cweMapping: 'CWE-770',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-004 — IN clause with large or dynamic array ───────────── */
export class LargeInClauseRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-004',
    name: 'IN Clause Explosion — Large or Unbounded Array in WHERE IN',
    description: 'Detects WHERE IN or prisma in: with arrays that are large, unbounded, or from user input without pagination',
    category: 'performance-algorithmic',
    severity: 'medium',
    cwe: 'CWE-770',
    techniqueNumber: 3,
    pillar: 2,
    tags: ['performance', 'in-clause', 'query', 'explosion'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/in\s*:\s*\[|WHERE.*IN\s*\(|\.in\(\s*\[|array_contains|array_overlap/i.test(lines[i])) continue;
        const hasLargeArray = /\{[\w,\s]{80,}\]/.test(lines[i]) || lines[i].includes('...') && /\b(req|body|params|query|ids|list|items|array)\b/.test(lines[i]) && !/limit|take|slice|splice|\.length/.test(lines[i]);
        if (!hasLargeArray) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'IN Clause Explosion — Large or Unbounded Array',
          message: 'Large/unbounded IN array at line ' + ln + '. Databases have limits (SQLite: 999, PostgreSQL: 32767). Huge IN clauses degrade query planning to sequential scan.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Batch IN queries into chunks of 1000. Use pagination (LIMIT/OFFSET) instead of unbounded IN.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-770',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-005 — Missing composite index ───────────── */
export class MissingCompositeIndexRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-005',
    name: 'Missing Composite Index — Multi-Field WHERE Without Combined Index',
    description: 'Detects queries filtering/sorting on multiple fields without a composite index covering them',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 22,
    pillar: 2,
    tags: ['performance', 'composite-index', 'database', 'slow-query'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const multiFieldQueries: Array<{fields: string[], line: number}> = [];
      const compositeIndexes: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const whereMatch = lines[i].match(/where\s*:\s*\{?\s*(\w+)\s*:.*(\w+)\s*:/);
        if (whereMatch && (lines[i].includes('AND') || lines[i].includes('&&'))) {
          multiFieldQueries.push({fields: [whereMatch[1], whereMatch[2]], line: i + 1});
        }
        const idxMatch = lines[i].match(/@@index\s*\(\s*\[([^\]]+)\]/);
        if (idxMatch) compositeIndexes.push(idxMatch[1].replace(/\s+/g, ''));
      }
      for (const q of multiFieldQueries) {
        const compositeNeeded = q.fields.sort().join(',');
        const hasIndex = compositeIndexes.some(idx => {
          const sorted = idx.split(',').map(s => s.replace(/['"]/g, '').trim()).sort().join(',');
          return sorted.includes(compositeNeeded[0]) && sorted.includes(compositeNeeded[1]);
        });
        if (!hasIndex) {
          this.emit(ctx, {
            title: 'Missing Composite Index — Multi-Field Query Without Combined Index',
            message: 'Query at line ' + q.line + ' filters on [' + q.fields.join(', ') + '] but no composite index covers both fields. DB uses index intersection or full scan.',
            file: p.file, line: q.line, snippet: lines[q.line - 1].slice(0, 250), confidence: 70,
            remediation: 'Add a composite index: @@index([' + q.fields.join(', ') + ']) covering both fields in the correct order.',
            owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-770',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-006 — Implicit type cast in WHERE ───────────── */
export class ImplicitTypeCastRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-006',
    name: 'Implicit Type Cast in WHERE — Index Cannot Be Used',
    description: 'Detects string-to-number or date-to-string comparisons in WHERE causing full table scan',
    category: 'performance-algorithmic',
    severity: 'medium',
    cwe: 'CWE-770',
    techniqueNumber: 23,
    pillar: 2,
    tags: ['performance', 'type-cast', 'index', 'full-scan'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/where|filter|WHERE/.test(lines[i])) continue;
        if (!/Number\s*\(|String\s*\(|parseInt|parseFloat|\+\w+|\.toString\s*\(|String\(/.test(lines[i])) continue;
        if (!/\b(id|userId|foreign|fk|count|amount|price|total|age|year|month|date|time|status|type|code)\b/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Implicit Type Cast in WHERE — Index Scan Prevented',
          message: 'Type conversion at line ' + ln + ' in WHERE condition. CAST(id AS TEXT) = "123" prevents index usage, forces full table scan on every query.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 68,
          remediation: 'Match column types exactly in queries. Use parameterized queries that preserve type information.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-770',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-007 — N+1 via GraphQL dataloader miss ───────────── */
export class GraphQLDataloaderMissRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-007',
    name: 'N+1 via GraphQL Resolver — Missing Dataloader / Batch',
    description: 'Detects GraphQL field resolvers that execute DB queries per parent record without dataloader batching',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 2,
    pillar: 2,
    tags: ['performance', 'graphql', 'n-plus-one', 'dataloader'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/resolver|fieldResolver|Type\s*=|GraphQLObjectType|@Resolver|@Field|@ResolveField/i.test(lines[i])) continue;
        if (!/parent|root|source|obj|_parent/i.test(lines[i])) continue;
        if (!/\.(?:find|findOne|findByPk|query|exec|aggregate)\s*\(/.test(lines[i])) continue;
        if (/dataloader|DataLoader|loader\.load|batch|batchLoadFn|BatchLoader|dataloader/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'N+1 via GraphQL Resolver — Missing Dataloader',
          message: 'GraphQL field resolver at line ' + ln + ' executes DB query per parent record without dataloader batching. N+1 query explosion per GraphQL query.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          remediation: 'Wrap all DB queries in field resolvers with DataLoader. Use loader.load(parent.id) instead of direct DB calls.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-770',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-008 — Missing pagination on collection endpoint ───────────── */
export class MissingPaginationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-008',
    name: 'Missing Pagination — Unbounded Collection Fetch',
    description: 'Detects queries on collections without LIMIT/take/page/skip that could return unbounded rows',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 4,
    pillar: 2,
    tags: ['performance', 'pagination', 'collection', 'limit'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.(?:find|findMany|findAll|get|query|select|list|search|all)\s*\(/.test(lines[i])) continue;
        if (/(?:take|limit|page|skip|offset|cursor|pagination|paging|first|last)\s*[:=]/i.test(lines[i])) continue;
        if (/\b(?:count|sum|aggregate|exists|id\b|findUnique|findFirst)\s*\(/.test(lines[i])) continue;
        if (/\[\.\.\.\]|\.slice|\.splice|\.filter/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Pagination — Unbounded Collection Fetch',
          message: 'Collection query at line ' + ln + ' has no LIMIT/page/skip. With 100K+ rows this will OOM the server.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          remediation: 'Always add pagination: take: 50, skip: offset to collection queries. Implement cursor-based pagination for large datasets.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-770',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-009 — Deep nested loop join (3+ levels) ───────────── */
export class DeepNestedLoopRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-009',
    name: 'Deep Nested Loop — O(n^3) Triple-Nested Queries',
    description: 'Detects 3+ levels of nested .map()/.forEach() each containing a DB query (O(n^3) explosion)',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 42,
    pillar: 2,
    tags: ['performance', 'nested-loop', 'cubic-complexity', 'query'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.(?:map|forEach)\s*\(/.test(lines[i])) continue;
        let depth = 0;
        let queryAtDepth = 0;
        let d = 0;
        for (let j = i; j < lines.length && j < i + 40; j++) {
          if (/\.(?:map|forEach|filter)\s*\(/.test(lines[j])) d++;
          if (/\.\s*\)/.test(lines[j]) && d > 0) d--;
          if (d >= 2 && /\.(?:find|findOne|query|exec|save|create)\s*\(/.test(lines[j])) queryAtDepth = j + 1;
        }
        if (queryAtDepth > 0) {
          this.emit(ctx, {
            title: 'Deep Nested Loop — O(n^3) Triple-Nested Query',
            message: 'DB query at line ' + queryAtDepth + ' inside 3+ levels of nested loops. 100 users x 10 posts x 5 comments = 5000 queries.',
            file: p.file, line: queryAtDepth, snippet: lines[queryAtDepth - 1].slice(0, 250), confidence: 85,
            remediation: 'Use SQL JOINs or batch loading (DataLoader) with IN clauses. Never nest loops with queries.',
            owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-770',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-010 — SELECT * fetching all columns ───────────── */
export class SelectStarRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-010',
    name: 'SELECT * — Fetching All Columns Instead of Specific Fields',
    description: 'Detects SELECT * or find without select that fetches unnecessary columns wasting I/O and memory',
    category: 'performance-algorithmic',
    severity: 'medium',
    cwe: 'CWE-770',
    techniqueNumber: 5,
    pillar: 2,
    tags: ['performance', 'select-star', 'database', 'i-o'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/SELECT\s+\*/i.test(lines[i]) && !/db\.\w+\.(?:find|findMany)\s*\(\s*(?:\{|$)/i.test(lines[i])) continue;
        if (/select\s*[:=]\s*\{|select\s*[:=]\s*\[/.test(lines[i]) && !/\*/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'SELECT * — Unnecessary Column Fetch',
          message: 'Wildcard column selection at line ' + ln + '. Fetches all columns even when only a few are needed. Increases I/O, memory, and network transfer.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Specify only required columns: select: { id: true, name: true } instead of fetching *.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-770',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-011 — Batch insert missing (row-by-row) ───────────── */
export class MissingBatchInsertRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-011',
    name: 'Row-by-Row Insert in Loop — Missing Batch Insert',
    description: 'Detects insert/create calls inside loops that should use batch insert',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 6,
    pillar: 2,
    tags: ['performance', 'batch-insert', 'loop', 'database'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.(?:map|forEach)\s*\(/.test(lines[i]) && !/for\s*\(/.test(lines[i])) continue;
        if (!/\.(?:create|insert|save)\s*\(/.test(lines[i])) continue;
        if (/createMany|insertMany|bulkCreate|bulkInsert|batch|Promise\.all/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Row-by-Row Insert in Loop — Missing Batch',
          message: 'Insert/create at line ' + ln + ' inside a loop. Each iteration is a separate DB round-trip. 1000 inserts = 1000 round-trips vs 1 with batch.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          remediation: 'Use createMany/bulkCreate outside the loop. Collect items in an array and insert in one batch.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-770',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-012 — Raw SQL string interpolation ───────────── */
export class RawSQLConcatenationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-012',
    name: 'Raw SQL String Interpolation — No Prepared Statement / Parameterized Query',
    description: 'Detects SQL queries built with string concatenation instead of parameterized queries',
    category: 'performance-algorithmic',
    severity: 'critical',
    cwe: 'CWE-89',
    techniqueNumber: 7,
    pillar: 2,
    tags: ['performance', 'sql', 'parameterized', 'injection'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:SELECT|INSERT|UPDATE|DELETE)\s+.+\+/.test(lines[i]) && !/`SELECT|`INSERT|`UPDATE/ .test(lines[i]) && !/\$\{.*req|query|body|params/.test(lines[i])) continue;
        if (/\$1|\$2|:param|\?|:\w+|\.execute\s*\(|\.query\s*\(|prisma\.|\.find|\.create\s*\{/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Raw SQL String Interpolation — Injection Risk + No Query Plan Cache',
          message: 'SQL query at line ' + ln + ' built with string concatenation. No prepared statement: query plan recompiled every time AND SQL injection risk.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 88,
          remediation: 'Use parameterized queries with placeholders. For raw SQL: db.query("SELECT * FROM users WHERE id = $1", [userId]).',
          owaspMapping: 'A03:2021-Injection', cweMapping: 'CWE-89',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-013 — Missing connection timeout on pool ───────────── */
export class MissingPoolTimeoutRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-013',
    name: 'Missing Connection Timeout — Pool Hangs Indefinitely',
    description: 'Detects database pool configuration without connection timeout',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 8,
    pillar: 2,
    tags: ['performance', 'connection-pool', 'timeout'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/new\s+Pool|createPool|createConnectionPool/i.test(lines[i])) continue;
        if (/connectionTimeout|connectTimeout|acquireTimeout|timeout|connectionTimeoutMillis/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Connection Timeout on Pool',
          message: 'Pool at line ' + ln + ' has no connection timeout. Under DB load, requests hang indefinitely waiting for a connection. All server threads blocked.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Set connectionTimeoutMillis: 10000 (10s) on the pool. Fail fast rather than hang.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-770',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-014 — LIKE '%...%' prevents index usage ───────────── */
export class LikeLeadingWildcardRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-014',
    name: 'LIKE with Leading Wildcard (%term) — Full Table Scan',
    description: 'Detects LIKE \'%...\' patterns that prevent index usage causing full table scans',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 24,
    pillar: 2,
    tags: ['performance', 'like', 'wildcard', 'index', 'full-scan'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/LIKE\s+[''"`]%/i.test(lines[i]) && !/contains\s*:|search\s*:|mode\s*:\s*[''"]insensitive/i.test(lines[i])) continue;
        if (/startsWith|prefixSearch|pg_trgm|trigram|gin.*index/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'LIKE with Leading Wildcard — Full Table Scan',
          message: 'LIKE \'%term\' at line ' + ln + ' prevents B-tree index usage. Each query scans 100% of rows. For text search, use full-text search or trigram indexes.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          remediation: 'Avoid LIKE with leading %. Use PostgreSQL pg_trgm extension with GIN index for partial text search.',
          owaspMapping: 'A04:2021-Insecure Design', cweMapping: 'CWE-770',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-015 — Missing OFFSET pagination ───────────── */
export class MissingOffsetPaginationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-015',
    name: 'Missing OFFSET/LIMIT — Full Result Set Materialized',
    description: 'Detects SELECT queries without LIMIT or pagination that retrieve all rows',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 25,
    pillar: 2,
    tags: ['performance', 'pagination', 'full-scan'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/SELECT|select|findMany|findAll|getAll|\.all\s*\(/.test(lines[i])) continue;
        if (/\bLIMIT\b|\btop\b|limit\s*:|skip\s*:|take\s*:|offset\s*:|pagination|pageSize|perPage/.test(lines[i])) continue;
        if (/count\s*\(|\.count|COUNT/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing OFFSET/LIMIT — Full Result Set Materialized',
          message: 'Query at line ' + ln + ' has no pagination. For tables with 1000+ rows, this materializes the entire result set in memory and on the wire.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Add LIMIT + OFFSET (SQL) or take/skip (ORM). Always paginate list endpoints. Use cursor-based pagination for large datasets.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-016 — Sequential scan on unindexed filter column ───────────── */
export class UnindexedFilterColumnRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-016',
    name: 'WHERE Filter on Unindexed Column — Full Table Scan',
    description: 'Detects WHERE conditions on columns without matching index (by naming convention)',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 26,
    pillar: 2,
    tags: ['performance', 'index', 'filter', 'full-scan'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.where\s*\(|WHERE\s+/i.test(lines[i])) continue;
        const unindexedCol = lines[i].match(/(?:status|type|category|role|state|flag|isActive|isDeleted|enabled|locale|currency|source|medium)\s*[:=]\s*[''"]\w+/i);
        if (!unindexedCol) continue;
        if (/@Index|index|INDEX|CREATE INDEX|createIndex|addIndex/.test(lines.slice(Math.max(0, i - 10), i + 1).join(' '))) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'WHERE Filter on Likely Unindexed Column',
          message: 'Filter on "' + unindexedCol[1] + '" at line ' + ln + '. Low-cardinality columns without indexes cause sequential scans filtering large row sets.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Add a B-tree index on the filter column. For low-cardinality columns, consider a bitmap or partial index.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-017 — OR condition preventing index merge ───────────── */
export class ORConditionNoIndexMergeRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-017',
    name: 'OR Condition on Different Columns — Index Merge Not Supported',
    description: 'Detects OR conditions across disparate columns that prevent index-only scans',
    category: 'performance-algorithmic',
    severity: 'medium',
    cwe: 'CWE-770',
    techniqueNumber: 27,
    pillar: 2,
    tags: ['performance', 'or-condition', 'index-merge'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/OR\s+|or\s*[=!]|OR\s*[=!]/.test(lines[i])) continue;
        if (/user_id|userId|id\s*[:=]|_id/.test(lines[i])) continue;
        const hasDiffCols = (lines[i].match(/\w+\s*[:=]\s*[''"]?\w+/g) || []).length > 1;
        if (!hasDiffCols) continue;
        if (/UNION|union|IN\s*\(|index_merge|composite/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'OR Condition on Different Columns — No Index Merge',
          message: 'OR condition at line ' + ln + ' across different columns. Most DB engines cannot use multiple indexes with OR; falls back to full scan.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Rewrite OR as UNION of SELECT statements, or use IN clause on a single column. Consider a composite index covering all OR columns.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-018 — ORDER BY on non-indexed expression ───────────── */
export class OrderByExpressionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-018',
    name: 'ORDER BY on Non-Indexed Expression — Filesort',
    description: 'Detects ORDER BY with computed expressions or columns not in any index',
    category: 'performance-algorithmic',
    severity: 'medium',
    cwe: 'CWE-770',
    techniqueNumber: 28,
    pillar: 2,
    tags: ['performance', 'order-by', 'filesort', 'sort'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/ORDER BY|orderBy|order_by|sort\s*[:=]/i.test(lines[i])) continue;
        if (/id\s*(?:ASC|DESC)|created_at|createdAt|updatedAt|ASC|DESC\s*$/.test(lines[i]) && !/RAND|random/i.test(lines[i])) continue;
        const expr = lines[i].match(/ORDER BY\s+(.+?)(?:\s+(?:ASC|DESC|LIMIT)|$)/i);
        if (expr && /[+\-*/%]|LOWER|UPPER|SUBSTR|CONCAT|COALESCE|IF|CASE/i.test(expr[1])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'ORDER BY on Non-Indexed Expression — Filesort',
            message: 'ORDER BY expression "' + expr[1].slice(0, 80) + '" at line ' + ln + ' cannot use index. DB must sort all rows in temp table (filesort).',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
            remediation: 'Add a functional index: CREATE INDEX idx_expr ON table (computed_column). Or sort in application for small sets.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-019 — IN list with large number of values ───────────── */
export class LargeInListRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-019',
    name: 'IN Clause with 50+ Values — Planner Degradation',
    description: 'Detects IN clauses with many literals causing query plan cache blowup',
    category: 'performance-algorithmic',
    severity: 'medium',
    cwe: 'CWE-770',
    techniqueNumber: 29,
    pillar: 2,
    tags: ['performance', 'in-clause', 'planner'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const inMatch = lines[i].match(/IN\s*\(([^)]{30,})\)/i);
        if (!inMatch) continue;
        const valueCount = (inMatch[1].match(/[''"`]\w+[''"`]/g) || []).length;
        if (valueCount < 50) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'IN Clause with 50+ Values — Planner Degradation',
          message: 'IN list with ' + valueCount + ' values at line ' + ln + '. Query planner may choose suboptimal plan. Very long lists bloat query cache and parse time.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Use a temp table or VALUES clause for 50+ items. Or batch in chunks of 100 and UNION.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-020 — Implicit CROSS JOIN via missing join condition ───────────── */
export class ImplicitCrossJoinRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-020',
    name: 'Implicit CROSS JOIN — Missing JOIN Condition',
    description: 'Detects multi-table FROM without JOIN conditions causing Cartesian product',
    category: 'performance-algorithmic',
    severity: 'critical',
    cwe: 'CWE-770',
    techniqueNumber: 43,
    pillar: 2,
    tags: ['performance', 'cross-join', 'cartesian'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/FROM\s+\w+\s*,\s*\w+/i.test(lines[i])) continue;
        if (/\bWHERE\b|ON\s+|INNER|LEFT|RIGHT|CROSS|JOIN/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Implicit CROSS JOIN — Missing JOIN Condition',
          message: 'FROM clause with multiple tables without WHERE/ON at line ' + ln + '. This creates a Cartesian product (every row of A x every row of B).',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
          remediation: 'Add JOIN conditions or WHERE equalities to link tables. For explicit relationships, use INNER JOIN ... ON.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-021 — Subquery that should be JOIN ───────────── */
export class SubqueryToJoinRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-021',
    name: 'Correlated Subquery — Rewrite as JOIN for Performance',
    description: 'Detects correlated subqueries in WHERE/SELECT that execute per row',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 44,
    pillar: 2,
    tags: ['performance', 'subquery', 'join'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/SELECT\s+.*\(SELECT|WHERE\s+.*\(SELECT/i.test(lines[i])) continue;
        if (/EXISTS|NOT EXISTS|IN\s*\(SELECT/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Correlated Subquery — Rewrite as JOIN',
          message: 'Subquery at line ' + ln + ' likely correlated. Runs once per outer row (N+1 subquery pattern). For 10K rows, that is 10K subquery executions.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Rewrite as JOIN with GROUP BY or use window functions. Let optimizer choose the execution plan.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-022 — Missing database query timeout ───────────── */
export class MissingQueryTimeoutRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-022',
    name: 'Missing Query Timeout — Slow Query Holds Connection',
    description: 'Detects database queries without statement timeout or query timeout setting',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 30,
    pillar: 2,
    tags: ['performance', 'timeout', 'connection-pool'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:db|prisma|knex|sequelize|typeorm|mongoose|client|pool|adapter)\.(?:query|execute|find|findMany|findAll|raw)/i.test(lines[i])) continue;
        if (/timeout|statement_timeout|query_timeout|timeoutMs/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Query Timeout — Slow Query Holds Connection Forever',
          message: 'Query at line ' + ln + ' has no query timeout. A slow query holds a connection pool slot, blocking all other requests until the query completes.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Set statement_timeout (Postgres), or add timeoutMs to the query call. Example: db.query(sql, { timeout: 5000 }).',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-023 — COUNT(*) on large table ───────────── */
export class CountStarWithoutApproxRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-023',
    name: 'COUNT(*) on Large Table — Full Index Scan Every Time',
    description: 'Detects COUNT(*) queries that trigger full index scan on tables that should use approximate counts',
    category: 'performance-algorithmic',
    severity: 'low',
    cwe: 'CWE-770',
    techniqueNumber: 31,
    pillar: 2,
    tags: ['performance', 'count', 'table-scan'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/COUNT\s*\(|\.count\s*\(/.test(lines[i])) continue;
        if (/\btotal\b|\btotals\b|\bdashboard\b|\bheader\b|\bbadge\b|\bcounter\b/i.test(lines[i])) continue;
        if (/WHERE|where|filter|condition|criteria/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'COUNT(*) on Large Table — Full Scan per Request',
          message: 'Unfiltered COUNT at line ' + ln + '. For tables with 100K+ rows, this scans all rows every time. Dashboards refresh this every few seconds.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
          remediation: 'Use pg_stat_user_tables.n_live_tup (Postgres) or SHOW TABLE STATUS (MySQL) for approximate counts. Cache exact count with TTL.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-024 — WHERE with function wrapping column ───────────── */
export class FunctionOnColumnRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-024',
    name: 'Function on Column in WHERE — Index Cannot Be Used',
    description: 'Detects WHERE conditions with functions wrapping column names preventing index usage',
    category: 'performance-algorithmic',
    severity: 'high',
    cwe: 'CWE-770',
    techniqueNumber: 32,
    pillar: 2,
    tags: ['performance', 'function-index', 'sargable'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/WHERE|where/i.test(lines[i])) continue;
        const fnOnCol = lines[i].match(/(?:YEAR|MONTH|DAY|DATE|UPPER|LOWER|LENGTH|TRIM|CONVERT|CAST|SUBSTR|LEFT|RIGHT|FORMAT)\s*\(\s*\w+\.\w+/i);
        if (!fnOnCol) continue;
        if (/index|INDEX|@Index/i.test(lines.slice(Math.max(0, i - 5), i + 1).join(' '))) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Function on Column in WHERE — Index Not Used (Non-Sargable)',
          message: 'Function "' + fnOnCol[0].slice(0, 40) + '" at line ' + ln + ' wraps column, preventing index usage. DB must evaluate function for every row.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          remediation: 'Use range queries instead: WHERE date >= "2024-01-01" AND date < "2024-02-01" instead of YEAR(date) = 2024.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-ALGO-025 — Deeply nested WHERE conditions ───────────── */
export class DeepNestedWhereRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-ALGO-025',
    name: 'Deeply Nested WHERE — Query Planner Timeout Risk',
    description: 'Detects WHERE clauses with excessive nesting making query planning expensive',
    category: 'performance-algorithmic',
    severity: 'low',
    cwe: 'CWE-770',
    techniqueNumber: 33,
    pillar: 2,
    tags: ['performance', 'where', 'nesting', 'planner'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/WHERE\s*\(.*\(.*\(.*\(|\.where\s*\(\s*\{[^}]*\{[^}]*\{/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Deeply Nested WHERE — Query Planner Timeout',
          message: 'Deeply nested WHERE at line ' + ln + '. Query planner may time out exploring join orders. Complex conditions increase planning time exponentially.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
          remediation: 'Simplify WHERE conditions. Split complex queries with CTEs (WITH ... AS). Limit nesting depth to 3 levels.',
        });
      }
    }
  }
}
