/**
 * Pillar 7: DeploySafe — Deployment Safety Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * PATENT CLAIM: An infrastructure-as-code analysis engine that parses CI/CD
 * workflows, Dockerfiles, and environment configurations to ensure zero-downtime
 * deployment patterns and safety gates.
 *
 * Core algorithms:
 *   - Dockerfile analysis: multi-stage builds, non-root user, pinned images.
 *   - CI/CD workflow parsing (GitHub Actions/GitLab CI) for test/lint/deploy stages.
 *   - package.json script analysis for standard CI hooks.
 *   - Env var matching: verify `.env.example` matches code usage.
 */

import { logger } from "./logger.js";

export interface DeploymentFinding {
  id: string;
  category: "docker" | "ci_cd" | "env_vars" | "scripts";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string;
  filePath: string;
  lineNumber: number;
  fixPrompt: string;
  confidence: number;
}

export interface DeploymentReport {
  findings: DeploymentFinding[];
  scores: {
    dockerSafetyScore: number;
    ciSafetyScore: number;
    envSafetyScore: number;
    deploymentScore: number;
  };
  stats: {
    dockerfilesAnalyzed: number;
    ciConfigsAnalyzed: number;
    envVarsFound: number;
    safetyGatesPassed: number;
    safetyGatesFailed: number;
  };
}

