import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { pipeline } from '@xenova/transformers';
import { PrismaService } from '../../prisma/prisma.service';
import { Sentiment } from '@prisma/client';

/**
 * Sentiment analysis result with detailed scoring
 */
export interface SentimentAnalysisResult {
  sentiment: Sentiment;
  score: number; // -1 to 1 scale
  confidence: number; // 0 to 1
  rawScores: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

/**
 * Sentiment trend data point
 */
export interface SentimentTrendPoint {
  date: Date;
  averageScore: number;
  sentiment: Sentiment;
  mentionCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
}

/**
 * Topic-based sentiment breakdown
 */
export interface TopicSentiment {
  topic: string;
  averageScore: number;
  sentiment: Sentiment;
  mentionCount: number;
  positivePercentage: number;
  neutralPercentage: number;
  negativePercentage: number;
}

/**
 * Service for AI-powered sentiment analysis using Hugging Face Transformers
 * 
 * Requirements: 9.2, 9.4
 */
@Injectable()
export class SentimentAnalysisService implements OnModuleInit {
  private readonly logger = new Logger(SentimentAnalysisService.name);
  private sentimentPipeline: any | null = null;
  private isInitialized = false;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initialize the sentiment analysis model on module startup
   */
  async onModuleInit() {
    try {
      this.logger.log('Initializing sentiment analysis model...');
      
      // Load the sentiment analysis pipeline
      // Using distilbert-base-uncased-finetuned-sst-2-english for sentiment analysis
      this.sentimentPipeline = await pipeline(
        'sentiment-analysis',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      );
      
      this.isInitialized = true;
      this.logger.log('Sentiment analysis model initialized successfully');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to initialize sentiment analysis model: ${err.message}`,
        err.stack,
      );
      // Don't throw - allow service to start but log errors when analysis is attempted
    }
  }

  /**
   * Analyze sentiment of text content
   * Returns sentiment classification and score on -1 to 1 scale
   * 
   * @param text - Text content to analyze
   * @returns Sentiment analysis result
   */
  async analyzeSentiment(text: string): Promise<SentimentAnalysisResult> {
    if (!this.isInitialized || !this.sentimentPipeline) {
      this.logger.warn('Sentiment analysis model not initialized, using fallback');
      return this.fallbackSentimentAnalysis(text);
    }

    try {
      // Clean and prepare text
      const cleanText = this.preprocessText(text);
      
      if (cleanText.length === 0) {
        return this.neutralResult();
      }

      // Run sentiment analysis
      const result = await this.sentimentPipeline(cleanText);
      
      // Transform result to our format
      return this.transformResult(result);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error analyzing sentiment: ${err.message}`,
        err.stack,
      );
      return this.fallbackSentimentAnalysis(text);
    }
  }

