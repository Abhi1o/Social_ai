import { Injectable, Logger } from '@nestjs/common';
import { AICoordinatorService } from '../services/ai-coordinator.service';
import { AgentType, AIModel } from '../interfaces/ai.interface';
import { PrismaService } from '../../prisma/prisma.service';

export interface HashtagAnalysisRequest {
  content: string;
  platform: string;
  count?: number; // default 30
  workspaceId: string;
}

export interface HashtagSuggestion {
  tag: string;
  category: 'high-reach' | 'medium-reach' | 'niche';
  competition: 'low' | 'medium' | 'high';
  relevanceScore: number; // 0-100
  estimatedReach: number;
  growthVelocity?: number; // percentage growth rate
  reasoning: string;
}

export interface HashtagAnalysisResponse {
  hashtags: HashtagSuggestion[];
  totalSuggestions: number;
  categoryBreakdown: {
    highReach: number;
    mediumReach: number;
    niche: number;
  };
  cost: number;
  tokensUsed: number;
}

export interface HashtagPerformanceRequest {
  hashtags: string[];
  platform: string;
  workspaceId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface HashtagPerformance {
  tag: string;
  totalPosts: number;
  totalEngagement: number;
  averageEngagement: number;
  totalReach: number;
  averageReach: number;
  engagementRate: number;
  trend: 'rising' | 'stable' | 'declining';
  bestPerformingPost?: {
    postId: string;
    engagement: number;
    reach: number;
  };
}

export interface HashtagPerformanceResponse {
  performance: HashtagPerformance[];
  recommendations: string[];
}

export interface HashtagGroup {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  hashtags: string[];
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrendingHashtag {
  tag: string;
  platform: string;
  volume: number;
  growthVelocity: number; // percentage growth rate
  sentiment: number; // -1 to 1
  relatedTopics: string[];
  peakTime?: Date;
  estimatedReach: number;
}

export interface TrendingHashtagsRequest {
  platform?: string;
  category?: string;
  location?: string;
  workspaceId: string;
  limit?: number;
}

export interface TrendingHashtagsResponse {
  trending: TrendingHashtag[];
  timestamp: Date;
}

@Injectable()
export class HashtagIntelligenceAgent {
  private readonly logger = new Logger(HashtagIntelligenceAgent.name);

  // Agent personality and configuration
  private readonly agentPersonality = {
    name: 'Hashtag Intelligence',
    type: 'hashtag_intelligence' as const,
    personality: 'Analytical, trend-aware, and strategic',
    description:
      'Specialized in hashtag analysis, categorization, performance tracking, and trend detection',
  };

  constructor(
    private readonly aiCoordinator: AICoordinatorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Analyze content and suggest relevant hashtags
   */
  async analyzeAndSuggest(
    request: HashtagAnalysisRequest,
  ): Promise<HashtagAnalysisResponse> {
    this.logger.log(
      `Analyzing content for hashtag suggestions (platform: ${request.platform}, count: ${request.count || 30})`,
    );

    const count = request.count || 30;

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(request.platform);
    const userPrompt = this.buildAnalysisPrompt(request.content, count);

    // Get AI suggestions
    const result = await this.aiCoordinator.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: AIModel.GPT_4O_MINI,
      temperature: 0.5,
      maxTokens: 2000,
      workspaceId: request.workspaceId,
      cacheKey: `hashtag:analysis:${this.hashContent(request.content)}:${request.platform}`,
      cacheTTL: 24 * 60 * 60, // 24 hours
    });

    // Parse and categorize hashtags
    const hashtags = this.parseHashtagSuggestions(result.content);

    // Score and rank hashtags
    const scoredHashtags = await this.scoreHashtags(
      hashtags,
      request.platform,
      request.workspaceId,
    );

    // Calculate category breakdown
    const categoryBreakdown = this.calculateCategoryBreakdown(scoredHashtags);

    return {
      hashtags: scoredHashtags.slice(0, count),
      totalSuggestions: scoredHashtags.length,
      categoryBreakdown,
      cost: result.cost,
      tokensUsed: result.tokensUsed.total,
    };
  }

