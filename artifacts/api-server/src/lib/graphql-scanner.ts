/**
 * GraphQL Security Scanner
 * ─────────────────────────────────────────────────────────────────────────
 * Scans GraphQL schemas and resolvers for security vulnerabilities:
 * - GraphQL injection (via unsanitized query variables)
 * - Introspection enabled in production
 * - Batching attacks / N+1 query DoS
 * - Missing authentication on resolvers
 * - Depth limiting not enforced
 * - Field suggestions enabled (info leak)
 *
 * Competitor check: Aikido, VibeEval (REST, GraphQL, edge functions — fuzzed)
 */

type KeyFile = { path: string; content: string };

export interface GraphQLFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  fixPrompt: string;
  confidence: number;
  category: "graphql-injection" | "graphql-auth" | "graphql-dos" | "graphql-info-leak";
  owasp: string;
  cwe: string;
}

export interface GraphQLResult {
  findings: GraphQLFinding[];
  graphqlDetected: boolean;
  introspectionEnabled: boolean;
  depthLimitDetected: boolean;
  complexityLimitDetected: boolean;
}

const GRAPHQL_VULNERABILITY_PATTERNS = [
  // Introspection enabled in production
  {
    pattern: /introspection\s*:\s*true/gi,
    title: "GraphQL Introspection Enabled",
    description: "GraphQL introspection reveals the entire schema including types, queries, and mutations. Attackers use this to map your API and craft targeted attacks.",
    severity: "medium" as const,
    fix: "Disable introspection in production: `introspection: process.env.NODE_ENV !== 'production'`",
    cwe: "CWE-200",
    confidence: 95,
    category: "graphql-info-leak" as const,
  },
  // Field suggestions enabled
  {
    pattern: /fieldSuggestions\s*:\s*true|hideSchemaErrors\s*:\s*false/gi,
    title: "GraphQL Field Suggestions Enabled (Info Leak)",
    description: "GraphQL field suggestions reveal valid field names to attackers who make typos, mapping your data model.",
    severity: "low" as const,
    fix: "Disable field suggestions: `maskedErrors: { maskErrors: true }` and `hideSchemaErrors: true` in production.",
    cwe: "CWE-200",
    confidence: 85,
    category: "graphql-info-leak" as const,
  },
  // Missing depth limiting
  {
    pattern: /ApolloServer|createSchema|makeExecutableSchema|buildSchema/gi,
    title: "GraphQL Server Without Depth Limiting",
    description: "GraphQL queries without depth limits allow deeply nested queries that can cause exponential resource usage and DoS attacks.",
    severity: "high" as const,
    fix: "Add depth limiting: `import depthLimit from 'graphql-depth-limit'; validationRules: [depthLimit(10)]`",
    cwe: "CWE-770",
    confidence: 70,
    category: "graphql-dos" as const,
  },
  // GraphQL raw string interpolation
  {
    pattern: /`\s*(?:query|mutation|subscription)\s+\w+\s*\{[^`]*\$\{/gm,
    title: "GraphQL Query String Interpolation (Injection Risk)",
    description: "GraphQL query built with template literal interpolation. User-controlled data injected directly into query strings enables GraphQL injection attacks.",
    severity: "high" as const,
    fix: "Use GraphQL variables for all dynamic values. Never interpolate user input into query strings: `client.query({ query: QUERY, variables: { id: userId } })`",
    cwe: "CWE-89",
    confidence: 88,
    category: "graphql-injection" as const,
  },
  // Batching not rate limited
  {
    pattern: /batchMaxSize\s*:\s*(\d+)/gi,
    title: "GraphQL Batching Without Adequate Size Limit",
    description: "GraphQL batching allows multiple queries in one request. Without tight limits, attackers can batch thousands of mutations to brute-force credentials or cause DoS.",
    severity: "medium" as const,
    fix: "Set strict batch size limits: `batchMaxSize: 10` and add rate limiting per operation.",
    cwe: "CWE-770",
    confidence: 80,
    category: "graphql-dos" as const,
  },
  // Missing authentication check on resolver
  {
    pattern: /resolver[s]?\s*:\s*\{[^}]*(?!context\.user|context\.auth|isAuthenticated)\w+\s*:\s*\([^)]*\)\s*=>/gm,
    title: "GraphQL Resolver Missing Authentication Check",
    description: "GraphQL resolver defined without authentication verification in context. Unauthenticated users may query sensitive data.",
    severity: "high" as const,
    fix: "Add auth check in all sensitive resolvers:\n`if (!context.user) throw new AuthenticationError('Must be logged in');`",
    cwe: "CWE-306",
    confidence: 70,
    category: "graphql-auth" as const,
  },
];

