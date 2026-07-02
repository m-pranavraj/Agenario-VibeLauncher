import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findFunctionCalls, findStringLiterals } from '../engine/ast-utils.js';

export class HTTP2NotEnabledRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-001', name: 'HTTP/2 Not Enabled', description: 'Detects HTTP/1.1 only servers missing HTTP/2 multiplexing', category: 'performance-event-loop', severity: 'medium', cwe: 'CWE-770', techniqueNumber: 217, pillar: 2, tags: ['http2', 'multiplexing', 'performance'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasHTTP2 = findStringLiterals(ctx.parsed, s => /http2|h2|spdy|http\/2/i.test(s));
    const hasServer = findStringLiterals(ctx.parsed, s => /createServer|app\.listen|http\.create/i.test(s));
    if (hasServer.length > 0 && hasHTTP2.length === 0) {
      this.emit(ctx, { title: 'HTTP/2 server push not enabled', message: 'Server detected without HTTP/2 — multiplexing could reduce latency by 30-50% for concurrent requests', file: '', line: 1, confidence: 70, remediation: 'Enable HTTP/2 via spdy or http2 module with ALPN negotiation' });
    }
  }
}

export class MissingConnectionPoolingRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-002', name: 'Missing Connection Pooling', description: 'Detects database/HTTP connections without pooling', category: 'performance-algorithmic', severity: 'high', cwe: 'CWE-405', techniqueNumber: 218, pillar: 2, tags: ['pooling', 'connection', 'database'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasPool = findFunctionCalls(ctx.parsed, c => c.fullName.includes('createPool') || c.fullName.includes('Pool') || c.fullName.includes('pool'));
    const hasDB = findStringLiterals(ctx.parsed, s => /pg\.connect|mysql\.createConnection|mongoose\.connect|prisma/i.test(s));
    if (hasDB.length > 0 && hasPool.length === 0) {
      this.emit(ctx, { title: 'No connection pooling configured', message: 'Database connections without pooling — each connection creates new TCP handshake, increasing latency', file: '', line: 1, confidence: 80, remediation: 'Use pg.Pool, mysql2 pool, or Prisma connection pooling with appropriate min/max limits' });
    }
  }
}

export class MissingCDNConfigRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-003', name: 'Missing CDN for Static Assets', description: 'Detects static assets served without CDN', category: 'performance-event-loop', severity: 'low', cwe: 'CWE-770', techniqueNumber: 219, pillar: 2, tags: ['cdn', 'static', 'cache'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasCDN = findStringLiterals(ctx.parsed, s => /cdn|cloudflare|cloudfront|akamai|fastly|cdnjs/i.test(s));
    const hasAssets = findStringLiterals(ctx.parsed, s => /\/static\/|\/assets\/|\.jpg|\.png|\.js|\.css/i.test(s));
    if (hasAssets.length > 3 && hasCDN.length === 0) {
      this.emit(ctx, { title: 'No CDN for static asset delivery', message: 'Static assets detected without CDN — users far from origin experience higher latency', file: '', line: 1, confidence: 65, remediation: 'Configure CDN (Cloudflare, CloudFront) to cache and serve static assets from edge locations' });
    }
  }
}

export class MissingCacheHeadersRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-004', name: 'Missing Cache Headers', description: 'Detects API responses without Cache-Control headers', category: 'performance-event-loop', severity: 'medium', cwe: 'CWE-770', techniqueNumber: 220, pillar: 2, tags: ['cache', 'headers', 'http'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasCacheHeader = findStringLiterals(ctx.parsed, s => /Cache-Control|cacheControl|max-age|s-maxage|etag|last-modified/i.test(s));
    const hasRes = findFunctionCalls(ctx.parsed, c => c.fullName.includes('res.json') || c.fullName.includes('res.send') || c.fullName.includes('Response'));
    if (hasRes.length > 0 && hasCacheHeader.length === 0) {
      this.emit(ctx, { title: 'API responses missing cache headers', message: 'API response methods found without Cache-Control headers — browsers won\'t cache, increasing repeat load times', file: '', line: 1, confidence: 75, remediation: 'Add Cache-Control, ETag, and Last-Modified headers to cacheable API responses' });
    }
  }
}

export class MissingResourceHintsRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-005', name: 'Missing Resource Hints (preload/prefetch)', description: 'Detects missing preload/prefetch hints for critical resources', category: 'performance-event-loop', severity: 'low', cwe: 'CWE-770', techniqueNumber: 221, pillar: 2, tags: ['preload', 'prefetch', 'hints'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasHints = findStringLiterals(ctx.parsed, s => /rel=["']preload["']|rel=["']prefetch["']|rel=["']preconnect["']|dns-prefetch/i.test(s));
    const hasCSS = findStringLiterals(ctx.parsed, s => /\.css|style\.|<link/i.test(s));
    if (hasCSS.length > 0 && hasHints.length === 0) {
      this.emit(ctx, { title: 'Critical resources without preload hints', message: 'CSS/font assets detected without preload/preconnect hints — browser discovers them late, delaying render', file: '', line: 1, confidence: 60, remediation: 'Add <link rel="preload"> for critical CSS/fonts and <link rel="preconnect"> for third-party origins' });
    }
  }
}