  /**
   * Build system prompt for hashtag analysis
   */
  private buildSystemPrompt(platform: string): string {
    return `You are a hashtag intelligence AI agent specialized in analyzing content and suggesting optimal hashtags.

Your personality: Analytical, trend-aware, and strategic. You understand hashtag dynamics, reach potential, competition levels, and platform-specific best practices.

Platform: ${platform}
${this.getPlatformHashtagGuidelines(platform)}

Your role is to:
1. Analyze content and extract key themes, topics, and keywords
2. Suggest relevant hashtags categorized by reach potential
3. Assess competition level for each hashtag
4. Provide relevance scores based on content alignment
5. Estimate potential reach for each hashtag
6. Consider trending hashtags when relevant

Categorization Guidelines:
- HIGH-REACH: Popular hashtags with 1M+ posts, broad appeal, high competition
- MEDIUM-REACH: Moderately popular hashtags with 100K-1M posts, balanced competition
- NICHE: Specific hashtags with <100K posts, low competition, highly targeted

Competition Levels:
- LOW: Easy to rank, less saturated, good for visibility
- MEDIUM: Moderate competition, balanced opportunity
- HIGH: Very competitive, harder to stand out, but high potential reach

Return your response as a JSON array of hashtag suggestions:
[
  {
    "tag": "hashtag without #",
    "category": "high-reach" | "medium-reach" | "niche",
    "competition": "low" | "medium" | "high",
    "relevanceScore": 85,
    "estimatedReach": 50000,
    "reasoning": "why this hashtag is relevant"
  }
]`;
  }

