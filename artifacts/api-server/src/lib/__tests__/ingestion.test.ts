import { describe, it, expect, vi } from "vitest";
import { scanTempDir, ingestGitHubRepo } from "../ingestion";
import { execSync } from "child_process";

vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

describe("Ingestion Engine", () => {
  it("computes correct temp directory paths", () => {
    const p = scanTempDir("test-prefix", 999);
    expect(p).toContain("test-prefix-999");
  });

  it("handles repository ingestion gracefully when git fails", async () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("Git clone failed");
    });

    const result = await ingestGitHubRepo("https://github.com/invalid/repo", 100);
    expect(result).toBeNull();
  });
});
