import { Router } from "express";
import { callWithFallback } from "../lib/agents.js";
import { logger } from "../lib/logger.js";

const router = Router();

const CONSENSUS_SYSTEM_MESSAGE = `You are a compiler-security consensus engine. Return only valid JSON with this exact shape: {"featureConsensus": {"feature": string, "confidence": number, "verdict": string, "reasoning": string[]}[], "fileTriage": {"path": string, "classification": string, "confidence": number, "rationale": string}[], "globalReadiness": number, "summary": string}. Rules: classify mockup files, duplicate files, and unnecessary markdown/orphan docs using both deterministic evidence and security-review reasoning; preserve production files as keep or review. Do not include markdown fences or prose outside JSON.`;

const PATCH_SYSTEM_MESSAGE = `You are a secure compiler refactoring engine. Return only valid JSON with this exact shape: {"format":"unified-diff"|"json-ast","patchedCode":string,"diff":string,"operations":string[]}. Do not include markdown fences or explanations.`;

function fallbackConsensus(params: any) {
  return {
    featureConsensus: [
      {
        feature: "runtime",
        confidence: 0.41,
        verdict: "mixed",
        reasoning: ["Fallback retained deterministic runtime analysis because structured AI consensus was unavailable."],
      },
      {
        feature: "graph",
        confidence: 0.41,
        verdict: "mixed",
        reasoning: ["Fallback retained deterministic graph analysis because structured AI consensus was unavailable."],
      },
      {
        feature: "verify",
        confidence: 0.41,
        verdict: "mixed",
        reasoning: ["Fallback retained deterministic verification analysis because structured AI consensus was unavailable."],
      },
      {
        feature: "shaker",
        confidence: 0.41,
        verdict: "mixed",
        reasoning: ["Fallback retained deterministic file-hygiene analysis because structured AI consensus was unavailable."],
      },
    ],
    fileTriage: (params.files || []).slice(0, 12).map((file: any) => ({
      path: file.path,
      classification: file.reasons?.some((r: string) => r.toLowerCase().includes("mock"))
        ? "mock"
        : file.path.endsWith(".md") && !file.live
          ? "orphan-doc"
          : file.reasons?.some((r: string) => r.toLowerCase().includes("duplicate"))
            ? "duplicate"
            : file.live
              ? "keep"
              : "review",
      confidence: 0.35,
      rationale: "Fallback triage inferred from deterministic evidence because structured AI consensus was unavailable.",
    })),
    globalReadiness: Math.max(0, 100 - (params.projectStats?.criticalIssues || 0) * 12 - (params.projectStats?.deadFiles || 0) * 2),
    summary: "Fallback consensus only; deterministic engine remains authoritative until structured AI consensus succeeds.",
  };
}

// 1. Analyze Consensus
router.post("/compiler/analyze-consensus", async (req, res) => {
  try {
    const params = req.body;
    const responseText = await callWithFallback(
      [
        { role: "system", content: CONSENSUS_SYSTEM_MESSAGE },
        { role: "user", content: JSON.stringify(params) },
      ],
      { model: "gpt-4o-mini", useSmart: false },
    );

    try {
      const parsed = JSON.parse(responseText);
      if (parsed && typeof parsed === "object") {
        res.json(parsed);
        return;
      }
      res.json(fallbackConsensus(params));
    } catch {
      res.json(fallbackConsensus(params));
    }
  } catch (error: any) {
    logger.warn({ error }, "Error running analyze-consensus");
    res.json(fallbackConsensus(req.body));
  }
});

// 2. Generate Patch
router.post("/compiler/generate-patch", async (req, res) => {
  const { originalCode, issueTitle, issueExcerpt, rationale } = req.body;

  try {
    const instruction = [
      "Produce a minimal secure refactor patch.",
      `Issue: ${issueTitle}`,
      `Excerpt: ${issueExcerpt}`,
      `Rationale: ${rationale}`,
      "Return strict JSON only.",
      `Original code:\n${originalCode}`,
    ].join("\n\n");

    const responseText = await callWithFallback(
      [
        { role: "system", content: PATCH_SYSTEM_MESSAGE },
        { role: "user", content: instruction },
      ],
      { model: "gpt-4o-mini", useSmart: false },
    );

    try {
      const parsed = JSON.parse(responseText);
      res.json(parsed);
    } catch {
      res.json({
        format: "unified-diff",
        patchedCode: originalCode,
        diff: "--- original\n+++ patched\n",
        operations: ["Provider returned non-JSON output; local fallback should be used."],
      });
    }
  } catch (error: any) {
    res.json({
      format: "unified-diff",
      patchedCode: originalCode,
      diff: "--- original\n+++ patched\n",
      operations: [`AI execution failed: ${error.message}`],
    });
  }
});

export default router;
