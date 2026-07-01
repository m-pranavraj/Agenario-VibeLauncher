import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';

const SYNC_BLOCKING_APIS = [
  /fs\.readFileSync/, /fs\.writeFileSync/, /fs\.existsSync/, /fs\.mkdirSync/,
  /fs\.readdirSync/, /fs\.unlinkSync/, /fs\.rmSync/, /fs\.cpSync/,
  /child_process\.execSync/, /child_process\.spawnSync/, /child_process\.execFileSync/,
  /crypto\.randomBytes\.bind/, /deasync/, /sync\-request/,
];

/* ───────────── Rule: PERF-EVENT-001 — Sync blocking in request handler ───────────── */
export class SyncBlockingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-001',
    name: 'Synchronous Blocking in Request Handler — Event Loop Starvation',
    description: 'Detects bcrypt.hashSync, fs.readFileSync, or large sync ops in critical request path',
    category: 'performance-event-loop',
    severity: 'high',
    techniqueNumber: 101,
    pillar: 2,
    tags: ['performance', 'event-loop', 'blocking', 'sync'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      let inHandler = false;
      let handlerStartLine = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const handlerPattern = line.match(/(?:app|router|route)\.(?:get|post|put|patch|delete|all|use)\s*\(/);
        if (handlerPattern) {
          inHandler = true;
          handlerStartLine = i + 1;
          continue;
        }

        if (inHandler) {
          for (const syncApi of SYNC_BLOCKING_APIS) {
            syncApi.lastIndex = 0;
            if (!syncApi.test(line)) continue;

            const apiName = line.match(syncApi)?.[0]?.slice(0, 40) || 'sync API';
            const blockingScore = apiName.includes('execSync') ? 10 : apiName.includes('readFileSync') ? 7 : 5;

            this.emit(ctx, {
              title: `Event Loop Blocked — ${apiName} in Request Handler`,
              message: `${apiName} called at line ${i + 1} inside a request handler (started line ${handlerStartLine}). This blocks the entire Node.js event loop for the duration of the ${apiName.includes('Sync') ? 'sync' : ''} operation, freezing all concurrent requests.`,
              file: p.file,
              line: i + 1,
              snippet: line.slice(0, 250),
              confidence: 92,
              remediation: `Replace ${apiName} with its async alternative (remove "Sync" suffix). For CPU-intensive tasks like bcrypt, use worker threads.`,
              autoFixCode: `// Before:\nconst data = fs.readFileSync('/path/to/file');\n// After:\nconst data = await fs.promises.readFile('/path/to/file');`,
            });
          }

          const isEndOfHandler = line.match(/^\s*\)/) || line.match(/^\s*\]/) || line.match(/^\s*\};/);
          if (isEndOfHandler && !line.includes('(')) inHandler = false;
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-002 — Promise waterfall ───────────── */
export class PromiseWaterfallRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-002',
    name: 'Promise Waterfall — Sequential Independent Async Calls',
    description: 'Detects sequential await calls with no data dependency that should use Promise.all()',
    category: 'performance-event-loop',
    severity: 'medium',
    techniqueNumber: 116,
    pillar: 2,
    tags: ['performance', 'promise', 'waterfall', 'concurrency'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!line.includes('await') && !line.includes('await')) continue;

        const sequentialAwaits: number[] = [];
        let j = i;
        while (j < lines.length && j < i + 15) {
          const awaitMatch = lines[j].match(/const\s+(\w+)\s*=\s*await\s+(\w[\w.]*)\s*\(/);
          if (awaitMatch) {
            sequentialAwaits.push(j - i);
          } else if (lines[j].includes('await') && sequentialAwaits.length > 0) {
            const standAlone = lines[j].match(/await\s+(\w[\w.]*)\s*\(/);
            if (standAlone) sequentialAwaits.push(j - i);
          }
          j++;
        }

        if (sequentialAwaits.length >= 3) {
          const firstLine = i + sequentialAwaits[0] + 1;
          const lastLine = i + sequentialAwaits[sequentialAwaits.length - 1] + 1;

          this.emit(ctx, {
            title: 'Promise Waterfall — Sequential Independent Async Calls',
            message: `${sequentialAwaits.length} sequential await calls at lines ${firstLine}-${lastLine} with no apparent data dependency. These execute serially, adding latency equal to the sum of all call durations.`,
            file: p.file,
            line: firstLine,
            snippet: lines.slice(i, i + sequentialAwaits[sequentialAwaits.length - 1] + 2).join('\n').slice(0, 300),
            confidence: 65,
            remediation: 'Use Promise.all() to execute independent async calls in parallel, reducing total latency to the longest single call.',
            autoFixCode: `// Before:\nconst users = await getUsers();\nconst posts = await getPosts();\nconst comments = await getComments();\n// After:\nconst [users, posts, comments] = await Promise.all([getUsers(), getPosts(), getComments()]);`,
          });
          break;
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-003 — Bundle bloat (no tree-shaking) ───────────── */
export class BundleBloatRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-003',
    name: 'Bundle Bloat — Import * Prevents Tree-Shaking',
    description: 'Detects import * as _ from "lodash" or usage of legacy moment.js preventing dead-code elimination',
    category: 'performance-rendering',
    severity: 'medium',
    techniqueNumber: 141,
    pillar: 2,
    tags: ['performance', 'bundle', 'tree-shaking', 'lodash', 'moment'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      const badImports = [
        { pattern: /import\s+\*\s+as\s+_\s+from\s+['"]lodash['"]/, name: 'lodash namespace import', fix: 'import debounce from "lodash/debounce"' },
        { pattern: /import\s+moment\s+from\s+['"]moment['"]/, name: 'moment.js (legacy)', fix: 'Use date-fns or dayjs instead' },
        { pattern: /import\s+\*\s+as\s+\w+\s+from\s+['"](?:@?[\w-]+)\/?(?:dist|src|lib)?['"]/, name: 'namespace import from library', fix: 'Use named imports for tree-shaking' },
        { pattern: /require\s*\(\s*['"]lodash['"]\s*\)/, name: 'lodash require (full bundle)', fix: 'require("lodash/debounce")' },
      ];

      for (let i = 0; i < lines.length; i++) {
        for (const bi of badImports) {
          bi.pattern.lastIndex = 0;
          if (!bi.pattern.test(lines[i])) continue;

          this.emit(ctx, {
            title: `Bundle Bloat — ${bi.name}`,
            message: `${bi.name} detected at line ${i + 1}. This imports the entire library bundle, preventing tree-shaking and increasing bundle size significantly.`,
            file: p.file,
            line: i + 1,
            snippet: lines[i].slice(0, 200),
            confidence: 90,
            remediation: bi.fix,
            autoFixCode: `// Instead of:\n${lines[i].trim()}\n// Use:\n${bi.fix}`,
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-004 — Large JSON processing on main thread ───────────── */
export class LargeJSONMainThreadRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-004',
    name: 'Large JSON/Array Processing on Main Thread — Event Loop Starvation',
    description: 'Detects JSON.parse/stringify or large array operations on main thread in request handlers',
    category: 'performance-event-loop',
    severity: 'medium',
    techniqueNumber: 102,
    pillar: 2,
    tags: ['performance', 'event-loop', 'json-parse', 'main-thread'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/JSON\.(?:parse|stringify)\s*\(/.test(lines[i])) continue;
        if (!/body|data|result|response|payload|content|file|text|big|large|huge|all|full|entire/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Large JSON Processing on Main Thread',
          message: 'JSON.parse/stringify at line ' + ln + ' on potentially large data. JSON.parse is synchronous and blocks the event loop for the entire duration (100ms+ for 50MB).',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Stream large JSON with JSONStream or Oboe.js. For known large payloads, use worker threads.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-005 — CPU-heavy loop in handler ───────────── */
export class CPUHeavyLoopRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-005',
    name: 'CPU-Bound Loop in Request Handler — Starves Event Loop',
    description: 'Detects long-running loops with heavy computation in request handlers (>1000 iterations or nested loops with computation)',
    category: 'performance-event-loop',
    severity: 'high',
    techniqueNumber: 103,
    pillar: 2,
    tags: ['performance', 'event-loop', 'cpu-bound', 'loop', 'blocking'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:app|router)\.(?:get|post|put|patch|delete)\s*\(/.test(lines[i])) continue;
        let loopDepth = 0;
        let maxDepth = 0;
        for (let j = i; j < lines.length && j < i + 50; j++) {
          if (/for\s*\(|while\s*\(|do\s*\{/.test(lines[j])) loopDepth++;
          if (/^\s*\}/.test(lines[j]) && loopDepth > 0) loopDepth--;
          if (loopDepth > maxDepth) maxDepth = loopDepth;
        }
        if (maxDepth >= 2) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'CPU-Bound Loop in Request Handler',
            message: 'Request handler at line ' + ln + ' contains ' + maxDepth + '+ levels of nested loops. CPU-bound work blocks the event loop, freezing all concurrent connections.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
            remediation: 'Move heavy computation to worker threads. Use setImmediate() or split work across multiple ticks with async iteration.',
          });
          break;
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-006 — Unawaited promise in handler (fire-and-forget) ───────────── */
export class UnawaitedPromiseRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-006',
    name: 'Unawaited Promise in Request Handler — Fire-and-Forget / Silent Crash',
    description: 'Detects async function calls without await inside request handlers causing unhandled rejections',
    category: 'performance-event-loop',
    severity: 'high',
    techniqueNumber: 104,
    pillar: 2,
    tags: ['performance', 'event-loop', 'promise', 'unhandled-rejection'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:app|router)\.(?:get|post|put|patch|delete)\s*\(.*async/.test(lines[i])) continue;
        for (let j = i; j < lines.length && j < i + 30; j++) {
          const asyncCall = lines[j].match(/(\w+(?:Async|Service|Client|Repo|Api|Helper|Utils|Provider)\s*\(|\.(?:save|send|update|create|delete|fetch|upload|process|notify|email|push|emit)\s*\()/i);
          if (!asyncCall) continue;
          if (/await\s/.test(lines[j])) continue;
          if (/^\s*\/\//.test(lines[j]) || /console|logger|log\./.test(lines[j])) continue;
          const ln = j + 1;
          this.emit(ctx, {
            title: 'Unawaited Promise in Request Handler — Fire-and-Forget',
            message: 'Async call "' + asyncCall[0].trim() + '" at line ' + ln + ' without await inside an async handler. Errors crash the process (unhandled rejection). Response may be sent before side effects complete.',
            file: p.file, line: ln, snippet: lines[j].slice(0, 250), confidence: 82,
            remediation: 'Add await before the async call. If fire-and-forget is intentional, attach .catch() handler.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-007 — Recursive setTimeout Clock Drift ───────────── */
export class RecursiveTimeoutDriftRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-007',
    name: 'Recursive setTimeout Clock Drift — Timer Skew Accumulation',
    description: 'Detects recursive setTimeout pattern that accumulates clock drift compared to setInterval',
    category: 'performance-event-loop',
    severity: 'low',
    techniqueNumber: 105,
    pillar: 2,
    tags: ['performance', 'event-loop', 'timer', 'clock-drift', 'settimeout'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/setTimeout\s*\([^,]+,\s*(?:1000|2000|3000|5000|10000)\s*\)/.test(lines[i])) continue;
        const hasRecursion = lines.slice(i, i + 10).some(l => l.includes('setTimeout') && l.includes('arguments.callee') || lines.slice(i, i + 5).some(l2 => /const\s+\w+\s*=\s*\(\)\s*=>/.test(l2)));
        if (!hasRecursion && !/\w+\s*\(\)\s*;\s*\}\s*,\s*\d+/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Recursive setTimeout Clock Drift',
          message: 'Recursive setTimeout at line ' + ln + ' accumulates clock drift over time. After 100 iterations at 1000ms delay, drift can be several seconds.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 45,
          remediation: 'Use setInterval for periodic tasks. If setTimeout is needed, subtract drift: setTimeout(fn, Math.max(0, interval - elapsed)).',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-008 — Layout thrashing / forced reflow pattern ───────────── */
export class LayoutThrashingRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-008',
    name: 'Layout Thrashing — Read-Offset-Write Pattern in Loop',
    description: 'Detects alternating style reads (offsetHeight) and writes (style.top) in loops causing forced synchronous layouts',
    category: 'performance-event-loop',
    severity: 'high',
    techniqueNumber: 131,
    pillar: 2,
    tags: ['performance', 'layout-thrashing', 'forced-reflow', 'dom'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const inLoop = /for\s*\(|\.map\s*\(|\.forEach\s*\(/.test(lines[i]);
        if (!inLoop) continue;
        let hasRead = false;
        let hasWrite = false;
        let readLine = 0;
        let writeLine = 0;
        for (let j = i; j < lines.length && j < i + 15; j++) {
          if (/\.(?:offsetHeight|offsetWidth|scrollTop|scrollLeft|clientHeight|clientWidth|getBoundingClientRect|getComputedStyle)\s*\(/.test(lines[j])) {
            hasRead = true; readLine = j + 1;
          }
          if (/\.(?:style\.|className\s*=|classList\.add|classList\.remove)\s*\(/.test(lines[j]) && !/^\s*\/\//.test(lines[j])) {
            hasWrite = true; writeLine = j + 1;
          }
        }
        if (hasRead && hasWrite) {
          this.emit(ctx, {
            title: 'Layout Thrashing — Read-Offset-Write in Loop',
            message: 'Style read at line ' + readLine + ' followed by write at line ' + writeLine + ' inside loop. Each iteration forces synchronous layout (reflow). GPU frame drops at 60fps.',
            file: p.file, line: readLine, snippet: lines.slice(readLine - 1, writeLine).join('\n'), confidence: 80,
            remediation: 'Batch all reads first, then batch writes. Or use FastDOM library. Never interleave style reads and writes in loops.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-009 — Image missing dimensions (CLS) ───────────── */
export class ImageMissingDimensionsRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-009',
    name: 'Image Missing Width/Height — Cumulative Layout Shift',
    description: 'Detects <img> tags without width and height attributes causing layout shifts on load',
    category: 'performance-rendering',
    severity: 'medium',
    techniqueNumber: 132,
    pillar: 2,
    tags: ['performance', 'cls', 'layout-shift', 'image', 'lcp'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<img\s/.test(lines[i]) && !/\.src\s*=/.test(lines[i]) && !/next\/image|next\/Image/.test(lines[i])) continue;
        if (/width\s*[:=]\s*\d+|height\s*[:=]\s*\d+|layout\s*[:=]\s*[''']fill[''']|fill|unsized|Image\s*\(/.test(lines[i]) && !/width\s*:\s*auto|height\s*:\s*auto/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Image Missing Dimensions — Cumulative Layout Shift',
          message: 'Image at line ' + ln + ' without explicit width/height. Browser cannot reserve space, causing content reflow when image loads. CLS penalty in Core Web Vitals.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 78,
          remediation: 'Always specify width and height attributes on <img> tags. Use CSS aspect-ratio box as fallback.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-010 — Dynamic import missing for large route ───────────── */
export class MissingCodeSplitRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-010',
    name: 'Missing Code Splitting — Static Import of Heavy Module in Hot Path',
    description: 'Detects static imports of heavy libraries (chart, PDF, map, video editor) that should be dynamically imported',
    category: 'performance-rendering',
    severity: 'medium',
    techniqueNumber: 142,
    pillar: 2,
    tags: ['performance', 'code-split', 'dynamic-import', 'bundle'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      const heavyLibs = [/chart/, /pdfkit/, /pdfmake/, /html2canvas/, /canvg/, /d3/, /three/, /babylon/, /mapbox/, /leaflet/, /opencv/, /tesseract/, /sharp/, /canvas/, /fabric/];
      for (let i = 0; i < lines.length; i++) {
        for (const lib of heavyLibs) {
          lib.lastIndex = 0;
          if (!lib.test(lines[i])) continue;
          if (!/import\s+|require\s*\(/.test(lines[i])) continue;
          if (/import\s*\(/.test(lines[i])) continue;
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Missing Code Splitting — Static Import of Heavy Library',
            message: 'Static import at line ' + ln + ' of a heavy library. Adds 100KB+ to initial bundle. Users pay download cost even if they never visit the relevant page.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
            remediation: 'Use dynamic import: const Chart = await import("chart.js") in the component that needs it.',
          });
          break;
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-011 — Inline script blocking render ───────────── */
export class InlineScriptRenderBlockRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-011',
    name: 'Inline Script Blocking Render — No async/defer',
    description: 'Detects <script> tags without async or defer in <head> that block HTML parsing',
    category: 'performance-rendering',
    severity: 'medium',
    techniqueNumber: 133,
    pillar: 2,
    tags: ['performance', 'render-blocking', 'script', 'lcp'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/<script[^>]*>/.test(lines[i])) continue;
        if (/async|defer|type\s*=\s*[''']module[''']/.test(lines[i])) continue;
        if (/<\/body>/.test(lines[i]) || /<\/html>/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Render-Blocking Script — No async/defer',
          message: '<script> tag at line ' + ln + ' in <head> without async or defer. Browser pauses HTML parsing to download + execute script. Delays LCP by script size * RTT.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Add defer (for order-dependent) or async (for independent) to all <script> tags. Move non-critical scripts to end of <body>.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-012 — requestAnimationFrame without cancel ───────────── */
export class RAFWithoutCancelRule2 extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-012',
    name: 'requestAnimationFrame Without cancelAnimationFrame on Unmount',
    description: 'Detects rAF calls without cancel in cleanup/return',
    category: 'performance-event-loop',
    severity: 'high',
    techniqueNumber: 134,
    pillar: 2,
    tags: ['performance', 'animation-frame', 'leak', 'cleanup'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/requestAnimationFrame/.test(lines[i])) continue;
        if (/cancelAnimationFrame/.test(lines.slice(i, i + 20).join(' '))) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'requestAnimationFrame Without Cancel — Renders After Unmount',
          message: 'rAF at line ' + ln + ' has no cancelAnimationFrame in cleanup. After component unmount, callbacks still fire, wasting CPU and potentially mutating unmounted DOM.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 72,
          remediation: 'Store rAF id: const raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-013 — setInterval without clearInterval ───────────── */
export class IntervalNoClearRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-013',
    name: 'setInterval Without clearInterval — Orphaned Timer',
    description: 'Detects setInterval calls without matching clearInterval in same scope',
    category: 'performance-event-loop',
    severity: 'critical',
    techniqueNumber: 135,
    pillar: 2,
    tags: ['performance', 'timer', 'interval', 'leak'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/setInterval/.test(lines[i])) continue;
        if (/clearInterval/.test(lines.slice(i, i + 30).join(' '))) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'setInterval Without clearInterval — Timer Leaks Forever',
          message: 'setInterval at line ' + ln + ' has no clearInterval in scope. The interval fires forever even if component unmounts, causing state updates on unmounted components.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 80,
          remediation: 'const id = setInterval(fn, ms); return () => clearInterval(id);',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-014 — Excessive DOM nodes ───────────── */
export class ExcessiveDOMNodesRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-014',
    name: 'Excessive DOM Nodes (10K+) — Layout/Paint Slowdown',
    description: 'Detects patterns that create large numbers of DOM nodes',
    category: 'performance-event-loop',
    severity: 'high',
    techniqueNumber: 136,
    pillar: 2,
    tags: ['performance', 'dom', 'paint', 'reflow'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.innerHTML\s*=/.test(lines[i]) && !/document\.write/.test(lines[i])) continue;
        if (/\b10[0-9]{3,}\b|\b\d{5,}\b/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Excessive DOM Node Creation — Layout Thrashing',
          message: 'innerHTML assignment at line ' + ln + '. Rendering 10K+ DOM nodes causes layout/paint times > 100ms. Each update recalculates styles and layout.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 30,
          remediation: 'Use virtual scrolling (react-window, tanstack-virtual) for large lists. Limit DOM to 1000-2000 visible nodes at a time.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-015 — Synchronous XMLHttpRequest ───────────── */
export class SyncXHRRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-015',
    name: 'Synchronous XMLHttpRequest — Main Thread Blocked',
    description: 'Detects synchronous XHR (async: false) which blocks the main thread',
    category: 'performance-event-loop',
    severity: 'critical',
    techniqueNumber: 137,
    pillar: 2,
    tags: ['performance', 'xhr', 'sync', 'blocking'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/XMLHttpRequest/.test(lines[i]) && !/new\s+ActiveXObject/.test(lines[i])) continue;
        if (/async\s*:\s*true|async\s*=\s*true/.test(lines[i])) continue;
        if (/async\s*:\s*false|async\s*=\s*false/.test(lines[i])) continue;
        const ln = i + 1;
        const isSync = /open\s*\([^)]*\bfalse\b/.test(lines[i]) || /async\s*:\s*false/.test(lines.slice(i, i + 10).join(' '));
        if (!isSync) continue;
        this.emit(ctx, {
          title: 'Synchronous XMLHttpRequest — Blocks Main Thread',
          message: 'Sync XHR at line ' + ln + '. Blocks the main thread until response arrives. If server is slow, the entire page freezes for seconds.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 90,
          remediation: 'Use fetch() with await/async instead. Remove async: false. Sync XHR is deprecated in modern browsers.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-016 — innerHTML in loop ───────────── */
export class InnerHTMLInLoopRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-016',
    name: 'innerHTML Assignment in Loop — Reflow per Iteration',
    description: 'Detects innerHTML assignment inside a loop causing forced reflows per iteration',
    category: 'performance-event-loop',
    severity: 'high',
    techniqueNumber: 138,
    pillar: 2,
    tags: ['performance', 'innerhtml', 'reflow', 'loop'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.innerHTML\s*=/.test(lines[i])) continue;
        const isInLoop = lines.slice(Math.max(0, i - 5), i + 1).some(l => /for\s*\(|\.map\s*\(|\.forEach\s*\(|while\s*\(/.test(l));
        if (!isInLoop) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'innerHTML Assignment in Loop — N Reflows',
          message: 'innerHTML at line ' + ln + ' inside a loop. Each assignment forces the browser to reparse HTML, recalculate styles, and reflow layout.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 78,
          remediation: 'Build the HTML string first, then assign once after the loop. Or use DocumentFragment for DOM creation.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-017 — Forced reflow (read + write in same frame) ───────────── */
export class ForcedReflowRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-017',
    name: 'Forced Reflow — Reading Layout After DOM Write',
    description: 'Detects reading layout properties (offsetHeight, scrollTop) immediately after DOM write',
    category: 'performance-event-loop',
    severity: 'high',
    techniqueNumber: 139,
    pillar: 2,
    tags: ['performance', 'reflow', 'layout', 'forced-reflow'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/style\.\w+\s*=|\.className\s*=|\.classList\s*\./.test(lines[i])) continue;
        const nextLine = lines[i + 1] || '';
        const readAfterWrite = /offsetHeight|offsetTop|offsetLeft|offsetWidth|scrollTop|scrollLeft|clientHeight|clientWidth|getBoundingClientRect|getComputedStyle/.test(nextLine);
        if (!readAfterWrite) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Forced Reflow — Layout Read After DOM Write',
          message: 'DOM write at line ' + ln + ' followed by layout read at line ' + (ln + 1) + '. Forces synchronous reflow, undoing batched async layout.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Batch all DOM reads first, then all writes. Or use requestAnimationFrame to separate read/write frames.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-018 — DocumentFragment not used for batch DOM ───────────── */
export class MissingDocumentFragmentRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-018',
    name: 'Missing DocumentFragment — Batch DOM Append in Loop',
    description: 'Detects appendChild in a loop without DocumentFragment',
    category: 'performance-event-loop',
    severity: 'medium',
    techniqueNumber: 140,
    pillar: 2,
    tags: ['performance', 'dom', 'fragment', 'batch'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/appendChild|append\(/.test(lines[i])) continue;
        const isInLoop = lines.slice(Math.max(0, i - 5), i + 1).some(l => /for\s*\(|\.map\s*\(|\.forEach\s*\(|while\s*\(/.test(l));
        if (!isInLoop) continue;
        if (/\bDocumentFragment|createDocumentFragment|fragment/.test(lines.slice(Math.max(0, i - 10), i + 1).join(' '))) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing DocumentFragment — DOM Append in Loop',
          message: 'appendChild at line ' + ln + ' inside loop without DocumentFragment. Each append triggers synchronous layout recalculation.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Create a DocumentFragment before the loop, append nodes to it inside the loop, then append the fragment to the DOM once.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-019 — Too many DOM event listeners ───────────── */
export class TooManyEventListenersRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-019',
    name: 'Excessive Event Listeners — Bubbling/Dispatch Overhead',
    description: 'Detects addEventListener in loop creating many listeners instead of delegation',
    category: 'performance-event-loop',
    severity: 'medium',
    techniqueNumber: 141,
    pillar: 2,
    tags: ['performance', 'events', 'listener', 'delegation'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/addEventListener|\.on\w+\s*=/.test(lines[i])) continue;
        const isInLoop = lines.slice(Math.max(0, i - 5), i + 1).some(l => /for\s*\(|\.map\s*\(|\.forEach\s*\(|while\s*\(/.test(l));
        if (!isInLoop) continue;
        if (/event\.target|e\.target|event\.currentTarget|delegat/i.test(lines.slice(Math.max(0, i - 5), i + 10).join(' '))) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Event Listener in Loop — Missing Event Delegation',
          message: 'addEventListener at line ' + ln + ' inside loop. Each element gets its own listener, consuming memory and dispatch time. 1000 items = 1000 listeners.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
          remediation: 'Use event delegation: attach ONE listener to parent and use event.target to identify child. For React, inline onClick already delegates.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-020 — Debounce/throttle missing on resize/scroll ───────────── */
export class MissingDebounceScrollRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-020',
    name: 'No Debounce/Throttle on Scroll/Resize — Excessive Handler Calls',
    description: 'Detects scroll/resize event handlers without debounce or throttle',
    category: 'performance-event-loop',
    severity: 'medium',
    techniqueNumber: 143,
    pillar: 2,
    tags: ['performance', 'debounce', 'throttle', 'scroll', 'resize'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/scroll|resize/i.test(lines[i])) continue;
        if (!/addEventListener|\.onscroll|\.onresize/.test(lines[i])) continue;
        if (/debounce|throttle|_.debounce|_.throttle|lodash|requestAnimationFrame/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'No Debounce/Throttle on Scroll/Resize Handler',
          message: 'Scroll/resize handler at line ' + ln + ' without debounce or throttle. Fires 30-100 times per second. Expensive handlers cause jank and dropped frames.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Wrap handler with debounce(handler, 150) for scroll, or throttle(handler, 100) for resize. Use requestAnimationFrame for visual updates.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-021 — requestIdleCallback not used ───────────── */
export class MissingIdleCallbackRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-021',
    name: 'Non-Critical Work on Main Thread — Use requestIdleCallback',
    description: 'Detects heavy non-urgent work (analytics, prefetch, logging) on main thread',
    category: 'performance-event-loop',
    severity: 'low',
    techniqueNumber: 144,
    pillar: 2,
    tags: ['performance', 'idle-callback', 'main-thread'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/analytics|prefetch|preload|track|log\s*\(|sendBeacon|report/.test(lines[i])) continue;
        if (/requestIdleCallback|setTimeout\s*\(.*,.*[1-9]\d{2,}|queueMicrotask/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Non-Critical Work on Main Thread — Use requestIdleCallback',
          message: 'Heavy non-urgent call at line ' + ln + ' runs on main thread synchronously. If called during interaction, it delays response by 50-200ms.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
          remediation: 'Wrap non-critical work in requestIdleCallback(() => { ... }, { timeout: 2000 }). For analytics, use sendBeacon().',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-022 — History.replaceState/pushState in loop ───────────── */
export class HistoryInLoopRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-022',
    name: 'History API in Loop — Scroll/Session Flood',
    description: 'Detects pushState/replaceState inside loops',
    category: 'performance-event-loop',
    severity: 'medium',
    techniqueNumber: 145,
    pillar: 2,
    tags: ['performance', 'history', 'loop', 'session'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(pushState|replaceState)/.test(lines[i])) continue;
        const isInLoop = lines.slice(Math.max(0, i - 5), i + 1).some(l => /for\s*\(|\.map\s*\(|\.forEach\s*\(|while\s*\(/.test(l));
        if (!isInLoop) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'History API Call in Loop — Session History Flood',
          message: 'pushState/replaceState at line ' + ln + ' inside a loop. Each call modifies browser session history, potentially causing memory growth and broken back button.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Move history calls outside the loop. Debounce scroll-based history updates to once per second at most.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-023 — scrollIntoView without behavior ───────────── */
export class ScrollIntoViewJankRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-023',
    name: 'scrollIntoView Without block/behavior — Forced Layout',
    description: 'Detects scrollIntoView calls causing synchronous layout',
    category: 'performance-event-loop',
    severity: 'low',
    techniqueNumber: 146,
    pillar: 2,
    tags: ['performance', 'scroll', 'layout', 'jank'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.scrollIntoView/.test(lines[i])) continue;
        if (/behavior\s*[:=]\s*[''"]smooth[''"]/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'scrollIntoView Without smooth behavior',
          message: 'scrollIntoView at line ' + ln + ' without { behavior: "smooth" }. Instant scroll forces layout recalculation and may cause user disorientation.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 25,
          remediation: 'Use element.scrollIntoView({ behavior: "smooth", block: "center" }). For instant scroll, use CSS scroll-behavior: smooth.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-024 — Missing will-change for animations ───────────── */
export class MissingWillChangeRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-024',
    name: 'Missing will-change — No Compositor Hint for Animations',
    description: 'Detects CSS animations/transitions without will-change property',
    category: 'performance-event-loop',
    severity: 'low',
    techniqueNumber: 147,
    pillar: 2,
    tags: ['performance', 'animation', 'compositor', 'will-change'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/transition|animation|@keyframes|transform\s*:|opacity\s*:/.test(lines[i])) continue;
        if (/will-change/.test(lines[i])) continue;
        if (/transform|opacity/.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Missing will-change — Animation Not Composited',
            message: 'Transition/animation at line ' + ln + ' without will-change. Browser treats as paint + layout instead of compositor-only. Stutters on 60fps.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 35,
            remediation: 'Add will-change: transform (or opacity) to elements you animate. Avoid overuse — remove will-change after animation ends.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-EVENT-025 — IntersectionObserver not used for visibility ───────────── */
export class MissingIntersectionObserverRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-EVENT-025',
    name: 'Missing IntersectionObserver — Scroll-Based Visibility Check on Main Thread',
    description: 'Detects getBoundingClientRect or offsetTop in scroll handlers (should use IntersectionObserver)',
    category: 'performance-event-loop',
    severity: 'high',
    techniqueNumber: 148,
    pillar: 2,
    tags: ['performance', 'intersection-observer', 'scroll', 'visibility'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/getBoundingClientRect|offsetTop|offsetLeft|scrollTop|scrollLeft/.test(lines[i])) continue;
        const inScroll = lines.slice(Math.max(0, i - 10), i + 1).some(l => /scroll|touchmove|wheel/.test(l));
        if (!inScroll) continue;
        if (/IntersectionObserver/.test(lines.slice(Math.max(0, i - 20), i + 1).join(' '))) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing IntersectionObserver — Layout Read in Scroll Handler',
          message: 'Layout read (offsetTop/getBoundingClientRect) at line ' + ln + ' inside scroll handler. Forces synchronous layout per scroll frame. Use IntersectionObserver.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Replace scroll handler + offsetTop checks with IntersectionObserver. Observers are async and composited off main thread.',
        });
      }
    }
  }
}
