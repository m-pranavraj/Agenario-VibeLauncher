import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findFunctionCalls, findStringLiterals } from '../engine/ast-utils.js';

export class DependencyConfusionRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-SUP-001', name: 'Dependency Confusion Risk', description: 'Detects package names that may be confused with private packages', category: 'security-networking', severity: 'high', cwe: 'CWE-1104', techniqueNumber: 175, pillar: 1, tags: ['dependency', 'supply-chain', 'confusion'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /"(name|dependencies|devDependencies)":/i.test(s) || (s.includes('@') && s.includes('/') && !s.includes('://')));
    for (const s of strings) {
      if (s.value.startsWith('@') && s.value.length < 50) {
        this.emit(ctx, { title: 'Potential dependency confusion risk', message: `Scoped package "${s.value}" — if private but published to public registry, attackers can publish a higher version`, file: s.file, line: s.line, confidence: 50, remediation: 'Use npm-scoped registry for private packages or verify package ownership' });
      }
    }
  }
}

export class YarnNpmMixedLockRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-SUP-002', name: 'Mixed Lock Files Detected', description: 'Detects both yarn.lock and package-lock.json in project', category: 'security-networking', severity: 'low', techniqueNumber: 176, pillar: 1, tags: ['lockfile', 'yarn', 'npm'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasYarn = findStringLiterals(ctx.parsed, s => s.includes('yarn.lock'));
    const hasNpm = findStringLiterals(ctx.parsed, s => s.includes('package-lock.json'));
    if (hasYarn.length > 0 && hasNpm.length > 0) {
      this.emit(ctx, { title: 'Mixed package lock files', message: 'Both yarn.lock and package-lock.json detected — inconsistent dependency resolution may cause drift', file: '', line: 1, confidence: 75, remediation: 'Remove one lock file and standardize on a single package manager' });
    }
  }
}

export class InsecurePackageSourceRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-SUP-003', name: 'Insecure Package Source Registry', description: 'Detects dependencies from http:// (non-HTTPS) registries', category: 'security-networking', severity: 'high', cwe: 'CWE-829', techniqueNumber: 177, pillar: 1, tags: ['registry', 'https', 'man-in-the-middle'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /http:\/\/registry|http:\/\/.*npm|bower-registry.*http/i.test(s));
    for (const s of strings) {
      this.emit(ctx, { title: 'Insecure HTTP package registry', message: `Package registry using http:// instead of https:// — susceptible to MITM attacks during install`, file: s.file, line: s.line, confidence: 95, remediation: 'Change registry URL from http:// to https://' });
    }
  }
}

export class NpmScriptInjectionRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-SUP-004', name: 'NPM Script Command Injection', description: 'Detects shell commands in npm scripts from untrusted input', category: 'security-injection', severity: 'high', cwe: 'CWE-77', techniqueNumber: 178, pillar: 1, tags: ['npm', 'scripts', 'injection'] };
  async execute(ctx: RuleContext): Promise<void> {
    const scripts = findStringLiterals(ctx.parsed, s => /"(pre|post)?(install|build|start|test|deploy)"/i.test(s) || s.includes('&&') || s.includes('||') || s.includes(';'));
    for (const s of scripts) {
      if (s.value.includes('shell:') || s.value.includes('exec(')) {
        this.emit(ctx, { title: 'NPM script with shell command execution', message: `Package script contains shell execution — if an argument is user-controllable, leads to RCE`, file: s.file, line: s.line, confidence: 60, remediation: 'Avoid using shell: true in npm scripts, use execa or similar safely' });
      }
    }
  }
}

export class OutdatedDependencyRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-SUP-005', name: 'Potential Outdated Major Dependency', description: 'Detects dependencies potentially pinned to very old major versions', category: 'security-networking', severity: 'medium', techniqueNumber: 179, pillar: 1, tags: ['dependency', 'outdated', 'version'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /"\w[\w-]*":\s*"\^?0\.\d|"\w[\w-]*":\s*"\^?1\.\d/i.test(s));
    for (const s of strings) {
      this.emit(ctx, { title: 'Potentially outdated major dependency', message: `Dependency pinned to major version 0.x or 1.x — may be abandoned or have known vulnerabilities`, file: s.file, line: s.line, confidence: 40, remediation: 'Audit dependency for newer versions or maintained alternatives' });
    }
  }
}