export class BundleNotOptimizedRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-006', name: 'JavaScript Bundle Not Optimized', description: 'Detects large bundle sizes without code splitting', category: 'performance-event-loop', severity: 'high', cwe: 'CWE-770', techniqueNumber: 222, pillar: 2, tags: ['bundle', 'webpack', 'vite'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasSplit = findStringLiterals(ctx.parsed, s => /import\s*\(|React\.lazy|lazy\(|dynamic\(|chunk|split/i.test(s));
    const hasImport = findStringLiterals(ctx.parsed, s => /import\s+.*\s+from|require\(/i.test(s));
    if (hasImport.length > 10 && hasSplit.length === 0) {
      this.emit(ctx, { title: 'No code splitting — large monolithic bundle', message: '10+ static imports detected without dynamic import() — single bundle blocks initial render', file: '', line: 1, confidence: 78, remediation: 'Implement code splitting with dynamic import() and React.lazy for route-based chunks' });
    }
  }
}

export class MissingTreeShakingRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-007', name: 'Missing Tree Shaking Configuration', description: 'Detects missing sideEffects config for tree shaking', category: 'performance-event-loop', severity: 'medium', cwe: 'CWE-770', techniqueNumber: 223, pillar: 2, tags: ['treeshaking', 'bundle', 'webpack'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasSideEffects = findStringLiterals(ctx.parsed, s => /"sideEffects"|'sideEffects'|sideEffects.*false/i.test(s));
    const hasPackageJson = ctx.graph?.routeMap?.endpoints?.some(e => e.path?.includes('package.json'));
    if (!hasSideEffects) {
      this.emit(ctx, { title: 'Tree shaking may be disabled', message: 'No sideEffects:false in package.json — unused exports may be included in production bundles', file: '', line: 1, confidence: 55, remediation: 'Add "sideEffects": false to package.json to enable aggressive tree shaking' });
    }
  }
}

export class MissingImageOptimizationRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-008', name: 'Unoptimized Image Assets', description: 'Detects large image files without optimization', category: 'performance-event-loop', severity: 'medium', cwe: 'CWE-770', techniqueNumber: 224, pillar: 2, tags: ['images', 'optimization', 'webp'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasWebP = findStringLiterals(ctx.parsed, s => /\.webp|next\/image|imgix|cloudinary|image.*optim/i.test(s));
    const hasImages = findStringLiterals(ctx.parsed, s => /\.jpg|\.png|\.gif|\.svg/i.test(s));
    if (hasImages.length > 2 && hasWebP.length === 0) {
      this.emit(ctx, { title: 'Images not using next-gen formats', message: 'PNG/JPEG images detected without WebP/AVIF conversion or image CDN — 30-50% larger than necessary', file: '', line: 1, confidence: 72, remediation: 'Convert images to WebP/AVIF, add responsive srcset, and use lazy loading with aspect ratio boxes' });
    }
  }
}

export class MissingGzipCompressionRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-009', name: 'Missing Gzip/Brotli Compression', description: 'Detects missing response compression middleware', category: 'performance-event-loop', severity: 'medium', cwe: 'CWE-770', techniqueNumber: 225, pillar: 2, tags: ['compression', 'gzip', 'brotli'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasCompression = findStringLiterals(ctx.parsed, s => /compression|brotli|gzip|deflate|zlib/i.test(s));
    const hasServer = findStringLiterals(ctx.parsed, s => /express|koa|fastify|hapi|app\.(get|post|use)/i.test(s));
    if (hasServer.length > 0 && hasCompression.length === 0) {
      this.emit(ctx, { title: 'No HTTP compression middleware', message: 'Server framework detected without compression — text responses 70% larger than necessary', file: '', line: 1, confidence: 85, remediation: 'Add compression middleware (compression npm package) or enable Brotli at reverse proxy level' });
    }
  }
}

export class MissingFontOptimizationRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-010', name: 'Unoptimized Web Font Loading', description: 'Detects web font loading without optimization (FOUT/FOIT)', category: 'performance-event-loop', severity: 'low', cwe: 'CWE-770', techniqueNumber: 226, pillar: 2, tags: ['fonts', 'optimization', 'fout'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasFontOpt = findStringLiterals(ctx.parsed, s => /font-display|swap|block|fallback|optional|preload.*font|font.*preload/i.test(s));
    const hasFonts = findStringLiterals(ctx.parsed, s => /@font-face|Google Fonts|fonts\.googleapis|\.woff2/i.test(s));
    if (hasFonts.length > 0 && hasFontOpt.length === 0) {
      this.emit(ctx, { title: 'Web fonts without optimization', message: 'Custom fonts loaded without font-display:swap — invisible text blocks rendering (FOIT)', file: '', line: 1, confidence: 68, remediation: 'Add font-display:swap to @font-face, preload critical fonts, and subset font files' });
    }
  }
}

