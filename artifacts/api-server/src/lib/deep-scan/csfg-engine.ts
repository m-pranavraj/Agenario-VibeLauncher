import type { CombinedSemanticGraph, CsgNode } from "./types.js";
import type { UxFinding } from "./ux-rules.js";

export interface ComponentStateInfo {
  componentName: string;
  file: string;
  line: number;
  hasLoadingState: boolean;
  hasErrorState: boolean;
  hasEmptyState: boolean;
  hasSuccessState: boolean;
  hasFormValidation: boolean;
  hasKeyboardHandler: boolean;
  hasAriaLabel: boolean;
  hasI18nStrings: boolean;
  missingStates: string[];
  presentStates: string[];
  stateCoverage: number;
}

export interface NavigationFlow {
  sourceComponent: string;
  targetComponent: string;
  sourceFile: string;
  targetFile: string;
  interaction: string;
  hasBackPath: boolean;
  depth: number;
}

export interface FormUxInfo {
  componentName: string;
  file: string;
  line: number;
  hasValidation: boolean;
  hasErrorDisplay: boolean;
  hasSubmitFeedback: boolean;
  hasRequiredIndicators: boolean;
  hasDisabledSubmit: boolean;
  hasKeyboardNav: boolean;
  missingFeatures: string[];
}

export interface AriaPropagationInfo {
  componentName: string;
  file: string;
  line: number;
  missingAria: string[];
  presentAria: string[];
}

const REQUIRED_COMPONENT_STATES = ["loading", "error", "empty"] as const;
const FEEDBACK_STATES = ["success", "toast", "notification"] as const;

export class CsfgEngine {
  private graph: CombinedSemanticGraph;
  private componentStates: Map<string, ComponentStateInfo> = new Map();
  private navigationFlows: NavigationFlow[] = [];
  private formUxInfos: FormUxInfo[] = [];
  private findings: UxFinding[] = [];

  constructor(graph: CombinedSemanticGraph) {
    this.graph = graph;
  }

  analyzeAll(): {
    componentStates: ComponentStateInfo[];
    navigationFlows: NavigationFlow[];
    formUxInfos: FormUxInfo[];
    findings: UxFinding[];
    stateCoverageAvg: number;
    deadEndCount: number;
  } {
    this.analyzeComponentStates();
    this.analyzeNavigationFlows();
    this.analyzeFormUx();
    this.analyzeComponentLifespan();
    this.analyzeAriaPropagation();

    const allStates = Array.from(this.componentStates.values());
    const stateCoverageAvg = allStates.length > 0
      ? allStates.reduce((s, c) => s + c.stateCoverage, 0) / allStates.length
      : 100;

    const deadEndCount = this.navigationFlows.filter((f) => !f.hasBackPath).length;

    return {
      componentStates: allStates,
      navigationFlows: this.navigationFlows,
      formUxInfos: this.formUxInfos,
      findings: this.findings,
      stateCoverageAvg,
      deadEndCount,
    };
  }

