import type { RuleEngineReport } from '../analysis/rules/engine/types.js';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

interface ChartSlice { label: string; count: number; color: string; }
const SEV_COLORS: Record<string, string> = { critical: '#da3633', high: '#d29922', medium: '#1f6feb', low: '#238636', info: '#30363d' };
const CAT_COLORS = ['#58a6ff','#3fb950','#f0883e','#bc8cff','#79c0ff','#ff7b72','#a5d6ff','#d2a8ff','#7ee787','#e3b341','#ffa198','#ffc107','#b1f2b1','#c9d1d9'];

function renderPieChart(canvasId: string, data: ChartSlice[], w: number, h: number): string {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  let accum = 0;
  const segs = data.map(d => {
    const start = (accum / total) * 360;
    accum += d.count;
    const end = (accum / total) * 360;
    return { ...d, start, end };
  });
  const cx = w/2, cy = h/2, r = Math.min(w,h)/2 - 10;
  function arcPath(sAngle: number, eAngle: number): string {
    const sRad = (sAngle-90)*Math.PI/180, eRad = (eAngle-90)*Math.PI/180;
    const x1 = cx + r*Math.cos(sRad), y1 = cy + r*Math.sin(sRad);
    const x2 = cx + r*Math.cos(eRad), y2 = cy + r*Math.sin(eRad);
    const large = (eAngle - sAngle) > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${segs.filter(s => s.count > 0).map(s => `<path d="${arcPath(s.start, s.end)}" fill="${s.color}" stroke="#0d1117" stroke-width="1">
      <title>${escapeHtml(s.label)}: ${s.count}</title></path>`).join('\n')}
    <text x="${cx}" y="${cy-5}" text-anchor="middle" fill="#f0f6fc" font-size="24" font-weight="700">${total}</text>
    <text x="${cx}" y="${cy+14}" text-anchor="middle" fill="#8b949e" font-size="12">total</text>
  </svg>`;
}

function renderBarChart(data: ChartSlice[], w: number, h: number): string {
  const max = Math.max(...data.map(d => d.count), 1);
  const barW = Math.max(20, (w - 60) / data.length);
  const labels = data.map((d, i) => {
    const barH = (d.count / max) * (h - 40);
    const x = 40 + i * barW;
    return `<rect x="${x}" y="${h - 20 - barH}" width="${barW-4}" height="${barH}" fill="${d.color}" rx="3">
      <title>${escapeHtml(d.label)}: ${d.count}</title></rect>
      <text x="${x + (barW-4)/2}" y="${h-5}" text-anchor="middle" fill="#8b949e" font-size="9" transform="rotate(-45,${x + (barW-4)/2},${h-5})">${escapeHtml(d.label.length > 12 ? d.label.split('-').pop() || d.label : d.label)}</text>`;
  }).join('\n');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${labels}</svg>`;
}

export function toHtml(report: RuleEngineReport): string {
  const findingsJson = escapeHtml(JSON.stringify(report.findings.map(f => ({
    id: f.ruleId, severity: f.severity, title: f.title, message: f.message,
    category: f.category, file: f.file, line: f.line, confidence: f.confidence,
    remediation: f.remediation || '', cwe: f.cweMapping || '', owasp: f.owaspMapping || '',
    snippet: f.snippet || '', autoFix: f.autoFixCode || '',
  }))));

  const sevData: ChartSlice[] = Object.entries(report.bySeverity).map(([k, v]) => ({ label: k, count: v, color: SEV_COLORS[k] || '#30363d' }));
  const catData: ChartSlice[] = Object.entries(report.byCategory).map(([k, v], i) => ({ label: k, count: v, color: CAT_COLORS[i % CAT_COLORS.length] }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agenario CSG — Findings Viewer</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; padding: 1.5rem; }
  h1 { color: #58a6ff; font-size: 1.6rem; }
  .subtitle { color: #8b949e; font-size: 0.9rem; margin-bottom: 1.5rem; }
  .summary-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1rem; }
  .card h3 { color: #8b949e; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.3rem; }
  .card .val { font-size: 1.8rem; font-weight: 700; color: #f0f6fc; }
  .charts-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .charts-row .card { flex: 1; min-width: 280px; }
  .filters { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; margin-bottom: 1rem; padding: 0.8rem; background: #161b22; border: 1px solid #30363d; border-radius: 8px; }
  .filters label { color: #8b949e; font-size: 0.8rem; }
  .filters select, .filters input { background: #0d1117; color: #c9d1d9; border: 1px solid #30363d; border-radius: 6px; padding: 0.4rem 0.6rem; font-size: 0.85rem; }
  .filters input { min-width: 180px; }
  .badge { display: inline-block; padding: 0.15em 0.5em; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }
  .badge-critical { background: #da3633; color: #fff; }
  .badge-high { background: #d29922; color: #fff; }
  .badge-medium { background: #1f6feb; color: #fff; }
  .badge-low { background: #238636; color: #fff; }
  .badge-info { background: #30363d; color: #8b949e; }
  .table-wrap { overflow-x: auto; border: 1px solid #30363d; border-radius: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { background: #161b22; color: #8b949e; font-weight: 600; padding: 0.6rem 0.8rem; text-align: left; cursor: pointer; white-space: nowrap; user-select: none; position: sticky; top: 0; }
  th:hover { color: #f0f6fc; }
  th .sort { margin-left: 0.3rem; opacity: 0.4; }
  th .sort.active { opacity: 1; color: #58a6ff; }
  td { padding: 0.5rem 0.8rem; border-top: 1px solid #21262d; }
  tr:hover td { background: #1c2128; }
  tr.critical td { border-left: 3px solid #da3633; }
  tr.high td { border-left: 3px solid #d29922; }
  tr.medium td { border-left: 3px solid #1f6feb; }
  tr.low td { border-left: 3px solid #238636; }
  tr.dim { opacity: 0.35; }
  .finding-detail { display: none; background: #0d1117; padding: 0.8rem; border-radius: 6px; margin-top: 0.3rem; font-size: 0.8rem; }
  .finding-detail.open { display: block; }
  .finding-detail code { display: block; background: #161b22; padding: 0.5rem; border-radius: 4px; margin: 0.3rem 0; white-space: pre-wrap; font-size: 0.78rem; color: #79c0ff; }
  .finding-detail .fix { background: #0d2818; border: 1px solid #238636; padding: 0.5rem; border-radius: 4px; margin: 0.3rem 0; }
  .finding-detail .label { color: #8b949e; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.3px; }
  code { background: #1c2128; padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.8rem; }
  .stats { color: #8b949e; font-size: 0.85rem; margin-bottom: 0.5rem; }
  .expand-btn { background: none; border: 1px solid #30363d; color: #58a6ff; cursor: pointer; border-radius: 4px; padding: 0.15rem 0.4rem; font-size: 0.75rem; }
  .expand-btn:hover { background: #1c2128; }
  .empty-state { text-align: center; padding: 3rem; color: #484f58; }
  .empty-state .big { font-size: 3rem; margin-bottom: 0.5rem; }
  .pill { display: inline-block; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem; background: #21262d; color: #8b949e; margin-right: 0.3rem; }
  @media (max-width: 768px) { .filters { flex-direction: column; } .filters input { width: 100%; } }
</style>
</head>
<body>
<div style="max-width:1400px;margin:0 auto">

<h1>Agenario CSG — Findings Viewer</h1>
<div class="subtitle">${new Date().toISOString()} &middot; ${report.totalRules} rules loaded</div>

<div class="summary-row">
  <div class="card"><h3>Total Findings</h3><div class="val">${report.totalFindings}</div></div>
  ${Object.entries(report.bySeverity).filter(([,v]) => v > 0).map(([k, v]) =>
    `<div class="card"><h3>${k}</h3><div class="val"><span class="badge badge-${k}">${v}</span></div></div>`
  ).join('')}
</div>

<div class="charts-row">
  <div class="card"><h3>Severity Distribution</h3>${renderPieChart('sevChart', sevData, 240, 200)}</div>
  <div class="card"><h3>Category Distribution</h3>${renderBarChart(catData, 600, 200)}</div>
</div>

<div class="filters">
  <label>Severity</label>
  <select id="sevFilter" onchange="applyFilters()">
    <option value="">All</option>
    <option value="critical">Critical</option>
    <option value="high">High</option>
    <option value="medium">Medium</option>
    <option value="low">Low</option>
    <option value="info">Info</option>
  </select>
  <label>Category</label>
  <select id="catFilter" onchange="applyFilters()">
    <option value="">All</option>
    ${Object.keys(report.byCategory).map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
  </select>
  <label>Search</label>
  <input id="searchFilter" type="text" placeholder="title, file, rule ID..." oninput="applyFilters()">
  <label>Min conf</label>
  <select id="confFilter" onchange="applyFilters()">
    <option value="0">Any</option>
    <option value="50">50%+</option>
    <option value="70">70%+</option>
    <option value="85">85%+</option>
  </select>
  <span style="flex:1"></span>
  <span id="resultCount" class="stats">${report.totalFindings} findings</span>
</div>

<div class="table-wrap">
<table>
<thead><tr>
  <th onclick="sortBy('severity')">Severity <span class="sort" id="sort-severity">&#9650;</span></th>
  <th onclick="sortBy('ruleId')">Rule <span class="sort" id="sort-ruleId">&#9650;</span></th>
  <th onclick="sortBy('title')">Title <span class="sort" id="sort-title">&#9650;</span></th>
  <th onclick="sortBy('location')">Location <span class="sort" id="sort-location">&#9650;</span></th>
  <th onclick="sortBy('confidence')">Conf. <span class="sort" id="sort-confidence">&#9650;</span></th>
  <th onclick="sortBy('message')">Message <span class="sort" id="sort-message">&#9650;</span></th>
  <th></th>
</tr></thead>
<tbody id="findingsBody"></tbody>
</table>
<div id="emptyState" class="empty-state" style="display:none">
  <div class="big">&#128270;</div>
  <div>No findings match the current filters</div>
</div>
</div>

</div>

<script>
const findings = ${findingsJson};
let sortField = 'severity';
let sortDir = -1;

const sevOrder = { critical:0, high:1, medium:2, low:3, info:4 };

function applyFilters() {
  const sev = document.getElementById('sevFilter').value;
  const cat = document.getElementById('catFilter').value;
  const search = document.getElementById('searchFilter').value.toLowerCase();
  const minConf = parseInt(document.getElementById('confFilter').value) || 0;

  const filtered = findings.filter(f => {
    if (sev && f.severity !== sev) return false;
    if (cat && f.category !== cat) return false;
    if (minConf && f.confidence < minConf) return false;
    if (search) {
      const h = (f.title + ' ' + f.file + ' ' + f.ruleId + ' ' + f.message).toLowerCase();
      if (!h.includes(search)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortField === 'severity') cmp = (sevOrder[a.severity]||9) - (sevOrder[b.severity]||9);
    else if (sortField === 'confidence') cmp = a.confidence - b.confidence;
    else if (sortField === 'location') cmp = (a.file + ':' + a.line).localeCompare(b.file + ':' + b.line);
    else if (sortField === 'ruleId') cmp = a.ruleId.localeCompare(b.ruleId);
    else if (sortField === 'title') cmp = a.title.localeCompare(b.title);
    else if (sortField === 'message') cmp = a.message.localeCompare(b.message);
    return cmp * sortDir;
  });

  renderFindings(filtered);
  document.getElementById('resultCount').textContent = filtered.length + ' findings';
  document.getElementById('emptyState').style.display = filtered.length === 0 ? 'block' : 'none';
}

function renderFindings(list) {
  const tbody = document.getElementById('findingsBody');
  tbody.innerHTML = list.map(f => \`
    <tr class="\${f.severity}" id="row-\${f.ruleId}-\${f.line}">
      <td><span class="badge badge-\${f.severity}">\${f.severity}</span></td>
      <td><code>\${esc(f.ruleId)}</code></td>
      <td>\${esc(f.title)}</td>
      <td><code>\${esc(f.file)}:\${f.line}</code></td>
      <td>\${f.confidence}%</td>
      <td>\${esc(f.message).substring(0, 120)}</td>
      <td><button class="expand-btn" onclick="toggleDetail('\${f.ruleId}-\${f.line}')">&#9660;</button></td>
    </tr>
    <tr id="detail-\${f.ruleId}-\${f.line}" class="finding-detail">
      <td colspan="7">
        <div class="label">Full Message</div>
        <div>\${esc(f.message)}</div>
        \${f.cwe ? '<div class="label" style="margin-top:0.5rem">CWE / OWASP</div><div>' + esc(f.cwe) + (f.owasp ? ' &middot; ' + esc(f.owasp) : '') + '</div>' : ''}
        \${f.snippet ? '<div class="label" style="margin-top:0.5rem">Code Snippet</div><code>' + esc(f.snippet) + '</code>' : ''}
        \${f.remediation ? '<div class="label" style="margin-top:0.5rem">Remediation</div><div class="fix">' + esc(f.remediation) + '</div>' : ''}
        \${f.autoFix ? '<div class="label" style="margin-top:0.5rem">Auto-Fix</div><code class="fix">' + esc(f.autoFix) + '</code>' : ''}
      </td>
    </tr>
  \`).join('');
}

function toggleDetail(id) {
  const el = document.getElementById('detail-' + id);
  if (el) el.classList.toggle('open');
}

function sortBy(field) {
  if (sortField === field) sortDir *= -1;
  else { sortField = field; sortDir = 1; }
  document.querySelectorAll('.sort').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('sort-' + field);
  if (el) { el.classList.add('active'); el.innerHTML = sortDir === 1 ? '&#9650;' : '&#9660;'; }
  applyFilters();
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

applyFilters();
</script>
</body>
</html>`;
}
