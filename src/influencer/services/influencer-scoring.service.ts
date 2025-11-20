import { Injectable, Logger } from '@nestjs/common';
import {
  InfluencerMetrics,
  AudienceAuthenticity,
  InfluencerScore,
} from '../interfaces/influencer-analysis.interface';

@Injectable()
export class InfluencerScoringService {
  private readonly logger = new Logger(InfluencerScoringService.name);

  /**
   * Calculate overall influencer score
   */
  calculateInfluencerScore(
    metrics: InfluencerMetrics,
    authenticity: AudienceAuthenticity,
    engagementScore: number,
    niche: string[],
    targetNiches?: string[],
  ): InfluencerScore {
    // Calculate individual scores
    const reachScore = this.calculateReachScore(metrics.followers);
    const engagementScoreValue = engagementScore;
    const authenticityScore = authenticity.score;
    const relevanceScore = this.calculateRelevanceScore(niche, targetNiches);
    const consistencyScore = this.calculateConsistencyScore(
      metrics.posts,
      metrics.followers,
    );

    // Calculate weighted overall score
    const overall = Math.round(
      reachScore * 0.25 +
        engagementScoreValue * 0.3 +
        authenticityScore * 0.25 +
        relevanceScore * 0.15 +
        consistencyScore * 0.05,
    );

    return {
      overall,
      reach: reachScore,
      engagement: engagementScoreValue,
      authenticity: authenticityScore,
      relevance: relevanceScore,
      consistency: consistencyScore,
    };
  }

  /**
   * Calculate reach score based on follower count
   */
  private calculateReachScore(followers: number): number {
    // Logarithmic scale for reach
    if (followers >= 1000000) return 100; // Mega influencer
    if (followers >= 500000) return 95;
    if (followers >= 100000) return 90; // Macro influencer
    if (followers >= 50000) return 85;
    if (followers >= 10000) return 80; // Micro influencer
    if (followers >= 5000) return 70;
    if (followers >= 1000) return 60; // Nano influencer
    if (followers >= 500) return 50;
    return 40;
  }

  /**
   * Calculate relevance score based on niche match
   */
  private calculateRelevanceScore(
    influencerNiches: string[],
    targetNiches?: string[],
  ): number {
    if (!targetNiches || targetNiches.length === 0) {
      return 70; // Neutral score if no target niches specified
    }

    if (influencerNiches.length === 0) {
      return 50; // Low score if influencer has no niches
    }

    // Calculate overlap
    const matchingNiches = influencerNiches.filter((niche) =>
      targetNiches.some(
        (target) => target.toLowerCase() === niche.toLowerCase(),
      ),
    );

    const overlapPercentage =
      (matchingNiches.length / targetNiches.length) * 100;

    if (overlapPercentage >= 80) return 100;
    if (overlapPercentage >= 60) return 90;
    if (overlapPercentage >= 40) return 80;
    if (overlapPercentage >= 20) return 70;
    return 60;
  }

  /**
   * Calculate consistency score based on posting frequency
   */
  private calculateConsistencyScore(posts: number, followers: number): number {
    if (followers === 0) return 50;

    const postsPerFollower = posts / followers;

    // Healthy ratio indicates consistent posting
    if (postsPerFollower >= 0.001 && postsPerFollower <= 0.01) {
      return 100;
    } else if (postsPerFollower >= 0.0005 && postsPerFollower <= 0.02) {
      return 85;
    } else if (postsPerFollower >= 0.0001 && postsPerFollower <= 0.05) {
      return 70;
    } else {
      return 55;
    }
  }

  /**
   * Get influencer tier based on followers
   */
  getInfluencerTier(followers: number): string {
    if (followers >= 1000000) return 'Mega';
    if (followers >= 100000) return 'Macro';
    if (followers >= 10000) return 'Micro';
    if (followers >= 1000) return 'Nano';
    return 'Emerging';
  }

  /**
   * Get score rating label
   */
  getScoreRating(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Get recommendations based on score
   */
  getRecommendations(score: InfluencerScore): string[] {
    const recommendations: string[] = [];

    if (score.overall >= 80) {
      recommendations.push(
        'High-quality influencer. Strong candidate for collaboration.',
      );
    } else if (score.overall < 60) {
      recommendations.push(
        'Low overall score. Consider other influencers or verify data accuracy.',
      );
    }

    if (score.reach < 60) {
      recommendations.push(
        'Limited reach. Consider for niche campaigns or combine with other influencers.',
      );
    }

    if (score.engagement < 60) {
      recommendations.push(
        'Low engagement. Verify audience quality and content relevance.',
      );
    }

    if (score.authenticity < 60) {
      recommendations.push(
        'Authenticity concerns. Request detailed audience insights before collaboration.',
      );
    }

    if (score.relevance < 70) {
      recommendations.push(
        'Limited niche relevance. Ensure alignment with campaign goals.',
      );
    }

    if (score.consistency < 60) {
      recommendations.push(
        'Inconsistent posting patterns. Verify current activity level.',
      );
    }

    return recommendations;
  }

  /**
   * Compare two influencers
   */
  compareInfluencers(
    score1: InfluencerScore,
    score2: InfluencerScore,
  ): {
    winner: 1 | 2 | 'tie';
    differences: Record<string, number>;
    recommendation: string;
  } {
    const differences = {
      overall: score1.overall - score2.overall,
      reach: score1.reach - score2.reach,
      engagement: score1.engagement - score2.engagement,
      authenticity: score1.authenticity - score2.authenticity,
      relevance: score1.relevance - score2.relevance,
      consistency: score1.consistency - score2.consistency,
    };

    let winner: 1 | 2 | 'tie' = 'tie';
    if (differences.overall > 5) winner = 1;
    else if (differences.overall < -5) winner = 2;

    let recommendation = '';
    if (winner === 'tie') {
      recommendation = 'Both influencers have similar overall scores. Consider other factors like budget and availability.';
    } else {
      const betterInfluencer = winner === 1 ? 'first' : 'second';
      const strengths: string[] = [];

      Object.entries(differences).forEach(([key, diff]) => {
        if (Math.abs(diff) > 10) {
          if ((winner === 1 && diff > 0) || (winner === 2 && diff < 0)) {
            strengths.push(key);
          }
        }
      });

      recommendation = `The ${betterInfluencer} influencer has a stronger overall score${
        strengths.length > 0 ? `, particularly in ${strengths.join(', ')}` : ''
      }.`;
    }

    return {
      winner,
      differences,
      recommendation,
    };
  }
}