  private analyzeComponentStates(): void {
    for (const [nodeId, node] of this.graph.nodes) {
      if (node.type !== "component") continue;
      const code = node.code;
      const codeLower = code.toLowerCase();

      const hasDataFetch = this.hasDataFetch(code);
      const hasLoadingState = hasDataFetch && this.hasPattern(code, ["loading", "isLoading", "isFetching", "isPending", "setLoading", "Suspense", "fallback"]);
      const hasErrorState = hasDataFetch && this.hasPattern(code, ["error", "isError", "catch(", "try {", "errorMessage", "errorState", "ErrorBoundary", "errorBoundary", "errorToast"]);
      const hasEmptyState = this.hasPattern(code, ["length === 0", "length < 1", "isEmpty", "emptyState", "NoData", "noData", "noResults", "nothingToShow", "EmptyState", "?."]);
      const hasSuccessState = this.hasPattern(code, ["success", "isSuccess", "onSuccess", "toast.success", "showSuccess", "setSuccess", "confirmation", "successMessage", "SuccessToast", "resetForm", "navigate("]);

      const missingStates: string[] = [];
      const presentStates: string[] = [];

      if (hasDataFetch && !hasLoadingState) missingStates.push("loading");
      if (hasDataFetch && !hasErrorState) missingStates.push("error");
      if (this.hasArrayRender(code) && !hasEmptyState) missingStates.push("empty");
      if (this.hasMutation(code) && !hasSuccessState) missingStates.push("success");

      if (hasLoadingState) presentStates.push("loading");
      if (hasErrorState) presentStates.push("error");
      if (hasEmptyState) presentStates.push("empty");
      if (hasSuccessState) presentStates.push("success");

      const totalExpected = (hasDataFetch ? 2 : 0) + (this.hasArrayRender(code) ? 1 : 0) + (this.hasMutation(code) ? 1 : 0);
      const totalPresent = (hasDataFetch && hasLoadingState ? 1 : 0) +
        (hasDataFetch && hasErrorState ? 1 : 0) +
        (this.hasArrayRender(code) && hasEmptyState ? 1 : 0) +
        (this.hasMutation(code) && hasSuccessState ? 1 : 0);
      const stateCoverage = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 100;

      const info: ComponentStateInfo = {
        componentName: node.name,
        file: node.file,
        line: node.line,
        hasLoadingState,
        hasErrorState,
        hasEmptyState,
        hasSuccessState,
        hasFormValidation: this.hasPattern(code, ["error", "errors", "isInvalid", "validationMessage", "formState.errors"]),
        hasKeyboardHandler: this.hasPattern(code, ["onKeyDown", "onKeyPress", "onKeyUp"]),
        hasAriaLabel: this.hasPattern(code, ["aria-label", "aria-labelledby", "aria-describedby", "aria-required"]),
        hasI18nStrings: this.hasPattern(code, ["t(", "i18n.", "$t(", "FormattedMessage", "Trans ", "intl.format", "__("]),
        missingStates,
        presentStates,
        stateCoverage,
      };

      this.componentStates.set(nodeId, info);

      if (hasDataFetch && !hasLoadingState) {
        this.findings.push({
          ruleId: "UX-STATE-001",
          ruleName: "Missing loading state",
          category: "missing-loading-state",
          severity: "high",
          description: `Component "${node.name}" fetches data (API call, useQuery, useSWR, or fetch) but does not implement a loading/loading indicator state. Users see no feedback during data loading.`,
          impact: "On slow connections (3G: 1-3s load time), users see a blank screen with no loading indicator. Perceived performance is worse than actual performance.",
          file: node.file,
          line: node.line,
          column: 0,
          code: node.code.substring(0, 200),
          fixAdvice: "Add a loading state variable and conditional rendering: {isLoading ? <Spinner /> : <DataView />}. Consider using React.Suspense with fallback.",
          confidence: 0.8,
          componentName: node.name,
          stateMachine: { missingStates: info.missingStates, presentStates: info.presentStates, coverage: info.stateCoverage },
        });
      }

      if (hasDataFetch && !hasErrorState) {
        this.findings.push({
          ruleId: "UX-STATE-002",
          ruleName: "Missing error state",
          category: "missing-error-state",
          severity: "critical",
          description: `Component "${node.name}" fetches data but has no error handling (try-catch, .catch(), error state variable, or ErrorBoundary). API failures cause blank screens or crashes.`,
          impact: "Network failures (2-5% of requests on mobile) cause blank screens. Users cannot retry and may think the app is permanently broken.",
          file: node.file,
          line: node.line,
          column: 0,
          code: node.code.substring(0, 200),
          fixAdvice: "Wrap fetch in try-catch. Set error state on failure. Render error UI: {error ? <ErrorBanner message={error} onRetry={refetch} /> : <DataView />}.",
          confidence: 0.85,
          componentName: node.name,
          stateMachine: { missingStates: info.missingStates, presentStates: info.presentStates, coverage: info.stateCoverage },
        });
      }

      if (this.hasArrayRender(code) && !hasEmptyState) {
        this.findings.push({
          ruleId: "UX-STATE-003",
          ruleName: "Missing empty state",
          category: "missing-empty-state",
          severity: "medium",
          description: `Component "${node.name}" renders an array via .map() but does not check for empty array before rendering. Users see nothing when the array is empty.`,
          impact: "Empty data results in a blank visual area. Users don't know if data is loading, none exists, or something is broken.",
          file: node.file,
          line: node.line,
          column: 0,
          code: node.code.substring(0, 200),
          fixAdvice: "Add empty state guard: {items.length === 0 ? <EmptyState message='No items found' /> : items.map(...)}.",
          confidence: 0.75,
          componentName: node.name,
          stateMachine: { missingStates: info.missingStates, presentStates: info.presentStates, coverage: info.stateCoverage },
        });
      }

      if (this.hasMutation(code) && !hasSuccessState) {
        this.findings.push({
          ruleId: "UX-STATE-004",
          ruleName: "Missing success/confirmation state",
          category: "missing-success-state",
          severity: "high",
          description: `Component "${node.name}" performs a mutation (form submit, delete, update) but provides no success confirmation feedback.`,
          impact: "Users don't know if their action succeeded and may resubmit or navigate away prematurely.",
          file: node.file,
          line: node.line,
          column: 0,
          code: node.code.substring(0, 200),
          fixAdvice: "Show success toast/notification after mutation completes successfully. For deletes, show undo option.",
          confidence: 0.7,
          componentName: node.name,
          stateMachine: { missingStates: info.missingStates, presentStates: info.presentStates, coverage: info.stateCoverage },
        });
      }
    }
  }

