import * as traverse from '@babel/traverse';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, basename } from 'node:path';
import type { ParseResult, CSGGraph } from '../types.js';
import type { RealityFinding, RealityCheckReport, MockupDetectionMethod, MockupSeverity } from '../types.js';
import { createHash } from 'node:crypto';

/* ════════════════════════════════════════════════════════════════
   RealityCheck — Multi-Mechanism Mockup & Hardcoded Detection
   ════════════════════════════════════════════════════════════════
   Detection mechanisms:
   1. AST: variable decls with large inline arrays/objects (hardcoded mock data)
   2. Regex: known mock patterns (jsonplaceholder, dummyjson, etc.)
   3. Entropy: high-entropy strings that look like hardcoded secrets/tokens
   4. Imports: mock/test libraries (msw, nock, sinon, jest.mock)
   5. Comments: TODO/fixme/mock/stub markers
   6. Stub detection: functions returning fixed values with no real logic
   7. Placeholder endpoints: /api/mock, /api/dummy, etc.
   8. Fake auth: hardcoded JWT-like strings, fake tokens
   ════════════════════════════════════════════════════════════════ */

const MOCK_IMPORT_PATTERNS = [
  { regex: /msw|mock-service-worker/, severity: 'medium' as MockupSeverity, category: 'stub-function' as const },
  { regex: /nock/, severity: 'medium' as MockupSeverity, category: 'stub-function' as const },
  { regex: /sinon/, severity: 'low' as MockupSeverity, category: 'stub-function' as const },
  { regex: /jest\.mock|vi\.mock/, severity: 'medium' as MockupSeverity, category: 'stub-function' as const },
  { regex: /faker|@faker-js/, severity: 'low' as MockupSeverity, category: 'mock-data' as const },
  { regex: /json-server/, severity: 'high' as MockupSeverity, category: 'fake-endpoint' as const },
  { regex: /pretender|pretenderjs/, severity: 'medium' as MockupSeverity, category: 'stub-function' as const },
  { regex: /mockdate|timekeeper|lolex/, severity: 'low' as MockupSeverity, category: 'stub-function' as const },
];

const MOCK_ENDPOINT_PATTERNS = [
  { regex: /jsonplaceholder\.typicode\.com/i, severity: 'critical' as MockupSeverity, category: 'fake-endpoint' as const },
  { regex: /dummyjson\.com/i, severity: 'critical' as MockupSeverity, category: 'fake-endpoint' as const },
  { regex: /reqres\.in/i, severity: 'critical' as MockupSeverity, category: 'fake-endpoint' as const },
  { regex: /mockapi\.io/i, severity: 'high' as MockupSeverity, category: 'fake-endpoint' as const },
  { regex: /api\.example\.com/i, severity: 'high' as MockupSeverity, category: 'fake-endpoint' as const },
  { regex: /\/api\/mock/, severity: 'high' as MockupSeverity, category: 'fake-endpoint' as const },
  { regex: /\/api\/dummy/, severity: 'high' as MockupSeverity, category: 'fake-endpoint' as const },
  { regex: /\/api\/v1\/mock/, severity: 'high' as MockupSeverity, category: 'fake-endpoint' as const },
  { regex: /localhost:\d+\/mock/, severity: 'medium' as MockupSeverity, category: 'fake-endpoint' as const },
];

