import { detectFrontendAPICalls } from './frontend-call-detector.js';
import { detectBackendRoutes } from './backend-route-detector.js';
import { matchBoundaries } from './boundary-matcher.js';
import { trackBoundaryTaint } from './cross-boundary-taint.js';
import { analyzeStructuralIntegrity } from './structural-integrity.js';
import type { CrossLanguageTaintResult, FrontendAPICall, BackendRoute } from './types-clt.js';

export * from './types-clt.js';
export { detectFrontendAPICalls } from './frontend-call-detector.js';
export { detectBackendRoutes } from './backend-route-detector.js';
export { matchBoundaries } from './boundary-matcher.js';
export { trackBoundaryTaint } from './cross-boundary-taint.js';
export { analyzeStructuralIntegrity } from './structural-integrity.js';

function classifyFiles(files: Array<{ path: string; content: string }>): {
  frontendFiles: Array<{ path: string; content: string }>;
  backendFiles: Array<{ path: string; content: string }>;
} {
  const frontendFiles: Array<{ path: string; content: string }> = [];
  const backendFiles: Array<{ path: string; content: string }> = [];

  const backendSignals = [
    'express', 'router.get', 'router.post', 'router.put', 'router.patch', 'router.delete',
    'app.get', 'app.post', 'app.put', 'app.patch', 'app.delete',
    '@app.route', 'fastify', 'flask', 'django', 'gin', 'echo',
    'requireAuth', 'authenticate', 'middleware',
    'req.body', 'req.params', 'req.query',
    'db.select', 'db.insert', 'db.update', 'db.delete',
    'prisma.', 'drizzle', 'typeorm', 'knex',
  ];

  const frontendSignals = [
    'react', 'useState', 'useEffect', 'jsx', 'jsx', 'tsx', 'vue', 'angular',
    'fetch(', 'axios.', 'useQuery', 'useMutation', 'react-query', 'swr',
  ];

  for (const file of files) {
    const lowerPath = file.path.toLowerCase();
    const lowerContent = file.content.toLowerCase();

    if (lowerPath.includes('node_modules') || lowerPath.includes('dist') || lowerPath.includes('.next')) continue;

    let backendScore = 0;
    let frontendScore = 0;

    for (const sig of backendSignals) {
      if (lowerContent.includes(sig.toLowerCase())) backendScore++;
    }
    for (const sig of frontendSignals) {
      if (lowerContent.includes(sig.toLowerCase())) frontendScore++;
    }

    const ext = lowerPath.split('.').pop();
    if (ext === 'py' || ext === 'go' || ext === 'rs' || ext === 'java') {
      backendScore += 3;
    }

    if (lowerPath.includes('route') || lowerPath.includes('controller') || lowerPath.includes('api/')) {
      backendScore += 2;
    }
    if (lowerPath.includes('component') || lowerPath.includes('page') || lowerPath.includes('view')) {
      frontendScore += 2;
    }
    if (lowerPath.includes('server') || lowerPath.includes('backend')) {
      backendScore += 2;
    }

    if (backendScore > frontendScore) {
      backendFiles.push(file);
    } else if (frontendScore > backendScore) {
      frontendFiles.push(file);
    } else if (backendScore > 0) {
      backendFiles.push(file);
    } else if (frontendScore > 0) {
      frontendFiles.push(file);
    }
  }

  return { frontendFiles, backendFiles };
}

export interface CrossLanguageTaintReport {
  result: CrossLanguageTaintResult;
  summary: string;
  metadata: {
    totalFiles: number;
    frontendFiles: number;
    backendFiles: number;
    analysisTimeMs: number;
  };
}

export function runCrossLanguageTaintAnalysis(
  files: Array<{ path: string; content: string }>,
): CrossLanguageTaintReport {
  const startTime = Date.now();

  const { frontendFiles, backendFiles } = classifyFiles(files);

  const frontendCalls: FrontendAPICall[] = frontendFiles.length > 0
    ? detectFrontendAPICalls(frontendFiles)
    : [];

  const backendRoutes: BackendRoute[] = backendFiles.length > 0
    ? detectBackendRoutes(backendFiles)
    : [];

  const boundaryMatches = matchBoundaries(frontendCalls, backendRoutes);

  const taintPaths = trackBoundaryTaint(boundaryMatches);

  const structuralIssues = analyzeStructuralIntegrity(boundaryMatches);

  const unmatchedFrontend = frontendCalls.length - new Set(boundaryMatches.map(m => m.frontendCall.id)).size;
  const unmatchedBackend = backendRoutes.length - new Set(boundaryMatches.map(m => m.backendRoute.id)).size;

  const sanitizedPaths = taintPaths.filter(p => p.sanitized).length;
  const integrityScore = structuralIssues.length === 0 ? 100
    : Math.max(0, 100 - structuralIssues.reduce((acc, i) => {
        switch (i.severity) {
          case 'critical': return acc + 15;
          case 'high': return acc + 8;
          case 'medium': return acc + 4;
          case 'low': return acc + 2;
          default: return acc;
        }
      }, 0));

  const result: CrossLanguageTaintResult = {
    frontendCalls,
    backendRoutes,
    boundaryMatches,
    taintPaths,
    structuralIssues,
    stats: {
      totalFrontendCalls: frontendCalls.length,
      totalBackendRoutes: backendRoutes.length,
      matchedBoundaries: boundaryMatches.length,
      unmatchedFrontendCalls: unmatchedFrontend,
      unmatchedBackendRoutes: unmatchedBackend,
      crossBoundaryTaintPaths: taintPaths.filter(p => !p.sanitized).length,
      sanitizedPaths,
      structuralIssues: structuralIssues.length,
      integrityScore,
    },
  };

  const summary = buildSummary(result);

  return {
    result,
    summary,
    metadata: {
      totalFiles: files.length,
      frontendFiles: frontendFiles.length,
      backendFiles: backendFiles.length,
      analysisTimeMs: Date.now() - startTime,
    },
  };
}

function buildSummary(result: CrossLanguageTaintResult): string {
  const parts: string[] = [];
  const s = result.stats;

  parts.push(`Cross-Language Taint Analysis: ${s.matchedBoundaries} boundaries mapped`);
  if (s.crossBoundaryTaintPaths > 0) {
    parts.push(`${s.crossBoundaryTaintPaths} active taint paths crossing service boundary`);
  }
  if (s.sanitizedPaths > 0) {
    parts.push(`${s.sanitizedPaths} sanitized paths (validation gates active)`);
  }
  if (s.structuralIssues > 0) {
    parts.push(`${s.structuralIssues} structural integrity issues (score: ${s.integrityScore}/100)`);
  }
  if (s.unmatchedFrontendCalls > 0) {
    parts.push(`${s.unmatchedFrontendCalls} unmatched frontend API calls`);
  }
  if (s.unmatchedBackendRoutes > 0) {
    parts.push(`${s.unmatchedBackendRoutes} unmatched backend routes`);
  }

  return parts.join('. ') + '.';
}
