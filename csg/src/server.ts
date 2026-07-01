import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { CombinedSemanticGraph } from './index.js';
import { createRuleEngine } from './analysis/rules/index.js';
import { toSarif } from './serialization/sarif.js';
import { toHtml } from './serialization/html-report.js';
import type { ParseResult, CSGGraph } from './types.js';

const PORT = parseInt(process.env.CSG_PORT || '4321', 10);

interface ScanSession {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  progress: number;
  message: string;
  findings: any[];
  report: any;
  startTime: number;
  clients: ServerResponse[];
}

const sessions = new Map<string, ScanSession>();

function uuid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function sendJson(res: ServerResponse, data: any, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function sendSseEvent(session: ScanSession, event: string, data: any) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of session.clients) {
    try { client.write(msg); } catch { /* ignore */ }
  }
}

async function handleScanJob(session: ScanSession, files: { code: string; file: string; lang: string }[]) {
  session.status = 'running';
  session.progress = 0;
  sendSseEvent(session, 'progress', { progress: 0, message: 'Initializing CSG engine...' });

  try {
    const csg = new CombinedSemanticGraph();
    for (const f of files) {
      csg.parseSource(f.code, f.file, f.lang as any);
    }
    session.progress = 20;
    sendSseEvent(session, 'progress', { progress: 20, message: `Parsed ${files.length} files...` });

    csg.build();
    const graph = csg.getGraph()!;
    const parsed = (csg as any).parsed as ParseResult[];
    session.progress = 40;
    sendSseEvent(session, 'progress', { progress: 40, message: 'Graph built. Running rule engine...' });

    const engine = createRuleEngine();
    session.progress = 60;
    sendSseEvent(session, 'progress', { progress: 60, message: `Engine loaded: ${engine.getRegistry().count()} rules. Scanning...` });

    const report = await engine.execute(parsed, graph);
    session.progress = 90;
    sendSseEvent(session, 'progress', { progress: 90, message: `Found ${report.totalFindings} issues. Generating report...` });

    session.findings = report.findings;
    session.report = {
      totalFindings: report.totalFindings,
      totalRules: report.totalRules,
      bySeverity: report.bySeverity,
      byCategory: report.byCategory,
      findings: report.findings.map(f => ({
        ruleId: f.ruleId, severity: f.severity, title: f.title, message: f.message,
        category: f.category, file: f.file, line: f.line, confidence: f.confidence,
        remediation: f.remediation || '', cwe: f.cweMapping || '', owasp: f.owaspMapping || '',
        snippet: f.snippet || '', autoFix: f.autoFixCode || '',
      })),
    };
    session.status = 'done';
    session.progress = 100;
    sendSseEvent(session, 'complete', session.report);
    sendSseEvent(session, 'progress', { progress: 100, message: 'Scan complete.' });
  } catch (err: any) {
    session.status = 'error';
    session.message = err.message;
    sendSseEvent(session, 'error', { message: err.message });
  }
}

const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts']);

function scanDir(csg: CombinedSemanticGraph, dir: string) {
  function walk(d: string) {
    let entries: string[];
    try { entries = readdirSync(d); } catch { return; }
    for (const e of entries) {
      const full = join(d, e);
      try {
        const s = statSync(full);
        if (s.isDirectory() && !e.startsWith('.') && e !== 'node_modules' && e !== 'dist') walk(full);
        else if (s.isFile() && EXTS.has(extname(full).toLowerCase())) csg.parseFile(full);
      } catch { /* skip */ }
    }
  }
  walk(dir);
}

