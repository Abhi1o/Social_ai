import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import { Metric, MetricDocument } from '../schemas/metric.schema';
import { AggregatedMetric, AggregatedMetricDocument } from '../schemas/aggregated-metric.schema';

@Injectable()
export class MetricsCacheService {
  private readonly logger = new Logger(MetricsCacheService.name);
  private readonly redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutes for real-time metrics
  private readonly AGGREGATED_CACHE_TTL = 3600; // 1 hour for aggregated metrics

  constructor(
    @InjectModel(Metric.name) private metricModel: Model<MetricDocument>,
    @InjectModel(AggregatedMetric.name) private aggregatedMetricModel: Model<AggregatedMetricDocument>,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    });
  }

  /**
   * Get cached metrics or fetch from database
   */
  async getWorkspaceMetrics(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const cacheKey = `metrics:workspace:${workspaceId}:${startDate.toISOString()}:${endDate.toISOString()}`;

    try {
      // Try to get from cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for workspace metrics: ${workspaceId}`);
        return JSON.parse(cached);
      }

      // Fetch from database
      const metrics = await this.metricModel
        .find({
          workspaceId,
          timestamp: {
            $gte: startDate,
            $lte: endDate,
          },
        })
        .sort({ timestamp: -1 })
        .lean()
        .exec();

      // Store in cache
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));

      return metrics;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error getting workspace metrics: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Get cached account metrics or fetch from database
   */
  async getAccountMetrics(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const cacheKey = `metrics:account:${accountId}:${startDate.toISOString()}:${endDate.toISOString()}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for account metrics: ${accountId}`);
        return JSON.parse(cached);
      }

      const metrics = await this.metricModel
        .find({
          accountId,
          timestamp: {
            $gte: startDate,
            $lte: endDate,
          },
        })
        .sort({ timestamp: -1 })
        .lean()
        .exec();

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));

      return metrics;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error getting account metrics: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Get cached post metrics or fetch from database
   */
  async getPostMetrics(postId: string): Promise<any[]> {
    const cacheKey = `metrics:post:${postId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for post metrics: ${postId}`);
        return JSON.parse(cached);
      }

      const metrics = await this.metricModel
        .find({
          'metadata.postId': postId,
        })
        .sort({ timestamp: -1 })
        .lean()
        .exec();

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));

      return metrics;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error getting post metrics: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Get cached aggregated metrics
   */
  async getAggregatedMetrics(
    workspaceId: string,
    period: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const cacheKey = `metrics:aggregated:${workspaceId}:${period}:${startDate.toISOString()}:${endDate.toISOString()}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for aggregated metrics: ${workspaceId}`);
        return JSON.parse(cached);
      }

      const metrics = await this.aggregatedMetricModel
        .find({
          workspaceId,
          period,
          periodStart: {
            $gte: startDate,
            $lte: endDate,
          },
        })
        .sort({ periodStart: -1 })
        .lean()
        .exec();

      await this.redis.setex(cacheKey, this.AGGREGATED_CACHE_TTL, JSON.stringify(metrics));

      return metrics;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error getting aggregated metrics: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Invalidate cache for a workspace
   */
  async invalidateWorkspaceCache(workspaceId: string): Promise<void> {
    try {
      const pattern = `metrics:*:${workspaceId}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cache keys for workspace ${workspaceId}`);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error invalidating workspace cache: ${err.message}`, err.stack);
    }
  }

  /**
   * Invalidate cache for an account
   */
  async invalidateAccountCache(accountId: string): Promise<void> {
    try {
      const pattern = `metrics:account:${accountId}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cache keys for account ${accountId}`);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error invalidating account cache: ${err.message}`, err.stack);
    }
  }

  /**
   * Invalidate cache for a post
   */
  async invalidatePostCache(postId: string): Promise<void> {
    try {
      const cacheKey = `metrics:post:${postId}`;
      await this.redis.del(cacheKey);
      this.logger.log(`Invalidated cache for post ${postId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error invalidating post cache: ${err.message}`, err.stack);
    }
  }

  /**
   * Clear all metrics cache
   */
  async clearAllCache(): Promise<void> {
    try {
      const pattern = 'metrics:*';
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Cleared ${keys.length} cache keys`);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error clearing cache: ${err.message}`, err.stack);
    }
  }
}
