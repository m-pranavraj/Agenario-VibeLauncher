/**
 * Mockup Detector Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects placeholder, mockup, and non-functional patterns in source code.
 * This is NOT a UI counter — it scans actual code to detect:
 *
 * - Dummy data (TODO, FIXME, placeholder strings, mock arrays)
 * - Fake APIs (simulated delays, static JSON responses, mock handlers)
 * - Placeholder dashboards (static charts, hardcoded numbers)
 * - Local-only persistence (localStorage instead of backend)
 * - Static JSON imports instead of API calls
 * - Unimplemented routes (return 200 with empty/mock data)
 * - Simulated authentication (skip login, accept any password)
 * - Fake payment flows (bypass Stripe, mark as paid directly)
 *
 * Pattern comprehensively we will open fresh codebase — multiple .json data files instead of API.
 */

import { logger } from "./logger.js";

export interface MockupFinding {
  file: string;
  line: number;
  type: "dummy_data" | "fake_api" | "placeholder" | "local_storage" | "static_json" | "simulated_auth" | "fake_payment" | "simulated_delay" | "todo_stub" | "mock_array" | "hardcoded_response" | "bypass_check";
  code: string;
  description: string;
  severity: "high" | "medium" | "low";
}

export interface MockupReport {
  totalFindings: number;
  mockupScore: number; // 0-100, percentage of code that is REAL (not mockup)
  findingsByType: Record<string, number>;
  findings: MockupFinding[];
  summary: string;
}

const PATTERNS: Array<{ regex: RegExp; type: MockupFinding["type"]; severity: MockupFinding["severity"]; description: string }> = [
  // Dummy data patterns
  { regex: /TODO|FIXME|HACK|XXX/gi, type: "todo_stub", severity: "low", description: "Unfinished code marker" },
  { regex: /placeholder|dummy|fake|mock\s*(data|response|user|item)/gi, type: "dummy_data", severity: "high", description: "Placeholder or dummy data detected" },
  { regex: /createMockData|generateMock|mockUsers|mockProducts|mockOrders/gi, type: "dummy_data", severity: "high", description: "Mock data generator function" },

  // Fake APIs
  { regex: /setTimeout\s*\([^,]*,\s*\d{3,}\s*\)\s*{?\s*(return|=>)\s*.*mock/gi, type: "simulated_delay", severity: "medium", description: "Artificial delay to simulate API call" },
  { regex: /return\s+.*mock.*data/gi, type: "fake_api", severity: "high", description: "Returns mock data instead of real API response" },
  { regex: /import\s+.*from\s+['"]\..*\.json['"]/gi, type: "static_json", severity: "medium", description: "Importing static JSON instead of fetching from API" },
  { regex: /\b(data|items|users|products|orders)\s*[:=]\s*\[\s*\{/gi, type: "mock_array", severity: "medium", description: "Hardcoded array of data objects" },

  // Local-only persistence
  { regex: /localStorage\.(setItem|getItem|removeItem)\b/gi, type: "local_storage", severity: "medium", description: "Data stored locally instead of database" },
  { regex: /sessionStorage\.(setItem|getItem|removeItem)\b/gi, type: "local_storage", severity: "medium", description: "Session data stored locally instead of server" },

  // Placeholder UI
  { regex: /Lorem ipsum|placeholder\.com|via\.placeholder|lorempixel/gi, type: "placeholder", severity: "low", description: "Placeholder text or image" },
  { regex: /coming\s*soon|under\s*construction|work\s*in\s*progress|TBD/gi, type: "placeholder", severity: "medium", description: "Placeholder content marker" },

  // Simulated auth
  { regex: /if\s*\(\s*(username|email)\s*===?.*['"]admin['"]\s*\|\|\s*.*password/gi, type: "simulated_auth", severity: "high", description: "Hardcoded authentication check" },
  { regex: /skipAuth|bypassAuth|mockAuth|fakeLogin|acceptAnyPassword/gi, type: "simulated_auth", severity: "high", description: "Authentication bypass detected" },
  { regex: /isAuthenticated\s*[:=]\s*true/gi, type: "simulated_auth", severity: "high", description: "Always-true authentication flag" },

  // Fake payment
  { regex: /paymentStatus\s*[:=]\s*['"]paid['"]/gi, type: "fake_payment", severity: "high", description: "Payment marked as paid without processing" },
  { regex: /skipPayment|bypassPayment|fakePayment|mockPayment/gi, type: "fake_payment", severity: "high", description: "Payment processing bypassed" },
  { regex: /order\.status\s*[:=]\s*['"]completed['"]\s*.*without.*payment/gi, type: "fake_payment", severity: "high", description: "Order completed without payment verification" },

  // Hardcoded responses
  { regex: /res\.(json|send)\s*\(\s*(\{[^}]*mock[^}]*}|[^)]*dummy[^)]*)\s*\)/gi, type: "hardcoded_response", severity: "high", description: "API returns hardcoded/mock response" },
  { regex: /return\s+\{\s*success:\s*true\s*\}/gi, type: "hardcoded_response", severity: "medium", description: "Always-success response without actual logic" },

  // Bypass checks
  { regex: /if\s*\(\s*process\.env\.[NODE_ENV|MODE]\s*===?\s*['"]development['"]\s*\)\s*\{?\s*(return|skip)/gi, type: "bypass_check", severity: "medium", description: "Logic bypassed in development mode" },
  { regex: /\/\/.*(?:skip|bypass|disable|turn off).*(?:validation|auth|check|verification)/gi, type: "bypass_check", severity: "medium", description: "Disabled validation or check" },
];

export function runMockupDetector(keyFiles: Array<{ path: string; content: string }>): MockupReport {
  const findings: MockupFinding[] = [];
  const typeCounts: Record<string, number> = {};
  let totalCodeLines = 0;

  for (const file of keyFiles) {
    if (!/\.(ts|tsx|js|jsx)$/.test(file.path)) continue;

    const lines = file.content.split("\n");
    totalCodeLines += lines.length;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().length < 3) continue;

      for (const pat of PATTERNS) {
        if (pat.regex.test(line)) {
          findings.push({
            file: file.path,
            line: i + 1,
            type: pat.type,
            code: line.trim().slice(0, 120),
            description: pat.description,
            severity: pat.severity,
          });
          typeCounts[pat.type] = (typeCounts[pat.type] ?? 0) + 1;
        }
        pat.regex.lastIndex = 0;
      }
    }
  }

  // Calculate mockup score: percentage of code that is REAL
  // (100% = no mockups, 0% = everything is mockup)
  const mockupCodeLines = findings.length;
  const realCodeLines = Math.max(0, totalCodeLines - mockupCodeLines);
  const mockupScore = totalCodeLines > 0
    ? Math.max(0, Math.min(100, Math.round((realCodeLines / totalCodeLines) * 100)))
    : 100;

  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;
  const lowCount = findings.filter((f) => f.severity === "low").length;

  let summary: string;
  if (findings.length === 0) {
    summary = "No mockup patterns detected. All features appear to be backed by real implementations.";
  } else if (highCount > 0) {
    summary = `${highCount} high-severity mockup pattern(s) detected. These features appear non-functional: fake data, bypassed auth, or missing backend.`;
  } else {
    summary = `${findings.length} potential mockup pattern(s) detected. Review placeholders and local-only implementations.`;
  }

  logger.info({ findings: findings.length, mockupScore, high: highCount }, "Mockup Detector complete");

  return {
    totalFindings: findings.length,
    mockupScore,
    findingsByType: typeCounts,
    findings: findings.slice(0, 50),
    summary,
  };
}
