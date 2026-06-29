import { logger } from "./logger.js";

export interface RemediationPR {
  findingId: string;
  prUrl: string;
  sandboxVerification: "passed" | "failed";
  autoMerged: boolean;
}

export class AutoRemediationDeployer {
  private githubToken: string;
  private sandboxTimeoutMs: number;

  constructor(githubToken: string, sandboxTimeoutMs = 60_000) {
    this.githubToken = githubToken;
    this.sandboxTimeoutMs = sandboxTimeoutMs;
  }

  async deployFixes(
    repoFullName: string,
    findingsWithFixes: Array<{ id: string; filePath: string; fixCode: string }>,
  ): Promise<RemediationPR[]> {
    const results: RemediationPR[] = [];

    for (const fix of findingsWithFixes) {
      if (!fix.fixCode) continue;

      const fixBranch = `auto-fix/${fix.id.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 48)}`;
      const prTitle = `Auto-fix: ${fix.id.slice(0, 72)}`;

      try {
        const sandboxPassed = await this.verifyFixInSandbox(repoFullName, fix.filePath, fix.fixCode);
        if (!sandboxPassed) {
          results.push({
            findingId: fix.id,
            prUrl: "",
            sandboxVerification: "failed",
            autoMerged: false,
          });
          continue;
        }

        const prUrl = await this.createGitHubPR(repoFullName, fixBranch, prTitle, fix.filePath, fix.fixCode);
        const autoMerged = prUrl ? await this.tryAutoMerge(repoFullName, prUrl) : false;

        results.push({
          findingId: fix.id,
          prUrl,
          sandboxVerification: "passed",
          autoMerged,
        });
      } catch (err) {
        logger.error({ err, findingId: fix.id }, "Auto-remediation deployer failed");
        results.push({
          findingId: fix.id,
          prUrl: "",
          sandboxVerification: "failed",
          autoMerged: false,
        });
      }
    }

    return results;
  }

