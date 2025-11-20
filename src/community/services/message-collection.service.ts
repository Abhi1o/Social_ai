import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { Platform, ConversationType } from '@prisma/client';

/**
 * Interface for incoming messages from social platforms
 */
export interface IncomingMessage {
  platform: Platform;
  accountId: string;
  type: ConversationType;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  content: string;
  platformMessageId: string;
  sentiment?: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

/**
 * Service responsible for collecting messages from social platforms
 * and creating/updating conversations
 */
@Injectable()
export class MessageCollectionService {
  private readonly logger = new Logger(MessageCollectionService.name);

  constructor(
    private prisma: PrismaService,
    private conversationService: ConversationService,
    private messageService: MessageService,
  ) {}

  /**
   * Process an incoming message from a social platform
   * This is the main entry point for webhook handlers
   */
  async processIncomingMessage(
    workspaceId: string,
    incomingMessage: IncomingMessage,
  ): Promise<{ conversationId: string; messageId: string }> {
    this.logger.log(
      `Processing incoming message from ${incomingMessage.platform} for participant ${incomingMessage.participantId}`,
    );

    try {
      // Check if message already exists (deduplication)
      const existingMessage = await this.prisma.message.findFirst({
        where: {
          platformMessageId: incomingMessage.platformMessageId,
          conversation: {
            workspaceId,
          },
        },
      });

      if (existingMessage) {
        this.logger.debug(
          `Message ${incomingMessage.platformMessageId} already exists, skipping`,
        );
        return {
          conversationId: existingMessage.conversationId,
          messageId: existingMessage.id,
        };
      }

      // Find or create conversation
      const conversation = await this.conversationService.findOrCreate(
        workspaceId,
        incomingMessage.accountId,
        incomingMessage.platform,
        incomingMessage.participantId,
        {
          type: incomingMessage.type,
          participantName: incomingMessage.participantName,
          participantAvatar: incomingMessage.participantAvatar,
          platform: incomingMessage.platform,
          accountId: incomingMessage.accountId,
          participantId: incomingMessage.participantId,
        },
      );

      // Create the message
      const message = await this.messageService.create({
        conversationId: conversation.id,
        direction: 'INBOUND',
        content: incomingMessage.content,
        platformMessageId: incomingMessage.platformMessageId,
        sentiment: incomingMessage.sentiment,
        metadata: incomingMessage.metadata,
      });

      // Update conversation sentiment based on message sentiment
      if (incomingMessage.sentiment !== undefined) {
        await this.updateConversationSentiment(
          conversation.id,
          incomingMessage.sentiment,
        );
      }

      this.logger.log(
        `Successfully processed message ${message.id} in conversation ${conversation.id}`,
      );

      return {
        conversationId: conversation.id,
        messageId: message.id,
      };
    } catch (error) {
      this.logger.error(
        `Error processing incoming message: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Batch process multiple incoming messages
   */
  async processBatch(
    workspaceId: string,
    messages: IncomingMessage[],
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ message: IncomingMessage; error: string }>;
  }> {
    this.logger.log(`Processing batch of ${messages.length} messages`);

    let successful = 0;
    let failed = 0;
    const errors: Array<{ message: IncomingMessage; error: string }> = [];

    for (const message of messages) {
      try {
        await this.processIncomingMessage(workspaceId, message);
        successful++;
      } catch (error) {
        failed++;
        errors.push({
          message,
          error: error.message,
        });
      }
    }

    this.logger.log(
      `Batch processing complete: ${successful} successful, ${failed} failed`,
    );

    return { successful, failed, errors };
  }

  /**
   * Update conversation sentiment based on recent messages
   */
  private async updateConversationSentiment(
    conversationId: string,
    newSentiment: number,
  ): Promise<void> {
    // Get recent messages to calculate average sentiment
    const recentMessages = await this.prisma.message.findMany({
      where: {
        conversationId,
        sentiment: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (recentMessages.length === 0) {
      return;
    }

    // Calculate average sentiment
    const avgSentiment =
      recentMessages.reduce((sum, msg) => sum + (msg.sentiment || 0), 0) /
      recentMessages.length;

    // Determine sentiment category
    let sentimentCategory: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    if (avgSentiment > 0.2) {
      sentimentCategory = 'POSITIVE';
    } else if (avgSentiment < -0.2) {
      sentimentCategory = 'NEGATIVE';
    } else {
      sentimentCategory = 'NEUTRAL';
    }

    // Update conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { sentiment: sentimentCategory },
    });
  }

  /**
   * Sync messages for a specific social account
   * This would be called periodically to fetch new messages
   */
  async syncAccountMessages(
    workspaceId: string,
    accountId: string,
  ): Promise<{ synced: number; errors: number }> {
    this.logger.log(`Syncing messages for account ${accountId}`);

    // Get the social account
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        workspaceId,
      },
    });

    if (!account) {
      throw new Error('Social account not found');
    }

    // In a real implementation, this would:
    // 1. Call the platform API to fetch new messages
    // 2. Process each message through processIncomingMessage
    // 3. Return statistics

    // For now, return placeholder
    return { synced: 0, errors: 0 };
  }

  /**
   * Get collection statistics for a workspace
   */
  async getCollectionStats(workspaceId: string): Promise<{
    totalMessages: number;
    messagesLast24h: number;
    messagesByPlatform: Record<string, number>;
    avgResponseTime: number | null;
  }> {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalMessages, messagesLast24h, messagesByPlatform] =
      await Promise.all([
        this.prisma.message.count({
          where: {
            conversation: { workspaceId },
          },
        }),
        this.prisma.message.count({
          where: {
            conversation: { workspaceId },
            createdAt: { gte: last24h },
          },
        }),
        this.prisma.message.groupBy({
          by: ['conversationId'],
          where: {
            conversation: { workspaceId },
          },
          _count: true,
        }),
      ]);

    // Calculate average response time
    // This is a simplified calculation - in production you'd want more sophisticated logic
    const conversations = await this.prisma.conversation.findMany({
      where: { workspaceId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
      take: 100,
    });

    let totalResponseTime = 0;
    let responseCount = 0;

    for (const conv of conversations) {
      for (let i = 0; i < conv.messages.length - 1; i++) {
        const current = conv.messages[i];
        const next = conv.messages[i + 1];

        if (current.direction === 'INBOUND' && next.direction === 'OUTBOUND') {
          const responseTime =
            next.createdAt.getTime() - current.createdAt.getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      }
    }

    const avgResponseTime =
      responseCount > 0 ? totalResponseTime / responseCount / 1000 / 60 : null; // in minutes

    return {
      totalMessages,
      messagesLast24h,
      messagesByPlatform: {}, // Would be populated from actual data
      avgResponseTime,
    };
  }
}
