import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';

/* ───────────── Rule: PERF-MEM-001 — React closure leak (useEffect without cleanup) ───────────── */
export class ReactClosureLeakRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-001',
    name: 'React Closure Leak — useEffect Without Cleanup',
    description: 'Detects window.addEventListener, WebSocket, or setInterval inside useEffect without returned cleanup function',
    category: 'performance-memory',
    severity: 'high',
    techniqueNumber: 51,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'react', 'useEffect', 'cleanup'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const useEffectMatch = line.match(/useEffect\s*\(\s*\(\)\s*=>/);
        if (!useEffectMatch) continue;

        let hasAddEventListener = false;
        let hasWebSocket = false;
        let hasSetInterval = false;
        let hasCleanup = false;
        let braceDepth = 0;
        let started = false;
        let eventLine = 0;

        for (let j = i; j < lines.length && j < i + 30; j++) {
          const l = lines[j];
          if (l.includes('=>') && l.includes('{')) started = true;

          if (started) {
            if (l.includes('addEventListener') || l.includes('onmessage') || l.includes('onopen')) {
              hasAddEventListener = true;
              if (eventLine === 0) eventLine = j + 1;
            }
            if (l.includes('new WebSocket') || l.includes('new EventSource')) {
              hasWebSocket = true;
              if (eventLine === 0) eventLine = j + 1;
            }
            if (l.includes('setInterval')) {
              hasSetInterval = true;
              if (eventLine === 0) eventLine = j + 1;
            }
            if (l.includes('removeEventListener') || l.includes('clearInterval') || l.includes('close()') || l.includes('websocket?.close') || l.includes('unsubscribe')) {
              hasCleanup = true;
            }

            for (const ch of l) {
              if (ch === '{') braceDepth++;
              if (ch === '}') braceDepth--;
            }
            if (braceDepth <= 0 && started) break;
          }
        }

        if ((hasAddEventListener || hasWebSocket || hasSetInterval) && !hasCleanup) {
          const type = hasAddEventListener ? 'addEventListener' : hasWebSocket ? 'WebSocket/EventSource' : 'setInterval';
          this.emit(ctx, {
            title: `React Memory Leak — ${type} in useEffect Without Cleanup`,
            message: `${type} registered in useEffect at line ${eventLine} but no cleanup function returned. Component unmount will leak ${type === 'setInterval' ? 'timer' : 'event listener/connection'}.`,
            file: p.file,
            line: eventLine,
            snippet: lines.slice(i, eventLine + 1).join('\n').slice(0, 300),
            confidence: 90,
            remediation: `Return a cleanup function from useEffect that removes the ${type === 'setInterval' ? 'interval with clearInterval' : type === 'addEventListener' ? 'listener with removeEventListener' : 'closes the connection'}.`,
            autoFixCode: `// Before:\nuseEffect(() => { window.addEventListener('scroll', handler); }, []);\n// After:\nuseEffect(() => { window.addEventListener('scroll', handler); return () => window.removeEventListener('scroll', handler); }, []);`,
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-002 — Unbounded in-memory cache ───────────── */
export class UnboundedCacheRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-002',
    name: 'Unbounded In-Memory Cache — Missing LRU Eviction',
    description: 'Detects Map or Object used as data cache without LRU eviction, size limits, or TTL',
    category: 'performance-memory',
    severity: 'medium',
    techniqueNumber: 81,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'cache', 'lru'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cacheInit = line.match(/(?:const|let|var)\s+(\w+Cache|cache\w*|store|memo)\s*=\s*(?:new\s+Map|new\s+WeakMap|\{\}|new\s+Object)\s*\(?/i);
        if (!cacheInit) continue;

        const cacheVar = cacheInit[1];
        let hasEviction = false;
        let hasTTL = false;
        let hasSizeLimit = false;

        for (let j = i; j < Math.min(i + 60, lines.length); j++) {
          const l = lines[j];
          if (l.includes('LRU') || l.includes('lru-cache') || l.includes('lruCache') || l.includes('expire')) hasEviction = true;
          if (l.includes('TTL') || l.includes('ttl') || l.includes('maxAge') || l.includes('expire') || l.includes('deleteAfter')) hasTTL = true;
          if (l.includes('maxSize') || l.includes('max') && l.includes('size') || l.includes('limit')) hasSizeLimit = true;
        }

        if (!hasEviction && !hasTTL && !hasSizeLimit) {
          this.emit(ctx, {
            title: 'Unbounded In-Memory Cache — No Eviction Strategy',
            message: `Cache "${cacheVar}" initialized at line ${i + 1} with no LRU eviction, TTL, or size limit. This grows indefinitely and will cause OOM under load.`,
            file: p.file,
            line: i + 1,
            snippet: line.slice(0, 150),
            confidence: 80,
            remediation: 'Use lru-cache package with explicit max size and TTL. Or implement periodic cleanup for Map-based caches.',
            autoFixCode: `// Before:\nconst cache = new Map();\n// After:\nimport LRU from 'lru-cache';\nconst cache = new LRU({ max: 500, ttl: 1000 * 60 * 5 });`,
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-003 — Connection pool inside route handler ───────────── */
export class ConnectionPoolExhaustionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-003',
    name: 'Connection Pool Exhaustion — Pool Inside Route Handler',
    description: 'Detects new Pool() instantiated inside request route handlers instead of module scope',
    category: 'performance-memory',
    severity: 'critical',
    techniqueNumber: 91,
    pillar: 2,
    tags: ['performance', 'connection-pool', 'database', 'exhaustion'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const handlerStart = line.match(/(?:app|router|route)\.(?:get|post|put|patch|delete|all)\s*\(\s*['"][^'"]+['"]\s*,\s*(?:async\s*)?\(/);
        if (!handlerStart) continue;

        let braceDepth = 0;
        let started = false;
        let poolLine = 0;

        for (let j = i; j < Math.min(i + 20, lines.length); j++) {
          const l = lines[j];
          if (l.includes('=>') && l.includes('{')) started = true;

          if (started) {
            const poolMatch = l.match(/new\s+Pool\s*\(|new\s+Client\s*\(|new\s+Connection\s*\(|createPool|createConnection/i);
            if (poolMatch && !l.includes('if') && !l.includes('typeof')) {
              poolLine = j + 1;
            }

            for (const ch of l) {
              if (ch === '{') braceDepth++;
              if (ch === '}') braceDepth--;
            }
            if (braceDepth <= 0) break;
          }
        }

        if (poolLine > 0) {
          this.emit(ctx, {
            title: 'Connection Pool Exhaustion — Pool Created Inside Route Handler',
            message: `new Pool() / new Client() created inside route handler at line ${poolLine}. A new pool is created per request, exhausting database connections.`,
            file: p.file,
            line: poolLine,
            snippet: lines.slice(poolLine - 1, poolLine + 1).join('\n'),
            confidence: 92,
            remediation: 'Move pool initialization to module scope (top level). Create the pool once at server startup and reuse across all requests.',
            autoFixCode: `// Move to module level:\nconst pool = new Pool({ connectionString: process.env.DATABASE_URL });\napp.get('/users', async (req, res) => {\n  const result = await pool.query('SELECT * FROM users');\n});`,
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-004 — Timer leak (unpaired setInterval) ───────────── */
export class TimerLeakRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-004',
    name: 'Timer Leak — Unpaired setInterval Reference',
    description: 'Detects setInterval calls where the returned interval ID is not captured for later clearInterval',
    category: 'performance-memory',
    severity: 'medium',
    techniqueNumber: 71,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'timer', 'interval'],
  };

  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const intervalCall = line.match(/setInterval\s*\(/);
        if (!intervalCall) continue;

        const hasAssignment = /(?:const|let|var)\s+\w+\s*=/.test(line);
        if (hasAssignment) continue;

        const hasClearInFile = lines.some(l => l.includes('clearInterval'));
        const confidence = hasClearInFile ? 40 : 70;

        this.emit(ctx, {
          title: 'Timer Leak — Uncaptured setInterval Reference',
          message: `setInterval at line ${i + 1} does not capture the returned interval ID${hasClearInFile ? ' (clearInterval exists in file but may not be linked)' : ''}. Timer cannot be cleared and will run indefinitely.`,
          file: p.file,
          line: i + 1,
          snippet: line.slice(0, 200),
          confidence,
          remediation: 'Capture the interval ID: const intervalId = setInterval(...), and clear it with clearInterval(intervalId) when no longer needed.',
          autoFixCode: `// Before:\nsetInterval(() => pollUpdates(), 5000);\n// After:\nconst pollTimer = setInterval(() => pollUpdates(), 5000);\n// Later: clearInterval(pollTimer);`,
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-005 — DOM node reference leak (detached DOM) ───────────── */
export class DetachedDOMLeakRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-005',
    name: 'DOM Node Reference Leak — Detached DOM Tree',
    description: 'Detects variables storing DOM element references that survive parent removal causing detached DOM trees',
    category: 'performance-memory',
    severity: 'medium',
    techniqueNumber: 52,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'dom', 'detached'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/querySelector|getElementById|getElementsByClassName|getElementsByTagName|createElement|cloneNode/i.test(lines[i])) continue;
        if (!/(?:const|let|var)\s+\w+\s*=/.test(lines[i])) continue;
        if (/\.remove\s*\(|\.innerHTML\s*=\s*[''']|\.parentNode|removeChild/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'DOM Node Reference Leak — Detached DOM Risk',
          message: 'DOM element stored in variable at line ' + ln + ' without reference nullification on removal. Creates detached DOM tree that GC cannot collect.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 55,
          remediation: 'Set DOM references to null when elements are removed from the DOM. Use weak references if cache-like behavior is needed.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-006 — IntersectionObserver without disconnect ───────────── */
export class ObserverUnsubscribeRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-006',
    name: 'IntersectionObserver / MutationObserver Leak — Missing disconnect()',
    description: 'Detects IntersectionObserver, MutationObserver, or ResizeObserver without disconnect() in cleanup',
    category: 'performance-memory',
    severity: 'medium',
    techniqueNumber: 53,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'observer', 'intersection-observer'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/new\s+(?:IntersectionObserver|MutationObserver|ResizeObserver)\s*\(/.test(lines[i])) continue;
        const hasDisconnect = lines.slice(i, i + 30).some(l => /\.disconnect\s*\(/.test(l));
        if (hasDisconnect) continue;
        const observerType = lines[i].match(/new\s+(IntersectionObserver|MutationObserver|ResizeObserver)/)?.[1] || 'Observer';
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Observer Leak — ' + observerType + ' Without disconnect()',
          message: observerType + ' at line ' + ln + ' never calls disconnect(). Observer keeps a reference to the callback and target element, preventing GC.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 78,
          remediation: 'Store observer reference and call .disconnect() in component cleanup / destructor.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-007 — EventEmitter too many listeners ───────────── */
export class EventEmitterLeakRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-007',
    name: 'EventEmitter Listener Leak — Unbounded Listener Registration',
    description: 'Detects .on()/.addListener() calls without corresponding .off()/.removeListener() in the same scope',
    category: 'performance-memory',
    severity: 'high',
    techniqueNumber: 54,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'eventemitter', 'listener'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.(?:on|addListener)\s*\([''']\w+[''']\s*,/i.test(lines[i])) continue;
        const listenerName = lines[i].match(/\.(?:on|addListener)\s*\(['''](\w+)[''']/i)?.[1] || '';
        const hasRemove = lines.slice(Math.max(0, i - 3), i + 30).some(l => new RegExp('(?:off|removeListener)\\s*\\([\'"]' + listenerName + '[\'"]').test(l));
        if (hasRemove) continue;
        if (/\bsetMaxListeners|setMaxListers\b/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'EventEmitter Listener Leak — ' + listenerName + ' Never Removed',
          message: 'Listener "' + listenerName + '" registered at line ' + ln + ' without corresponding .off() in the same scope. Each registration leaks memory on repeated calls.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 72,
          remediation: 'Always pair .on() with .off() in cleanup logic. Use .once() for one-shot events. Set emitter.setMaxListeners(0) only if intentional.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-008 — Closure capturing large object ───────────── */
export class ClosureLargeCaptureRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-008',
    name: 'Closure Capturing Large Object — Unintentional Memory Retention',
    description: 'Detects closures that capture large variables (big arrays, buffers, DOM) preventing GC of the captured data',
    category: 'performance-memory',
    severity: 'medium',
    techniqueNumber: 55,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'closure', 'capture'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/=>|function\s*\(/.test(lines[i])) continue;
        const capturedLarge = lines[i].match(/(?:bigArray|largeData|buffer|allUsers|fullList|entireCollection|hugePayload|allRecords|fullResults|bigResult|totalData|completeSet)/i);
        if (!capturedLarge) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Closure Capturing Large Object — Memory Retention',
          message: 'Closure at line ' + ln + ' captures "' + capturedLarge[0] + '" which may be a large data structure. The entire object is retained in memory as long as the closure lives.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 50,
          remediation: 'Pass only required fields to closures. Use nullification: const neededField = largeObject.field; const fn = () => use(neededField); Set largeObject = null.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-009 — requestAnimationFrame without cancel ───────────── */
export class RAFWithoutCancelRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-009',
    name: 'requestAnimationFrame Loop Without cancelAnimationFrame',
    description: 'Detects requestAnimationFrame recursion without storing the frame ID for cancellation',
    category: 'performance-memory',
    severity: 'low',
    techniqueNumber: 56,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'animation-frame', 'raf'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/requestAnimationFrame\s*\(/.test(lines[i])) continue;
        const ln = i + 1;
        const hasAssignment = /(?:const|let|var)\s+\w+\s*=.*requestAnimationFrame/.test(lines[i]);
        const hasCancel = lines.slice(i, i + 15).some(l => /cancelAnimationFrame/.test(l));
        if (!hasAssignment && !hasCancel) {
          this.emit(ctx, {
            title: 'requestAnimationFrame Loop Without Cancellation',
            message: 'requestAnimationFrame at line ' + ln + ' does not store the frame ID. Cannot cancel on unmount, animation runs forever.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
            remediation: 'Capture the RAF ID: const frameId = requestAnimationFrame(tick); and cancel: cancelAnimationFrame(frameId);',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-010 — Subscription leak (RxJS/observable) ───────────── */
export class SubscriptionLeakRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-010',
    name: 'RxJS / Observable Subscription Leak — Missing Unsubscribe',
    description: 'Detects .subscribe() calls on Observables without .unsubscribe() or takeUntil in the same scope',
    category: 'performance-memory',
    severity: 'high',
    techniqueNumber: 57,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'rxjs', 'observable', 'subscription'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.subscribe\s*\(/.test(lines[i])) continue;
        const hasUnsubscribe = lines.slice(i, i + 15).some(l => /\.unsubscribe\s*\(|takeUntil|take\s*\(1\)|first\s*\(|pipe.*take/i.test(l));
        if (hasUnsubscribe) continue;
        const hasSubscriptionObj = lines.slice(i, i + 5).some((l, idx) => {
          const before = lines.slice(Math.max(0, i - 3), i).join(' ');
          return /(?:const|let|var)\s+\w+\s*=\s*/.test(before) || /\+\=|sub\.add/.test(before);
        });
        if (!hasSubscriptionObj) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'RxJS Subscription Leak — No Unsubscribe',
            message: 'Observable subscription at line ' + ln + ' without .unsubscribe() or takeUntil. Subscription lives forever, preventing GC of the observer chain.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
            remediation: 'Store subscription and call .unsubscribe() on component destroy. Or use takeUntil(destroy$) pattern.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-011 — setInterval in class component without cleanup ───────────── */
export class ClassTimerLeakRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-011',
    name: 'Class Component Timer Leak — setInterval in componentDidMount Without clearInterval in componentWillUnmount',
    description: 'Detects setInterval in React class componentDidMount without matching clearInterval in componentWillUnmount',
    category: 'performance-memory',
    severity: 'high',
    techniqueNumber: 72,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'timer', 'react', 'class-component'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      let hasMountInterval = false;
      let hasUnmountClear = false;
      let intervalLine = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('componentDidMount') && lines[i].includes('setInterval')) {
          hasMountInterval = true;
          intervalLine = i + 1;
        }
        if (lines[i].includes('componentWillUnmount') && /clearInterval|clearTimeout/.test(lines[i])) hasUnmountClear = true;
      }
      if (hasMountInterval && !hasUnmountClear) {
        this.emit(ctx, {
          title: 'Class Component Timer Leak — setInterval Without Cleanup',
          message: 'setInterval in componentDidMount at line ' + intervalLine + ' but componentWillUnmount does not clear it. Timer and callback survive unmount.',
          file: p.file, line: intervalLine, snippet: lines[intervalLine - 1].slice(0, 250), confidence: 85,
          remediation: 'Store timer ID as this.timer and call clearInterval(this.timer) in componentWillUnmount.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-012 — Console.log in production (retained objects) ───────────── */
export class ConsoleLogRetentionRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-012',
    name: 'Console.log in Production — Retained Object References',
    description: 'Detects console.log/table/dir of large objects that devtools console retains in memory',
    category: 'performance-memory',
    severity: 'low',
    techniqueNumber: 58,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'console', 'retention'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/console\.(?:log|dir|table|group|info|warn|error)\s*\(/.test(lines[i])) continue;
        if (/\b(password|secret|token|key|auth|cookie|session)\b/i.test(lines[i])) continue;
        const largeObject = lines[i].match(/(?:req|res|body|data|result|response|users|items|list|config|state|store|all|full|entire)/i);
        if (!largeObject && !lines[i].includes('JSON.stringify')) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Console.log in Production — Object Retention',
          message: 'console.log of "' + (largeObject?.[0] || 'large data') + '" at line ' + ln + '. DevTools retains logged objects in memory. Logging large objects causes OOM in long-running sessions.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 40,
          remediation: 'Remove console.log in production code. Use structured logging libraries (pino, winston) that serialize and discard.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-013 — WebSocket reconnect backoff leak ───────────── */
export class WebSocketReconnectLeakRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-013',
    name: 'WebSocket Infinite Reconnect — No Backoff Cap / Retry Limit',
    description: 'Detects WebSocket reconnect logic without maximum retry count or exponential backoff cap',
    category: 'performance-memory',
    severity: 'medium',
    techniqueNumber: 59,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'websocket', 'reconnect', 'backoff'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/onclose|onerror|reconnect|onClose|onError|websocket.*reconnect/i.test(lines[i])) continue;
        if (!/new\s+WebSocket|ws\s*=\s*new/.test(lines[i]) && !/setTimeout.*reconnect/.test(lines[i])) continue;
        if (/(?:maxRetries|maxAttempts|retryCount|retryLimit|maxReconnects|maxBackoff|exponentialBackoff|capped|capBackoff|attempts\s*<\s*\d+)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'WebSocket Infinite Reconnect — No Retry Limit',
          message: 'WebSocket reconnect at line ' + ln + ' has no maximum retry limit or backoff cap. Under network failure, infinite reconnects flood server and memory.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Add retry counter: maxRetries = 10, exponential backoff with cap. Clear reconnect timer on component unmount.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-014 — Large inline data in source ───────────── */
export class LargeInlineDataRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-014',
    name: 'Large Inline Data in Source — Bundle Memory Bloat',
    description: 'Detects large JSON/base64 strings or large arrays inlined in source code',
    category: 'performance-memory',
    severity: 'low',
    techniqueNumber: 60,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'inline-data', 'bundle'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const base64Len = (lines[i].match(/[A-Za-z0-9+/=]{100,}/g) || []).reduce((a, b) => a + b.length, 0);
        const jsonObjLen = (lines[i].match(/\{[^{}]{200,}\}/g) || []).reduce((a, b) => a + b.length, 0);
        const largeArr = lines[i].match(/\[[\w\s,'"]{200,}\]/) && /\w{5,}.*:/.test(lines[i]) ? 200 : 0;
        if (base64Len > 500 || jsonObjLen > 500 || largeArr > 0) {
          const type = base64Len > 500 ? 'base64' : jsonObjLen > 500 ? 'JSON object' : 'array';
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Large Inline Data in Source — Bundle Bloat',
            message: 'Large ' + type + ' (' + Math.max(base64Len, jsonObjLen, largeArr) + ' chars) at line ' + ln + '. Inlined data increases bundle size and is retained for app lifetime.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 200), confidence: 70,
            remediation: 'Move large data to separate JSON files, lazy load, or fetch from API at runtime.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-015 — Circular reference in data structure ───────────── */
export class CircularReferenceLeakRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-015',
    name: 'Circular Reference in Data Structure — Memory Leak / JSON.stringify Throws',
    description: 'Detects patterns that create circular references (obj.self = obj, parent-child cycles)',
    category: 'performance-memory',
    severity: 'medium',
    techniqueNumber: 61,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'circular', 'reference'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/(?:\.self\s*=|\.parent\s*=|\.owner\s*=|\.ref\s*=|circular|cycle|\.next\s*=|\.prev\s*=)/i.test(lines[i])) continue;
        if (!/(?:this|obj|item|node|element|record|entry|model|doc)\..*=\s*(?:this|obj|item|node|element|record|entry|model|doc)/i.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Circular Reference — Memory Leak / JSON.stringify Error',
          message: 'Circular reference pattern at line ' + ln + '. obj.self = obj creates a cycle that prevents GC. JSON.stringify throws TypeError on circular objects.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Use WeakRef or remove the circular link when done. For tree structures, implement a proper dispose pattern.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-016 — Large string concatenation in loop ───────────── */
export class StringConcatLeakRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-016',
    name: 'String Concatenation in Loop — O(n^2) Memory Allocation',
    description: 'Detects += string concatenation inside loops creating new string allocations per iteration',
    category: 'performance-memory',
    severity: 'medium',
    techniqueNumber: 62,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'string', 'concat', 'loop'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\+\s*=\s*[''']|str\s*\+=\s*|html\s*\+=\s*|output\s*\+=\s*|res\s*\+=\s*/i.test(lines[i])) continue;
        const isInLoop = lines.slice(Math.max(0, i - 5), i + 1).some(l => /for\s*\(|\.map\s*\(|\.forEach\s*\(|while\s*\(/.test(l));
        if (!isInLoop) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'String Concatenation in Loop — O(n^2) Memory',
          message: 'String += at line ' + ln + ' inside a loop. Strings are immutable; each iteration allocates a new string copying the entire previous content. O(n^2) memory and time.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
          remediation: 'Use array.push() + .join("") or template literal array. For huge strings, use StringBuilder pattern.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-017 — URL.createObjectURL without revoke ───────────── */
export class ObjectURLNotRevokedRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-017',
    name: 'URL.createObjectURL Without revokeObjectURL — Blob Memory Leak',
    description: 'Detects createObjectURL calls without matching revokeObjectURL',
    category: 'performance-memory',
    severity: 'high',
    techniqueNumber: 63,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'blob', 'object-url'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/createObjectURL/.test(lines[i])) continue;
        const hasRevoke = lines.some(l => /revokeObjectURL/.test(l));
        if (!hasRevoke) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'createObjectURL Without revokeObjectURL — Blob Leak',
            message: 'createObjectURL at line ' + ln + ' has no matching revokeObjectURL in file. Each call allocates browser memory that persists until document unload.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 75,
            remediation: 'Call URL.revokeObjectURL(objectURL) after the blob is no longer needed, typically in a cleanup/effect return.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-018 — AbortController not aborted ───────────── */
export class AbortControllerLeakRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-018',
    name: 'AbortController / AbortSignal Never Aborted — Fetch/Stream Leak',
    description: 'Detects AbortController created without being aborted in cleanup',
    category: 'performance-memory',
    severity: 'medium',
    techniqueNumber: 64,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'abort-controller', 'fetch'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/new\s+AbortController/.test(lines[i])) continue;
        const hasAbort = lines.slice(i, i + 30).some(l => /\.abort\s*\(/.test(l));
        if (!hasAbort) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'AbortController Never Aborted — Leaked Fetch/Stream',
            message: 'AbortController at line ' + ln + ' is created but never aborted. In-flight requests and streams remain active until response completes or timeout.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
            remediation: 'Call controller.abort() in cleanup/useEffect return to cancel in-flight requests on unmount.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-019 — ResizeObserver loop limit ───────────── */
export class ResizeObserverLoopRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-019',
    name: 'ResizeObserver Unhandled Loop Error — Memory/CPU Leak',
    description: 'Detects ResizeObserver without error handling for the unavoidable loop limit',
    category: 'performance-memory',
    severity: 'medium',
    techniqueNumber: 65,
    pillar: 2,
    tags: ['performance', 'memory-leak', 'resize-observer', 'loop'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/new\s+ResizeObserver/.test(lines[i])) continue;
        const hasError = lines.slice(i, i + 20).some(l => /try|catch|error|loopLimit|onerror/i.test(l));
        if (!hasError) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'ResizeObserver Without Loop Error Handling',
            message: 'ResizeObserver at line ' + ln + ' has no error handler for the unavoidable ResizeObserver loop limit. Unhandled errors cause console spam and potential memory leak.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 45,
            remediation: 'Add error listener: window.addEventListener("error", e => { if (e.message.includes("ResizeObserver")) e.stopImmediatePropagation(); }).',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-020 — Missing React key prop in list ───────────── */
export class MissingReactKeyRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-020',
    name: 'Missing key Prop in List — Full DOM Re-render on Every Change',
    description: 'Detects .map() returning JSX elements without a unique key prop',
    category: 'performance-memory',
    severity: 'high',
    techniqueNumber: 66,
    pillar: 2,
    tags: ['performance', 'react', 'key-prop', 're-render'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.map\s*\(/.test(lines[i])) continue;
        if (!/=>\s*</.test(lines[i]) && !/=>\s*\(/.test(lines[i])) continue;
        const mapBlock = lines.slice(i, i + 15).join(' ');
        if (/\bkey\s*=\s*\{/.test(mapBlock)) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Missing key Prop in .map() — Full List Re-render',
          message: '.map() at line ' + ln + ' renders elements without a unique key prop. React re-creates all DOM nodes on every update. Slow lists, lost input focus, broken animations.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 85,
          remediation: 'Add key={item.id} to the root element returned by .map(). Use stable unique IDs, not array index.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-021 — Inline function in JSX ───────────── */
export class InlineFunctionJSXRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-021',
    name: 'Inline Function in JSX — New Closure on Every Render',
    description: 'Detects inline arrow functions in JSX props that create new closures on each render',
    category: 'performance-memory',
    severity: 'medium',
    techniqueNumber: 67,
    pillar: 2,
    tags: ['performance', 'react', 'inline-function', 're-render'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/onClick\s*=\s*\{?\s*\(?\s*\w*\s*\)?\s*=>|onChange\s*=\s*\{?\s*\(?\s*\w*\s*\)?\s*=>|onSubmit\s*=\s*\{?\s*\(?\s*\w*\s*\)?\s*=>/.test(lines[i])) continue;
        if (/\buseCallback\b/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'Inline Function in JSX — New Closure Every Render',
          message: 'Inline arrow function at line ' + ln + '. Creates a new function object on every render, breaking PureComponent/memo optimization and triggering child re-renders.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 65,
          remediation: 'Extract the handler: const handleClick = useCallback(() => { ... }, []). Or reference a component method.',
        });
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-022 — Large context value re-render ───────────── */
export class LargeContextReRenderRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-022',
    name: 'Large Context Value — All Consumers Re-render on Any Change',
    description: 'Detects React context providers with large objects as value causing unnecessary re-renders',
    category: 'performance-memory',
    severity: 'high',
    techniqueNumber: 68,
    pillar: 2,
    tags: ['performance', 'react', 'context', 're-render'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/\.Provider\s+value\s*=\s*\{/.test(lines[i])) continue;
        if (/\bvalue\s*=\s*\{[^}]{100,}/.test(lines[i]) || /value\s*=\s*\{\s*\{[^}]*\w+\s*,\s*\w+\s*,\s*\w+\s*,\s*\w+/.test(lines[i])) {
          const ln = i + 1;
          this.emit(ctx, {
            title: 'Large Context Value — Unnecessary Re-renders',
            message: 'Context provider at line ' + ln + ' passes a large object as value. Every consumer re-renders on ANY change to ANY field. Split contexts by concern.',
            file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 60,
            remediation: 'Split context into smaller contexts by concern (UserContext, ThemeContext). Use useMemo for value: value={useMemo(() => ({...}), [deps])}.',
          });
        }
      }
    }
  }
}

/* ───────────── Rule: PERF-MEM-023 — LocalStorage/SessionStorage writes in render ───────────── */
export class StorageWriteInRenderRule extends BaseRule {
  meta: RuleMeta = {
    id: 'PERF-MEM-023',
    name: 'localStorage/sessionStorage Write During Render — Sync I/O Blocks Paint',
    description: 'Detects localStorage.setItem or sessionStorage calls outside useEffect',
    category: 'performance-memory',
    severity: 'medium',
    techniqueNumber: 69,
    pillar: 2,
    tags: ['performance', 'storage', 'render', 'blocking'],
  };
  async execute(ctx: RuleContext): Promise<void> {
    for (const p of ctx.parsed) {
      const code = JSON.stringify(p.ast.program?.body || []);
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/localStorage\.setItem|sessionStorage\.setItem/.test(lines[i])) continue;
        if (/useEffect|useLayoutEffect/.test(lines[i])) continue;
        const ln = i + 1;
        this.emit(ctx, {
          title: 'localStorage Write During Render — Sync Blocking',
          message: 'Sync storage write at line ' + ln + ' outside useEffect. localStorage.setItem is synchronous I/O that blocks the main thread and delays paint.',
          file: p.file, line: ln, snippet: lines[i].slice(0, 250), confidence: 70,
          remediation: 'Move storage writes into useEffect or an event handler. Never call setItem during render.',
        });
      }
    }
  }
}
