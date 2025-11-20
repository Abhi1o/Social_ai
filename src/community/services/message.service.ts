import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMessageDto } from '../dto/create-message.dto';
import { Message } from '@prisma/client';
import { SLAService } from './sla.service';

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SLAService))
    private slaService: SLAService,
  ) {}

  /**
   * Reply using a saved template
   */
  async replyWithTemplate(
    conversationId: string,
    workspaceId: string,
    templateId: string,
    variables: Record<string, string>,
    authorId: string,
  ): Promise<Message> {
    // Verify conversation belongs to workspace
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Get the template
    const template = await this.prisma.savedReply.findFirst({
      where: {
        id: templateId,
        workspaceId,
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Substitute variables
    let content = template.content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      content = content.replace(regex, value);
    }

    // Update template usage
    await this.prisma.savedReply.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    // Create the message
    const message = await this.create({
      conversationId,
      direction: 'OUTBOUND',
      content,
      platformMessageId: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      authorId,
      aiGenerated: false,
      templateId,
    });

    // Update conversation status if it was resolved
    if (conversation.status === 'RESOLVED') {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'OPEN' },
      });
    }

    return message;
  }

  /**
   * Create a new message in a conversation
   */
  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    const message = await this.prisma.message.create({
      data: createMessageDto,
    });

    // Update conversation's updatedAt timestamp
    await this.prisma.conversation.update({
      where: { id: createMessageDto.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  /**
   * Get all messages for a conversation
   */
  async findByConversation(
    conversationId: string,
    workspaceId: string,
  ): Promise<Message[]> {
    // Verify conversation belongs to workspace
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get a single message by ID
   */
  async findOne(messageId: string, workspaceId: string): Promise<Message> {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: {
          workspaceId,
        },
      },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  /**
   * Create a reply message
   */
  async reply(
    conversationId: string,
    workspaceId: string,
    content: string,
    authorId: string,
    aiGenerated: boolean = false,
  ): Promise<Message> {
    // Verify conversation belongs to workspace
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
      },
      include: {
        account: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Create the message
    const message = await this.create({
      conversationId,
      direction: 'OUTBOUND',
      content,
      platformMessageId: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      authorId,
      aiGenerated,
    });

    // Update conversation status if it was resolved
    if (conversation.status === 'RESOLVED') {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'OPEN' },
      });
    }

    // Record first response for SLA tracking
    try {
      await this.slaService.recordFirstResponse(conversationId);
    } catch (error) {
      // Log error but don't fail message creation
      console.error('Failed to record first response for SLA:', error);
    }

    return message;
  }

  /**
   * Get message statistics for a conversation
   */
  async getConversationStats(conversationId: string): Promise<{
    total: number;
    inbound: number;
    outbound: number;
    avgSentiment: number | null;
    aiGenerated: number;
  }> {
    const [total, inbound, outbound, sentimentData, aiGenerated] =
      await Promise.all([
        this.prisma.message.count({ where: { conversationId } }),
        this.prisma.message.count({
          where: { conversationId, direction: 'INBOUND' },
        }),
        this.prisma.message.count({
          where: { conversationId, direction: 'OUTBOUND' },
        }),
        this.prisma.message.aggregate({
          where: {
            conversationId,
            sentiment: { not: null },
          },
          _avg: {
            sentiment: true,
          },
        }),
        this.prisma.message.count({
          where: { conversationId, aiGenerated: true },
        }),
      ]);

    return {
      total,
      inbound,
      outbound,
      avgSentiment: sentimentData._avg.sentiment,
      aiGenerated,
    };
  }

  /**
   * Search messages across conversations
   */
  async search(
    workspaceId: string,
    query: string,
    limit: number = 50,
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: {
        conversation: {
          workspaceId,
        },
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        conversation: {
          select: {
            id: true,
            participantName: true,
            platform: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
