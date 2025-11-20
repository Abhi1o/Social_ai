import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // time window in milliseconds
  keyPrefix: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds until next allowed request
}

/**
 * Service for rate limiting API requests per platform
 */
@Injectable()
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Check if a request is allowed under rate limits
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const fullKey = `${config.keyPrefix}:${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use Redis sorted set to track requests in time window
      const multi = this.redis.multi();

      // Remove old requests outside the window
      multi.zremrangebyscore(fullKey, 0, windowStart);

      // Count requests in current window
      multi.zcard(fullKey);

      // Add current request
      multi.zadd(fullKey, now, `${now}`);

      // Set expiry on the key
      multi.expire(fullKey, Math.ceil(config.windowMs / 1000));

      const results = await multi.exec();

      if (!results) {
        throw new Error('Redis transaction failed');
      }

      // Get count from zcard result
      const count = (results[1][1] as number) || 0;

      const allowed = count < config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count - 1);
      const resetAt = new Date(now + config.windowMs);

      let retryAfter: number | undefined;
      if (!allowed) {
        // Get the oldest request in the window
        const oldestRequests = await this.redis.zrange(fullKey, 0, 0, 'WITHSCORES');
        if (oldestRequests.length >= 2) {
          const oldestTimestamp = parseInt(oldestRequests[1], 10);
          retryAfter = Math.ceil((oldestTimestamp + config.windowMs - now) / 1000);
        }
      }

      this.logger.debug(
        `Rate limit check for ${key}: allowed=${allowed}, remaining=${remaining}, resetAt=${resetAt.toISOString()}`,
      );

      return {
        allowed,
        remaining,
        resetAt,
        retryAfter,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Rate limit check failed: ${errorMessage}`);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(now + config.windowMs),
      };
    }
  }

  /**
   * Wait until rate limit allows next request
   */
  async waitForLimit(
    key: string,
    config: RateLimitConfig,
    maxWaitMs: number = 60000,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.checkLimit(key, config);

      if (result.allowed) {
        return;
      }

      if (result.retryAfter) {
        const waitMs = Math.min(result.retryAfter * 1000, maxWaitMs - (Date.now() - startTime));
        if (waitMs > 0) {
          this.logger.debug(`Waiting ${waitMs}ms for rate limit to reset`);
          await this.sleep(waitMs);
        }
      } else {
        // Default wait time
        await this.sleep(1000);
      }
    }

    throw new Error('Rate limit wait timeout exceeded');
  }

  /**
   * Reset rate limit for a key
   */
  async resetLimit(key: string, config: RateLimitConfig): Promise<void> {
    const fullKey = `${config.keyPrefix}:${key}`;
    await this.redis.del(fullKey);
    this.logger.debug(`Rate limit reset for ${key}`);
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const fullKey = `${config.keyPrefix}:${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Remove old requests
      await this.redis.zremrangebyscore(fullKey, 0, windowStart);

      // Count current requests
      const count = await this.redis.zcard(fullKey);

      const allowed = count < config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count);
      const resetAt = new Date(now + config.windowMs);

      return {
        allowed,
        remaining,
        resetAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get rate limit status: ${errorMessage}`);
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(now + config.windowMs),
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
