export type UxCategory =
  | "missing-loading-state"
  | "missing-error-state"
  | "missing-empty-state"
  | "missing-success-state"
  | "interaction-dead-end"
  | "navigation-gap"
  | "form-validation-missing"
  | "form-feedback-missing"
  | "keyboard-gap"
  | "aria-gap"
  | "i18n-missing"
  | "state-completeness"
  | "circular-navigation"
  | "deep-navigation"
  | "orphan-component"
  | "responsive-fragility"
  | "hardcoded-string"
  | "focus-trap"
  | "modal-gap"
  | "toast-feedback-missing";

export interface UxRule {
  id: string;
  name: string;
  category: UxCategory;
  severity: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  impact: string;
  detection: "regex" | "csg" | "composite";
  patterns: string[];
  excludePatterns?: string[];
  contextPatterns?: string[];
  fixAdvice: string;
}

export interface UxFinding {
  ruleId: string;
  ruleName: string;
  category: UxCategory;
  severity: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  impact: string;
  file: string;
  line: number;
  column: number;
  code: string;
  fixAdvice: string;
  confidence: number;
  componentName?: string;
  stateMachine?: {
    missingStates: string[];
    presentStates: string[];
    coverage: number;
  };
}

export interface UxStats {
  rulesChecked: number;
  filesScanned: number;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  stateCoverageAvg: number;
  deadEndCount: number;
  i18nGapCount: number;
  durationMs: number;
}