export class MissingSSRStreamingRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-011', name: 'Missing SSR Streaming', description: 'Detects SSR without streaming for faster TTFB', category: 'performance-event-loop', severity: 'medium', cwe: 'CWE-770', techniqueNumber: 227, pillar: 2, tags: ['ssr', 'streaming', 'react'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasStream = findStringLiterals(ctx.parsed, s => /renderToPipeableStream|renderToNodeStream|stream|Suspense/i.test(s));
    const hasSSR = findStringLiterals(ctx.parsed, s => /renderToString|renderToStaticMarkup|hydrate|Next\.js/i.test(s));
    if (hasSSR.length > 0 && hasStream.length === 0) {
      this.emit(ctx, { title: 'SSR without streaming', message: 'Server-side rendering detected without renderToPipeableStream — TTFB delayed until full HTML generation', file: '', line: 1, confidence: 72, remediation: 'Migrate from renderToString to renderToPipeableStream for progressive HTML streaming' });
    }
  }
}

export class MissingServiceWorkerRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-012', name: 'Missing Service Worker Cache', description: 'Detects missing service worker for offline/cache-first', category: 'performance-event-loop', severity: 'low', cwe: 'CWE-770', techniqueNumber: 228, pillar: 2, tags: ['service-worker', 'offline', 'pwa'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasSW = findStringLiterals(ctx.parsed, s => /serviceWorker|navigator\.serviceWorker|workbox|sw\.js/i.test(s));
    const hasApp = findStringLiterals(ctx.parsed, s => /index\.html|app\.(ts|js)x?|main\.(ts|js)x?/i.test(s));
    if (hasApp.length > 0 && hasSW.length === 0) {
      this.emit(ctx, { title: 'No service worker for caching', message: 'Web application detected without service worker — no offline support, repeat visits re-download all assets', file: '', line: 1, confidence: 60, remediation: 'Register service worker with workbox for cache-first strategy on static assets' });
    }
  }
}

export class LongTaskMainThreadRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-013', name: 'Long Tasks Blocking Main Thread', description: 'Detects patterns causing main thread blocking', category: 'performance-event-loop', severity: 'high', cwe: 'CWE-770', techniqueNumber: 229, pillar: 2, tags: ['main-thread', 'long-task', 'tti'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasSync = findStringLiterals(ctx.parsed, s => /for\s*\(.*;.*;.*\)|while\s*\(|\.forEach\(|map\(|reduce\(/i.test(s));
    const hasDefer = findStringLiterals(ctx.parsed, s => /setTimeout|requestIdleCallback|scheduler\.yield|debounce|throttle/i.test(s));
    if (hasSync.length > 5 && hasDefer.length === 0) {
      this.emit(ctx, { title: 'Long tasks blocking main thread', message: 'Synchronous loops/iterations detected without deferral — blocks main thread, increases TTI', file: '', line: 1, confidence: 70, remediation: 'Break long tasks with requestIdleCallback, setTimeout(0), or scheduler.yield()' });
    }
  }
}

export class MissingCriticalCSSRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-014', name: 'Missing Critical CSS Inlining', description: 'Detects render-blocking CSS without critical CSS extraction', category: 'performance-event-loop', severity: 'medium', cwe: 'CWE-770', techniqueNumber: 230, pillar: 2, tags: ['css', 'critical', 'render'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasCritical = findStringLiterals(ctx.parsed, s => /critical.*css|inline.*css|above.*fold|critical\./i.test(s));
    const hasCSSFiles = findStringLiterals(ctx.parsed, s => /\.css|stylesheet|style\.css/i.test(s));
    if (hasCSSFiles.length > 1 && hasCritical.length === 0) {
      this.emit(ctx, { title: 'Render-blocking CSS not inlined', message: 'External CSS files detected without critical CSS extraction — each CSS file blocks rendering', file: '', line: 1, confidence: 65, remediation: 'Inline above-the-fold CSS in <head> and defer non-critical CSS via media="print" onload trick' });
    }
  }
}

export class MissingLazyHydrationRule extends BaseRule {
  meta: RuleMeta = { id: 'PERF-NET-015', name: 'Missing Lazy Hydration Strategy', description: 'Detects eager hydration of non-critical components', category: 'performance-event-loop', severity: 'low', cwe: 'CWE-770', techniqueNumber: 231, pillar: 2, tags: ['hydration', 'react', 'ssr'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasLazy = findStringLiterals(ctx.parsed, s => /hydrateOnVisible|lazyHydrate|interactive.*idle|progressive.*hydrate/i.test(s));
    const hasHydrate = findStringLiterals(ctx.parsed, s => /hydrateRoot|ReactDOM\.hydrate|hydrate\(/i.test(s));
    if (hasHydrate.length > 0 && hasLazy.length === 0) {
      this.emit(ctx, { title: 'No progressive hydration strategy', message: 'Eager hydration detected — all components hydrate on load, increasing JS execution time', file: '', line: 1, confidence: 55, remediation: 'Implement progressive hydration: hydrate critical components immediately, defer non-critical with idle until interactive' });
    }
  }
}
