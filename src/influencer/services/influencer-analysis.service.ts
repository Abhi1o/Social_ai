import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InfluencerDiscoveryService } from './influencer-discovery.service';
import { AuthenticityCheckerService } from './authenticity-checker.service';
import { EngagementAnalyzerService } from './engagement-analyzer.service';
import { InfluencerScoringService } from './influencer-scoring.service';
import { AnalyzeInfluencerDto } from '../dto/analyze-influencer.dto';
import {
  InfluencerAnalysisResult,
  InfluencerMetrics,
} from '../interfaces/influencer-analysis.interface';

@Injectable()
export class InfluencerAnalysisService {
  private readonly logger = new Logger(InfluencerAnalysisService.name);

  constructor(
    private readonly discoveryService: InfluencerDiscoveryService,
    private readonly authenticityChecker: AuthenticityCheckerService,
    private readonly engagementAnalyzer: EngagementAnalyzerService,
    private readonly scoringService: InfluencerScoringService,
  ) {}

  /**
   * Analyze an influencer from a social platform
   * This is the main entry point for influencer analysis
   */
  async analyzeInfluencer(
    workspaceId: string,
    analyzeDto: AnalyzeInfluencerDto,
    targetNiches?: string[],
  ): Promise<InfluencerAnalysisResult> {
    const { platform, username } = analyzeDto;

    this.logger.log(
      `Analyzing influencer: ${username} on ${platform} for workspace ${workspaceId}`,
    );

    // Fetch influencer data from platform API
    const influencerData = await this.fetchInfluencerDataFromPlatform(
      platform,
      username,
    );

    // Fetch recent posts for analysis
    const recentPosts = await this.fetchRecentPosts(platform, username);

    // Calculate engagement rate
    const engagementRate = this.engagementAnalyzer.calculateEngagementRate(
      influencerData.metrics.avgLikes,
      influencerData.metrics.avgComments,
      influencerData.metrics.avgShares,
      influencerData.metrics.followers,
    );

    influencerData.metrics.engagementRate = engagementRate;

    // Analyze authenticity
    const authenticityAnalysis = await this.authenticityChecker.analyzeAuthenticity(
      platform,
      influencerData.metrics,
      recentPosts,
    );

    // Analyze engagement patterns
    const engagementAnalysis = this.engagementAnalyzer.analyzeMetrics(
      influencerData.metrics,
      recentPosts,
    );

    // Calculate overall score
    const score = this.scoringService.calculateInfluencerScore(
      influencerData.metrics,
      authenticityAnalysis,
      engagementAnalysis.score,
      influencerData.niche,
      targetNiches,
    );

    // Generate recommendations
    const recommendations = [
      ...this.scoringService.getRecommendations(score),
      ...this.authenticityChecker.getRecommendations(authenticityAnalysis),
      ...engagementAnalysis.recommendations,
    ];

    // Save or update influencer in database
    await this.discoveryService.upsertInfluencer(workspaceId, {
      platform,
      username,
      displayName: influencerData.displayName,
      avatar: influencerData.avatar,
      bio: influencerData.bio,
      metrics: influencerData.metrics,
      authenticityScore: authenticityAnalysis.score,
      niche: influencerData.niche,
      audienceData: influencerData.audienceData,
      location: influencerData.location,
      language: influencerData.language,
      tags: [],
      status: 'discovered',
    });

    return {
      platform,
      username,
      displayName: influencerData.displayName,
      avatar: influencerData.avatar,
      bio: influencerData.bio,
      metrics: influencerData.metrics,
      authenticityAnalysis,
      score,
      niche: influencerData.niche,
      audienceData: influencerData.audienceData,
      recentPosts: recentPosts.map((post) => ({
        ...post,
        engagementRate: this.engagementAnalyzer.calculateEngagementRate(
          post.likes,
          post.comments,
          post.shares,
          influencerData.metrics.followers,
        ),
      })),
      recommendations,
    };
  }

  /**
   * Fetch influencer data from platform API
   * In a real implementation, this would call the actual platform APIs
   */
  private async fetchInfluencerDataFromPlatform(
    platform: string,
    username: string,
  ): Promise<{
    displayName: string;
    avatar: string;
    bio: string;
    metrics: InfluencerMetrics;
    niche: string[];
    audienceData: any;
    location: string;
    language: string;
  }> {
    // TODO: Implement actual platform API calls
    // For now, this is a placeholder that would be replaced with real API integration

    this.logger.warn(
      `Platform API integration not yet implemented for ${platform}. Using mock data.`,
    );

    // Mock data for development
    return {
      displayName: username,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      bio: `${username} - Content creator on ${platform}`,
      metrics: {
        followers: Math.floor(Math.random() * 100000) + 1000,
        following: Math.floor(Math.random() * 5000) + 100,
        posts: Math.floor(Math.random() * 500) + 50,
        engagementRate: 0, // Will be calculated
        avgLikes: Math.floor(Math.random() * 1000) + 100,
        avgComments: Math.floor(Math.random() * 100) + 10,
        avgShares: Math.floor(Math.random() * 50) + 5,
      },
      niche: ['lifestyle', 'fashion'],
      audienceData: {
        demographics: {
          ageGroups: {
            '18-24': 30,
            '25-34': 40,
            '35-44': 20,
            '45+': 10,
          },
          genderSplit: {
            male: 45,
            female: 55,
          },
          topLocations: [
            { location: 'United States', percentage: 40 },
            { location: 'United Kingdom', percentage: 20 },
            { location: 'Canada', percentage: 15 },
          ],
        },
        interests: ['fashion', 'lifestyle', 'travel', 'food'],
      },
      location: 'United States',
      language: 'en',
    };
  }

