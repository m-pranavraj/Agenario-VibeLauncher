/**
 * RLS & Database Authorization Scanner
 * ─────────────────────────────────────────────────────────────────────────
 * Detects missing Row-Level Security (RLS) in Supabase, Firebase rules gaps,
 * and database authorization vulnerabilities in vibe-coded apps.
 *
 * Core of what VibeEval (310+ probes), Aikido, and VibeAudits all flag as
 * the #1 vulnerability in AI-generated code.
 */

type KeyFile = { path: string; content: string };

export interface RLSFinding {
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
  category: "rls" | "firebase" | "database-auth" | "multitenancy";
  owasp: string;
  cwe: string;
}

export interface RLSScanResult {
  findings: RLSFinding[];
  rlsTablesDetected: string[];
  rlsMissingTables: string[];
  supabaseDetected: boolean;
  firebaseDetected: boolean;
  rlsCoverageScore: number; // 0-100
}

// ── Supabase table declarations (without RLS enabled) ───────────────────
const SUPABASE_TABLE_PATTERNS = [
  /createTable\s*\(\s*['"`](\w+)['"`]/g,
  /\.from\s*\(\s*['"`](\w+)['"`]\s*\)/g,
  /supabase\.from\s*\(\s*['"`](\w+)['"`]\s*\)/g,
];

const RLS_ENABLE_PATTERNS = [
  /ALTER\s+TABLE\s+(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi,
  /enable_row_security\s*=\s*true/gi,
  /RLS\s+enabled/gi,
  /CREATE\s+POLICY/gi,
];

const RLS_BYPASS_PATTERNS = [
  // Service role key used directly in client-side code
  { pattern: /supabase\.createClient\s*\([^)]*service_role/gi, title: "Supabase Service Role Key in Client", severity: "critical" as const },
  // Anon key with no RLS
  { pattern: /SUPABASE_ANON_KEY|supabase_anon_key/gi, title: "Supabase Anon Key Exposure", severity: "high" as const },
  // Supabase admin calls
  { pattern: /supabase\.admin\./gi, title: "Supabase Admin API in User-Facing Code", severity: "critical" as const },
  // Direct Supabase select without auth filter
  { pattern: /\.from\(['"]\w+['"]\)\.select\(\)(?!\s*\.eq\s*\(\s*['"](?:user_id|owner_id|created_by|tenant_id))/g, title: "Supabase Query Without User Filter", severity: "high" as const },
];

const FIREBASE_VULNERABILITY_PATTERNS = [
  { pattern: /rules_version\s*=\s*['"]1['"]/gi, title: "Firebase Legacy Security Rules (v1)", severity: "high" as const },
  { pattern: /allow\s+read,\s*write\s*:\s*if\s+true/gi, title: "Firebase Rules: Open Read/Write", severity: "critical" as const },
  { pattern: /allow\s+read\s*:\s*if\s+true/gi, title: "Firebase Rules: Open Read to Anyone", severity: "critical" as const },
  { pattern: /allow\s+write\s*:\s*if\s+true/gi, title: "Firebase Rules: Open Write to Anyone", severity: "critical" as const },
  { pattern: /allow\s+read,\s*write\s*:\s*if\s+request\.auth\s+!=\s+null/gi, title: "Firebase Rules: Any Auth User Can Read/Write (No Ownership Check)", severity: "high" as const },
];

const MULTITENANCY_VULNERABILITY_PATTERNS = [
  // Queries missing tenant_id or org_id scope
  { pattern: /prisma\.\w+\.(findMany|findFirst|update|delete)\s*\(\s*\{(?![^}]*(?:tenantId|orgId|organizationId|userId|user_id))/gi, title: "Prisma Query Missing Tenant Scope", severity: "high" as const },
  // Direct object references without ownership check 
  { pattern: /where\s*:\s*\{[^}]*id\s*:\s*(?:req\.params|req\.query|req\.body)\.\w+[^}]*\}/gi, title: "BOLA: Direct Object Reference Without Ownership Validation", severity: "critical" as const },
  // Missing userId in session data checks
  { pattern: /req\.params\.id[^;]*(?!.*(?:userId|session\.user|currentUser|auth\.))/gi, title: "Resource Access Without Ownership Verification", severity: "high" as const },
];

export function runRLSScanner(keyFiles: KeyFile[]): RLSScanResult {
  const findings: RLSFinding[] = [];
  const rlsTablesDetected: string[] = [];
  const rlsMissingTables: string[] = [];
  let supabaseDetected = false;
  let firebaseDetected = false;

  let findingIndex = 0;
  const makeId = (prefix: string) => `${prefix}-${++findingIndex}`;

  for (const file of keyFiles) {
    const { path: filePath, content } = file;
    if (!content || content.length === 0) continue;

    const lines = content.split("\n");
    const fileBasename = filePath.toLowerCase();

    // ── Detect Supabase usage ────────────────────────────────────────────
    const isSupabaseFile = /supabase|@supabase/.test(content);
    const isMigrationFile = /migration|schema\.sql|seed\.sql/.test(fileBasename);

    if (isSupabaseFile) {
      supabaseDetected = true;

      // Check for RLS bypass patterns
      for (const { pattern, title, severity } of RLS_BYPASS_PATTERNS) {
        pattern.lastIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (pattern.test(line)) {
            pattern.lastIndex = 0;
            findings.push({
              id: makeId("RLS"),
              severity,
              title,
              description: `${title} found in ${filePath}. This can expose data to unauthorized users, bypassing all Row Level Security policies.`,
              evidence: `${filePath}:${i + 1}: ${line.trim().slice(0, 120)}`,
              filePath,
              lineNumber: i + 1,
              codeSnippet: line.trim().slice(0, 200),
              fixPrompt: `Enable RLS on all Supabase tables. Never use the service_role key in client-side code. Use Row Level Security policies to scope queries to authenticated users: CREATE POLICY "Users can only access own data" ON table_name FOR ALL USING (auth.uid() = user_id);`,
              confidence: 92,
              category: "rls",
              owasp: "A01:2021-Broken Access Control",
              cwe: "CWE-639",
            });
          }
          pattern.lastIndex = 0;
        }
      }

      // Detect if RLS is enabled in migration files
      if (isMigrationFile) {
        const hasRLS = RLS_ENABLE_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(content); });

        // Extract table names
        for (const tablePattern of SUPABASE_TABLE_PATTERNS) {
          tablePattern.lastIndex = 0;
          let match;
          while ((match = tablePattern.exec(content)) !== null) {
            const tableName = match[1];
            if (tableName && !rlsTablesDetected.includes(tableName)) {
              rlsTablesDetected.push(tableName);
              if (!hasRLS && !rlsMissingTables.includes(tableName)) {
                rlsMissingTables.push(tableName);
              }
            }
          }
        }

        if (rlsMissingTables.length > 0) {
          findings.push({
            id: makeId("RLS-MISSING"),
            severity: "critical",
            title: `Supabase Tables Missing Row Level Security (${rlsMissingTables.slice(0, 3).join(", ")}${rlsMissingTables.length > 3 ? ` +${rlsMissingTables.length - 3} more` : ""})`,
            description: `${rlsMissingTables.length} Supabase table(s) detected without RLS enabled: ${rlsMissingTables.join(", ")}. Without RLS, any authenticated or anonymous user can read/write ALL rows in these tables — a critical data breach vector. VibeEval reports this as the #1 vulnerability in AI-generated apps.`,
            evidence: `${filePath}: ALTER TABLE ... ENABLE ROW LEVEL SECURITY not found for ${rlsMissingTables.join(", ")}`,
            filePath,
            lineNumber: 0,
            codeSnippet: `Tables without RLS: ${rlsMissingTables.join(", ")}`,
            fixPrompt: `Enable RLS on every Supabase table and add ownership policies:\n\nALTER TABLE ${rlsMissingTables[0] || "your_table"} ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Users can only see own rows" ON ${rlsMissingTables[0] || "your_table"}\n  FOR ALL USING (auth.uid() = user_id);`,
            confidence: 95,
            category: "rls",
            owasp: "A01:2021-Broken Access Control",
            cwe: "CWE-284",
          });
        }
      }
    }

    // ── Detect Firebase usage ────────────────────────────────────────────
    const isFirebaseFile = /firebase|firestore|\.rules|firestore\.rules/.test(fileBasename) ||
      /firebase|firestore/.test(content);

    if (isFirebaseFile) {
      firebaseDetected = true;

      for (const { pattern, title, severity } of FIREBASE_VULNERABILITY_PATTERNS) {
        pattern.lastIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            pattern.lastIndex = 0;
            findings.push({
              id: makeId("FIREBASE"),
              severity,
              title,
              description: `Firebase security rule misconfiguration: "${title}". This allows unauthorized users to ${title.includes("Read") ? "read" : "modify"} your Firestore data.`,
              evidence: `${filePath}:${i + 1}: ${lines[i].trim().slice(0, 120)}`,
              filePath,
              lineNumber: i + 1,
              codeSnippet: lines[i].trim(),
              fixPrompt: `Restrict Firebase rules to authenticated users with ownership checks:\n\nrules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /users/{userId} {\n      allow read, write: if request.auth != null && request.auth.uid == userId;\n    }\n  }\n}`,
              confidence: 98,
              category: "firebase",
              owasp: "A01:2021-Broken Access Control",
              cwe: "CWE-284",
            });
          }
          pattern.lastIndex = 0;
        }
      }
    }

    // ── Multitenancy & BOLA Checks ────────────────────────────────────────
    if (/\.(ts|js|tsx|jsx)$/.test(filePath)) {
      for (const { pattern, title, severity } of MULTITENANCY_VULNERABILITY_PATTERNS) {
        pattern.lastIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (pattern.test(line)) {
            pattern.lastIndex = 0;
            // Skip test files and non-route files
            if (/test|spec|mock|fixture/.test(fileBasename)) continue;

            findings.push({
              id: makeId("BOLA"),
              severity,
              title,
              description: `${title} detected in ${filePath}. AI-generated code frequently omits ownership checks, allowing users to access other users' data by guessing IDs (BOLA/IDOR attack).`,
              evidence: `${filePath}:${i + 1}: ${line.trim().slice(0, 120)}`,
              filePath,
              lineNumber: i + 1,
              codeSnippet: line.trim().slice(0, 200),
              fixPrompt: `Always scope database queries to the authenticated user's ID:\n\n// Instead of:\nconst item = await db.items.findUnique({ where: { id: req.params.id } });\n\n// Use:\nconst item = await db.items.findFirst({\n  where: { id: req.params.id, userId: req.session.userId }\n});\nif (!item) return res.status(404).json({ error: 'Not found' });`,
              confidence: 80,
              category: "multitenancy",
              owasp: "A01:2021-Broken Access Control",
              cwe: "CWE-639",
            });
          }
          pattern.lastIndex = 0;
        }
      }
    }
  }

  const totalTables = rlsTablesDetected.length;
  const coveredTables = totalTables - rlsMissingTables.length;
  const rlsCoverageScore = totalTables > 0 ? Math.round((coveredTables / totalTables) * 100) : supabaseDetected ? 0 : 100;

  return {
    findings,
    rlsTablesDetected,
    rlsMissingTables,
    supabaseDetected,
    firebaseDetected,
    rlsCoverageScore,
  };
}
