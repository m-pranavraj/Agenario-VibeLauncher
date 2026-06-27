import crypto from "crypto";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import type { CSG } from "./csg-builder.js";
import { logger } from "./logger.js";

const traverse = typeof _traverse === 'function' ? _traverse : (_traverse as any).default;

export interface PromptTraceFinding {
  id: string;
  category: "unsanitized_input_to_llm" | "missing_prompt_sanitizer" | "user_data_in_system_prompt" | "llm_sink_detected";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  confidence: number;
  sourceVariable: string;
  sinkType: string;
  fixPrompt: string;
}

export interface PromptTraceReport {
  findings: PromptTraceFinding[];
  scores: {
    llmSecurityScore: number;
    sanitizationCoverage: number;
  };
  stats: {
    llmEndpoints: number;
    userInputSources: number;
    unsanitizedPaths: number;
    sanitizedPaths: number;
  };
  taintPaths: Array<{
    source: string;
    sink: string;
    filePath: string;
    sanitized: boolean;
  }>;
}

interface LLMEndpoint {
  provider: "openai" | "anthropic" | "groq" | "cerebras" | "generic";
  functionName: string;
  filePath: string;
  lineNumber: number;
  variableName: string;
  isUserControlled: boolean;
  hasSanitizer: boolean;
}

interface UserInputSource {
  variableName: string;
  sourceType: "req.body" | "req.query" | "req.params" | "form_input" | "url_param" | "file_upload";
  filePath: string;
  lineNumber: number;
}

const LLM_API_PATTERNS = [
  { provider: "openai" as const, pattern: /openai\.chat\.completions\.create|new OpenAI|\bopenai\./i },
  { provider: "anthropic" as const, pattern: /anthropic\.messages\.create|new Anthropic|@anthropic-ai/i },
  { provider: "groq" as const, pattern: /groq-sdk|new Groq|\bgroq\./i },
  { provider: "cerebras" as const, pattern: /cerebras|api\.cerebras\.ai/i },
  { provider: "generic" as const, pattern: /chat\.completions\.create|messages\.create|completion|llm|ai\.(complete|chat)/i },
];

const USER_INPUT_PATTERNS = [
  { sourceType: "req.body" as const, pattern: /\breq\.body\b/ },
  { sourceType: "req.query" as const, pattern: /\breq\.query\b/ },
  { sourceType: "req.params" as const, pattern: /\breq\.params\b/ },
  { sourceType: "req.query" as const, pattern: /\breq\.query\.\w+/ },
  { sourceType: "req.params" as const, pattern: /\breq\.params\.\w+/ },
  { sourceType: "form_input" as const, pattern: /\bform\.(get|data|entries)\b|\bnew FormData\b/ },
  { sourceType: "url_param" as const, pattern: /\bsearchParams\b|\bURLSearchParams\b|\bwindow\.location\.search/ },
  { sourceType: "file_upload" as const, pattern: /\bmulter\b|\bupload\.single\b|\bupload\.array\b|\b(req\.file|req\.files)\b/ },
];

