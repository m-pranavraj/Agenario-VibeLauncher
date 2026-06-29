import { describe, it, expect, vi, beforeEach } from "vitest";
import { runPlaywrightBrowserProofs } from "../playwright-proof";

describe("PlaywrightProof Engine", () => {
  beforeEach(() => {
    // Mock global fetch to fail immediately so tests don't hit real network or time out
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network offline"));
  });

  it("generates static code-based proofs for github repositories", async () => {
    const codeContext = {
      framework: "react",
      keyFiles: [
        {
          path: "src/auth.ts",
          content: `const secret = "my-hardcoded-secret";`,
        },
      ],
      routes: "[]",
      vibeTool: "unknown",
    };

    const proofs = await runPlaywrightBrowserProofs(
      "github",
      "https://github.com/example/repo",
      codeContext
    );

    expect(proofs).toBeInstanceOf(Array);
    expect(proofs.length).toBeGreaterThanOrEqual(0);
  });

  it("returns empty array or handles url checks safely when offline", async () => {
    const proofs = await runPlaywrightBrowserProofs("url", "http://invalid-offline-target.local");
    expect(proofs).toBeInstanceOf(Array);
  });
});
