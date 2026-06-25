import { createHash } from 'node:crypto';

export function contentHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex').slice(0, 16);
}

let _counter = 0;

export function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${(++_counter).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function resetIdCounter(): void {
  _counter = 0;
}
