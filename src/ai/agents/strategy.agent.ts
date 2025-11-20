import { Injectable, Logger } from '@nestjs/common';
import { AICoordinatorService } from '../services/ai-coordinator.service';
import { AgentType, AIModel } from '../interfaces/ai.interface';
import { PrismaService } from '../../prisma/prisma.service';

export interface PerformanceDataRequest {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  platforms?: string[];
  accountIds?: string[];
}

export interface PerformanceMetrics {
  totalPosts: number;
  totalEngagement: number;
  averageEngagementRate: number;
  totalReach: number;
  totalImpressions: number;
  followerGrowth: number;
  topPerformingPosts: PostPerformance[];
  platformBreakdown: PlatformMetrics[];
  hourlyEngagement: HourlyMetrics[];
  dailyEngagement: DailyMetrics[];
  contentTypePerformance: ContentTypeMetrics[];
}

export interface PostPerformance {
  postId: string;
  content: string;
  platform: string;
  publishedAt: Date;
  engagement: number;
  reach: number;
  engagementRate: number;
}

export interface PlatformMetrics {
  platform: string;
  posts: number;
  engagement: number;
  reach: number;
  engagementRate: number;
}

export interface HourlyMetrics {
  hour: number;
  posts: number;
  averageEngagement: number;
  averageReach: number;
}

export interface DailyMetrics {
  dayOfWeek: number;
  posts: number;
  averageEngagement: number;
  averageReach: number;
}

export interface ContentTypeMetrics {
  type: string;
  posts: number;
  averageEngagement: number;
  averageReach: number;
}

export interface ContentThemeRecommendation {
  theme: string;
  reasoning: string;
  suggestedFrequency: string;
  targetAudience: string;
  expectedPerformance: string;
  examples: string[];
}

export interface OptimalPostingTime {
  dayOfWeek: string;
  hour: number;
  timezone: string;
  expectedEngagement: number;
  confidence: number;
  reasoning: string;
}

export interface MonthlyCalendarTheme {
  month: string;
  weeklyThemes: WeeklyTheme[];
  keyDates: KeyDate[];
  contentMix: ContentMixRecommendation;
  overallStrategy: string;
}

export interface WeeklyTheme {
  week: number;
  theme: string;
  contentIdeas: string[];
  platforms: string[];
}

export interface KeyDate {
  date: Date;
  event: string;
  contentSuggestion: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ContentMixRecommendation {
  promotional: number;
  educational: number;
  entertaining: number;
  userGenerated: number;
  reasoning: string;
}

export interface AudienceEngagementPattern {
  pattern: string;
  description: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
}

export interface StrategyRecommendation {
  performanceAnalysis: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
  };
  contentThemes: ContentThemeRecommendation[];
  optimalPostingTimes: OptimalPostingTime[];
  monthlyCalendar: MonthlyCalendarTheme;
  audiencePatterns: AudienceEngagementPattern[];
  actionableInsights: string[];
  predictedImpact: string;
}

@Injectable()
export class StrategyAgent {
  private readonly logger = new Logger(StrategyAgent.name);

  // Agent personality and configuration
  private readonly agentPersonality = {
    name: 'Strategy Analyst',
    type: AgentType.STRATEGY,
    personality: 'Analytical, data-driven, and strategic',
    description:
      'Specialized in analyzing performance data, identifying trends, and providing strategic recommendations for social media growth',
  };

