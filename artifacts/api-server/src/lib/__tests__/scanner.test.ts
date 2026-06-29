import crypto from "crypto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { scanDirectory } from "../scanner";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agenario-scanner-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFile(name: string, content: string): string {
  const full = path.join(tmpDir, name);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return full;
}

// Keys are built at runtime to avoid triggering GitHub push-protection on this file.
// The scanner tests that patterns in *target files* are detected — these are not real keys.
const fakeOpenAIKey = ["sk", "proj", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwx"].join("-");
const fakeStripeLive = ["sk", "live", "ABCDEFGHIJKLMNOPQRSTUVWX12345678"].join("_");
const fakeStripeTest = ["sk", "test", "ABCDEFGHIJKLMNOPQRSTUVWX12345678"].join("_");
const fakeAWSKey    = "AKIA" + "IOSFODNN7TESTKEY";

// ── Secrets ────────────────────────────────────────────────────

describe("Secret detection", () => {
  it("detects hardcoded OpenAI API key", () => {
    writeFile("src/config.ts", `
      const client = new OpenAI({ apiKey: "${fakeOpenAIKey}" });
    `);
    const { findings } = scanDirectory(tmpDir);
    const f = findings.find((f) => f.title.includes("OpenAI"));
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
    expect(f!.confidence).toBeGreaterThanOrEqual(90);
    expect(f!.evidence.replace(/\\/g, "/")).toContain("src/config.ts:2");
  });

  it("detects Stripe live secret key", () => {
    writeFile("lib/stripe.ts", `const stripe = new Stripe("${fakeStripeLive}");`);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes("Stripe Secret"))).toBe(true);
  });

  it("does NOT flag process.env references as secrets", () => {
    writeFile("src/config.ts", `
      const apiKey = process.env.OPENAI_API_KEY;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    `);
    const { findings } = scanDirectory(tmpDir);
    const secretFindings = findings.filter((f) => f.category === "secrets");
    expect(secretFindings.length).toBe(0);
  });

  it("does NOT flag placeholder values", () => {
    writeFile(".env.example", `
      OPENAI_API_KEY=sk-your-key-here
      STRIPE_SECRET_KEY=${["sk", "live", "YOUR_KEY"].join("_")}
    `);
    const { findings } = scanDirectory(tmpDir);
    const secretFindings = findings.filter((f) => f.category === "secrets");
    expect(secretFindings.length).toBe(0);
  });

  it("detects hardcoded JWT secret with fallback", () => {
    writeFile("src/auth.ts", `
      const secret = process.env.SESSION_SECRET || "my-super-secret-key-123";
    `);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes("Session Secret from Fallback"))).toBe(true);
  });

  it("detects MongoDB connection string with embedded credentials", () => {
    writeFile("src/db.ts", `
      const uri = "mongodb://admin:SuperSecret123@cluster0.mongodb.net/mydb";
    `);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes("MongoDB"))).toBe(true);
  });

  it("detects AWS access key", () => {
    writeFile("src/aws.ts", `
      const accessKey = "${fakeAWSKey}";
    `);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes("AWS Access Key"))).toBe(true);
  });

  it("detects private RSA key in source", () => {
    writeFile("src/cert.ts", `
      const key = \`-----BEGIN RSA PRIVATE KEY-----
      MIIEowIBAAKCAQEA...
      -----END RSA PRIVATE KEY-----\`;
    `);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes("Private RSA Key"))).toBe(true);
  });
});

// ── Injection patterns ─────────────────────────────────────────

describe("Injection detection", () => {
  it("detects SQL injection via template literal", () => {
    writeFile("src/routes/users.ts", `
      router.get("/users/:id", async (req, res) => {
        const rows = await db.query(\`SELECT * FROM users WHERE id = \${req.params.id}\`);
        res.json(rows);
      });
    `);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes("SQL Injection"))).toBe(true);
    const f = findings.find((f) => f.title.includes("SQL Injection"))!;
    expect(f.severity).toBe("critical");
  });

  it("detects eval() usage", () => {
    writeFile("src/plugin.ts", `
      function runPlugin(code: string) {
        return eval(code);
      }
    `);
    const { findings } = scanDirectory(tmpDir);
    const f = findings.find((f) => f.title.includes("Eval"));
    expect(f).toBeDefined();
    expect(f!.severity).toBe("critical");
    expect(f!.confidence).toBe(99);
  });

  it("detects dangerouslySetInnerHTML without sanitize", () => {
    writeFile("src/components/Post.tsx", `
      function Post({ content }: { content: string }) {
        return <div dangerouslySetInnerHTML={{ __html: content }} />;
      }
    `);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes("XSS"))).toBe(true);
  });
});

