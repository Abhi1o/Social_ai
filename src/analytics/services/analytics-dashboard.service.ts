import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../prisma/prisma.service';
import { Metric, MetricDocument } from '../schemas/metric.schema';
import { AggregatedMetric, AggregatedMetricDocument } from '../schemas/aggregated-metric.schema';

export interface KPIMetrics {
  totalFollowers: number;
  followerGrowth: number;
  followerGrowthRate: number;
  totalEngagement: number;
  engagementRate: number;
  engagementGrowth: number;
  totalReach: number;
  reachGrowth: number;
  totalImpressions: number;
  impressionsGrowth: number;
  totalPosts: number;
  postsGrowth: number;
  avgEngagementPerPost: number;
}

export interface EngagementMetrics {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalEngagement: number;
  engagementRate: number;
  likesGrowth: number;
  commentsGrowth: number;
  sharesGrowth: number;
  savesGrowth: number;
}

export interface FollowerGrowthData {
  date: string;
  followers: number;
  growth: number;
  growthRate: number;
}

export interface PlatformBreakdown {
  platform: string;
  followers: number;
  engagement: number;
  reach: number;
  impressions: number;
  posts: number;
  engagementRate: number;
}

export interface PostPerformance {
  postId: string;
  platformPostId: string;
  platform: string;
  content: string;
  publishedAt: Date;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  totalEngagement: number;
  reach: number;
  impressions: number;
  engagementRate: number;
}

export interface TimeSeriesData {
  timestamp: string;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagement: number;
    reach: number;
    impressions: number;
    followers: number;
  };
}

@Injectable()
export class AnalyticsDashboardService {
  private readonly logger = new Logger(AnalyticsDashboardService.name);

  constructor(
    @InjectModel(Metric.name) private metricModel: Model<MetricDocument>,
    @InjectModel(AggregatedMetric.name) private aggregatedMetricModel: Model<AggregatedMetricDocument>,
    private prisma: PrismaService,
  ) {}