const HARDCODED_DATA_PATTERNS = [
  { regex: /const\s+\w+\s*=\s*\[\s*\{\s*id\s*:\s*\d+\s*,/i, severity: 'high' as MockupSeverity, desc: 'Inline hardcoded array of objects (mock data)' },
  { regex: /const\s+\w+\s*=\s*\[\s*['"][a-z]+['"]\s*,\s*['"]/i, severity: 'medium' as MockupSeverity, desc: 'Hardcoded string array (mock list)' },
  { regex: /let\s+\w+\s*=\s*\[\s*\{\s*id\s*:/i, severity: 'high' as MockupSeverity, desc: 'Mutable hardcoded object array' },
  { regex: /\.map\(.*=>\s*\(\s*\{[^}]*id\s*:[^,]+,\s*name/i, severity: 'medium' as MockupSeverity, desc: 'Inline mapped mock objects in JSX' },
];

const FAKE_AUTH_PATTERNS = [
  { regex: /Bearer\s+eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+/, severity: 'critical' as MockupSeverity, desc: 'Hardcoded JWT token' },
  { regex: /['"][A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}['"]/, severity: 'critical' as MockupSeverity, desc: 'Hardcoded JWT-like token string' },
  { regex: /sk_test_|sk_live_|pk_test_|pk_live_/, severity: 'critical' as MockupSeverity, desc: 'Hardcoded Stripe API key' },
  { regex: /ghp_[A-Za-z0-9]{36}|github_pat_/, severity: 'critical' as MockupSeverity, desc: 'Hardcoded GitHub token' },
  { regex: /AIza[A-Za-z0-9_-]{35}/, severity: 'critical' as MockupSeverity, desc: 'Hardcoded Google API key' },
  { regex: /AKIA[A-Z0-9]{16}/, severity: 'critical' as MockupSeverity, desc: 'Hardcoded AWS access key' },
];

const STUB_FUNCTION_PATTERNS = [
  { regex: /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+['"][^'"]+['"]\s*;?\s*\}/i, severity: 'medium' as MockupSeverity, desc: 'Stub function returning hardcoded string' },
  { regex: /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+null\s*;?\s*\}/i, severity: 'medium' as MockupSeverity, desc: 'Stub function returning null' },
  { regex: /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+\{\}\s*;?\s*\}/i, severity: 'medium' as MockupSeverity, desc: 'Stub function returning empty object' },
  { regex: /function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+\[\]\s*;?\s*\}/i, severity: 'medium' as MockupSeverity, desc: 'Stub function returning empty array' },
  { regex: /=>\s*['"][^'"]+['"]/, severity: 'low' as MockupSeverity, desc: 'Arrow function returning hardcoded string' },
  { regex: /=>\s*\(\s*\{\s*[^}]*\.\.\.\s*[^}]*\}\s*\)/, severity: 'low' as MockupSeverity, desc: 'Spread-only stub in arrow function' },
];

const COMMENT_INDICATORS = [
  { regex: /TODO:\s*replace\s+(with\s+)?real/i, severity: 'high' as MockupSeverity, desc: 'TODO: replace with real implementation' },
  { regex: /FIXME:\s*remove\s+mock/i, severity: 'high' as MockupSeverity, desc: 'FIXME: remove mock data' },
  { regex: /HACK:\s*mock/i, severity: 'medium' as MockupSeverity, desc: 'HACK: mock workaround' },
  { regex: /\/\/\s*mock\s+data/i, severity: 'medium' as MockupSeverity, desc: 'Comment indicating mock data' },
  { regex: /\/\/\s*dummy/i, severity: 'low' as MockupSeverity, desc: 'Comment indicating dummy data' },
  { regex: /\/\/\s*stub/i, severity: 'low' as MockupSeverity, desc: 'Comment indicating stub' },
  { regex: /\/\/\s*placeholder/i, severity: 'low' as MockupSeverity, desc: 'Comment indicating placeholder' },
  { regex: /\/\/\s*fake/i, severity: 'medium' as MockupSeverity, desc: 'Comment indicating fake data' },
  { regex: /XXX:\s*mock/i, severity: 'high' as MockupSeverity, desc: 'XXX: mock marker' },
];

export class RealityCheck {
  private findings: RealityFinding[] = [];
  private filesScanned: string[] = [];

  scanDirectory(dirPath: string, sourceFiles: string[] = []): void {
    this.findings = [];
    this.filesScanned = [];

    const targetFiles = sourceFiles.length > 0 ? sourceFiles : this.walkDir(dirPath);
    for (const f of targetFiles) this.scanFile(f, dirPath);
  }

  scanParsed(parsed: ParseResult[], graph: CSGGraph): void {
    this.findings = [];

    const defaultTraverse = (traverse.default || traverse) as typeof traverse.default;

    for (const p of parsed) {
      this.filesScanned.push(p.file);
      this.detectAstHardcodedData(p, defaultTraverse);
      this.detectMockImports(p, defaultTraverse);
      this.detectStubFunctions(p, defaultTraverse);
    }
  }

  report(): RealityCheckReport {
    const mockDataCount = this.findings.filter(f => f.category === 'mock-data').length;
    const fakeEndpointCount = this.findings.filter(f => f.category === 'fake-endpoint').length;
    const stubFunctionCount = this.findings.filter(f => f.category === 'stub-function').length;
    const dummyAuthCount = this.findings.filter(f => f.category === 'dummy-auth').length;
    const hardcodedEnvCount = this.findings.filter(f => f.category === 'hardcoded-env').length;
    const total = this.findings.length;

    const weighted = this.findings.reduce((acc, f) => {
      const w = f.severity === 'critical' ? 15 : f.severity === 'high' ? 8 : f.severity === 'medium' ? 4 : 1;
      return acc + w;
    }, 0);
    const score = total === 0 ? 100 : Math.round(100 * Math.exp(-weighted / 200));

    const top = this.findings.sort((a, b) => {
      const sev = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return (sev[b.severity] || 0) - (sev[a.severity] || 0);
    });

    const narrative = this.buildNarrative(score, top);
    const recommendations = this.buildRecommendations(top);

    const report: RealityCheckReport = {
      findings: this.findings, totalFilesScanned: this.filesScanned.length,
      mockDataCount, fakeEndpointCount, stubFunctionCount, dummyAuthCount, hardcodedEnvCount,
      score, productRealityNarrative: narrative, topRecommendations: recommendations,
    };

    return report;
  }

  /* ─── Private: Detection Mechanisms ─── */

  private scanFile(filePath: string, rootDir: string): void {
    if (!existsSync(filePath)) return;
    this.filesScanned.push(filePath);
    const ext = extname(filePath).toLowerCase();
    const isSource = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts'].includes(ext);
    const isConfig = ['.json', '.yaml', '.yml', '.env'].includes(ext);
    const isMarkup = ['.html', '.htm'].includes(ext);

    if (!isSource && !isConfig && !isMarkup) return;

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    this.detectRegexPatterns(content, lines, filePath);
    this.detectEntropyAnomalies(content, lines, filePath);

    if (isSource) {
      this.detectHardcodedDataInCode(content, lines, filePath);
      this.detectStubPatterns(content, lines, filePath);
      this.detectCommentIndicators(content, lines, filePath);
    }
    if (isConfig) {
      this.detectConfigMockPatterns(content, lines, filePath);
    }
  }

  private detectRegexPatterns(content: string, lines: string[], file: string): void {
    const allPatterns = [
      ...MOCK_ENDPOINT_PATTERNS.map(p => ({ ...p, method: 'placeholder-endpoint' as MockupDetectionMethod })),
      ...FAKE_AUTH_PATTERNS.map(p => ({ ...p, method: 'fake-auth-token' as MockupDetectionMethod })),
    ];
    for (const p of allPatterns) {
      const match = p.regex.exec(content);
      if (match) {
        const lineNum = this.findLineForMatch(content, match[0]);
        const snippet = lines[lineNum - 1]?.trim().slice(0, 200) || match[0].slice(0, 100);
        this.addFinding({
          method: p.method, severity: p.severity,
          category: p.method === 'fake-auth-token' ? 'dummy-auth' : 'fake-endpoint',
          file, line: lineNum, column: content.indexOf(match[0]),
          snippet, pattern: match[0].slice(0, 80),
          fixPrompt: this.generateFixPrompt(p.method, match[0]),
          confidence: 0.9, context: snippet,
        });
      }
    }
  }

  private detectEntropyAnomalies(content: string, lines: string[], file: string): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const strMatches = line.match(/['"]([^'"]{20,})['"]/g);
      if (!strMatches) continue;

      for (const sm of strMatches) {
        const str = sm.slice(1, -1);
        const entropy = this.shannonEntropy(str);
        if (entropy > 5.5 && /[A-Z]/.test(str) && /\d/.test(str)) {
          const isLikelyToken = /[_.\-]{2,}/.test(str) || str.length > 30;
          if (!isLikelyToken) continue;

          this.addFinding({
            method: 'entropy-high-string', severity: 'high',
            category: 'hardcoded-env',
            file, line: i + 1, column: line.indexOf(sm),
            snippet: line.trim().slice(0, 200),
            pattern: `${str.slice(0, 12)}... (entropy: ${entropy.toFixed(1)})`,
            fixPrompt: `Move this high-entropy string (potential secret/token) to environment variables or a secrets manager.\n\nReplace:\n  ${sm}\n\nWith:\n  process.env.${this.toEnvVarName(str)}`,
            confidence: Math.min(0.95, entropy / 8),
            context: line.trim().slice(0, 200),
          });
        }
      }
    }
  }

  private detectHardcodedDataInCode(content: string, lines: string[], file: string): void {
    for (const p of HARDCODED_DATA_PATTERNS) {
      const match = p.regex.exec(content);
      if (match) {
        const lineNum = this.findLineForMatch(content, match[0]);
        this.addFinding({
          method: 'ast-hardcoded-data', severity: p.severity,
          category: 'mock-data',
          file, line: lineNum, column: content.indexOf(match[0]),
          snippet: lines[lineNum - 1]?.trim().slice(0, 200) || '',
          pattern: p.desc,
          fixPrompt: `Replace hardcoded inline data with a real API call or database query.\n\n1. Create a proper data fetching function\n2. Connect to your actual data source\n3. Remove the inline mock array/object\n4. Handle loading and error states`,
          confidence: 0.85, context: lines.slice(Math.max(0, lineNum - 2), lineNum + 2).join('\n'),
        });
      }
    }
    const largeArrays = content.match(/(const|let|var)\s+(\w+)\s*=\s*\[\s*\n\s*\{[^}]*\}\s*\n\s*(?:\{[^}]*\}\s*\n\s*){2,}/g);
    if (largeArrays) {
      for (const arr of largeArrays) {
        const lineNum = this.findLineForMatch(content, arr.split('\n')[0]);
        const objCount = (arr.match(/\{/g) || []).length;
        this.addFinding({
          method: 'ast-hardcoded-data', severity: objCount > 10 ? 'critical' : 'high',
          category: 'mock-data',
          file, line: lineNum, column: 0,
          snippet: arr.slice(0, 200).trim(),
          pattern: `Large hardcoded array with ~${objCount} objects`,
          fixPrompt: `Extract this large hardcoded dataset (${objCount} records) to a real data source:\n1. Move to a database table\n2. Create an API endpoint\n3. Fetch at runtime\n4. Remove the inline data`,
          confidence: 0.9, context: arr.slice(0, 300),
        });
      }
    }
  }

  private detectMockImports(p: ParseResult, traverse: any): void {
    traverse(p.ast, {
      ImportDeclaration: (path: any) => {
        const source = path.node.source.value;
        for (const pat of MOCK_IMPORT_PATTERNS) {
          if (pat.regex.test(source)) {
            const loc = path.node.loc;
            this.addFinding({
              method: 'import-mock-library', severity: pat.severity,
              category: pat.category,
              file: p.file, line: loc?.start?.line || 0, column: 0,
              snippet: `import ... from '${source}'`,
              pattern: `Mock/test library import: ${source}`,
              fixPrompt: `Replace '${source}' mock library with real implementation:\n1. Remove the mock library dependency\n2. Use actual API/Database integration\n3. If for testing, ensure mocks don't leak to production`,
              confidence: 0.95, context: source,
            });
          }
        }
      },
      CallExpression: (path: any) => {
        const code = this.nodeToCode(path.node);
        if (/jest\.mock\(|vi\.mock\(/.test(code)) {
          const loc = path.node.loc;
          this.addFinding({
            method: 'import-mock-library', severity: 'medium',
            category: 'stub-function',
            file: p.file, line: loc?.start?.line || 0, column: 0,
            snippet: code.slice(0, 150),
            pattern: 'jest.mock / vi.mock call',
            fixPrompt: `Review this mock — ensure it's only active in test environments:\n\nif (process.env.NODE_ENV === 'test') {\n  ${code}\n}`,
            confidence: 0.9, context: code.slice(0, 200),
          });
        }
      },
    });
  }

  private detectStubFunctions(p: ParseResult, traverse: any): void {
    traverse(p.ast, {
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression': (path: any) => {
        const node = path.node;
        const body = node.body;
        if (!body || !body.body) return;

        const stmts = body.body || [];
        if (stmts.length !== 1) return;
        const only = stmts[0];
        const code = this.nodeToCode(only);

        const isStubReturn = /return\s+['"][^'"]{0,20}['"]\s*;?\s*$/.test(code)
          || /return\s+null\s*;?\s*$/.test(code)
          || /return\s+\{\}\s*;?\s*$/.test(code)
          || /return\s+\[\]\s*;?\s*$/.test(code)
          || /return\s+0\s*;?\s*$/.test(code)
          || /return\s+true\s*;?\s*$/.test(code)
          || /return\s+false\s*;?\s*$/.test(code)
          || /throw\s+new\s+Error\(['"]Not implemented/i.test(code);

        if (isStubReturn) {
          const fnName = this.getFnName(node, path);
          const loc = node.loc;
          this.addFinding({
            method: 'stub-function', severity: 'medium',
            category: 'stub-function',
            file: p.file, line: loc?.start?.line || 0, column: 0,
            snippet: code.slice(0, 150),
            pattern: `Stub function "${fnName}" returns hardcoded value`,
            fixPrompt: `Implement "${fnName}" with real logic:\n1. Add proper parameters and validation\n2. Implement the actual business logic\n3. Connect to real data sources\n4. Add error handling`,
            confidence: 0.8, context: this.nodeToCode(node).slice(0, 300),
          });
        }
      },
    });
  }

  private detectCommentIndicators(content: string, lines: string[], file: string): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) continue;

      for (const p of COMMENT_INDICATORS) {
        const match = p.regex.exec(trimmed);
        if (match) {
          this.addFinding({
            method: 'comment-indicator', severity: p.severity,
            category: 'placeholder-ui',
            file, line: i + 1, column: line.indexOf(trimmed),
            snippet: trimmed.slice(0, 150),
            pattern: p.desc,
            fixPrompt: `Address this TODO/FIXME: "${trimmed}"\n\n1. Implement the real solution\n2. Remove the comment marker\n3. Verify the implementation works correctly`,
            confidence: 0.85, context: lines.slice(Math.max(0, i - 1), i + 2).join('\n'),
          });
          break;
        }
      }
    }
  }

  private detectStubPatterns(content: string, lines: string[], file: string): void {
    for (const p of STUB_FUNCTION_PATTERNS) {
      const match = p.regex.exec(content);
      if (match) {
        const lineNum = this.findLineForMatch(content, match[0]);
        this.addFinding({
          method: 'stub-function', severity: p.severity,
          category: 'stub-function',
          file, line: lineNum, column: content.indexOf(match[0]),
          snippet: match[0].slice(0, 200),
          pattern: p.desc,
          fixPrompt: `Replace this stub with real logic:\n\n${match[0].slice(0, 150)}\n\n1. Add proper implementation\n2. Handle edge cases\n3. Add type safety\n4. Remove if no longer needed`,
          confidence: 0.8, context: lines.slice(Math.max(0, lineNum - 1), lineNum + 2).join('\n'),
        });
      }
    }
  }

  private detectConfigMockPatterns(content: string, lines: string[], file: string): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/mock|dummy|fake|stub|placeholder/i.test(line) && !line.trimStart().startsWith('#')) {
        this.addFinding({
          method: 'regex-mock-pattern', severity: 'low',
          category: 'placeholder-ui',
          file, line: i + 1, column: 0,
          snippet: line.trim().slice(0, 150),
          pattern: 'Mock/dummy reference in config file',
          fixPrompt: `Remove or replace mock/dummy config values with real production values.`,
          confidence: 0.6, context: line.trim(),
        });
      }
    }
  }

  private detectAstHardcodedData(p: ParseResult, traverse: any): void {
    traverse(p.ast, {
      VariableDeclarator: (path: any) => {
        const node = path.node;
        const init = node.init;
        if (!init) return;

        if (init.type === 'ArrayExpression' && init.elements.length > 3) {
          const hasObjects = init.elements.some((e: any) => e?.type === 'ObjectExpression');
          if (hasObjects) {
            const objCount = init.elements.filter((e: any) => e?.type === 'ObjectExpression').length;
            const loc = node.loc;
            this.addFinding({
              method: 'ast-hardcoded-data',
              severity: objCount > 5 ? 'critical' : objCount > 2 ? 'high' : 'medium',
              category: 'mock-data',
              file: p.file, line: loc?.start?.line || 0, column: 0,
              snippet: this.nodeToCode(node).slice(0, 200),
              pattern: `Hardcoded array with ${objCount} inline objects (mock data)`,
              fixPrompt: `Replace this hardcoded mock data array with a real API fetch:\n\n// Instead of:\nconst ${node.id?.name || 'data'} = [...${objCount} objects]\n\n// Do:\nconst ${node.id?.name || 'data'} = await fetchData('/api/real-endpoint');`,
              confidence: 0.9, context: this.nodeToCode(node).slice(0, 300),
            });
          }
        }
        if (init.type === 'ObjectExpression' && init.properties.length > 5) {
          const loc = node.loc;
          this.addFinding({
            method: 'ast-hardcoded-data', severity: 'medium',
            category: 'mock-data',
            file: p.file, line: loc?.start?.line || 0, column: 0,
            snippet: this.nodeToCode(node).slice(0, 200),
            pattern: `Large hardcoded object with ${init.properties.length} properties`,
            fixPrompt: `Consider fetching this object from an API or database instead of hardcoding.`,
            confidence: 0.7, context: this.nodeToCode(node).slice(0, 300),
          });
        }
        if (init.type === 'TemplateLiteral' && this.nodeToCode(init).length > 200) {
          const loc = node.loc;
          this.addFinding({
            method: 'ast-hardcoded-data', severity: 'low',
            category: 'placeholder-ui',
            file: p.file, line: loc?.start?.line || 0, column: 0,
            snippet: this.nodeToCode(node).slice(0, 200),
            pattern: 'Large hardcoded template literal (possibly mock HTML/content)',
            fixPrompt: `Move this large static template to a separate template file or make it dynamic.`,
            confidence: 0.6, context: this.nodeToCode(node).slice(0, 300),
          });
        }
      },
    });
  }

  /* ─── Helpers ─── */

  private addFinding(f: Omit<RealityFinding, 'id'>): void {
    const hash = createHash('md5').update(`${f.file}:${f.line}:${f.pattern}`).digest('hex').slice(0, 8);
    this.findings.push({ ...f, id: `RC-${hash}` });
  }

  private shannonEntropy(s: string): number {
    const freq: Record<string, number> = {};
    for (const c of s) freq[c] = (freq[c] || 0) + 1;
    let entropy = 0;
    for (const c in freq) {
      const p = freq[c] / s.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  private toEnvVarName(s: string): string {
    const cleaned = s.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    return cleaned.slice(0, 40);
  }

  private getFnName(node: any, path: any): string {
    if (node.id?.name) return node.id.name;
    const parent = path.parentPath?.node;
    if (parent?.type === 'VariableDeclarator' && parent.id?.name) return parent.id.name;
    if (parent?.type === 'AssignmentExpression' && parent.left?.property?.name) return parent.left.property.name;
    return `anonymous_${node.loc?.start?.line || 0}`;
  }

  private nodeToCode(node: any): string {
    if (!node) return '';
    try {
      const { default: generate } = require('@babel/generator');
      return generate(node).code;
    } catch { return ''; }
  }

  private findLineForMatch(content: string, matchText: string): number {
    const idx = content.indexOf(matchText);
    if (idx === -1) return 1;
    return content.slice(0, idx).split('\n').length;
  }

  private walkDir(dirPath: string): string[] {
    const files: string[] = [];
    try {
      const entries = readdirSync(dirPath);
      for (const e of entries) {
        const full = join(dirPath, e);
        try {
          const s = statSync(full);
          if (s.isDirectory() && !e.startsWith('.') && e !== 'node_modules' && e !== 'dist') files.push(...this.walkDir(full));
          else if (s.isFile()) files.push(full);
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
    return files;
  }

  private generateFixPrompt(method: MockupDetectionMethod, match: string): string {
    switch (method) {
      case 'placeholder-endpoint':
        return `Replace mock API endpoint with production URL.\n\nInstead of:\n  ${match.slice(0, 100)}\n\nUse your actual API base URL from environment:\n  \${process.env.API_BASE_URL}/api/real-endpoint`;
      case 'fake-auth-token':
        return `Remove hardcoded credential/API key.\n\nMove to environment variables:\n  ${match.slice(0, 100)}\n→ process.env.SECRET_KEY\n→ Never commit secrets to version control`;
      case 'entropy-high-string':
        return `Extract this high-entropy string to environment config.\n\n1. Add to .env file\n2. Reference via process.env\n3. Add to .gitignore if it's a secret`;
      default:
        return `Review this mock/hardcoded pattern and replace with a real implementation.\n\nFile impact: ${match.slice(0, 80)}`;
    }
  }

  private buildNarrative(score: number, top: RealityFinding[]): string {
    if (top.length === 0) {
      return 'Your codebase shows no detectable mockup, stub, or hardcoded patterns. It appears to be production-ready with real API integrations and data sources.';
    }

    const criticalCount = top.filter(f => f.severity === 'critical').length;
    const highCount = top.filter(f => f.severity === 'high').length;
    const categories = new Set(top.map(f => f.category));

    let narrative = '';
    if (score >= 80) {
      narrative = 'Your codebase is largely production-realistic. ';
    } else if (score >= 50) {
      narrative = 'Your codebase has a moderate amount of mockup/hardcoded patterns that need attention before production deployment. ';
    } else {
      narrative = '⚠️ Your codebase relies heavily on mockups, hardcoded data, and stubs. This significantly impacts production readiness. ';
    }

    if (criticalCount > 0) narrative += `${criticalCount} critical issue(s) found — including hardcoded credentials, fake API endpoints, or mock data in critical paths. `;
    if (highCount > 0) narrative += `${highCount} high-severity issues — stubs, placeholders, or TODO mock data in core logic. `;

    const desc: Record<string, string> = {
      'mock-data': 'inline mock data arrays',
      'fake-endpoint': 'placeholder/fake API endpoints',
      'stub-function': 'stub functions returning dummy values',
      'test-fixture': 'test fixtures in production code',
      'placeholder-ui': 'UI placeholders and TODO markers',
      'dummy-auth': 'hardcoded authentication tokens',
      'hardcoded-env': 'hardcoded environment configuration',
    };
    const catList = Array.from(categories).map(c => desc[c] || c).filter(Boolean);
    if (catList.length > 0) narrative += `Categories affected: ${catList.join(', ')}. `;

    narrative += `Product Reality Score: ${score}/100 — ${score >= 70 ? 'Ready for production' : score >= 40 ? 'Needs work before launch' : 'Requires significant refactoring before production deployment'}.`;

    return narrative;
  }

  private buildRecommendations(top: RealityFinding[]): string[] {
    const recs: string[] = [];
    const seen = new Set<string>();

    for (const f of top.slice(0, 20)) {
      const key = f.category;
      if (seen.has(key)) continue;
      seen.add(key);

      switch (f.category) {
        case 'fake-endpoint':
          recs.push(`Replace mock API endpoint in ${f.file}:${f.line} with production URL from env`);
          break;
        case 'mock-data':
          recs.push(`Replace hardcoded data array in ${f.file}:${f.line} with real API data fetch`);
          break;
        case 'stub-function':
          recs.push(`Implement ${f.pattern.replace('Stub function ', '')} with real business logic`);
          break;
        case 'dummy-auth':
          recs.push(`Remove hardcoded credential in ${f.file}:${f.line} — use environment variables`);
          break;
        case 'placeholder-ui':
          recs.push(`Address TODO/FIXME: ${f.snippet.slice(0, 80)}`);
          break;
        case 'hardcoded-env':
          recs.push(`Move hardcoded config in ${f.file}:${f.line} to .env`);
          break;
      }
    }

    if (recs.length === 0 && this.findings.length > 0) recs.push('Review all mock/hardcoded findings and replace with real implementations');

    return recs.slice(0, 8);
  }
}
