import { logger } from "./logger.js";

export class KeyRotator {
  private keys: string[];
  private currentIndex: number = 0;
  private cooldowns: Map<string, number> = new Map();
  private readonly cooldownMs: number;
  private providerName: string;

  constructor(providerName: string, envKeys: string | undefined, cooldownMs = 60000) {
    this.providerName = providerName;
    this.cooldownMs = cooldownMs;
    if (!envKeys) {
      this.keys = [];
    } else {
      this.keys = envKeys.split(',').map(k => k.trim()).filter(Boolean);
    }
    
    if (this.keys.length > 0) {
      logger.info({ provider: this.providerName, keyCount: this.keys.length }, "Initialized Key Rotator");
    }
  }

  public getNextKey(): string | null {
    if (this.keys.length === 0) return null;
    return this.keys[0]; // Rotation disabled per user request
  }

  public markRateLimited(key: string | null) {
    if (!key) return;
    this.cooldowns.set(key, Date.now() + this.cooldownMs);
    logger.warn({ provider: this.providerName }, "Key marked as rate-limited, cooling down");
  }

  public hasKeys(): boolean {
    return this.keys.length > 0;
  }
}