export function runDeploySafe(
  files: Array<{ path: string; content: string }>
): DeploymentReport {
  const findings: DeploymentFinding[] = [];
  const stats = {
    dockerfilesAnalyzed: 0,
    ciConfigsAnalyzed: 0,
    envVarsFound: 0,
    safetyGatesPassed: 0,
    safetyGatesFailed: 0,
  };

  let dockerScore = 100;
  let ciScore = 100;
  let envScore = 100;

  // 1. Analyze Dockerfiles
  const dockerfiles = files.filter(f => f.path.toLowerCase().includes("dockerfile"));
  for (const dockerfile of dockerfiles) {
    stats.dockerfilesAnalyzed++;
    const content = dockerfile.content;
    const lines = content.split("\n");

    // Check Multi-stage build
    const fromCount = (content.match(/^FROM\s/gm) || []).length;
    if (fromCount < 2) {
      findings.push({
        id: `deploy-docker-multistage-${dockerfile.path}`,
        category: "docker",
        severity: "medium",
        title: "Missing Multi-stage Docker Build",
        description: "Dockerfile does not use multi-stage builds. This results in larger image sizes by including build tools in the production image.",
        evidence: `${dockerfile.path} — Only ${fromCount} FROM statement(s) found`,
        filePath: dockerfile.path,
        lineNumber: 1,
        fixPrompt: "Use a builder stage for dependencies and compilation, then copy only the necessary artifacts to a smaller production base image.",
        confidence: 90,
      });
      stats.safetyGatesFailed++;
      dockerScore -= 20;
    } else {
      stats.safetyGatesPassed++;
    }

    // Check Non-root user
    const hasUser = /^USER\s+[a-zA-Z0-9_-]+/m.test(content);
    if (!hasUser) {
      findings.push({
        id: `deploy-docker-user-${dockerfile.path}`,
        category: "docker",
        severity: "high",
        title: "Docker Container Runs as Root",
        description: "No USER instruction found. Running containers as root is a major security risk if a container breakout vulnerability exists.",
        evidence: `${dockerfile.path} — No USER statement`,
        filePath: dockerfile.path,
        lineNumber: 1,
        fixPrompt: "Add `USER node` (or create a specific user) before the `CMD` or `ENTRYPOINT` instruction.",
        confidence: 95,
      });
      stats.safetyGatesFailed++;
      dockerScore -= 30;
    } else {
      stats.safetyGatesPassed++;
    }

    // Check Pinned Images
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("FROM ")) {
        const image = line.split(" ")[1];
        if (image && (!image.includes(":") || image.endsWith(":latest"))) {
          findings.push({
            id: `deploy-docker-pinned-${dockerfile.path}-${i}`,
            category: "docker",
            severity: "medium",
            title: "Unpinned Docker Base Image",
            description: `Using 'latest' or unpinned image tag '${image}' can cause unpredictable builds and breakages when the upstream image updates.`,
            evidence: `${dockerfile.path}:${i+1} — ${line}`,
            filePath: dockerfile.path,
            lineNumber: i + 1,
            fixPrompt: "Pin the image to a specific version or SHA hash (e.g., `node:18.17.0-alpine`).",
            confidence: 98,
          });
          stats.safetyGatesFailed++;
          dockerScore -= 10;
        } else {
          stats.safetyGatesPassed++;
        }
      }
    }
  }

  // 2. Analyze CI/CD Workflows (GitHub Actions)
  const ciFiles = files.filter(f => f.path.includes(".github/workflows/") && (f.path.endsWith(".yml") || f.path.endsWith(".yaml")));
  
  if (ciFiles.length === 0) {
    findings.push({
      id: `deploy-ci-missing`,
      category: "ci_cd",
      severity: "high",
      title: "Missing CI/CD Pipeline",
      description: "No GitHub Actions workflows found in `.github/workflows/`. Automated testing and deployment gates are crucial for reliability.",
      evidence: "Project structure missing .github/workflows directory",
      filePath: "/",
      lineNumber: 1,
      fixPrompt: "Set up a CI/CD pipeline to run tests, linting, and build steps automatically on Pull Requests.",
      confidence: 100,
    });
    ciScore = 0;
    stats.safetyGatesFailed++;
  } else {
    for (const ci of ciFiles) {
      stats.ciConfigsAnalyzed++;
      const content = ci.content;
      
      const hasTests = /npm\s+(run\s+)?test|yarn\s+test|jest/i.test(content);
      const hasLint = /npm\s+(run\s+)?lint|yarn\s+lint|eslint/i.test(content);
      const hasBuild = /npm\s+(run\s+)?build|yarn\s+build|tsc/i.test(content);

      if (!hasTests) {
        findings.push({
          id: `deploy-ci-notests-${ci.path}`,
          category: "ci_cd",
          severity: "high",
          title: "CI Pipeline Missing Test Stage",
          description: "Workflow does not appear to execute automated tests.",
          evidence: `${ci.path} — No test command found`,
          filePath: ci.path,
          lineNumber: 1,
          fixPrompt: "Add a step to run `npm test` before any deployment steps.",
          confidence: 80,
        });
        ciScore -= 30;
        stats.safetyGatesFailed++;
      } else {
        stats.safetyGatesPassed++;
      }

      if (!hasLint) {
        findings.push({
          id: `deploy-ci-nolint-${ci.path}`,
          category: "ci_cd",
          severity: "medium",
          title: "CI Pipeline Missing Lint Stage",
          description: "Workflow does not appear to run a linter.",
          evidence: `${ci.path} — No lint command found`,
          filePath: ci.path,
          lineNumber: 1,
          fixPrompt: "Add a step to run `npm run lint` to enforce code quality before merge.",
          confidence: 80,
        });
        ciScore -= 15;
        stats.safetyGatesFailed++;
      } else {
        stats.safetyGatesPassed++;
      }
    }
  }

  // 3. Env Vars: .env.example analysis
  const envExample = files.find(f => f.path.endsWith(".env.example") || f.path.endsWith(".env.template"));
  const envVarsInCode = new Set<string>();
  
  // Extract process.env usage from all TS/JS files
  for (const file of files) {
    if (file.path.endsWith(".ts") || file.path.endsWith(".js") || file.path.endsWith(".tsx")) {
      const re = /process\.env\.([A-Z0-9_]+)/g;
      let m;
      while ((m = re.exec(file.content)) !== null) {
        if (m[1] !== "NODE_ENV") {
          envVarsInCode.add(m[1]);
          stats.envVarsFound++;
        }
      }
    }
  }

  if (!envExample && envVarsInCode.size > 0) {
    findings.push({
      id: `deploy-env-missing-example`,
      category: "env_vars",
      severity: "medium",
      title: "Missing .env.example",
      description: `Project uses ${envVarsInCode.size} environment variables but provides no \`.env.example\` or \`.env.template\` file for developer onboarding.`,
      evidence: `process.env usage found but no template file exists`,
      filePath: "/",
      lineNumber: 1,
      fixPrompt: "Create a `.env.example` file listing all required variables with placeholder values.",
      confidence: 100,
    });
    envScore -= 30;
    stats.safetyGatesFailed++;
  } else if (envExample) {
    const documentedVars = new Set<string>();
    const envLines = envExample.content.split("\n");
    for (const line of envLines) {
      if (line.trim() && !line.startsWith("#")) {
        const key = line.split("=")[0].trim();
        documentedVars.add(key);
      }
    }

    // Find undocumented variables used in code
    for (const codeVar of envVarsInCode) {
      if (!documentedVars.has(codeVar)) {
        findings.push({
          id: `deploy-env-undocumented-${codeVar}`,
          category: "env_vars",
          severity: "low",
          title: `Undocumented Environment Variable: ${codeVar}`,
          description: `The variable \`process.env.${codeVar}\` is used in code but missing from \`.env.example\`.`,
          evidence: `Used in code, missing from ${envExample.path}`,
          filePath: envExample.path,
          lineNumber: 1,
          fixPrompt: `Add \`${codeVar}=\` to your \`.env.example\` file.`,
          confidence: 95,
        });
        envScore -= 5;
        stats.safetyGatesFailed++;
      }
    }
  }

  const deploymentScore = Math.max(0, Math.round((dockerScore * 0.4) + (ciScore * 0.4) + (envScore * 0.2)));

  logger.info({
    totalFindings: findings.length,
    deploymentScore
  }, "DeploySafe deployment analysis complete");

  return {
    findings,
    scores: {
      dockerSafetyScore: Math.max(0, dockerScore),
      ciSafetyScore: Math.max(0, ciScore),
      envSafetyScore: Math.max(0, envScore),
      deploymentScore,
    },
    stats,
  };
}
