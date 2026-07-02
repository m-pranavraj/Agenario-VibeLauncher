import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findFunctionCalls, findStringLiterals } from '../engine/ast-utils.js';

export class WaterfallAPICallsRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-MOD-001', name: 'Waterfall API Calls in Components', description: 'Detects sequential API calls that could be parallelized', category: 'performance-event-loop', severity: 'medium', techniqueNumber: 149, pillar: 2, tags: ['api', 'waterfall', 'performance'] };
  async execute(ctx: RuleContext): Promise<void> {
    const files = ctx.parsed.filter(p => p.file?.match(/\.(jsx|tsx)$/));
    for (const f of files) {
      if (!f.ast) continue;
      const awaitCalls = findFunctionCalls([f], c => c.fullName.includes('await') || c.methodName === 'then');
      if (awaitCalls.length > 3) {
        this.emit(ctx, { title: 'Sequential API calls could be parallelized', message: `File has ${awaitCalls.length} sequential await/then calls — waterfall pattern increases load time`, file: f.file || '', line: awaitCalls[0].line, confidence: 60, remediation: 'Use Promise.all() to parallelize independent API calls' });
      }
    }
  }
}

export class LargeBundleSizeRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-MOD-002', name: 'Large Bundle/Main Thread Work', description: 'Detects patterns that contribute to large bundle size', category: 'performance-event-loop', severity: 'medium', techniqueNumber: 150, pillar: 2, tags: ['bundle', 'performance', 'code-split'] };
  async execute(ctx: RuleContext): Promise<void> {
    const files = ctx.parsed.filter(p => p.file?.match(/\.(jsx|tsx|js|ts)$/) && p.ast);
    for (const f of files) {
      const hasLazy = findFunctionCalls([f], c => c.fullName.includes('lazy') || c.fullName.includes('dynamic'));
      if (hasLazy.length === 0 && f.ast && Object.keys(f.ast as any).length > 100) {
        this.emit(ctx, { title: 'Large file without code-splitting', message: `Large file without React.lazy/dynamic import — contributes to initial bundle size`, file: f.file || '', line: 1, confidence: 45, remediation: 'Use React.lazy() or dynamic() imports for route-level code splitting' });
      }
    }
  }
}

export class UnmemoizedComponentRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-MOD-003', name: 'Unmemoized Expensive Component', description: 'Detects components with expensive computations not wrapped in useMemo/useCallback', category: 'performance-event-loop', severity: 'low', techniqueNumber: 151, pillar: 2, tags: ['react', 'memo', 'performance'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /expensive|heavy|compute|filter|sort|map|reduce/i.test(s) && !s.includes('useMemo') && !s.includes('useCallback'));
    for (const s of strings) {
      if (s.value.length > 10 && s.value.length < 100) {
        this.emit(ctx, { title: 'Expensive computation without memoization', message: `Potential expensive operation "${s.value.slice(0, 60)}" without useMemo/useCallback wrapper`, file: s.file, line: s.line, confidence: 35, remediation: 'Wrap expensive computations in useMemo or useCallback' });
      }
    }
  }
}

export class ImageWithoutDimensionsRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-MOD-004', name: 'Images Missing Width/Height', description: 'Detects img tags without explicit dimensions causing layout shift', category: 'performance-event-loop', severity: 'medium', techniqueNumber: 152, pillar: 2, tags: ['images', 'cls', 'performance'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /src=|=".*\.(jpg|png|gif|webp|avif)"/i.test(s) && !/width|height/i.test(s));
    for (const s of strings) {
      this.emit(ctx, { title: 'Image missing width/height attributes', message: `Image element without explicit dimensions — causes Cumulative Layout Shift`, file: s.file, line: s.line, confidence: 75, remediation: 'Add width and height attributes to all img elements for CLS prevention' });
    }
  }
}

export class MissingLoadingOptimizationRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-MOD-005', name: 'Missing Loading Optimization', description: 'Detects opportunities for lazy loading', category: 'performance-event-loop', severity: 'low', techniqueNumber: 153, pillar: 2, tags: ['lazy', 'loading', 'optimization'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasLazyLoad = findFunctionCalls(ctx.parsed, c => c.fullName.includes('lazy') || c.fullName.includes('IntersectionObserver'));
    if (hasLazyLoad.length === 0 && ctx.parsed.some(p => p.file?.match(/\.(jsx|tsx)$/))) {
      this.emit(ctx, { title: 'Consider lazy loading below-fold content', message: 'No lazy loading or IntersectionObserver detected — below-fold content loads eagerly', file: '', line: 1, confidence: 55, remediation: 'Use IntersectionObserver or libraries like react-lazyload for below-fold content' });
    }
  }
}
