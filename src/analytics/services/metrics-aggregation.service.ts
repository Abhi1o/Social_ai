import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Metric, MetricDocument } from '../schemas/metric.schema';
import { AggregatedMetric, AggregatedMetricDocument } from '../schemas/aggregated-metric.schema';

@Injectable()
export class MetricsAggregationService {
  private readonly logger = new Logger(MetricsAggregationService.name);

  constructor(
    @InjectModel(Metric.name) private metricModel: Model<MetricDocument>,
    @InjectModel(AggregatedMetric.name) private aggregatedMetricModel: Model<AggregatedMetricDocument>,
  ) {}

  /**
   * Aggregate daily metrics for a workspace
   */
  async aggregateDailyMetrics(workspaceId: string, date: Date): Promise<void> {
    this.logger.log(`Aggregating daily metrics for workspace ${workspaceId} on ${date.toISOString()}`);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      const aggregation = await this.metricModel.aggregate([
        {
          $match: {
            workspaceId,
            timestamp: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
          },
        },
        {
          $group: {
            _id: {
              accountId: '$accountId',
              platform: '$platform',
            },
            totalLikes: { $sum: '$metrics.likes' },
            totalComments: { $sum: '$metrics.comments' },
            totalShares: { $sum: '$metrics.shares' },
            totalSaves: { $sum: '$metrics.saves' },
            totalImpressions: { $sum: '$metrics.impressions' },
            totalReach: { $sum: '$metrics.reach' },
            totalViews: { $sum: '$metrics.views' },
            avgEngagementRate: { $avg: '$metrics.engagementRate' },
            avgLikes: { $avg: '$metrics.likes' },
            avgComments: { $avg: '$metrics.comments' },
            avgShares: { $avg: '$metrics.shares' },
            maxLikes: { $max: '$metrics.likes' },
            minLikes: { $min: '$metrics.likes' },
            maxEngagementRate: { $max: '$metrics.engagementRate' },
            minEngagementRate: { $min: '$metrics.engagementRate' },
            postCount: { $sum: 1 },
            followers: { $last: '$metrics.followers' },
            previousFollowers: { $first: '$metrics.followers' },
          },
        },
      ]);

      // Store aggregated metrics
      const storePromises = aggregation.map((agg) => {
        const followerGrowth = (agg.followers || 0) - (agg.previousFollowers || 0);
        const followerGrowthRate = agg.previousFollowers > 0
          ? (followerGrowth / agg.previousFollowers) * 100
          : 0;

        return this.aggregatedMetricModel.findOneAndUpdate(
          {
            workspaceId,
            accountId: agg._id.accountId,
            platform: agg._id.platform,
            period: 'daily',
            periodStart: startOfDay,
          },
          {
            $set: {
              workspaceId,
              accountId: agg._id.accountId,
              platform: agg._id.platform,
              period: 'daily',
              periodStart: startOfDay,
              periodEnd: endOfDay,
              aggregatedMetrics: {
                totalLikes: agg.totalLikes || 0,
                totalComments: agg.totalComments || 0,
                totalShares: agg.totalShares || 0,
                totalSaves: agg.totalSaves || 0,
                totalImpressions: agg.totalImpressions || 0,
                totalReach: agg.totalReach || 0,
                totalViews: agg.totalViews || 0,
                avgEngagementRate: agg.avgEngagementRate || 0,
                avgLikes: agg.avgLikes || 0,
                avgComments: agg.avgComments || 0,
                avgShares: agg.avgShares || 0,
                maxLikes: agg.maxLikes || 0,
                minLikes: agg.minLikes || 0,
                maxEngagementRate: agg.maxEngagementRate || 0,
                minEngagementRate: agg.minEngagementRate || 0,
                postCount: agg.postCount || 0,
                followerGrowth,
                followerGrowthRate,
              },
              updatedAt: new Date(),
            },
          },
          { upsert: true, new: true },
        );
      });

      await Promise.all(storePromises);

      this.logger.log(`Completed daily aggregation for workspace ${workspaceId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error aggregating daily metrics: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Aggregate weekly metrics for a workspace
   */
  async aggregateWeeklyMetrics(workspaceId: string, weekStart: Date): Promise<void> {
    this.logger.log(`Aggregating weekly metrics for workspace ${workspaceId}`);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    try {
      const aggregation = await this.metricModel.aggregate([
        {
          $match: {
            workspaceId,
            timestamp: {
              $gte: weekStart,
              $lt: weekEnd,
            },
          },
        },
        {
          $group: {
            _id: {
              accountId: '$accountId',
              platform: '$platform',
            },
            totalLikes: { $sum: '$metrics.likes' },
            totalComments: { $sum: '$metrics.comments' },
            totalShares: { $sum: '$metrics.shares' },
            totalSaves: { $sum: '$metrics.saves' },
            totalImpressions: { $sum: '$metrics.impressions' },
            totalReach: { $sum: '$metrics.reach' },
            totalViews: { $sum: '$metrics.views' },
            avgEngagementRate: { $avg: '$metrics.engagementRate' },
            avgLikes: { $avg: '$metrics.likes' },
            avgComments: { $avg: '$metrics.comments' },
            avgShares: { $avg: '$metrics.shares' },
            maxLikes: { $max: '$metrics.likes' },
            minLikes: { $min: '$metrics.likes' },
            maxEngagementRate: { $max: '$metrics.engagementRate' },
            minEngagementRate: { $min: '$metrics.engagementRate' },
            postCount: { $sum: 1 },
            followers: { $last: '$metrics.followers' },
            previousFollowers: { $first: '$metrics.followers' },
          },
        },
      ]);

      const storePromises = aggregation.map((agg) => {
        const followerGrowth = (agg.followers || 0) - (agg.previousFollowers || 0);
        const followerGrowthRate = agg.previousFollowers > 0
          ? (followerGrowth / agg.previousFollowers) * 100
          : 0;

        return this.aggregatedMetricModel.findOneAndUpdate(
          {
            workspaceId,
            accountId: agg._id.accountId,
            platform: agg._id.platform,
            period: 'weekly',
            periodStart: weekStart,
          },
          {
            $set: {
              workspaceId,
              accountId: agg._id.accountId,
              platform: agg._id.platform,
              period: 'weekly',
              periodStart: weekStart,
              periodEnd: weekEnd,
              aggregatedMetrics: {
                totalLikes: agg.totalLikes || 0,
                totalComments: agg.totalComments || 0,
                totalShares: agg.totalShares || 0,
                totalSaves: agg.totalSaves || 0,
                totalImpressions: agg.totalImpressions || 0,
                totalReach: agg.totalReach || 0,
                totalViews: agg.totalViews || 0,
                avgEngagementRate: agg.avgEngagementRate || 0,
                avgLikes: agg.avgLikes || 0,
                avgComments: agg.avgComments || 0,
                avgShares: agg.avgShares || 0,
                maxLikes: agg.maxLikes || 0,
                minLikes: agg.minLikes || 0,
                maxEngagementRate: agg.maxEngagementRate || 0,
                minEngagementRate: agg.minEngagementRate || 0,
                postCount: agg.postCount || 0,
                followerGrowth,
                followerGrowthRate,
              },
              updatedAt: new Date(),
            },
          },
          { upsert: true, new: true },
        );
      });

      await Promise.all(storePromises);

      this.logger.log(`Completed weekly aggregation for workspace ${workspaceId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error aggregating weekly metrics: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Aggregate monthly metrics for a workspace
   */
  async aggregateMonthlyMetrics(workspaceId: string, monthStart: Date): Promise<void> {
    this.logger.log(`Aggregating monthly metrics for workspace ${workspaceId}`);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    try {
      const aggregation = await this.metricModel.aggregate([
        {
          $match: {
            workspaceId,
            timestamp: {
              $gte: monthStart,
              $lt: monthEnd,
            },
          },
        },
        {
          $group: {
            _id: {
              accountId: '$accountId',
              platform: '$platform',
            },
            totalLikes: { $sum: '$metrics.likes' },
            totalComments: { $sum: '$metrics.comments' },
            totalShares: { $sum: '$metrics.shares' },
            totalSaves: { $sum: '$metrics.saves' },
            totalImpressions: { $sum: '$metrics.impressions' },
            totalReach: { $sum: '$metrics.reach' },
            totalViews: { $sum: '$metrics.views' },
            avgEngagementRate: { $avg: '$metrics.engagementRate' },
            avgLikes: { $avg: '$metrics.likes' },
            avgComments: { $avg: '$metrics.comments' },
            avgShares: { $avg: '$metrics.shares' },
            maxLikes: { $max: '$metrics.likes' },
            minLikes: { $min: '$metrics.likes' },
            maxEngagementRate: { $max: '$metrics.engagementRate' },
            minEngagementRate: { $min: '$metrics.engagementRate' },
            postCount: { $sum: 1 },
            followers: { $last: '$metrics.followers' },
            previousFollowers: { $first: '$metrics.followers' },
          },
        },
      ]);

      const storePromises = aggregation.map((agg) => {
        const followerGrowth = (agg.followers || 0) - (agg.previousFollowers || 0);
        const followerGrowthRate = agg.previousFollowers > 0
          ? (followerGrowth / agg.previousFollowers) * 100
          : 0;

        return this.aggregatedMetricModel.findOneAndUpdate(
          {
            workspaceId,
            accountId: agg._id.accountId,
            platform: agg._id.platform,
            period: 'monthly',
            periodStart: monthStart,
          },
          {
            $set: {
              workspaceId,
              accountId: agg._id.accountId,
              platform: agg._id.platform,
              period: 'monthly',
              periodStart: monthStart,
              periodEnd: monthEnd,
              aggregatedMetrics: {
                totalLikes: agg.totalLikes || 0,
                totalComments: agg.totalComments || 0,
                totalShares: agg.totalShares || 0,
                totalSaves: agg.totalSaves || 0,
                totalImpressions: agg.totalImpressions || 0,
                totalReach: agg.totalReach || 0,
                totalViews: agg.totalViews || 0,
                avgEngagementRate: agg.avgEngagementRate || 0,
                avgLikes: agg.avgLikes || 0,
                avgComments: agg.avgComments || 0,
                avgShares: agg.avgShares || 0,
                maxLikes: agg.maxLikes || 0,
                minLikes: agg.minLikes || 0,
                maxEngagementRate: agg.maxEngagementRate || 0,
                minEngagementRate: agg.minEngagementRate || 0,
                postCount: agg.postCount || 0,
                followerGrowth,
                followerGrowthRate,
              },
              updatedAt: new Date(),
            },
          },
          { upsert: true, new: true },
        );
      });

      await Promise.all(storePromises);

      this.logger.log(`Completed monthly aggregation for workspace ${workspaceId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error aggregating monthly metrics: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }
}
