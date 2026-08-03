/**
 * GitHub API rate-limit budget tracker. (D-05)
 * Primary technical risk: ~5000 req/h per token.
 * Checks remaining quota before expensive operations.
 */
import type { Octokit } from '@octokit/rest';
import { logger } from '@/lib/logger';
import { AppError, createAppError } from '@/lib/errors';

// Minimum remaining requests before we pause sync
const RATE_LIMIT_BUFFER = 100;

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  reset: Date;
}

export async function getRateLimitStatus(
  octokit: Octokit,
): Promise<RateLimitStatus> {
  const { data } = await octokit.rateLimit.get();
  const core = data.resources.core;
  return {
    limit: core.limit,
    remaining: core.remaining,
    reset: new Date(core.reset * 1000),
  };
}

/**
 * Asserts there is sufficient quota to proceed.
 * Throws AppError.RATE_LIMITED if budget is too low.
 */
export async function assertQuotaBudget(octokit: Octokit): Promise<void> {
  const status = await getRateLimitStatus(octokit);
  logger.info(
    { remaining: status.remaining, reset: status.reset },
    'GitHub rate limit budget',
  );
  if (status.remaining < RATE_LIMIT_BUFFER) {
    throw createAppError(
      AppError.RATE_LIMITED,
      `GitHub API quota too low: ${status.remaining} remaining, resets at ${status.reset.toISOString()}`,
    );
  }
}
