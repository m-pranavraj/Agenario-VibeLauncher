import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findFunctionCalls, findStringLiterals } from '../engine/ast-utils.js';

export class HardcodedS3BucketRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-CLD-001', name: 'Hardcoded S3 Bucket Name', description: 'Detects hardcoded S3 bucket names that could be hijacked', category: 'security-crypto', severity: 'high', cwe: 'CWE-200', techniqueNumber: 164, pillar: 1, tags: ['s3', 'bucket', 'hardcoded'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /\.s3\.amazonaws\.com|s3:\/\//i.test(s) || /(my|app|dev|prod|test|data|backup).*bucket/i.test(s));
    for (const s of strings) {
      if (s.value.length > 5 && s.value.length < 100) {
        this.emit(ctx, { title: 'Hardcoded S3 bucket reference', message: `S3 bucket reference "${s.value.slice(0, 60)}" found — if deleted/recreated, attacker can claim it`, file: s.file, line: s.line, confidence: 65, remediation: 'Use environment variables for S3 bucket names and validate bucket existence before use' });
      }
    }
  }
}

export class IAMOverprivilegedRoleRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-CLD-002', name: 'Overly Permissive IAM Policy', description: 'Detects IAM policies with wildcard (*) actions or resources', category: 'security-networking', severity: 'critical', cwe: 'CWE-732', techniqueNumber: 165, pillar: 1, tags: ['iam', 'aws', 'policy'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /Action.*\*|Resource.*\*|arn:aws:iam/i.test(s) && s.includes('Effect'));
    for (const s of strings) {
      if (s.value.includes('"*"') || s.value.includes("'*'")) {
        this.emit(ctx, { title: 'IAM policy with wildcard permissions', message: 'IAM policy statement with Action or Resource set to "*" — grants excessive permissions, violating least-privilege', file: s.file, line: s.line, confidence: 90, remediation: 'Restrict IAM policy actions and resources to only what is needed, avoid wildcards' });
      }
    }
  }
}

export class EnvFileInRepoRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-CLD-003', name: '.env File Not in .gitignore', description: 'Detects .env files committed to version control', category: 'security-crypto', severity: 'critical', cwe: 'CWE-522', techniqueNumber: 166, pillar: 1, tags: ['env', 'secrets', 'gitignore'] };
  async execute(ctx: RuleContext): Promise<void> {
    const files = ctx.parsed.filter(p => p.file?.endsWith('.env') || p.file?.includes('.env.'));
    for (const f of files) {
      this.emit(ctx, { title: 'Environment file detected in source', message: `.env file "${f.file}" included in scan scope — likely committed to version control, exposing secrets`, file: f.file || '', line: 1, confidence: 95, remediation: 'Add .env to .gitignore, rotate all secrets, and use secret manager' });
    }
  }
}

export class DockerSockMountRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-CLD-004', name: 'Docker Socket Mount in Container', description: 'Detects Docker socket mounted into containers (privilege escalation)', category: 'security-networking', severity: 'critical', cwe: 'CWE-250', techniqueNumber: 167, pillar: 1, tags: ['docker', 'container', 'privilege'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /\/var\/run\/docker\.sock|docker\.sock/i.test(s));
    for (const s of strings) {
      this.emit(ctx, { title: 'Docker socket mounted in container', message: `Docker socket reference "${s.value}" — mounting /var/run/docker.sock gives container root-level host access`, file: s.file, line: s.line, confidence: 95, remediation: 'Remove Docker socket mount, use Docker-in-Docker or remote API with TLS instead' });
    }
  }
}

export class HardcodedDBConnectionStringRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-CLD-005', name: 'Hardcoded Database Connection String', description: 'Detects hardcoded database URLs with credentials', category: 'security-crypto', severity: 'critical', cwe: 'CWE-798', techniqueNumber: 168, pillar: 1, tags: ['database', 'credentials', 'hardcoded'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /mysql:\/\/|postgres:\/\/|mongodb:\/\/|postgresql:\/\/|redis:\/\/|amqp:\/\//i.test(s));
    for (const s of strings) {
      const hasCreds = s.value.includes('://') && s.value.split('://')[1]?.includes('@');
      if (hasCreds) {
        this.emit(ctx, { title: 'Hardcoded database connection string with credentials', message: `Database connection string with embedded credentials found — exposed in code and potentially in version control`, file: s.file, line: s.line, confidence: 95, remediation: 'Use environment variables for database URLs, never hardcode credentials' });
      }
    }
  }
}

