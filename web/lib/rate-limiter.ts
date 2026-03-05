/**
 * Rate limiter using token bucket algorithm
 * In-memory implementation for MVP
 */

import type { RateLimitStatus } from "./types";

// Rate limits
const HOURLY_LIMIT = 10;
const DAILY_LIMIT = 30;
const FOLLOWUP_LIMIT = 20; // per 30min session

// In-memory store
interface UserLimit {
  hourlyTokens: number;
  dailyTokens: number;
  hourlyReset: Date;
  dailyReset: Date;
  followupTokens: number;
  sessionReset: Date;
}

const userLimits = new Map<string, UserLimit>();

/**
 * Get or initialize user limit record
 */
function getUserLimit(userId: string): UserLimit {
  const now = new Date();
  let limit = userLimits.get(userId);

  if (!limit) {
    limit = {
      hourlyTokens: HOURLY_LIMIT,
      dailyTokens: DAILY_LIMIT,
      hourlyReset: new Date(now.getTime() + 60 * 60 * 1000), // +1 hour
      dailyReset: new Date(now.getTime() + 24 * 60 * 60 * 1000), // +24 hours
      followupTokens: FOLLOWUP_LIMIT,
      sessionReset: new Date(now.getTime() + 30 * 60 * 1000), // +30 min
    };
    userLimits.set(userId, limit);
  }

  return limit;
}

/**
 * Reset tokens if time has passed
 */
function refreshTokens(limit: UserLimit): void {
  const now = new Date();

  if (now >= limit.hourlyReset) {
    limit.hourlyTokens = HOURLY_LIMIT;
    limit.hourlyReset = new Date(now.getTime() + 60 * 60 * 1000);
  }

  if (now >= limit.dailyReset) {
    limit.dailyTokens = DAILY_LIMIT;
    limit.dailyReset = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  if (now >= limit.sessionReset) {
    limit.followupTokens = FOLLOWUP_LIMIT;
    limit.sessionReset = new Date(now.getTime() + 30 * 60 * 1000);
  }
}

/**
 * Check if scan is allowed for user
 */
export function checkScanLimit(userId: string): RateLimitStatus {
  const limit = getUserLimit(userId);
  refreshTokens(limit);

  const allowed = limit.hourlyTokens > 0 && limit.dailyTokens > 0;
  const remaining = Math.min(limit.hourlyTokens, limit.dailyTokens);

  return {
    allowed,
    remaining,
    resetTime: limit.hourlyReset,
  };
}

/**
 * Consume a scan token
 */
export function consumeScanToken(userId: string): boolean {
  const limit = getUserLimit(userId);
  refreshTokens(limit);

  if (limit.hourlyTokens > 0 && limit.dailyTokens > 0) {
    limit.hourlyTokens--;
    limit.dailyTokens--;
    return true;
  }

  return false;
}

/**
 * Check if follow-up question is allowed
 */
export function checkFollowUpLimit(userId: string): RateLimitStatus {
  const limit = getUserLimit(userId);
  refreshTokens(limit);

  return {
    allowed: limit.followupTokens > 0,
    remaining: limit.followupTokens,
    resetTime: limit.sessionReset,
  };
}

/**
 * Consume a follow-up token
 */
export function consumeFollowUpToken(userId: string): boolean {
  const limit = getUserLimit(userId);
  refreshTokens(limit);

  if (limit.followupTokens > 0) {
    limit.followupTokens--;
    return true;
  }

  return false;
}

/**
 * Get user limit info for display
 */
export function getUserLimitInfo(userId: string): {
  hourlyRemaining: number;
  dailyRemaining: number;
  followupRemaining: number;
  hourlyReset: Date;
} {
  const limit = getUserLimit(userId);
  refreshTokens(limit);

  return {
    hourlyRemaining: limit.hourlyTokens,
    dailyRemaining: limit.dailyTokens,
    followupRemaining: limit.followupTokens,
    hourlyReset: limit.hourlyReset,
  };
}

/**
 * Clear all rate limits (for testing/admin)
 */
export function clearAllLimits(): void {
  userLimits.clear();
}