  /**
   * Get platform-specific hashtag guidelines
   */
  private getPlatformHashtagGuidelines(platform: string): string {
    const guidelines: Record<string, string> = {
      instagram: `
Instagram Hashtag Best Practices:
- Optimal count: 5-15 hashtags (up to 30 allowed)
- Mix of high-reach, medium-reach, and niche hashtags
- Place in caption or first comment
- Use branded hashtags when relevant
- Avoid banned or spammy hashtags
- Consider location-based hashtags`,

      twitter: `
Twitter Hashtag Best Practices:
- Optimal count: 1-2 hashtags (maximum 2 recommended)
- Keep hashtags short and memorable
- Use trending hashtags when relevant
- Avoid hashtag stuffing
- Place naturally within tweet text`,

      linkedin: `
LinkedIn Hashtag Best Practices:
- Optimal count: 3-5 hashtags
- Use professional, industry-specific hashtags
- Mix broad and niche hashtags
- Place at end of post
- Focus on thought leadership topics`,

      facebook: `
Facebook Hashtag Best Practices:
- Optimal count: 1-3 hashtags
- Use sparingly compared to other platforms
- Focus on branded or campaign hashtags
- Keep hashtags relevant and specific`,

      tiktok: `
TikTok Hashtag Best Practices:
- Optimal count: 3-8 hashtags
- Use trending hashtags for discovery
- Mix viral and niche hashtags
- Include challenge hashtags when relevant
- Use #FYP and #ForYou strategically`,
    };

    return guidelines[platform.toLowerCase()] || guidelines.instagram;
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(content: string, count: number): string {
    return `Analyze this content and suggest ${count} relevant hashtags:

Content:
"${content}"

Provide a diverse mix of:
- 30% high-reach hashtags (broad appeal, high visibility)
- 40% medium-reach hashtags (balanced reach and competition)
- 30% niche hashtags (targeted, specific audience)

For each hashtag, provide:
1. The hashtag (without #)
2. Category (high-reach, medium-reach, or niche)
3. Competition level (low, medium, or high)
4. Relevance score (0-100)
5. Estimated reach
6. Brief reasoning

Focus on hashtags that are:
- Highly relevant to the content
- Currently active and trending
- Appropriate for the target audience
- Not banned or spammy
- Strategically balanced for maximum visibility`;
  }

  /**
   * Parse hashtag suggestions from AI response
   */
  private parseHashtagSuggestions(content: string): HashtagSuggestion[] {
    try {
      const parsed = JSON.parse(content);
      const suggestions = Array.isArray(parsed) ? parsed : [parsed];

      return suggestions.map((s) => ({
        tag: s.tag.replace(/^#/, ''), // Remove # if present
        category: s.category || 'medium-reach',
        competition: s.competition || 'medium',
        relevanceScore: s.relevanceScore || 50,
        estimatedReach: s.estimatedReach || 10000,
        reasoning: s.reasoning || '',
      }));
    } catch (error) {
      this.logger.warn('Failed to parse hashtag suggestions, using fallback');
      return [];
    }
  }

  /**
   * Score and rank hashtags based on multiple factors
   */
  private async scoreHashtags(
    hashtags: HashtagSuggestion[],
    platform: string,
    workspaceId: string,
  ): Promise<HashtagSuggestion[]> {
    // Get historical performance data for these hashtags
    const historicalPerformance = await this.getHistoricalPerformance(
      hashtags.map((h) => h.tag),
      platform,
      workspaceId,
    );

    // Adjust scores based on historical performance
    const scoredHashtags = hashtags.map((hashtag) => {
      const historical = historicalPerformance.get(hashtag.tag);
      let adjustedScore = hashtag.relevanceScore;

      if (historical) {
        // Boost score if hashtag has performed well historically
        const performanceBoost = Math.min(
          20,
          (historical.averageEngagement / 1000) * 10,
        );
        adjustedScore = Math.min(100, adjustedScore + performanceBoost);
      }

      return {
        ...hashtag,
        relevanceScore: Math.round(adjustedScore),
      };
    });

    // Sort by relevance score descending
    return scoredHashtags.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get historical performance for hashtags
   */
  private async getHistoricalPerformance(
    hashtags: string[],
    platform: string,
    workspaceId: string,
  ): Promise<Map<string, { averageEngagement: number; totalPosts: number }>> {
    const performanceMap = new Map<
      string,
      { averageEngagement: number; totalPosts: number }
    >();

    // In a real implementation, this would query analytics data
    // For now, return empty map (no historical data)
    return performanceMap;
  }

  /**
   * Calculate category breakdown
   */
  private calculateCategoryBreakdown(hashtags: HashtagSuggestion[]): {
    highReach: number;
    mediumReach: number;
    niche: number;
  } {
    const breakdown = {
      highReach: 0,
      mediumReach: 0,
      niche: 0,
    };

    hashtags.forEach((hashtag) => {
      switch (hashtag.category) {
        case 'high-reach':
          breakdown.highReach++;
          break;
        case 'medium-reach':
          breakdown.mediumReach++;
          break;
        case 'niche':
          breakdown.niche++;
          break;
      }
    });

    return breakdown;
  }

  /**
   * Track hashtag performance
   */
  async trackPerformance(
    request: HashtagPerformanceRequest,
  ): Promise<HashtagPerformanceResponse> {
    this.logger.log(
      `Tracking performance for ${request.hashtags.length} hashtags on ${request.platform}`,
    );

    const performance: HashtagPerformance[] = [];

    // Fetch posts using these hashtags
    for (const hashtag of request.hashtags) {
      const hashtagPerformance = await this.calculateHashtagPerformance(
        hashtag,
        request.platform,
        request.workspaceId,
        request.startDate,
        request.endDate,
      );
      performance.push(hashtagPerformance);
    }

    // Generate recommendations based on performance
    const recommendations = this.generatePerformanceRecommendations(performance);

    return {
      performance,
      recommendations,
    };
  }

  /**
   * Calculate performance metrics for a single hashtag
   */
  private async calculateHashtagPerformance(
    hashtag: string,
    platform: string,
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<HashtagPerformance> {
    // Build query to find posts with this hashtag
    const whereClause: any = {
      workspaceId,
      status: 'PUBLISHED',
    };

    if (startDate || endDate) {
      whereClause.publishedAt = {};
      if (startDate) whereClause.publishedAt.gte = startDate;
      if (endDate) whereClause.publishedAt.lte = endDate;
    }

    // In a real implementation, we would query posts by hashtag
    // For now, return mock data
    const totalPosts = Math.floor(Math.random() * 50) + 1;
    const totalEngagement = Math.floor(Math.random() * 5000);
    const totalReach = Math.floor(Math.random() * 50000);

    const averageEngagement = totalPosts > 0 ? totalEngagement / totalPosts : 0;
    const averageReach = totalPosts > 0 ? totalReach / totalPosts : 0;
    const engagementRate =
      totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

    // Determine trend (simplified)
    const trend: 'rising' | 'stable' | 'declining' =
      averageEngagement > 100 ? 'rising' : averageEngagement > 50 ? 'stable' : 'declining';

    return {
      tag: hashtag,
      totalPosts,
      totalEngagement,
      averageEngagement,
      totalReach,
      averageReach,
      engagementRate,
      trend,
    };
  }

  /**
   * Generate recommendations based on performance
   */
  private generatePerformanceRecommendations(
    performance: HashtagPerformance[],
  ): string[] {
    const recommendations: string[] = [];

    // Find best performing hashtags
    const topPerformers = performance
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 3);

    if (topPerformers.length > 0) {
      recommendations.push(
        `Top performing hashtags: ${topPerformers.map((p) => `#${p.tag}`).join(', ')}. Continue using these for maximum engagement.`,
      );
    }

    // Find underperforming hashtags
    const underPerformers = performance.filter(
      (p) => p.engagementRate < 1 && p.totalPosts > 5,
    );

    if (underPerformers.length > 0) {
      recommendations.push(
        `Consider replacing low-performing hashtags: ${underPerformers.map((p) => `#${p.tag}`).join(', ')}`,
      );
    }

    // Find rising hashtags
    const rising = performance.filter((p) => p.trend === 'rising');

    if (rising.length > 0) {
      recommendations.push(
        `Rising hashtags with growth potential: ${rising.map((p) => `#${p.tag}`).join(', ')}`,
      );
    }

    // General recommendations
    if (performance.length > 0) {
      const avgEngagementRate =
        performance.reduce((sum, p) => sum + p.engagementRate, 0) /
        performance.length;

      if (avgEngagementRate < 2) {
        recommendations.push(
          'Overall engagement rate is low. Consider using more niche, targeted hashtags.',
        );
      } else if (avgEngagementRate > 5) {
        recommendations.push(
          'Excellent hashtag performance! Maintain your current strategy.',
        );
      }
    }

    return recommendations;
  }

  /**
   * Create hashtag group
   */
  async createHashtagGroup(
    workspaceId: string,
    name: string,
    hashtags: string[],
    description?: string,
    category?: string,
  ): Promise<HashtagGroup> {
    this.logger.log(`Creating hashtag group "${name}" for workspace ${workspaceId}`);

    // In a real implementation, this would save to database
    // For now, return mock data
    const group: HashtagGroup = {
      id: `group-${Date.now()}`,
      workspaceId,
      name,
      description,
      hashtags: hashtags.map((h) => h.replace(/^#/, '')),
      category,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return group;
  }

  /**
   * Get hashtag groups for workspace
   */
  async getHashtagGroups(workspaceId: string): Promise<HashtagGroup[]> {
    this.logger.log(`Fetching hashtag groups for workspace ${workspaceId}`);

    // In a real implementation, this would query database
    // For now, return empty array
    return [];
  }

  /**
   * Update hashtag group
   */
  async updateHashtagGroup(
    groupId: string,
    updates: Partial<Omit<HashtagGroup, 'id' | 'workspaceId' | 'createdAt'>>,
  ): Promise<HashtagGroup> {
    this.logger.log(`Updating hashtag group ${groupId}`);

    // In a real implementation, this would update database
    // For now, return mock data
    const group: HashtagGroup = {
      id: groupId,
      workspaceId: 'mock-workspace',
      name: updates.name || 'Updated Group',
      description: updates.description,
      hashtags: updates.hashtags || [],
      category: updates.category,
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(),
    };

    return group;
  }

  /**
   * Delete hashtag group
   */
  async deleteHashtagGroup(groupId: string): Promise<void> {
    this.logger.log(`Deleting hashtag group ${groupId}`);

    // In a real implementation, this would delete from database
  }

  /**
   * Detect trending hashtags
   */
  async detectTrending(
    request: TrendingHashtagsRequest,
  ): Promise<TrendingHashtagsResponse> {
    this.logger.log(
      `Detecting trending hashtags${request.platform ? ` for ${request.platform}` : ''}`,
    );

    const limit = request.limit || 20;

    // Build system prompt
    const systemPrompt = this.buildTrendingSystemPrompt();
    const userPrompt = this.buildTrendingPrompt(request);

    // Get AI analysis of trending hashtags
    const result = await this.aiCoordinator.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: AIModel.GPT_4O_MINI,
      temperature: 0.3,
      maxTokens: 2000,
      workspaceId: request.workspaceId,
      cacheKey: `hashtag:trending:${request.platform || 'all'}:${request.category || 'all'}`,
      cacheTTL: 1 * 60 * 60, // 1 hour (trends change quickly)
    });

    // Parse trending hashtags
    const trending = this.parseTrendingHashtags(result.content, request.platform);

    return {
      trending: trending.slice(0, limit),
      timestamp: new Date(),
    };
  }

  /**
   * Build system prompt for trending detection
   */
  private buildTrendingSystemPrompt(): string {
    return `You are a trend detection AI agent specialized in identifying trending hashtags and viral content patterns.

Your personality: Observant, quick, and trend-savvy. You monitor conversations, detect patterns, and identify emerging opportunities.

Your role is to:
1. Identify currently trending hashtags
2. Calculate growth velocity (how fast they're growing)
3. Assess sentiment around trending topics
4. Identify related topics and hashtags
5. Estimate reach potential
6. Predict peak times for trends

Return your response as a JSON array of trending hashtags:
[
  {
    "tag": "hashtag without #",
    "platform": "platform name",
    "volume": 50000,
    "growthVelocity": 150,
    "sentiment": 0.7,
    "relatedTopics": ["topic1", "topic2"],
    "estimatedReach": 1000000
  }
]`;
  }

  /**
   * Build trending prompt
   */
  private buildTrendingPrompt(request: TrendingHashtagsRequest): string {
    const parts: string[] = ['Identify currently trending hashtags'];

    if (request.platform) {
      parts.push(`Platform: ${request.platform}`);
    }

    if (request.category) {
      parts.push(`Category: ${request.category}`);
    }

    if (request.location) {
      parts.push(`Location: ${request.location}`);
    }

    parts.push(`
Focus on:
- Hashtags with high growth velocity (rapidly increasing usage)
- Current viral topics and challenges
- Seasonal and timely trends
- Industry-specific trending topics
- Hashtags with positive sentiment

Provide ${request.limit || 20} trending hashtags with:
1. Volume (current usage count)
2. Growth velocity (percentage growth rate)
3. Sentiment score (-1 to 1)
4. Related topics
5. Estimated reach potential`);

    return parts.join('\n');
  }

  /**
   * Parse trending hashtags from AI response
   */
  private parseTrendingHashtags(
    content: string,
    platform?: string,
  ): TrendingHashtag[] {
    try {
      const parsed = JSON.parse(content);
      const trending = Array.isArray(parsed) ? parsed : [parsed];

      return trending.map((t) => ({
        tag: t.tag.replace(/^#/, ''),
        platform: t.platform || platform || 'all',
        volume: t.volume || 0,
        growthVelocity: t.growthVelocity || 0,
        sentiment: t.sentiment || 0,
        relatedTopics: t.relatedTopics || [],
        estimatedReach: t.estimatedReach || 0,
      }));
    } catch (error) {
      this.logger.warn('Failed to parse trending hashtags, using fallback');
      return this.generateFallbackTrending(platform);
    }
  }

  /**
   * Generate fallback trending hashtags
   */
  private generateFallbackTrending(platform?: string): TrendingHashtag[] {
    const fallbackTags = [
      'trending',
      'viral',
      'fyp',
      'explore',
      'instagood',
      'photooftheday',
      'love',
      'fashion',
      'style',
      'motivation',
    ];

    return fallbackTags.map((tag) => ({
      tag,
      platform: platform || 'all',
      volume: Math.floor(Math.random() * 100000) + 10000,
      growthVelocity: Math.floor(Math.random() * 200) + 50,
      sentiment: Math.random() * 0.6 + 0.2, // 0.2 to 0.8
      relatedTopics: [],
      estimatedReach: Math.floor(Math.random() * 1000000) + 100000,
    }));
  }

  /**
   * Hash content for cache key generation
   */
  private hashContent(content: string): string {
    // Simple hash function for cache keys
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Analyze hashtag competition level
   */
  async analyzeCompetition(
    hashtag: string,
    platform: string,
    workspaceId: string,
  ): Promise<{
    competition: 'low' | 'medium' | 'high';
    totalPosts: number;
    averageEngagement: number;
    topPerformers: number;
    difficulty: number; // 0-100
    recommendation: string;
  }> {
    this.logger.log(`Analyzing competition for #${hashtag} on ${platform}`);

    // In a real implementation, this would analyze actual platform data
    // For now, return mock analysis
    const totalPosts = Math.floor(Math.random() * 10000000);
    const competition: 'low' | 'medium' | 'high' =
      totalPosts > 1000000 ? 'high' : totalPosts > 100000 ? 'medium' : 'low';

    const difficulty =
      competition === 'high' ? 80 : competition === 'medium' ? 50 : 20;

    const recommendation =
      competition === 'high'
        ? 'High competition. Use in combination with niche hashtags for better visibility.'
        : competition === 'medium'
        ? 'Moderate competition. Good balance of reach and discoverability.'
        : 'Low competition. Excellent for targeted reach and visibility.';

    return {
      competition,
      totalPosts,
      averageEngagement: Math.floor(Math.random() * 1000),
      topPerformers: Math.floor(Math.random() * 100),
      difficulty,
      recommendation,
    };
  }
}