  constructor(
    private readonly aiCoordinator: AICoordinatorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Analyze performance data and generate strategic recommendations
   */
  async analyzePerformance(
    request: PerformanceDataRequest,
  ): Promise<StrategyRecommendation> {
    this.logger.log(
      `Analyzing performance for workspace ${request.workspaceId} from ${request.startDate} to ${request.endDate}`,
    );

    // Fetch performance metrics
    const metrics = await this.fetchPerformanceMetrics(request);

    // Generate AI-powered recommendations
    const recommendations = await this.generateRecommendations(
      metrics,
      request.workspaceId,
    );

    return recommendations;
  }

  /**
   * Fetch performance metrics from database
   */
  private async fetchPerformanceMetrics(
    request: PerformanceDataRequest,
  ): Promise<PerformanceMetrics> {
    const { workspaceId, startDate, endDate, accountIds } = request;

    // Build query filters
    const whereClause: any = {
      workspaceId,
      status: 'PUBLISHED',
      publishedAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (accountIds && accountIds.length > 0) {
      whereClause.platformPosts = {
        some: {
          accountId: {
            in: accountIds,
          },
        },
      };
    }

    // Fetch posts with platform data
    const posts = await this.prisma.post.findMany({
      where: whereClause,
      include: {
        platformPosts: {
          include: {
            account: true,
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });

    // Calculate metrics
    const metrics = this.calculateMetrics(posts);

    return metrics;
  }

  /**
   * Calculate performance metrics from posts
   */
  private calculateMetrics(posts: any[]): PerformanceMetrics {
    const totalPosts = posts.length;

    // Initialize metrics
    let totalEngagement = 0;
    let totalReach = 0;
    let totalImpressions = 0;

    const platformMap = new Map<string, any>();
    const hourlyMap = new Map<number, any>();
    const dailyMap = new Map<number, any>();
    const contentTypeMap = new Map<string, any>();
    const topPosts: PostPerformance[] = [];

    // Process each post
    posts.forEach((post) => {
      const publishedAt = new Date(post.publishedAt);
      const hour = publishedAt.getHours();
      const dayOfWeek = publishedAt.getDay();

      // Mock engagement data (in real implementation, this would come from analytics)
      const engagement = Math.floor(Math.random() * 1000);
      const reach = Math.floor(Math.random() * 10000);
      const impressions = Math.floor(Math.random() * 15000);

      totalEngagement += engagement;
      totalReach += reach;
      totalImpressions += impressions;

      // Track top posts
      topPosts.push({
        postId: post.id,
        content: typeof post.content === 'string' 
          ? post.content 
          : JSON.stringify(post.content).substring(0, 100),
        platform: post.platformPosts[0]?.account.platform || 'UNKNOWN',
        publishedAt: post.publishedAt,
        engagement,
        reach,
        engagementRate: reach > 0 ? (engagement / reach) * 100 : 0,
      });

      // Platform breakdown
      post.platformPosts.forEach((pp: any) => {
        const platform = pp.account.platform;
        if (!platformMap.has(platform)) {
          platformMap.set(platform, {
            platform,
            posts: 0,
            engagement: 0,
            reach: 0,
          });
        }
        const platformData = platformMap.get(platform);
        platformData.posts += 1;
        platformData.engagement += engagement / post.platformPosts.length;
        platformData.reach += reach / post.platformPosts.length;
      });

      // Hourly engagement
      if (!hourlyMap.has(hour)) {
        hourlyMap.set(hour, { hour, posts: 0, totalEngagement: 0, totalReach: 0 });
      }
      const hourData = hourlyMap.get(hour);
      hourData.posts += 1;
      hourData.totalEngagement += engagement;
      hourData.totalReach += reach;

      // Daily engagement
      if (!dailyMap.has(dayOfWeek)) {
        dailyMap.set(dayOfWeek, {
          dayOfWeek,
          posts: 0,
          totalEngagement: 0,
          totalReach: 0,
        });
      }
      const dayData = dailyMap.get(dayOfWeek);
      dayData.posts += 1;
      dayData.totalEngagement += engagement;
      dayData.totalReach += reach;

      // Content type (mock - would be extracted from post metadata)
      const contentType = this.inferContentType(post);
      if (!contentTypeMap.has(contentType)) {
        contentTypeMap.set(contentType, {
          type: contentType,
          posts: 0,
          totalEngagement: 0,
          totalReach: 0,
        });
      }
      const typeData = contentTypeMap.get(contentType);
      typeData.posts += 1;
      typeData.totalEngagement += engagement;
      typeData.totalReach += reach;
    });

    // Calculate averages and format data
    const platformBreakdown: PlatformMetrics[] = Array.from(
      platformMap.values(),
    ).map((p) => ({
      platform: p.platform,
      posts: p.posts,
      engagement: p.engagement,
      reach: p.reach,
      engagementRate: p.reach > 0 ? (p.engagement / p.reach) * 100 : 0,
    }));

    const hourlyEngagement: HourlyMetrics[] = Array.from(hourlyMap.values()).map(
      (h) => ({
        hour: h.hour,
        posts: h.posts,
        averageEngagement: h.totalEngagement / h.posts,
        averageReach: h.totalReach / h.posts,
      }),
    );

    const dailyEngagement: DailyMetrics[] = Array.from(dailyMap.values()).map(
      (d) => ({
        dayOfWeek: d.dayOfWeek,
        posts: d.posts,
        averageEngagement: d.totalEngagement / d.posts,
        averageReach: d.totalReach / d.posts,
      }),
    );

    const contentTypePerformance: ContentTypeMetrics[] = Array.from(
      contentTypeMap.values(),
    ).map((c) => ({
      type: c.type,
      posts: c.posts,
      averageEngagement: c.totalEngagement / c.posts,
      averageReach: c.totalReach / c.posts,
    }));

    // Sort top posts by engagement rate
    topPosts.sort((a, b) => b.engagementRate - a.engagementRate);

    return {
      totalPosts,
      totalEngagement,
      averageEngagementRate:
        totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0,
      totalReach,
      totalImpressions,
      followerGrowth: 0, // Would be calculated from historical data
      topPerformingPosts: topPosts.slice(0, 10),
      platformBreakdown,
      hourlyEngagement,
      dailyEngagement,
      contentTypePerformance,
    };
  }

  /**
   * Infer content type from post data
   */
  private inferContentType(post: any): string {
    // This is a simplified version - real implementation would analyze content
    const content = typeof post.content === 'string' 
      ? post.content 
      : JSON.stringify(post.content);
    
    if (content.toLowerCase().includes('sale') || content.toLowerCase().includes('discount')) {
      return 'promotional';
    } else if (content.toLowerCase().includes('how to') || content.toLowerCase().includes('tip')) {
      return 'educational';
    } else if (content.toLowerCase().includes('?')) {
      return 'engaging';
    } else {
      return 'general';
    }
  }

  /**
   * Generate AI-powered recommendations
   */
  private async generateRecommendations(
    metrics: PerformanceMetrics,
    workspaceId: string,
  ): Promise<StrategyRecommendation> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildAnalysisPrompt(metrics);

    const result = await this.aiCoordinator.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: AIModel.GPT_4O_MINI,
      temperature: 0.3, // Lower temperature for more focused analysis
      maxTokens: 3000,
      workspaceId,
    });

    try {
      const parsed = JSON.parse(result.content);
      return parsed;
    } catch (error) {
      this.logger.warn('Failed to parse AI response, using fallback');
      return this.generateFallbackRecommendations(metrics);
    }
  }

  /**
   * Build system prompt for strategy analysis
   */
  private buildSystemPrompt(): string {
    return `You are a strategic AI agent specialized in social media strategy and analytics.

Your personality: Analytical, data-driven, and insightful. You analyze performance data, identify trends, and provide actionable recommendations.

Your role is to:
1. Analyze social media performance data
2. Identify patterns and trends
3. Recommend content themes based on performance
4. Suggest optimal posting times based on 90-day historical data
5. Create monthly calendar themes
6. Detect audience engagement patterns
7. Provide strategic, actionable insights

Focus on:
- Data-driven insights
- ROI optimization
- Engagement maximization
- Long-term growth strategies
- Audience behavior patterns
- Content performance trends

Return your response as a JSON object with this structure:
{
  "performanceAnalysis": {
    "summary": "overall performance summary",
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1", "weakness 2"],
    "opportunities": ["opportunity 1", "opportunity 2"]
  },
  "contentThemes": [
    {
      "theme": "theme name",
      "reasoning": "why this theme works",
      "suggestedFrequency": "how often to post",
      "targetAudience": "who this resonates with",
      "expectedPerformance": "predicted impact",
      "examples": ["example 1", "example 2"]
    }
  ],
  "optimalPostingTimes": [
    {
      "dayOfWeek": "Monday",
      "hour": 14,
      "timezone": "UTC",
      "expectedEngagement": 850,
      "confidence": 0.85,
      "reasoning": "why this time works"
    }
  ],
  "monthlyCalendar": {
    "month": "next month",
    "weeklyThemes": [
      {
        "week": 1,
        "theme": "theme name",
        "contentIdeas": ["idea 1", "idea 2"],
        "platforms": ["instagram", "twitter"]
      }
    ],
    "keyDates": [
      {
        "date": "2024-01-15",
        "event": "event name",
        "contentSuggestion": "what to post",
        "priority": "high"
      }
    ],
    "contentMix": {
      "promotional": 20,
      "educational": 40,
      "entertaining": 30,
      "userGenerated": 10,
      "reasoning": "why this mix works"
    },
    "overallStrategy": "monthly strategy summary"
  },
  "audiencePatterns": [
    {
      "pattern": "pattern name",
      "description": "what the pattern shows",
      "recommendation": "what to do about it",
      "impact": "high"
    }
  ],
  "actionableInsights": ["insight 1", "insight 2", "insight 3"],
  "predictedImpact": "expected results from following recommendations"
}`;
  }

  /**
   * Build analysis prompt with metrics data
   */
  private buildAnalysisPrompt(metrics: PerformanceMetrics): string {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return `Analyze the following social media performance data and provide strategic recommendations:

PERFORMANCE SUMMARY:
- Total Posts: ${metrics.totalPosts}
- Total Engagement: ${metrics.totalEngagement}
- Average Engagement Rate: ${metrics.averageEngagementRate.toFixed(2)}%
- Total Reach: ${metrics.totalReach}
- Total Impressions: ${metrics.totalImpressions}

PLATFORM BREAKDOWN:
${metrics.platformBreakdown.map(p => `- ${p.platform}: ${p.posts} posts, ${p.engagement.toFixed(0)} engagement, ${p.engagementRate.toFixed(2)}% rate`).join('\n')}

TOP PERFORMING POSTS:
${metrics.topPerformingPosts.slice(0, 5).map((p, i) => `${i + 1}. ${p.platform} - ${p.engagementRate.toFixed(2)}% engagement rate`).join('\n')}

HOURLY ENGAGEMENT PATTERNS:
${metrics.hourlyEngagement.sort((a, b) => b.averageEngagement - a.averageEngagement).slice(0, 5).map(h => `- ${h.hour}:00 - Avg engagement: ${h.averageEngagement.toFixed(0)}`).join('\n')}

DAILY ENGAGEMENT PATTERNS:
${metrics.dailyEngagement.sort((a, b) => b.averageEngagement - a.averageEngagement).map(d => `- ${dayNames[d.dayOfWeek]}: ${d.posts} posts, ${d.averageEngagement.toFixed(0)} avg engagement`).join('\n')}

CONTENT TYPE PERFORMANCE:
${metrics.contentTypePerformance.map(c => `- ${c.type}: ${c.posts} posts, ${c.averageEngagement.toFixed(0)} avg engagement`).join('\n')}

Based on this 90-day performance data, provide comprehensive strategic recommendations including:
1. Performance analysis with strengths, weaknesses, and opportunities
2. 3-5 content themes that would perform well
3. Optimal posting times for each day of the week
4. A monthly content calendar with weekly themes
5. Audience engagement patterns you've identified
6. Actionable insights for immediate implementation
7. Predicted impact of following these recommendations`;
  }

  /**
   * Generate fallback recommendations if AI parsing fails
   */
  private generateFallbackRecommendations(
    metrics: PerformanceMetrics,
  ): StrategyRecommendation {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Find best performing times
    const bestHours = metrics.hourlyEngagement
      .sort((a, b) => b.averageEngagement - a.averageEngagement)
      .slice(0, 3);

    const bestDays = metrics.dailyEngagement
      .sort((a, b) => b.averageEngagement - a.averageEngagement)
      .slice(0, 3);

    return {
      performanceAnalysis: {
        summary: `Analyzed ${metrics.totalPosts} posts with an average engagement rate of ${metrics.averageEngagementRate.toFixed(2)}%`,
        strengths: [
          `Strong performance on ${metrics.platformBreakdown[0]?.platform || 'primary platform'}`,
          `Consistent posting schedule`,
        ],
        weaknesses: [
          `Engagement rate could be improved`,
          `Content variety could be expanded`,
        ],
        opportunities: [
          `Optimize posting times based on audience activity`,
          `Experiment with new content formats`,
        ],
      },
      contentThemes: [
        {
          theme: 'Educational Content',
          reasoning: 'Educational posts typically drive high engagement',
          suggestedFrequency: '2-3 times per week',
          targetAudience: 'Professional audience seeking value',
          expectedPerformance: 'High engagement and shares',
          examples: ['How-to guides', 'Industry tips', 'Best practices'],
        },
        {
          theme: 'Behind-the-Scenes',
          reasoning: 'Authentic content builds connection',
          suggestedFrequency: '1-2 times per week',
          targetAudience: 'Engaged followers',
          expectedPerformance: 'Strong engagement and comments',
          examples: ['Team spotlights', 'Process videos', 'Day in the life'],
        },
      ],
      optimalPostingTimes: bestDays.flatMap(day => 
        bestHours.slice(0, 1).map(hour => ({
          dayOfWeek: dayNames[day.dayOfWeek],
          hour: hour.hour,
          timezone: 'UTC',
          expectedEngagement: hour.averageEngagement,
          confidence: 0.75,
          reasoning: `Historical data shows strong engagement on ${dayNames[day.dayOfWeek]} at ${hour.hour}:00`,
        }))
      ),
      monthlyCalendar: {
        month: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleString('default', { month: 'long' }),
        weeklyThemes: [
          {
            week: 1,
            theme: 'Educational Week',
            contentIdeas: ['Industry insights', 'Tips and tricks', 'How-to guides'],
            platforms: metrics.platformBreakdown.map(p => p.platform.toLowerCase()),
          },
          {
            week: 2,
            theme: 'Engagement Week',
            contentIdeas: ['Q&A sessions', 'Polls', 'User-generated content'],
            platforms: metrics.platformBreakdown.map(p => p.platform.toLowerCase()),
          },
          {
            week: 3,
            theme: 'Storytelling Week',
            contentIdeas: ['Customer stories', 'Behind-the-scenes', 'Team spotlights'],
            platforms: metrics.platformBreakdown.map(p => p.platform.toLowerCase()),
          },
          {
            week: 4,
            theme: 'Value Week',
            contentIdeas: ['Product features', 'Case studies', 'Success stories'],
            platforms: metrics.platformBreakdown.map(p => p.platform.toLowerCase()),
          },
        ],
        keyDates: [],
        contentMix: {
          promotional: 20,
          educational: 40,
          entertaining: 30,
          userGenerated: 10,
          reasoning: '40% educational content drives value, 30% entertaining keeps audience engaged, 20% promotional drives conversions',
        },
        overallStrategy: 'Focus on value-driven content with consistent posting at optimal times',
      },
      audiencePatterns: [
        {
          pattern: 'Peak Engagement Hours',
          description: `Highest engagement occurs at ${bestHours[0]?.hour}:00`,
          recommendation: 'Schedule important posts during these peak hours',
          impact: 'high',
        },
        {
          pattern: 'Best Performing Days',
          description: `${dayNames[bestDays[0]?.dayOfWeek]} shows strongest engagement`,
          recommendation: 'Increase posting frequency on high-performing days',
          impact: 'high',
        },
      ],
      actionableInsights: [
        `Post at ${bestHours[0]?.hour}:00 for maximum engagement`,
        `Focus on ${metrics.contentTypePerformance[0]?.type} content which performs best`,
        `Increase presence on ${metrics.platformBreakdown[0]?.platform}`,
        'Maintain consistent posting schedule',
        'Test new content formats to expand reach',
      ],
      predictedImpact: 'Following these recommendations could increase engagement by 25-40% over the next 90 days',
    };
  }

  /**
   * Recommend content themes based on performance
   */
  async recommendContentThemes(
    workspaceId: string,
    performanceData: PerformanceMetrics,
  ): Promise<ContentThemeRecommendation[]> {
    this.logger.log(`Generating content theme recommendations for workspace ${workspaceId}`);

    const systemPrompt = `You are a content strategy specialist. Based on performance data, recommend 3-5 content themes that would resonate with the audience.

Return your response as a JSON array of content theme recommendations.`;

    const userPrompt = `Based on this performance data, recommend content themes:

Top performing content types:
${performanceData.contentTypePerformance.map(c => `- ${c.type}: ${c.averageEngagement.toFixed(0)} avg engagement`).join('\n')}

Platform breakdown:
${performanceData.platformBreakdown.map(p => `- ${p.platform}: ${p.engagementRate.toFixed(2)}% engagement rate`).join('\n')}

Recommend 3-5 content themes with reasoning, frequency, target audience, and examples.`;

    const result = await this.aiCoordinator.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: AIModel.GPT_4O_MINI,
      temperature: 0.4,
      maxTokens: 1500,
      workspaceId,
    });

    try {
      return JSON.parse(result.content);
    } catch (error) {
      return [];
    }
  }