  private analyzeNavigationFlows(): void {
    const routeNodes: CsgNode[] = [];
    const componentNodes: CsgNode[] = [];

    for (const [, node] of this.graph.nodes) {
      if (node.type === "route") routeNodes.push(node);
      if (node.type === "component") componentNodes.push(node);
    }

    for (const route of routeNodes) {
      const routeCode = route.code;

      const linkMatches = routeCode.matchAll(/<Link[^>]*to=['"`]([^'"`]+)['"`][^>]*>/g);
      for (const match of linkMatches) {
        const targetPath = match[1]!;
        const backPath = this.findBackPath(routeNodes, route, targetPath);

        this.navigationFlows.push({
          sourceComponent: route.name,
          targetComponent: targetPath,
          sourceFile: route.file,
          targetFile: route.file,
          interaction: "link",
          hasBackPath: backPath !== null,
          depth: 1,
        });

        if (!backPath) {
          this.findings.push({
            ruleId: "UX-NAV-002",
            ruleName: "No navigation back path",
            category: "navigation-gap",
            severity: "high",
            description: `Route "${route.name}" links to "${targetPath}" but no visible back navigation is present. Users may be trapped in the target view.`,
            impact: "Users cannot easily return to the previous view. On SPAs, browser back may break app state.",
            file: route.file,
            line: route.line,
            column: 0,
            code: match[0]!.substring(0, 200),
            fixAdvice: "Add a back button, breadcrumbs, or navigation that returns users to the source view.",
            confidence: 0.6,
            componentName: route.name,
          });
        }
      }

      const navigateMatches = routeCode.matchAll(/navigate\(['"`]([^'"`]+)['"`][^)]*\)/g);
      for (const match of navigateMatches) {
        const targetPath = match[1]!;
        const backPath = this.findBackPath(routeNodes, route, targetPath);

        this.navigationFlows.push({
          sourceComponent: route.name,
          targetComponent: targetPath,
          sourceFile: route.file,
          targetFile: route.file,
          interaction: "programmatic_navigate",
          hasBackPath: backPath !== null,
          depth: 1,
        });
      }
    }

    const adjacency = this.graph.adjacency;
    for (const [nodeId, node] of this.graph.nodes) {
      if (node.type !== "component") continue;
      const adj = adjacency.get(nodeId);
      if (!adj) continue;

      let depth = 0;
      let current = adj;
      const visited = new Set<string>();
      while (current && depth < 10) {
        visited.add(nodeId);
        const childRender = current.out.find((e) => e.type === "renders");
        if (!childRender || visited.has(childRender.targetId)) break;
        depth++;
        current = adjacency.get(childRender.targetId)!;
      }

      if (depth > 5) {
        this.findings.push({
          ruleId: "UX-NAV-001",
          ruleName: "Deep component nesting",
          category: "deep-navigation",
          severity: "medium",
          description: `Component "${node.name}" has a nesting depth of ${depth} levels. Deeply nested components are harder to navigate and understand.`,
          impact: "Each additional nesting level increases cognitive load and makes the component tree harder to debug and maintain.",
          file: node.file,
          line: node.line,
          column: 0,
          code: node.code.substring(0, 200),
          fixAdvice: "Flatten the component hierarchy. Use composition patterns. Consider extracting deeply nested logic into separate pages or routes.",
          confidence: 0.7,
          componentName: node.name,
        });
      }
    }
  }

  private findBackPath(routes: CsgNode[], currentRoute: CsgNode, targetPath: string): string | null {
    for (const route of routes) {
      if (route.id === currentRoute.id) continue;
      const routeCode = route.code;
      if (routeCode.includes(targetPath) || routeCode.includes(currentRoute.name)) {
        return route.name;
      }
    }

    for (const [, node] of this.graph.nodes) {
      if (node.type === "component") {
        const code = node.code;
        if (code.includes("back") || code.includes("Back") || code.includes("navigate(-1)") || code.includes("goBack") || code.includes("history.back")) {
          return node.name;
        }
      }
    }

    return null;
  }

  private analyzeFormUx(): void {
    for (const [nodeId, node] of this.graph.nodes) {
      if (node.type !== "component") continue;
      const code = node.code;

      if (!this.hasPattern(code, ["<form", "<Form", "onSubmit", "handleSubmit"])) continue;

      const hasValidation = this.hasPattern(code, ["validation", "validate", "register", "rules", "schema", "yup", "zod", "joi"]);
      const hasErrorDisplay = this.hasPattern(code, ["error", "errors.", "isInvalid", "errorMessage", "HelperText", "helperText", "formState.errors", "ErrorMessage"]);
      const hasSubmitFeedback = this.hasPattern(code, ["isSubmitting", "loading", "isLoading", "disabled"]);
      const hasRequiredIndicators = this.hasPattern(code, ["required: true", "required={true}", "isRequired", "rules:.*required"]);
      const hasDisabledSubmit = this.hasPattern(code, ["isSubmitting", "disabled={", "loading={", "isPending"]);
      const hasKeyboardNav = this.hasPattern(code, ["onKeyDown", "tabIndex", "autoFocus", "ref"]);

      const missingFeatures: string[] = [];
      if (!hasValidation) missingFeatures.push("validation logic");
      if (!hasErrorDisplay) missingFeatures.push("error display");
      if (!hasSubmitFeedback) missingFeatures.push("submit feedback");
      if (!hasRequiredIndicators) missingFeatures.push("required indicators");
      if (!hasDisabledSubmit) missingFeatures.push("disabled submit during submission");
      if (!hasKeyboardNav) missingFeatures.push("keyboard navigation");

      const info: FormUxInfo = {
        componentName: node.name,
        file: node.file,
        line: node.line,
        hasValidation,
        hasErrorDisplay,
        hasSubmitFeedback,
        hasRequiredIndicators,
        hasDisabledSubmit,
        hasKeyboardNav,
        missingFeatures,
      };

      this.formUxInfos.set(nodeId, info);

      if (!hasValidation || !hasErrorDisplay) {
        this.findings.push({
          ruleId: "UX-FORM-001",
          ruleName: "Form without validation feedback",
          category: "form-validation-missing",
          severity: "high",
          description: `Form component "${node.name}" lacks ${missingFeatures.includes("validation logic") ? "validation logic" : "error display"}. Users cannot see what is wrong with their input.`,
          impact: "Users submit forms repeatedly, guessing what might be wrong. Form abandonment rates increase by 88% when validation feedback is unclear.",
          file: node.file,
          line: node.line,
          column: 0,
          code: code.substring(0, 200),
          fixAdvice: "Use a validation library (zod, yup, joi) with react-hook-form or Formik. Display inline error messages below each field.",
          confidence: 0.85,
          componentName: node.name,
          stateMachine: {
            missingStates: missingFeatures,
            presentStates: [],
            coverage: (hasValidation && hasErrorDisplay ? 50 : 0) + (hasSubmitFeedback ? 25 : 0) + (hasDisabledSubmit ? 25 : 0),
          },
        });
      }

      if (!hasDisabledSubmit && !hasSubmitFeedback) {
        this.findings.push({
          ruleId: "UX-FORM-003",
          ruleName: "Submit button not disabled during submission",
          category: "form-feedback-missing",
          severity: "medium",
          description: `Form "${node.name}" does not disable its submit button during submission. Users can double-submit, causing duplicate operations.`,
          impact: "15-20% of users double-click submit buttons. This causes duplicate orders, registrations, or database entries.",
          file: node.file,
          line: node.line,
          column: 0,
          code: code.substring(0, 200),
          fixAdvice: "Disable submit button while submitting: <button disabled={isSubmitting} type=\"submit\">. Show spinner during submission.",
          confidence: 0.8,
          componentName: node.name,
        });
      }
    }
  }

  private analyzeComponentLifespan(): void {
    const visited = new Map<string, Set<string>>();

    for (const [nodeId, node] of this.graph.nodes) {
      if (node.type !== "component") continue;

      const adjacency = this.graph.adjacency.get(nodeId);
      if (!adjacency) continue;

      const renders = adjacency.out.filter((e) => e.type === "renders");
      for (const edge of renders) {
        if (!visited.has(nodeId)) visited.set(nodeId, new Set());
        visited.get(nodeId)!.add(edge.targetId);
      }
    }

    for (const [nodeId, node] of this.graph.nodes) {
      if (node.type !== "component") continue;
      const adjacency = this.graph.adjacency.get(nodeId);
      if (!adjacency) continue;

      const isReferenced = adjacency.in.length > 0;
      let isRendered = false;
      for (const [_nId, children] of visited) {
        if (children.has(nodeId)) {
          isRendered = true;
          break;
        }
      }

      if (!isReferenced && !isRendered && !node.code.includes("ReactDOM.render") && !node.code.includes("createRoot") && !node.code.includes("export")) {
        this.findings.push({
          ruleId: "UX-ARCH-001",
          ruleName: "Orphan component — not used in any render tree",
          category: "orphan-component",
          severity: "low",
          description: `Component "${node.name}" is defined but never rendered or imported by any other component. It appears to be dead code.`,
          impact: "Unused components increase bundle size, confuse developers, and may contain bugs that go undetected.",
          file: node.file,
          line: node.line,
          column: 0,
          code: node.code.substring(0, 200),
          fixAdvice: "Remove unused components. If intentionally unused, add an export and document its purpose.",
          confidence: 0.6,
          componentName: node.name,
        });
      }
    }
  }

  private analyzeAriaPropagation(): void {
    for (const [nodeId, node] of this.graph.nodes) {
      if (node.type !== "component") continue;
      const code = node.code;

      const adjacency = this.graph.adjacency.get(nodeId);
      if (!adjacency) continue;
      const childRenders = adjacency.out.filter((e) => e.type === "renders");

      if (
        this.hasPattern(code, ["<dialog", "<Dialog", "<Modal", "<Drawer", "<Popover", "<Tooltip", "<Menu"])
      ) {
        const missingAria: string[] = [];
        const presentAria: string[] = [];

        if (!this.hasPattern(code, ["role=\"dialog\"", "role='dialog'", "role=\"alertdialog\"", "role='alertdialog'"])) {
          missingAria.push("dialog role");
        } else {
          presentAria.push("dialog role");
        }
        if (!this.hasPattern(code, ["aria-modal", "aria-labelledby", "aria-describedby", "aria-label"])) {
          missingAria.push("aria-modal/aria-labelledby");
        } else {
          presentAria.push("aria label");
        }

        if (missingAria.length > 0) {
          this.findings.push({
            ruleId: "UX-ACC-003",
            ruleName: "Interactive component missing ARIA attributes",
            category: "aria-gap",
            severity: "high",
            description: `Component "${node.name}" is an interactive overlay (dialog/modal/popover) missing required ARIA attributes: ${missingAria.join(", ")}.`,
            impact: "Screen reader users cannot identify or interact with the overlay. WCAG SC 4.1.2 (Name, Role, Value) violation.",
            file: node.file,
            line: node.line,
            column: 0,
            code: code.substring(0, 200),
            fixAdvice: `Add required ARIA attributes: role="dialog", aria-modal="true", aria-labelledby="title-id".`,
            confidence: 0.8,
            componentName: node.name,
          });
        }
      }

      if (this.hasPattern(code, ["onClick"]) && !this.hasPattern(code, ["<button", "<Button", "<a ", "<a>", "<a href"])) {
        if (!this.hasPattern(code, ["role=\"button\"", "role='button'", "tabIndex", "onKeyDown"])) {
          this.findings.push({
            ruleId: "UX-KEY-001",
            ruleName: "Interactive element missing keyboard support",
            category: "keyboard-gap",
            severity: "high",
            description: `Component "${node.name}" has onClick handler but is not a semantic button. Keyboard users cannot activate it via Enter/Space.`,
            impact: "Keyboard-only users (motor impairments, power users) cannot interact with the element. WCAG SC 2.1.1 violation.",
            file: node.file,
            line: node.line,
            column: 0,
            code: code.substring(0, 200),
            fixAdvice: "Use <button> instead of div/span with onClick. Or add: role=\"button\", tabIndex={0}, onKeyDown={(e) => e.key === 'Enter' && handler()}.",
            confidence: 0.8,
            componentName: node.name,
          });
        }
      }

      if (
        this.hasPattern(code, ["<img", "<Image"]) &&
        !this.hasPattern(code, ["alt=", "alt ="])
      ) {
        this.findings.push({
          ruleId: "UX-ACC-002",
          ruleName: "Image missing alt text",
          category: "aria-gap",
          severity: "high",
          description: `Component "${node.name}" contains an <img> tag without alt attribute.`,
          impact: "Screen readers cannot describe the image. WCAG SC 1.1.1 violation.",
          file: node.file,
          line: node.line,
          column: 0,
          code: code.substring(0, 200),
          fixAdvice: "Add alt attribute: <img src=\"...\" alt=\"Description\" />. Use alt=\"\" for decorative images.",
          confidence: 0.9,
          componentName: node.name,
        });
      }

      if (
        this.hasPattern(code, ["<input", "<Input", "<Select", "<Textarea"]) &&
        !this.hasPattern(code, ["aria-label", "aria-labelledby", "<label", "<Label", "label"])
      ) {
        this.findings.push({
          ruleId: "UX-ACC-001",
          ruleName: "Input missing label",
          category: "aria-gap",
          severity: "critical",
          description: `Component "${node.name}" contains an <input> without associated label or aria-label.`,
          impact: "Screen readers cannot announce the purpose of the input. WCAG SC 1.3.1 violation. ADA lawsuits can exceed $75K.",
          file: node.file,
          line: node.line,
          column: 0,
          code: code.substring(0, 100),
          fixAdvice: "Add <label htmlFor=\"inputId\">Label</label> or aria-label=\"Label\" to the input.",
          confidence: 0.9,
          componentName: node.name,
        });
      }

      if (
        childRenders.length > 0 &&
        this.hasPattern(code, ["aria-pressed", "aria-expanded", "aria-selected", "aria-checked", "aria-current"])
      ) {
        for (const child of childRenders) {
          const childNode = this.graph.nodes.get(child.targetId);
          if (childNode) {
            const childCode = childNode.code;
            if (!this.hasPattern(childCode, ["aria-", "role="])) {
              this.findings.push({
                ruleId: "UX-ACC-004",
                name: "ARIA state not propagated to child",
                category: "aria-gap",
                severity: "medium",
                description: `Parent component "${node.name}" manages ARIA state but child "${childNode.name}" does not receive ARIA attributes.`,
                impact: "ARIA states managed at the parent level may not reach interactive children, breaking screen reader announcements.",
                file: childNode.file,
                line: childNode.line,
                column: 0,
                code: childNode.code.substring(0, 200),
                fixAdvice: `Pass ARIA attributes to child: <${childNode.name} aria-expanded={isOpen} />.`,
                confidence: 0.55,
                componentName: childNode.name,
              });
            }
          }
        }
      }

      if (!this.hasPattern(code, ["t(", "i18n.", "$t(", "FormattedMessage", "intl.format", "__(", "_("]) && !this.hasPattern(code, ["import.*i18n", "import.*react-i18next", "import.*intl"])) {
        const hardcodedStrings = code.match(/>[A-Z][a-z]+[\s\w]+</g);
        if (hardcodedStrings && hardcodedStrings.length > 3) {
          this.findings.push({
            ruleId: "UX-I18N-001",
            ruleName: "Hardcoded UI strings without i18n",
            category: "hardcoded-string",
            severity: "medium",
            description: `Component "${node.name}" has ${hardcodedStrings.length}+ hardcoded text strings but no i18n translation import or usage detected.`,
            impact: "App cannot be localized for international markets. Each hardcoded string requires source code changes to translate.",
            file: node.file,
            line: node.line,
            column: 0,
            code: hardcodedStrings.slice(0, 3).join(", ").substring(0, 200),
            fixAdvice: "Use i18next: {t('key')} instead of hardcoded strings. Add react-i18next and extract strings to translation files.",
            confidence: 0.65,
            componentName: node.name,
          });
        }
      }
    }
  }

  private hasDataFetch(code: string): boolean {
    const lower = code.toLowerCase();
    return this.hasPattern(lower, [
      "fetch(", "axios.", "usequery(", "useswr(", "get(", ".get(", ".post(",
      "useMutation", "queryClient", "useLazyQuery", "apollo",
    ]);
  }

  private hasArrayRender(code: string): boolean {
    return this.hasPattern(code, [".map("]);
  }

  private hasMutation(code: string): boolean {
    const lower = code.toLowerCase();
    return this.hasPattern(lower, [
      "onsubmit", "handlesubmit", ".mutate(", ".mutateasync(",
      ".delete(", ".remove(", ".destroy(", "axios.post", "axios.put",
      "axios.patch", "axios.delete",
    ]);
  }

  private hasPattern(code: string, patterns: string[]): boolean {
    const lower = code.toLowerCase();
    return patterns.some((p) => lower.includes(p.toLowerCase()));
  }
}

export function computeStateBreakdown(
  componentStates: ComponentStateInfo[],
): {
  totalComponents: number;
  dataFetchingComponents: number;
  withLoadingState: number;
  withErrorState: number;
  withEmptyState: number;
  withSuccessState: number;
  avgCoverage: number;
} {
  const dataFetching = componentStates.filter((c) => c.hasLoadingState || c.hasErrorState || c.missingStates.includes("loading"));
  return {
    totalComponents: componentStates.length,
    dataFetchingComponents: dataFetching.length,
    withLoadingState: componentStates.filter((c) => c.hasLoadingState).length,
    withErrorState: componentStates.filter((c) => c.hasErrorState).length,
    withEmptyState: componentStates.filter((c) => c.hasEmptyState).length,
    withSuccessState: componentStates.filter((c) => c.hasSuccessState).length,
    avgCoverage: componentStates.length > 0
      ? Math.round(componentStates.reduce((s, c) => s + c.stateCoverage, 0) / componentStates.length)
      : 100,
  };
}
