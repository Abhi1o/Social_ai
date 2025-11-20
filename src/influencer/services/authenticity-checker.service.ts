import { Injectable, Logger } from '@nestjs/common';
import { AudienceAuthenticity } from '../interfaces/influencer-analysis.interface';

@Injectable()
export class AuthenticityCheckerService {
  private readonly logger = new Logger(AuthenticityCheckerService.name);

  /**
   * Analyze audience authenticity
   */
  async analyzeAuthenticity(
    platform: string,
    metrics: {
      followers: number;
      following: number;
      posts: number;
      engagementRate: number;
      avgLikes: number;
      avgComments: number;
    },
    recentPosts: Array<{
      likes: number;
      comments: number;
      shares: number;
      postedAt: Date;
    }>,
  ): Promise<AudienceAuthenticity> {
    // Calculate various authenticity factors
    const followerGrowthPattern = this.analyzeFollowerGrowthPattern(
      metrics.followers,
      metrics.posts,
    );
    const engagementConsistency = this.analyzeEngagementConsistency(recentPosts);
    const followerQuality = this.analyzeFollowerQuality(
      metrics.followers,
      metrics.following,
      metrics.engagementRate,
    );
    const commentQuality = this.analyzeCommentQuality(
      metrics.avgComments,
      metrics.avgLikes,
    );

    // Calculate overall authenticity score (0-100)
    const score = Math.round(
      followerGrowthPattern * 0.25 +
        engagementConsistency * 0.3 +
        followerQuality * 0.3 +
        commentQuality * 0.15,
    );

    // Estimate bot percentage
    const botPercentage = Math.max(0, 100 - score);
    const suspiciousFollowers = Math.round(
      (metrics.followers * botPercentage) / 100,
    );
    const realFollowers = metrics.followers - suspiciousFollowers;

    return {
      score,
      suspiciousFollowers,
      realFollowers,
      botPercentage,
      factors: {
        followerGrowthPattern,
        engagementConsistency,
        followerQuality,
        commentQuality,
      },
    };
  }

  /**
   * Analyze follower growth pattern
   * Suspicious patterns: sudden spikes, unrealistic growth
   */
  private analyzeFollowerGrowthPattern(
    followers: number,
    posts: number,
  ): number {
    if (posts === 0) return 50; // Neutral score for no posts

    const postsPerFollower = posts / followers;

    // Healthy ratio: 1 post per 100-1000 followers
    if (postsPerFollower >= 0.001 && postsPerFollower <= 0.01) {
      return 100;
    } else if (postsPerFollower >= 0.0005 && postsPerFollower <= 0.02) {
      return 80;
    } else if (postsPerFollower >= 0.0001 && postsPerFollower <= 0.05) {
      return 60;
    } else {
      return 40;
    }
  }

  /**
   * Analyze engagement consistency across posts
   * Suspicious: highly variable engagement rates
   */
  private analyzeEngagementConsistency(
    recentPosts: Array<{
      likes: number;
      comments: number;
      shares: number;
      postedAt: Date;
    }>,
  ): number {
    if (recentPosts.length < 3) return 70; // Not enough data

    const engagementRates = recentPosts.map((post) => {
      const totalEngagement = post.likes + post.comments + (post.shares || 0);
      return totalEngagement;
    });

    // Calculate coefficient of variation
    const mean =
      engagementRates.reduce((sum, val) => sum + val, 0) / engagementRates.length;
    const variance =
      engagementRates.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      engagementRates.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;

    // Lower CV = more consistent = higher score
    if (coefficientOfVariation < 0.3) return 100;
    if (coefficientOfVariation < 0.5) return 85;
    if (coefficientOfVariation < 0.7) return 70;
    if (coefficientOfVariation < 1.0) return 55;
    return 40;
  }

  /**
   * Analyze follower quality based on follower/following ratio and engagement
   */
  private analyzeFollowerQuality(
    followers: number,
    following: number,
    engagementRate: number,
  ): number {
    const ratio = following > 0 ? followers / following : followers;

    // Analyze follower/following ratio
    let ratioScore = 50;
    if (ratio > 10) ratioScore = 100; // Strong following
    else if (ratio > 5) ratioScore = 90;
    else if (ratio > 2) ratioScore = 80;
    else if (ratio > 1) ratioScore = 70;
    else if (ratio > 0.5) ratioScore = 60;
    else ratioScore = 40; // Following more than followers

    // Analyze engagement rate
    let engagementScore = 50;
    if (engagementRate > 10) engagementScore = 100; // Excellent
    else if (engagementRate > 5) engagementScore = 90;
    else if (engagementRate > 3) engagementScore = 80;
    else if (engagementRate > 1) engagementScore = 70;
    else if (engagementRate > 0.5) engagementScore = 60;
    else engagementScore = 40; // Low engagement

    // Weighted average
    return Math.round(ratioScore * 0.4 + engagementScore * 0.6);
  }

  /**
   * Analyze comment quality
   * Suspicious: very low comment-to-like ratio (bots often only like)
   */
  private analyzeCommentQuality(avgComments: number, avgLikes: number): number {
    if (avgLikes === 0) return 50; // No data

    const commentToLikeRatio = avgComments / avgLikes;

    // Healthy ratio: 1 comment per 10-50 likes
    if (commentToLikeRatio >= 0.02 && commentToLikeRatio <= 0.15) {
      return 100;
    } else if (commentToLikeRatio >= 0.01 && commentToLikeRatio <= 0.2) {
      return 85;
    } else if (commentToLikeRatio >= 0.005 && commentToLikeRatio <= 0.25) {
      return 70;
    } else if (commentToLikeRatio < 0.005) {
      return 40; // Suspiciously low comments
    } else {
      return 60; // Unusually high comments
    }
  }

  /**
   * Get authenticity rating label
   */
  getAuthenticityRating(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Get recommendations based on authenticity analysis
   */
  getRecommendations(authenticity: AudienceAuthenticity): string[] {
    const recommendations: string[] = [];

    if (authenticity.score < 60) {
      recommendations.push(
        'Low authenticity score detected. Verify audience quality before collaboration.',
      );
    }

    if (authenticity.botPercentage > 30) {
      recommendations.push(
        `High bot percentage (${authenticity.botPercentage.toFixed(1)}%). Consider requesting audience insights.`,
      );
    }

    if (authenticity.factors.engagementConsistency < 60) {
      recommendations.push(
        'Inconsistent engagement patterns detected. Review recent post performance.',
      );
    }

    if (authenticity.factors.followerQuality < 60) {
      recommendations.push(
        'Follower quality concerns. Check follower/following ratio and engagement rate.',
      );
    }

    if (authenticity.factors.commentQuality < 60) {
      recommendations.push(
        'Low comment quality. May indicate bot activity or low audience engagement.',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Good authenticity metrics. This influencer appears to have a genuine audience.',
      );
    }

    return recommendations;
  }
}
