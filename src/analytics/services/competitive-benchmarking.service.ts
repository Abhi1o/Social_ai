import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompetitorMetric, CompetitorMetricDocument } from '../schemas/competitor-metric.schema';
import {
  CreateCompetitorDto,
  UpdateCompetitorDto,
  CompetitiveBenchmarkQueryDto,
  ShareOfVoiceQueryDto,
  IndustryBenchmarkQueryDto,
  CompetitorActivityQueryDto,
  CompetitorMetricsResponse,
  CompetitiveComparisonResponse,
  ShareOfVoiceResponse,
  IndustryBenchmarkResponse,
  CompetitorActivityResponse,
  RankingItem,
} from '../dto/competitive-benchmarking.dto';

@Injectable()
export class CompetitiveBenchmarkingService {
  constructor(
    private prisma: PrismaService,
    @InjectModel(CompetitorMetric.name)
    private competitorMetricModel: Model<CompetitorMetricDocument>,
  ) {}

  /**
   * Create a new competitor for tracking
   */
  async createCompetitor(workspaceId: string, dto: CreateCompetitorDto) {
    const competitor = await this.prisma.competitor.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        industry: dto.industry,
        tags: dto.tags || [],
        accounts: {
          create: dto.accounts.map(account => ({
            platform: account.platform.toUpperCase() as any,
            platformAccountId: account.platformAccountId,
            username: account.username,
            displayName: account.displayName,
            avatar: account.avatar,
          })),
        },
      },
      include: {
        accounts: true,
      },
    });

    return competitor;
  }

  /**
   * Get all competitors for a workspace
   */
  async getCompetitors(workspaceId: string, includeInactive = false) {
    const where: any = { workspaceId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.competitor.findMany({
      where,
      include: {
        accounts: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a single competitor by ID
   */
  async getCompetitor(workspaceId: string, competitorId: string) {
    const competitor = await this.prisma.competitor.findFirst({
      where: {
        id: competitorId,
        workspaceId,
      },
      include: {
        accounts: true,
      },
    });

    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    return competitor;
  }

  /**
   * Update a competitor
   */
  async updateCompetitor(
    workspaceId: string,
    competitorId: string,
    dto: UpdateCompetitorDto,
  ) {
    const competitor = await this.getCompetitor(workspaceId, competitorId);

    return this.prisma.competitor.update({
      where: { id: competitor.id },
      data: dto,
      include: {
        accounts: true,
      },
    });
  }

  /**
   * Delete a competitor
   */
  async deleteCompetitor(workspaceId: string, competitorId: string) {
    const competitor = await this.getCompetitor(workspaceId, competitorId);

    await this.prisma.competitor.delete({
      where: { id: competitor.id },
    });

    // Also delete metrics from MongoDB
    await this.competitorMetricModel.deleteMany({
      competitorId: competitor.id,
    });

    return { success: true };
  }

  /**
   * Get competitive benchmark comparison
   */
  async getCompetitiveBenchmark(
    workspaceId: string,
    query: CompetitiveBenchmarkQueryDto,
  ): Promise<CompetitiveComparisonResponse> {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Get workspace metrics
    const workspaceMetrics = await this.getWorkspaceMetrics(
      workspaceId,
      startDate,
      endDate,
      query.platforms,
    );

    // Get competitor metrics
    const competitors = await this.getCompetitors(workspaceId);
    const competitorMetrics: CompetitorMetricsResponse[] = [];

    for (const competitor of competitors) {
      if (query.competitorIds && !query.competitorIds.includes(competitor.id)) {
        continue;
      }

      for (const account of competitor.accounts) {
        if (query.platforms && !query.platforms.includes(account.platform.toLowerCase())) {
          continue;
        }

        const metrics = await this.getCompetitorMetrics(
          competitor.id,
          account.id,
          startDate,
          endDate,
        );

        competitorMetrics.push({
          competitorId: competitor.id,
          competitorName: competitor.name,
          platform: account.platform.toLowerCase(),
          metrics,
          period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        });
      }
    }

    // Calculate rankings
    const rankings = this.calculateRankings(workspaceMetrics, competitorMetrics);

    // Generate insights
    const insights = this.generateInsights(workspaceMetrics, competitorMetrics, rankings);

    return {
      workspace: {
        id: workspaceId,
        metrics: workspaceMetrics,
      },
      competitors: competitorMetrics,
      rankings,
      insights,
    };
  }

  /**
   * Calculate share of voice
   */
  async getShareOfVoice(
    workspaceId: string,
    query: ShareOfVoiceQueryDto,
  ): Promise<ShareOfVoiceResponse> {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // This would integrate with the listening service to get mention data
    // For now, we'll use engagement metrics as a proxy
    const workspaceEngagement = await this.getWorkspaceTotalEngagement(
      workspaceId,
      startDate,
      endDate,
      query.platforms,
    );

    const competitors = await this.getCompetitors(workspaceId);
    const breakdown: ShareOfVoiceResponse['breakdown'] = [
      {
        id: workspaceId,
        name: 'Your Brand',
        mentions: workspaceEngagement.mentions,
        mentionsPercentage: 0,
        engagement: workspaceEngagement.engagement,
        engagementPercentage: 0,
        reach: workspaceEngagement.reach,
        reachPercentage: 0,
        isWorkspace: true,
      },
    ];

    let totalMentions = workspaceEngagement.mentions;
    let totalEngagement = workspaceEngagement.engagement;
    let totalReach = workspaceEngagement.reach;

    for (const competitor of competitors) {
      if (query.competitorIds && !query.competitorIds.includes(competitor.id)) {
        continue;
      }

      const competitorEngagement = await this.getCompetitorTotalEngagement(
        competitor.id,
        startDate,
        endDate,
        query.platforms,
      );

      totalMentions += competitorEngagement.mentions;
      totalEngagement += competitorEngagement.engagement;
      totalReach += competitorEngagement.reach;

      breakdown.push({
        id: competitor.id,
        name: competitor.name,
        mentions: competitorEngagement.mentions,
        mentionsPercentage: 0,
        engagement: competitorEngagement.engagement,
        engagementPercentage: 0,
        reach: competitorEngagement.reach,
        reachPercentage: 0,
        isWorkspace: false,
      });
    }

    // Calculate percentages
    breakdown.forEach(item => {
      item.mentionsPercentage = totalMentions > 0 ? (item.mentions / totalMentions) * 100 : 0;
      item.engagementPercentage = totalEngagement > 0 ? (item.engagement / totalEngagement) * 100 : 0;
      item.reachPercentage = totalReach > 0 ? (item.reach / totalReach) * 100 : 0;
    });

    return {
      totalMentions,
      totalEngagement,
      totalReach,
      breakdown,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }

  /**
   * Get industry benchmarks
   */
  async getIndustryBenchmarks(
    workspaceId: string,
    query: IndustryBenchmarkQueryDto,
  ): Promise<IndustryBenchmarkResponse> {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Get all competitors in the same industry
    const industryCompetitors = await this.prisma.competitor.findMany({
      where: {
        industry: query.industry,
        isActive: true,
      },
      include: {
        accounts: true,
      },
    });

    if (industryCompetitors.length === 0) {
      throw new BadRequestException('No competitors found in this industry');
    }

    // Calculate industry averages by platform
    const platformBenchmarks = new Map<string, any>();

    for (const competitor of industryCompetitors) {
      for (const account of competitor.accounts) {
        if (query.platforms && !query.platforms.includes(account.platform.toLowerCase())) {
          continue;
        }

        const metrics = await this.getCompetitorMetrics(
          competitor.id,
          account.id,
          startDate,
          endDate,
        );

        const platform = account.platform.toLowerCase();
        if (!platformBenchmarks.has(platform)) {
          platformBenchmarks.set(platform, {
            platform,
            totalFollowers: 0,
            totalEngagementRate: 0,
            totalPostingFrequency: 0,
            count: 0,
            topPerformers: [],
          });
        }

        const benchmark = platformBenchmarks.get(platform);
        benchmark.totalFollowers += metrics.followers;
        benchmark.totalEngagementRate += metrics.engagementRate;
        benchmark.totalPostingFrequency += metrics.postingFrequency;
        benchmark.count += 1;
        benchmark.topPerformers.push({
          name: competitor.name,
          followers: metrics.followers,
          engagementRate: metrics.engagementRate,
        });
      }
    }

    // Calculate averages and get top performers
    const benchmarks = Array.from(platformBenchmarks.values()).map(b => ({
      platform: b.platform,
      averageFollowers: b.count > 0 ? Math.round(b.totalFollowers / b.count) : 0,
      averageEngagementRate: b.count > 0 ? b.totalEngagementRate / b.count : 0,
      averagePostingFrequency: b.count > 0 ? b.totalPostingFrequency / b.count : 0,
      topPerformers: b.topPerformers
        .sort((a: any, b: any) => b.engagementRate - a.engagementRate)
        .slice(0, 5),
    }));

    // Get workspace metrics for comparison
    const workspaceMetrics = await this.getWorkspaceMetrics(
      workspaceId,
      startDate,
      endDate,
      query.platforms,
    );

    const workspaceComparison = benchmarks.map(b => {
      const workspacePlatformMetric = (workspaceMetrics as any)[b.platform] || {
        followers: 0,
        engagementRate: 0,
        postingFrequency: 0,
      };

      const percentile = this.calculatePercentile(
        workspacePlatformMetric.engagementRate,
        b.averageEngagementRate,
      );

      return {
        platform: b.platform,
        workspaceValue: workspacePlatformMetric.engagementRate,
        industryAverage: b.averageEngagementRate,
        percentile,
        status: percentile >= 75 ? 'above' : percentile >= 25 ? 'average' : 'below',
      };
    });

    return {
      industry: query.industry,
      benchmarks,
      workspaceComparison: workspaceComparison as any,
    };
  }

  /**
   * Get competitor activity monitoring
   */
  async getCompetitorActivity(
    workspaceId: string,
    query: CompetitorActivityQueryDto,
  ): Promise<CompetitorActivityResponse> {
    const competitor = await this.getCompetitor(workspaceId, query.competitorId);
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Get metrics grouped by day
    const matchQuery: any = {
      competitorId: competitor.id,
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (query.platform) {
      matchQuery.platform = query.platform;
    }

    const dailyMetrics = await this.competitorMetricModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            platform: '$platform',
          },
          posts: { $sum: '$totalPosts' },
          totalLikes: { $sum: '$totalLikes' },
          totalComments: { $sum: '$totalComments' },
          totalShares: { $sum: '$totalShares' },
          engagementRate: { $avg: '$engagementRate' },
          topHashtags: { $push: '$topHashtags' },
        },
      },
      { $sort: { '_id.date': 1 } },
      { $limit: query.limit || 30 },
    ]);

    const activities = dailyMetrics.map(m => ({
      date: m._id.date,
      posts: m.posts,
      totalLikes: m.totalLikes,
      totalComments: m.totalComments,
      totalShares: m.totalShares,
      engagementRate: m.engagementRate,
      topPosts: [], // Would need to fetch actual posts from platform APIs
    }));

    // Calculate summary
    const totalPosts = activities.reduce((sum, a) => sum + a.posts, 0);
    const averageEngagement = activities.length > 0
      ? activities.reduce((sum, a) => sum + a.engagementRate, 0) / activities.length
      : 0;

    // Find peak posting time (simplified - would need more detailed data)
    const peakPostingTime = '12:00 PM'; // Placeholder

    // Aggregate hashtags
    const hashtagCounts = new Map<string, number>();
    dailyMetrics.forEach(m => {
      if (m.topHashtags) {
        m.topHashtags.flat().forEach((tag: string) => {
          hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
        });
      }
    });

    const mostUsedHashtags = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    return {
      competitorId: competitor.id,
      competitorName: competitor.name,
      platform: query.platform || 'all',
      activities,
      summary: {
        totalPosts,
        averageEngagement,
        peakPostingTime,
        mostUsedHashtags,
        contentTypeDistribution: {}, // Would need actual content type data
      },
    };
  }

  /**
   * Store competitor metrics (called by metrics collection service)
   */
  async storeCompetitorMetrics(
    workspaceId: string,
    competitorId: string,
    competitorAccountId: string,
    platform: string,
    metrics: any,
  ) {
    return this.competitorMetricModel.create({
      workspaceId,
      competitorId,
      competitorAccountId,
      platform,
      timestamp: new Date(),
      ...metrics,
    });
  }

  // Private helper methods

  private async getWorkspaceMetrics(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    platforms?: string[],
  ) {
    // This would integrate with the existing metrics collection service
    // For now, return mock data structure
    return {
      followers: 10000,
      followersGrowth: 500,
      followersGrowthPercentage: 5,
      totalPosts: 100,
      postsGrowth: 10,
      engagementRate: 3.5,
      engagementRateChange: 0.5,
      averageLikesPerPost: 350,
      averageCommentsPerPost: 25,
      postingFrequency: 3.3,
    };
  }

  private async getCompetitorMetrics(
    competitorId: string,
    accountId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const metrics = await this.competitorMetricModel
      .find({
        competitorId,
        competitorAccountId: accountId,
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ timestamp: -1 })
      .limit(2);

    if (metrics.length === 0) {
      return {
        followers: 0,
        followersGrowth: 0,
        followersGrowthPercentage: 0,
        totalPosts: 0,
        postsGrowth: 0,
        engagementRate: 0,
        engagementRateChange: 0,
        averageLikesPerPost: 0,
        averageCommentsPerPost: 0,
        postingFrequency: 0,
      };
    }

    const latest = metrics[0];
    const previous = metrics[1] || latest;

    return {
      followers: latest.followers,
      followersGrowth: latest.followers - previous.followers,
      followersGrowthPercentage: previous.followers > 0
        ? ((latest.followers - previous.followers) / previous.followers) * 100
        : 0,
      totalPosts: latest.totalPosts,
      postsGrowth: latest.totalPosts - previous.totalPosts,
      engagementRate: latest.engagementRate,
      engagementRateChange: latest.engagementRate - previous.engagementRate,
      averageLikesPerPost: latest.averageLikesPerPost,
      averageCommentsPerPost: latest.averageCommentsPerPost,
      postingFrequency: latest.postingFrequency,
    };
  }

  private async getWorkspaceTotalEngagement(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    platforms?: string[],
  ) {
    // This would integrate with existing analytics
    return {
      mentions: 1000,
      engagement: 5000,
      reach: 50000,
    };
  }

  private async getCompetitorTotalEngagement(
    competitorId: string,
    startDate: Date,
    endDate: Date,
    platforms?: string[],
  ) {
    const metrics = await this.competitorMetricModel.aggregate([
      {
        $match: {
          competitorId,
          timestamp: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          mentions: { $sum: '$totalPosts' },
          engagement: { $sum: { $add: ['$totalLikes', '$totalComments', '$totalShares'] } },
          reach: { $sum: '$totalViews' },
        },
      },
    ]);

    return metrics[0] || { mentions: 0, engagement: 0, reach: 0 };
  }

  private calculateRankings(workspaceMetrics: any, competitorMetrics: CompetitorMetricsResponse[]) {
    const allMetrics = [
      {
        id: 'workspace',
        name: 'Your Brand',
        ...workspaceMetrics,
        isWorkspace: true,
      },
      ...competitorMetrics.map(c => ({
        id: c.competitorId,
        name: c.competitorName,
        ...c.metrics,
        isWorkspace: false,
      })),
    ];

    const createRanking = (key: string): RankingItem[] => {
      return allMetrics
        .sort((a, b) => (b[key] || 0) - (a[key] || 0))
        .map((item, index) => ({
          id: item.id,
          name: item.name,
          value: item[key] || 0,
          rank: index + 1,
          isWorkspace: item.isWorkspace,
        }));
    };

    return {
      byFollowers: createRanking('followers'),
      byEngagement: createRanking('engagementRate'),
      byGrowth: createRanking('followersGrowthPercentage'),
      byPostingFrequency: createRanking('postingFrequency'),
    };
  }

  private generateInsights(
    workspaceMetrics: any,
    competitorMetrics: CompetitorMetricsResponse[],
    rankings: any,
  ): string[] {
    const insights: string[] = [];

    // Follower insights
    const followerRank = rankings.byFollowers.find((r: RankingItem) => r.isWorkspace)?.rank || 0;
    if (followerRank === 1) {
      insights.push('You have the highest follower count among tracked competitors.');
    } else if (followerRank <= 3) {
      insights.push(`You rank #${followerRank} in follower count among competitors.`);
    } else {
      insights.push(`You rank #${followerRank} in follower count. Consider strategies to increase your audience.`);
    }

    // Engagement insights
    const engagementRank = rankings.byEngagement.find((r: RankingItem) => r.isWorkspace)?.rank || 0;
    if (engagementRank === 1) {
      insights.push('Your engagement rate is the highest among competitors. Great job!');
    } else {
      const topCompetitor = rankings.byEngagement[0];
      const diff = topCompetitor.value - workspaceMetrics.engagementRate;
      insights.push(
        `Your engagement rate is ${diff.toFixed(2)}% lower than the top competitor. Focus on creating more engaging content.`,
      );
    }

    // Growth insights
    if (workspaceMetrics.followersGrowthPercentage > 5) {
      insights.push('Your follower growth is strong. Keep up the momentum!');
    } else if (workspaceMetrics.followersGrowthPercentage < 0) {
      insights.push('You are losing followers. Review your content strategy and posting frequency.');
    }

    // Posting frequency insights
    const avgPostingFrequency = competitorMetrics.reduce((sum, c) => sum + c.metrics.postingFrequency, 0) / competitorMetrics.length;
    if (workspaceMetrics.postingFrequency < avgPostingFrequency * 0.7) {
      insights.push(
        `You post ${workspaceMetrics.postingFrequency.toFixed(1)} times per day vs competitor average of ${avgPostingFrequency.toFixed(1)}. Consider increasing posting frequency.`,
      );
    }

    return insights;
  }

  private calculatePercentile(value: number, average: number): number {
    if (average === 0) return 50;
    const ratio = value / average;
    if (ratio >= 1.5) return 90;
    if (ratio >= 1.2) return 75;
    if (ratio >= 0.8) return 50;
    if (ratio >= 0.5) return 25;
    return 10;
  }
}
