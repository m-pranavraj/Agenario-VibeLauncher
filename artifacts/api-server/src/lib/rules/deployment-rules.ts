export interface DeploymentRule {
  id: string;
  name: string;
  category: "docker" | "ci_cd" | "env" | "migration";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  pattern?: RegExp;
}

export const DEPLOYMENT_RULES: DeploymentRule[] = [
  {
    id: "dep-doc-1",
    name: "Running Docker as Root",
    category: "docker",
    severity: "critical",
    description: "Missing USER directive in Dockerfile, causing the app to run as root.",
    pattern: /^(?!.*USER node).*$/s, // Simplified regex for conceptual demo
  },
  {
    id: "dep-ci-1",
    name: "Missing SAST/Linting in CI Pipeline",
    category: "ci_cd",
    severity: "high",
    description: "GitHub Actions workflow missing a step for running tests or linters before deployment.",
  },
  {
    id: "dep-env-1",
    name: "Committed .env File",
    category: "env",
    severity: "critical",
    description: ".env file containing real secrets checked into version control.",
  },
  {
    id: "dep-mig-1",
    name: "Irreversible Database Migration",
    category: "migration",
    severity: "high",
    description: "A migration script containing a DROP TABLE or DROP COLUMN without a backup or rollback mechanism.",
  }
];