  /**
   * Analyze sentiment for multiple texts in batch
   * More efficient than analyzing one by one
   * 
   * @param texts - Array of text content to analyze
   * @returns Array of sentiment analysis results
   */
  async analyzeSentimentBatch(
    texts: string[],
  ): Promise<SentimentAnalysisResult[]> {
    if (!this.isInitialized || !this.sentimentPipeline) {
      this.logger.warn('Sentiment analysis model not initialized, using fallback');
      return texts.map(text => this.fallbackSentimentAnalysis(text));
    }

    try {
      // Clean and prepare texts
      const cleanTexts = texts.map(text => this.preprocessText(text));
      
      // Run batch sentiment analysis
      const results = await this.sentimentPipeline(cleanTexts);
      
      // Transform results to our format
      return Array.isArray(results)
        ? results.map(result => this.transformResult(result))
        : [this.transformResult(results)];
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error analyzing sentiment batch: ${err.message}`,
        err.stack,
      );
      return texts.map(text => this.fallbackSentimentAnalysis(text));
    }
  }

  /**
   * Update sentiment for a specific mention
   * 
   * @param mentionId - ID of the mention to update
   * @returns Updated mention with sentiment
   */
  async updateMentionSentiment(mentionId: string): Promise<void> {
    const mention = await this.prisma.listeningMention.findUnique({
      where: { id: mentionId },
    });

    if (!mention) {
      throw new Error(`Mention not found: ${mentionId}`);
    }

    const analysis = await this.analyzeSentiment(mention.content);

    await this.prisma.listeningMention.update({
      where: { id: mentionId },
      data: {
        sentiment: analysis.sentiment,
        sentimentScore: analysis.score,
      },
    });
  }

  /**
   * Batch update sentiment for multiple mentions
   * 
   * @param mentionIds - Array of mention IDs to update
   * @returns Number of mentions updated
   */
  async updateMentionsSentimentBatch(mentionIds: string[]): Promise<number> {
    const mentions = await this.prisma.listeningMention.findMany({
      where: { id: { in: mentionIds } },
      select: { id: true, content: true },
    });

    if (mentions.length === 0) {
      return 0;
    }

    const texts = mentions.map(m => m.content);
    const analyses = await this.analyzeSentimentBatch(texts);

    // Update all mentions
    const updates = mentions.map((mention, index) => {
      const analysis = analyses[index];
      return this.prisma.listeningMention.update({
        where: { id: mention.id },
        data: {
          sentiment: analysis.sentiment,
          sentimentScore: analysis.score,
        },
      });
    });

    await Promise.all(updates);
    return mentions.length;
  }

  /**
   * Get sentiment trend analysis over time
   * 
   * @param workspaceId - Workspace ID
   * @param queryId - Optional listening query ID to filter
   * @param days - Number of days to analyze (default: 30)
   * @param interval - Time interval for grouping ('day' | 'hour')
   * @returns Array of sentiment trend data points
   */
  async getSentimentTrend(
    workspaceId: string,
    queryId?: string,
    days: number = 30,
    interval: 'day' | 'hour' = 'day',
  ): Promise<SentimentTrendPoint[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: any = {
      workspaceId,
      publishedAt: { gte: since },
    };
    if (queryId) {
      where.queryId = queryId;
    }

    // Get all mentions in the time range
    const mentions = await this.prisma.listeningMention.findMany({
      where,
      select: {
        publishedAt: true,
        sentiment: true,
        sentimentScore: true,
      },
      orderBy: { publishedAt: 'asc' },
    });

    // Group by time interval
    const grouped = this.groupByTimeInterval(mentions, interval);

    // Calculate statistics for each group
    return grouped.map(group => {
      const positiveCount = group.mentions.filter(
        m => m.sentiment === Sentiment.POSITIVE,
      ).length;
      const neutralCount = group.mentions.filter(
        m => m.sentiment === Sentiment.NEUTRAL,
      ).length;
      const negativeCount = group.mentions.filter(
        m => m.sentiment === Sentiment.NEGATIVE,
      ).length;

      const avgScore =
        group.mentions.reduce((sum, m) => sum + (m.sentimentScore || 0), 0) /
        group.mentions.length;

      const dominantSentiment = this.getDominantSentiment(
        positiveCount,
        neutralCount,
        negativeCount,
      );

      return {
        date: group.date,
        averageScore: avgScore,
        sentiment: dominantSentiment,
        mentionCount: group.mentions.length,
        positiveCount,
        neutralCount,
        negativeCount,
      };
    });
  }

  /**
   * Get topic-based sentiment breakdown
   * Analyzes sentiment by tags/topics
   * 
   * @param workspaceId - Workspace ID
   * @param queryId - Optional listening query ID to filter
   * @param days - Number of days to analyze (default: 30)
   * @returns Array of topic sentiment breakdowns
   */
  async getTopicSentimentBreakdown(
    workspaceId: string,
    queryId?: string,
    days: number = 30,
  ): Promise<TopicSentiment[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: any = {
      workspaceId,
      publishedAt: { gte: since },
    };
    if (queryId) {
      where.queryId = queryId;
    }

    // Get all mentions with tags
    const mentions = await this.prisma.listeningMention.findMany({
      where,
      select: {
        tags: true,
        sentiment: true,
        sentimentScore: true,
      },
    });

    // Group by topic (tag)
    const topicMap = new Map<string, any[]>();

    for (const mention of mentions) {
      for (const tag of mention.tags) {
        if (!topicMap.has(tag)) {
          topicMap.set(tag, []);
        }
        topicMap.get(tag)!.push(mention);
      }
    }

    // Calculate statistics for each topic
    const results: TopicSentiment[] = [];

    for (const [topic, topicMentions] of topicMap.entries()) {
      const positiveCount = topicMentions.filter(
        m => m.sentiment === Sentiment.POSITIVE,
      ).length;
      const neutralCount = topicMentions.filter(
        m => m.sentiment === Sentiment.NEUTRAL,
      ).length;
      const negativeCount = topicMentions.filter(
        m => m.sentiment === Sentiment.NEGATIVE,
      ).length;

      const total = topicMentions.length;
      const avgScore =
        topicMentions.reduce((sum, m) => sum + (m.sentimentScore || 0), 0) /
        total;

      const dominantSentiment = this.getDominantSentiment(
        positiveCount,
        neutralCount,
        negativeCount,
      );

      results.push({
        topic,
        averageScore: avgScore,
        sentiment: dominantSentiment,
        mentionCount: total,
        positivePercentage: (positiveCount / total) * 100,
        neutralPercentage: (neutralCount / total) * 100,
        negativePercentage: (negativeCount / total) * 100,
      });
    }

    // Sort by mention count descending
    return results.sort((a, b) => b.mentionCount - a.mentionCount);
  }

  /**
   * Get sentiment timeline visualization data
   * Returns data formatted for charting libraries
   * 
   * @param workspaceId - Workspace ID
   * @param queryId - Optional listening query ID to filter
   * @param days - Number of days to analyze (default: 30)
   * @returns Timeline data with sentiment scores
   */
  async getSentimentTimeline(
    workspaceId: string,
    queryId?: string,
    days: number = 30,
  ): Promise<{
    timeline: Array<{
      date: string;
      score: number;
      positive: number;
      neutral: number;
      negative: number;
    }>;
    summary: {
      averageScore: number;
      trend: 'improving' | 'declining' | 'stable';
      volatility: number;
    };
  }> {
    const trendData = await this.getSentimentTrend(
      workspaceId,
      queryId,
      days,
      'day',
    );

    // Format for visualization
    const timeline = trendData.map(point => ({
      date: point.date.toISOString().split('T')[0],
      score: point.averageScore,
      positive: point.positiveCount,
      neutral: point.neutralCount,
      negative: point.negativeCount,
    }));

    // Calculate summary statistics
    const scores = trendData.map(p => p.averageScore);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Calculate trend (comparing first half to second half)
    const midpoint = Math.floor(scores.length / 2);
    const firstHalfAvg =
      scores.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
    const secondHalfAvg =
      scores.slice(midpoint).reduce((a, b) => a + b, 0) /
      (scores.length - midpoint);

    const trendDiff = secondHalfAvg - firstHalfAvg;
    const trend =
      Math.abs(trendDiff) < 0.1
        ? 'stable'
        : trendDiff > 0
        ? 'improving'
        : 'declining';

    // Calculate volatility (standard deviation)
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) /
      scores.length;
    const volatility = Math.sqrt(variance);

    return {
      timeline,
      summary: {
        averageScore,
        trend,
        volatility,
      },
    };
  }

  /**
   * Preprocess text for sentiment analysis
   */
  private preprocessText(text: string): string {
    // Remove URLs
    let cleaned = text.replace(/https?:\/\/[^\s]+/g, '');
    
    // Remove mentions
    cleaned = cleaned.replace(/@\w+/g, '');
    
    // Remove hashtags but keep the text
    cleaned = cleaned.replace(/#(\w+)/g, '$1');
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Truncate to max length (512 tokens for BERT models)
    if (cleaned.length > 512) {
      cleaned = cleaned.substring(0, 512);
    }
    
    return cleaned;
  }

  /**
   * Transform model output to our sentiment result format
   */
  private transformResult(result: any): SentimentAnalysisResult {
    const label = result.label?.toLowerCase() || 'neutral';
    const confidence = result.score || 0.5;

    // Map model output to our sentiment enum
    let sentiment: Sentiment;
    let score: number;

    if (label.includes('positive')) {
      sentiment = Sentiment.POSITIVE;
      score = confidence; // 0 to 1
    } else if (label.includes('negative')) {
      sentiment = Sentiment.NEGATIVE;
      score = -confidence; // -1 to 0
    } else {
      sentiment = Sentiment.NEUTRAL;
      score = 0;
    }

    // Calculate raw scores (normalized)
    const rawScores = {
      positive: sentiment === Sentiment.POSITIVE ? confidence : 1 - confidence,
      neutral: sentiment === Sentiment.NEUTRAL ? confidence : 0.5,
      negative: sentiment === Sentiment.NEGATIVE ? confidence : 1 - confidence,
    };

    return {
      sentiment,
      score,
      confidence,
      rawScores,
    };
  }

  /**
   * Fallback sentiment analysis using keyword-based heuristics
   */
  private fallbackSentimentAnalysis(text: string): SentimentAnalysisResult {
    const content = text.toLowerCase();

    const positiveWords = [
      'love', 'great', 'amazing', 'excellent', 'fantastic', 'best', 'awesome',
      'wonderful', 'perfect', 'happy', 'good', 'nice', 'beautiful', 'brilliant',
    ];
    const negativeWords = [
      'hate', 'terrible', 'awful', 'worst', 'bad', 'disappointed', 'angry',
      'horrible', 'poor', 'sad', 'disgusting', 'useless', 'pathetic',
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (content.includes(word)) positiveCount++;
    }

    for (const word of negativeWords) {
      if (content.includes(word)) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    let sentiment: Sentiment;
    let score: number;
    let confidence: number;

    if (total === 0) {
      sentiment = Sentiment.NEUTRAL;
      score = 0;
      confidence = 0.5;
    } else if (positiveCount > negativeCount) {
      sentiment = Sentiment.POSITIVE;
      score = positiveCount / (total + 5); // Normalize
      confidence = positiveCount / total;
    } else if (negativeCount > positiveCount) {
      sentiment = Sentiment.NEGATIVE;
      score = -(negativeCount / (total + 5)); // Normalize
      confidence = negativeCount / total;
    } else {
      sentiment = Sentiment.NEUTRAL;
      score = 0;
      confidence = 0.5;
    }

    return {
      sentiment,
      score,
      confidence,
      rawScores: {
        positive: positiveCount / (total + 1),
        neutral: 0.5,
        negative: negativeCount / (total + 1),
      },
    };
  }

  /**
   * Return neutral sentiment result
   */
  private neutralResult(): SentimentAnalysisResult {
    return {
      sentiment: Sentiment.NEUTRAL,
      score: 0,
      confidence: 0.5,
      rawScores: {
        positive: 0.33,
        neutral: 0.34,
        negative: 0.33,
      },
    };
  }

  /**
   * Group mentions by time interval
   */
  private groupByTimeInterval(
    mentions: Array<{
      publishedAt: Date;
      sentiment: Sentiment;
      sentimentScore: number | null;
    }>,
    interval: 'day' | 'hour',
  ): Array<{ date: Date; mentions: typeof mentions }> {
    const groups = new Map<string, typeof mentions>();

    for (const mention of mentions) {
      const date = new Date(mention.publishedAt);
      let key: string;

      if (interval === 'day') {
        key = date.toISOString().split('T')[0];
      } else {
        key = `${date.toISOString().split('T')[0]}-${date.getHours()}`;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(mention);
    }

    return Array.from(groups.entries())
      .map(([key, mentions]) => ({
        date: new Date(key),
        mentions,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Determine dominant sentiment from counts
   */
  private getDominantSentiment(
    positiveCount: number,
    neutralCount: number,
    negativeCount: number,
  ): Sentiment {
    if (
      positiveCount > neutralCount &&
      positiveCount > negativeCount
    ) {
      return Sentiment.POSITIVE;
    } else if (
      negativeCount > neutralCount &&
      negativeCount > positiveCount
    ) {
      return Sentiment.NEGATIVE;
    }
    return Sentiment.NEUTRAL;
  }
}
