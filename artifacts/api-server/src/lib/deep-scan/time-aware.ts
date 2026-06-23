import fs from "node:fs";
import path from "node:path";

export interface TimeAwareFinding {
  id: string;
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  publishedAt: string;
  ageDays: number;
  isAbandoned: boolean;
  maintenanceScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  description: string;
  file: string;
  line: number;
}

export interface TimeAwareResult {
  findings: TimeAwareFinding[];
  stats: {
    packagesScanned: number;
    vulnerablePackages: number;
    abandonedPackages: number;
    durationMs: number;
  };
}

const ABANDONED_THRESHOLD_DAYS = 365;
const STALE_THRESHOLD_DAYS = 180;
const CRITICAL_AGE_DAYS = 730;

const VULNERABILITY_DB: Record<string, {
  cves: string[];
  cvssScore: number;
  description: string;
  firstPatchVersion: string;
  publishedAt: string;
}> = {};

export async function runTimeAwareScan(
  projectRoot: string,
): Promise<TimeAwareResult> {
  const startTime = Date.now();
  const findings: TimeAwareFinding[] = [];

  const packageJson = findPackageJson(projectRoot);
  if (!packageJson) {
    return {
      findings: [],
      stats: {
        packagesScanned: 0,
        vulnerablePackages: 0,
        abandonedPackages: 0,
        durationMs: Date.now() - startTime,
      },
    };
  }

  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const packageNames = Object.keys(dependencies);
  let vulnerableCount = 0;
  let abandonedCount = 0;

  for (const [pkgName, rawVersion] of Object.entries(dependencies)) {
    const version = String(rawVersion).replace(/^[\^~>=<]/, "");

    const finding = assessPackage(pkgName, version, packageJson.file);
    if (finding) {
      findings.push(finding);
      if (finding.riskLevel === "high" || finding.riskLevel === "critical") {
        vulnerableCount++;
      }
      if (finding.isAbandoned) {
        abandonedCount++;
      }
    }
  }

  return {
    findings,
    stats: {
      packagesScanned: packageNames.length,
      vulnerablePackages: vulnerableCount,
      abandonedPackages: abandonedCount,
      durationMs: Date.now() - startTime,
    },
  };
}

interface PackageJsonWithFile {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  file: string;
}

function findPackageJson(projectRoot: string): PackageJsonWithFile | null {
  const searchPaths = [
    path.join(projectRoot, "package.json"),
  ];

  for (const p of searchPaths) {
    try {
      const content = fs.readFileSync(p, "utf8");
      const parsed = JSON.parse(content);
      return { ...parsed, file: p };
    } catch {
      continue;
    }
  }
  return null;
}

