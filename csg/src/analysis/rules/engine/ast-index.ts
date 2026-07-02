import type { ParseResult } from '../../../types.js';

export interface SharedAstIndex {
  allStrings: string[];
  functionCalls: Map<string, { file: string; line: number; args: string[] }[]>;
  binaryConcats: { file: string; line: number; parts: string[] }[];
  templateLiterals: { file: string; line: number; quasis: string[]; expressions: string[] }[];
  memberExpressions: { file: string; line: number; object: string; property: string }[];
  userInputs: { file: string; line: number; name: string }[];
  imports: { file: string; line: number; source: string; name: string }[];
}

export function buildSharedAstIndex(parsed: ParseResult[]): SharedAstIndex {
  const index: SharedAstIndex = {
    allStrings: [],
    functionCalls: new Map(),
    binaryConcats: [],
    templateLiterals: [],
    memberExpressions: [],
    userInputs: [],
    imports: [],
  };

  for (const p of parsed) {
    const src = p.file || '';
    index.allStrings.push(src);

    // Fast regex-based pre-scan for common patterns
    const lines = src.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Detect function calls: foo( or foo (
      const callMatch = line.match(/(\w+)\s*\(/g);
      if (callMatch) {
        for (const m of callMatch) {
          const name = m.replace(/\s*\($/, '');
          const existing = index.functionCalls.get(name) || [];
          existing.push({ file: p.file, line: lineNum, args: [] });
          index.functionCalls.set(name, existing);
        }
      }

      // Detect template literals
      if (line.includes('`') && /\$\{/.test(line)) {
        index.templateLiterals.push({ file: p.file, line: lineNum, quasis: [], expressions: extractTemplateExprs(line) });
      }

      // Detect string concat with +
      if (/['"`]\s*\+/.test(line) || /\+\s*['"`]/.test(line)) {
        index.binaryConcats.push({ file: p.file, line: lineNum, parts: [] });
      }

      // Detect member expressions: obj.prop
      const memberMatch = line.match(/(\w+)\.(\w+)/g);
      if (memberMatch) {
        for (const m of memberMatch) {
          const [obj, prop] = m.split('.');
          index.memberExpressions.push({ file: p.file, line: lineNum, object: obj, property: prop });
        }
      }

      // Detect user input sources
      const userInputPatterns = ['req.body', 'req.query', 'req.params', 'req.headers', 'req.url', 'event.target.value', 'new URL(', 'location.search', 'location.hash', 'document.cookie', 'localStorage.getItem', 'sessionStorage.getItem'];
      for (const pat of userInputPatterns) {
        if (line.includes(pat)) {
          index.userInputs.push({ file: p.file, line: lineNum, name: pat });
        }
      }

      // Detect imports
      const importMatch = line.match(/import\s+(?:\*\s+as\s+)?(\w+)?\s*,?\s*\{?\s*([^}]*)\}?\s*from\s+['"](.+)['"]/);
      if (importMatch) {
        index.imports.push({ file: p.file, line: lineNum, source: importMatch[3], name: importMatch[1] || importMatch[2] });
      }
    }
  }

  return index;
}

function extractTemplateExprs(line: string): string[] {
  const exprs: string[] = [];
  const re = /\$\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    exprs.push(m[1].trim());
  }
  return exprs;
}
