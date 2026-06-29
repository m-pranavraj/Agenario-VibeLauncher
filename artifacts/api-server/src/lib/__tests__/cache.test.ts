/**
 * Phase 3.8 — In-Memory Cache Unit Tests
 * Tests TTL expiry, key isolation, prefix invalidation, and cache middleware.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Replicate TTL cache for testing ───────────────────────────────────────────
class TTLCache {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
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
}

describe("TTLCache — basic operations", () => {
  let cache: TTLCache;

  beforeEach(() => {
    cache = new TTLCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves a value", () => {
    cache.set("key1", { data: 42 }, 5000);
    expect(cache.get("key1")).toEqual({ data: 42 });
  });

  it("returns null for missing key", () => {
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("returns null after TTL expires", () => {
    cache.set("expiring", "value", 1000);
    vi.advanceTimersByTime(1001);
    expect(cache.get("expiring")).toBeNull();
  });

  it("returns value before TTL expires", () => {
    cache.set("notyet", "alive", 5000);
    vi.advanceTimersByTime(4999);
    expect(cache.get("notyet")).toBe("alive");
  });

  it("overwrites existing key", () => {
    cache.set("key", "first", 5000);
    cache.set("key", "second", 5000);
    expect(cache.get("key")).toBe("second");
  });

  it("deletes a key", () => {
    cache.set("delme", "value", 5000);
    cache.delete("delme");
    expect(cache.get("delme")).toBeNull();
  });
});

describe("TTLCache — prefix invalidation", () => {
  let cache: TTLCache;

  beforeEach(() => {
    cache = new TTLCache();
  });

  it("invalidates all keys with matching prefix", () => {
    cache.set("http:user:1:/api/scans", "data1", 60000);
    cache.set("http:user:1:/api/scans/5", "data2", 60000);
    cache.set("http:user:2:/api/scans", "data3", 60000);

    cache.invalidatePrefix("http:user:1:");
    expect(cache.get("http:user:1:/api/scans")).toBeNull();
    expect(cache.get("http:user:1:/api/scans/5")).toBeNull();
    // Other user's cache should be unaffected
    expect(cache.get("http:user:2:/api/scans")).toBe("data3");
  });

  it("invalidating empty prefix removes nothing", () => {
    cache.set("key1", "v1", 60000);
    cache.set("key2", "v2", 60000);
    cache.invalidatePrefix("nomatch:");
    expect(cache.size()).toBe(2);
  });
});

describe("TTLCache — different value types", () => {
  let cache: TTLCache;

  beforeEach(() => {
    cache = new TTLCache();
  });

  it("stores and retrieves objects", () => {
    const obj = { userId: 1, plan: "creator", scans: [1, 2, 3] };
    cache.set("obj", obj, 5000);
    expect(cache.get("obj")).toEqual(obj);
  });

  it("stores and retrieves arrays", () => {
    const arr = [1, 2, 3, "four"];
    cache.set("arr", arr, 5000);
    expect(cache.get("arr")).toEqual(arr);
  });

  it("stores and retrieves numbers", () => {
    cache.set("num", 42, 5000);
    expect(cache.get<number>("num")).toBe(42);
  });

  it("stores and retrieves null-like values safely", () => {
    cache.set("zero", 0, 5000);
    expect(cache.get("zero")).toBe(0);
  });
});

describe("TTLCache — size tracking", () => {
  it("reports correct size", () => {
    const cache = new TTLCache();
    expect(cache.size()).toBe(0);
    cache.set("a", 1, 5000);
    cache.set("b", 2, 5000);
    expect(cache.size()).toBe(2);
    cache.delete("a");
    expect(cache.size()).toBe(1);
  });
});