function assessPackage(
  pkgName: string,
  version: string,
  pkgFile: string,
): TimeAwareFinding | null {
  const now = Date.now();
  const knownVuln = VULNERABILITY_DB[pkgName];
  const riskLevels: Array<"low" | "medium" | "high" | "critical"> = [];

  if (knownVuln) {
    const isAffected = isVersionAffected(version, knownVuln.firstPatchVersion);
    if (isAffected) {
      return {
        id: `cve-${pkgName}-${version}`,
        packageName: pkgName,
        currentVersion: version,
        latestVersion: knownVuln.firstPatchVersion,
        publishedAt: knownVuln.publishedAt,
        ageDays: Math.floor((now - new Date(knownVuln.publishedAt).getTime()) / 86400000),
        isAbandoned: false,
        maintenanceScore: 0,
        riskLevel: knownVuln.cvssScore >= 9 ? "critical" : knownVuln.cvssScore >= 7 ? "high" : knownVuln.cvssScore >= 4 ? "medium" : "low",
        description: knownVuln.description,
        file: pkgFile,
        line: 0,
      };
    }
  }

  const pkgDir = findPackageDir(pkgName);
  if (!pkgDir) return null;

  const pkgJsonPath = path.join(pkgDir, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return null;

  try {
    const pkgMeta = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));

    const publishedDate = pkgMeta.publishDate ?? pkgMeta.time?.modified ?? pkgMeta.date ?? null;
    const lastVersion = pkgMeta.version;
    const maintainers = pkgMeta.maintainers?.length ?? 0;

    const ageDays = publishedDate
      ? Math.floor((now - new Date(publishedDate).getTime()) / 86400000)
      : 0;

    const isAbandoned = ageDays > ABANDONED_THRESHOLD_DAYS;
    const maintenanceScore = calculateMaintenanceScore(ageDays, maintainers, pkgMeta);

    if (ageDays > STALE_THRESHOLD_DAYS) {
      riskLevels.push(isAbandoned && ageDays > CRITICAL_AGE_DAYS ? "critical" : isAbandoned ? "high" : "medium");
    }

    if (maintenanceScore < 0.3) {
      riskLevels.push("medium");
    }

    const finalRisk = riskLevels.length > 0
      ? riskLevels.reduce((a, b) => {
          const order = ["low", "medium", "high", "critical"];
          return order.indexOf(a) > order.indexOf(b) ? a : b;
        })
      : "low";

    if (ageDays > STALE_THRESHOLD_DAYS || maintenanceScore < 0.3) {
      return {
        id: `time-${pkgName}-${version}`,
        packageName: pkgName,
        currentVersion: version,
        latestVersion: lastVersion ?? version,
        publishedAt: publishedDate ?? "unknown",
        ageDays,
        isAbandoned,
        maintenanceScore: Math.round(maintenanceScore * 100) / 100,
        riskLevel: finalRisk,
        description: isAbandoned
          ? `Package ${pkgName}@${version} has not been updated in ${ageDays} days (abandoned)`
          : `Package ${pkgName}@${version} is stale (${ageDays} days since last publish, maintenance score: ${(maintenanceScore * 100).toFixed(0)}%)`,
        file: pkgFile,
        line: 0,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function findPackageDir(pkgName: string): string | null {
  const searchPaths = [
    path.join(process.cwd(), "node_modules", pkgName),
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function calculateMaintenanceScore(
  ageDays: number,
  maintainerCount: number,
  meta: Record<string, unknown>,
): number {
  let score = 1.0;

  if (ageDays > ABANDONED_THRESHOLD_DAYS) score -= 0.4;
  else if (ageDays > STALE_THRESHOLD_DAYS) score -= 0.2;

  if (maintainerCount === 0) score -= 0.3;
  else if (maintainerCount === 1) score -= 0.1;
  else if (maintainerCount >= 3) score += 0.1;

  const hasLicense = typeof meta.license === "string" && meta.license.length > 0;
  if (!hasLicense) score -= 0.1;

  return Math.max(0, Math.min(1, score));
}

function isVersionAffected(
  currentVersion: string,
  patchedVersion: string,
): boolean {
  const current = currentVersion.split(".").map(Number);
  const patched = patchedVersion.split(".").map(Number);

  for (let i = 0; i < Math.max(current.length, patched.length); i++) {
    const c = current[i] ?? 0;
    const p = patched[i] ?? 0;
    if (c < p) return true;
    if (c > p) return false;
  }
  return false;
}

export function getStalePackages(
  projectRoot: string,
  thresholdDays: number = ABANDONED_THRESHOLD_DAYS,
): string[] {
  const stale: string[] = [];
  const pkgJson = findPackageJson(projectRoot);
  if (!pkgJson) return stale;

  const allDeps = {
    ...pkgJson.dependencies,
    ...pkgJson.devDependencies,
  };

  for (const pkgName of Object.keys(allDeps)) {
    const pkgDir = findPackageDir(pkgName);
    if (!pkgDir) continue;

    try {
      const pkgMeta = JSON.parse(
        fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"),
      );
      const publishedDate = pkgMeta.publishDate ?? pkgMeta.time?.modified;
      if (publishedDate) {
        const ageDays = Math.floor(
          (Date.now() - new Date(publishedDate).getTime()) / 86400000,
        );
        if (ageDays > thresholdDays) stale.push(pkgName);
      }
    } catch {
      continue;
    }
  }

  return stale;
}

export function getPackageMaintenanceScore(pkgName: string): number {
  const pkgDir = findPackageDir(pkgName);
  if (!pkgDir) return 0;

  try {
    const pkgMeta = JSON.parse(
      fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"),
    );
    const publishedDate = pkgMeta.publishDate ?? pkgMeta.time?.modified ?? pkgMeta.date;
    const ageDays = publishedDate
      ? Math.floor((Date.now() - new Date(publishedDate).getTime()) / 86400000)
      : 9999;
    const maintainers = pkgMeta.maintainers?.length ?? 0;
    return calculateMaintenanceScore(ageDays, maintainers, pkgMeta);
  } catch {
    return 0;
  }
}
