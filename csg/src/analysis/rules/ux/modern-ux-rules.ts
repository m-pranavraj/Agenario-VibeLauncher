import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findStringLiterals } from '../engine/ast-utils.js';

export class MissingReducedMotionRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOD-001', name: 'Missing Reduced Motion Preference', description: 'Detects animations without prefers-reduced-motion media query', category: 'ux-accessibility', severity: 'medium', techniqueNumber: 98, pillar: 3, tags: ['accessibility', 'motion', 'animation'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasAnimation = findStringLiterals(ctx.parsed, s => /animation|transition|transform|@keyframes/i.test(s));
    const hasReducedMotion = findStringLiterals(ctx.parsed, s => /prefers-reduced-motion|reducedMotion/i.test(s));
    if (hasAnimation.length > 3 && hasReducedMotion.length === 0) {
      this.emit(ctx, { title: 'Animations without reduced motion support', message: 'Multiple animations/transitions found without prefers-reduced-motion media query — may cause vestibular disorders', file: '', line: 1, confidence: 70, remediation: 'Add @media (prefers-reduced-motion: reduce) to disable non-essential animations' });
    }
  }
}

export class MissingColorSchemeMetaRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOD-002', name: 'Missing Color Scheme Meta Tag', description: 'Detects missing color-scheme meta tag for dark mode', category: 'ux-accessibility', severity: 'low', techniqueNumber: 99, pillar: 3, tags: ['dark-mode', 'color-scheme', 'accessibility'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasColorScheme = findStringLiterals(ctx.parsed, s => /color-scheme|colorScheme/i.test(s));
    if (hasColorScheme.length === 0 && ctx.parsed.some(p => p.file?.endsWith('.html'))) {
      this.emit(ctx, { title: 'Missing color-scheme meta tag', message: 'HTML document without color-scheme meta tag — browser cannot auto-select default theme', file: '', line: 1, confidence: 65, remediation: 'Add <meta name="color-scheme" content="light dark"> to support both themes' });
    }
  }
}

export class MissingTouchTargetSizeRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOD-003', name: 'Small Touch Targets', description: 'Detects interactive elements smaller than 44px touch target', category: 'ux-accessibility', severity: 'medium', techniqueNumber: 100, pillar: 3, tags: ['touch', 'mobile', 'accessibility'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /height:\s*\d+px|width:\s*\d+px|font-size:\s*\d+px/i.test(s));
    for (const s of strings) {
      const height = parseInt(s.value.match(/height:\s*(\d+)px/i)?.[1] || '0');
      const width = parseInt(s.value.match(/width:\s*(\d+)px/i)?.[1] || '0');
      if ((height > 0 && height < 44) || (width > 0 && width < 44)) {
        this.emit(ctx, { title: 'Interactive element smaller than recommended touch target', message: `Touch target ${width}x${height}px — below recommended 44x44px minimum for mobile`, file: s.file, line: s.line, confidence: 72, remediation: 'Ensure interactive elements are at least 44x44px for touch accessibility' });
      }
    }
  }
}

export class MissingFontSizeResponsiveRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOD-004', name: 'Font Size Not Responsive', description: 'Detects font sizes set in px without responsive scaling', category: 'ux-accessibility', severity: 'low', techniqueNumber: 101, pillar: 3, tags: ['typography', 'responsive', 'accessibility'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /font-size:\s*\d+px/i.test(s) && !/clamp|rem|em|vw|%/i.test(s));
    for (const s of strings) {
      this.emit(ctx, { title: 'Font size in fixed px without responsive fallback', message: `Fixed px font size "${s.value.trim()}" — does not scale with user preferences, breaks zoom`, file: s.file, line: s.line, confidence: 50, remediation: 'Use rem/em units or clamp() for font sizes to respect user zoom preferences' });
    }
  }
}

export class MissingInputModeMobileRule extends BaseRule {
  meta: RuleMeta = { id: 'UX-MOD-005', name: 'Missing Input Mode for Mobile', description: 'Detects text inputs missing inputmode attribute for mobiles', category: 'ux-accessibility', severity: 'low', techniqueNumber: 102, pillar: 3, tags: ['mobile', 'input', 'keyboard'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /<input|<Input|type="(tel|email|number|url)"/i.test(s) && !/inputmode|inputMode/i.test(s));
    for (const s of strings) {
      this.emit(ctx, { title: 'Input missing inputmode for mobile keyboard', message: `Input with type="${s.value.match(/type="([^"]+)"/)?.[1] || 'text'}" without inputmode — shows generic keyboard on mobile`, file: s.file, line: s.line, confidence: 60, remediation: 'Add inputmode="numeric"/"email"/"tel" attribute for appropriate mobile keyboard' });
    }
  }
}