  /**
   * Analyze optimal posting times based on 90-day history
   */
  async analyzeOptimalPostingTimes(
    workspaceId: string,
    performanceData: PerformanceMetrics,
  ): Promise<OptimalPostingTime[]> {
    this.logger.log(`Analyzing optimal posting times for workspace ${workspaceId}`);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Find best times for each day
    const optimalTimes: OptimalPostingTime[] = [];

    performanceData.dailyEngagement.forEach(day => {
      // Find best hours for this day
      const dayHours = performanceData.hourlyEngagement
        .sort((a, b) => b.averageEngagement - a.averageEngagement)
        .slice(0, 2);

      dayHours.forEach(hour => {
        optimalTimes.push({
          dayOfWeek: dayNames[day.dayOfWeek],
          hour: hour.hour,
          timezone: 'UTC',
          expectedEngagement: hour.averageEngagement,
          confidence: day.posts > 5 ? 0.85 : 0.65,
          reasoning: `Based on ${day.posts} posts on ${dayNames[day.dayOfWeek]}, ${hour.hour}:00 shows ${hour.averageEngagement.toFixed(0)} average engagement`,
        });
      });
    });

    return optimalTimes.sort((a, b) => b.expectedEngagement - a.expectedEngagement).slice(0, 10);
  }

