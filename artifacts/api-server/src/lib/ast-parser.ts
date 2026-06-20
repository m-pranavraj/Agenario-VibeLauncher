import fs from "fs";
import path from "path";

export interface AstFinding {
  category: "injection" | "auth" | "config" | "exposure" | "quality";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  file: string;
  line: number;
  confidence: number;
  fixPrompt: string;
  snippet: string;
}

export function parseWithBabel(filePath: string, content: string): AstFinding[] {
  const findings: AstFinding[] = [];
  const ext = path.extname(filePath);
  if (![".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(ext)) return findings;
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;

    if (/\.innerHTML\s*=/.test(trimmed) && !/dangerouslySetInnerHTML/.test(trimmed)) {
      findings.push({
        category: "injection",
        severity: "high",
        title: "Direct innerHTML Assignment",
        description: "Direct innerHTML assignment bypasses React's XSS protection. User data in this string creates a script injection vector.",
        evidence: `${filePath}:${i + 1}: ${trimmed.slice(0, 100)}`,
        file: filePath,
        line: i + 1,
        confidence: 95,
        fixPrompt: "Use textContent instead of innerHTML, or use DOMPurify.sanitize() if HTML is required.",
        snippet: trimmed.slice(0, 120),
      });
    }

    if (/setTimeout\s*\(\s*["'`]/.test(trimmed) || /setInterval\s*\(\s*["'`]/.test(trimmed)) {
      findings.push({
        category: "quality",
        severity: "medium",
        title: "String Passed to Timer",
        description: "Passing a string to setTimeout/setInterval is equivalent to eval(). This creates a code injection risk.",
        evidence: `${filePath}:${i + 1}: ${trimmed.slice(0, 100)}`,
        file: filePath,
        line: i + 1,
        confidence: 92,
        fixPrompt: "Replace string argument with an arrow function: `setTimeout(() => { ... }, delay)`",
        snippet: trimmed.slice(0, 120),
      });
    }

    if (/\bnew\s+Function\s*\(/.test(trimmed)) {
      findings.push({
        category: "injection",
        severity: "critical",
        title: "Dynamic Function Constructor",
        description: "`new Function()` creates a function from a string, equivalent to eval(). User-controlled input here enables remote code execution.",
        evidence: `${filePath}:${i + 1}: ${trimmed.slice(0, 100)}`,
        file: filePath,
        line: i + 1,
        confidence: 99,
        fixPrompt: "Remove `new Function()` usage. Use a predefined function map or switch statement instead.",
        snippet: trimmed.slice(0, 120),
      });
    }

    if (/document\.write\s*\(/.test(trimmed)) {
      findings.push({
        category: "injection",
        severity: "high",
        title: "document.write() Usage",
        description: "document.write() can overwrite the entire page and bypasses browser XSS filters. In modern apps it's always wrong.",
        evidence: `${filePath}:${i + 1}: ${trimmed.slice(0, 100)}`,
        file: filePath,
        line: i + 1,
        confidence: 98,
        fixPrompt: "Replace document.write() with DOM manipulation methods like createElement() and appendChild().",
        snippet: trimmed.slice(0, 120),
      });
    }

    if (/(postMessage|onmessage)\s*\(/.test(trimmed) && !/origin\s*[:=]/.test(trimmed) && !/\.origin/.test(trimmed)) {
      findings.push({
        category: "auth",
        severity: "high",
        title: "Unverified postMessage Handler",
        description: "postMessage handler without origin validation allows any window to send messages, leading to data theft.",
        evidence: `${filePath}:${i + 1}: ${trimmed.slice(0, 100)}`,
        file: filePath,
        line: i + 1,
        confidence: 88,
        fixPrompt: "Add origin validation: `if (event.origin !== 'https://yourdomain.com') return;`",
        snippet: trimmed.slice(0, 120),
      });
    }
  }

  return findings;
}

export function analyzeWithAst(dir: string): AstFinding[] {
  const allFindings: AstFinding[] = [];
  const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", ".cache", "coverage", ".turbo", "out"]);

  function walk(current: string, depth = 0) {
    if (depth > 5) return;
    try {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) walk(full, depth + 1);
        } else {
          const ext = path.extname(full);
          if ([".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(ext)) {
            try {
              const stat = fs.statSync(full);
              if (stat.size > 100_000) continue;
              const content = fs.readFileSync(full, "utf8");
              const findings = parseWithBabel(full, content);
              allFindings.push(...findings);
            } catch {}
          }
        }
      }
    } catch {}
  }

  walk(dir);
  return allFindings;
}
