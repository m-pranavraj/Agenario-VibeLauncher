import type { ASTFingerprint } from './ast-fingerprint.js';
import { compareFingerprints } from './ast-fingerprint.js';
import { VULNERABILITY_PATTERNS, deepMatchPattern, classifyVulnerability } from './vulnerability-patterns.js';
import { warmReferencePatterns } from './reference-samples.js';
import type { VulnerabilityPattern, DeepMatchResult } from './vulnerability-patterns.js';
import type { VulnerabilityClass } from './vulnerability-patterns.js';

export interface CloneMatch {
  sourceFingerprint: ASTFingerprint;
  targetFingerprint: ASTFingerprint;
  similarity: number;
  structuralMatch: boolean;
  depthRatio: number;
  nodeRatio: number;
  classification: 'identical' | 'near-clone' | 'type-3' | 'type-4';
}

export interface VulnerabilityMatch {
  fingerprint: ASTFingerprint;
  matchedPattern: VulnerabilityPattern;
  deepResult: DeepMatchResult;
  isZeroDay: boolean;
}

export interface AnalysisReport {
  fingerprints: Array<{ name: string; fp: ASTFingerprint }>;
  clones: CloneMatch[];
  vulnerabilities: VulnerabilityMatch[];
  cloneGroups: Array<{ hash: string; members: string[]; similarity: number }>;
  summary: {
    totalFunctions: number;
    vulnerableFunctions: number;
    zeroDayFunctions: number;
    uniqueVulnerabilityClasses: VulnerabilityClass[];
    cloneGroupsFound: number;
  };
}

export class CloneDetector {
  private knownFingerprints: ASTFingerprint[] = [];
  private warmed = false;

  ensureWarm(): void {
    if (!this.warmed) {
      warmReferencePatterns();
      this.warmed = true;
    }
  }

  ingest(fp: ASTFingerprint): void {
    this.knownFingerprints.push(fp);
  }

  ingestMany(fps: ASTFingerprint[]): void {
    this.knownFingerprints.push(...fps);
  }

  findClones(query: ASTFingerprint, minSimilarity = 0.6): CloneMatch[] {
    const matches: CloneMatch[] = [];
    for (const known of this.knownFingerprints) {
      const { structuralMatch, similarity, depthRatio, nodeRatio } = compareFingerprints(query, known);
      if (similarity >= minSimilarity) {
        let classification: CloneMatch['classification'];
        if (structuralMatch && similarity >= 0.95) classification = 'identical';
        else if (similarity >= 0.85) classification = 'near-clone';
        else if (similarity >= 0.65) classification = 'type-3';
        else classification = 'type-4';

        matches.push({ sourceFingerprint: query, targetFingerprint: known, similarity, structuralMatch, depthRatio, nodeRatio, classification });
      }
    }
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  detectVulnerabilities(fp: ASTFingerprint, sourceCode: string | null = null): VulnerabilityMatch[] {
    this.ensureWarm();
    const results = classifyVulnerability(fp, sourceCode);
    return results.map(r => ({
      fingerprint: fp,
      matchedPattern: r.pattern,
      deepResult: r,
      isZeroDay: r.verdict === 'zero-day',
    }));
  }

  detectAllVulnerabilities(fingerprints: Array<{ name: string; fp: ASTFingerprint; source?: string }>): Map<string, VulnerabilityMatch[]> {
    const results = new Map<string, VulnerabilityMatch[]>();
    for (const { name, fp, source } of fingerprints) {
      const vulns = this.detectVulnerabilities(fp, source || null);
      if (vulns.length > 0) results.set(name, vulns);
    }
    return results;
  }

  buildCloneGroups(fingerprints: Array<{ name: string; fp: ASTFingerprint }>, threshold = 0.7): Array<{ hash: string; members: string[]; similarity: number }> {
    const groups = new Map<string, { members: Set<string>; totalSim: number; count: number }>();

    for (let i = 0; i < fingerprints.length; i++) {
      for (let j = i + 1; j < fingerprints.length; j++) {
        const { similarity } = compareFingerprints(fingerprints[i].fp, fingerprints[j].fp);
        if (similarity >= threshold) {
          const hash = fingerprints[i].fp.structuralHash + '|' + fingerprints[j].fp.structuralHash;
          const sorted = [fingerprints[i].name, fingerprints[j].name].sort().join('|');
          if (!groups.has(sorted)) {
            groups.set(sorted, { members: new Set([fingerprints[i].name, fingerprints[j].name]), totalSim: similarity, count: 1 });
          }
        }
      }
    }

    return Array.from(groups.entries()).map(([key, val]) => ({
      hash: key,
      members: Array.from(val.members),
      similarity: val.totalSim / val.count,
    }));
  }

  generateReport(fingerprints: Array<{ name: string; fp: ASTFingerprint; source?: string }>): AnalysisReport {
    this.ensureWarm();

    const clones: CloneMatch[] = [];
    for (let i = 0; i < fingerprints.length; i++) {
      for (let j = i + 1; j < fingerprints.length; j++) {
        const result = compareFingerprints(fingerprints[i].fp, fingerprints[j].fp);
        if (result.similarity >= 0.5) {
          clones.push({
            sourceFingerprint: fingerprints[i].fp,
            targetFingerprint: fingerprints[j].fp,
            ...result,
            classification: result.structuralMatch ? 'identical' : result.similarity >= 0.85 ? 'near-clone' : result.similarity >= 0.65 ? 'type-3' : 'type-4',
          });
        }
      }
    }

    const allVulns: VulnerabilityMatch[] = [];
    const vulnFunctionNames = new Set<string>();
    const zeroDayFunctionNames = new Set<string>();
    const vulnClasses = new Set<VulnerabilityClass>();

    for (const { name, fp, source } of fingerprints) {
      const vulns = this.detectVulnerabilities(fp, source || null);
      for (const v of vulns) {
        allVulns.push(v);
        vulnFunctionNames.add(name);
        if (v.isZeroDay) zeroDayFunctionNames.add(name);
        vulnClasses.add(v.matchedPattern.class);
      }
    }

    const cloneGroups = this.buildCloneGroups(fingerprints);

    return {
      fingerprints: fingerprints.map(f => ({ name: f.name, fp: f.fp })),
      clones,
      vulnerabilities: allVulns,
      cloneGroups,
      summary: {
        totalFunctions: fingerprints.length,
        vulnerableFunctions: vulnFunctionNames.size,
        zeroDayFunctions: zeroDayFunctionNames.size,
        uniqueVulnerabilityClasses: Array.from(vulnClasses),
        cloneGroupsFound: cloneGroups.length,
      },
    };
  }
}

export { VULNERABILITY_PATTERNS, classifyVulnerability, deepMatchPattern } from './vulnerability-patterns.js';
export { warmReferencePatterns } from './reference-samples.js';
export type { VulnerabilityPattern, VulnerabilityClass, DeepMatchResult } from './vulnerability-patterns.js';
