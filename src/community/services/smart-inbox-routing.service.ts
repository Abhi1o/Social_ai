import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LangChainService } from '../../ai/services/langchain.service';
import { AIModel } from '../../ai/interfaces/ai.interface';
import { Conversation, Message, Priority, Sentiment } from '@prisma/client';

/**
 * Intent categories for message classification
 */
export enum MessageIntent {
  QUESTION = 'question',
  COMPLAINT = 'complaint',
  PRAISE = 'praise',
  SUPPORT_REQUEST = 'support_request',
  SALES_INQUIRY = 'sales_inquiry',
  FEEDBACK = 'feedback',
  SPAM = 'spam',
  GENERAL = 'general',
}

/**
 * Message category for routing
 */
export enum MessageCategory {
  URGENT = 'urgent',
  CUSTOMER_SUPPORT = 'customer_support',
  SALES = 'sales',
  MARKETING = 'marketing',
  GENERAL_INQUIRY = 'general_inquiry',
  SPAM = 'spam',
}

/**
 * Routing result
 */
export interface RoutingResult {
  category: MessageCategory;
  intent: MessageIntent;
  sentiment: Sentiment;
  sentimentScore: number;
  priority: Priority;
  suggestedAssignee?: string;
  confidence: number;
  reasoning: string;
}

/**
 * Routing rule configuration
 */
export interface RoutingRule {
  id: string;
  name: string;
  conditions: {
    categories?: MessageCategory[];
    intents?: MessageIntent[];
    sentiments?: Sentiment[];
    priorities?: Priority[];
    keywords?: string[];
    platforms?: string[];
  };
  actions: {
    assignTo?: string;
    setPriority?: Priority;
    addTags?: string[];
    autoRespond?: boolean;
    responseTemplate?: string;
  };
  isActive: boolean;
  order: number;
}

/**
 * Smart Inbox Routing Service
 * 
 * Implements AI-powered message categorization, sentiment detection,
 * intent detection, priority scoring, and automatic team member assignment
 * 
 * Requirements: 10.2, 10.4
 */
@Injectable()
export class SmartInboxRoutingService {
  private readonly logger = new Logger(SmartInboxRoutingService.name);

  constructor(
    private prisma: PrismaService,
    private langChainService: LangChainService,
  ) {}

  /**
   * Analyze and route a new message
   * 
   * This is the main entry point for smart inbox routing.
   * It performs sentiment analysis, intent detection, categorization,
   * priority scoring, and determines the best team member to assign.
   */
  async analyzeAndRoute(
    workspaceId: string,
    conversationId: string,
    message: Message,
  ): Promise<RoutingResult> {
    this.logger.log(`Analyzing message ${message.id} for routing`);

    try {
      // Perform parallel analysis
      const [sentimentResult, intentResult, categoryResult] = await Promise.all([
        this.detectSentiment(message.content),
        this.detectIntent(message.content),
        this.categorizeMessage(message.content),
      ]);

      // Calculate priority based on all factors
      const priority = this.calculatePriority(
        sentimentResult,
        intentResult,
        categoryResult,
        message,
      );

      // Find best team member to assign
      const suggestedAssignee = await this.findBestAssignee(
        workspaceId,
        categoryResult,
        intentResult,
        priority,
      );

      const result: RoutingResult = {
        category: categoryResult.category,
        intent: intentResult.intent,
        sentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.score,
        priority,
        suggestedAssignee,
        confidence: this.calculateConfidence(sentimentResult, intentResult, categoryResult),
        reasoning: this.generateReasoning(
          sentimentResult,
          intentResult,
          categoryResult,
          priority,
        ),
      };

      this.logger.log(`Routing analysis complete: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error analyzing message: ${err.message}`, err.stack);
      
      // Return default routing on error
      return {
        category: MessageCategory.GENERAL_INQUIRY,
        intent: MessageIntent.GENERAL,
        sentiment: Sentiment.NEUTRAL,
        sentimentScore: 0,
        priority: Priority.MEDIUM,
        confidence: 0.5,
        reasoning: 'Default routing due to analysis error',
      };
    }
  }

