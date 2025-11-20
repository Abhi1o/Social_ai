import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../prisma/prisma.service';
import { Trend, TrendDocument, TrendType, TrendStatus } from '../schemas/trend.schema';
import { ConversationCluster, ConversationClusterDocument } from '../schemas/conversation-cluster.schema';
import { Platform, Sentiment } from '@prisma/client';

/**
 * Trend detection result
 */
export interface TrendDetectionResult {
  trends: TrendDocument[];
  summary: {
    total: number;
    emerging: number;
    rising: number;
    viral: number;
    declining: number;
  };
}

/**
 * Viral content detection result
 */
export interface ViralContent {
  mentionId: string;
  platform: Platform;
  content: string;
  author: {
    username: string;
    followers: number;
  };
  viralityScore: number;
  engagement: number;
  reach: number;
  growthRate: number;
  publishedAt: Date;
}

/**
 * Service for trend detection and analysis
 * Implements trending topic identification, hashtag tracking, growth velocity calculation,
 * conversation clustering, and viral content detection
 * 
 * Requirements: 9.4, 18.4
 */
@Injectable()
export class TrendDetectionService {
  private readonly logger = new Logger(TrendDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(Trend.name) private trendModel: Model<TrendDocument>,
    @InjectModel(ConversationCluster.name) private clusterModel: Model<ConversationClusterDocument>,
  ) {}

  /**
   * Detect and update trending topics across all platforms
   * Analyzes mentions from the last 24 hours to identify emerging trends
   * 
   * @param workspaceId - Workspace ID
   * @param platforms - Optional platforms to analyze
   * @returns Detected trends
   */
  async detectTrends(
    workspaceId: string,
    platforms?: Platform[],
  ): Promise<TrendDetectionResult> {
    this.logger.log(`Detecting trends for workspace ${workspaceId}`);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const previousPeriodStart = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Build query filter
    const where: any = {
      workspaceId,
      publishedAt: { gte: since },
    };
    if (platforms && platforms.length > 0) {
      where.platform = { in: platforms };
    }

    // Get mentions from current period
    const currentMentions = await this.prisma.listeningMention.findMany({
      where,
      select: {
        content: true,
        platform: true,
        likes: true,
        comments: true,
        shares: true,
        reach: true,
        sentiment: true,
        sentimentScore: true,
        authorFollowers: true,
        isInfluencer: true,
        authorUsername: true,
        publishedAt: true,
      },
    });

    // Get mentions from previous period for comparison
    const previousMentions = await this.prisma.listeningMention.findMany({
      where: {
        ...where,
        publishedAt: { gte: previousPeriodStart, lt: since },
      },
      select: {
        content: true,
        platform: true,
      },
    });

    // Extract and analyze terms
    const currentTerms = this.extractTerms(currentMentions.map(m => m.content));
    const previousTerms = this.extractTerms(previousMentions.map(m => m.content));

    // Analyze each term
    const trends: TrendDocument[] = [];

    for (const [term, currentCount] of Object.entries(currentTerms)) {
      if (currentCount < 5) continue; // Minimum threshold

      const previousCount = previousTerms[term] || 0;
      const growthRate = previousCount > 0 
        ? ((currentCount - previousCount) / previousCount) * 100 
        : currentCount * 100;

      // Calculate metrics
      const termMentions = currentMentions.filter(m => 
        m.content.toLowerCase().includes(term.toLowerCase())
      );

      const metrics = this.calculateTrendMetrics(termMentions, currentCount, previousCount);
      const status = this.determineTrendStatus(growthRate, metrics.momentum);
      const type = this.determineTrendType(term);

      // Create or update trend
      const trend = await this.trendModel.findOneAndUpdate(
        { workspaceId, term: term.toLowerCase() },
        {
          $set: {
            workspaceId,
            term: term.toLowerCase(),
            type,
            status,
            platforms: [...new Set(termMentions.map(m => m.platform))],
            currentVolume: currentCount,
            previousVolume: previousCount,
            growthRate,
            ...metrics,
            lastSeenAt: new Date(),
            isActive: true,
          },
          $setOnInsert: {
            firstSeenAt: new Date(),
          },
          $max: {
            peakVolume: currentCount,
          },
        },
        { upsert: true, new: true },
      );

      trends.push(trend);
    }

    // Calculate summary
    const summary = {
      total: trends.length,
      emerging: trends.filter(t => t.status === TrendStatus.EMERGING).length,
      rising: trends.filter(t => t.status === TrendStatus.RISING).length,
      viral: trends.filter(t => t.status === TrendStatus.VIRAL).length,
      declining: trends.filter(t => t.status === TrendStatus.DECLINING).length,
    };

    this.logger.log(`Detected ${trends.length} trends for workspace ${workspaceId}`);
    return { trends, summary };
  }

