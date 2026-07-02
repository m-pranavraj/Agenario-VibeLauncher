import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findFunctionCalls, findStringLiterals } from '../engine/ast-utils.js';

export class LLMPromptInjectionRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-AI-001', name: 'Potential LLM Prompt Injection', description: 'Detects unsanitized user input concatenated into LLM prompts', category: 'security-injection', severity: 'high', cwe: 'CWE-94', techniqueNumber: 180, pillar: 1, tags: ['llm', 'prompt-injection', 'ai'] };
  async execute(ctx: RuleContext): Promise<void> {
    const llmCalls = findFunctionCalls(ctx.parsed, c => c.fullName.includes('openai') || c.fullName.includes('generate') || c.fullName.includes('complete') || c.fullName.includes('chat.completions') || c.fullName.includes('prompt'));
    const userInputs = ctx.astIndex?.userInputs || [];
    for (const lc of llmCalls) {
      if (lc.args?.some(a => userInputs.some(u => 'value' in a && typeof (a as any).value === 'string' && (a as any).value.includes(u)))) {
        this.emit(ctx, { title: 'User input directly included in LLM prompt', message: 'User-supplied data included in LLM prompt — attacker can inject instructions via prompt injection', file: lc.file, line: lc.line, confidence: 85, remediation: 'Add input validation/instruction separators, use role-based prompt structure (system/user/assistant)' });
      }
    }
  }
}

export class LLMOutputValidationRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-AI-002', name: 'Missing LLM Output Validation', description: 'Detects LLM output used in code/commands without validation', category: 'security-injection', severity: 'high', cwe: 'CWE-94', techniqueNumber: 181, pillar: 1, tags: ['llm', 'validation', 'ai-safety'] };
  async execute(ctx: RuleContext): Promise<void> {
    const llmOutputs = findStringLiterals(ctx.parsed, s => /response\.choices|completion\.text|model\.response|result\.content|generated.*text|llm.*output/i.test(s));
    const hasValidation = findFunctionCalls(ctx.parsed, c => c.fullName.includes('sanitize') || c.fullName.includes('validate') || c.fullName.includes('escape') || c.methodName === 'sanitize');
    if (llmOutputs.length > 0 && hasValidation.length === 0) {
      this.emit(ctx, { title: 'LLM output used without validation', message: 'LLM-generated content used directly in application without validation — could inject malicious instructions', file: '', line: 1, confidence: 70, remediation: 'Validate and sanitize all LLM outputs before using in application logic or rendering' });
    }
  }
}

export class AISecretLeakRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-AI-003', name: 'AI Agent Secret Exposure', description: 'Detects AI API keys potentially logged or exposed in agent output', category: 'security-crypto', severity: 'critical', cwe: 'CWE-312', techniqueNumber: 182, pillar: 1, tags: ['ai', 'secret', 'exposure'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /sk-[a-zA-Z0-9]{20,}|openai.*key|anthropic.*key|azure.*openai.*key/i.test(s));
    for (const s of strings) {
      if (!s.value.includes('process.env') && !s.value.includes('env.') && s.value.length < 200) {
        this.emit(ctx, { title: 'AI API key potentially hardcoded or logged', message: `AI API key pattern "${s.value.slice(0, 30)}..." may be hardcoded or exposed in logs`, file: s.file, line: s.line, confidence: 90, remediation: 'Store AI API keys in environment variables or secret manager, never log them' });
      }
    }
  }
}

export class AICodeExecutionRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-AI-004', name: 'AI-Generated Code Execution', description: 'Detects eval/exec of AI-generated code', category: 'security-injection', severity: 'critical', cwe: 'CWE-95', techniqueNumber: 183, pillar: 1, tags: ['ai', 'code-execution', 'rce'] };
  async execute(ctx: RuleContext): Promise<void> {
    const llmOutputs = findStringLiterals(ctx.parsed, s => /response\.choices|completion\.text|model\.response/i.test(s));
    const evals = findFunctionCalls(ctx.parsed, c => c.methodName === 'eval' || c.methodName === 'Function' || c.fullName.includes('vm.run') || c.fullName.includes('child_process'));
    for (const e of evals) {
      for (const lo of llmOutputs) {
        if (e.file === lo.file) {
          this.emit(ctx, { title: 'AI-generated content may be passed to eval/exec', message: 'LLM output in same file as eval/exec call — executing AI-generated code can lead to RCE', file: e.file, line: e.line, confidence: 80, remediation: 'Never execute AI-generated code directly. Use constrained output templates with strict validation' });
        }
      }
    }
  }
}
