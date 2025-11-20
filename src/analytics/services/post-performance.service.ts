import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../prisma/prisma.service';
import { Metric, MetricDocument } from '../schemas/metric.schema';

export interface PostMetrics {
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
  clickThroughRate?: number;
  videoViews?: number;
  videoCompletionRate?: number;
}

export interface EngagementRateCalculation {
  postId: string;
  engagementRate: number;
  reach: number;
  totalEngagement: number;
  breakdown: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
}

export interface PostComparison {
  post1: PostMetrics;
  post2: PostMetrics;
  comparison: {
    engagementDiff: number;
    engagementRateDiff: number;
    reachDiff: number;
    impressionsDiff: number;
    likesDiff: number;
    commentsDiff: number;
    sharesDiff: number;
    savesDiff: number;
  };
}

export interface ContentTypePerformance {
  contentType: string;
  postCount: number;
  avgEngagement: number;
  avgEngagementRate: number;
  avgReach: number;
  avgImpressions: number;
  totalEngagement: number;
  totalReach: number;
  bestPerformingPost: {
    postId: string;
    engagement: number;
    engagementRate: number;
  };
}

export interface BestTimeToPost {
  dayOfWeek: string;
  hour: number;
  avgEngagement: number;
  avgEngagementRate: number;
  postCount: number;
  confidence: number;
}

export interface PostPerformanceTimeline {
  postId: string;
  timeline: Array<{
    timestamp: Date;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagement: number;
    reach: number;
    impressions: number;
    engagementRate: number;
  }>;
  peakEngagementTime?: Date;
  engagementVelocity: number;
}

@Injectable()
export class PostPerformanceService {
  private readonly logger = new Logger(PostPerformanceService.name);

  constructor(
    @InjectModel(Metric.name) private metricModel: Model<MetricDocument>,
    private prisma: PrismaService,
  ) {}

