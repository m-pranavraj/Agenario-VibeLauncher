import { fingerprintFunction } from './ast-fingerprint.js';
import { VULNERABILITY_PATTERNS } from './vulnerability-patterns.js';
import type { VulnerabilityPattern } from './vulnerability-patterns.js';
import * as babelParser from '@babel/parser';

const IDOR_VULN = `
function getUser(req, res) {
  const id = req.params.id;
  db.query("SELECT * FROM users WHERE id = " + id, function(err, result) {
    res.json(result);
  });
}
`;

const IDOR_CLEAN = `
function getUser(req, res) {
  const id = req.params.id;
  const uid = req.session.userId;
  if (uid !== id && !req.user.isAdmin) {
    return res.status(403).json({ error: "forbidden" });
  }
  db.query("SELECT * FROM users WHERE id = ?", [id], function(err, result) {
    res.json(result);
  });
}
`;

const PP_VULN = `
function merge(target, source) {
  for (var key in source) {
    target[key] = source[key];
  }
  return target;
}
`;

const PP_CLEAN = `
function merge(target, source) {
  for (var key in source) {
    if (source.hasOwnProperty(key) && key !== "__proto__") {
      target[key] = source[key];
    }
  }
  return target;
}
`;

const SSRF_VULN = `
async function fetchUrl(req, res) {
  const url = req.query.url;
  const response = await fetch(url);
  const text = await response.text();
  res.send(text);
}
`;

const SSRF_CLEAN = `
async function fetchUrl(req, res) {
  const url = req.query.url;
  const allowed = ["https://api.trusted.com", "https://data.trusted.com"];
  if (!allowed.includes(url)) {
    return res.status(400).json({ error: "invalid url" });
  }
  const response = await fetch(url);
  const text = await response.text();
  res.send(text);
}
`;

const SQLI_VULN = `
function search(req, res) {
  const term = req.query.q;
  const result = db.query("SELECT * FROM items WHERE name LIKE '" + term + "'");
  res.json(result);
}
`;

const SQLI_CLEAN = `
function search(req, res) {
  const term = req.query.q;
  const sanitized = term.replace(/'/g, "''");
  const result = db.query("SELECT * FROM items WHERE name LIKE ?", [sanitized]);
  res.json(result);
}
`;

interface ParsedRef {
  vulnFP: ReturnType<typeof fingerprintFunction>;
  cleanFP: ReturnType<typeof fingerprintFunction> | null;
}

function parseReference(code: string, fnName: string): ReturnType<typeof fingerprintFunction> | null {
  try {
    const ast = babelParser.parse(code, { sourceType: 'script', plugins: [] });
    const body = (ast as any).program.body;
    const fn = body.find((n: any) => n.type === 'FunctionDeclaration' && n.id?.name === fnName);
    if (!fn) return null;
    return fingerprintFunction(fnName, fn.body, fn.loc ? { start: { line: fn.loc.start.line }, end: { line: fn.loc.end.line } } : null);
  } catch {
    return null;
  }
}

export function warmReferencePatterns(): void {
  const refs: Record<string, ParsedRef> = {
    'IDOR-001': { vulnFP: parseReference(IDOR_VULN, 'getUser')!, cleanFP: parseReference(IDOR_CLEAN, 'getUser') },
    'PP-001': { vulnFP: parseReference(PP_VULN, 'merge')!, cleanFP: parseReference(PP_CLEAN, 'merge') },
    'SSRF-001': { vulnFP: parseReference(SSRF_VULN, 'fetchUrl')!, cleanFP: parseReference(SSRF_CLEAN, 'fetchUrl') },
    'SQLI-001': { vulnFP: parseReference(SQLI_VULN, 'search')!, cleanFP: parseReference(SQLI_CLEAN, 'search') },
  };

  for (const pattern of VULNERABILITY_PATTERNS) {
    const ref = refs[pattern.id];
    if (!ref || !ref.vulnFP) continue;

    pattern.structuralHash = ref.vulnFP.structuralHash;
    pattern.topologicalShape = ref.vulnFP.topologicalShape;
    pattern.minHashSig = ref.vulnFP.minHashSig;
    pattern.depth = ref.vulnFP.depth;
    pattern.nodeCount = ref.vulnFP.nodeCount;

    if (ref.cleanFP) {
      pattern.cleanStructuralHash = ref.cleanFP.structuralHash;
      pattern.cleanTopologicalShape = ref.cleanFP.topologicalShape;
      pattern.cleanMinHashSig = ref.cleanFP.minHashSig;
    }
  }
}
