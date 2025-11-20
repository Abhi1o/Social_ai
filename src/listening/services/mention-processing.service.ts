import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Platform, Sentiment } from '@prisma/client';
import { StreamMention } from '../interfaces/listening-stream.interface';
import { SentimentAnalysisService } from './sentiment-analysis.service';

/**
 * Categories for mention classification
 */
export enum MentionCategory {
  BRAND_MENTION = 'brand_mention',
  PRODUCT_MENTION = 'product_mention',
  COMPETITOR_MENTION = 'competitor_mention',
  INDUSTRY_DISCUSSION = 'industry_discussion',
  CUSTOMER_FEEDBACK = 'customer_feedback',
  SUPPORT_REQUEST = 'support_request',
  COMPLAINT = 'complaint',
  PRAISE = 'praise',
  QUESTION = 'question',
  NEWS = 'news',
  SPAM = 'spam',
  OTHER = 'other',
}

/**
 * Service for processing and categorizing mentions
 */
@Injectable()
export class MentionProcessingService {
  private readonly logger = new Logger(MentionProcessingService.name);
  
  // Cache for deduplication (stores platformPostId)
  private readonly recentMentions = new Set<string>();
  private readonly cacheMaxSize = 10000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sentimentService: SentimentAnalysisService,
  ) {}

  /**
   * Process a new mention from a stream
   */
  async processMention(
    queryId: string,
    workspaceId: string,
    mention: StreamMention,
  ): Promise<boolean> {
    try {
      // Step 1: Deduplication check
      if (await this.isDuplicate(mention)) {
        this.logger.debug(`Duplicate mention detected: ${mention.platformPostId}`);
        return false;
      }

      // Step 2: Filter spam and low-quality content
      if (this.isSpam(mention)) {
        this.logger.debug(`Spam mention filtered: ${mention.platformPostId}`);
        return false;
      }

      // Step 3: Categorize the mention
      const categories = this.categorizeMention(mention);

      // Step 4: Determine if author is an influencer
      const isInfluencer = this.isInfluencer(mention);

      // Step 5: AI-powered sentiment analysis
      const sentimentAnalysis = await this.sentimentService.analyzeSentiment(mention.content);

      // Step 6: Store the mention with sentiment
      await this.storeMention(
        queryId,
        workspaceId,
        mention,
        categories,
        isInfluencer,
        sentimentAnalysis.sentiment,
        sentimentAnalysis.score,
      );

      // Step 7: Add to deduplication cache
      this.addToCache(mention);

      this.logger.debug(`Processed mention: ${mention.platformPostId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error processing mention ${mention.platformPostId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Check if mention is a duplicate
   */
  private async isDuplicate(mention: StreamMention): Promise<boolean> {
    // Check in-memory cache first (fast)
    const cacheKey = `${mention.platform}:${mention.platformPostId}`;
    if (this.recentMentions.has(cacheKey)) {
      return true;
    }

    // Check database (slower but authoritative)
    const existing = await this.prisma.listeningMention.findUnique({
      where: {
        platform_platformPostId: {
          platform: mention.platform,
          platformPostId: mention.platformPostId,
        },
      },
    });

    return existing !== null;
  }

  /**
   * Add mention to deduplication cache
   */
  private addToCache(mention: StreamMention): void {
    const cacheKey = `${mention.platform}:${mention.platformPostId}`;
    
    // If cache is full, clear it (simple LRU alternative)
    if (this.recentMentions.size >= this.cacheMaxSize) {
      this.recentMentions.clear();
      this.logger.debug('Cleared deduplication cache');
    }

    this.recentMentions.add(cacheKey);
  }

  /**
   * Check if mention is spam
   */
  private isSpam(mention: StreamMention): boolean {
    const content = mention.content.toLowerCase();

    // Common spam indicators
    const spamPatterns = [
      /\b(buy now|click here|limited time|act now)\b/i,
      /\b(viagra|cialis|pharmacy)\b/i,
      /\b(make money|work from home|earn \$)\b/i,
      /\b(free gift|prize winner|congratulations you won)\b/i,
      /(http[s]?:\/\/[^\s]+){3,}/, // Multiple URLs
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }

    // Check for excessive hashtags (more than 15)
    const hashtagCount = (content.match(/#\w+/g) || []).length;
    if (hashtagCount > 15) {
      return true;
    }

    // Check for excessive mentions (more than 10)
    const mentionCount = (content.match(/@\w+/g) || []).length;
    if (mentionCount > 10) {
      return true;
    }

    return false;
  }

  /**
   * Categorize mention based on content
   */
  private categorizeMention(mention: StreamMention): string[] {
    const content = mention.content.toLowerCase();
    const categories: string[] = [];

    // Brand/Product mentions
    if (this.containsKeywords(content, ['brand', 'company', 'product'])) {
      categories.push(MentionCategory.BRAND_MENTION);
    }

    // Customer feedback
    if (this.containsKeywords(content, ['love', 'hate', 'like', 'dislike', 'review'])) {
      categories.push(MentionCategory.CUSTOMER_FEEDBACK);
    }

    // Support requests
    if (this.containsKeywords(content, ['help', 'support', 'issue', 'problem', 'not working'])) {
      categories.push(MentionCategory.SUPPORT_REQUEST);
    }

    // Complaints
    if (this.containsKeywords(content, ['terrible', 'awful', 'worst', 'disappointed', 'angry'])) {
      categories.push(MentionCategory.COMPLAINT);
    }

    // Praise
    if (this.containsKeywords(content, ['amazing', 'excellent', 'fantastic', 'best', 'love it'])) {
      categories.push(MentionCategory.PRAISE);
    }

    // Questions
    if (content.includes('?') || this.containsKeywords(content, ['how', 'what', 'when', 'where', 'why'])) {
      categories.push(MentionCategory.QUESTION);
    }

    // Default category
    if (categories.length === 0) {
      categories.push(MentionCategory.OTHER);
    }

    return categories;
  }

  /**
   * Check if content contains any of the keywords
   */
  private containsKeywords(content: string, keywords: string[]): boolean {
    return keywords.some(keyword => content.includes(keyword));
  }

  /**
   * Determine if author is an influencer
   */
  private isInfluencer(mention: StreamMention): boolean {
    const followers = mention.authorFollowers || 0;
    const engagement = mention.likes + mention.comments + mention.shares;
    const engagementRate = followers > 0 ? engagement / followers : 0;

    // Influencer criteria:
    // - 10,000+ followers OR
    // - High engagement rate (>5%) with 1,000+ followers
    return followers >= 10000 || (followers >= 1000 && engagementRate > 0.05);
  }

  /**
   * Estimate sentiment from content (basic heuristic)
   * Will be replaced by proper sentiment analysis
   */
  private estimateSentiment(mention: StreamMention): Sentiment {
    const content = mention.content.toLowerCase();

    const positiveWords = ['love', 'great', 'amazing', 'excellent', 'fantastic', 'best', 'awesome'];
    const negativeWords = ['hate', 'terrible', 'awful', 'worst', 'bad', 'disappointed', 'angry'];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (content.includes(word)) positiveCount++;
    }

    for (const word of negativeWords) {
      if (content.includes(word)) negativeCount++;
    }

    if (positiveCount > negativeCount) {
      return Sentiment.POSITIVE;
    } else if (negativeCount > positiveCount) {
      return Sentiment.NEGATIVE;
    }

    return Sentiment.NEUTRAL;
  }

  /**
   * Store mention in database
   */
  private async storeMention(
    queryId: string,
    workspaceId: string,
    mention: StreamMention,
    categories: string[],
    isInfluencer: boolean,
    sentiment: Sentiment,
    sentimentScore: number,
  ): Promise<void> {
    await this.prisma.listeningMention.create({
      data: {
        queryId,
        workspaceId,
        platform: mention.platform,
        authorId: mention.authorId,
        authorUsername: mention.authorUsername,
        authorName: mention.authorName,
        authorAvatar: mention.authorAvatar,
        authorFollowers: mention.authorFollowers,
        content: mention.content,
        url: mention.url,
        platformPostId: mention.platformPostId,
        likes: mention.likes,
        comments: mention.comments,
        shares: mention.shares,
        reach: mention.reach,
        sentiment,
        sentimentScore,
        language: mention.language,
        location: mention.location,
        isInfluencer,
        tags: categories,
        metadata: mention.metadata,
        publishedAt: mention.publishedAt,
      },
    });
  }

  /**
   * Batch process multiple mentions
   */
  async processMentionBatch(
    queryId: string,
    workspaceId: string,
    mentions: StreamMention[],
  ): Promise<{ processed: number; duplicates: number; spam: number }> {
    let processed = 0;
    let duplicates = 0;
    let spam = 0;

    for (const mention of mentions) {
      if (await this.isDuplicate(mention)) {
        duplicates++;
        continue;
      }

      if (this.isSpam(mention)) {
        spam++;
        continue;
      }

      const success = await this.processMention(queryId, workspaceId, mention);
      if (success) {
        processed++;
      }
    }

    return { processed, duplicates, spam };
  }
}