  /**
   * Track hashtag trends and performance
   * 
   * @param workspaceId - Workspace ID
   * @param hashtag - Hashtag to track
   * @param days - Number of days to analyze
   * @returns Hashtag trend data
   */
  async trackHashtagTrend(
    workspaceId: string,
    hashtag: string,
    days: number = 7,
  ): Promise<TrendDocument | null> {
    const cleanHashtag = hashtag.replace(/^#/, '').toLowerCase();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get mentions containing this hashtag
    const mentions = await this.prisma.listeningMention.findMany({
      where: {
        workspaceId,
        publishedAt: { gte: since },
        content: {
          contains: `#${cleanHashtag}`,
          mode: 'insensitive',
        },
      },
      orderBy: { publishedAt: 'asc' },
    });

    if (mentions.length === 0) {
      return null;
    }

    // Calculate daily volumes for growth velocity
    const dailyVolumes = this.groupByDay(mentions);
    const growthVelocity = this.calculateGrowthVelocityFromDailyVolumes(dailyVolumes);

    // Calculate metrics
    const totalEngagement = mentions.reduce((sum, m) => 
      sum + m.likes + m.comments + m.shares, 0
    );
    const averageEngagement = totalEngagement / mentions.length;
    const totalReach = mentions.reduce((sum, m) => sum + m.reach, 0);

    // Sentiment analysis
    const sentimentScores = mentions
      .filter(m => m.sentimentScore !== null)
      .map(m => m.sentimentScore!);
    const avgSentiment = sentimentScores.length > 0
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
      : 0;

    const sentimentBreakdown = {
      positive: mentions.filter(m => m.sentiment === Sentiment.POSITIVE).length,
      neutral: mentions.filter(m => m.sentiment === Sentiment.NEUTRAL).length,
      negative: mentions.filter(m => m.sentiment === Sentiment.NEGATIVE).length,
    };

    // Influencer involvement
    const influencerMentions = mentions.filter(m => m.isInfluencer);
    const topInfluencers = [...new Set(influencerMentions.map(m => m.authorUsername))]
      .slice(0, 10);

    // Update or create trend
    const trend = await this.trendModel.findOneAndUpdate(
      { workspaceId, term: `#${cleanHashtag}` },
      {
        $set: {
          workspaceId,
          term: `#${cleanHashtag}`,
          type: TrendType.HASHTAG,
          status: this.determineTrendStatus(growthVelocity * 100, 0),
          platforms: [...new Set(mentions.map(m => m.platform))],
          currentVolume: mentions.length,
          growthVelocity,
          totalEngagement,
          averageEngagement,
          reach: totalReach,
          sentimentScore: avgSentiment,
          sentimentBreakdown,
          influencerCount: influencerMentions.length,
          topInfluencers,
          lastSeenAt: new Date(),
          isActive: true,
        },
        $setOnInsert: {
          firstSeenAt: mentions[0].publishedAt,
        },
      },
      { upsert: true, new: true },
    );

    return trend;
  }

  /**
   * Calculate trend growth velocity
   * Measures the rate of change in growth rate
   * 
   * @param workspaceId - Workspace ID
   * @param term - Trend term
   * @param timeWindowHours - Time window for calculation
   * @returns Growth velocity value
   */
  async calculateGrowthVelocity(
    workspaceId: string,
    term: string,
    timeWindowHours: number = 24,
  ): Promise<number> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindowHours * 60 * 60 * 1000);
    const previousWindowStart = new Date(now.getTime() - 2 * timeWindowHours * 60 * 60 * 1000);

    // Get mentions in current window
    const currentMentions = await this.prisma.listeningMention.count({
      where: {
        workspaceId,
        content: { contains: term, mode: 'insensitive' },
        publishedAt: { gte: windowStart },
      },
    });

