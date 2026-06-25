export type BackendLanguage = 'javascript' | 'typescript' | 'python' | 'go' | 'rust' | 'java' | 'unknown';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'ALL' | 'USE';

export type FrontendFramework = 'react' | 'nextjs' | 'vue' | 'angular' | 'svelte' | 'unknown';

export interface APICallParameter {
  name: string;
  type: string | null;
  source: 'literal' | 'variable' | 'template' | 'expression';
  taintProvenance: string | null;
}

export interface APICallPayload {
  bodyShape: Record<string, { type: string; tainted: boolean; source: string | null }> | null;
  queryParams: APICallParameter[];
  pathParams: APICallParameter[];
  headers: Record<string, string>;
}

export interface FrontendAPICall {
  id: string;
  method: HTTPMethod;
  route: string;
  routeTemplate: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  calleeName: string;
  payload: APICallPayload;
  responseHandler: {
    type: 'json' | 'text' | 'blob' | 'none' | 'unknown';
    thenChain: string[];
    variableAssignment: string | null;
  };
  enclosingFunction: string | null;
  taintSources: string[];
  framework: FrontendFramework;
}

export interface RouteHandler {
  handlerName: string | null;
  handlerBody: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  parameterNames: string[];
  bodyReferences: string[];
  queryReferences: string[];
  paramReferences: string[];
  dbQueries: string[];
  sinkCalls: string[];
  middleware: string[];
  hasAuthCheck: boolean;
}

export interface BackendRoute {
  id: string;
  method: HTTPMethod;
  path: string;
  pathTemplate: string;
  framework: string;
  language: BackendLanguage;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  handler: RouteHandler;
  paramPatterns: string[];
}

export type MatchConfidence = 'exact' | 'template' | 'fuzzy' | 'none';

export interface BoundaryMatch {
  id: string;
  frontendCall: FrontendAPICall;
  backendRoute: BackendRoute;
  matchConfidence: MatchConfidence;
  matchScore: number;
  paramMapping: Map<string, string>;
  bodyFieldMapping: Map<string, string>;
  typeMismatches: TypeMismatch[];
}

export interface TypeMismatch {
  field: string;
  frontendType: string;
  backendType: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
}

export interface BoundaryTaintPath {
  id: string;
  boundaryMatch: BoundaryMatch;
  frontendSource: string;
  frontendSourceLine: number;
  frontendSourceFile: string;
  boundaryVariable: string;
  backendVariable: string;
  backendSink: string;
  backendSinkLine: number;
  backendSinkFile: string;
  pathChain: string[];
  sanitized: boolean;
  sanitizerLocation: string | null;
  implicitFlow: boolean;
  confidence: number;
}

export interface StructuralIntegrityIssue {
  id: string;
  type: 'field_mismatch' | 'type_mismatch' | 'missing_field' | 'extra_field' | 'auth_gap' | 'validation_gap';
  severity: 'critical' | 'high' | 'medium' | 'low';
  boundaryMatch: BoundaryMatch;
  description: string;
  frontendLocation: { file: string; line: number; code: string } | null;
  backendLocation: { file: string; line: number; code: string } | null;
  fixPrompt: string;
  confidence: number;
}

export interface CrossLanguageTaintResult {
  frontendCalls: FrontendAPICall[];
  backendRoutes: BackendRoute[];
  boundaryMatches: BoundaryMatch[];
  taintPaths: BoundaryTaintPath[];
  structuralIssues: StructuralIntegrityIssue[];
  stats: {
    totalFrontendCalls: number;
    totalBackendRoutes: number;
    matchedBoundaries: number;
    unmatchedFrontendCalls: number;
    unmatchedBackendRoutes: number;
    crossBoundaryTaintPaths: number;
    sanitizedPaths: number;
    structuralIssues: number;
    integrityScore: number;
  };
}
