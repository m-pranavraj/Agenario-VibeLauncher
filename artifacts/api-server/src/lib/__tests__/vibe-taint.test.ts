import { describe, it, expect } from "vitest";
import { runVibeTaint } from "../vibe-taint";

describe("VibeTaint Engine", () => {
  it("runs on clean empty project with no findings", () => {
    const result = runVibeTaint([]);
    expect(result.findings).toEqual([]);
    expect(result.stats.taintedPaths).toBe(0);
  });

  it("detects taint flow from user input query param to dangerous sink", () => {
    const keyFiles = [
      {
        path: "src/db.ts",
        content: `
          app.get('/search', (req, res) => {
            const query = req.query.q;
            db.query(\`SELECT * FROM products WHERE name = \${query}\`);
          });
        `,
      },
    ];

    const result = runVibeTaint(keyFiles);
    expect(result.findings.length).toBeGreaterThan(0);
    const hasSqli = result.findings.some(
      f => f.category === "sqli" || f.title.includes("Tainted data")
    );
    expect(hasSqli).toBe(true);
  });

  it("untaints data when a sanitizer is present", () => {
    const keyFiles = [
      {
        path: "src/safe.ts",
        content: `
          app.get('/search', (req, res) => {
            const query = req.query.q;
            const safeQuery = parseInt(query, 10);
            db.query(\`SELECT * FROM products WHERE name = \${safeQuery}\`);
          });
        `,
      },
    ];

    const result = runVibeTaint(keyFiles);
    // Should mark the flow as sanitized or reduce its severity/presence
    const activeFindings = result.findings.filter(f => f.severity === "critical" || f.severity === "high");
    expect(activeFindings.length).toBe(0);
  });
});
