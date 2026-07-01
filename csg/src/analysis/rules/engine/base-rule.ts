import type { Rule, RuleContext, RuleFinding, RuleMeta } from './types.js';

export abstract class BaseRule implements Rule {
  abstract meta: RuleMeta;

  async initialize(_ctx: RuleContext): Promise<void> {}

  abstract execute(ctx: RuleContext): Promise<void> | void;

  protected createFinding(
    ctx: RuleContext,
    overrides: Partial<RuleFinding> & { title: string; message: string; file: string; line: number }
  ): RuleFinding {
    const finding: RuleFinding = {
      id: `${this.meta.id}-${overrides.file}:${overrides.line}:${Date.now()}`,
      ruleId: this.meta.id,
      severity: this.meta.severity,
      category: this.meta.category,
      column: 0,
      confidence: 85,
      ...overrides,
    };
    return finding;
  }

  protected emit(ctx: RuleContext, overrides: Partial<RuleFinding> & { title: string; message: string; file: string; line: number }): void {
    ctx.addFinding(this.createFinding(ctx, overrides));
  }
}