export class PublicS3ACLRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-CLD-006', name: 'Potentially Public S3 Bucket ACL', description: 'Detects S3 bucket policies allowing public access', category: 'security-networking', severity: 'high', cwe: 'CWE-200', techniqueNumber: 169, pillar: 1, tags: ['s3', 'public', 'access'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /public-read|public-read-write|authenticated-read|AllUsers|PublicAccessBlock/i.test(s));
    for (const s of strings) {
      this.emit(ctx, { title: 'Potentially public S3 bucket ACL', message: `S3 ACL "${s.value}" found — allows public read/write access to bucket contents`, file: s.file, line: s.line, confidence: 82, remediation: 'Use PublicAccessBlock configuration and least-privilege bucket policies' });
    }
  }
}

export class InsecureK8sConfigRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-CLD-007', name: 'Insecure Kubernetes Configuration', description: 'Detects Kubernetes configs with privileged containers or hostNetwork', category: 'security-networking', severity: 'high', cwe: 'CWE-250', techniqueNumber: 170, pillar: 1, tags: ['kubernetes', 'k8s', 'privileged'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /privileged:\s*true|hostNetwork:\s*true|hostPID:\s*true|runAsRoot/i.test(s));
    for (const s of strings) {
      this.emit(ctx, { title: 'Insecure Kubernetes pod security context', message: `K8s security context "${s.value}" grants elevated host access — container could compromise the node`, file: s.file, line: s.line, confidence: 88, remediation: 'Set privileged: false, use readOnlyRootFilesystem, and drop all capabilities' });
    }
  }
}

export class ECRImageTagLatestRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-CLD-008', name: 'Docker Image Using :latest Tag', description: 'Detects Docker images referencing the :latest tag', category: 'security-networking', severity: 'medium', cwe: 'CWE-1104', techniqueNumber: 171, pillar: 1, tags: ['docker', 'tag', 'supply-chain'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /:\blatest\b|image:\s*[\w.\/-]+:latest/i.test(s));
    for (const s of strings) {
      this.emit(ctx, { title: 'Docker image using :latest tag', message: `"${s.value}" uses the :latest tag — unpredictable version, breaks reproducibility`, file: s.file, line: s.line, confidence: 70, remediation: 'Pin Docker image to a specific semantic version or digest hash' });
    }
  }
}

export class CloudRoleAssumableByAllRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-CLD-009', name: 'IAM Role Assumable by Any AWS Account', description: 'Detects overly broad IAM trust policies', category: 'security-networking', severity: 'critical', cwe: 'CWE-284', techniqueNumber: 172, pillar: 1, tags: ['iam', 'trust-policy', 'aws'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /Principal.*\*|AWS.*arn:aws:iam::\*|sts:AssumeRole/i.test(s) && s.includes('*'));
    for (const s of strings) {
      this.emit(ctx, { title: 'IAM trust policy allows any AWS account', message: 'IAM role trust policy allows any AWS account (*) to assume the role — privilege escalation risk', file: s.file, line: s.line, confidence: 92, remediation: 'Restrict the Principal in trust policy to specific AWS accounts or roles' });
    }
  }
}

export class KMSKeyNoRotationRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-CLD-010', name: 'KMS Key With No Automatic Rotation', description: 'Detects KMS keys configured without automatic rotation', category: 'security-crypto', severity: 'medium', cwe: 'CWE-326', techniqueNumber: 173, pillar: 1, tags: ['kms', 'encryption', 'rotation'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /aws_kms_key|KMS.*key|kms_key_id/i.test(s));
    const hasRotation = findStringLiterals(ctx.parsed, s => /enable_key_rotation|rotation_period|rotation_enabled/i.test(s));
    if (strings.length > 0 && hasRotation.length === 0) {
      this.emit(ctx, { title: 'KMS key without automatic rotation enabled', message: 'AWS KMS key defined but automatic yearly rotation not enabled', file: '', line: 1, confidence: 70, remediation: 'Enable automatic KMS key rotation with enable_key_rotation = true' });
    }
  }
}

export class LambdaExposedRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-CLD-011', name: 'Lambda Function URL Without Auth', description: 'Detects Lambda function URLs without IAM authentication', category: 'security-networking', severity: 'high', cwe: 'CWE-306', techniqueNumber: 174, pillar: 1, tags: ['lambda', 'auth', 'aws'] };
  async execute(ctx: RuleContext): Promise<void> {
    const strings = findStringLiterals(ctx.parsed, s => /FunctionUrl|lambda_function_url|AuthType.*NONE/i.test(s));
    for (const s of strings) {
      if (s.value.includes('NONE') || s.value.includes('None')) {
        this.emit(ctx, { title: 'Lambda function URL with no authentication', message: 'Lambda function URL configured with AuthType = NONE — anyone with the URL can invoke it', file: s.file, line: s.line, confidence: 88, remediation: 'Set AuthType to AWS_IAM for Lambda function URLs' });
      }
    }
  }
}
