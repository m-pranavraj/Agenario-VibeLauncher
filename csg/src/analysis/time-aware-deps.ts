import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { PackageRegistryInfo, DependencyDecayReport } from '../types.js';

const NPM_REGISTRY = 'https://registry.npmjs.org';

export class TimeAwareDeps {
  private packages: PackageRegistryInfo[] = [];
  private packageJsonPaths: string[] = [];

  loadPackageJson(path: string): void {
    if (!existsSync(path)) return;
    this.packageJsonPaths.push(path);
  }

  async analyze(): Promise<DependencyDecayReport> {
    this.packages = [];
    const depNames = new Set<string>();

    for (const pkgPath of this.packageJsonPaths) {
      const content = readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const name of Object.keys(deps)) {
        if (!depNames.has(name)) depNames.add(name);
      }
    }

    const entries = Array.from(depNames);
    const batchSize = 10;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(name => this.fetchPackageInfo(name))
      );
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          this.packages.push(result.value);
        }
      }
    }

    const totalDeps = this.packages.length;
    const deprecatedCount = this.packages.filter(p => p.deprecated).length;
    const staleCount = this.packages.filter(p => p.daysSinceLastPublish > 365).length;
    const vulnerableCount = this.packages.filter(p => p.openVulnerabilities > 0).length;
    const meanDecayDays = totalDeps > 0
      ? Math.round(this.packages.reduce((s, p) => s + p.daysSinceLastPublish, 0) / totalDeps)
      : 0;
    const meanMaintainers = totalDeps > 0
      ? Math.round((this.packages.reduce((s, p) => s + p.maintainers, 0) / totalDeps) * 10) / 10
      : 0;

    const deprecatedPenalty = (deprecatedCount / Math.max(totalDeps, 1)) * 40;
    const stalePenalty = (staleCount / Math.max(totalDeps, 1)) * 25;
    const vulnerablePenalty = (vulnerableCount / Math.max(totalDeps, 1)) * 20;
    const maintainerBonus = Math.min(meanMaintainers * 2, 15);
    const score = Math.max(0, Math.min(100, Math.round(100 - deprecatedPenalty - stalePenalty - vulnerablePenalty + maintainerBonus)));

    return {
      packages: this.packages, totalDeps, deprecatedCount,
      staleCount, vulnerableCount, meanDecayDays, meanMaintainers, score,
    };
  }

  private async fetchPackageInfo(name: string): Promise<PackageRegistryInfo | null> {
    try {
      const url = `${NPM_REGISTRY}/${encodeURIComponent(name)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) return null;
      const data = await res.json() as any;

      const latestVersion = data['dist-tags']?.latest || '';
      const latestData = data.versions?.[latestVersion] || {};
      const time = data.time || {};
      const lastPublishDate = time[latestVersion] || null;
      const daysSinceLastPublish = lastPublishDate
        ? Math.floor((Date.now() - new Date(lastPublishDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        name,
        currentVersion: latestVersion,
        latestVersion,
        lastPublishDate,
        daysSinceLastPublish,
        deprecated: !!latestData.deprecated,
        deprecationMessage: latestData.deprecated || null,
        openVulnerabilities: data.vulnerabilities ? Object.keys(data.vulnerabilities).length : 0,
        maintainers: (data.maintainers || []).length,
        weeklyDownloads: data.weeklyDownloads || 0,
        hasTypes: !!data.types || !!data.typings || !!data.versions?.[latestVersion]?.types || !!data.versions?.[latestVersion]?.typings,
        license: latestData.license || null,
      };
    } catch {
      return null;
    }
  }
}