  /**
   * Generate monthly calendar themes
   */
  async generateMonthlyCalendar(
    workspaceId: string,
    performanceData: PerformanceMetrics,
  ): Promise<MonthlyCalendarTheme> {
    this.logger.log(`Generating monthly calendar for workspace ${workspaceId}`);

    const systemPrompt = `You are a content calendar strategist. Create a monthly content calendar with weekly themes, key dates, and content mix recommendations.

Return your response as a JSON object matching the MonthlyCalendarTheme structure.`;

    const userPrompt = `Create a monthly content calendar based on this performance data:

Platform breakdown:
${performanceData.platformBreakdown.map(p => `- ${p.platform}: ${p.posts} posts`).join('\n')}

Content type performance:
${performanceData.contentTypePerformance.map(c => `- ${c.type}: ${c.averageEngagement.toFixed(0)} avg engagement`).join('\n')}

Create a calendar with:
1. Weekly themes for 4 weeks
2. Key dates and events
3. Content mix recommendations (promotional, educational, entertaining, user-generated)
4. Overall strategy`;

    const result = await this.aiCoordinator.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: AIModel.GPT_4O_MINI,
      temperature: 0.5,
      maxTokens: 2000,
      workspaceId,
    });

    try {
      return JSON.parse(result.content);
    } catch (error) {
      return this.generateFallbackRecommendations(performanceData).monthlyCalendar;
    }
  }

  /**
   * Detect audience engagement patterns
   */
  async detectEngagementPatterns(
    workspaceId: string,
    performanceData: PerformanceMetrics,
  ): Promise<AudienceEngagementPattern[]> {
    this.logger.log(`Detecting engagement patterns for workspace ${workspaceId}`);

    const patterns: AudienceEngagementPattern[] = [];

    // Analyze hourly patterns
    const peakHours = performanceData.hourlyEngagement
      .sort((a, b) => b.averageEngagement - a.averageEngagement)
      .slice(0, 3);

    if (peakHours.length > 0) {
      patterns.push({
        pattern: 'Peak Engagement Hours',
        description: `Audience is most active between ${peakHours[0].hour}:00 and ${peakHours[peakHours.length - 1].hour}:00`,
        recommendation: 'Schedule high-priority content during these peak hours for maximum visibility',
        impact: 'high',
      });
    }

    // Analyze daily patterns
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bestDays = performanceData.dailyEngagement
      .sort((a, b) => b.averageEngagement - a.averageEngagement)
      .slice(0, 2);

    if (bestDays.length > 0) {
      patterns.push({
        pattern: 'Best Performing Days',
        description: `${dayNames[bestDays[0].dayOfWeek]} and ${dayNames[bestDays[1]?.dayOfWeek || bestDays[0].dayOfWeek]} show highest engagement`,
        recommendation: 'Increase posting frequency on these days and save important announcements for them',
        impact: 'high',
      });
    }

    // Analyze content type patterns
    const bestContentType = performanceData.contentTypePerformance
      .sort((a, b) => b.averageEngagement - a.averageEngagement)[0];

    if (bestContentType) {
      patterns.push({
        pattern: 'Content Type Preference',
        description: `${bestContentType.type} content generates ${bestContentType.averageEngagement.toFixed(0)} average engagement`,
        recommendation: `Increase ${bestContentType.type} content to 40-50% of your content mix`,
        impact: 'medium',
      });
    }

    // Analyze platform patterns
    const bestPlatform = performanceData.platformBreakdown
      .sort((a, b) => b.engagementRate - a.engagementRate)[0];

    if (bestPlatform) {
      patterns.push({
        pattern: 'Platform Performance',
        description: `${bestPlatform.platform} shows ${bestPlatform.engagementRate.toFixed(2)}% engagement rate`,
        recommendation: `Prioritize ${bestPlatform.platform} for important content and consider increasing posting frequency`,
        impact: 'high',
      });
    }

    return patterns;
  }
}
