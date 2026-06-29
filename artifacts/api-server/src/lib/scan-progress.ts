import { EventEmitter } from "events";

export interface ProgressEvent {
  scanId: number;
  phase: string;
  agentName?: string;
  status: "running" | "complete" | "error";
  message: string;
  progress: number;
  issuesFound?: number;
  error?: string;
  timestamp: number;
}

const emitters = new Map<number, EventEmitter>();
export const globalEmitter = new EventEmitter();
globalEmitter.setMaxListeners(1000);

export function getEmitter(scanId: number): EventEmitter {
  let e = emitters.get(scanId);
  if (!e) {
    e = new EventEmitter();
    e.setMaxListeners(100);
    emitters.set(scanId, e);
  }
  return e;
}

export function emitProgress(scanId: number, event: Omit<ProgressEvent, "timestamp">) {
  const e = getEmitter(scanId);
  const full: ProgressEvent = { ...event, timestamp: Date.now() };
  e.emit("progress", full);
  globalEmitter.emit("progress", full);
}

export function removeEmitter(scanId: number) {
  const e = emitters.get(scanId);
  if (e) {
    e.removeAllListeners();
    emitters.delete(scanId);
  }
}
