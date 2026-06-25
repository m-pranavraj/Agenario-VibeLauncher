import { readFileSync, existsSync } from 'node:fs';
import { extname, basename } from 'node:path';
import type {
  InfraFinding, DeploySafeReport, InfraFindingSeverity,
} from '../types.js';

const DOCKERFILE_RULES: Array<{
  id: string; severity: InfraFindingSeverity; pattern: RegExp;
  message: string; remediation: string; category: InfraFinding['category'];
}> = [
  { id: 'DS-DL-001', severity: 'high', pattern: /^FROM\s+\S+:\s*latest\s*$/m, message: 'Base image uses "latest" tag — unpinned and non-reproducible', remediation: 'Pin to a specific digest or semver tag (e.g., node:20-alpine@sha256:...)', category: 'docker' },
  { id: 'DS-DL-002', severity: 'critical', pattern: /^USER\s+root\s*$/m, message: 'Container runs as root user', remediation: 'Add a USER directive with non-root user before the CMD/ENTRYPOINT', category: 'docker' },
  { id: 'DS-DL-003', severity: 'high', pattern: /^ADD\s+/m, message: 'Prefer COPY over ADD unless URL/tar extraction is needed', remediation: 'Replace ADD with COPY for local files', category: 'docker' },
  { id: 'DS-DL-004', severity: 'critical', pattern: /(?:APT_KEY_DONT_WARN_ON_DONT_USE|DEBIAN_FRONTEND)/, message: 'Interactive package install without non-interactive flag', remediation: 'Add DEBIAN_FRONTEND=noninteractive to the RUN command', category: 'docker' },
  { id: 'DS-DL-005', severity: 'medium', pattern: /^EXPOSE\s+(22|3389)\s*$/m, message: 'Container exposes SSH or RDP port — attack surface', remediation: 'Remove SSH/RDP expose unless absolutely required', category: 'docker' },
  { id: 'DS-DL-006', severity: 'medium', pattern: /apt-get\s+(install|update)\s+&&\s*apt-get\s+(install|update)/, message: 'apt operations not combined — creates extra layer bloat', remediation: 'Combine apt-get update and install in one RUN', category: 'docker' },
  { id: 'DS-DL-007', severity: 'high', pattern: /npm\s+(install|ci)\s+(--unsafe-perm|---allow-root)/, message: 'npm running with elevated privileges', remediation: 'Use a non-root user or drop --unsafe-perm', category: 'docker' },
  { id: 'DS-DL-008', severity: 'low', pattern: /^ENV\s+(NODE_ENV|ENVIRONMENT)\s*=\s*(development|dev|staging)/m, message: 'Dev environment variable leaked into production image', remediation: 'Set NODE_ENV=production only', category: 'env' },
  { id: 'DS-DL-009', severity: 'critical', pattern: /(?:PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY)\s*=\s*['\"][^'\"]+['\"]/, message: 'Hardcoded secret in Dockerfile', remediation: 'Use Docker secrets or build args with --secret', category: 'secret' },
  { id: 'DS-DL-010', severity: 'medium', pattern: /apt-get\s+(purge|remove)\s+--?auto-remove/, message: 'apt cleanup missing — leave unnecessary packages in layers', remediation: 'Add && rm -rf /var/lib/apt/lists/* after apt commands', category: 'docker' },
];

const CICD_RULES: Array<{
  id: string; severity: InfraFindingSeverity; pattern: RegExp;
  message: string; remediation: string; category: InfraFinding['category'];
}> = [
  { id: 'DS-CI-001', severity: 'high', pattern: /pull_request_target/, message: 'pull_request_target can leak secrets from the target repo', remediation: 'Use pull_request instead, or scope GITHUB_TOKEN permissions', category: 'cicd' },
  { id: 'DS-CI-002', severity: 'critical', pattern: /GITHUB_TOKEN:\s*write/, message: 'Workflow grants write permissions to GITHUB_TOKEN unnecessarily', remediation: 'Set permissions: contents: read, issues: none', category: 'cicd' },
  { id: 'DS-CI-003', severity: 'high', pattern: /uses:\s+\S+@(main|master|dev|develop)/, message: 'Unpinned GitHub Action — supply chain risk', remediation: 'Pin to a full commit SHA (e.g., @abc123def456)', category: 'cicd' },
  { id: 'DS-CI-004', severity: 'critical', pattern: /run:\s+.*\$\{\{.*secrets\./, message: 'Secrets potentially leaked via script output', remediation: 'Avoid printing secrets; mask them with ::add-mask::', category: 'secret' },
  { id: 'DS-CI-005', severity: 'high', pattern: /(?:curl|wget)\s+.*\|\s*(?:bash|sh)/, message: 'Pipes curl output to shell — remote code execution risk', remediation: 'Download, verify checksum, then execute', category: 'cicd' },
  { id: 'DS-CI-006', severity: 'medium', pattern: /actions\/checkout@/, message: 'Checkout without explicit fetch-depth or persist-credentials', remediation: 'Set fetch-depth: 1 and persist-credentials: false if not needed', category: 'cicd' },
  { id: 'DS-CI-007', severity: 'medium', pattern: /env:\s*\n\s+\w+:/, message: 'Inline env vars may expose sensitive data in logs', remediation: 'Use GitHub Secrets or OIDC instead of inline env', category: 'env' },
  { id: 'DS-CI-008', severity: 'high', pattern: /self-hosted/, message: 'Self-hosted runner — ensure ephemeral or locked down', remediation: 'Use GitHub-hosted runners or enforce ephemeral self-hosted runners', category: 'cicd' },
  { id: 'DS-CI-009', severity: 'critical', pattern: /(?:password|secret|token|key)\s*:\s*['\"][^'\"]+['\"]/, message: 'Hardcoded credential in workflow file', remediation: 'Use ${{ secrets.xxx }} reference instead of hardcoding', category: 'secret' },
  { id: 'DS-CI-010', severity: 'low', pattern: /if:\s+.*(?:true|false)/, message: 'Hardcoded condition — may skip required gates', remediation: 'Use dynamic condition checks', category: 'cicd' },
];

const K8S_RULES: Array<{
  id: string; severity: InfraFindingSeverity; pattern: RegExp;
  message: string; remediation: string; category: InfraFinding['category'];
}> = [
  { id: 'DS-K8-001', severity: 'critical', pattern: /privileged:\s*true/, message: 'Pod runs in privileged mode — full host access', remediation: 'Set securityContext.privileged: false', category: 'deployment' },
  { id: 'DS-K8-002', severity: 'high', pattern: /runAsNonRoot:\s*false/, message: 'Container allowed to run as root', remediation: 'Set runAsNonRoot: true and runAsUser: >1000', category: 'deployment' },
  { id: 'DS-K8-003', severity: 'high', pattern: /imagePullPolicy:\s*(Always|IfNotPresent)/, message: 'No explicit image tag — deploys mutable tags', remediation: 'Pin to a specific version tag or digest', category: 'deployment' },
  { id: 'DS-K8-004', severity: 'medium', pattern: /readOnlyRootFilesystem:\s*false/, message: 'Root filesystem is writable', remediation: 'Set readOnlyRootFilesystem: true', category: 'deployment' },
  { id: 'DS-K8-005', severity: 'medium', pattern: /resources:\s*(?!.*limits)/s, message: 'No resource limits set — risk of DoS on cluster', remediation: 'Set resources.limits.cpu and resources.limits.memory', category: 'deployment' },
  { id: 'DS-K8-006', severity: 'critical', pattern: /hostNetwork:\s*true/, message: 'Pod uses host network namespace', remediation: 'Set hostNetwork: false', category: 'deployment' },
  { id: 'DS-K8-007', severity: 'high', pattern: /automountServiceAccountToken:\s*true/, message: 'Service account token automounted unnecessarily', remediation: 'Set automountServiceAccountToken: false unless needed', category: 'deployment' },
  { id: 'DS-K8-008', severity: 'medium', pattern: /replicas:\s*1(?:\s|$)/, message: 'Single replica — no high availability', remediation: 'Set replicas >= 2 for production workloads', category: 'deployment' },
];

export class DeploySafe {
  private findings: InfraFinding[] = [];
  private filesScanned: string[] = [];

  scanFile(filePath: string): void {
    if (!existsSync(filePath)) return;
    this.filesScanned.push(filePath);
    const content = readFileSync(filePath, 'utf-8');
    const ext = extname(filePath).toLowerCase();
    const base = basename(filePath).toLowerCase();

    if (base === 'dockerfile' || ext === '.dockerfile') {
      this.scanDockerfile(content, filePath);
    }
    if (base.endsWith('.yml') || base.endsWith('.yaml')) {
      if (content.includes('on:') && content.includes('jobs:')) {
        this.scanCICD(content, filePath);
      }
      if (content.includes('apiVersion:') && content.includes('kind:')) {
        this.scanK8s(content, filePath);
      }
    }
  }

  scanDirectory(dirPath: string): void {
    const { readdirSync, statSync } = require('node:fs');
    const { join } = require('node:path');
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      try {
        const s = statSync(fullPath);
        if (s.isFile()) this.scanFile(fullPath);
      } catch { /* skip */ }
    }
  }

  report(): DeploySafeReport {
    const dockerfileIssues = this.findings.filter(f => f.category === 'docker').length;
    const cicdIssues = this.findings.filter(f => f.category === 'cicd').length;
    const secretExposures = this.findings.filter(f => f.category === 'secret').length;
    const weighted = this.findings.reduce((acc, f) => {
      const w = f.severity === 'critical' ? 12 : f.severity === 'high' ? 6 : f.severity === 'medium' ? 3 : 1;
      return acc + w;
    }, 0);
    const score = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-weighted / 150))));
    return {
      findings: this.findings, filesScanned: this.filesScanned, score: Math.round(score),
      dockerfileIssues, cicdIssues, secretExposures,
    };
  }

  private scanDockerfile(content: string, file: string): void {
    const lines = content.split('\n');
    for (const rule of DOCKERFILE_RULES) {
      const match = rule.pattern.exec(content);
      if (match) {
        const lineNum = this.findLineForMatch(content, match[0]);
        this.findings.push({
          id: `DS-${this.findings.length + 1}`,
          ruleId: rule.id, severity: rule.severity, message: rule.message,
          file, line: lineNum, column: 0, remediation: rule.remediation, category: rule.category,
        });
      }
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const secretMatch = line.match(/(?:PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY)\s*=\s*['"][^'"]+['"]/i);
      if (secretMatch && !line.trimStart().startsWith('#')) {
        this.findings.push({
          id: `DS-${this.findings.length + 1}`, ruleId: 'DS-DL-011', severity: 'critical',
          message: `Potential secret exposed: ${secretMatch[0].slice(0, 40)}...`,
          file, line: i + 1, column: line.indexOf(secretMatch[0]), remediation: 'Use Docker build secrets',
          category: 'secret',
        });
      }
    }
  }

  private scanCICD(content: string, file: string): void {
    for (const rule of CICD_RULES) {
      const match = rule.pattern.exec(content);
      if (match) {
        const lineNum = this.findLineForMatch(content, match[0]);
        this.findings.push({
          id: `DS-${this.findings.length + 1}`,
          ruleId: rule.id, severity: rule.severity, message: rule.message,
          file, line: lineNum, column: 0, remediation: rule.remediation, category: rule.category,
        });
      }
    }
  }

  private scanK8s(content: string, file: string): void {
    for (const rule of K8S_RULES) {
      const match = rule.pattern.exec(content);
      if (match) {
        const lineNum = this.findLineForMatch(content, match[0]);
        this.findings.push({
          id: `DS-${this.findings.length + 1}`,
          ruleId: rule.id, severity: rule.severity, message: rule.message,
          file, line: lineNum, column: 0, remediation: rule.remediation, category: rule.category,
        });
      }
    }
  }

  private findLineForMatch(content: string, matchText: string): number {
    const idx = content.indexOf(matchText);
    if (idx === -1) return 1;
    return content.slice(0, idx).split('\n').length;
  }
}