  /**
   * Detect sentiment of a message using AI
   */
  async detectSentiment(content: string): Promise<{
    sentiment: Sentiment;
    score: number;
    reasoning: string;
  }> {
    try {
      // Use LangChain for sentiment analysis
      const result = await this.langChainService.analyzeSentiment(
        AIModel.GPT_4O_MINI, // Use cost-efficient model
        content,
      );

      // Map sentiment string to enum
      let sentiment: Sentiment;
      if (result.sentiment === 'positive') {
        sentiment = Sentiment.POSITIVE;
      } else if (result.sentiment === 'negative') {
        sentiment = Sentiment.NEGATIVE;
      } else {
        sentiment = Sentiment.NEUTRAL;
      }

      return {
        sentiment,
        score: result.score,
        reasoning: result.reasoning,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Sentiment detection error: ${err.message}`);
      return {
        sentiment: Sentiment.NEUTRAL,
        score: 0,
        reasoning: 'Unable to detect sentiment',
      };
    }
  }

  /**
   * Detect intent of a message using NLP
   */
  async detectIntent(content: string): Promise<{
    intent: MessageIntent;
    confidence: number;
    reasoning: string;
  }> {
    try {
      const prompt = `Analyze the following message and determine the primary intent.

Message: "${content}"

Classify the intent as one of:
- question: User is asking a question
- complaint: User is expressing dissatisfaction or a problem
- praise: User is giving positive feedback or compliments
- support_request: User needs technical or customer support
- sales_inquiry: User is interested in purchasing or pricing
- feedback: User is providing general feedback or suggestions
- spam: Message appears to be spam or irrelevant
- general: General conversation or unclear intent

Respond in JSON format:
{
  "intent": "intent_category",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

      const model = this.langChainService.getModel(AIModel.GPT_4O_MINI);
      const response = await (model as any).call([{ role: 'user', content: prompt }]);
      
      const result = JSON.parse(response.content as string);

      return {
        intent: result.intent as MessageIntent,
        confidence: result.confidence,
        reasoning: result.reasoning,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Intent detection error: ${err.message}`);
      
      // Fallback to keyword-based intent detection
      return this.detectIntentKeywordBased(content);
    }
  }

  /**
   * Fallback keyword-based intent detection
   */
  private detectIntentKeywordBased(content: string): {
    intent: MessageIntent;
    confidence: number;
    reasoning: string;
  } {
    const lowerContent = content.toLowerCase();

    // Spam indicators (check first to filter out spam)
    if (
      lowerContent.match(/\b(click here|free money|winner|congratulations|claim now)\b/) ||
      lowerContent.includes('http') && lowerContent.length < 50
    ) {
      return {
        intent: MessageIntent.SPAM,
        confidence: 0.8,
        reasoning: 'Contains spam indicators',
      };
    }

    // Complaint indicators (high priority)
    if (
      lowerContent.match(/\b(problem|issue|broken|not working|error|bug|disappointed|frustrated)\b/)
    ) {
      return {
        intent: MessageIntent.COMPLAINT,
        confidence: 0.7,
        reasoning: 'Contains complaint keywords',
      };
    }

    // Sales inquiry indicators (check before general questions)
    if (
      lowerContent.match(/\b(price|cost|buy|purchase|order|payment|subscription|plan)\b/)
    ) {
      return {
        intent: MessageIntent.SALES_INQUIRY,
        confidence: 0.7,
        reasoning: 'Contains sales-related keywords',
      };
    }

    // Support request indicators
    if (
      lowerContent.match(/\b(help|support|assist|need|urgent|asap)\b/)
    ) {
      return {
        intent: MessageIntent.SUPPORT_REQUEST,
        confidence: 0.7,
        reasoning: 'Contains support request keywords',
      };
    }

    // Praise indicators
    if (
      lowerContent.match(/\b(great|excellent|amazing|love|thank|thanks|awesome|fantastic)\b/)
    ) {
      return {
        intent: MessageIntent.PRAISE,
        confidence: 0.7,
        reasoning: 'Contains positive feedback keywords',
      };
    }

    // Question indicators (check last as it's most general)
    if (
      lowerContent.includes('?') ||
      lowerContent.match(/\b(how|what|when|where|why|who|can|could|would|should)\b/)
    ) {
      return {
        intent: MessageIntent.QUESTION,
        confidence: 0.7,
        reasoning: 'Contains question indicators',
      };
    }

    return {
      intent: MessageIntent.GENERAL,
      confidence: 0.5,
      reasoning: 'No specific intent detected',
    };
  }

  /**
   * Categorize message for routing
   */
  async categorizeMessage(content: string): Promise<{
    category: MessageCategory;
    confidence: number;
    reasoning: string;
  }> {
    try {
      const prompt = `Categorize the following message for routing purposes.

Message: "${content}"

Classify into one of these categories:
- urgent: Requires immediate attention (crisis, severe issue, time-sensitive)
- customer_support: Technical support or customer service issue
- sales: Sales inquiry, pricing, or purchase-related
- marketing: Marketing feedback, campaign-related, or brand inquiry
- general_inquiry: General questions or information requests
- spam: Spam or irrelevant content

Respond in JSON format:
{
  "category": "category_name",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

      const model = this.langChainService.getModel(AIModel.GPT_4O_MINI);
      const response = await (model as any).call([{ role: 'user', content: prompt }]);
      
      const result = JSON.parse(response.content as string);

      return {
        category: result.category as MessageCategory,
        confidence: result.confidence,
        reasoning: result.reasoning,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Categorization error: ${err.message}`);
      return {
        category: MessageCategory.GENERAL_INQUIRY,
        confidence: 0.5,
        reasoning: 'Default categorization due to error',
      };
    }
  }

  /**
   * Calculate priority based on multiple factors
   */
  private calculatePriority(
    sentimentResult: { sentiment: Sentiment; score: number },
    intentResult: { intent: MessageIntent; confidence: number },
    categoryResult: { category: MessageCategory; confidence: number },
    message: Message,
  ): Priority {
    let priorityScore = 50; // Start at medium (0-100 scale)

    // Sentiment impact
    if (sentimentResult.sentiment === Sentiment.NEGATIVE) {
      priorityScore += 20 + Math.abs(sentimentResult.score) * 10;
    } else if (sentimentResult.sentiment === Sentiment.POSITIVE) {
      priorityScore -= 10;
    }

    // Intent impact
    if (intentResult.intent === MessageIntent.COMPLAINT) {
      priorityScore += 25;
    } else if (intentResult.intent === MessageIntent.SUPPORT_REQUEST) {
      priorityScore += 20;
    } else if (intentResult.intent === MessageIntent.SALES_INQUIRY) {
      priorityScore += 15;
    } else if (intentResult.intent === MessageIntent.SPAM) {
      priorityScore -= 40;
    }

    // Category impact
    if (categoryResult.category === MessageCategory.URGENT) {
      priorityScore += 30;
    } else if (categoryResult.category === MessageCategory.CUSTOMER_SUPPORT) {
      priorityScore += 15;
    } else if (categoryResult.category === MessageCategory.SPAM) {
      priorityScore -= 40;
    }

    // Keyword-based urgency boost
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'immediately'];
    const lowerContent = message.content.toLowerCase();
    if (urgentKeywords.some(keyword => lowerContent.includes(keyword))) {
      priorityScore += 20;
    }

    // Map score to priority enum
    if (priorityScore >= 80) {
      return Priority.URGENT;
    } else if (priorityScore >= 60) {
      return Priority.HIGH;
    } else if (priorityScore >= 40) {
      return Priority.MEDIUM;
    } else {
      return Priority.LOW;
    }
  }

  /**
   * Find the best team member to assign based on routing logic
   */
  private async findBestAssignee(
    workspaceId: string,
    categoryResult: { category: MessageCategory },
    intentResult: { intent: MessageIntent },
    priority: Priority,
  ): Promise<string | undefined> {
    try {
      // Get all active users in the workspace
      const users = await this.prisma.user.findMany({
        where: {
          workspaceId,
          isActive: true,
        },
        include: {
          conversations: {
            where: {
              status: {
                in: ['OPEN', 'PENDING'],
              },
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (users.length === 0) {
        return undefined;
      }

      // Simple load balancing: assign to user with fewest open conversations
      // In a real implementation, this would consider:
      // - User skills/specializations
      // - User availability/working hours
      // - Historical performance
      // - Category/intent matching
      
      const userWithLeastLoad = users.reduce((prev, current) => {
        return prev.conversations.length < current.conversations.length ? prev : current;
      });

      return userWithLeastLoad.id;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error finding assignee: ${err.message}`);
      return undefined;
    }
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(
    sentimentResult: { score: number },
    intentResult: { confidence: number },
    categoryResult: { confidence: number },
  ): number {
    // Average of all confidence scores
    return (
      (Math.abs(sentimentResult.score) + intentResult.confidence + categoryResult.confidence) / 3
    );
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    sentimentResult: { sentiment: Sentiment; reasoning: string },
    intentResult: { intent: MessageIntent; reasoning: string },
    categoryResult: { category: MessageCategory; reasoning: string },
    priority: Priority,
  ): string {
    return `Sentiment: ${sentimentResult.sentiment} (${sentimentResult.reasoning}). ` +
           `Intent: ${intentResult.intent} (${intentResult.reasoning}). ` +
           `Category: ${categoryResult.category} (${categoryResult.reasoning}). ` +
           `Priority: ${priority}.`;
  }

  /**
   * Apply routing rules to a conversation
   */
  async applyRoutingRules(
    workspaceId: string,
    conversationId: string,
    routingResult: RoutingResult,
  ): Promise<void> {
    try {
      // Get routing rules for the workspace
      const rules = await this.getRoutingRules(workspaceId);

      // Find matching rules
      const matchingRules = rules.filter(rule => 
        this.ruleMatches(rule, routingResult)
      );

      if (matchingRules.length === 0) {
        this.logger.log('No matching routing rules found');
        return;
      }

      // Apply actions from matching rules (in order)
      for (const rule of matchingRules) {
        await this.applyRuleActions(conversationId, rule, routingResult);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error applying routing rules: ${err.message}`);
    }
  }

  /**
   * Check if a routing rule matches the routing result
   */
  private ruleMatches(rule: RoutingRule, result: RoutingResult): boolean {
    if (!rule.isActive) {
      return false;
    }

    const { conditions } = rule;

    // Check category match
    if (conditions.categories && !conditions.categories.includes(result.category)) {
      return false;
    }

    // Check intent match
    if (conditions.intents && !conditions.intents.includes(result.intent)) {
      return false;
    }

    // Check sentiment match
    if (conditions.sentiments && !conditions.sentiments.includes(result.sentiment)) {
      return false;
    }

    // Check priority match
    if (conditions.priorities && !conditions.priorities.includes(result.priority)) {
      return false;
    }

    return true;
  }

  /**
   * Apply actions from a routing rule
   */
  private async applyRuleActions(
    conversationId: string,
    rule: RoutingRule,
    routingResult: RoutingResult,
  ): Promise<void> {
    const { actions } = rule;
    const updates: any = {};

    // Set assignee
    if (actions.assignTo) {
      updates.assignedToId = actions.assignTo;
    } else if (routingResult.suggestedAssignee) {
      updates.assignedToId = routingResult.suggestedAssignee;
    }

    // Set priority
    if (actions.setPriority) {
      updates.priority = actions.setPriority;
    } else {
      updates.priority = routingResult.priority;
    }

    // Set sentiment
    updates.sentiment = routingResult.sentiment;

    // Add tags
    if (actions.addTags && actions.addTags.length > 0) {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { tags: true },
      });

      if (conversation) {
        updates.tags = [...new Set([...conversation.tags, ...actions.addTags])];
      }
    }

    // Update conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: updates,
    });

    this.logger.log(`Applied routing rule "${rule.name}" to conversation ${conversationId}`);
  }

  /**
   * Get routing rules for a workspace
   * 
   * In a real implementation, this would fetch from database.
   * For now, we return default rules.
   */
  private async getRoutingRules(workspaceId: string): Promise<RoutingRule[]> {
    // Default routing rules
    return [
      {
        id: 'urgent-rule',
        name: 'Urgent Messages',
        conditions: {
          categories: [MessageCategory.URGENT],
        },
        actions: {
          setPriority: Priority.URGENT,
          addTags: ['urgent'],
        },
        isActive: true,
        order: 1,
      },
      {
        id: 'complaint-rule',
        name: 'Complaints',
        conditions: {
          intents: [MessageIntent.COMPLAINT],
          sentiments: [Sentiment.NEGATIVE],
        },
        actions: {
          setPriority: Priority.HIGH,
          addTags: ['complaint', 'needs-attention'],
        },
        isActive: true,
        order: 2,
      },
      {
        id: 'sales-rule',
        name: 'Sales Inquiries',
        conditions: {
          categories: [MessageCategory.SALES],
          intents: [MessageIntent.SALES_INQUIRY],
        },
        actions: {
          addTags: ['sales', 'opportunity'],
        },
        isActive: true,
        order: 3,
      },
      {
        id: 'spam-rule',
        name: 'Spam Filter',
        conditions: {
          intents: [MessageIntent.SPAM],
          categories: [MessageCategory.SPAM],
        },
        actions: {
          setPriority: Priority.LOW,
          addTags: ['spam'],
        },
        isActive: true,
        order: 4,
      },
    ];
  }

  /**
   * Batch analyze multiple messages for routing
   */
  async batchAnalyze(
    workspaceId: string,
    messages: Array<{ conversationId: string; message: Message }>,
  ): Promise<Map<string, RoutingResult>> {
    const results = new Map<string, RoutingResult>();

    // Process in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(({ conversationId, message }) =>
          this.analyzeAndRoute(workspaceId, conversationId, message)
            .then(result => ({ conversationId, result }))
        )
      );

      batchResults.forEach(({ conversationId, result }) => {
        results.set(conversationId, result);
      });
    }

    return results;
  }
}