// ── Config issues ──────────────────────────────────────────────

describe("Config detection", () => {
  it("detects CORS wildcard origin", () => {
    writeFile("src/app.ts", `
      app.use(cors({ origin: "*", credentials: true }));
    `);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes("CORS Wildcard"))).toBe(true);
  });

  it("detects localhost URL in production code", () => {
    writeFile("src/api.ts", `
      const BASE_URL = "http://localhost:3000/api";
      const resp = await fetch(BASE_URL + "/users");
    `);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes("Localhost URL"))).toBe(true);
  });

  it("flags missing .env.example", () => {
    writeFile("src/index.ts", `console.log("hello")`);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes(".env.example"))).toBe(true);
  });

  it("does NOT flag .env.example when present", () => {
    writeFile(".env.example", `OPENAI_API_KEY=sk-your-key-here`);
    writeFile("src/index.ts", `console.log("hello")`);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes(".env.example"))).toBe(false);
  });

  it("detects exposed debug route", () => {
    writeFile("src/routes/debug.ts", `
      router.get("/debug", (req, res) => {
        res.json({ env: process.env });
      });
    `);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes("Debug Route"))).toBe(true);
  });
});

// ── Quality issues ─────────────────────────────────────────────

describe("Quality detection", () => {
  it("detects empty catch block", () => {
    writeFile("src/service.ts", `
      try {
        await doSomething();
      } catch (err) {}
    `);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes("Empty Catch"))).toBe(true);
  });

  it("detects sensitive data in console.log", () => {
    writeFile("src/auth.ts", `
      console.log("User logged in with token:", token);
      console.log("password:", req.body.password);
    `);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes("Sensitive Data Logged"))).toBe(true);
  });

  it("detects Math.random for crypto purposes", () => {
    writeFile("src/utils.ts", `
      const token = Math.random().toString(36).slice(2) + "_secret";
    `);
    const { findings } = scanDirectory(tmpDir);
    expect(findings.some((f) => f.title.includes("Math.random"))).toBe(true);
  });
});

// ── Rate limiting ──────────────────────────────────────────────

describe("Rate limiting detection", () => {
  it("flags missing rate limiting when not in package.json", () => {
    writeFile("package.json", JSON.stringify({ dependencies: { express: "^4.18.0" } }));
    writeFile("src/index.ts", `const app = express()`);
    const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, "package.json"), "utf8"));
    const { findings } = scanDirectory(tmpDir, pkg);
    expect(findings.some((f) => f.title.includes("Rate Limiting"))).toBe(true);
  });

  it("does NOT flag rate limiting when express-rate-limit is installed", () => {
    const pkg = {
      dependencies: {
        "express": "^4.18.0",
        "express-rate-limit": "^7.0.0",
      },
    };
    writeFile("src/index.ts", `const app = express()`);
    const { findings } = scanDirectory(tmpDir, pkg);
    expect(findings.some((f) => f.title.includes("Rate Limiting"))).toBe(false);
  });
});

// ── Stats ──────────────────────────────────────────────────────

describe("Scanner statistics", () => {
  it("returns accurate file and line counts", () => {
    writeFile("src/a.ts", "const a = 1;\nconst b = 2;\n");
    writeFile("src/b.ts", "export default {};\n");
    const { stats } = scanDirectory(tmpDir);
    expect(stats.filesScanned).toBeGreaterThanOrEqual(2);
    expect(stats.linesScanned).toBeGreaterThanOrEqual(3);
  });

  it("counts secrets in stats", () => {
    writeFile("src/config.ts", `
      const key = "${fakeOpenAIKey}";
    `);
    const { stats } = scanDirectory(tmpDir);
    expect(stats.secretsFound).toBeGreaterThanOrEqual(1);
  });
});
