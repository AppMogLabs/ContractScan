/**
 * LRU Cache for contract analysis results
 * TTL: 24 hours
 */

import { LRUCache } from "lru-cache";
import type { AnalysisResult, Network } from "../types/index.js";

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms
const MAX_ENTRIES = 1000;

const cache = new LRUCache<string, AnalysisResult>({
  max: MAX_ENTRIES,
  ttl: CACHE_TTL,
  updateAgeOnGet: false,
  allowStale: false,
});

/**
 * Generate cache key from network and address
 */
export function getCacheKey(network: Network, address: string): string {
  return `${network}:${address.toLowerCase()}`;
}

/**
 * Get cached analysis result
 */
export function getCachedAnalysis(
  network: Network,
  address: string
): AnalysisResult | undefined {
  const key = getCacheKey(network, address);
  return cache.get(key);
}

/**
 * Store analysis result in cache
 */
export function setCachedAnalysis(
  network: Network,
  address: string,
  result: AnalysisResult
): void {
  const key = getCacheKey(network, address);
  cache.set(key, result);
}

/**
 * Get cache stats for monitoring
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  ttl: number;
} {
  return {
    size: cache.size,
    maxSize: MAX_ENTRIES,
    ttl: CACHE_TTL,
  };
}

/**
 * Clear entire cache (for admin/debugging)
 */
export function clearCache(): void {
  cache.clear();
}