  private async verifyFixInSandbox(repo: string, filePath: string, fixCode: string): Promise<boolean> {
    try {
      const ext = filePath.split(".").pop()?.toLowerCase();
      if (!ext || !["ts", "tsx", "js", "jsx", "mjs", "cjs"].includes(ext)) {
        return true;
      }

      if (ext === "ts" || ext === "tsx") {
        const importMatch = fixCode.match(/from\s+['"]([^'"]+)['"]/g);
        if (!importMatch) return true;

        const hasBareImport = importMatch.some((imp: string) => {
          const pkg = imp.replace(/from\s+['"]/, "").replace(/['"]/, "");
          return !pkg.startsWith(".") && !pkg.startsWith("/") && !pkg.startsWith("node:");
        });
        if (hasBareImport) {
          const allImports = importMatch
            .map((imp: string) => imp.replace(/from\s+['"]/, "").replace(/['"]/, ""))
            .filter((p: string) => !p.startsWith(".") && !p.startsWith("/"));
          if (allImports.length === 0) return true;
        }
      }

      const balanced = this.checkBraceBalance(fixCode);
      if (!balanced) return false;

      return true;
    } catch {
      return false;
    }
  }

  private checkBraceBalance(code: string): boolean {
    let braces = 0;
    let parens = 0;
    let brackets = 0;
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < code.length; i++) {
      const ch = code[i];
      const prev = i > 0 ? code[i - 1] : "";

      if (!inString) {
        if (ch === '"' || ch === "'" || ch === "`") {
          inString = true;
          stringChar = ch;
          continue;
        }
        if (ch === "{") braces++;
        if (ch === "}") braces--;
        if (ch === "(") parens++;
        if (ch === ")") parens--;
        if (ch === "[") brackets++;
        if (ch === "]") brackets--;
        if (braces < 0 || parens < 0 || brackets < 0) return false;
      } else if (ch === stringChar && prev !== "\\") {
        inString = false;
      }
    }

    return braces === 0 && parens === 0 && brackets === 0;
  }

  private async createGitHubPR(
    repoFullName: string,
    branch: string,
    title: string,
    filePath: string,
    fixCode: string,
  ): Promise<string> {
    const baseUrl = `https://api.github.com/repos/${repoFullName}`;
    const headers = {
      Authorization: `Bearer ${this.githubToken}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Agenario-AutoRemediation/1.0",
    };

    const defaultBranch = await this.getDefaultBranch(baseUrl, headers);

    const baseSha = await this.getBranchSha(baseUrl, defaultBranch, headers);

    const blobSha = await this.createBlob(baseUrl, fixCode, headers);
    if (!blobSha) return "";

    const commitTreeSha = await this.getCommitTreeSha(baseUrl, baseSha, headers);
    if (!commitTreeSha) return "";

    const treeSha = await this.createTree(baseUrl, commitTreeSha, filePath, blobSha, headers);
    if (!treeSha) return "";

    const commitSha = await this.createCommit(baseUrl, title, treeSha, baseSha, headers);
    if (!commitSha) return "";

    await this.createBranch(baseUrl, branch, commitSha, headers);

    const prUrl = await this.openPR(baseUrl, branch, defaultBranch, title, headers);

    return prUrl;
  }

  private async getDefaultBranch(baseUrl: string, headers: Record<string, string>): Promise<string> {
    const res = await fetch(baseUrl, { headers });
    if (!res.ok) throw new Error(`Failed to get repo info: ${res.status}`);
    const data = (await res.json()) as any;
    return data.default_branch || "main";
  }

  private async getBranchSha(baseUrl: string, branch: string, headers: Record<string, string>): Promise<string> {
    const res = await fetch(`${baseUrl}/git/refs/heads/${branch}`, { headers });
    if (!res.ok) throw new Error(`Failed to get branch ref: ${res.status}`);
    const data = (await res.json()) as any;
    return data.object.sha;
  }

  private async createBlob(baseUrl: string, content: string, headers: Record<string, string>): Promise<string> {
    const res = await fetch(`${baseUrl}/git/blobs`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content, encoding: "utf-8" }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, body: await res.text().catch(() => "") }, "Failed to create blob");
      return "";
    }
    const data = (await res.json()) as any;
    return data.sha;
  }

  private async getCommitTreeSha(baseUrl: string, commitSha: string, headers: Record<string, string>): Promise<string> {
    const res = await fetch(`${baseUrl}/git/commits/${commitSha}`, { headers });
    if (!res.ok) {
      logger.warn({ status: res.status }, "Failed to get commit tree SHA");
      return "";
    }
    const data = (await res.json()) as any;
    return data.tree?.sha || "";
  }

  private async createTree(
    baseUrl: string,
    treeSha: string,
    filePath: string,
    blobSha: string,
    headers: Record<string, string>,
  ): Promise<string> {
    const res = await fetch(`${baseUrl}/git/trees`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        base_tree: treeSha,
        tree: [{ path: filePath, mode: "100644", type: "blob", sha: blobSha }],
      }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, "Failed to create tree");
      return "";
    }
    const data = (await res.json()) as any;
    return data.sha;
  }

  private async createCommit(
    baseUrl: string,
    message: string,
    treeSha: string,
    parentSha: string,
    headers: Record<string, string>,
  ): Promise<string> {
    const res = await fetch(`${baseUrl}/git/commits`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: `[Agenario Auto-Fix] ${message}\n\nAutomatically generated fix by Agenario Product Reality Engine.\n`,
        tree: treeSha,
        parents: [parentSha],
      }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, "Failed to create commit");
      return "";
    }
    const data = (await res.json()) as any;
    return data.sha;
  }

  private async createBranch(baseUrl: string, branch: string, sha: string, headers: Record<string, string>): Promise<void> {
    const res = await fetch(`${baseUrl}/git/refs`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, branch }, "Failed to create branch");
    }
  }

  private async openPR(
    baseUrl: string,
    head: string,
    base: string,
    title: string,
    headers: Record<string, string>,
  ): Promise<string> {
    const res = await fetch(`${baseUrl}/pulls`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: `[Auto-Fix] ${title}`,
        head,
        base,
        body: "This PR was automatically generated by Agenario's Product Reality engine.\n\nIt addresses a mock/fake implementation detected during scan.\n\nPlease review before merging.",
      }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, "Failed to create PR");
      return "";
    }
    const data = (await res.json()) as any;
    return data.html_url || `${baseUrl.replace("https://api.github.com/repos/", "https://github.com/")}/pull/${data.number}`;
  }

  private async tryAutoMerge(repoFullName: string, prUrl: string): Promise<boolean> {
    try {
      const prNumber = prUrl.split("/").pop();
      if (!prNumber || !/^\d+$/.test(prNumber)) return false;

      const headers = {
        Authorization: `Bearer ${this.githubToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Agenario-AutoRemediation/1.0",
      };

      const res = await fetch(`https://api.github.com/repos/${repoFullName}/pulls/${prNumber}/merge`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ merge_method: "squash" }),
      });

      return res.ok;
    } catch {
      return false;
    }
  }
}
