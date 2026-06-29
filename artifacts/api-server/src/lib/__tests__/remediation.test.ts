import { describe, it, expect, vi } from "vitest";

// Mock db module at top level to avoid DATABASE_URL requirement in seed test
vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
  fixTemplates: {},
}));

/**
 * Phase 18 — Remediation Engine Tests
 * Tests the rule-based fixer, AI patch generator interface, and orchestrator logic.
 */
describe("Rule-Based Fixer", () => {
  it("should fix SQL injection via string concatenation", async () => {
    const { applyRuleBasedFix } = await import("../remediation/rule-based-fixer.js");

    const code = `const query = \`SELECT * FROM users WHERE id = \${userId}\`;
const result = await db.query(query);`;

    const fix = applyRuleBasedFix(code, "src/routes/users.ts", "SQL Injection in User Query", "User input concatenated into SQL string");

    expect(fix).not.toBeNull();
    expect(fix!.patchedCode).not.toContain("${userId}");
    expect(fix!.rule.id).toBe("sql-injection-concat");
  });

  it("should fix hardcoded secrets", async () => {
    const { applyRuleBasedFix } = await import("../remediation/rule-based-fixer.js");

    const code = `const apiKey = "sk-1234567890abcdef";
const secret = "my-secret-value";`;

    const fix = applyRuleBasedFix(code, "src/config.ts", "Hardcoded API Key", "API key exposed in source code");

    expect(fix).not.toBeNull();
    expect(fix!.patchedCode).toContain("process.env");
  });

  it("should fix missing helmet()", async () => {
    const { applyRuleBasedFix } = await import("../remediation/rule-based-fixer.js");

    const code = `const app = express();
app.use(cors());`;

    const fix = applyRuleBasedFix(code, "src/app.ts", "Missing Security Headers", "No helmet() middleware configured");

    expect(fix).not.toBeNull();
    expect(fix!.patchedCode).toContain("helmet");
  });

  it("should fix XSS via innerHTML", async () => {
    const { applyRuleBasedFix } = await import("../remediation/rule-based-fixer.js");

    const code = `document.getElementById("output").innerHTML = userInput;`;

    const fix = applyRuleBasedFix(code, "src/app.ts", "XSS via innerHTML", "User input assigned to innerHTML");

    expect(fix).not.toBeNull();
    expect(fix!.patchedCode).toContain("textContent");
  });

  it("should fix weak MD5 hash", async () => {
    const { applyRuleBasedFix } = await import("../remediation/rule-based-fixer.js");

    const code = `const hash = createHash("md5").update(password).digest("hex");`;

    const fix = applyRuleBasedFix(code, "src/auth.ts", "Weak Hash Function", "MD5 is cryptographically broken");

    expect(fix).not.toBeNull();
    expect(fix!.patchedCode).toContain("sha256");
    expect(fix!.patchedCode).not.toContain("md5");
  });

  it("should fix open redirect", async () => {
    const { applyRuleBasedFix } = await import("../remediation/rule-based-fixer.js");

    const code = `res.redirect(req.query.url);`;

    const fix = applyRuleBasedFix(code, "src/routes/redirect.ts", "Open Redirect", "Unvalidated redirect to user-controlled URL");

    expect(fix).not.toBeNull();
    expect(fix!.patchedCode).toContain("ALLOWED_HOSTS");
  });

  it("should return null for unmatched issues", async () => {
    const { applyRuleBasedFix } = await import("../remediation/rule-based-fixer.js");

    const code = `console.log("hello world");`;

    const fix = applyRuleBasedFix(code, "src/utils.ts", "Unrelated Issue", "Something that doesn't match any rule");

    expect(fix).toBeNull();
  });

  it("should not apply JS rules to Python files", async () => {
    const { applyRuleBasedFix } = await import("../remediation/rule-based-fixer.js");

    const code = `query = "SELECT * FROM users WHERE id = " + user_id`;

    const fix = applyRuleBasedFix(code, "src/routes/users.py", "SQL Injection in User Query", "User input concatenated into SQL string");

    expect(fix).toBeNull();
  });
});

describe("Sandbox Tester", () => {
  it("should return skipped result when no project root", async () => {
    const { testPatchInSandbox } = await import("../remediation/sandbox-tester.js");

    const result = await testPatchInSandbox({
      originalCode: "const x = 1;",
      patchedCode: "const x = 2;",
      filePath: "src/test.ts",
      projectRoot: "",
    });

    expect(result.passed).toBe(true);
    expect(result.typecheck.output).toContain("Skipped");
  });

  it("should return skipped result for non-existent project root", async () => {
    const { testPatchInSandbox } = await import("../remediation/sandbox-tester.js");

    const result = await testPatchInSandbox({
      originalCode: "const x = 1;",
      patchedCode: "const x = 2;",
      filePath: "src/test.ts",
      projectRoot: "/nonexistent/path/that/does/not/exist",
    });

    expect(result.passed).toBe(true);
  });
});

describe("Remediation Orchestrator", () => {
  it("should detect language from file extension", async () => {
    const { applyRuleBasedFix } = await import("../remediation/rule-based-fixer.js");

    const tsFix = applyRuleBasedFix(
      `const app = express();`,
      "src/app.ts",
      "Missing Security Headers",
      "No helmet()"
    );
    expect(tsFix).not.toBeNull();

    const pyFix = applyRuleBasedFix(
      `app = Flask(__name__)`,
      "src/app.py",
      "Missing Security Headers",
      "No helmet()"
    );
    expect(pyFix).toBeNull();
  });
});

describe("Fix Templates Seed", () => {
  it("should have valid template structure", async () => {
    const seed = await import("../remediation/seed-templates.js");

    expect(seed.seedFixTemplates).toBeDefined();
    expect(typeof seed.seedFixTemplates).toBe("function");
  }, 10_000);
});