const DEPTH_LIMIT_PATTERNS = [
  /depthLimit/gi,
  /maxDepth/gi,
  /depth-limit/gi,
  /graphql-depth-limit/gi,
];

const COMPLEXITY_LIMIT_PATTERNS = [
  /complexityLimit|queryComplexity|graphql-query-complexity/gi,
  /maxComplexity/gi,
  /costDirective/gi,
];

export function runGraphQLScanner(keyFiles: KeyFile[]): GraphQLResult {
  const findings: GraphQLFinding[] = [];
  let graphqlDetected = false;
  let introspectionEnabled = false;
  let depthLimitDetected = false;
  let complexityLimitDetected = false;

  let findingIndex = 0;
  const makeId = () => `GQL-${++findingIndex}`;

  for (const file of keyFiles) {
    const { path: filePath, content } = file;
    if (!content || !/\.(ts|js|tsx|jsx|graphql|gql)$/.test(filePath)) continue;

    const isTestFile = /test|spec|mock/.test(filePath.toLowerCase());
    if (isTestFile) continue;

    const isGraphQLFile = /graphql|gql|apollo|prisma.*graphql/.test(filePath.toLowerCase()) ||
      /graphql|@apollo|gql\`|makeExecutableSchema|buildSchema/.test(content);

    if (!isGraphQLFile) continue;

    graphqlDetected = true;
    const lines = content.split("\n");

    // Detect depth and complexity limits
    if (!depthLimitDetected) {
      depthLimitDetected = DEPTH_LIMIT_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(content); });
    }
    if (!complexityLimitDetected) {
      complexityLimitDetected = COMPLEXITY_LIMIT_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(content); });
    }

    for (const vuln of GRAPHQL_VULNERABILITY_PATTERNS) {
      vuln.pattern.lastIndex = 0;

      // Skip depth limit check if depth limit is already detected
      if (vuln.title.includes("Depth Limiting") && depthLimitDetected) continue;

      for (let i = 0; i < lines.length; i++) {
        if (vuln.pattern.test(lines[i])) {
          vuln.pattern.lastIndex = 0;

          if (vuln.title.includes("Introspection")) introspectionEnabled = true;

          findings.push({
            id: makeId(),
            severity: vuln.severity,
            title: vuln.title,
            description: vuln.description,
            evidence: `${filePath}:${i + 1}: ${lines[i].trim().slice(0, 120)}`,
            filePath,
            lineNumber: i + 1,
            codeSnippet: lines[i].trim().slice(0, 200),
            fixPrompt: vuln.fix,
            confidence: vuln.confidence,
            category: vuln.category,
            owasp: "A03:2021-Injection",
            cwe: vuln.cwe,
          });
          break;
        }
        vuln.pattern.lastIndex = 0;
      }
    }

    // Project-level: Missing depth limit warning
    if (graphqlDetected && !depthLimitDetected) {
      findings.push({
        id: makeId(),
        severity: "high",
        title: "GraphQL: No Query Depth Limiting Detected",
        description: "GraphQL API detected without query depth limiting. Attackers can craft deeply nested queries (e.g., user{friends{friends{friends{...}}}}) to cause exponential processing and DoS.",
        evidence: "Project-wide: graphql-depth-limit or equivalent not found",
        filePath: "package.json",
        lineNumber: 0,
        codeSnippet: "npm install graphql-depth-limit",
        fixPrompt: "Install graphql-depth-limit and configure:\n```\nimport depthLimit from 'graphql-depth-limit';\nnew ApolloServer({ validationRules: [depthLimit(10)] })\n```",
        confidence: 80,
        category: "graphql-dos",
        owasp: "A04:2021-Insecure Design",
        cwe: "CWE-770",
      });
    }

    if (graphqlDetected && !complexityLimitDetected) {
      findings.push({
        id: makeId(),
        severity: "medium",
        title: "GraphQL: No Query Complexity Limiting Detected",
        description: "GraphQL API without complexity analysis allows attackers to craft high-cost queries that exhaust server resources.",
        evidence: "Project-wide: graphql-query-complexity or equivalent not found",
        filePath: "package.json",
        lineNumber: 0,
        codeSnippet: "npm install graphql-query-complexity",
        fixPrompt: "Install graphql-query-complexity and configure cost per field.",
        confidence: 75,
        category: "graphql-dos",
        owasp: "A04:2021-Insecure Design",
        cwe: "CWE-770",
      });
    }
  }

  return {
    findings,
    graphqlDetected,
    introspectionEnabled,
    depthLimitDetected,
    complexityLimitDetected,
  };
}
