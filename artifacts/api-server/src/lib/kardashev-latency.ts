import { logger } from "./logger.js";

export interface KardashevLatency {
  interplanetaryDistanceKm: number;
  lightSpeedDelayMs: number;
  roundTripTimeMs: number;
  storeAndForwardOverhead: number;
  packetLossProbability: number;
  bandwithMbps: number;
  latencyClassification: string;
  resilienceScore: number;
  mitigationStrategies: string[];
  insight: string;
}

export function runKardashevLatency(keyFiles: Array<{ path: string; content: string }>): KardashevLatency {
  const hasAsyncOps = keyFiles.some(f => /\b(async|await|Promise|fetch|axios|http)\b/.test(f.content));
  const hasTimeouts = keyFiles.some(f => /\b(timeout|retry|backoff|exponential)\b/i.test(f.content));
  const hasCache = keyFiles.some(f => /\b(cache|redis|memcache|CDN)\b/i.test(f.content));
  const hasOfflineSupport = keyFiles.some(f => /\b(offline|service.worker|pwa|localForage|indexedDB)\b/i.test(f.content));
  const hasQueue = keyFiles.some(f => /\b(queue|bull|kafka|rabbitmq|eventEmitter)\b/i.test(f.content));

  const distances = [
    { name: "Mars (closest)", km: 54600000, delay: 182000, rt: 364000 },
    { name: "Mars (average)", km: 225000000, delay: 750000, rt: 1500000 },
    { name: "Mars (farthest)", km: 401000000, delay: 1339000, rt: 2678000 },
    { name: "Moon", km: 384400, delay: 1281, rt: 2562 },
    { name: " Venus", km: 41400000, delay: 138000, rt: 276000 },
  ];

  const mars = distances[1];
  const lightSpeedDelayMs = mars.delay;
  const baseRoundTripMs = mars.rt;

  const storeAndForwardOverhead = baseRoundTripMs * 0.3;
  const packetLossProbability = hasAsyncOps ? 0.15 : 0.35;

  const bandwithMbps = hasQueue ? 10 : 2;

  const resilienceFactors = [
    hasAsyncOps ? 15 : 0,
    hasTimeouts ? 15 : 0,
    hasCache ? 10 : 0,
    hasOfflineSupport ? 20 : 0,
    hasQueue ? 15 : 0,
    hasAsyncOps && hasQueue ? 10 : 0,
  ];
  const resilienceScore = Math.min(100, resilienceFactors.reduce((s, f) => s + f, 0));

  let latencyClassification: string;
  if (resilienceScore >= 80) latencyClassification = "Type-I Kardashev Ready";
  else if (resilienceScore >= 60) latencyClassification = "Type-II Kardashev Capable";
  else if (resilienceScore >= 40) latencyClassification = "Type-III Kardashev Limited";
  else latencyClassification = "Interplanetary Unstable";

  const mitigationStrategies: string[] = [];
  if (!hasAsyncOps) mitigationStrategies.push("Convert synchronous operations to async/await with Promise.all for parallel requests.");
  if (!hasTimeouts) mitigationStrategies.push("Add exponential backoff with jitter for all network operations.");
  if (!hasCache) mitigationStrategies.push("Implement aggressive caching layer (Redis/CDN) with stale-while-revalidate.");
  if (!hasOfflineSupport) mitigationStrategies.push("Add service worker with offline fallback and background sync.");
  if (!hasQueue) mitigationStrategies.push("Implement message queue (Bull/Kafka) for store-and-forward architecture.");

  const roundTripTimeMs = baseRoundTripMs + storeAndForwardOverhead;

  const insight =
    resilienceScore >= 70
      ? `Application is interplanetary-ready. Round-trip to Mars: ${roundTripTimeMs.toLocaleString()}ms. Resilience score: ${resilienceScore}/100.`
      : resilienceScore >= 40
        ? `Application can survive interplanetary latency with modifications. Current round-trip: ${roundTripTimeMs.toLocaleString()}ms. Store-and-forward required.`
        : `Application will fail under interplanetary conditions. Round-trip: ${roundTripTimeMs.toLocaleString()}ms. ${mitigationStrategies.length} architectural changes required.`;

  logger.info({ roundTripTimeMs, resilienceScore, latencyClassification }, "Kardashev Latency complete");

  return {
    interplanetaryDistanceKm: mars.km,
    lightSpeedDelayMs,
    roundTripTimeMs,
    storeAndForwardOverhead: Math.round(storeAndForwardOverhead),
    packetLossProbability,
    bandwithMbps,
    latencyClassification,
    resilienceScore,
    mitigationStrategies,
    insight,
  };
}
