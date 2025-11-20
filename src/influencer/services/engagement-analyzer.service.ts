import { Injectable, Logger } from '@nestjs/common';
import { InfluencerMetrics } from '../interfaces/influencer-analysis.interface';

@Injectable()
export class EngagementAnalyzerService {
  private readonly logger = new Logger(EngagementAnalyzerService.name);

  /**
   * Calculate engagement rate
   */
  calculateEngagementRate(
    avgLikes: number,
    avgComments: number,
    avgShares: number,
    followers: number,
  ): number {
    if (followers === 0) return 0;

    const totalEngagement = avgLikes + avgComments + avgShares;
    const engagementRate = (totalEngagement / followers) * 100;

    return Math.round(engagementRate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Analyze engagement patterns from recent posts
   */
  analyzeEngagementPatterns(
    recentPosts: Array<{
      likes: number;
      comments: number;
      shares: number;
      postedAt: Date;
    }>,
  ): {
    avgEngagement: number;
    consistency: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    peakTimes: string[];
  } {
    if (recentPosts.length === 0) {
      return {
        avgEngagement: 0,
        consistency: 0,
        trend: 'stable',
        peakTimes: [],
      };
    }

    // Calculate average engagement
    const engagements = recentPosts.map(
      (post) => post.likes + post.comments + (post.shares || 0),
    );
    const avgEngagement =
      engagements.reduce((sum, val) => sum + val, 0) / engagements.length;

    // Calculate consistency (coefficient of variation)
    const mean = avgEngagement;
    const variance =
      engagements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      engagements.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
    const consistency = Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100));

    // Determine trend (simple linear regression)
    const trend = this.calculateTrend(engagements);

    // Identify peak posting times
    const peakTimes = this.identifyPeakTimes(recentPosts);

    return {
      avgEngagement: Math.round(avgEngagement),
      consistency: Math.round(consistency),
      trend,
      peakTimes,
    };
  }

  /**
   * Calculate engagement trend
   */
  private calculateTrend(
    engagements: number[],
  ): 'increasing' | 'stable' | 'decreasing' {
    if (engagements.length < 3) return 'stable';

    // Simple linear regression
    const n = engagements.length;
    const xSum = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ...
    const ySum = engagements.reduce((sum, val) => sum + val, 0);
    const xySum = engagements.reduce((sum, val, idx) => sum + idx * val, 0);
    const xSquaredSum = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum);

    // Determine trend based on slope
    const avgEngagement = ySum / n;
    const slopePercentage = (slope / avgEngagement) * 100;

    if (slopePercentage > 5) return 'increasing';
    if (slopePercentage < -5) return 'decreasing';
    return 'stable';
  }

  /**
   * Identify peak posting times
   */
  private identifyPeakTimes(
    recentPosts: Array<{
      likes: number;
      comments: number;
      shares: number;
      postedAt: Date;
    }>,
  ): string[] {
    if (recentPosts.length === 0) return [];

    // Group posts by hour of day
    const hourlyEngagement: Record<number, number[]> = {};

    recentPosts.forEach((post) => {
      const hour = new Date(post.postedAt).getHours();
      const engagement = post.likes + post.comments + (post.shares || 0);

      if (!hourlyEngagement[hour]) {
        hourlyEngagement[hour] = [];
      }
      hourlyEngagement[hour].push(engagement);
    });

    // Calculate average engagement per hour
    const hourlyAvg: Array<{ hour: number; avg: number }> = [];
    Object.entries(hourlyEngagement).forEach(([hour, engagements]) => {
      const avg = engagements.reduce((sum, val) => sum + val, 0) / engagements.length;
      hourlyAvg.push({ hour: parseInt(hour), avg });
    });

    // Sort by average engagement
    hourlyAvg.sort((a, b) => b.avg - a.avg);

    // Return top 3 hours
    return hourlyAvg.slice(0, 3).map((item) => {
      const hour = item.hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:00 ${period}`;
    });
  }

  /**
   * Calculate engagement score (0-100)
   */
  calculateEngagementScore(
    engagementRate: number,
    consistency: number,
    trend: 'increasing' | 'stable' | 'decreasing',
  ): number {
    // Base score from engagement rate
    let score = 0;
    if (engagementRate >= 10) score = 100;
    else if (engagementRate >= 5) score = 90;
    else if (engagementRate >= 3) score = 80;
    else if (engagementRate >= 1) score = 70;
    else if (engagementRate >= 0.5) score = 60;
    else score = 50;

    // Adjust for consistency (±10 points)
    const consistencyAdjustment = ((consistency - 50) / 50) * 10;
    score += consistencyAdjustment;

    // Adjust for trend (±5 points)
    if (trend === 'increasing') score += 5;
    else if (trend === 'decreasing') score -= 5;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get engagement rating label
   */
  getEngagementRating(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Analyze metrics and return comprehensive engagement analysis
   */
  analyzeMetrics(
    metrics: InfluencerMetrics,
    recentPosts: Array<{
      likes: number;
      comments: number;
      shares: number;
      postedAt: Date;
    }>,
  ) {
    const patterns = this.analyzeEngagementPatterns(recentPosts);
    const score = this.calculateEngagementScore(
      metrics.engagementRate,
      patterns.consistency,
      patterns.trend,
    );

    return {
      engagementRate: metrics.engagementRate,
      score,
      rating: this.getEngagementRating(score),
      patterns,
      recommendations: this.getRecommendations(metrics, patterns),
    };
  }

  /**
   * Get recommendations based on engagement analysis
   */
  private getRecommendations(
    metrics: InfluencerMetrics,
    patterns: {
      avgEngagement: number;
      consistency: number;
      trend: 'increasing' | 'stable' | 'decreasing';
      peakTimes: string[];
    },
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.engagementRate < 1) {
      recommendations.push(
        'Low engagement rate. Consider influencers with higher audience interaction.',
      );
    }

    if (patterns.consistency < 50) {
      recommendations.push(
        'Inconsistent engagement. Review recent posts for quality variations.',
      );
    }

    if (patterns.trend === 'decreasing') {
      recommendations.push(
        'Declining engagement trend. Verify current audience interest and content quality.',
      );
    }

    if (patterns.trend === 'increasing') {
      recommendations.push(
        'Growing engagement trend. Good timing for collaboration.',
      );
    }

    if (patterns.peakTimes.length > 0) {
      recommendations.push(
        `Peak engagement times: ${patterns.peakTimes.join(', ')}. Consider these for campaign timing.`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Strong engagement metrics. This influencer shows consistent audience interaction.',
      );
    }

    return recommendations;
  }