async function requestHandler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  const method = req.method || 'GET';

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // GET /api/health
  if (path === '/api/health' && method === 'GET') {
    sendJson(res, { status: 'ok', engine: 'csg', rules: createRuleEngine().getRegistry().count(), sessions: sessions.size });
    return;
  }

  // GET /api/scan/:id/progress (SSE)
  const progressMatch = path.match(/^\/api\/scan\/([^/]+)\/progress$/);
  if (progressMatch && method === 'GET') {
    const sessionId = progressMatch[1];
    const session = sessions.get(sessionId);
    if (!session) { sendJson(res, { error: 'Session not found' }, 404); return; }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ sessionId, status: session.status, progress: session.progress })}\n\n`);
    session.clients.push(res);

    if (session.status === 'done') {
      res.write(`event: complete\ndata: ${JSON.stringify(session.report)}\n\n`);
    } else if (session.status === 'error') {
      res.write(`event: error\ndata: ${JSON.stringify({ message: session.message })}\n\n`);
    }

    req.on('close', () => {
      const idx = session.clients.indexOf(res);
      if (idx !== -1) session.clients.splice(idx, 1);
    });
    return;
  }

  // GET /api/scan/:id (get results)
  const resultMatch = path.match(/^\/api\/scan\/([^/]+)$/);
  if (resultMatch && method === 'GET') {
    const sessionId = resultMatch[1];
    const session = sessions.get(sessionId);
    if (!session) { sendJson(res, { error: 'Session not found' }, 404); return; }
    sendJson(res, { id: sessionId, status: session.status, ...session.report });
    return;
  }

  // GET /api/scan/:id/sarif
  const sarifMatch = path.match(/^\/api\/scan\/([^/]+)\/sarif$/);
  if (sarifMatch && method === 'GET') {
    const session = sessions.get(sarifMatch[1]);
    if (!session?.report) { sendJson(res, { error: 'Not found' }, 404); return; }
    const report = { findings: session.findings, totalFindings: session.report.totalFindings, totalRules: session.report.totalRules, bySeverity: session.report.bySeverity, byCategory: session.report.byCategory, taintPaths: [] };
    const sarif = toSarif(report as any);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(sarif);
    return;
  }

  // POST /api/scan (start scan)
  if (path === '/api/scan' && method === 'POST') {
    const buffers: Buffer[] = [];
    for await (const chunk of req) buffers.push(chunk);
    const body = JSON.parse(Buffer.concat(buffers).toString());

    const sessionId = uuid();
    const session: ScanSession = {
      id: sessionId, status: 'queued', progress: 0, message: 'Queued...',
      findings: [], report: null, startTime: Date.now(), clients: [],
    };
    sessions.set(sessionId, session);

    const files = body.files || [];
    const sourceDir = body.sourceDir || '';

    if (sourceDir) {
      const csg = new CombinedSemanticGraph();
      scanDir(csg, resolve(sourceDir));
      const graph = csg.getGraph()!;
      const parsed = (csg as any).parsed as ParseResult[];
      const engine = createRuleEngine();
      const report = await engine.execute(parsed, graph);
      session.findings = report.findings;
      session.report = {
        totalFindings: report.totalFindings, totalRules: report.totalRules,
        bySeverity: report.bySeverity, byCategory: report.byCategory,
        findings: report.findings.map(f => ({
          ruleId: f.ruleId, severity: f.severity, title: f.title, message: f.message,
          category: f.category, file: f.file, line: f.line, confidence: f.confidence,
          remediation: f.remediation || '', cwe: f.cweMapping || '', owasp: f.owaspMapping || '',
          snippet: f.snippet || '', autoFix: f.autoFixCode || '',
        })),
      };
      session.status = 'done';
      session.progress = 100;
      sendJson(res, { id: sessionId, status: 'done', ...session.report });
      return;
    }

    sendJson(res, { id: sessionId, status: 'queued' });
    handleScanJob(session, files).catch(() => {});
    return;
  }

  // GET /api/scans (list)
  if (path === '/api/scans' && method === 'GET') {
    const list = [...sessions.entries()].map(([id, s]) => ({
      id, status: s.status, progress: s.progress, message: s.message,
      totalFindings: s.report?.totalFindings || 0, startTime: s.startTime,
    })).sort((a, b) => b.startTime - a.startTime).slice(0, 50);
    sendJson(res, list);
    return;
  }

  sendJson(res, { error: 'Not found' }, 404);
}

const server = createServer(requestHandler);
server.listen(PORT, () => {
  console.log(`CSG API Server running on http://localhost:${PORT}`);
  console.log(`  POST /api/scan     — start scan (JSON body with files[] or sourceDir)`);
  console.log(`  GET  /api/scan/:id  — get scan results`);
  console.log(`  GET  /api/scan/:id/progress — SSE real-time progress`);
  console.log(`  GET  /api/scan/:id/sarif   — SARIF output`);
  console.log(`  GET  /api/scans     — list recent scans`);
  console.log(`  GET  /api/health    — health check`);
});
