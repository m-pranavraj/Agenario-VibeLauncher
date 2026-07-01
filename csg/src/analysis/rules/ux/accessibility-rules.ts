import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';

/* ───────────── Rule: UX-A11Y-001 — Click div without keyboard handler ───────────── */
export class ClickableDivNoKeyboardRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-001',
    name: 'Non-Interactive Clickable Element — Missing Keyboard Handler',
    description: 'Detects <div> or <span> with onClick but missing tabIndex, onKeyDown, or role="button"',
    category: 'ux-accessibility',
    severity: 'high',
    techniqueNumber: 1,
    pillar: 3,
    tags: ['a11y', 'keyboard', 'click', 'wcag'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const hasClick = /onClick\s*=\s*\{/.test(line);
        if (!hasClick) continue;

        const isDivOrSpan = /<(div|span)\b/i.test(line);
        const isJSX = /\w+\.\w+\s*\(/.test(line) || /<\w+/.test(line);
        if (!isDivOrSpan || !isJSX) continue;

        const hasRole = /role\s*=\s*['"]button['"]/.test(line);
        const hasTabIndex = /tabIndex\s*=\s*\{?\s*0\s*\}?/.test(line);
        const hasKeyDown = /onKeyDown\s*=\s*\{/.test(line);

        if (!hasRole || !hasTabIndex || !hasKeyDown) {
          this.emit(ctx, {
            title: 'Non-Interactive Clickable Element — Screen Reader Inaccessible',
            message: `<${isDivOrSpan ? 'div' : 'span'}> with onClick at line ${i + 1} missing ${!hasRole ? 'role="button", ' : ''}${!hasTabIndex ? 'tabIndex={0}, ' : ''}${!hasKeyDown ? 'onKeyDown handler' : ''}. Keyboard and screen reader users cannot interact with this element.`,
            file: p.file,
            line: i + 1,
            snippet: line.slice(0, 250),
            confidence: 85,
            remediation: `Add ${!hasRole ? 'role="button", ' : ''}${!hasTabIndex ? 'tabIndex={0}, ' : ''}${!hasKeyDown ? 'and onKeyDown={(e) => e.key === "Enter" && handler}' : ''} to make this element fully accessible.`,
            autoFixCode: `// Add to element:\nrole="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handler(); }}`,
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-002 — Missing alt text on images ───────────── */
export class MissingAltTextRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-002',
    name: 'Missing Alt Text on Images',
    description: 'Detects <img> tags without alt attribute or with empty alt',
    category: 'ux-accessibility',
    severity: 'high',
    techniqueNumber: 41,
    pillar: 3,
    tags: ['a11y', 'image', 'alt-text', 'wcag'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const imgTag = line.match(/<img\b[^>]*>/i);
        if (!imgTag) continue;

        if (!line.includes('alt=') && !line.includes('alt =')) {
          this.emit(ctx, {
            title: 'Missing Alt Text on Image — Screen Reader Blind Spot',
            message: `<img> tag at line ${i + 1} has no alt attribute. Screen readers will announce the filename or nothing at all.`,
            file: p.file,
            line: i + 1,
            snippet: imgTag[0].slice(0, 200),
            confidence: 92,
            remediation: 'Add a descriptive alt attribute. Use alt="" for decorative images (tells screen readers to skip).',
            autoFixCode: `<img src={src} alt="Description of image" />`,
          });
        } else if (line.match(/alt\s*=\s*['"]\s*['"]/) || line.match(/alt\s*=\s*\{['"]\s*['"]\}/)) {
          this.emit(ctx, {
            title: 'Empty Alt Text on Non-Decorative Image',
            message: `<img> tag at line ${i + 1} has empty alt="" but appears to be informational (not marked as role="presentation").`,
            file: p.file,
            line: i + 1,
            snippet: imgTag[0].slice(0, 200),
            confidence: 60,
            remediation: 'Provide descriptive alt text for informational images. Use alt="" only for purely decorative images.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-003 — Icon-only button without aria-label ───────────── */
export class IconButtonNoLabelRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-003',
    name: 'Icon-Only Button Without aria-label',
    description: 'Detects buttons containing only SVG/icon elements without aria-label or aria-labelledby',
    category: 'ux-accessibility',
    severity: 'high',
    techniqueNumber: 42,
    pillar: 3,
    tags: ['a11y', 'icon-button', 'aria-label'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!line.match(/<button\b[^>]*>/i) && !line.match(/Button\s*>/)) continue;

        const noText = !line.match(/>\s*\w/) && !line.match(/>\s*\{/);
        const hasIcon = line.match(/<svg|<Icon|<img|<i\b|icon/i);
        const hasAriaLabel = line.match(/aria-label|aria-labelledby/i);

        if (noText && hasIcon && !hasAriaLabel) {
          this.emit(ctx, {
            title: 'Icon-Only Button Missing aria-label',
            message: `Button with icon at line ${i + 1} has no visible text label and no aria-label. Screen reader users cannot determine the button\'s purpose.`,
            file: p.file,
            line: i + 1,
            snippet: line.slice(0, 200),
            confidence: 88,
            remediation: 'Add aria-label describing the button action (e.g., aria-label="Search", aria-label="Close menu").',
            autoFixCode: '<button aria-label="Search"><SearchIcon /></button>',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-004 — Focus trap missing in modal ───────────── */
export class MissingFocusTrapRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-004',
    name: 'Missing Focus Trap in Modal/Dialog',
    description: 'Detects modal/dialog implementations without keyboard focus trapping',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 21,
    pillar: 3,
    tags: ['a11y', 'focus-trap', 'modal', 'dialog'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isModal = /modal|dialog|overlay|drawer|popup|popover/i.test(line) && /<(?:div|Dialog|Modal|Drawer)\b/i.test(line);
        if (!isModal) continue;

        const hasFocusTrap = /focusTrap|FocusTrap|useFocusTrap|trapFocus|focus-trapping/i.test(lines.slice(i, i + 15).join(' '));
        const hasAriaModal = /aria-modal|role\s*=\s*['"]dialog['"]/i.test(line);

        if (!hasFocusTrap) {
          this.emit(ctx, {
            title: 'Keyboard Focus Trap Missing — Modal',
            message: `Modal/dialog at line ${i + 1}${hasAriaModal ? ' (has role="dialog")' : ''} does not implement focus trapping. Keyboard users can tab outside the modal, potentially interacting with background content.`,
            file: p.file,
            line: i + 1,
            snippet: line.slice(0, 200),
            confidence: 75,
            remediation: 'Implement keyboard focus trapping: when modal opens, trap Tab/Shift+Tab within the modal. Close on Escape. Return focus to trigger element on close.',
            autoFixCode: '// Use a focus trap library:\nimport FocusTrap from "focus-trap-react";\n<FocusTrap><div role="dialog" aria-modal="true">...</div></FocusTrap>',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-005 — Missing label on input ───────────── */
export class MissingInputLabelRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-005',
    name: 'Form Input Without Associated Label',
    description: 'Detects <input>, <select>, <textarea> without associated <label> or aria-label',
    category: 'ux-accessibility',
    severity: 'high',
    techniqueNumber: 43,
    pillar: 3,
    tags: ['a11y', 'form', 'label', 'input'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const inputMatch = line.match(/<(?:input|select|textarea)\b[^>]*>/i);
        if (!inputMatch) continue;

        const hasLabel = line.match(/aria-label|aria-labelledby|id\s*=\s*['"]/) &&
          lines.slice(Math.max(0, i - 5), i + 1).some(l => l.match(/<label\b[^>]*htmlFor\s*=\s*['"]/));
        const hasAriaLabel = line.match(/aria-label|aria-labelledby/i);

        if (!hasLabel && !hasAriaLabel) {
          this.emit(ctx, {
            title: 'Form Input Without Accessible Label',
            message: `<${inputMatch[0].match(/<(input|select|textarea)/i)![1]}> at line ${i + 1} has no associated <label> or aria-label. Screen reader users cannot identify this field.`,
            file: p.file,
            line: i + 1,
            snippet: line.slice(0, 200),
            confidence: 90,
            remediation: 'Add either: a <label htmlFor="id"> element, or aria-label directly on the input.',
            autoFixCode: '<label htmlFor="email">Email</label>\n<input id="email" type="email" />',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-006 — Missing ARIA landmark roles ───────────── */
export class MissingAriaLandmarksRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-006',
    name: 'Missing ARIA Landmark Roles — Screen Reader Navigation Impaired',
    description: 'Detects pages without role=main, role=navigation, or role=banner landmarks',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 2,
    pillar: 3,
    tags: ['a11y', 'aria', 'landmarks', 'navigation'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const requiredLandmarks = ['main', 'navigation', 'banner'];
      const foundLandmarks = new Set<string>();
      for (const l of lines) {
        for (const lm of requiredLandmarks) {
          if (new RegExp('role\\s*=\\s*[\\\'"]' + lm + '[\\\'"]', 'i').test(l)) foundLandmarks.add(lm);
        }
      }
      const missing = requiredLandmarks.filter(lm => !foundLandmarks.has(lm));
      if (missing.length > 0) {
        this.emit(ctx, {
          title: 'Missing ARIA Landmarks',
          message: 'Page missing landmark roles: [' + missing.join(', ') + ']. Screen reader users rely on landmarks to navigate page sections quickly.',
          file: p.file, line: 0, snippet: 'Missing: ' + missing.join(', '),
          confidence: 65,
          remediation: 'Add role="main" to the main content, role="navigation" to nav elements, and role="banner" to the header.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-007 — Low color contrast risk ───────────── */
export class LowColorContrastRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-007',
    name: 'Potential Low Color Contrast — WCAG AA/AAA Risk',
    description: 'Detects text color + background color combinations that may fail WCAG 1.4.3 contrast ratio of 4.5:1',
    category: 'ux-accessibility',
    severity: 'high',
    techniqueNumber: 31,
    pillar: 3,
    tags: ['a11y', 'contrast', 'color', 'wcag'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const suspectPairs = [
        { fg: 'gray|gray-300|gray-400|grey', bg: 'white|bg-white|bg-gray-50', desc: 'light gray text on white' },
        { fg: 'gray-400|text-gray-400', bg: 'gray-100|bg-gray-100', desc: 'gray-400 on gray-100' },
        { fg: 'blue-300|text-blue-300', bg: 'white|bg-white', desc: 'light blue text on white' },
        { fg: 'yellow-200|amber-200', bg: 'white|bg-white', desc: 'pale yellow on white' },
      ];
      for (let i = 0; i < lines.length; i++) {
        for (const pair of suspectPairs) {
          if (new RegExp(pair.fg, 'i').test(lines[i]) && new RegExp(pair.bg, 'i').test(lines.slice(Math.max(0, i - 2), i + 3).join(' '))) {
            this.emit(ctx, {
              title: 'Low Color Contrast Risk — ' + pair.desc,
              message: pair.desc + ' at line ' + (i + 1) + '. WCAG AA requires 4.5:1 for normal text. Light gray on white typically fails (~2.8:1).',
              file: p.file, line: i + 1, snippet: lines[i].slice(0, 250), confidence: 55,
              remediation: 'Use darker text colors (gray-700+ on white) or check with contrast checker. Minimum 4.5:1 ratio for normal text, 3:1 for large text.',
            });
          }
        }
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-008 — Focus order not logical ───────────── */
export class LogicalFocusOrderRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-008',
    name: 'Non-Logical Focus Order — TabIndex Disrupts Natural Flow',
    description: 'Detects positive tabindex values (>0) that create non-logical focus order',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 22,
    pillar: 3,
    tags: ['a11y', 'focus', 'tabindex', 'keyboard'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const tabMatch = lines[i].match(/tabIndex\s*=\s*\{?(\d+)\}?/);
        if (!tabMatch) continue;
        const val = parseInt(tabMatch[1], 10);
        if (val > 0) {
          this.emit(ctx, {
            title: 'Non-Logical Focus Order — tabIndex=' + val,
            message: 'Positive tabIndex=' + val + ' at line ' + (i + 1) + '. Focus jumps out of DOM order, confusing keyboard users. WCAG 2.4.3 requires logical focus order.',
            file: p.file, line: i + 1, snippet: lines[i].slice(0, 250), confidence: 70,
            remediation: 'Use tabIndex="0" (natural order) or tabIndex="-1". Avoid positive tabIndex values.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-009 — Missing skip-to-content link ───────────── */
export class MissingSkipLinkRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-009',
    name: 'Missing Skip-to-Content Link — Keyboard Users Must Tab Through All Navigation',
    description: 'Detects pages without a skip-to-main-content link as first focusable element',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 3,
    pillar: 3,
    tags: ['a11y', 'skip-link', 'keyboard', 'wcag'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const hasSkipLink = lines.some(l => /skip.*content|skip.*nav|skip.*main|skiptocontent|skipLink|jump.*content|skip-to/i.test(l));
      if (!hasSkipLink && lines.some(l => /<nav|<header|<div.*navbar/i.test(l))) {
        this.emit(ctx, {
          title: 'Missing Skip-to-Content Link',
          message: 'Page has navigation but no skip-to-content link as first element. Keyboard users must tab through all navigation links before reaching main content.',
          file: p.file, line: 0, snippet: 'Add skip-to-content link.',
          confidence: 68,
          remediation: 'Add a "Skip to content" link as the first focusable element, linking to #main-content. Visually hide it until focused.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-010 — Missing error announcement on form validation ───────────── */
export class MissingFormErrorAnnouncementRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-010',
    name: 'Form Validation Error Without aria-live / role="alert"',
    description: 'Detects form errors displayed without aria-live region for screen reader announcement',
    category: 'ux-accessibility',
    severity: 'high',
    techniqueNumber: 44,
    pillar: 3,
    tags: ['a11y', 'forms', 'validation', 'aria-live'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/error|errorMessage|error_message|errMsg|validationError|fieldError|isError|hasError|errors\b/i.test(lines[i])) continue;
        if (/aria-live|role=['""]alert['""]|role=['""']status['""']|aria-atomic|aria-relevant|toast|notification|setError/.test(lines[i])) continue;
        if (!/<form|<input|validate|onSubmit|onBlur/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Form Error Not Announced — Missing aria-live',
          message: 'Error display at line ' + ln + ' without aria-live region. Screen reader users may not know validation failed.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 72,
          remediation: 'Wrap error messages in <div role="alert" aria-live="assertive"> or add aria-describedby on inputs pointing to error element.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-011 — Touch target too small ───────────── */
export class SmallTouchTargetRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-011',
    name: 'Touch Target Too Small (< 44x44px) — WCAG 2.5.5',
    description: 'Detects clickable elements with small dimensions that fail WCAG touch target size',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 46,
    pillar: 3,
    tags: ['a11y', 'touch', 'mobile', 'wcag'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/w-\d|w\[\d|width\s*:\s*\d|h-\d|h\[\d|height\s*:\s*\d|p-\d|p-\d+[a-z]|px/.test(lines[i])) continue;
        if (!/onClick|button|Button|a\s*href|Link|onTap/.test(lines[i])) continue;
        const dimension = lines[i].match(/(?:w-|width:|h-|height:)\s*(\d+)/i);
        if (!dimension) continue;
        const val = parseInt(dimension[1], 10);
        if (!isNaN(val) && val < 44 && /px|pt/i.test(lines[i]) || val < 10 && /rem|em/.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Touch Target Too Small — WCAG 2.5.5',
            message: 'Clickable element at line ' + ln + ' has size ' + val + 'px. WCAG requires minimum 44x44px touch targets for mobile accessibility.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
            remediation: 'Increase touch target to at least 44x44px. Use min-width/min-height or padding to expand hit area.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-012 — Missing heading hierarchy ───────────── */
export class MissingHeadingHierarchyRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-012',
    name: 'Broken Heading Hierarchy — Skipping Levels (h1 -> h3)',
    description: 'Detects heading levels that skip ranks (e.g., h1 followed by h3 without h2)',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 4,
    pillar: 3,
    tags: ['a11y', 'headings', 'hierarchy', 'wcag'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      let lastLevel = 0;
      for (let i = 0; i < lines.length; i++) {
        const hMatch = lines[i].match(/<(h[1-6])\b/i);
        if (!hMatch) continue;
        const level = parseInt(hMatch[1].charAt(1), 10);
        if (lastLevel > 0 && level > lastLevel + 1) {
          this.emit(ctx, {
            title: 'Broken Heading Hierarchy — h' + level + ' After h' + lastLevel,
            message: 'h' + level + ' at line ' + (i + 1) + ' follows h' + lastLevel + '. WCAG 1.3.1 requires headings to not skip levels.',
            file: p.file, line: i + 1, snippet: lines[i].slice(0, 250), confidence: 75,
            remediation: 'Restructure headings to not skip levels. Use h2 after h1, h3 after h2, etc.',
          });
        }
        lastLevel = level;
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-013 — Missing lang attribute on <html> ───────────── */
export class MissingHtmlLangRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-013',
    name: 'Missing lang Attribute on <html> — Screen Reader Pronunciation Issues',
    description: 'Detects <html> tag without lang attribute',
    category: 'ux-accessibility',
    severity: 'high',
    techniqueNumber: 5,
    pillar: 3,
    tags: ['a11y', 'html', 'lang', 'screen-reader'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<html\b/.test(lines[i])) continue;
        if (!/lang\s*=|xml:lang/i.test(lines[i])) {
          this.emit(ctx, {
            title: 'Missing lang Attribute on <html>',
            message: '<html> tag at line ' + (i + 1) + ' without lang attribute. Screen readers use wrong pronunciation and accent.',
            file: p.file, line: i + 1, snippet: lines[i].slice(0, 250), confidence: 85,
            remediation: 'Add lang="en" (or appropriate language code) to the <html> tag.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-014 — Missing aria-expanded on collapsible ───────────── */
export class MissingAriaExpandedRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-014',
    name: 'Collapsible Element Without aria-expanded',
    description: 'Detects accordion, dropdown, or expandable sections without aria-expanded state',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 6,
    pillar: 3,
    tags: ['a11y', 'aria-expanded', 'accordion', 'collapsible'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/accordion|Accordion|collapsible|Collapsible|expandable|Expandable|dropdown|Dropdown|disclosure|Disclosure/i.test(lines[i])) continue;
        if (/aria-expanded/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Collapsible Element Missing aria-expanded',
          message: 'Accordion/expandable at line ' + ln + ' without aria-expanded attribute. Screen reader users cannot know current open/closed state.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Add aria-expanded={isOpen ? "true" : "false"} to the toggle button. Set aria-controls pointing to the content panel ID.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-015 — Missing aria-current on navigation ───────────── */
export class MissingAriaCurrentRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-015',
    name: 'Active Navigation Link Without aria-current',
    description: 'Detects active/current page navigation links without aria-current="page"',
    category: 'ux-accessibility',
    severity: 'low',
    techniqueNumber: 7,
    pillar: 3,
    tags: ['a11y', 'aria-current', 'navigation', 'active'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/active|isActive|current|isCurrent|selected|isSelected/i.test(lines[i])) continue;
        if (!/nav|navbar|sidebar|menu|tab|Tab|breadcrumb|Breadcrumb/i.test(lines[i])) continue;
        if (/aria-current/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Active Navigation Link Without aria-current',
          message: 'Active navigation item at line ' + ln + ' uses visual styling but no aria-current="page". Screen readers cannot identify the current page.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Add aria-current="page" to the element representing the current page in navigation.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-016 — Autoplaying video/audio without controls ───────────── */
export class AutoplayNoControlsRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-016',
    name: 'Autoplay Video/Audio Without Controls — WCAG 1.4.2',
    description: 'Detects autoplay media without controls attribute causing unaccessible audio',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 8,
    pillar: 3,
    tags: ['a11y', 'autoplay', 'video', 'audio', 'wcag'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<video|<audio/.test(lines[i])) continue;
        if (!/autoplay|autoPlay/.test(lines[i])) continue;
        if (/controls/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Autoplay Media Without Controls',
          message: 'Autoplay <' + (lines[i].includes('video') ? 'video' : 'audio') + '> at line ' + ln + ' without controls. WCAG 1.4.2 requires user to be able to pause/stop audio that plays for > 3 seconds.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          remediation: 'Add the controls attribute. Respect prefers-reduced-motion. Never autoplay audio without a visible pause mechanism.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-017 — Missing accessible name on iframe ───────────── */
export class IframeMissingTitleRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-017',
    name: 'iframe Without title Attribute — Screen Reader Cannot Identify Content',
    description: 'Detects iframe elements missing a descriptive title attribute',
    category: 'ux-accessibility',
    severity: 'high',
    techniqueNumber: 9,
    pillar: 3,
    tags: ['a11y', 'iframe', 'title', 'frame'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<iframe\b/.test(lines[i])) continue;
        if (/title\s*=/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'iframe Without title Attribute',
          message: '<iframe> at line ' + ln + ' has no title attribute. Screen readers cannot identify the iframe content.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
          remediation: 'Add title="Description of iframe content" to all iframes.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-018 — Missing scope attribute on table header ───────────── */
export class MissingTableHeaderScopeRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-018',
    name: 'Missing scope Attribute on Table Header',
    description: 'Detects <th> elements without scope="col" or scope="row" attribute',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 10,
    pillar: 3,
    tags: ['ux', 'a11y', 'table', 'scope', 'wcag'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<th\b/.test(lines[i])) continue;
        if (/scope\s*=/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing scope Attribute on Table Header',
          message: '<th> at line ' + ln + ' has no scope attribute. Screen readers cannot determine if this header applies to columns, rows, or neither. WCAG 1.3.1.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          remediation: 'Add scope="col" for column headers or scope="row" for row headers.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-019 — Missing captions on video ───────────── */
export class MissingVideoCaptionsRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-019',
    name: 'Missing Caption Track on Video Element',
    description: 'Detects <video> elements without <track kind="captions"> for deaf/hearing-impaired users',
    category: 'ux-accessibility',
    severity: 'high',
    techniqueNumber: 11,
    pillar: 3,
    tags: ['ux', 'a11y', 'video', 'captions', 'wcag'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<video\b/.test(lines[i])) continue;
        const context = lines.slice(i, i + 10).join(' ');
        if (/<track\b[^>]*kind\s*=\s*['"]captions['"]/.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Caption Track on Video',
          message: '<video> at line ' + ln + ' has no <track kind="captions"> element. Deaf or hard-of-hearing users cannot access audio content. WCAG 1.2.2.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
          remediation: 'Add <track kind="captions" src="captions.vtt" srclang="en" label="English Captions"> inside the <video> element.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-020 — Missing transcript for audio ───────────── */
export class MissingAudioTranscriptRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-020',
    name: 'Missing Transcript Link for Audio Content',
    description: 'Detects <audio> elements without a nearby transcript link or transcript element',
    category: 'ux-accessibility',
    severity: 'high',
    techniqueNumber: 12,
    pillar: 3,
    tags: ['ux', 'a11y', 'audio', 'transcript', 'wcag'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<audio\b/.test(lines[i])) continue;
        const context = lines.slice(i, i + 15).join(' ');
        if (/transcript|Transcript|transcription/.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Transcript for Audio Content',
          message: '<audio> at line ' + ln + ' has no transcript link nearby. Deaf users cannot access spoken content. WCAG 1.2.1 requires text alternative for prerecorded audio.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          remediation: 'Add a visible transcript link or inline transcript text near the <audio> element.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-021 — Missing title on abbreviation ───────────── */
export class MissingAbbreviationExpansionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-021',
    name: 'Missing title Attribute on <abbr> — Screen Reader Cannot Expand',
    description: 'Detects <abbr> elements without title attribute providing the full expansion',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 13,
    pillar: 3,
    tags: ['ux', 'a11y', 'abbreviation', 'title'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<abbr\b/.test(lines[i])) continue;
        if (/title\s*=/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing title on <abbr> Element',
          message: '<abbr> at line ' + ln + ' without title attribute. Screen readers and users cannot determine what the abbreviation stands for.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          remediation: 'Add title="Full expansion" to the <abbr> element, e.g., <abbr title="World Health Organization">WHO</abbr>.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-022 — Missing caption on table ───────────── */
export class MissingTableCaptionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-022',
    name: 'Missing <caption> on Data Table',
    description: 'Detects <table> elements without a <caption> element describing the table purpose',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 14,
    pillar: 3,
    tags: ['ux', 'a11y', 'table', 'caption', 'wcag'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<table\b/.test(lines[i])) continue;
        const context = lines.slice(i, i + 8).join(' ');
        if (/<caption\b/.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing <caption> on Data Table',
          message: '<table> at line ' + ln + ' has no <caption> element. Screen reader users cannot quickly understand the table purpose.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Add a <caption> element as the first child of <table> describing its content.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-023 — Missing figcaption in figure ───────────── */
export class MissingFigureCaptionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-023',
    name: 'Missing <figcaption> in <figure>',
    description: 'Detects <figure> elements without a <figcaption> element inside',
    category: 'ux-accessibility',
    severity: 'low',
    techniqueNumber: 15,
    pillar: 3,
    tags: ['ux', 'a11y', 'figure', 'figcaption'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<figure\b/.test(lines[i])) continue;
        const context = lines.slice(i, i + 10).join(' ');
        if (/<figcaption\b/.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing <figcaption> in <figure>',
          message: '<figure> at line ' + ln + ' has no <figcaption> element. The figure content lacks a described association with its caption.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Add <figcaption> inside the <figure> to provide a caption for the figure content.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-024 — Missing fieldset/legend for radio/checkbox group ───────────── */
export class MissingFieldsetLegendRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-024',
    name: 'Radio/Checkbox Group Without <fieldset> and <legend>',
    description: 'Detects grouped radio buttons or checkboxes without semantic grouping via <fieldset> and <legend>',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 16,
    pillar: 3,
    tags: ['ux', 'a11y', 'fieldset', 'legend', 'forms', 'wcag'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/type=['"]radio['"]/.test(lines[i]) && !/type=['"]checkbox['"]/.test(lines[i])) continue;
        if (!/name\s*=/.test(lines[i])) continue;
        const context = lines.slice(Math.max(0, i - 8), i + 1).join(' ');
        if (/<fieldset/.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Radio/Checkbox Group Without <fieldset> and <legend>',
          message: 'Radio/checkbox group at line ' + ln + ' is not wrapped in <fieldset> with <legend>. Screen reader users cannot perceive the group label.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          remediation: 'Wrap the radio/checkbox group in <fieldset> and add a <legend> describing the group purpose.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-025 — Missing character counter on maxLength input ───────────── */
export class MissingCharCounterRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-025',
    name: 'Missing Character Counter on Input with maxLength',
    description: 'Detects <input> or <textarea> with maxLength attribute but no character count display',
    category: 'ux-accessibility',
    severity: 'low',
    techniqueNumber: 17,
    pillar: 3,
    tags: ['ux', 'a11y', 'input', 'counter', 'maxlength'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/maxLength\s*=\s*\{?\s*\d+\s*\}?/.test(lines[i])) continue;
        const context = lines.slice(i, i + 6).join(' ');
        if (/charCount|characterCount|charCounter|char_count|remaining|charlimit|maxlen/i.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Character Counter on maxLength Input',
          message: 'Input/textarea at line ' + ln + ' has maxLength but no character count display. Users cannot see remaining character allowance.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Add a character counter showing remaining characters, e.g., "{maxLength - value.length} characters remaining".',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-026 — Emoji without accessible role/label ───────────── */
export class MissingAccessibleEmojiRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-026',
    name: 'Emoji Without Accessible Name — Screen Reader Announced Wrongly',
    description: 'Detects emoji characters in text content without role="img" and aria-label',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 18,
    pillar: 3,
    tags: ['ux', 'a11y', 'emoji', 'aria-label'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(lines[i])) continue;
        if (/role=['"]img['"]/.test(lines[i]) && /aria-label/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Emoji Without Accessible Role/Label',
          message: 'Emoji at line ' + ln + ' without role="img" and aria-label. Screen readers may announce the emoji description or character, potentially confusing users.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Wrap emoji in a span with role="img" and aria-label="emoji description". For decorative emoji, add aria-hidden="true".',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-027 — Focus outline removed without focus-visible fallback ───────────── */
export class MissingFocusVisibleRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-027',
    name: ':focus { outline: none } Without :focus-visible Replacement',
    description: 'Detects CSS removing focus outline without providing :focus-visible alternative',
    category: 'ux-accessibility',
    severity: 'high',
    techniqueNumber: 19,
    pillar: 3,
    tags: ['ux', 'a11y', 'focus', 'outline', 'keyboard'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/:focus\s*\{/.test(lines[i]) && !/outline\s*:\s*none/.test(lines[i])) continue;
        if (/:focus-visible/.test(lines[i])) continue;
        const context = lines.slice(i, i + 5).join(' ');
        if (!/outline\s*:\s*none/.test(context) && !/outline:\s*0/.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: ':focus { outline: none } Without :focus-visible Fallback',
          message: 'Focus outline removed at line ' + ln + ' without :focus-visible replacement. Keyboard users cannot see which element is focused.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
          remediation: 'Replace with :focus-visible { outline: 2px solid blue; } and keep :focus { outline: none; } only for mouse users.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-028 — List items without proper list parent ───────────── */
export class MissingListSemanticsRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-028',
    name: 'List Items Without Proper <ul>/<ol> Parent',
    description: 'Detects <li> elements not nested inside <ul>, <ol>, or <menu>',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 20,
    pillar: 3,
    tags: ['ux', 'a11y', 'list', 'semantics', 'html'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<li\b/.test(lines[i])) continue;
        const prevLines = lines.slice(Math.max(0, i - 3), i).join(' ');
        if (/<ul|<ol|<menu/.test(prevLines)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'List Item Without Semantic List Parent',
          message: '<li> at line ' + ln + ' without <ul> or <ol> ancestor. Screen readers may not announce list context or item count.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Wrap <li> elements in <ul> (unordered) or <ol> (ordered) for proper list semantics.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-029 — Key-value pairs as divs instead of definition list ───────────── */
export class MissingDescriptionListRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-029',
    name: 'Key-Value Rendered as <div> Instead of <dl>/<dt>/<dd>',
    description: 'Detects key-value label/data patterns rendered as <div> pairs instead of semantic <dl> list',
    category: 'ux-accessibility',
    severity: 'low',
    techniqueNumber: 23,
    pillar: 3,
    tags: ['ux', 'a11y', 'description-list', 'semantics'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<div\b/.test(lines[i])) continue;
        if (!/label|Label|key|field|name|term/.test(lines[i])) continue;
        const nextLine = lines[i + 1] || '';
        if (!/:/i.test(nextLine) && !/value|Value|data/.test(nextLine)) continue;
        if (/<dl|<dt|<dd/.test(lines.slice(Math.max(0, i - 3), i + 2).join(' '))) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Key-Value Pair as <div> Instead of <dl>',
          message: 'Key-value display at line ' + ln + ' uses <div> elements instead of semantic <dl>/<dt>/<dd>. Screen readers cannot navigate label-data associations.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 45,
          remediation: 'Use <dl> with <dt> for terms and <dd> for descriptions to provide proper semantics.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-030 — Fixed dimensions on text containers without overflow handling ───────────── */
export class MissingTextSpacingSupportRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-030',
    name: 'Fixed Dimensions on Text Container Without Overflow Handling',
    description: 'Detects text containers with fixed width/height and no overflow or text-overflow handling',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 24,
    pillar: 3,
    tags: ['ux', 'a11y', 'text', 'spacing', 'overflow', 'wcag'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\bwidth\s*:\s*\d+px\b/.test(lines[i]) && !/\bheight\s*:\s*\d+px\b/.test(lines[i])) continue;
        if (/overflow|text-overflow|ellipsis|word-break|overflow-wrap|break-word|scroll|auto/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Fixed Text Container Without Overflow Handling',
          message: 'Text container at line ' + ln + ' has fixed dimensions without overflow handling. When text spacing is increased (WCAG 1.4.12), content may be clipped.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Add overflow: auto or text-overflow: ellipsis; overflow: hidden; or allow container to grow with min-height/min-width.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-031 — Viewport zoom disabled ───────────── */
export class MissingZoomSupportRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-031',
    name: 'Viewport Zoom Disabled — user-scalable=no or maximum-scale=1',
    description: 'Detects viewport meta tag with user-scalable=no or maximum-scale=1 preventing zoom',
    category: 'ux-accessibility',
    severity: 'high',
    techniqueNumber: 25,
    pillar: 3,
    tags: ['ux', 'a11y', 'zoom', 'viewport', 'wcag'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/viewport/i.test(lines[i])) continue;
        if (!/user-scalable\s*=\s*no/.test(lines[i]) && !/maximum-scale\s*=\s*1[^\d]/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Viewport Zoom Disabled — WCAG 1.4.4 Violation',
          message: 'Viewport meta at line ' + ln + ' disables zoom with user-scalable=no or maximum-scale=1. WCAG 1.4.4 requires text resizing up to 200% without loss of content.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 90,
          remediation: 'Remove user-scalable=no. Set maximum-scale=5 or remove it. Use initial-scale=1, width=device-width only.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-A11Y-032 — Touch targets touching each other ───────────── */
export class MissingTouchTargetSpacingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-A11Y-032',
    name: 'Touch Targets Too Close — Potential Tap Target Overlap',
    description: 'Detects interactive elements with zero margin or adjacent positioning causing tap errors',
    category: 'ux-accessibility',
    severity: 'medium',
    techniqueNumber: 26,
    pillar: 3,
    tags: ['ux', 'a11y', 'touch', 'spacing', 'mobile'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/margin:\s*0/.test(lines[i]) && !/m-0/.test(lines[i])) continue;
        if (!/button|Button|a\s*href|Link|input|onClick/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Touch Targets Too Close — Tap Overlap Risk',
          message: 'Interactive element at line ' + ln + ' has margin: 0 and may touch adjacent targets. WCAG 2.5.5 recommends minimum 8px spacing between touch targets.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
          remediation: 'Add margin or gap between interactive elements. Ensure minimum 8px spacing and 44x44px touch target size.',
        });
      }
    }
  }
}