  /**
   * Track individual post metrics
   * Requirements: 4.1, 11.1
   */
  async getPostMetrics(postId: string): Promise<PostMetrics> {
    this.logger.log(`Getting metrics for post ${postId}`);

    // Get post details from PostgreSQL
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        content: true,
        publishedAt: true,
        platformPosts: {
          select: {
            platformPostId: true,
            platform: true,
          },
        },
      },
    });

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    // Get metrics from MongoDB
    const metrics = await this.metricModel.aggregate([
      {
        $match: {
          'metadata.postId': postId,
          metricType: 'post',
        },
      },
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
          totalClicks: { $sum: '$metrics.clicks' },
          totalVideoViews: { $sum: '$metrics.videoViews' },
          totalVideoCompletions: { $sum: '$metrics.videoCompletions' },
        },
      },
    ]);

    if (metrics.length === 0) {
      // Return zero metrics if no data available
      const content = post.content as any;
      const platformPost = post.platformPosts[0];
      return {
        postId: post.id,
        platformPostId: platformPost?.platformPostId || '',
        platform: platformPost?.platform || '',
        content: content?.text || '',
        publishedAt: post.publishedAt || new Date(),
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        totalEngagement: 0,
        reach: 0,
        impressions: 0,
        engagementRate: 0,
      };
    }

    const metric = metrics[0];
    const totalEngagement = (metric.totalLikes || 0) + (metric.totalComments || 0) + 
                           (metric.totalShares || 0) + (metric.totalSaves || 0);
    const engagementRate = metric.totalReach > 0 ? (totalEngagement / metric.totalReach) * 100 : 0;
    const clickThroughRate = metric.totalImpressions > 0 ? (metric.totalClicks / metric.totalImpressions) * 100 : 0;
    const videoCompletionRate = metric.totalVideoViews > 0 ? (metric.totalVideoCompletions / metric.totalVideoViews) * 100 : 0;

    const content = post.content as any;

    return {
      postId: post.id,
      platformPostId: metric._id.platformPostId,
      platform: metric._id.platform,
      content: content?.text || '',
      publishedAt: post.publishedAt || new Date(),
      likes: metric.totalLikes || 0,
      comments: metric.totalComments || 0,
      shares: metric.totalShares || 0,
      saves: metric.totalSaves || 0,
      totalEngagement,
      reach: metric.totalReach || 0,
      impressions: metric.totalImpressions || 0,
      engagementRate: Math.round(engagementRate * 100) / 100,
      clickThroughRate: metric.totalClicks ? Math.round(clickThroughRate * 100) / 100 : undefined,
      videoViews: metric.totalVideoViews || undefined,
      videoCompletionRate: metric.totalVideoViews ? Math.round(videoCompletionRate * 100) / 100 : undefined,
    };
  }

  /**
   * Calculate engagement rate for a post
   * Requirements: 4.1, 11.1
   */
  async calculateEngagementRate(postId: string): Promise<EngagementRateCalculation> {
    this.logger.log(`Calculating engagement rate for post ${postId}`);

    const metrics = await this.metricModel.aggregate([
      {
        $match: {
          'metadata.postId': postId,
          metricType: 'post',
        },
      },
      {
        $group: {
          _id: '$metadata.postId',
          totalLikes: { $sum: '$metrics.likes' },
          totalComments: { $sum: '$metrics.comments' },
          totalShares: { $sum: '$metrics.shares' },
          totalSaves: { $sum: '$metrics.saves' },
          totalReach: { $sum: '$metrics.reach' },
        },
      },
    ]);

    if (metrics.length === 0) {
      return {
        postId,
        engagementRate: 0,
        reach: 0,
        totalEngagement: 0,
        breakdown: {
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
        },
      };
    }

    const metric = metrics[0];
    const likes = metric.totalLikes || 0;
    const comments = metric.totalComments || 0;
    const shares = metric.totalShares || 0;
    const saves = metric.totalSaves || 0;
    const totalEngagement = likes + comments + shares + saves;
    const reach = metric.totalReach || 0;
    const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

    return {
      postId,
      engagementRate: Math.round(engagementRate * 100) / 100,
      reach,
      totalEngagement,
      breakdown: {
        likes,
        comments,
        shares,
        saves,
      },
    };
  }

  /**
   * Compare two posts
   * Requirements: 4.1, 11.1
   */
  async comparePosts(postId1: string, postId2: string): Promise<PostComparison> {
    this.logger.log(`Comparing posts ${postId1} and ${postId2}`);

    const [post1, post2] = await Promise.all([
      this.getPostMetrics(postId1),
      this.getPostMetrics(postId2),
    ]);

    return {
      post1,
      post2,
      comparison: {
        engagementDiff: post1.totalEngagement - post2.totalEngagement,
        engagementRateDiff: post1.engagementRate - post2.engagementRate,
        reachDiff: post1.reach - post2.reach,
        impressionsDiff: post1.impressions - post2.impressions,
        likesDiff: post1.likes - post2.likes,
        commentsDiff: post1.comments - post2.comments,
        sharesDiff: post1.shares - post2.shares,
        savesDiff: post1.saves - post2.saves,
      },
    };
  }

  /**
   * Analyze content type performance
   * Requirements: 4.1, 11.1
   */
  async analyzeContentTypePerformance(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    platforms?: string[],
  ): Promise<ContentTypePerformance[]> {
    this.logger.log(`Analyzing content type performance for workspace ${workspaceId}`);

    // Get posts from PostgreSQL
    const postsQuery: any = {
      workspaceId,
      publishedAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'published',
    };

    const posts = await this.prisma.post.findMany({
      where: postsQuery,
      select: {
        id: true,
        content: true,
      },
    });

    // Categorize posts by content type
    const postsByType = new Map<string, string[]>();
    
    for (const post of posts) {
      const content = post.content as any;
      let contentType = 'text';
      
      if (content?.media && Array.isArray(content.media) && content.media.length > 0) {
        const media = content.media[0];
        if (media.type === 'video') {
          contentType = 'video';
        } else if (media.type === 'image') {
          contentType = content.media.length > 1 ? 'carousel' : 'image';
        }
      } else if (content?.link) {
        contentType = 'link';
      }

      if (!postsByType.has(contentType)) {
        postsByType.set(contentType, []);
      }
      postsByType.get(contentType)!.push(post.id);
    }

    // Get metrics for each content type
    const results: ContentTypePerformance[] = [];

    for (const [contentType, postIds] of postsByType.entries()) {
      const filter: any = {
        'metadata.postId': { $in: postIds },
        metricType: 'post',
      };

      if (platforms && platforms.length > 0) {
        filter.platform = { $in: platforms };
      }

      const metrics = await this.metricModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$metadata.postId',
            totalLikes: { $sum: '$metrics.likes' },
            totalComments: { $sum: '$metrics.comments' },
            totalShares: { $sum: '$metrics.shares' },
            totalSaves: { $sum: '$metrics.saves' },
            totalReach: { $sum: '$metrics.reach' },
            totalImpressions: { $sum: '$metrics.impressions' },
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
      ]);

      if (metrics.length === 0) continue;

      const totalEngagement = metrics.reduce((sum, m) => sum + (m.totalEngagement || 0), 0);
      const totalReach = metrics.reduce((sum, m) => sum + (m.totalReach || 0), 0);
      const avgEngagement = totalEngagement / metrics.length;
      const avgEngagementRate = metrics.reduce((sum, m) => sum + (m.engagementRate || 0), 0) / metrics.length;
      const avgReach = totalReach / metrics.length;
      const avgImpressions = metrics.reduce((sum, m) => sum + (m.totalImpressions || 0), 0) / metrics.length;

      // Find best performing post
      const bestPost = metrics.reduce((best, current) => 
        (current.totalEngagement || 0) > (best.totalEngagement || 0) ? current : best
      );

      results.push({
        contentType,
        postCount: metrics.length,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
        avgReach: Math.round(avgReach * 100) / 100,
        avgImpressions: Math.round(avgImpressions * 100) / 100,
        totalEngagement,
        totalReach,
        bestPerformingPost: {
          postId: bestPost._id,
          engagement: bestPost.totalEngagement || 0,
          engagementRate: Math.round((bestPost.engagementRate || 0) * 100) / 100,
        },
      });
    }

    return results.sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);
  }

  /**
   * Analyze best time to post
   * Requirements: 4.1, 11.1
   */
  async analyzeBestTimeToPost(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    platforms?: string[],
  ): Promise<BestTimeToPost[]> {
    this.logger.log(`Analyzing best time to post for workspace ${workspaceId}`);

    // Get posts from PostgreSQL
    const postsQuery: any = {
      workspaceId,
      publishedAt: {
        gte: startDate,
        lte: endDate,
      },
      status: 'published',
    };

    const posts = await this.prisma.post.findMany({
      where: postsQuery,
      select: {
        id: true,
        publishedAt: true,
      },
    });

    const postIds = posts.map(p => p.id);

    if (postIds.length === 0) {
      return [];
    }

    // Get metrics for these posts
    const filter: any = {
      'metadata.postId': { $in: postIds },
      metricType: 'post',
    };

    if (platforms && platforms.length > 0) {
      filter.platform = { $in: platforms };
    }

    const metrics = await this.metricModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$metadata.postId',
          totalLikes: { $sum: '$metrics.likes' },
          totalComments: { $sum: '$metrics.comments' },
          totalShares: { $sum: '$metrics.shares' },
          totalSaves: { $sum: '$metrics.saves' },
          totalReach: { $sum: '$metrics.reach' },
        },
      },
    ]);

    // Create a map of post metrics
    const metricsMap = new Map(
      metrics.map(m => [
        m._id,
        {
          engagement: (m.totalLikes || 0) + (m.totalComments || 0) + (m.totalShares || 0) + (m.totalSaves || 0),
          reach: m.totalReach || 0,
        },
      ])
    );

    // Group by day of week and hour
    const timeSlots = new Map<string, { engagement: number[]; reach: number[] }>();

    for (const post of posts) {
      if (!post.publishedAt) continue;

      const metrics = metricsMap.get(post.id);
      if (!metrics) continue;

      const date = new Date(post.publishedAt);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();
      const key = `${dayOfWeek}-${hour}`;

      if (!timeSlots.has(key)) {
        timeSlots.set(key, { engagement: [], reach: [] });
      }

      const slot = timeSlots.get(key)!;
      slot.engagement.push(metrics.engagement);
      slot.reach.push(metrics.reach);
    }

    // Calculate averages and confidence
    const results: BestTimeToPost[] = [];

    for (const [key, data] of timeSlots.entries()) {
      const [dayOfWeek, hourStr] = key.split('-');
      const hour = parseInt(hourStr, 10);

      const avgEngagement = data.engagement.reduce((sum, e) => sum + e, 0) / data.engagement.length;
      const avgReach = data.reach.reduce((sum, r) => sum + r, 0) / data.reach.length;
      const avgEngagementRate = avgReach > 0 ? (avgEngagement / avgReach) * 100 : 0;

      // Confidence based on sample size (more posts = higher confidence)
      const confidence = Math.min(data.engagement.length / 10, 1) * 100;

      results.push({
        dayOfWeek,
        hour,
        avgEngagement: Math.round(avgEngagement * 100) / 100,
        avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
        postCount: data.engagement.length,
        confidence: Math.round(confidence),
      });
    }

    return results.sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);
  }

  /**
   * Get post performance timeline
   * Requirements: 4.1, 11.1
   */
  async getPostPerformanceTimeline(postId: string): Promise<PostPerformanceTimeline> {
    this.logger.log(`Getting performance timeline for post ${postId}`);

    // Get all metrics for this post ordered by time
    const metrics = await this.metricModel
      .find({
        'metadata.postId': postId,
        metricType: 'post',
      })
      .sort({ timestamp: 1 })
      .exec();

    if (metrics.length === 0) {
      return {
        postId,
        timeline: [],
        engagementVelocity: 0,
      };
    }

    // Build timeline
    const timeline = metrics.map(metric => {
      const likes = metric.metrics.likes || 0;
      const comments = metric.metrics.comments || 0;
      const shares = metric.metrics.shares || 0;
      const saves = metric.metrics.saves || 0;
      const engagement = likes + comments + shares + saves;
      const reach = metric.metrics.reach || 0;
      const engagementRate = reach > 0 ? (engagement / reach) * 100 : 0;

      return {
        timestamp: metric.timestamp,
        likes,
        comments,
        shares,
        saves,
        engagement,
        reach: metric.metrics.reach || 0,
        impressions: metric.metrics.impressions || 0,
        engagementRate: Math.round(engagementRate * 100) / 100,
      };
    });

    // Find peak engagement time
    const peakEngagement = timeline.reduce((peak, current) => 
      current.engagement > peak.engagement ? current : peak
    );

    // Calculate engagement velocity (engagement per hour)
    const firstMetric = timeline[0];
    const lastMetric = timeline[timeline.length - 1];
    const timeDiffHours = (lastMetric.timestamp.getTime() - firstMetric.timestamp.getTime()) / (1000 * 60 * 60);
    const engagementDiff = lastMetric.engagement - firstMetric.engagement;
    const engagementVelocity = timeDiffHours > 0 ? engagementDiff / timeDiffHours : 0;

    return {
      postId,
      timeline,
      peakEngagementTime: peakEngagement.timestamp,
      engagementVelocity: Math.round(engagementVelocity * 100) / 100,
    };
  }
}