const SANITIZER_PATTERNS = [
  /\bDOMPurify\b/,
  /\bsanitize\b/,
  /\bescape\b/,
  /\bencodeURIComponent\b/,
  /\bvalidate\b/,
  /\bparse\s*\(/,
  /\bz\.object\b/,
  /\bjoi\b/,
  /\byup\b/,
  /\bvalidator\b/,
  /\b.strip\b/,
  /\bHtmlSanitizer\b/,
  /\bpurify\b/,
  /\bfilter\s*\(/,
  /\binput\s*:\s*string\b/,
];

export function runPromptTrace(
  keyFiles: Array<{ path: string; content: string }>,
  csg?: CSG,
): PromptTraceReport {
  const findings: PromptTraceFinding[] = [];
  const llmEndpoints: LLMEndpoint[] = [];
  const userInputSources: UserInputSource[] = [];
  const taintPaths: PromptTraceReport["taintPaths"] = [];

  const allContent = keyFiles.map(f => f.content).join("\n");

  for (const file of keyFiles) {
    if (!file.content) continue;
    const lines = file.content.split("\n");

    const ast = (() => {
      try {
        return parse(file.content, {
          sourceType: "module",
          plugins: ["jsx", "typescript", "decorators-legacy"],
          errorRecovery: true,
        });
      } catch { return null; }
    })();

    for (const up of USER_INPUT_PATTERNS) {
      let match: RegExpExecArray | null;
      const re = new RegExp(up.pattern.source, "gi");
      while ((match = re.exec(file.content)) !== null) {
        const lineNum = file.content.substring(0, match.index).split("\n").length;
        const line = lines[lineNum - 1] || "";
        const varName = extractVariableName(line);

        userInputSources.push({
          variableName: varName || match[0],
          sourceType: up.sourceType,
          filePath: file.path,
          lineNumber: lineNum,
        });
      }
    }

    for (const lp of LLM_API_PATTERNS) {
      let match: RegExpExecArray | null;
      const re = new RegExp(lp.pattern.source, "gi");
      while ((match = re.exec(file.content)) !== null) {
        const lineNum = file.content.substring(0, match.index).split("\n").length;
        const line = lines[lineNum - 1] || "";
        const varName = extractVariableName(line);

        const contextBefore = file.content.substring(Math.max(0, match.index - 500), match.index);
        const contextAfter = file.content.substring(match.index, match.index + 500);
        const nearContext = contextBefore + contextAfter;

        const sanitizersNearby = SANITIZER_PATTERNS.some(sp => sp.test(nearContext));

        const isUserControlled = userInputSources.some(u =>
          u.filePath === file.path &&
          (sanitizersNearby ? false : true)
        );

        llmEndpoints.push({
          provider: lp.provider,
          functionName: varName,
          filePath: file.path,
          lineNumber: lineNum,
          variableName: varName,
          isUserControlled: isUserControlled,
          hasSanitizer: sanitizersNearby,
        });
      }
    }
  }

  for (const ep of llmEndpoints) {
    if (!ep.hasSanitizer) {
      const id = `PT-${ep.provider}-${ep.filePath.split("/").pop()}-${ep.lineNumber}-${crypto.randomUUID().slice(0, 8)}`;

      const finding: PromptTraceFinding = {
        id,
        category: "unsanitized_input_to_llm",
        severity: ep.provider === "openai" || ep.provider === "anthropic" ? "critical" : "high",
        title: `Unsanitized input flows to ${ep.provider} LLM API`,
        description: `User-controlled input reaches the ${ep.provider} API call at ${ep.filePath}:${ep.lineNumber} without input sanitization. This enables prompt injection — an attacker can override the system prompt, extract conversation history, or make the LLM execute unauthorized actions.`,
        evidence: `${ep.filePath}:${ep.lineNumber} — ${ep.provider} API call`,
        filePath: ep.filePath,
        lineNumber: ep.lineNumber,
        codeSnippet: extractLine(keyFiles, ep.filePath, ep.lineNumber),
        confidence: ep.hasSanitizer ? 50 : 94,
        sourceVariable: ep.variableName,
        sinkType: `${ep.provider}_completion`,
        fixPrompt: `Add input sanitization before the LLM call at ${ep.filePath}:${ep.lineNumber}. Use a Zod schema to validate all user inputs: \`const schema = z.object({ prompt: z.string().max(2000).strip() })\`. Apply DOMPurify for HTML inputs. Never interpolate user input directly into system prompts. Use a separate messages array for user content vs system content.`,
      };

      findings.push(finding);

      taintPaths.push({
        source: ep.variableName || "unknown",
        sink: `${ep.provider}_api`,
        filePath: ep.filePath,
        sanitized: false,
      });
    }
  }

  for (const ep of llmEndpoints) {
    if (ep.hasSanitizer) {
      taintPaths.push({
        source: ep.variableName || "unknown",
        sink: `${ep.provider}_api`,
        filePath: ep.filePath,
        sanitized: true,
      });
    }
  }

  const userInputTotal = userInputSources.length;
  const unsanitizedPaths = llmEndpoints.filter(e => !e.hasSanitizer).length;
  const sanitizedPaths = llmEndpoints.filter(e => e.hasSanitizer).length;

  const sanitizationCoverage = llmEndpoints.length > 0
    ? Math.round((sanitizedPaths / llmEndpoints.length) * 100)
    : 100;

  const llmSecurityScore = Math.max(0, 100 - findings.reduce((s, f) => {
    switch (f.severity) {
      case "critical": return s + 40;
      case "high": return s + 20;
      case "medium": return s + 10;
      default: return s + 5;
    }
  }, 0));

  logger.info({
    totalFindings: findings.length,
    llmEndpoints: llmEndpoints.length,
    userInputSources: userInputSources.length,
    sanitizationCoverage,
    llmSecurityScore,
  }, "PromptTrace LLM boundary guard complete");

  return {
    findings,
    scores: {
      llmSecurityScore,
      sanitizationCoverage,
    },
    stats: {
      llmEndpoints: llmEndpoints.length,
      userInputSources: userInputSources.length,
      unsanitizedPaths,
      sanitizedPaths,
    },
    taintPaths,
  };
}

function extractVariableName(line: string): string {
  const asgn = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*/);
  if (asgn) return asgn[1];

  const param = line.match(/(?:async\s+)?function\s+(\w+)/);
  if (param) return param[1];

  const arrow = line.match(/(\w+)\s*[:=]\s*(?:async\s*)?\(/);
  if (arrow) return arrow[1];

  return "unnamed";
}

function extractLine(
  keyFiles: Array<{ path: string; content: string }>,
  filePath: string,
  lineNum: number,
): string {
  const file = keyFiles.find(f => f.path === filePath);
  if (!file) return "";
  const lines = file.content.split("\n");
  const start = Math.max(0, lineNum - 2);
  const end = Math.min(lines.length, lineNum + 1);
  return lines.slice(start, end).join("\n").substring(0, 300);
}
