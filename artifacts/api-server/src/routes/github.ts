import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { scansTable as scans } from "@workspace/db/schema";
import { runAllAgents } from "../lib/agents.js";
import { logger } from "../lib/logger.js";

const router = Router();

function verifyGithubSignature(payload: Buffer, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const digest = `sha256=${hmac.digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

// GitHub App webhook — receives PR events and runs a scan
router.post("/github/webhook", async (req, res) => {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const event = req.headers["x-github-event"] as string | undefined;
  const webhookSecret = process.env["GITHUB_WEBHOOK_SECRET"] ?? "";

  if (webhookSecret && signature) {
    const rawBody = req.body as Buffer;
    if (!verifyGithubSignature(rawBody, signature, webhookSecret)) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }

  if (event !== "pull_request") {
    res.status(200).json({ ok: true, message: "Event ignored" });
    return;
  }

  const payload = req.body as Record<string, unknown>;
  const action = payload["action"];

  if (action !== "opened" && action !== "synchronize" && action !== "reopened") {
    res.status(200).json({ ok: true, message: "PR action ignored" });
    return;
  }

  const pr = payload["pull_request"] as Record<string, unknown> | undefined;
  if (!pr) {
    res.status(400).json({ error: "No pull_request in payload" });
    return;
  }

  const repoUrl = (payload["repository"] as Record<string, unknown>)?.["html_url"] as string;
  const prNumber = pr["number"];
  const prTitle = pr["title"] as string;
  const prUrl = pr["html_url"] as string;

  logger.info({ repo: repoUrl, pr: prNumber }, "GitHub PR webhook — starting scan");

  // Fire-and-forget scan (respond immediately to GitHub, scan in background)
  res.status(200).json({
    ok: true,
    message: "Scan queued",
    pr: prNumber,
    verdict_url: `${process.env["APP_URL"] ?? ""}/api/github/pr-status/${prNumber}`,
  });

  // Background scan
  setImmediate(async () => {
    try {
      const result = await runAllAgents(
        "github",
        repoUrl ?? "unknown",
        `PR #${prNumber}: ${prTitle}`,
        null,
      );

      // Save scan to DB under a system user (userId = null for webhook scans)
      const [savedScan] = await db
        .insert(scans)
        .values({
          userId: 1, // system user — would normally map to the GitHub app installation
          sourceType: "github",
          sourceInput: repoUrl,
          appDescription: `GitHub PR #${prNumber}: ${prTitle} — ${prUrl}`,
          status: "completed",
          score: result.score,
          summary: result.summary,
          launchVerdict: result.launchVerdict,
          issueCounts: result.issueCounts,
        })
        .returning();

      logger.info({ scanId: savedScan?.id, verdict: result.launchVerdict }, "GitHub PR scan complete");
    } catch (err) {
      logger.error({ err }, "GitHub PR webhook scan failed");
    }
  });
});

// Get PR scan verdict (called by CI/CD or GitHub App to check result)
router.get("/github/pr-status/:prNumber", async (req, res) => {
  const prNumber = Number(req.params["prNumber"]);
  if (isNaN(prNumber)) {
    res.status(400).json({ error: "Invalid PR number" });
    return;
  }

  const scan = await db.query.scans.findFirst({
    where: (s, { like }) => like(s.appDescription, `%PR #${prNumber}%`),
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });

  if (!scan) {
    res.status(404).json({ error: "No scan found for this PR" });
    return;
  }

  const blocked = scan.launchVerdict === "do-not-launch";

  res.json({
    pr: prNumber,
    scanId: scan.id,
    score: scan.score,
    verdict: scan.launchVerdict,
    summary: scan.summary,
    blocked,
    reportUrl: `${process.env["APP_URL"] ?? ""}/scans/${scan.id}`,
    message: blocked
      ? `🛑 Agenario: DO NOT MERGE — Score ${scan.score}/100. Critical issues found. See full report.`
      : scan.launchVerdict === "caution"
        ? `⚠️ Agenario: Launch with Caution — Score ${scan.score}/100. Review findings before merge.`
        : `✅ Agenario: Clear to merge — Score ${scan.score}/100. No critical blockers.`,
  });
});

// CI/CD status check endpoint — returns GitHub Actions compatible exit signal
router.get("/github/ci-check", async (req, res) => {
  const repo = req.query["repo"] as string | undefined;
  const threshold = Number(req.query["threshold"] ?? 70);

  if (!repo) {
    res.status(400).json({ error: "repo query param required" });
    return;
  }

  const scan = await db.query.scans.findFirst({
    where: (s, { eq }) => eq(s.sourceInput, repo),
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  });

  if (!scan) {
    res.status(404).json({ pass: false, reason: "No scan found for this repo" });
    return;
  }

  const pass = (scan.score ?? 0) >= threshold && scan.launchVerdict !== "do-not-launch";

  res.status(pass ? 200 : 422).json({
    pass,
    score: scan.score,
    verdict: scan.launchVerdict,
    threshold,
    reportUrl: `${process.env["APP_URL"] ?? ""}/scans/${scan.id}`,
  });
});

export default router;
