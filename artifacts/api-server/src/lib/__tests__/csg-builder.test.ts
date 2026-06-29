import { describe, it, expect } from "vitest";
import { buildCSG } from "../csg-builder";

describe("CSGBuilder — basic functionality", () => {
  it("builds an empty CSG for no files", () => {
    const csg = buildCSG([]);
    expect(csg.nodes.size).toBe(0);
    expect(csg.edges.length).toBe(0);
  });

  it("extracts functions from simple javascript code", () => {
    const keyFiles = [
      {
        path: "src/auth.ts",
        content: `
          function hashPassword(password) {
            return password;
          }
        `,
      },
    ];

    const csg = buildCSG(keyFiles);
    const nodes = Array.from(csg.nodes.values());
    expect(nodes.some(n => n.label === "hashPassword" && n.type === "function")).toBe(true);
  });

  it("detects sources and sinks in simple input/output flow", () => {
    const keyFiles = [
      {
        path: "src/routes.ts",
        content: `
          const input = req.query.name;
          eval(input);
        `,
      },
    ];

    const csg = buildCSG(keyFiles);
    const nodes = Array.from(csg.nodes.values());
    expect(nodes.some(n => n.type === "source" || n.meta.isSource)).toBe(true);
    expect(nodes.some(n => n.type === "sink" || n.meta.isSink)).toBe(true);
  });

  it("correctly identifies try-catch control flow structures", () => {
    const keyFiles = [
      {
        path: "src/try.ts",
        content: `
          function runDangerousTask() {
            try {
              doSomethingDangerous();
            } catch (err) {
              console.error(err);
            }
          }
        `,
      },
    ];

    const csg = buildCSG(keyFiles);
    const nodes = Array.from(csg.nodes.values());
    expect(nodes.some(n => n.type === "try_catch")).toBe(true);
  });
});
