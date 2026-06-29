/**
 * Phase 6.1 — In-Memory Response Cache
 * Lightweight TTL cache for frequently-read, expensive endpoints.
 * No Redis dependency — uses a Map with expiry timestamps.
 *
 * Usage:
 *   import { cache } from '../lib/cache.js';
 *   const cached = cache.get('key');
 *   if (!cached) { cache.set('key', data, ttlMs); }
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs = 60_000) {
    // Periodically sweep expired entries to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.expiresAt <= now) {
          this.store.delete(key);
        }
      }
    }, cleanupIntervalMs);

    // Don't hold process open
    this.cleanupInterval.unref?.();
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  size(): number {
    return this.store.size;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton cache — shared across all routes
export const cache = new TTLCache();

// ── TTL constants ──────────────────────────────────────────────────────────
export const TTL = {
  FIVE_SECONDS: 5_000,
  TEN_SECONDS: 10_000,
  THIRTY_SECONDS: 30_000,
  ONE_MINUTE: 60_000,
  FIVE_MINUTES: 300_000,
} as const;

// ── Express middleware factory ─────────────────────────────────────────────
/**
 * Cache GET responses by URL + optional user scope.
 * Usage: router.get('/api/public/stats', cacheMiddleware(TTL.ONE_MINUTE), handler)
 */
import type { Request, Response, NextFunction } from "express";

export function cacheMiddleware(ttlMs: number, userScoped = false) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") { next(); return; }

    const userId = userScoped ? (req.session as any)?.userId ?? "anon" : "global";
    const key = `http:${userId}:${req.url}`;

    const cached = cache.get<string>(key);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Content-Type", "application/json");
      res.send(cached);
      return;
    }

    // Capture the response body
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      const serialized = JSON.stringify(body);
      cache.set(key, serialized, ttlMs);
      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };
}
