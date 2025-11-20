import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { AICompletionResponse } from '../interfaces/ai.interface';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours in seconds

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Generate cache key from request parameters
   */
  generateCacheKey(
    messages: any[],
    model: string,
    temperature: number,
  ): string {
    const messageHash = JSON.stringify(messages);
    return `ai:cache:${model}:${temperature}:${this.hashString(messageHash)}`;
  }

  /**
   * Get cached AI response
   */
  async get(cacheKey: string): Promise<AICompletionResponse | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        const response = JSON.parse(cached);
        return {
          ...response,
          cached: true,
        };
      }
      this.logger.debug(`Cache miss: ${cacheKey}`);
      return null;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Cache get error: ${err.message}`);
      return null;
    }
  }

  /**
   * Store AI response in cache
   */
  async set(
    cacheKey: string,
    response: AICompletionResponse,
    ttl?: number,
  ): Promise<void> {
    try {
      const ttlSeconds = ttl || this.DEFAULT_TTL;
      await this.redis.setex(
        cacheKey,
        ttlSeconds,
        JSON.stringify({
          content: response.content,
          model: response.model,
          tokensUsed: response.tokensUsed,
          cost: response.cost,
        }),
      );
      this.logger.debug(`Cached response: ${cacheKey} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Cache set error: ${err.message}`);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        this.logger.log(`Invalidated ${deleted} cache entries: ${pattern}`);
        return deleted;
      }
      return 0;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Cache invalidate error: ${err.message}`);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsed: string;
    hitRate: number;
  }> {
    try {
      const keys = await this.redis.keys('ai:cache:*');
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsed = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      // Get hit/miss stats from Redis
      const stats = await this.redis.info('stats');
      const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
      const missesMatch = stats.match(/keyspace_misses:(\d+)/);

      const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
      const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
      const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;

      return {
        totalKeys: keys.length,
        memoryUsed,
        hitRate: Math.round(hitRate * 100) / 100,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Cache stats error: ${err.message}`);
      return {
        totalKeys: 0,
        memoryUsed: 'unknown',
        hitRate: 0,
      };
    }
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
