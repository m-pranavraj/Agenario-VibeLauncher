/**
 * Phase 6.2 — Scan Queue
 * In-process FIFO queue limiting concurrent scan executions to MAX_CONCURRENT.
 * Prevents memory exhaustion and Chromium process storms under heavy load.
 * No external dependencies — pure in-process queue with promise-based waiters.
 */

import { logger } from "./logger.js";

const MAX_CONCURRENT = parseInt(process.env["MAX_CONCURRENT_SCANS"] ?? "3", 10);

interface QueueEntry {
  userId: number;
  resolve: (slot: () => void) => void;
  reject: (err: Error) => void;
  queuedAt: number;
}

class ScanQueue {
  private running = 0;
  private waiters: QueueEntry[] = [];
  private readonly maxConcurrent: number;
  private readonly maxQueueSize: number;
  private readonly maxWaitMs: number;

  constructor(maxConcurrent = MAX_CONCURRENT, maxQueueSize = 20, maxWaitMs = 120_000) {
    this.maxConcurrent = maxConcurrent;
    this.maxQueueSize = maxQueueSize;
    this.maxWaitMs = maxWaitMs;
  }

  /**
   * Acquire a scan slot. Resolves immediately if under the concurrency limit,
   * otherwise waits in queue until a slot opens or times out.
   *
   * Returns a `release` function — call it when the scan finishes.
   *
   * Usage:
   *   const release = await scanQueue.acquire(userId);
   *   try { await runScan(...); } finally { release(); }
   */
  acquire(userId: number): Promise<() => void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      logger.debug({ running: this.running, userId }, "[ScanQueue] Slot acquired immediately");
      return Promise.resolve(this.makeRelease());
    }

    if (this.waiters.length >= this.maxQueueSize) {
      return Promise.reject(
        new Error("Scan queue full. Too many concurrent scans. Please try again in a few minutes.")
      );
    }

    return new Promise<() => void>((resolve, reject) => {
      const entry: QueueEntry = {
        userId,
        resolve,
        reject,
        queuedAt: Date.now(),
      };

      this.waiters.push(entry);
      logger.info({ queueSize: this.waiters.length, userId }, "[ScanQueue] Scan queued — waiting for slot");

      // Timeout if slot never opens
      setTimeout(() => {
        const idx = this.waiters.indexOf(entry);
        if (idx !== -1) {
          this.waiters.splice(idx, 1);
          reject(new Error("Scan queue timeout. The server is busy. Please try again."));
        }
      }, this.maxWaitMs);
    });
  }

  private makeRelease(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.running--;

      // Wake up the next waiter
      const next = this.waiters.shift();
      if (next) {
        this.running++;
        const elapsed = Date.now() - next.queuedAt;
        logger.info({ userId: next.userId, waitedMs: elapsed }, "[ScanQueue] Slot assigned to queued scan");
        next.resolve(this.makeRelease());
      }

      logger.debug({ running: this.running, queued: this.waiters.length }, "[ScanQueue] Slot released");
    };
  }

  get stats() {
    return {
      running: this.running,
      queued: this.waiters.length,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

// Singleton — shared across all scan routes
export const scanQueue = new ScanQueue();