  /**
   * Get overview KPI metrics for dashboard
   */
  async getOverviewKPIs(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    platforms?: string[],
    accountIds?: string[],
  ): Promise<KPIMetrics> {
    this.logger.log(`Getting overview KPIs for workspace ${workspaceId}`);

    // Build query filter
    const filter: any = {
      workspaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    };

    if (platforms && platforms.length > 0) {
      filter.platform = { $in: platforms };
    }

    if (accountIds && accountIds.length > 0) {
      filter.accountId = { $in: accountIds };
    }

    // Get current period metrics
    const currentMetrics = await this.metricModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: '$metrics.likes' },
          totalComments: { $sum: '$metrics.comments' },
          totalShares: { $sum: '$metrics.shares' },
          totalSaves: { $sum: '$metrics.saves' },
          totalReach: { $sum: '$metrics.reach' },
          totalImpressions: { $sum: '$metrics.impressions' },
          latestFollowers: { $last: '$metrics.followers' },
          postCount: { $sum: { $cond: [{ $eq: ['$metricType', 'post'] }, 1, 0] } },
        },
      },
    ]);

    // Get previous period for comparison
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate.getTime());

    const previousFilter = { ...filter, timestamp: { $gte: previousStartDate, $lte: previousEndDate } };
    const previousMetrics = await this.metricModel.aggregate([
      { $match: previousFilter },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: '$metrics.likes' },
          totalComments: { $sum: '$metrics.comments' },
          totalShares: { $sum: '$metrics.shares' },
          totalSaves: { $sum: '$metrics.saves' },
          totalReach: { $sum: '$metrics.reach' },
          totalImpressions: { $sum: '$metrics.impressions' },
          earliestFollowers: { $first: '$metrics.followers' },
          latestFollowers: { $last: '$metrics.followers' },
          postCount: { $sum: { $cond: [{ $eq: ['$metricType', 'post'] }, 1, 0] } },
        },
      },
    ]);

    const current = currentMetrics[0] || {};
    const previous = previousMetrics[0] || {};

    const totalEngagement = (current.totalLikes || 0) + (current.totalComments || 0) + 
                           (current.totalShares || 0) + (current.totalSaves || 0);
    const previousEngagement = (previous.totalLikes || 0) + (previous.totalComments || 0) + 
                              (previous.totalShares || 0) + (previous.totalSaves || 0);

    const totalFollowers = current.latestFollowers || 0;
    const previousFollowers = previous.earliestFollowers || totalFollowers;
    const followerGrowth = totalFollowers - previousFollowers;
    const followerGrowthRate = previousFollowers > 0 ? (followerGrowth / previousFollowers) * 100 : 0;

    const engagementGrowth = totalEngagement - previousEngagement;
    const reachGrowth = (current.totalReach || 0) - (previous.totalReach || 0);
    const impressionsGrowth = (current.totalImpressions || 0) - (previous.totalImpressions || 0);
    const postsGrowth = (current.postCount || 0) - (previous.postCount || 0);

    const totalPosts = current.postCount || 0;
    const avgEngagementPerPost = totalPosts > 0 ? totalEngagement / totalPosts : 0;
    const engagementRate = current.totalReach > 0 ? (totalEngagement / current.totalReach) * 100 : 0;

    return {
      totalFollowers,
      followerGrowth,
      followerGrowthRate: Math.round(followerGrowthRate * 100) / 100,
      totalEngagement,
      engagementRate: Math.round(engagementRate * 100) / 100,
      engagementGrowth,
      totalReach: current.totalReach || 0,
      reachGrowth,
      totalImpressions: current.totalImpressions || 0,
      impressionsGrowth,
      totalPosts,
      postsGrowth,
      avgEngagementPerPost: Math.round(avgEngagementPerPost * 100) / 100,
    };
  }

  /**
   * Get detailed engagement metrics
   */
  async getEngagementMetrics(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    platforms?: string[],
    accountIds?: string[],
  ): Promise<EngagementMetrics> {
    this.logger.log(`Getting engagement metrics for workspace ${workspaceId}`);

    const filter: any = {
      workspaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    };

    if (platforms && platforms.length > 0) {
      filter.platform = { $in: platforms };
    }

    if (accountIds && accountIds.length > 0) {
      filter.accountId = { $in: accountIds };
    }

    // Current period
    const currentMetrics = await this.metricModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: '$metrics.likes' },
          totalComments: { $sum: '$metrics.comments' },
          totalShares: { $sum: '$metrics.shares' },
          totalSaves: { $sum: '$metrics.saves' },
          totalReach: { $sum: '$metrics.reach' },
        },
      },
    ]);

    // Previous period
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate.getTime());

    const previousFilter = { ...filter, timestamp: { $gte: previousStartDate, $lte: previousEndDate } };
    const previousMetrics = await this.metricModel.aggregate([
      { $match: previousFilter },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: '$metrics.likes' },
          totalComments: { $sum: '$metrics.comments' },
          totalShares: { $sum: '$metrics.shares' },
          totalSaves: { $sum: '$metrics.saves' },
        },
      },
    ]);

    const current = currentMetrics[0] || {};
    const previous = previousMetrics[0] || {};

    const totalLikes = current.totalLikes || 0;
    const totalComments = current.totalComments || 0;
    const totalShares = current.totalShares || 0;
    const totalSaves = current.totalSaves || 0;
    const totalEngagement = totalLikes + totalComments + totalShares + totalSaves;
    const engagementRate = current.totalReach > 0 ? (totalEngagement / current.totalReach) * 100 : 0;

    return {
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      totalEngagement,
      engagementRate: Math.round(engagementRate * 100) / 100,
      likesGrowth: totalLikes - (previous.totalLikes || 0),
      commentsGrowth: totalComments - (previous.totalComments || 0),
      sharesGrowth: totalShares - (previous.totalShares || 0),
      savesGrowth: totalSaves - (previous.totalSaves || 0),
    };
  }

  /**
   * Get follower growth tracking over time
   */
  async getFollowerGrowth(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
    platforms?: string[],
    accountIds?: string[],
  ): Promise<FollowerGrowthData[]> {
    this.logger.log(`Getting follower growth for workspace ${workspaceId}`);

    const filter: any = {
      workspaceId,
      timestamp: { $gte: startDate, $lte: endDate },
      metricType: 'account',
    };

    if (platforms && platforms.length > 0) {
      filter.platform = { $in: platforms };
    }

    if (accountIds && accountIds.length > 0) {
      filter.accountId = { $in: accountIds };
    }

    // Determine date grouping format
    let dateFormat: any;
    switch (granularity) {
      case 'hourly':
        dateFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } };
        break;
      case 'weekly':
        dateFormat = { $dateToString: { format: '%Y-W%V', date: '$timestamp' } };
        break;
      case 'monthly':
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$timestamp' } };
        break;
      default:
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
    }

    const growthData = await this.metricModel.aggregate([
      { $match: filter },
      { $sort: { timestamp: 1 } },
      {
        $group: {
          _id: dateFormat,
          followers: { $last: '$metrics.followers' },
          firstFollowers: { $first: '$metrics.followers' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Calculate growth for each period
    const result: FollowerGrowthData[] = [];
    let previousFollowers = 0;

    for (const data of growthData) {
      const followers = data.followers || 0;
      const growth = previousFollowers > 0 ? followers - previousFollowers : 0;
      const growthRate = previousFollowers > 0 ? (growth / previousFollowers) * 100 : 0;

      result.push({
        date: data._id,
        followers,
        growth,
        growthRate: Math.round(growthRate * 100) / 100,
      });

      previousFollowers = followers;
    }

    return result;
  }

  /**
   * Get platform breakdown analytics
   */
  async getPlatformBreakdown(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    accountIds?: string[],
  ): Promise<PlatformBreakdown[]> {
    this.logger.log(`Getting platform breakdown for workspace ${workspaceId}`);

    const filter: any = {
      workspaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    };

    if (accountIds && accountIds.length > 0) {
      filter.accountId = { $in: accountIds };
    }

    const platformData = await this.metricModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$platform',
          totalLikes: { $sum: '$metrics.likes' },
          totalComments: { $sum: '$metrics.comments' },
          totalShares: { $sum: '$metrics.shares' },
          totalSaves: { $sum: '$metrics.saves' },
          totalReach: { $sum: '$metrics.reach' },
          totalImpressions: { $sum: '$metrics.impressions' },
          latestFollowers: { $last: '$metrics.followers' },
          postCount: { $sum: { $cond: [{ $eq: ['$metricType', 'post'] }, 1, 0] } },
        },
      },
      { $sort: { totalReach: -1 } },
    ]);

    return platformData.map((data) => {
      const engagement = (data.totalLikes || 0) + (data.totalComments || 0) + 
                        (data.totalShares || 0) + (data.totalSaves || 0);
      const engagementRate = data.totalReach > 0 ? (engagement / data.totalReach) * 100 : 0;

      return {
        platform: data._id,
        followers: data.latestFollowers || 0,
        engagement,
        reach: data.totalReach || 0,
        impressions: data.totalImpressions || 0,
        posts: data.postCount || 0,
        engagementRate: Math.round(engagementRate * 100) / 100,
      };
    });
  }

  /**
   * Get top performing posts
   */
  async getTopPerformingPosts(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    sortBy: string = 'engagement',
    limit: number = 10,
    platforms?: string[],
  ): Promise<PostPerformance[]> {
    this.logger.log(`Getting top performing posts for workspace ${workspaceId}`);

    const filter: any = {
      workspaceId,
      timestamp: { $gte: startDate, $lte: endDate },
      metricType: 'post',
      'metadata.postId': { $exists: true },
    };

    if (platforms && platforms.length > 0) {
      filter.platform = { $in: platforms };
    }

    // Determine sort field
    let sortField = '$totalEngagement';
    switch (sortBy) {
      case 'reach':
        sortField = '$totalReach';
        break;
      case 'impressions':
        sortField = '$totalImpressions';
        break;
      case 'likes':
        sortField = '$totalLikes';
        break;
      case 'comments':
        sortField = '$totalComments';
        break;
    }

    const postMetrics = await this.metricModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            postId: '$metadata.postId',
            platformPostId: '$metadata.platformPostId',
            platform: '$platform',
          },
          totalLikes: { $sum: '$metrics.likes' },
          totalComments: { $sum: '$metrics.comments' },
          totalShares: { $sum: '$metrics.shares' },
          totalSaves: { $sum: '$metrics.saves' },
          totalReach: { $sum: '$metrics.reach' },
          totalImpressions: { $sum: '$metrics.impressions' },
          latestTimestamp: { $last: '$timestamp' },
        },
      },
      {
        $addFields: {
          totalEngagement: {
            $add: ['$totalLikes', '$totalComments', '$totalShares', '$totalSaves'],
          },
          engagementRate: {
            $cond: [
              { $gt: ['$totalReach', 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      { $add: ['$totalLikes', '$totalComments', '$totalShares', '$totalSaves'] },
                      '$totalReach',
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { [sortField.substring(1)]: -1 } },
      { $limit: limit },
    ]);

    // Fetch post details from PostgreSQL
    const postIds = postMetrics.map((m) => m._id.postId).filter(Boolean);
    const posts = await this.prisma.post.findMany({
      where: { id: { in: postIds } },
      select: {
        id: true,
        content: true,
        publishedAt: true,
      },
    });

    const postMap = new Map(posts.map((p) => [p.id, p]));

    return postMetrics.map((metric) => {
      const post = postMap.get(metric._id.postId);
      const content = post?.content as any;

      return {
        postId: metric._id.postId,
        platformPostId: metric._id.platformPostId,
        platform: metric._id.platform,
        content: content?.text || '',
        publishedAt: post?.publishedAt || metric.latestTimestamp,
        likes: metric.totalLikes || 0,
        comments: metric.totalComments || 0,
        shares: metric.totalShares || 0,
        saves: metric.totalSaves || 0,
        totalEngagement: metric.totalEngagement || 0,
        reach: metric.totalReach || 0,
        impressions: metric.totalImpressions || 0,
        engagementRate: Math.round((metric.engagementRate || 0) * 100) / 100,
      };
    });
  }

  /**
   * Get time-series data for charts
   */
  async getTimeSeriesData(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
    platforms?: string[],
    accountIds?: string[],
  ): Promise<TimeSeriesData[]> {
    this.logger.log(`Getting time-series data for workspace ${workspaceId}`);

    const filter: any = {
      workspaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    };

    if (platforms && platforms.length > 0) {
      filter.platform = { $in: platforms };
    }

    if (accountIds && accountIds.length > 0) {
      filter.accountId = { $in: accountIds };
    }

    // Determine date grouping format
    let dateFormat: any;
    switch (granularity) {
      case 'hourly':
        dateFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } };
        break;
      case 'weekly':
        dateFormat = { $dateToString: { format: '%Y-W%V', date: '$timestamp' } };
        break;
      case 'monthly':
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$timestamp' } };
        break;
      default:
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
    }

    const timeSeriesData = await this.metricModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: dateFormat,
          likes: { $sum: '$metrics.likes' },
          comments: { $sum: '$metrics.comments' },
          shares: { $sum: '$metrics.shares' },
          saves: { $sum: '$metrics.saves' },
          reach: { $sum: '$metrics.reach' },
          impressions: { $sum: '$metrics.impressions' },
          followers: { $last: '$metrics.followers' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return timeSeriesData.map((data) => ({
      timestamp: data._id,
      metrics: {
        likes: data.likes || 0,
        comments: data.comments || 0,
        shares: data.shares || 0,
        saves: data.saves || 0,
        engagement: (data.likes || 0) + (data.comments || 0) + (data.shares || 0) + (data.saves || 0),
        reach: data.reach || 0,
        impressions: data.impressions || 0,
        followers: data.followers || 0,
      },
    }));
  }
}
