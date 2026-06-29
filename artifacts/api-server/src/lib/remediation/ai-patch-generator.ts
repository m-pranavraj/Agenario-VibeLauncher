/**
 * Phase 11 — AI Patch Generator
 * Uses Groq (or OpenAI fallback) to generate context-aware code patches for security issues.
 * Structured output: patchedCode + explanation + safetyNotes.
 */

import { logger } from "../logger.js";

export interface AIPatchRequest {
  issueTitle: string;
  issueSeverity: string;
  issueDescription: string;
  fixPrompt?: string;
  filePath: string;
  lineNumber?: number;
  codeSnippet: string;    // The specific vulnerable code
  fullFileCode?: string;  // Optional full file for more context
  language: string;
}

export interface AIPatchResult {
  patchedCode: string;
  explanation: string;
  safetyNotes: string;
  confidence: number;     // 0–100
  model: string;          // Which model was used
}

const SYSTEM_PROMPT = `You are a senior security engineer and automated code remediation engine.
Your job is to generate minimal, safe, production-ready code fixes for security vulnerabilities.

Rules:
1. Only change what is strictly necessary to fix the specific vulnerability. Preserve all other logic.
2. Do not add comments unless they explain a critical security decision.
3. Do not change function signatures, exports, or module structure.
4. For TypeScript/JavaScript: use the same coding style as the original (single vs double quotes, tabs vs spaces).
5. If the fix requires importing a package, add only that import, nothing else.
6. Return ONLY valid JSON. No markdown, no prose, no code fences outside the JSON values.

Output format (strict JSON, no trailing commas):
{
  "patchedCode": "<the full fixed code snippet, ready to replace the original>",
  "explanation": "<1-2 sentence plain-English description of what was changed and why>",
  "safetyNotes": "<any important considerations about the fix, edge cases, or follow-up actions needed>",
  "confidence": <integer 0-100 indicating how confident you are this fix is correct and complete>
}`;

function buildPrompt(req: AIPatchRequest): string {
  return `## Security Issue
Title: ${req.issueTitle}
Severity: ${req.issueSeverity}
Description: ${req.issueDescription}
${req.fixPrompt ? `Fix Guidance: ${req.fixPrompt}` : ""}

## Affected Code
File: ${req.filePath}${req.lineNumber ? `:${req.lineNumber}` : ""}
Language: ${req.language}

\`\`\`${req.language}
${req.codeSnippet}
\`\`\`
${req.fullFileCode && req.fullFileCode.length < 8000 ? `\n## Full File Context\n\`\`\`${req.language}\n${req.fullFileCode}\n\`\`\`` : ""}

## Task
Generate a minimal, secure fix for the vulnerability above. Return strict JSON only.`;
}

async function callGroq(prompt: string): Promise<AIPatchResult | null> {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "Groq API returned non-200 status");
      return null;
    }

    const data = await response.json() as any;
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return {
      patchedCode: parsed.patchedCode || "",
      explanation: parsed.explanation || "",
      safetyNotes: parsed.safetyNotes || "",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 70,
      model: "groq/llama3-70b",
    };
  } catch (err) {
    logger.warn({ err }, "Groq patch generation failed");
    return null;
  }
}

async function callOpenAI(prompt: string): Promise<AIPatchResult | null> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json() as any;
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return {
      patchedCode: parsed.patchedCode || "",
      explanation: parsed.explanation || "",
      safetyNotes: parsed.safetyNotes || "",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 65,
      model: "openai/gpt-4o-mini",
    };
  } catch (err) {
    logger.warn({ err }, "OpenAI patch generation failed");
    return null;
  }
}

/**
 * Generate an AI patch for a security issue.
 * Tries Groq first (fastest), falls back to OpenAI.
 */
export async function generateAIPatch(req: AIPatchRequest): Promise<AIPatchResult | null> {
  const prompt = buildPrompt(req);

  // Try Groq first (fastest and cheapest)
  const groqResult = await callGroq(prompt);
  if (groqResult && groqResult.patchedCode) return groqResult;

  // Fallback to OpenAI
  const openaiResult = await callOpenAI(prompt);
  if (openaiResult && openaiResult.patchedCode) return openaiResult;

  logger.warn({ issueTitle: req.issueTitle }, "All AI patch generators failed — no AI patch available");
  return null;
}