export const UX_RULES: UxRule[] = [
  {
    id: "UX-STATE-001",
    name: "Missing loading state — component fetches data but no loading indicator",
    category: "missing-loading-state",
    severity: "high",
    description: "A component fetches data (useEffect with fetch/axios) but does not implement a loading state. Users see no indication that data is being loaded.",
    impact: "Users perceive the app as frozen or unresponsive during data fetches. On slow connections (3G: 1-3s), users may navigate away assuming the app is broken.",
    detection: "regex",
    patterns: [
      "useEffect\\(\\s*\\(\\)\\s*=>\\s*\\{[^}]*fetch\\(",
      "useEffect\\(\\s*\\(\\)\\s*=>\\s*\\{[^}]*axios",
      "useEffect\\(\\s*\\(\\)\\s*=>\\s*\\{[^}]*get\\(",
      "useEffect\\(\\s*\\(\\)\\s*=>\\s*\\{[^}]*post\\(",
      "useQuery\\(",
      "useSWR\\(",
    ],
    excludePatterns: [
      "loading",
      "isLoading",
      "isFetching",
      "isPending",
      "setLoading",
      "Suspense",
      "fallback",
    ],
    fixAdvice: "Add a loading state (isLoading/isFetching boolean) and render a spinner or skeleton component while data loads. Use React.Suspense with fallback for route-level loading.",
  },
  {
    id: "UX-STATE-002",
    name: "Missing error state — component fetches data but no error handling",
    category: "missing-error-state",
    severity: "critical",
    description: "A component fetches data without try-catch or error state. API failures result in blank screens or unhandled promise rejections.",
    impact: "Users see a blank screen or broken UI when the API fails. No error message, no retry button, no fallback. On mobile networks with 2-5% failure rates, this affects every 1 in 20-50 sessions.",
    detection: "regex",
    patterns: [
      "fetch\\([^)]*\\)",
      "axios\\.(get|post|put|delete|patch)\\(",
      "useQuery\\(",
      "useSWR\\(",
    ],
    excludePatterns: [
      "catch\\s*\\(",
      "error",
      "isError",
      "isErr",
      "onError",
      "errorMessage",
      "errorState",
      "errorBoundary",
      "ErrorBoundary",
      "ErrorComponent",
      "ErrorBanner",
      "errorToast",
    ],
    fixAdvice: "Wrap fetches in try-catch. Set an error state when caught. Render an error UI (message + retry button). Add an ErrorBoundary at the route level.",
  },
  {
    id: "UX-STATE-003",
    name: "Missing empty state — component renders arrays but no empty guard",
    category: "missing-empty-state",
    severity: "medium",
    description: "A component maps over an array to render list items but does not handle the empty array case. Users see a blank space instead of an empty state message.",
    impact: "Users land on an empty page with no explanation. They don't know if data is loading, nothing exists yet, or something is broken. This causes confusion and bounce.",
    detection: "regex",
    patterns: [
      "\\.map\\(\\s*\\(\\w+\\)",
      "\\.map\\(\\s*\\w+\\s*=>",
    ],
    excludePatterns: [
      "length",
      "empty",
      "isEmpty",
      "if\\s*\\(\\s*\\w+\\.length",
      "\\?\\s*\\(\\s*\\w+\\.length",
      "optional",
      "null",
      "undefined",
      "NoData",
      "EmptyState",
      "noData",
      "emptyState",
      "nothingToShow",
      "noResults",
    ],
    fixAdvice: "Add a guard: if (items.length === 0) return <EmptyState message=\"No items found\" />. Provide a helpful message and suggested next action.",
  },
  {
    id: "UX-STATE-004",
    name: "Missing success/confirmation state after mutation",
    category: "missing-success-state",
    severity: "high",
    description: "A form submission or mutation completes successfully but provides no success feedback to the user. The UI may remain in its pre-submission state.",
    impact: "Users don't know if their action succeeded. They may resubmit, causing duplicate data. 74% of users expect visual confirmation within 1 second of action completion.",
    detection: "regex",
    patterns: [
      "onSubmit\\s*=\\s*\\{",
      "handleSubmit\\(",
      "\\.mutate\\(",
      "\\.mutateAsync\\(",
      "form\\.handleSubmit",
    ],
    excludePatterns: [
      "success",
      "isSuccess",
      "onSuccess",
      "toast\\.success",
      "toast\\(.*success",
      "showSuccess",
      "setSuccess",
      "confirmation",
      "notification",
      "successMessage",
      "SuccessToast",
      "successBanner",
      "resetForm",
      "navigate",
      "redirect",
    ],
    fixAdvice: "Show a success toast, banner, or inline confirmation after successful submissions. Use react-hot-toast or built-in notification system. Consider redirecting to a success page for critical flows.",
  },
  {
    id: "UX-FORM-001",
    name: "Form field with no validation feedback",
    category: "form-validation-missing",
    severity: "high",
    description: "A form input field is rendered without validation error display. Users cannot see what is wrong with their input.",
    impact: "Users submit forms repeatedly, each time guessing what might be wrong. 88% of users abandon forms that show unclear or no validation feedback. The form becomes a frustration point.",
    detection: "regex",
    patterns: [
      "<input",
      "<Input",
      "<Select",
      "<Textarea",
      "<TextField",
      "<FormField",
    ],
    excludePatterns: [
      "error",
      "errors",
      "isInvalid",
      "hasError",
      "errorMessage",
      "validationMessage",
      "formState\\.errors",
      "errors\\.",
      "error.*message",
      "HelperText",
      "helperText",
      "fieldState",
    ],
    fixAdvice: "Display inline validation errors below each field. Use libraries like react-hook-form's error={{ message: ... }} or Formik's ErrorMessage. Ensure error messages are specific and helpful.",
  },
  {
    id: "UX-FORM-002",
    name: "Form missing required field indicators",
    category: "form-validation-missing",
    severity: "medium",
    description: "Required form fields are not visually marked with an asterisk or label. Users must guess which fields are mandatory before submission.",
    impact: "Users encounter submission errors for missing required fields without having been warned ahead of time. This adds friction and increases form abandonment by 40%.",
    detection: "regex",
    patterns: [
      "required:\\s*true",
      "isRequired",
      "required={true}",
      "rules:\\s*\\{.*required",
    ],
    contextPatterns: [
      "label",
      "placeholder",
      "name",
    ],
    fixAdvice: "Always mark required fields with a visible asterisk (*) and add 'required' to the label. Use aria-required=\"true\" for accessibility.",
  },
  {
    id: "UX-FORM-003",
    name: "Form submission without loading/disabled state",
    category: "form-feedback-missing",
    severity: "medium",
    description: "Submit button is not disabled during form submission. Users can double-click and submit the form multiple times before the first request completes.",
    impact: "Double-submission causes duplicate orders, duplicate registrations, or duplicate database entries. 15-20% of users double-click submit buttons within the first 500ms.",
    detection: "regex",
    patterns: [
      "type=['\"`]submit['\"`]",
      "button['\"`]submit['\"`]",
      "onSubmit=",
    ],
    excludePatterns: [
      "disabled",
      "isSubmitting",
      "loading",
      "isLoading",
      "isPending",
    ],
    fixAdvice: "Disable the submit button during submission: <button disabled={isSubmitting} type=\"submit\">. Show a spinner while submitting.",
  },
  {
    id: "UX-NAV-001",
    name: "Deep navigation — component nesting exceeds 5 levels",
    category: "deep-navigation",
    severity: "medium",
    description: "Component nesting depth exceeds 5 levels, creating a deep navigation hierarchy that is hard for users to understand and navigate.",
    impact: "Users must navigate 5+ levels deep to complete common tasks. Each additional navigation level causes 20% drop-off. Deep hierarchies mask content and confuse mobile users.",
    detection: "csg",
    patterns: [
      "component",
      "Route",
      "navigate",
      "Link",
    ],
    fixAdvice: "Flatten navigation structure. Use dashboard-style layouts with sidebars that reduce nesting. Keep critical paths within 3 clicks.",
  },
  {
    id: "UX-NAV-002",
    name: "Page with no navigation back path",
    category: "navigation-gap",
    severity: "high",
    description: "A page or modal provides no back button, close button, or navigation path to return to the previous view.",
    impact: "Users are trapped in a view with no escape besides the browser back button. On single-page apps, the browser back may break the app state, causing data loss.",
    detection: "regex",
    patterns: [
      "<Dialog",
      "<Modal",
      "<Drawer",
      "<FullScreenDialog",
      "<Overlay",
    ],
    excludePatterns: [
      "onClose",
      "onDismiss",
      "closeButton",
      "showCloseButton",
      "closeIcon",
      "handleClose",
      "onCancel",
      "onBackdropClick",
      "backdropClick",
      "escapeKeyDown",
      "onEscapeKeyDown",
    ],
    fixAdvice: "Always provide a close/dismiss mechanism for modals and drawers. Add a visible close button (X icon) and support Escape key. For pages, include breadcrumbs or a back button.",
  },
  {
    id: "UX-NAV-003",
    name: "Empty Link or button without accessible label",
    category: "aria-gap",
    severity: "high",
    description: "A link or button has no text content or aria-label, making it invisible to screen readers.",
    impact: "Screen reader users cannot identify or interact with the element. Icon-only buttons (hamburger menu, close X, search icon) without labels are completely unusable for 285M visually impaired users.",
    detection: "regex",
    patterns: [
      "<button>\\s*</button>",
      "<button>\\s*<",
      "<a>\\s*</a>",
      "<a>\\s*<",
      "<Button>\\s*</Button>",
      "<IconButton",
      "<IconButton",
    ],
    excludePatterns: [
      "aria-label",
      "aria-labelledby",
      "title=",
      "label=",
      "accessibleLabel",
      "accessibilityLabel",
      "Tooltip",
    ],
    fixAdvice: "Add aria-label to all icon-only buttons and links: <button aria-label=\"Close menu\"><XIcon /></button>. Ensure all interactive elements have accessible names.",
  },
  {
    id: "UX-NAV-004",
    name: "Missing skip-to-content link",
    category: "keyboard-gap",
    severity: "medium",
    description: "The page does not provide a skip-to-content link for keyboard and screen reader users.",
    impact: "Keyboard users must tab through every navigation element before reaching main content. For sites with 20+ nav items, this adds 50+ unnecessary keystrokes per page load.",
    detection: "regex",
    patterns: [
      "<nav",
      "<Nav",
      "<header",
      "<Header",
      "navigation",
    ],
    excludePatterns: [
      "skipToContent",
      "skip-to-content",
      "skipLink",
      "skip-link",
      "SkipNav",
      "skipNav",
      "mainContent",
      "main-content",
      "#main",
      "toMainContent",
      "JumpToContent",
    ],
    fixAdvice: "Add a skip-to-content link as the first focusable element: <a href=\"#main-content\" className=\"skip-link\">Skip to content</a>.",
  },
  {
    id: "UX-ACC-001",
    name: "Missing form label association",
    category: "aria-gap",
    severity: "critical",
    description: "An input field lacks an associated label element or aria-label. Screen readers cannot announce the purpose of the field.",
    impact: "285M visually impaired users cannot complete forms. WCAG SC 1.3.1 (Info and Relationships) requires programmatic label association. Non-compliance risks ADA lawsuits ($75K+ per violation).",
    detection: "regex",
    patterns: [
      "<input[^>]*>",
      "<Input[^>]*>",
      "<input[^>]*\\/>",
    ],
    excludePatterns: [
      "aria-label",
      "aria-labelledby",
      "placeholder",
      "type=['\"`]hidden['\"`]",
      "type=\"hidden\"",
      "type='hidden'",
      "label",
    ],
    fixAdvice: "Associate a label with each input: <label htmlFor=\"email\">Email</label><input id=\"email\" /> or use aria-label=\"Email\" for icon-only inputs.",
  },
  {
    id: "UX-ACC-002",
    name: "Image missing alt text",
    category: "aria-gap",
    severity: "high",
    description: "An <img> tag is used without alt attribute. Screen readers cannot describe the image to visually impaired users.",
    impact: "Informational images are completely inaccessible. Meaningful images without alt text convey zero information to screen reader users. WCAG SC 1.1.1 violation.",
    detection: "regex",
    patterns: [
      "<img\\s",
      "<Image\\s",
    ],
    excludePatterns: [
      "alt=",
      "alt\\s*=",
      "role=['\"`]presentation['\"`]",
      "aria-hidden=['\"`]true['\"`]",
    ],
    fixAdvice: "Add descriptive alt text to all informational images: <img src=\"chart.png\" alt=\"Q3 revenue increased 25% year-over-year\" />. Use alt=\"\" for decorative images.",
  },
  {
    id: "UX-ACC-003",
    name: "Missing ARIA landmark regions",
    category: "aria-gap",
    severity: "medium",
    description: "Page content is not organized into ARIA landmark regions (nav, main, banner, complementary). Screen reader users cannot navigate page sections efficiently.",
    impact: "Blind users must read through the entire page linearly to find content. Landmark navigation reduces navigation time by 60% for screen reader users.",
    detection: "regex",
    patterns: [
      "<div\\s",
      "<div[^>]*>",
    ],
    contextPatterns: [
      "id=['\"`]root['\"`]",
      "className=['\"`]App['\"`]",
      "className=['\"`]app['\"`]",
    ],
    fixAdvice: "Use semantic HTML5 elements (<nav>, <main>, <header>, <footer>) or add role attributes: <div role=\"navigation\">, <div role=\"main\">. This enables screen reader landmark navigation.",
  },
  {
    id: "UX-KEY-001",
    name: "Interactive element missing keyboard handler",
    category: "keyboard-gap",
    severity: "high",
    description: "A clickable element (div, span, custom component) has an onClick handler but no onKeyDown/onKeyPress handler for keyboard users.",
    impact: "Keyboard-only users (motor impairments, power users) cannot interact with the element. WCAG SC 2.1.1 (Keyboard) requires all functionality to be operable through keyboard.",
    detection: "regex",
    patterns: [
      "onClick=\\{[^}]+\\}",
      "onClick=\\([^)]+\\)",
    ],
    excludePatterns: [
      "onKeyDown",
      "onKeyPress",
      "onKeyUp",
      "role=['\"`]button['\"`]",
      "tabIndex",
      "tabIndex",
      "role=\"button\"",
      "role='button'",
      "<button",
      "<Button",
      "<a\\s",
      "<a ",
      "type=['\"`]button['\"`]",
    ],
    fixAdvice: "Add keyboard support: onKeyDown={(e) => e.key === 'Enter' && handleAction()}. Use semantic HTML (<button>) whenever possible instead of divs with onClick.",
  },
  {
    id: "UX-KEY-002",
    name: "Missing tabIndex on scrollable container",
    category: "keyboard-gap",
    severity: "medium",
    description: "A scrollable container (overflow: auto/scroll) has no tabIndex, making it impossible to scroll via keyboard.",
    impact: "Keyboard users cannot access content hidden by scroll overflow. For content areas with 10+ items, up to 80% of content may be inaccessible.",
    detection: "regex",
    patterns: [
      "overflowY:\\s*(auto|scroll)",
      "overflow:\\s*(auto|scroll)",
      "overflowX:\\s*(auto|scroll)",
      "overflow-y:\\s*(auto|scroll)",
      "overflowx:\\s*(auto|scroll)",
      "overflow-y:\\s*(auto|scroll)",
      "overflowScroll",
      "scrollable",
    ],
    excludePatterns: [
      "tabIndex",
      "tabIndex",
      "tabindex",
    ],
    fixAdvice: "Add tabIndex={0} to scrollable containers to make them focusable and keyboard-scrollable.",
  },
  {
    id: "UX-I18N-001",
    name: "Hardcoded string in UI component",
    category: "hardcoded-string",
    severity: "medium",
    description: "A literal text string is hardcoded inside a UI component instead of using an i18n translation function.",
    impact: "The app cannot be translated to other languages without modifying source code. For global audiences, this limits market reach to English-only users.",
    detection: "regex",
    patterns: [
      "<\\w+>[A-Z][a-z]+\\s</\\w+>",
      "<\\w+>[A-Z][a-z]+\\s[A-Z][a-z]+</\\w+>",
      "<\\w+>[A-Z][a-z]+\\s[A-Z][a-z]+\\s[A-Z][a-z]+</\\w+>",
      "<[a-z]+>[A-Z][a-z]+ [a-z]+</[a-z]+>",
    ],
    excludePatterns: [
      "t\\(['\"`]",
      "i18n\\._",
      "formatMessage",
      "$t\\(",
      "translation",
      "getTranslation",
      "translate",
      "__\\(",
      "_\\(",
      "FormattedMessage",
      "Trans\\s",
      "intl\\.format",
    ],
    fixAdvice: "Use i18next/react-i18next: {t('welcome.message')} instead of hardcoded strings. Extract all user-facing strings to translation JSON files.",
  },
  {
    id: "UX-I18N-002",
    name: "Concatenated strings prevent translation",
    category: "i18n-missing",
    severity: "medium",
    description: "Strings are concatenated or use template literals to build sentences, which breaks translation in languages with different word orders.",
    impact: "Translations are grammatically incorrect in languages like Japanese (SOV vs SVO), Arabic (VSO), or German (verb at end). Concatenated 'Hello ' + name becomes untranslatable.",
    detection: "regex",
    patterns: [
      "'\\s*\\+\\s*\\w+\\s*\\+\\s*'",
      "`[^`]*\\$\\{\\w+\\}[^`]*`",
      "'[^']*'\\s*\\+\\s*\\w+",
      "\"[^\"]*\"\\s*\\+\\s*\\w+",
    ],
    contextPatterns: [
      "return",
      "<",
      "text",
      "label",
      "title",
      "message",
    ],
    fixAdvice: "Use i18n interpolation: t('welcome.user', { name: userName }) instead of 'Hello ' + userName + '!'. This allows translators to reorder words naturally.",
  },
  {
    id: "UX-MODAL-001",
    name: "Modal with no focus trap",
    category: "focus-trap",
    severity: "high",
    description: "An open modal/dialog does not trap focus. Keyboard focus can tab outside the modal, leaving users confused about where focus went.",
    impact: "Keyboard users lose their place when focus escapes the modal. Tabbing behind a modal is disorienting and can lead to accidental interactions with hidden elements.",
    detection: "regex",
    patterns: [
      "<Dialog",
      "<Modal",
      "<Drawer",
      "<FullScreenDialog",
      "<Overlay",
      "open=\\{[^}]+true",
    ],
    excludePatterns: [
      "FocusTrap",
      "focusTrap",
      "focus-trap",
      "useFocusTrap",
      "focusManager",
      "trapFocus",
      "initialFocusRef",
      "returnFocusRef",
      "restoreFocus",
      "autoFocus",
    ],
    fixAdvice: "Use a focus trap library (focus-trap-react, @reach/dialog) or implement manual focus management. Focus should cycle within the modal while it's open.",
  },
  {
    id: "UX-MODAL-002",
    name: "Modal with no visible close/escape mechanism",
    category: "modal-gap",
    severity: "high",
    description: "A modal dialog provides no close button, X icon, or Escape key handler. Users cannot dismiss the modal.",
    impact: "Users are trapped in the modal. On mobile without a visible close button, users may force-quit the app. This is a critical usability failure.",
    detection: "regex",
    patterns: [
      "<Dialog",
      "<Modal",
      "<Drawer",
      "<FullScreenDialog",
    ],
    excludePatterns: [
      "onClose",
      "onDismiss",
      "onCancel",
      "closeButton",
      "showCloseButton",
      "closeIcon",
      "CloseButton",
      "handleClose",
      "XIcon",
      "CloseIcon",
      "onEscapeKeyDown",
      "escapeKeyDown",
      "isOpen.*false",
    ],
    fixAdvice: "Always provide: (1) visible close button (X icon), (2) Escape key handler, (3) backdrop click to dismiss. Use <button onClick={onClose} aria-label=\"Close\"><XIcon /></button>.",
  },
  {
    id: "UX-FB-001",
    name: "Async operation with no user feedback (no toast/notification)",
    category: "toast-feedback-missing",
    severity: "medium",
    description: "An async operation completes (mutate, delete, update) without showing a toast, notification, or any UI feedback.",
    impact: "Users receive zero feedback about the outcome of their action. For destructive actions (delete), the item may disappear without confirmation, causing panic.",
    detection: "regex",
    patterns: [
      "\\.mutate\\(",
      "\\.mutateAsync\\(",
      "\\.delete\\(",
      "\\.remove\\(",
      "\\.destroy\\(",
    ],
    contextPatterns: [
      "await",
      "then\\(",
    ],
    excludePatterns: [
      "toast",
      "notification",
      "notify",
      "showToast",
      "successToast",
      "errorToast",
      "Snackbar",
      "snackbar",
      "alert",
      "Alert",
      "message",
      "statusMessage",
    ],
    fixAdvice: "Add toast notifications for all async operations: toast.success('Item deleted') or toast.error('Delete failed'). Use react-hot-toast, Sonner, or MUI Snackbar.",
  },
  {
    id: "UX-FB-002",
    name: "No optimistic update for fast feedback",
    category: "form-feedback-missing",
    severity: "low",
    description: "A mutation does not use optimistic updates. Users must wait for server confirmation before seeing the UI update.",
    impact: "On slow connections (500ms+), each action feels sluggish. For high-frequency interactions (toggling favorites, likes), cumulative wait time degrades the experience significantly.",
    detection: "regex",
    patterns: [
      "\\.mutate\\(",
      "\\.mutateAsync\\(",
    ],
    excludePatterns: [
      "optimistic",
      "optimisticUpdate",
      "onMutate",
      "onSettled",
      "rollback",
    ],
    fixAdvice: "Use React Query/SWR optimistic updates to update the UI immediately before server confirmation. Rollback on error.",
  },
  {
    id: "UX-RESP-001",
    name: "Fixed-width container without responsive breakpoint",
    category: "responsive-fragility",
    severity: "medium",
    description: "A container uses a fixed pixel width (width: 500px) instead of relative units or responsive breakpoints.",
    impact: "On mobile viewports (375px), the container overflows horizontally. Users must scroll horizontally to see full content. 58% of web traffic is mobile.",
    detection: "regex",
    patterns: [
      "width:\\s*\\d{3,4}px",
      "width:\\s*\\d{3}\\s*px",
      "width:\\s*\\d{4}\\s*px",
      "maxWidth:\\s*\\d{3,4}px",
      "minWidth:\\s*\\d{3,4}px",
    ],
    excludePatterns: [
      "@media",
      "max-width:\\s*\\d",
      "min-width:\\s*\\d",
      "responsive",
      "ResponsiveContainer",
      "useMediaQuery",
      "breakpoint",
      "tailwind",
      "max-w-",
      "w-full",
      "w-auto",
      "100%",
      "100vw",
      "100dvw",
    ],
    fixAdvice: "Use responsive units: width: 100%, max-width: 600px. Use CSS Grid/Flexbox with responsive breakpoints. For Tailwind, use w-full md:w-3/4 lg:w-1/2.",
  },
  {
    id: "UX-RESP-002",
    name: "Touch target too small (under 44px)",
    category: "responsive-fragility",
    severity: "medium",
    description: "An interactive element has a touch target smaller than WCAG minimum 44x44px.",
    impact: "Users with larger fingers or motor tremors struggle to tap small targets. Adjacent small targets cause mis-taps. WCAG SC 2.5.8 (Target Size) minimum is 44px.",
    detection: "regex",
    patterns: [
      "padding:\\s*\\d{1,2}px",
      "padding:\\s*\\d{1,2}px\\s+\\d{1,2}px",
      "height:\\s*(20|24|28|30|32|36|40)px",
      "width:\\s*(20|24|28|30|32|36|40)px",
      "minHeight:\\s*(20|24|28|30|32|36|40)px",
      "minWidth:\\s*(20|24|28|30|32|36|40)px",
    ],
    contextPatterns: [
      "button",
      "Button",
      "a\\s",
      "a>",
      "click",
      "onClick",
      "link",
      "Link",
    ],
    fixAdvice: "Ensure interactive elements are at least 44x44px touch target size. Increase padding or use min-height/min-width: 44px for small buttons.",
  },
  {
    id: "UX-ARCH-001",
    name: "Overly complex component — 200+ lines with multiple responsibilities",
    category: "state-completeness",
    severity: "medium",
    description: "A component exceeds 200 lines and handles multiple concerns (data fetching, rendering, state management, event handling).",
    impact: "Large components are hard to test, hard to reuse, and prone to bugs. A single state change can cause unexpected side effects across unrelated features within the same component.",
    detection: "regex",
    patterns: [
      "function\\s+\\w+\\s*\\([^)]*\\)\\s*\\{",
      "const\\s+\\w+\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{",
      "export\\s+default\\s+function\\s+\\w+",
      "export\\s+default\\s+const\\s+\\w+",
    ],
    contextPatterns: [
      "return\\s*\\(",
      "useState",
      "useEffect",
      "fetch",
      "axios",
    ],
    fixAdvice: "Split the component into smaller single-responsibility components. Extract data fetching into custom hooks. Use composition over inheritance.",
  },
];

export const UX_CATEGORIES: UxCategory[] = UX_RULES.map((r) => r.category).filter(
  (v, i, a) => a.indexOf(v) === i,
);