  /**
   * Fetch recent posts from platform
   */
  private async fetchRecentPosts(
    platform: string,
    username: string,
  ): Promise<
    Array<{
      id: string;
      content: string;
      likes: number;
      comments: number;
      shares: number;
      postedAt: Date;
    }>
  > {
    // TODO: Implement actual platform API calls
    this.logger.warn(
      `Platform API integration not yet implemented for ${platform}. Using mock data.`,
    );

    // Mock data for development
    const posts = [];
    for (let i = 0; i < 10; i++) {
      posts.push({
        id: `post_${i}`,
        content: `Sample post ${i} from ${username}`,
        likes: Math.floor(Math.random() * 1000) + 100,
        comments: Math.floor(Math.random() * 100) + 10,
        shares: Math.floor(Math.random() * 50) + 5,
        postedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      });
    }
    return posts;
  }

  /**
   * Batch analyze multiple influencers
   */
  async batchAnalyzeInfluencers(
    workspaceId: string,
    influencers: AnalyzeInfluencerDto[],
    targetNiches?: string[],
  ): Promise<InfluencerAnalysisResult[]> {
    this.logger.log(
      `Batch analyzing ${influencers.length} influencers for workspace ${workspaceId}`,
    );

    const results = await Promise.all(
      influencers.map((influencer) =>
        this.analyzeInfluencer(workspaceId, influencer, targetNiches),
      ),
    );

    return results;
  }

  /**
   * Re-analyze an existing influencer
   */
  async reanalyzeInfluencer(
    workspaceId: string,
    influencerId: string,
    targetNiches?: string[],
  ): Promise<InfluencerAnalysisResult> {
    const influencer = await this.discoveryService.getInfluencerById(
      workspaceId,
      influencerId,
    );

    if (!influencer) {
      throw new NotFoundException(
        `Influencer with ID ${influencerId} not found`,
      );
    }

    return this.analyzeInfluencer(
      workspaceId,
      {
        platform: influencer.platform,
        username: influencer.username,
      },
      targetNiches,
    );
  }

  /**
   * Compare multiple influencers
   */
  async compareInfluencers(
    workspaceId: string,
    influencerIds: string[],
  ): Promise<{
    influencers: InfluencerAnalysisResult[];
    comparison: any;
  }> {
    if (influencerIds.length < 2) {
      throw new Error('At least 2 influencers are required for comparison');
    }

    // Fetch and analyze all influencers
    const influencers = await Promise.all(
      influencerIds.map((id) => this.reanalyzeInfluencer(workspaceId, id)),
    );

    // Generate comparison matrix
    const comparison = {
      metrics: this.compareMetrics(influencers),
      scores: this.compareScores(influencers),
      recommendations: this.generateComparisonRecommendations(influencers),
    };

    return {
      influencers,
      comparison,
    };
  }

  /**
   * Compare metrics across influencers
   */
  private compareMetrics(influencers: InfluencerAnalysisResult[]) {
    return {
      followers: influencers.map((inf) => ({
        username: inf.username,
        value: inf.metrics.followers,
      })),
      engagementRate: influencers.map((inf) => ({
        username: inf.username,
        value: inf.metrics.engagementRate,
      })),
      authenticityScore: influencers.map((inf) => ({
        username: inf.username,
        value: inf.authenticityAnalysis.score,
      })),
    };
  }

  /**
   * Compare scores across influencers
   */
  private compareScores(influencers: InfluencerAnalysisResult[]) {
    return influencers.map((inf) => ({
      username: inf.username,
      overall: inf.score.overall,
      reach: inf.score.reach,
      engagement: inf.score.engagement,
      authenticity: inf.score.authenticity,
      relevance: inf.score.relevance,
      consistency: inf.score.consistency,
    }));
  }

  /**
   * Generate comparison recommendations
   */
  private generateComparisonRecommendations(
    influencers: InfluencerAnalysisResult[],
  ): string[] {
    const recommendations: string[] = [];

    // Find best overall
    const bestOverall = influencers.reduce((best, current) =>
      current.score.overall > best.score.overall ? current : best,
    );

    recommendations.push(
      `${bestOverall.username} has the highest overall score (${bestOverall.score.overall})`,
    );

    // Find best engagement
    const bestEngagement = influencers.reduce((best, current) =>
      current.metrics.engagementRate > best.metrics.engagementRate
        ? current
        : best,
    );

    recommendations.push(
      `${bestEngagement.username} has the highest engagement rate (${bestEngagement.metrics.engagementRate}%)`,
    );

    // Find best authenticity
    const bestAuthenticity = influencers.reduce((best, current) =>
      current.authenticityAnalysis.score > best.authenticityAnalysis.score
        ? current
        : best,
    );

    recommendations.push(
      `${bestAuthenticity.username} has the highest authenticity score (${bestAuthenticity.authenticityAnalysis.score})`,
    );

    return recommendations;
  }
}