    // Get mentions in previous window
    const previousMentions = await this.prisma.listeningMention.count({
      where: {
        workspaceId,
        content: { contains: term, mode: 'insensitive' },
        publishedAt: { gte: previousWindowStart, lt: windowStart },
      },
    });

    // Calculate velocity (rate of change)
    if (previousMentions === 0) {
      return currentMentions > 0 ? 1.0 : 0;
    }

    const growthRate = (currentMentions - previousMentions) / previousMentions;
    return growthRate;
  }

  /**
   * Detect viral content based on engagement velocity and reach
   * 
   * @param workspaceId - Workspace ID
   * @param options - Detection options
   * @returns Array of viral content
   */
  async detectViralContent(
    workspaceId: string,
    options: {
      platforms?: Platform[];
      minViralityScore?: number;
      timeWindowHours?: number;
      limit?: number;
    } = {},
  ): Promise<ViralContent[]> {
    const {
      platforms,
      minViralityScore = 70,
      timeWindowHours = 24,
      limit = 20,
    } = options;

    const since = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    const where: any = {
      workspaceId,
      publishedAt: { gte: since },
    };
    if (platforms && platforms.length > 0) {
      where.platform = { in: platforms };
    }

    // Get recent mentions
    const mentions = await this.prisma.listeningMention.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
    });

    // Calculate virality score for each mention
    const viralCandidates = mentions.map(mention => {
      const engagement = mention.likes + mention.comments + mention.shares;
      const timeElapsed = (Date.now() - mention.publishedAt.getTime()) / (1000 * 60 * 60); // hours
      const engagementVelocity = timeElapsed > 0 ? engagement / timeElapsed : engagement;
      
      // Virality score factors:
      // - Engagement velocity (40%)
      // - Reach (30%)
      // - Influencer factor (20%)
      // - Recency (10%)
      const normalizedVelocity = Math.min(engagementVelocity / 100, 1);
      const normalizedReach = Math.min(mention.reach / 100000, 1);
      const influencerFactor = mention.isInfluencer ? 1 : 0.5;
      const recencyFactor = Math.max(0, 1 - (timeElapsed / timeWindowHours));

      const viralityScore = (
        normalizedVelocity * 40 +
        normalizedReach * 30 +
        influencerFactor * 20 +
        recencyFactor * 10
      );

      return {
        mention,
        viralityScore,
        engagement,
        engagementVelocity,
      };
    });

    // Filter and sort by virality score
    const viralContent = viralCandidates
      .filter(c => c.viralityScore >= minViralityScore)
      .sort((a, b) => b.viralityScore - a.viralityScore)
      .slice(0, limit)
      .map(c => ({
        mentionId: c.mention.id,
        platform: c.mention.platform,
        content: c.mention.content,
        author: {
          username: c.mention.authorUsername,
          followers: c.mention.authorFollowers || 0,
        },
        viralityScore: c.viralityScore,
        engagement: c.engagement,
        reach: c.mention.reach,
        growthRate: c.engagementVelocity,
        publishedAt: c.mention.publishedAt,
      }));

    return viralContent;
  }

  /**
   * Cluster conversations by topic/theme
   * Groups related mentions together using keyword similarity
   * 
   * @param workspaceId - Workspace ID
   * @param options - Clustering options
   * @returns Array of conversation clusters
   */
  async clusterConversations(
    workspaceId: string,
    options: {
      minSize?: number;
      minCohesion?: number;
      days?: number;
      limit?: number;
    } = {},
  ): Promise<ConversationClusterDocument[]> {
    const {
      minSize = 5,
      minCohesion = 0.5,
      days = 7,
      limit = 20,
    } = options;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get mentions for clustering
    const mentions = await this.prisma.listeningMention.findMany({
      where: {
        workspaceId,
        publishedAt: { gte: since },
      },
      orderBy: { publishedAt: 'desc' },
    });

    if (mentions.length < minSize) {
      return [];
    }

    // Extract keywords from all mentions
    const mentionKeywords = mentions.map(m => ({
      id: m.id,
      keywords: this.extractKeywords(m.content),
      hashtags: this.extractHashtags(m.content),
      mention: m,
    }));

    // Simple clustering algorithm based on keyword overlap
    const clusters: Map<string, any[]> = new Map();

    for (const item of mentionKeywords) {
      let assigned = false;

      // Try to assign to existing cluster
      for (const [clusterKey, clusterItems] of clusters.entries()) {
        const cohesion = this.calculateCohesion(item.keywords, clusterItems);
        
        if (cohesion >= minCohesion) {
          clusterItems.push(item);
          assigned = true;
          break;
        }
      }

      // Create new cluster if not assigned
      if (!assigned && item.keywords.length > 0) {
        const clusterKey = item.keywords.slice(0, 3).join('-');
        clusters.set(clusterKey, [item]);
      }
    }

    // Convert clusters to documents
    const clusterDocs: ConversationClusterDocument[] = [];

    for (const [key, items] of clusters.entries()) {
      if (items.length < minSize) continue;

      // Aggregate cluster data
      const allKeywords = items.flatMap(i => i.keywords);
      const allHashtags = items.flatMap(i => i.hashtags);
      const keywordFreq = this.getFrequency(allKeywords);
      const hashtagFreq = this.getFrequency(allHashtags);

      const topKeywords = Object.entries(keywordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);

      const topHashtags = Object.entries(hashtagFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag);

      const clusterMentions = items.map(i => i.mention);
      const totalEngagement = clusterMentions.reduce((sum, m) => 
        sum + m.likes + m.comments + m.shares, 0
      );

      const sentimentScores = clusterMentions
        .filter(m => m.sentimentScore !== null)
        .map(m => m.sentimentScore!);
      const avgSentiment = sentimentScores.length > 0
        ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
        : 0;

      // Create cluster document
      const cluster = await this.clusterModel.create({
        workspaceId,
        name: this.generateClusterName(topKeywords),
        description: `Cluster of ${items.length} conversations about ${topKeywords.slice(0, 3).join(', ')}`,
        keywords: topKeywords,
        hashtags: topHashtags,
        mentionIds: items.map(i => i.id),
        size: items.length,
        cohesionScore: this.calculateClusterCohesion(items),
        diversityScore: this.calculateDiversityScore(clusterMentions),
        startDate: clusterMentions[clusterMentions.length - 1].publishedAt,
        endDate: clusterMentions[0].publishedAt,
        peakDate: this.findPeakDate(clusterMentions),
        peakVolume: this.calculatePeakVolume(clusterMentions),
        totalEngagement,
        averageEngagement: totalEngagement / items.length,
        totalReach: clusterMentions.reduce((sum, m) => sum + m.reach, 0),
        averageSentiment: avgSentiment,
        sentimentDistribution: {
          positive: clusterMentions.filter(m => m.sentiment === Sentiment.POSITIVE).length,
          neutral: clusterMentions.filter(m => m.sentiment === Sentiment.NEUTRAL).length,
          negative: clusterMentions.filter(m => m.sentiment === Sentiment.NEGATIVE).length,
        },
        platformDistribution: this.getPlatformDistribution(clusterMentions),
        topContributors: this.getTopContributors(clusterMentions),
        topLocations: [],
        relatedClusterIds: [],
        evolutionTimeline: [],
        categories: [],
        topics: topKeywords.slice(0, 5),
        isActive: true,
        metadata: {},
      });

      clusterDocs.push(cluster);
    }

    // Sort by size and return top clusters
    return clusterDocs
      .sort((a, b) => b.size - a.size)
      .slice(0, limit);
  }

  /**
   * Get trending topics for a workspace
   * 
   * @param workspaceId - Workspace ID
   * @param options - Query options
   * @returns Trending topics
   */
  async getTrends(
    workspaceId: string,
    options: {
      type?: TrendType;
      status?: TrendStatus;
      platforms?: Platform[];
      minGrowthRate?: number;
      minViralityScore?: number;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ): Promise<{ trends: TrendDocument[]; total: number }> {
    const {
      type,
      status,
      platforms,
      minGrowthRate,
      minViralityScore,
      limit = 50,
      offset = 0,
      sortBy = 'viralityScore',
      sortOrder = 'desc',
    } = options;

    // Build query filter
    const filter: any = { workspaceId, isActive: true };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (platforms && platforms.length > 0) {
      filter.platforms = { $in: platforms };
    }
    if (minGrowthRate !== undefined) {
      filter.growthRate = { $gte: minGrowthRate };
    }
    if (minViralityScore !== undefined) {
      filter.viralityScore = { $gte: minViralityScore };
    }

    // Execute query
    const [trends, total] = await Promise.all([
      this.trendModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.trendModel.countDocuments(filter),
    ]);

    return { trends, total };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Extract terms (hashtags and keywords) from content
   */
  private extractTerms(contents: string[]): Record<string, number> {
    const terms: Record<string, number> = {};

    for (const content of contents) {
      // Extract hashtags
      const hashtags = content.match(/#\w+/g) || [];
      for (const tag of hashtags) {
        const normalized = tag.toLowerCase();
        terms[normalized] = (terms[normalized] || 0) + 1;
      }

      // Extract keywords (simple approach - can be enhanced with NLP)
      const words = content
        .toLowerCase()
        .replace(/[^\w\s#]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !this.isStopWord(w));

      for (const word of words) {
        if (!word.startsWith('#')) {
          terms[word] = (terms[word] || 0) + 1;
        }
      }
    }

    return terms;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s#]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !this.isStopWord(w) && !w.startsWith('#'));

    return [...new Set(words)];
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.toLowerCase());
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
    ]);
    return stopWords.has(word);
  }

  /**
   * Calculate trend metrics
   */
  private calculateTrendMetrics(mentions: any[], currentCount: number, previousCount: number) {
    const totalEngagement = mentions.reduce((sum, m) => 
      sum + m.likes + m.comments + m.shares, 0
    );
    const averageEngagement = mentions.length > 0 ? totalEngagement / mentions.length : 0;
    const totalReach = mentions.reduce((sum, m) => sum + m.reach, 0);

    // Calculate momentum (0-100 scale)
    const growthRate = previousCount > 0 
      ? ((currentCount - previousCount) / previousCount) * 100 
      : currentCount * 100;
    const momentum = Math.min(100, Math.max(0, growthRate));

    // Calculate virality score
    const engagementFactor = Math.min(1, averageEngagement / 100);
    const reachFactor = Math.min(1, totalReach / 100000);
    const volumeFactor = Math.min(1, currentCount / 100);
    const viralityScore = (engagementFactor * 40 + reachFactor * 30 + volumeFactor * 30);

    // Sentiment analysis
    const sentimentScores = mentions
      .filter(m => m.sentimentScore !== null)
      .map(m => m.sentimentScore);
    const avgSentiment = sentimentScores.length > 0
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
      : 0;

    const sentimentBreakdown = {
      positive: mentions.filter(m => m.sentiment === Sentiment.POSITIVE).length,
      neutral: mentions.filter(m => m.sentiment === Sentiment.NEUTRAL).length,
      negative: mentions.filter(m => m.sentiment === Sentiment.NEGATIVE).length,
    };

    // Influencer metrics
    const influencerMentions = mentions.filter(m => m.isInfluencer);
    const topInfluencers = [...new Set(influencerMentions.map(m => m.authorUsername))]
      .slice(0, 10);

    return {
      totalEngagement,
      averageEngagement,
      reach: totalReach,
      momentum,
      viralityScore,
      sentimentScore: avgSentiment,
      sentimentBreakdown,
      influencerCount: influencerMentions.length,
      topInfluencers,
      growthVelocity: growthRate / 100,
    };
  }

  /**
   * Determine trend status based on growth metrics
   */
  private determineTrendStatus(growthRate: number, momentum: number): TrendStatus {
    if (growthRate > 500 || momentum > 90) {
      return TrendStatus.VIRAL;
    } else if (growthRate > 200 || momentum > 70) {
      return TrendStatus.EMERGING;
    } else if (growthRate > 50 || momentum > 40) {
      return TrendStatus.RISING;
    } else if (growthRate < -20) {
      return TrendStatus.DECLINING;
    }
    return TrendStatus.STABLE;
  }

  /**
   * Determine trend type from term
   */
  private determineTrendType(term: string): TrendType {
    if (term.startsWith('#')) {
      return TrendType.HASHTAG;
    }
    // Could add more sophisticated classification here
    return TrendType.KEYWORD;
  }

  /**
   * Group mentions by day
   */
  private groupByDay(mentions: any[]): Record<string, number> {
    const groups: Record<string, number> = {};

    for (const mention of mentions) {
      const day = mention.publishedAt.toISOString().split('T')[0];
      groups[day] = (groups[day] || 0) + 1;
    }

    return groups;
  }

  /**
   * Calculate growth velocity from daily volumes
   */
  private calculateGrowthVelocityFromDailyVolumes(dailyVolumes: Record<string, number>): number {
    const days = Object.keys(dailyVolumes).sort();
    if (days.length < 2) return 0;

    const volumes = days.map(day => dailyVolumes[day]);
    let totalVelocity = 0;

    for (let i = 1; i < volumes.length; i++) {
      const change = volumes[i] - volumes[i - 1];
      const rate = volumes[i - 1] > 0 ? change / volumes[i - 1] : change;
      totalVelocity += rate;
    }

    return totalVelocity / (volumes.length - 1);
  }

  /**
   * Calculate cohesion between item and cluster
   */
  private calculateCohesion(keywords: string[], clusterItems: any[]): number {
    if (clusterItems.length === 0) return 0;

    const clusterKeywords = new Set(
      clusterItems.flatMap(item => item.keywords)
    );

    const overlap = keywords.filter(k => clusterKeywords.has(k)).length;
    const union = new Set([...keywords, ...clusterKeywords]).size;

    return union > 0 ? overlap / union : 0;
  }

  /**
   * Calculate overall cluster cohesion
   */
  private calculateClusterCohesion(items: any[]): number {
    if (items.length < 2) return 1;

    let totalCohesion = 0;
    let comparisons = 0;

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const overlap = items[i].keywords.filter((k: string) => 
          items[j].keywords.includes(k)
        ).length;
        const union = new Set([...items[i].keywords, ...items[j].keywords]).size;
        totalCohesion += union > 0 ? overlap / union : 0;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalCohesion / comparisons : 0;
  }

  /**
   * Calculate diversity score (unique authors / total mentions)
   */
  private calculateDiversityScore(mentions: any[]): number {
    const uniqueAuthors = new Set(mentions.map(m => m.authorId)).size;
    return mentions.length > 0 ? uniqueAuthors / mentions.length : 0;
  }

  /**
   * Get frequency map
   */
  private getFrequency(items: string[]): Record<string, number> {
    const freq: Record<string, number> = {};
    for (const item of items) {
      freq[item] = (freq[item] || 0) + 1;
    }
    return freq;
  }

  /**
   * Generate cluster name from keywords
   */
  private generateClusterName(keywords: string[]): string {
    return keywords.slice(0, 3).map(k => 
      k.charAt(0).toUpperCase() + k.slice(1)
    ).join(' & ');
  }

  /**
   * Find peak date in mentions
   */
  private findPeakDate(mentions: any[]): Date {
    const dailyVolumes = this.groupByDay(mentions);
    const peakDay = Object.entries(dailyVolumes)
      .sort((a, b) => b[1] - a[1])[0];
    return new Date(peakDay[0]);
  }

  /**
   * Calculate peak volume
   */
  private calculatePeakVolume(mentions: any[]): number {
    const dailyVolumes = this.groupByDay(mentions);
    return Math.max(...Object.values(dailyVolumes));
  }

  /**
   * Get platform distribution
   */
  private getPlatformDistribution(mentions: any[]): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const mention of mentions) {
      dist[mention.platform] = (dist[mention.platform] || 0) + 1;
    }
    return dist;
  }

  /**
   * Get top contributors
   */
  private getTopContributors(mentions: any[]): any[] {
    const contributors = new Map<string, any>();

    for (const mention of mentions) {
      const key = mention.authorId;
      if (!contributors.has(key)) {
        contributors.set(key, {
          authorId: mention.authorId,
          authorUsername: mention.authorUsername,
          mentionCount: 0,
          totalEngagement: 0,
        });
      }

      const contributor = contributors.get(key)!;
      contributor.mentionCount++;
      contributor.totalEngagement += mention.likes + mention.comments + mention.shares;
    }

    return Array.from(contributors.values())
      .sort((a, b) => b.mentionCount - a.mentionCount)
      .slice(0, 10);
  }
}
