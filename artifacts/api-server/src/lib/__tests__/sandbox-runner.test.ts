import { describe, it, expect, vi } from "vitest";
import { runGithubboxSandbox } from "../sandbox-runner";

vi.mock("../sandbox-eligibility.js", () => ({
  assessSandboxEligibility: vi.fn().mockReturnValue({
    eligible: false,
    reason: "Missing package.json start script or compatible server framework.",
    blockers: [],
  }),
}));

describe("SandboxRunner — pre-flight and validation", () => {
  it("skips sandbox run for local url source type", async () => {
    const result = await runGithubboxSandbox({
      scanId: 1,
      dir: "",
      packageJson: {},
      framework: "react",
      sourceType: "url",
    });

    expect(result.meta.status).toBe("skipped");
    expect(result.meta.reason).toContain("applies only to GitHub repositories");
    expect(result.proofs).toEqual([]);
  });

  it("handles ineligible repository or package setup gracefully", async () => {
    const result = await runGithubboxSandbox({
      scanId: 2,
      dir: "/tmp/ineligible-repo",
      packageJson: {},
      framework: "unknown",
      sourceType: "github",
    });

    expect(result.meta.status).toBe("ineligible");
    expect(result.meta.reason).toContain("Missing package.json start script");
    expect(result.proofs).toEqual([]);
    expect(result.steps.some(s => s.status === "fail")).toBe(true);
  });
});
