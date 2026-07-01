import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';

/* ───────────── Rule: UX-INT-001 — Silent try/catch failure ───────────── */
export class SilentCatchRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-001',
    name: 'Silent Failure — Catch Block Without User Notification',
    description: 'Detects try/catch blocks around API calls that console.error without showing a toast/notification',
    category: 'ux-interaction',
    severity: 'high',
    techniqueNumber: 76,
    pillar: 3,
    tags: ['ux', 'error-handling', 'silent-failure'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.match(/catch\s*\(/) && !line.match(/\.catch\s*\(/)) continue;

        let catchBody = '';
        let braceDepth = 0;
        let inCatch = false;

        for (let j = i; j < Math.min(i + 20, lines.length); j++) {
          const l = lines[j];
          if (l.includes('catch')) inCatch = true;
          if (inCatch) {
            catchBody += l + '\n';
            for (const ch of l) {
              if (ch === '{') braceDepth++;
              if (ch === '}') braceDepth--;
            }
            if (braceDepth <= 0) break;
          }
        }

        const hasToast = /toast|notify|notification|alert|setError|showError|snackbar|message|error\.message/i.test(catchBody);
        const onlyConsole = /console\.(error|log|warn)/i.test(catchBody) && !hasToast;
        const isEmptyCatch = catchBody.trim().length < 30 && !catchBody.includes('throw');

        if (onlyConsole || isEmptyCatch) {
          this.emit(ctx, {
            title: onlyConsole ? 'Silent Failure — Console Log Without User Notification' : 'Empty Catch Block — Error Swallowed',
            message: `Catch block at line ${i + 1}${onlyConsole ? ' only logs to console without showing user feedback' : ' is empty, silently swallowing the error'}. Users see no feedback when operations fail.`,
            file: p.file,
            line: i + 1,
            snippet: catchBody.slice(0, 200),
            confidence: onlyConsole ? 80 : 90,
            remediation: 'Show a user-facing error notification (toast, alert, or inline error message) in every catch block.',
            autoFixCode: `// Add user notification:\ntry { await apiCall(); }\ncatch (err) {\n  toast({ title: 'Operation failed', description: err.message, variant: 'destructive' });\n}`,
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-INT-002 — Navigation dead end ───────────── */
export class NavigationDeadEndRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-002',
    name: 'Navigation Dead End — Authenticated Page Without Back Navigation',
    description: 'Detects authenticated pages that lack navigation headers, back buttons, or breadcrumbs',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 51,
    pillar: 3,
    tags: ['ux', 'navigation', 'dead-end', 'user-trap'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isPage = line.match(/function\s+\w*Page|const\s+\w*Page\s*=|export\s+default\s+function\s+\w*Page/);
        if (!isPage) continue;

        const pageName = isPage[0].match(/[\w]+Page/)?.[0] || `component at line ${i + 1}`;
        const pageContent = lines.slice(i, i + 80).join('\n');

        const hasBackNav = /back|Back|goBack|navigateBack|history\.back|breadcrumb|Breadcrumb/i.test(pageContent);
        const hasHeader = /header|Header|navbar|Navbar|navigation|Navigation|menu|Menu|sidebar|Sidebar/i.test(pageContent);
        const hasLink = /Link\s+to=|href=|router\.push|navigate\s*\(/i.test(pageContent);

        if (!hasBackNav && !hasHeader && hasLink) {
          this.emit(ctx, {
            title: 'Navigation Dead End — Page Missing Back/Header Navigation',
            message: `${pageName} at line ${i + 1} is an authenticated page but lacks back navigation, breadcrumbs, or visible header. Users may get stuck.`,
            file: p.file,
            line: i + 1,
            snippet: `Page: ${pageName}`,
            confidence: 55,
            remediation: 'Add back navigation, breadcrumbs, or a persistent navigation header to allow users to navigate away.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-PP-001 — CLS: async data without fixed height ───────────── */
export class CumulativeLayoutShiftRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-PP-001',
    name: 'Cumulative Layout Shift (CLS) — Async Data Without Fixed Dimensions',
    description: 'Detects async data fetches rendering into DOM elements without fixed-height wrappers or skeleton loaders',
    category: 'ux-perceived-perf',
    severity: 'high',
    techniqueNumber: 101,
    pillar: 3,
    tags: ['ux', 'cls', 'layout-shift', 'lcp'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const hasDataFetch = line.match(/useQuery|useSWR|useEffect.*fetch|await\s+fetch|axios\.get/);
        if (!hasDataFetch) continue;

        const componentContent = lines.slice(Math.max(0, i - 2), i + 60).join('\n');

        const hasFixedHeight = /min-height|minHeight|h-\d+|h\[\d+|height\s*:\s*\d+|fixed|skeleton|Skeleton|loading\s*=/i.test(componentContent);
        if (hasFixedHeight) continue;

        const renderPattern = componentContent.match(/(?:data|result|response)\s*[?.]?\s*map\s*\(|<div>\s*\{/);
        if (!renderPattern) continue;

        this.emit(ctx, {
          title: 'Cumulative Layout Shift — Async Data Without Fixed Height',
          message: `Async data at line ${i + 1} renders into DOM at line ${renderPattern.index ? i + componentContent.slice(0, renderPattern.index).split('\n').length : 'unknown'} without fixed-height containers or skeleton loaders. Data arrival shifts the layout.`,
          file: p.file,
          line: i + 1,
          snippet: componentContent.slice(0, 250),
          confidence: 72,
          remediation: 'Wrap async content in containers with fixed min-height matching expected content size. Use skeleton loaders that match final layout dimensions.',
          autoFixCode: `// Before:\n<div>{data.map(item => <Card key={item.id}>{item.name}</Card>)}</div>\n// After:\n<div style={{ minHeight: '200px' }}>\n  {isLoading ? <Skeleton className="h-48 w-full" /> : data.map(item => <Card key={item.id}>{item.name}</Card>)}\n</div>`,
        });
      }
    }
  }
}

/* ───────────── Rule: UX-PP-002 — FID: heavy computation on mount ───────────── */
export class FirstInputDelayRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-PP-002',
    name: 'First Input Delay (FID) — Heavy Computation on Component Mount',
    description: 'Detects heavy computational loops or large data processing triggered on component mount that blocks main thread',
    category: 'ux-perceived-perf',
    severity: 'medium',
    techniqueNumber: 126,
    pillar: 3,
    tags: ['ux', 'fid', 'main-thread', 'blocking'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.match(/useEffect\s*\(\s*\(\)\s*=>\s*\{/)) continue;

        const effectContent = lines.slice(i, i + 40).join('\n');
        const heavyOps = [];

        if (effectContent.match(/for\s*\(.*\d{5,}/) || effectContent.match(/\.map\s*\([^)]{200,}/)) heavyOps.push('large loop');
        if (effectContent.match(/JSON\.(stringify|parse)\s*\([^)]{500,}/)) heavyOps.push('large JSON parse');
        if (effectContent.match(/\.sort\s*\(/) && effectContent.match(/\d{4,}/)) heavyOps.push('large array sort');
        if (effectContent.match(/processData|transformData|compute|calculate|aggregate|heavy/i)) heavyOps.push('heavy processing function');
        if (effectContent.match(/new\s+Worker|WebSocket/i)) heavyOps.push('connection init');

        if (heavyOps.length > 0) {
          this.emit(ctx, {
            title: 'First Input Delay — Heavy Computation on Mount Blocks Main Thread',
            message: `useEffect at line ${i + 1} performs heavy operations (${heavyOps.join(', ')}) synchronously on component mount. This blocks the main thread and delays the first user interaction.`,
            file: p.file,
            line: i + 1,
            snippet: effectContent.slice(0, 250),
            confidence: 65,
            remediation: 'Defer heavy computation using requestIdleCallback(), setTimeout(), or Web Workers. Use lazy loading patterns for non-critical processing.',
            autoFixCode: `// Before:\nuseEffect(() => { const result = heavyComputation(largeData); }, []);\n// After:\nuseEffect(() => { const timer = setTimeout(() => { heavyComputation(largeData); }, 100); return () => clearTimeout(timer); }, []);`,
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-INT-003 — Missing loading state on async action ───────────── */
export class MissingLoadingStateRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-003',
    name: 'Missing Loading State — Async Operation Without Visual Feedback',
    description: 'Detects button click handlers with async operations that do not show loading/disabled state',
    category: 'ux-interaction',
    severity: 'high',
    techniqueNumber: 52,
    pillar: 3,
    tags: ['ux', 'loading', 'async', 'feedback'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/onClick|onSubmit|handleSubmit|handleClick/i.test(lines[i])) continue;
        if (!/await|async|\.then\s*\(|\.post|\.put|\.delete|fetch|axios/i.test(lines[i])) continue;
        if (/(?:setLoading|isLoading|loading|disabled|spinner|Skeleton|setSubmitting|isSubmitting|inProgress|busy)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Loading State on Async Action',
          message: 'Async action at line ' + ln + ' has no loading state or disabled button during execution. Users may click multiple times triggering duplicate operations.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          remediation: 'Set a loading state before the async call: setIsLoading(true); try { await action(); } finally { setIsLoading(false); }. Disable the button while loading.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-004 — Missing empty state for zero-data ───────────── */
export class MissingEmptyStateRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-004',
    name: 'Missing Empty State — Zero-Data Lists Show Nothing',
    description: 'Detects mapped lists/arrays without conditional empty state or zero-state UI',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 53,
    pillar: 3,
    tags: ['ux', 'empty-state', 'zero-data', 'list'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.(?:map|forEach)\s*\(/.test(lines[i])) continue;
        if (!/data|items|list|results|users|posts|records|entries|elements/i.test(lines[i])) continue;
        const context = lines.slice(Math.max(0, i - 3), i + 3).join(' ');
        if (/\.length\s*===?\s*0|\.length\s*<\s*1|empty|isEmpty|noData|noItems|nothing|zero.*state|placeholder|nobody|nada|nothing/i.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Empty State — Zero-Data List',
          message: 'Data list at line ' + ln + ' renders via .map() without checking for empty state. Users see a blank/empty screen when no data exists.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Add conditional empty state: {items.length === 0 ? <EmptyState message="No items found" /> : items.map(...)}.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-005 — Destructive action without confirmation ───────────── */
export class MissingConfirmationDialogRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-005',
    name: 'Destructive Action Without Confirmation Dialog',
    description: 'Detects delete/remove/ban/terminate actions without confirmation prompt',
    category: 'ux-interaction',
    severity: 'high',
    techniqueNumber: 54,
    pillar: 3,
    tags: ['ux', 'confirmation', 'destructive', 'dialog'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/delete|remove|ban|suspend|terminate|deactivate|archive|destroy|purge|wipe/i.test(lines[i])) continue;
        if (!/onClick|onPress|handleClick|onSubmit/i.test(lines[i])) continue;
        if (/(?:confirm|confirmDelete|ConfirmDialog|confirmation|areYouSure|sure\?|confirmAction|showConfirm|Modal.*confirm|alert.*delete)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Destructive Action Without Confirmation',
          message: 'Destructive action at line ' + ln + ' has no confirmation dialog. Users can accidentally delete/remove data with a single click.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          remediation: 'Wrap destructive actions in a confirmation dialog: "Are you sure? This action cannot be undone."',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-006 — Missing undo mechanism ───────────── */
export class MissingUndoRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-006',
    name: 'Missing Undo Mechanism for Reversible Action',
    description: 'Detects reversible actions (update, status change) without undo/snackbar undo option',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 55,
    pillar: 3,
    tags: ['ux', 'undo', 'snackbar', 'toast'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/update|change|modify|edit|toggle|switch|mark|setStatus|changeStatus|archive/i.test(lines[i])) continue;
        if (!/onClick|onSubmit|handleAction/i.test(lines[i])) continue;
        if (/\bundo\b|undoStack|undoManager|revert|rollback|undoAction|snackbar.*undo|toast.*undo/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Undo Mechanism',
          message: 'Reversible action at line ' + ln + ' has no undo option. Users expect a brief undo window (snackbar with undo button) for non-destructive changes.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
          remediation: 'Show a snackbar with "Undo" button after reversible actions. Implement a 5-second undo window before committing the change.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-007 — Form submission without validation ───────────── */
export class MissingFormValidationRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-007',
    name: 'Form Submission Without Client-Side Validation',
    description: 'Detects form submit handlers without prior validation check',
    category: 'ux-interaction',
    severity: 'high',
    techniqueNumber: 45,
    pillar: 3,
    tags: ['ux', 'forms', 'validation', 'feedback'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/onSubmit|handleSubmit|submitForm/i.test(lines[i])) continue;
        if (/(?:validate|validation|zod|joi|yup|formik|react-hook-form|useForm|checkValidity|reportValidity|isValid|errors)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Form Submission Without Client Validation',
          message: 'Form submit at line ' + ln + ' without client-side validation. Users submit invalid data and wait for server error.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Add client-side validation with clear error messages next to each field. Validate on blur and on submit.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-008 — Infinite scroll without loading indicator ───────────── */
export class InfiniteScrollNoIndicatorRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-008',
    name: 'Infinite Scroll Without Loading Indicator',
    description: 'Detects infinite scroll/pagination implementations without visible loading indicator',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 56,
    pillar: 3,
    tags: ['ux', 'infinite-scroll', 'loading', 'pagination'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/infiniteScroll|onScroll|IntersectionObserver|loadMore|fetchMore|hasMore/i.test(lines[i])) continue;
        if (/spinner|loading|Loader|isLoading|isFetching|fetching|Skeleton|progress/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Infinite Scroll Without Loading Indicator',
          message: 'Infinite scroll at line ' + ln + ' has no loading indicator. Users do not know more content is being loaded.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Show a loading spinner or skeleton at the bottom of the list while fetching the next page.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-009 — Toast/snackbar without auto-dismiss ───────────── */
export class ToastNoAutoDismissRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-009',
    name: 'Toast/Snackbar Without Auto-Dismiss — Persistent Notification',
    description: 'Detects toast/snackbar implementations without auto-dismiss timeout',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 77,
    pillar: 3,
    tags: ['ux', 'toast', 'snackbar', 'dismiss'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/toast|snackbar|notification|notify/i.test(lines[i])) continue;
        if (/duration|autoClose|autoDismiss|autoHide|timeout|dismissAfter|closeAfter/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Toast/Snackbar Without Auto-Dismiss',
          message: 'Notification at line ' + ln + ' has no auto-dismiss duration. Toast notifications should auto-dismiss after 3-5 seconds.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Add auto-dismiss timeout: toast({ duration: 4000 }). Persistent toasts block underlying content.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-010 — Modal without close button / Escape handler ───────────── */
export class ModalNoCloseButtonRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-010',
    name: 'Modal Without Close Button / Escape Handler',
    description: 'Detects modals without explicit close button or Escape key handler',
    category: 'ux-interaction',
    severity: 'high',
    techniqueNumber: 57,
    pillar: 3,
    tags: ['ux', 'modal', 'close', 'escape'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/modal|Modal|dialog|Dialog|drawer|Drawer|popover|Popover|overlay|Overlay/i.test(lines[i])) continue;
        if (!/open|isOpen|show|visible/.test(lines[i])) continue;
        const context = lines.slice(i, i + 15).join(' ');
        if (/onClose|onDismiss|handleClose|closeModal|toggleOpen|setOpen|Escape|escape|closeButton|X\b/ .test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Modal Without Close/ Escape Handler',
          message: 'Modal at line ' + ln + ' has no visible close button or Escape key handler. Users cannot dismiss the modal.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 78,
          remediation: 'Add a close button (X) and onKeyDown handler for Escape: onKeyDown={(e) => e.key === "Escape" && onClose()}.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-011 — Search without debounce ───────────── */
export class SearchWithoutDebounceRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-011',
    name: 'Search Input Without Debounce — Excessive API Calls',
    description: 'Detects search inputs that fire API calls on every keystroke without debounce',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 58,
    pillar: 3,
    tags: ['ux', 'search', 'debounce', 'performance'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/search|Search|autocomplete|typeahead|suggest|query/i.test(lines[i])) continue;
        if (!/onChange|onInput|handleChange/.test(lines[i])) continue;
        if (!/fetch|axios|api|searchQuery|getSearch|useQuery/.test(lines[i])) continue;
        if (/debounce|Debounce|debounced|setTimeout.*300|setTimeout.*500|timer|delay|throttle/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Search Without Debounce',
          message: 'Search input at line ' + ln + ' triggers API call on every keystroke without debounce. Results in N requests per second (where N = typing speed).',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 72,
          remediation: 'Debounce search input with 300-500ms delay: const debouncedSearch = useMemo(() => debounce(fetchResults, 300), []).',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-012 — Page without document title ───────────── */
export class MissingDocumentTitleRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-012',
    name: 'Page Without Document Title — Tab/Screen Reader Shows URL',
    description: 'Detects page components that do not set document.title',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 59,
    pillar: 3,
    tags: ['ux', 'title', 'document-title', 'seo'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      let pageCount = 0;
      for (let i = 0; i < lines.length; i++) {
        if (!/function\s+\w*Page|const\s+\w*Page\s*=|export\s+default\s+function\s+\w*Page/i.test(lines[i])) continue;
        pageCount++;
        const context = lines.slice(i, i + 20).join(' ');
        if (/document\.title|useTitle|useDocumentTitle|Helmet|helmet|head>|<title/i.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Page Without Document Title',
          message: 'Page component at line ' + ln + ' does not set document.title. Browser tab shows URL instead of meaningful page name.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Set document.title in each page component: useDocumentTitle("Page Name - App Name") or using react-helmet.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-013 — Multi-step form without progress indicator ───────────── */
export class MultiStepNoProgressRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-013',
    name: 'Multi-Step Form Without Progress Indicator',
    description: 'Detects multi-step/wizard forms without step progress indicator',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 60,
    pillar: 3,
    tags: ['ux', 'forms', 'multi-step', 'progress', 'wizard'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:step|wizard|multiStep|multi.?step|onboarding|checkout|signup|register).*(?:step|page|stage)/i.test(lines[i])) continue;
        if (!/currentStep|step|activeStep|page\s*\d|stage/i.test(lines[i])) continue;
        if (/(?:progress|stepper|StepIndicator|stepIndicator|steps\s*:|breadcrumb|dot|stage.*indicator|wizardProgress)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Multi-Step Form Without Progress Indicator',
          message: 'Multi-step flow at line ' + ln + ' has no progress indicator. Users do not know how many steps remain or where they are.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Add a step progress indicator: "Step 2 of 4" with visual stepper showing completed, current, and upcoming steps.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-014 — Unsaved changes prompt missing ───────────── */
export class UnsavedChangesPromptRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-014',
    name: 'Missing Unsaved Changes Warning on Page Leave',
    description: 'Detects forms/editors without beforeunload or router guard for unsaved changes',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 61,
    pillar: 3,
    tags: ['ux', 'unsaved', 'form', 'navigation', 'guard'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<form|<input|<textarea|<select|editor|Editor|contentEditable/i.test(lines[i])) continue;
        if (!/dirty|isDirty|changed|unsaved|modified|touched|isModified/i.test(lines[i])) continue;
        if (/(?:beforeunload|beforeUnload|useBeforeUnload|router\.block|navigation\.guard|confirmLeave|preventLeave|blockNavigation)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Unsaved Changes Prompt',
          message: 'Form/editor at line ' + ln + ' tracks dirty state but has no beforeunload or route guard. Users lose unsaved work on accidental navigation.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Add window.addEventListener("beforeunload", ...) or router guard: router.beforeEach((to, from, next) => { if (isDirty && !confirm("Unsaved changes")) next(false) }).',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-PP-003 — Missing skeleton loader on data fetch ───────────── */
export class MissingSkeletonLoaderRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-PP-003',
    name: 'Missing Skeleton Loader — Async Content Appears Abruptly',
    description: 'Detects async data rendering without skeleton or placeholder while loading',
    category: 'ux-perceived-perf',
    severity: 'medium',
    techniqueNumber: 102,
    pillar: 3,
    tags: ['ux', 'skeleton', 'loading', 'cls'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/isLoading|isFetching|loading|status.*loading/i.test(lines[i])) continue;
        if (!/data|result|response|items|users|posts|list/i.test(lines[i])) continue;
        if (/(?:skeleton|Skeleton|placeholder|Placeholder|spinner|Spinner|loader|Loader|shimmer|Shimmer|loading.*div)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Skeleton Loader',
          message: 'Loading state at line ' + ln + ' has no skeleton/placeholder. Content appears abruptly causing layout shift and poor perceived performance.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Show skeleton loaders matching the final content layout while data loads. Replace skeletons with content once loaded.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-PP-004 — Large images without lazy loading ───────────── */
export class MissingLazyLoadingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-PP-004',
    name: 'Large Image Without Lazy Loading — Below-Fold Bandwidth Waste',
    description: 'Detects <img> tags without loading="lazy" for below-fold images',
    category: 'ux-perceived-perf',
    severity: 'medium',
    techniqueNumber: 103,
    pillar: 3,
    tags: ['ux', 'lazy-loading', 'image', 'performance'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<img\b/.test(lines[i])) continue;
        if (/loading=['"]lazy['"]/.test(lines[i])) continue;
        if (/\.src\s*=/.test(lines[i]) && !/loading.*lazy/i.test(lines[i])) continue;
        const count = (lines[i].match(/<img\b/g) || []).length;
        if (count > 0 && !/logo|icon|avatar|thumbnail|small/i.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Large Image Without Lazy Loading',
            message: '<img> at line ' + ln + ' without loading="lazy". Below-fold images download immediately, wasting bandwidth and delaying LCP.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
            remediation: 'Add loading="lazy" to below-fold images. Use Next.js Image component with lazy boundary.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-PP-005 — Missing transition animation for state change ───────────── */
export class MissingStateTransitionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-PP-005',
    name: 'Abrupt State Change — Missing Transition Animation',
    description: 'Detects conditional rendering of elements without enter/exit animations',
    category: 'ux-perceived-perf',
    severity: 'low',
    techniqueNumber: 104,
    pillar: 3,
    tags: ['ux', 'animation', 'transition', 'state-change'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\{isOpen\s*&&|\{show\s*&&|\{visible\s*&&|\{isVisible\s*&&/.test(lines[i])) continue;
        if (/transition|animation|animate|fade|slide|CSSTransition|motion|framer|aos|react-spring|gsap|AnimatePresence|enter|exit/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Abrupt State Change — Missing Transition',
          message: 'Conditional render at line ' + ln + ' uses short-circuit && without enter/exit animation. Elements appear/disappear abruptly.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 45,
          remediation: 'Use AnimatePresence (framer-motion) or CSS transitions for enter/exit animations of dynamically rendered elements.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-PP-006 — Font loading causes invisible text (FOUT/FOIT) ───────────── */
export class FontLoadingFOUTRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-PP-006',
    name: 'Custom Font Without font-display: swap — Invisible Text During Load',
    description: 'Detects @font-face without font-display:swap causing Flash of Invisible Text (FOIT)',
    category: 'ux-perceived-perf',
    severity: 'medium',
    techniqueNumber: 105,
    pillar: 3,
    tags: ['ux', 'fonts', 'foit', 'fout', 'performance'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/@font-face/.test(lines[i])) continue;
        const context = lines.slice(i, i + 8).join(' ');
        if (/font-display:\s*swap/i.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Custom Font Without font-display: swap — FOIT',
          message: '@font-face at line ' + ln + ' without font-display: swap. Browser hides text for up to 3 seconds while font downloads (FOIT), harming LCP.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          remediation: 'Add font-display: swap to @font-face declarations so text renders with fallback font immediately.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-PP-007 — Missing progressive loading for large lists ───────────── */
export class MissingProgressiveLoadingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-PP-007',
    name: 'Large List Without Virtualization / Windowing',
    description: 'Detects rendering of large data lists without windowed/virtualized rendering',
    category: 'ux-perceived-perf',
    severity: 'high',
    techniqueNumber: 106,
    pillar: 3,
    tags: ['ux', 'virtualization', 'windowing', 'large-list', 'performance'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.map\s*\(.*\b(?:items|data|list|rows|results|users|posts|records|entries|elements)\b/i.test(lines[i])) continue;
        if (/(?:virtualize|Virtualize|react-window|react-virtuoso|react-virtualized|windowing|windowed|FixedSizeList|VariableSizeList|VirtualList|FlatList|FlashList|recycler|recyclerlistview)/i.test(lines[i])) continue;
        const context = lines.slice(Math.max(0, i - 5), i + 3).join(' ');
        if (/\b(slice|limit|take|page|first|top\s*\d+|\.length\s*<\s*\d+)/i.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Large List Without Virtualization',
          message: 'List render at line ' + ln + ' uses .map() on all items without windowing. Rendering 10K+ DOM nodes causes jank and frame drops.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Use react-window or react-virtuoso for lists over 100 items. Virtualize renders only visible rows.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-022 — Missing optimistic UI update ───────────── */
export class MissingOptimisticUpdateRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-022',
    name: 'Missing Optimistic UI Update on Mutation',
    description: 'Detects POST/PUT/DELETE API calls without optimistic UI state update before server response',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 62,
    pillar: 3,
    tags: ['ux', 'optimistic', 'mutation', 'ui-update'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.post\(|\.put\(|\.delete\(|\.patch\(|fetch\(.*['"].*POST|fetch\(.*['"].*PUT|fetch\(.*['"].*DELETE|fetch\(.*['"].*PATCH/i.test(lines[i])) continue;
        if (/setData|setState|setItems|setList|updateQueryData|optimistic|onMutate|onSettled|invalidateQueries/i.test(lines[i])) continue;
        const context = lines.slice(i, i + 10).join(' ');
        if (/\.then\s*\(/.test(context) || /await/.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Optimistic UI Update on Mutation',
          message: 'Mutation API call at line ' + ln + ' without optimistic state update. Users see stale UI until server responds, causing perceived slowness.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Update the UI state immediately (optimistically) before the API call completes, then revert on error.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-023 — Missing pull-to-refresh on list views ───────────── */
export class MissingPullToRefreshRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-023',
    name: 'Missing Pull-to-Refresh on List View',
    description: 'Detects list/feed views in mobile contexts without pull-to-refresh gesture',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 63,
    pillar: 3,
    tags: ['ux', 'pull-to-refresh', 'mobile', 'gesture'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/feed|Feed|list|List|inbox|Inbox|timeline|Timeline|thread|Thread/i.test(lines[i])) continue;
        if (!/scroll|Scroll|FlatList|List|map\(/.test(lines[i])) continue;
        if (/pullToRefresh|PullToRefresh|pullRefresh|PullRefresh|RefreshControl|onRefresh|refreshControl|swipeRefresh/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Pull-to-Refresh on List View',
          message: 'List view at line ' + ln + ' has no pull-to-refresh. Mobile users expect to pull down to refresh content.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 45,
          remediation: 'Add RefreshControl or pull-to-refresh component to enable pull-down gesture for refreshing the list.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-024 — Missing swipe gesture on carousel/tabs ───────────── */
export class MissingSwipeGestureRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-024',
    name: 'Missing Swipe Gesture on Carousel/Tab Navigation',
    description: 'Detects carousel or tab implementations without swipe gesture support on mobile',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 64,
    pillar: 3,
    tags: ['ux', 'swipe', 'gesture', 'carousel', 'tabs', 'mobile'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/carousel|Carousel|slider|Slider|tabs|Tabs|tabPanel|TabPanel/i.test(lines[i])) continue;
        if (/swipe|Swipe|gesture|Gesture|drag|Drag|onSwipe|pan|Pan/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Swipe Gesture on Carousel/Tabs',
          message: 'Carousel/tab component at line ' + ln + ' has no swipe gesture support. Mobile users expect to swipe left/right to navigate.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Add swipe gesture handlers (react-swipeable or framer-motion drag) for touch navigation.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-025 — Missing offline indicator ───────────── */
export class MissingOfflineIndicatorRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-025',
    name: 'Missing Offline Indicator — User Not Informed of Connectivity Loss',
    description: 'Detects fetch/axios calls without navigator.onLine check or offline fallback UI',
    category: 'ux-interaction',
    severity: 'high',
    techniqueNumber: 65,
    pillar: 3,
    tags: ['ux', 'offline', 'connectivity', 'fallback'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/fetch\s*\(|axios\.|\.get\(|\.post\(|\.put\(|\.delete\(/.test(lines[i])) continue;
        if (/(?:navigator\.onLine|onLine|isOnline|isOffline|offline|Offline|onlineStatus|useOnlineStatus|networkStatus)/i.test(lines[i])) continue;
        const context = lines.slice(i, i + 3).join(' ');
        if (!/\.catch|try\s*\{/.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Offline Indicator',
          message: 'Network call at line ' + ln + ' without offline check. Users get generic errors instead of explicit "You are offline" message.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Check navigator.onLine before API calls. Show an offline banner: "You are offline. Please check your connection."',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-026 — Missing retry on failed API calls ───────────── */
export class MissingRetryOnErrorRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-026',
    name: 'Missing Retry Button on Failed API Call',
    description: 'Detects caught API errors without a retry button or auto-retry mechanism',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 66,
    pillar: 3,
    tags: ['ux', 'retry', 'error', 'resilience'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.catch\s*\(/.test(lines[i]) && !/catch\s*\(/.test(lines[i])) continue;
        if (!/fetch|axios|api|query|mutate|request/i.test(lines[i])) continue;
        const context = lines.slice(i, i + 15).join(' ');
        if (/retry|Retry|retryCount|retryAttempt|onRetry|tryAgain|refresh/i.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Retry on Failed API Call',
          message: 'Catched API error at line ' + ln + ' without retry mechanism. Users see errors but cannot retry without refreshing the page.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Show a "Retry" button or implement automatic retry with exponential backoff on API failures.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-027 — Missing back navigation handler for modals/drawers ───────────── */
export class MissingBackNavigationHandlerRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-027',
    name: 'Missing Back Button Handler for Modal/Drawer',
    description: 'Detects modals or drawers opened without popstate/hash change handler for browser back button',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 67,
    pillar: 3,
    tags: ['ux', 'back-navigation', 'modal', 'drawer', 'popstate'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/open|isOpen|show|visible|toggle/i.test(lines[i])) continue;
        if (!/modal|Modal|drawer|Drawer|sidebar|Sidebar|panel|Panel|overlay|Overlay/i.test(lines[i])) continue;
        if (/(?:popstate|hashchange|onPopState|history\.push|history\.replace|useLocation)/i.test(lines[i])) continue;
        const context = lines.slice(i, i + 8).join(' ');
        if (/onClose|onDismiss|handleClose/.test(context)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Back Button Handler for Modal',
          message: 'Modal/drawer at line ' + ln + ' has no popstate or hash change handler. Browser back button closes the page instead of the overlay.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Push a history state when opening modal. Listen for popstate to close the modal on back button press.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-028 — Missing deep link handling ───────────── */
export class MissingDeepLinkRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-028',
    name: 'Missing Deep Link / Universal Link Handling',
    description: 'Detects mobile-web implementations without universal link or app link handling patterns',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 68,
    pillar: 3,
    tags: ['ux', 'deep-link', 'universal-link', 'mobile'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/mobile|Mobile|app|App|react-native|Native|capacitor|Cordova/i.test(lines[i])) continue;
        if (!/link|Link|url|URL|route|Route|navigate/i.test(lines[i])) continue;
        if (/(?:deepLink|deep.?link|universalLink|universal.?link|appLink|app.?link|handleLink|linking|Linking)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Deep Link Handling',
          message: 'Mobile-web component at line ' + ln + ' has no deep link handler. Users cannot navigate directly to this view via external links.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 35,
          remediation: 'Implement deep link handling using Linking API or Universal Links to allow direct navigation from external sources.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-029 — Missing clipboard feedback ───────────── */
export class MissingClipboardFeedbackRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-029',
    name: 'Missing Clipboard Write Feedback — No Visual Confirmation',
    description: 'Detects navigator.clipboard.writeText() calls without toast or visual confirmation',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 69,
    pillar: 3,
    tags: ['ux', 'clipboard', 'feedback', 'toast'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/clipboard\.writeText|clipboard\.write|copyToClipboard|copy.*clipboard/i.test(lines[i])) continue;
        if (/toast|notify|notification|snackbar|alert|message|Copied|copied|tooltip/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Clipboard Write Feedback',
          message: 'Clipboard copy at line ' + ln + ' has no visual confirmation. Users are not notified that content was copied.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Show a toast or tooltip "Copied to clipboard" after the clipboard write operation.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-030 — Missing drag-and-drop visual feedback ───────────── */
export class MissingDragDropFeedbackRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-030',
    name: 'Missing Drag-and-Drop Visual Feedback',
    description: 'Detects drag-and-drop implementations without drag overlay or drop indicator visuals',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 70,
    pillar: 3,
    tags: ['ux', 'drag-drop', 'feedback', 'visual'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/onDrag|onDrop|dragStart|dragOver|dragEnd|DragDropContext|Droppable|Draggable|dnd|react-beautiful-dnd|@dnd-kit/i.test(lines[i])) continue;
        if (/(?:opacity|scale|transform|shadow|border|outline|dropIndicator|dragOverlay|placeholder)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Drag-and-Drop Visual Feedback',
          message: 'Drag-drop implementation at line ' + ln + ' has no visual feedback (drag overlay, opacity change, drop indicator). Users cannot see what is being dragged or where it will land.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Add drag overlay showing the dragged item, reduce opacity on the source, and show a drop indicator line at the target position.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-031 — Missing search history ───────────── */
export class MissingSearchHistoryRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-031',
    name: 'Missing Recent Search History Dropdown',
    description: 'Detects search inputs without recent search history display',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 71,
    pillar: 3,
    tags: ['ux', 'search', 'history', 'usability'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/search|Search|query|Query|find|Find/i.test(lines[i])) continue;
        if (!/input|Input|field|onChange|onSubmit/i.test(lines[i])) continue;
        if (/(?:history|recent|History|Recent|suggestion|autocomplete)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Recent Search History',
          message: 'Search input at line ' + ln + ' has no recent search history dropdown. Users must retype previous searches.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
          remediation: 'Store recent searches in localStorage and show a dropdown on input focus with previous search terms.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-032 — Missing autocomplete suggestions ───────────── */
export class MissingAutocompleteRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-032',
    name: 'Missing Autocomplete/Datalist Suggestions',
    description: 'Detects long-form inputs without autocomplete or <datalist> suggestions',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 72,
    pillar: 3,
    tags: ['ux', 'autocomplete', 'datalist', 'suggestions'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/input|Input|textarea|Textarea|select|Select/i.test(lines[i])) continue;
        if (!/suggest|options|data.*source|onSearch|filter|typeahead/i.test(lines[i])) continue;
        if (/(?:datalist|autocomplete|AutoComplete|suggestion|dropdown|comboBox)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Autocomplete/Datalist Suggestions',
          message: 'Input at line ' + ln + ' has suggestions data but no autocomplete or <datalist>. Users must type manually without predictive help.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 45,
          remediation: 'Use <datalist> for simple suggestions or an autocomplete component with debounced search for dynamic suggestions.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-033 — Missing idle session timeout ───────────── */
export class MissingIdleSessionTimeoutRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-033',
    name: 'Missing Idle Session Timeout Warning',
    description: 'Detects authenticated apps without idle session timeout warning',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 73,
    pillar: 3,
    tags: ['ux', 'session', 'timeout', 'idle', 'auth'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/auth|Auth|login|Login|token|Token|session|Session|user|User/i.test(lines[i])) continue;
        if (!/Provider|Context|useEffect|App/i.test(lines[i])) continue;
        if (/(?:idle|inactive|timeout|time.?out|sessionTimer|activity|IdleTimer|IdleHandler)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Idle Session Timeout Warning',
          message: 'Auth component at line ' + ln + ' has no idle session timeout. Users may lose unsaved work when session expires without warning.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Implement an idle timer that warns users before session timeout with option to extend session.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-034 — Missing cross-tab sync ───────────── */
export class MissingTabSyncRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-034',
    name: 'Missing Cross-Tab State Sync via Storage Event',
    description: 'Detects localStorage-based state management without storage event listener for multi-tab sync',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 74,
    pillar: 3,
    tags: ['ux', 'tab-sync', 'localStorage', 'storage-event'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/localStorage|localStorage|sessionStorage/.test(lines[i])) continue;
        if (!/getItem|setItem/.test(lines[i])) continue;
        if (/(?:storage\s*\(|addEventListener.*storage|onStorage|storageChange|syncState)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Cross-Tab State Sync',
          message: 'localStorage access at line ' + ln + ' without storage event listener. Changes in one tab are not reflected in other open tabs.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Add window.addEventListener("storage", (e) => { ... }) to sync state changes across browser tabs.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-035 — Missing beforeinstallprompt handler ───────────── */
export class MissingBeforeInstallPromptRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-035',
    name: 'Missing beforeinstallprompt PWA Install Handler',
    description: 'Detects PWA service worker registration without beforeinstallprompt event handler',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 75,
    pillar: 3,
    tags: ['ux', 'pwa', 'install', 'beforeinstallprompt', 'service-worker'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/serviceWorker|service.?worker|navigator\.serviceWorker|register.*sw/i.test(lines[i])) continue;
        if (/(?:beforeinstallprompt|BeforeInstallPrompt|installPrompt|installBanner|addEventListener.*install)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing beforeinstallprompt PWA Install Handler',
          message: 'Service worker registration at line ' + ln + ' without beforeinstallprompt handler. Users cannot install the PWA to their home screen.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Listen for the beforeinstallprompt event, prevent default, and show an install button to the user.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-036 — Missing keyboard navigation in data grid ───────────── */
export class MissingKeyboardNavigationGridRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-036',
    name: 'Missing Keyboard Navigation in Data Grid/Table',
    description: 'Detects data grids or tables without arrow key navigation support',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 78,
    pillar: 3,
    tags: ['ux', 'keyboard', 'grid', 'table', 'navigation'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/DataGrid|dataGrid|Table|table|Grid|grid|ag-grid|react-table|tanstack/i.test(lines[i])) continue;
        if (!/onKeyDown|onKeyUp|handleKey|keyHandler|arrowKey|ArrowUp|ArrowDown|ArrowLeft|ArrowRight/.test(lines[i])) continue;
        const context = lines.slice(i, i + 10).join(' ');
        if (!/ArrowUp|ArrowDown/.test(context)) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Missing Keyboard Navigation in Data Grid',
            message: 'Data grid at line ' + ln + ' handles some keys but has no arrow key navigation. Keyboard-only users cannot navigate cells with arrow keys.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
            remediation: 'Add arrow key handlers (ArrowUp, ArrowDown, ArrowLeft, ArrowRight) to navigate between cells or rows.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-INT-037 — Missing accessibility announcement for dynamic content ───────────── */
export class MissingAccessibilityAnnouncementRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-037',
    name: 'Missing aria-live Region for Dynamic Content Updates',
    description: 'Detects dynamic content updates (loading, search results) without aria-live announcement region',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 79,
    pillar: 3,
    tags: ['ux', 'a11y', 'aria-live', 'dynamic-content', 'screen-reader'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/isLoading|loading|isFetching|isSearching|searchResults|resultsCount|noResults|found\s+\d+/i.test(lines[i])) continue;
        if (/(?:aria-live|role=['"]status['"]|role=['"]alert['"]|aria-atomic|aria-relevant|announce|Announce|srOnly|screen-reader)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing aria-live Region for Dynamic Updates',
          message: 'Dynamic content update at line ' + ln + ' without aria-live region. Screen reader users are not notified of content changes like search results loading.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Add a visually hidden aria-live="polite" region that announces dynamic updates, e.g., "10 results found".',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-038 — Missing image zoom on product gallery ───────────── */
export class MissingImageZoomRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-038',
    name: 'Missing Image Zoom on Product/Ecommerce Gallery',
    description: 'Detects product image galleries without zoom on hover/tap',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 80,
    pillar: 3,
    tags: ['ux', 'image-zoom', 'ecommerce', 'gallery'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/product|Product|gallery|Gallery|image|Image|photo|Photo|carousel|Carousel/i.test(lines[i])) continue;
        if (!/img|Image|picture|Figure|<img/i.test(lines[i])) continue;
        if (/(?:zoom|Zoom|magnify|Magnify|lightbox|Lightbox|imagePreview|imageZoom|enlarge)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Image Zoom on Gallery',
          message: 'Product image gallery at line ' + ln + ' has no zoom capability. Users cannot inspect product details closely.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Add image zoom on hover (desktop) or tap-to-zoom (mobile) for product images.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-039 — Missing push notification permission prompt ───────────── */
export class MissingPushNotificationPermissionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-039',
    name: 'Push Notification Without Permission Prompt',
    description: 'Detects Notification API usage without checking/requesting permission',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 81,
    pillar: 3,
    tags: ['ux', 'notifications', 'permission'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/Notification/.test(lines[i])) continue;
        if (/permission|requestPermission|granted|denied|default/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Push Notification Permission Prompt Missing',
          message: 'Notification API call at line ' + ln + ' without permission check. Notification.requestPermission() must be called before sending notifications.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Add Notification.requestPermission() flow. Show a soft prompt before the browser dialog explaining why notifications are useful.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-040 — Missing camera/mic permission fallback ───────────── */
export class MissingCameraMicFallbackRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-040',
    name: 'Camera/Microphone Access Without Permission Fallback',
    description: 'Detects getUserMedia without error handling for permission denial',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 82,
    pillar: 3,
    tags: ['ux', 'camera', 'microphone', 'permission'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/getUserMedia|enumerateDevices/i.test(lines[i])) continue;
        const block = lines.slice(i, i + 15).join(' ');
        if (/catch|error|denied|NotAllowedError|permission.*denied|fallback/i.test(block)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Camera/Microphone Without Permission Denial Fallback',
          message: 'getUserMedia at line ' + ln + ' without error handling for denied permission. Users who deny access get a silent failure with no feedback.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Add catch handler: show a message explaining why camera/mic is needed and how to enable it in browser settings.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-041 — Missing file upload progress ───────────── */
export class MissingFileUploadProgressRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-041',
    name: 'File Upload Without Progress Indicator',
    description: 'Detects file upload via fetch/XHR without progress tracking',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 83,
    pillar: 3,
    tags: ['ux', 'upload', 'progress', 'feedback'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/FormData|upload|file|File/.test(lines[i])) continue;
        if (!/fetch|XMLHttpRequest|xhr|axios|request/.test(lines[i])) continue;
        if (/onprogress|upload\.onprogress|progressEvent|loaded|total|percent|progress/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'File Upload Without Progress Indicator',
          message: 'File upload at line ' + ln + ' without progress tracking. Users have no feedback on upload speed, remaining time, or completion.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Use XMLHttpRequest.upload.onprogress or fetch with ReadableStream to show upload progress percentage.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-042 — Missing data export progress ───────────── */
export class MissingDataExportProgressRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-042',
    name: 'Data Export Without Progress/ETA',
    description: 'Detects data export/generation without progress indication',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 84,
    pillar: 3,
    tags: ['ux', 'export', 'progress', 'feedback'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/export|generate|report|download|render|compile/i.test(lines[i])) continue;
        if (/progress|loading|spinner|skeleton|status|preparing|generating|ETA|estimated/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Data Export Without Progress Indication',
          message: 'Export/generation at line ' + ln + ' without progress indicator. Users may think the app is frozen if export takes more than 2 seconds.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
          remediation: 'Add a progress bar with current step description. For long exports, show estimated time remaining via WebSocket or polling.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-043 — Missing input character limit indicator ───────────── */
export class MissingCharLimitIndicatorRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-043',
    name: 'Text Input Without Character Limit Indicator',
    description: 'Detects textarea/input with maxLength but no remaining chars indicator',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 85,
    pillar: 3,
    tags: ['ux', 'input', 'character-limit', 'feedback'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/maxLength|maxlength|maxLength/.test(lines[i])) continue;
        if (/charCount|char_count|remaining|charsLeft|chars.*left|counter|length.*indicator/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Character Limit Without Remaining Count Indicator',
          message: 'Input with maxLength at line ' + ln + ' has no remaining characters indicator. Users discover the limit only when typing stops.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Show remaining characters: {maxLength - input.length} remaining. Use accessible live region to announce when approaching limit.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-044 — Missing password strength indicator ───────────── */
export class MissingPasswordStrengthIndicatorRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-044',
    name: 'Password Input Without Strength Visual Indicator',
    description: 'Detects password fields without strength meter component',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 86,
    pillar: 3,
    tags: ['ux', 'password', 'strength', 'feedback'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/type\s*=\s*['"]password['"]|password|Password/.test(lines[i])) continue;
        if (/strength|Strength|meter|Meter|score|Score|zxcvbn|entropy|complexity|strong|weak|secure/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Password Input Without Strength Indicator',
          message: 'Password field at line ' + ln + ' has no strength indicator. Users create weak passwords without real-time feedback on entropy.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Add a password strength meter using zxcvbn. Show: weak/fair/strong/very strong with color coding. Require minimum strength for submission.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-045 — Missing input formatting mask ───────────── */
export class MissingInputMaskRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-045',
    name: 'Phone/Date/SSN Input Without Masked Formatting',
    description: 'Detects phone/date/SSN inputs without input mask or formatting',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 87,
    pillar: 3,
    tags: ['ux', 'input-mask', 'formatting'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:phone|telephone|phoneNumber|date|birthDate|ssn|zip|postal|creditCard)\b/i.test(lines[i])) continue;
        if (!/input|Input|field|Field|textField|TextField/.test(lines[i])) continue;
        if (/mask|Mask|format|Format|pattern|Pattern|cleave|imask|inputmask|react-number-format|react-input-mask|autoFormat/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Structured Input Without Input Mask',
          message: 'Field "' + (lines[i].match(/(phone|date|ssn|zip|creditCard)/i)?.[0] || 'structured') + '" at line ' + ln + ' has no input mask. Users must guess the expected format.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Add input mask: (###) ###-#### for phone, ##/##/#### for date. Use libraries like react-input-mask or imask.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-046 — Missing auto-save indicator ───────────── */
export class MissingAutoSaveIndicatorRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-046',
    name: 'Auto-Save Without Visual Feedback Indicator',
    description: 'Detects auto-save logic without saving/saved/error indicator',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 88,
    pillar: 3,
    tags: ['ux', 'auto-save', 'feedback'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/autoSave|auto_save|autosave|debounce.*save|save.*debounce|save.*timeout|timeout.*save/i.test(lines[i])) continue;
        if (/saving|Saving|saved|Saved|error.*save|save.*error|indicator|status|lastSaved/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Auto-Save Without Visual Feedback',
          message: 'Auto-save at line ' + ln + ' has no saving/saved indicator. Users do not know if their work is persisted, leading to data loss anxiety.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Show status indicator: "Saving...", "Saved", "Save failed". Use a subtle indicator like a green checkmark or "Saved" text that fades.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-047 — Missing long-press context menu ───────────── */
export class MissingLongPressContextMenuRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-047',
    name: 'List Items Without Long-Press Context Actions',
    description: 'Detects list item interactions without long-press context menu',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 89,
    pillar: 3,
    tags: ['ux', 'long-press', 'context-menu', 'mobile'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:item|Item|row|Row|cell|Cell|message|Message|card|Card|listItem|ListItem|itemData).*(?:onPress|onClick|handlePress|handleClick|press|Press)/i.test(lines[i])) continue;
        if (/longPress|LongPress|long_press|onLongPress|contextMenu|ContextMenu|onContextMenu|hold|Hold|onHold|actionSheet|ActionSheet|swipeAction/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'List Item Without Long-Press Context Actions',
          message: 'Interactive item at line ' + ln + ' has no long-press context menu. On mobile, users expect long-press for additional actions (edit, delete, share).',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 35,
          remediation: 'Add onLongPress handler that shows an action sheet or popover with contextual actions. For mobile, consider swipeable rows as alternative.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-048 — Missing keyboard dismiss on scroll ───────────── */
export class MissingKeyboardDismissOnScrollRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-048',
    name: 'Keyboard Not Dismissed on Scroll',
    description: 'Detects ScrollView/ListView without keyboard dismissal behavior',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 90,
    pillar: 3,
    tags: ['ux', 'keyboard', 'scroll', 'mobile'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/ScrollView|FlatList|SectionList|ListView|scroll|Scroll/i.test(lines[i])) continue;
        if (/keyboardShouldPersistTaps|keyboardDismissMode|dismissKeyboard|Keyboard\.dismiss|onScroll.*keyboard/i.test(lines[i])) continue;
        if (/\binput|Input|TextInput|textField|TextField/i.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Keyboard Not Dismissed on Scroll',
            message: 'ScrollView at line ' + ln + ' with text inputs but no keyboardDismissMode. Keyboard stays open when scrolling, hiding half the screen on mobile.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
            remediation: 'Set keyboardDismissMode="on-drag" on ScrollView. Add Keyboard.dismiss() on scroll for web touch events.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-INT-049 — Missing pull-to-refresh on data lists ───────────── */
export class MissingPullToRefreshDataRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-049',
    name: 'Data List Without Pull-to-Refresh',
    description: 'Detects list components fetching data without pull-to-refresh',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 91,
    pillar: 3,
    tags: ['ux', 'pull-to-refresh', 'data', 'mobile'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:fetch|get|load|query).*(?:data|items|list|posts|feeds|messages|notifications|updates)/i.test(lines[i])) continue;
        if (!/ScrollView|FlatList|SectionList|ListView|refreshControl|RefreshControl|pullRefresh|onRefresh/i.test(lines[i])) continue;
        if (/refreshControl|RefreshControl|onRefresh|isRefreshing|pullRefresh/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Data List Without Pull-to-Refresh',
          message: 'Data fetch at line ' + ln + ' without pull-to-refresh. Users must navigate away and back to see fresh data.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 45,
          remediation: 'Add RefreshControl to ScrollView/FlatList with onRefresh handler that re-fetches data and manages isRefreshing state.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-050 — Missing empty search state ───────────── */
export class MissingEmptySearchStateRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-050',
    name: 'Search Without Empty Results State',
    description: 'Detects search results display without handling zero-results case',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 92,
    pillar: 3,
    tags: ['ux', 'search', 'empty-state', 'feedback'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/search|Search|filter|Filter|query|find/i.test(lines[i])) continue;
        if (!/result|Result|match|Match|item|list/i.test(lines[i])) continue;
        if (/noResults|no_results|emptyState|emptyResults|no_result|notFound|notFoundView|noDataView|empty.*state/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Search Without Empty Results State',
          message: 'Search/filter at line ' + ln + ' has no empty results view. Users see a blank page when no matches exist, with no guidance on how to adjust their query.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Show a helpful empty state: "No results found for [query]. Try different keywords or adjust filters." Include suggestion chips or a search tips section.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-051 — Missing network error state ───────────── */
export class MissingNetworkErrorStateRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-051',
    name: 'Network Error Without User-Friendly Message',
    description: 'Detects fetch/API calls without user-facing network error handling',
    category: 'ux-interaction',
    severity: 'high',
    techniqueNumber: 93,
    pillar: 3,
    tags: ['ux', 'error-state', 'network', 'offline'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/fetch|axios|request|query|mutate/i.test(lines[i])) continue;
        const block = lines.slice(i, i + 20).join(' ');
        if (!/catch|error|fail/i.test(block)) continue;
        if (/toast|alert|message|notification|snackbar|errorView|error_boundary|errorState|errorMessage|showError|setError|retry|fallback/i.test(block)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Network Error Without User-Friendly Message',
          message: 'API call at line ' + ln + ' catches error but does not show a user-friendly message. Users see a technical error or blank state.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Show a friendly error message: "Something went wrong. Please check your connection and try again." Include a retry button and offline indicator if applicable.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-052 — Missing onboarding / first-run experience ───────────── */
export class MissingFirstRunExperienceRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-052',
    name: 'Missing Onboarding / First-Run Experience',
    description: 'Detects app entry point without onboarding or walkthrough',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 94,
    pillar: 3,
    tags: ['ux', 'onboarding', 'first-run', 'walkthrough'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/App|app|Root|root|index|main|entry|router/i.test(lines[i])) continue;
        if (!/navigat|route|screen|page|component/i.test(lines[i])) continue;
        if (/onboarding|Onboarding|walkthrough|tour|firstLaunch|first_launch|intro|welcome|getStarted|splash|tutorial/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing Onboarding / First-Run Experience',
          message: 'App entry point at line ' + ln + ' has no onboarding flow. First-time users have no guided introduction to key features.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 30,
          remediation: 'Add a brief onboarding sequence (3-4 screens) highlighting key features. Store completion status in AsyncStorage and skip on subsequent launches.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-053 — Missing haptic feedback for actions ───────────── */
export class MissingHapticFeedbackRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-053',
    name: 'Key Actions Without Haptic/Tactile Feedback (Mobile)',
    description: 'Detects button presses/actions without haptic feedback on mobile',
    category: 'ux-interaction',
    severity: 'low',
    techniqueNumber: 95,
    pillar: 3,
    tags: ['ux', 'haptic', 'feedback', 'mobile'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/onPress|onClick|handlePress|handleClick|submit|delete|remove|complete|confirm/i.test(lines[i])) continue;
        if (/haptic|Haptic|impact|notification|selection|trigger|vibrate|Vibration|react-native-haptic-feedback|expo-haptics/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Key Actions Without Haptic Feedback',
          message: 'Action handler at line ' + ln + ' has no haptic feedback. Mobile users expect subtle vibration feedback for confirmations, errors, and selections.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 30,
          remediation: 'Add haptic feedback: Haptics.impact() or Vibration.vibrate() for confirmations. Use light impact for buttons, medium for destructive actions.',
        });
      }
    }
  }
}

/* ───────────── Rule: UX-INT-054 — Missing cross-platform safe area handling ───────────── */
export class MissingSafeAreaRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-054',
    name: 'Missing Safe Area / Notch Handling on Mobile',
    description: 'Detects mobile UI without SafeAreaView or safe area insets',
    category: 'ux-interaction',
    severity: 'high',
    techniqueNumber: 96,
    pillar: 3,
    tags: ['ux', 'safe-area', 'notch', 'mobile'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/View|view|container|Container|Screen|screen/i.test(lines[i])) continue;
        if (/react-native|ReactNative|mobile|Mobile/i.test(lines[i])) {
          if (/SafeAreaView|safeAreaView|safeAreaInsets|SafeAreaInsets|safeArea|SafeArea|safeAreaProvider|SafeAreaProvider|useSafeAreaInsets|useSafeArea/i.test(lines[i])) continue;
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Missing Safe Area Handling on Mobile',
            message: 'Mobile View at line ' + ln + ' without SafeAreaView. Content may be hidden under status bar, notch, or home indicator on iOS/Android.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
            remediation: 'Wrap root views in SafeAreaView from react-native-safe-area-context. Use safe area insets for absolute positioned elements.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: UX-INT-055 — Missing theme toggle / dark mode support ───────────── */
export class MissingDarkModeSupportRule extends BaseRule {
  meta: RuleMeta = {
    id: 'UX-INT-055',
    name: 'Missing Dark Mode / Theme Toggle Support',
    description: 'Detects color/style definitions without dark mode variant',
    category: 'ux-interaction',
    severity: 'medium',
    techniqueNumber: 97,
    pillar: 3,
    tags: ['ux', 'theme', 'dark-mode', 'accessibility'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/color|Color|style|Style|theme|Theme|backgroundColor|background|textColor/i.test(lines[i])) continue;
        if (/(?:#fff|#ffffff|#000|#000000|white|black|#f5f5f5|#333|#666)/i.test(lines[i])) {
          if (/dark|Dark|theme\.mode|ThemeMode|colorScheme|useColorScheme|prefers-color-scheme|darkMode|dark_mode/i.test(lines.slice(Math.max(0, i - 20), i + 1).join(' '))) continue;
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Hardcoded Color Without Dark Mode Support',
            message: 'Hardcoded color at line ' + ln + ' with no dark mode variant. Users with dark mode enabled see bright white backgrounds or unreadable text.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
            remediation: 'Use theme-aware colors: const backgroundColor = colorScheme === "dark" ? "#1a1a2e" : "#ffffff". Detect prefers-color-scheme or use useColorScheme hook.',
          });
        }
      }
    }
  }
}
