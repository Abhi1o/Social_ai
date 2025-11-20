import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Conversation, Message } from '@prisma/client';

/**
 * Service responsible for managing conversation threading logic
 * Handles grouping messages into conversations and maintaining thread context
 */
@Injectable()
export class ConversationThreadingService {
  private readonly logger = new Logger(ConversationThreadingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get a threaded view of a conversation with context
   */
  async getThreadedConversation(
    conversationId: string,
    workspaceId: string,
  ): Promise<{
    conversation: Conversation;
    messages: Message[];
    context: {
      totalMessages: number;
      firstMessageAt: Date;
      lastMessageAt: Date;
      responseRate: number;
      avgResponseTime: number | null;
    };
  }> {
    // Get conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
      },
      include: {
        account: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get all messages in thread
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate context
    const context = await this.calculateThreadContext(messages);

    return {
      conversation,
      messages,
      context,
    };
  }

  /**
   * Calculate context information for a thread
   */
  private async calculateThreadContext(messages: Message[]): Promise<{
    totalMessages: number;
    firstMessageAt: Date;
    lastMessageAt: Date;
    responseRate: number;
    avgResponseTime: number | null;
  }> {
    if (messages.length === 0) {
      return {
        totalMessages: 0,
        firstMessageAt: new Date(),
        lastMessageAt: new Date(),
        responseRate: 0,
        avgResponseTime: null,
      };
    }

    const firstMessageAt = messages[0].createdAt;
    const lastMessageAt = messages[messages.length - 1].createdAt;

    // Calculate response rate (% of inbound messages that got a response)
    let inboundCount = 0;
    let respondedCount = 0;

    for (let i = 0; i < messages.length; i++) {
      if (messages[i].direction === 'INBOUND') {
        inboundCount++;

        // Check if there's an outbound message after this
        const hasResponse = messages
          .slice(i + 1)
          .some((m) => m.direction === 'OUTBOUND');
        if (hasResponse) {
          respondedCount++;
        }
      }
    }

    const responseRate = inboundCount > 0 ? respondedCount / inboundCount : 0;

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 0; i < messages.length - 1; i++) {
      const current = messages[i];
      const next = messages[i + 1];

      if (current.direction === 'INBOUND' && next.direction === 'OUTBOUND') {
        const responseTime =
          next.createdAt.getTime() - current.createdAt.getTime();
        totalResponseTime += responseTime;
        responseCount++;
      }
    }

    const avgResponseTime =
      responseCount > 0
        ? totalResponseTime / responseCount / 1000 / 60 // in minutes
        : null;

    return {
      totalMessages: messages.length,
      firstMessageAt,
      lastMessageAt,
      responseRate,
      avgResponseTime,
    };
  }

  /**
   * Merge two conversations into one
   * Useful when duplicate conversations are detected
   */
  async mergeConversations(
    workspaceId: string,
    primaryConversationId: string,
    secondaryConversationId: string,
  ): Promise<Conversation> {
    this.logger.log(
      `Merging conversation ${secondaryConversationId} into ${primaryConversationId}`,
    );

    // Verify both conversations belong to workspace
    const [primary, secondary] = await Promise.all([
      this.prisma.conversation.findFirst({
        where: { id: primaryConversationId, workspaceId },
      }),
      this.prisma.conversation.findFirst({
        where: { id: secondaryConversationId, workspaceId },
      }),
    ]);

    if (!primary || !secondary) {
      throw new Error('One or both conversations not found');
    }

    // Move all messages from secondary to primary
    await this.prisma.message.updateMany({
      where: { conversationId: secondaryConversationId },
      data: { conversationId: primaryConversationId },
    });

    // Merge tags
    const mergedTags = Array.from(
      new Set([...primary.tags, ...secondary.tags]),
    );

    // Update primary conversation
    const updated = await this.prisma.conversation.update({
      where: { id: primaryConversationId },
      data: {
        tags: mergedTags,
        updatedAt: new Date(),
      },
      include: {
        account: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Delete secondary conversation
    await this.prisma.conversation.delete({
      where: { id: secondaryConversationId },
    });

    this.logger.log(`Successfully merged conversations`);

    return updated;
  }

  /**
   * Split a conversation into two separate threads
   * Useful when a conversation diverges into different topics
   */
  async splitConversation(
    workspaceId: string,
    conversationId: string,
    splitAtMessageId: string,
  ): Promise<{ original: Conversation; new: Conversation }> {
    this.logger.log(
      `Splitting conversation ${conversationId} at message ${splitAtMessageId}`,
    );

    // Get the original conversation
    const original = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!original) {
      throw new Error('Conversation not found');
    }

    // Find the split point
    const splitIndex = original.messages.findIndex(
      (m) => m.id === splitAtMessageId,
    );

    if (splitIndex === -1) {
      throw new Error('Split message not found in conversation');
    }

    // Create new conversation with same properties
    const newConversation = await this.prisma.conversation.create({
      data: {
        workspaceId: original.workspaceId,
        accountId: original.accountId,
        platform: original.platform,
        type: original.type,
        participantId: original.participantId,
        participantName: original.participantName,
        participantAvatar: original.participantAvatar,
        status: original.status,
        priority: original.priority,
        sentiment: original.sentiment,
        assignedToId: original.assignedToId,
        tags: original.tags,
      },
    });

    // Move messages after split point to new conversation
    const messagesToMove = original.messages.slice(splitIndex);
    await Promise.all(
      messagesToMove.map((message) =>
        this.prisma.message.update({
          where: { id: message.id },
          data: { conversationId: newConversation.id },
        }),
      ),
    );

    // Fetch updated conversations
    const [updatedOriginal, updatedNew] = await Promise.all([
      this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          account: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.conversation.findUnique({
        where: { id: newConversation.id },
        include: {
          account: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    this.logger.log(`Successfully split conversation`);

    return {
      original: updatedOriginal!,
      new: updatedNew!,
    };
  }

  /**
   * Get related conversations for a participant
   * Useful for showing conversation history with the same person
   */
  async getRelatedConversations(
    workspaceId: string,
    participantId: string,
    currentConversationId?: string,
    limit: number = 10,
  ): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: {
        workspaceId,
        participantId,
        id: currentConversationId ? { not: currentConversationId } : undefined,
      },
      include: {
        account: {
          select: {
            id: true,
            platform: true,
            username: true,
            displayName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Auto-thread messages based on time proximity and content similarity
   * This is useful for platforms that don't provide explicit threading
   */
  async autoThreadMessages(
    workspaceId: string,
    accountId: string,
    participantId: string,
    timeWindowMinutes: number = 60,
  ): Promise<{ threaded: number; conversations: number }> {
    this.logger.log(
      `Auto-threading messages for participant ${participantId} with ${timeWindowMinutes}min window`,
    );

    // Get all conversations for this participant
    const conversations = await this.prisma.conversation.findMany({
      where: {
        workspaceId,
        accountId,
        participantId,
        status: { not: 'ARCHIVED' },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (conversations.length <= 1) {
      return { threaded: 0, conversations: conversations.length };
    }

    // Group conversations that should be merged based on time proximity
    const timeWindow = timeWindowMinutes * 60 * 1000;
    const toMerge: string[][] = [];

    for (let i = 0; i < conversations.length - 1; i++) {
      const current = conversations[i];
      const next = conversations[i + 1];

      if (current.messages.length === 0 || next.messages.length === 0) {
        continue;
      }

      const timeDiff =
        current.messages[0].createdAt.getTime() -
        next.messages[0].createdAt.getTime();

      if (Math.abs(timeDiff) <= timeWindow) {
        // These conversations should be merged
        const group = toMerge.find(
          (g) => g.includes(current.id) || g.includes(next.id),
        );
        if (group) {
          if (!group.includes(current.id)) group.push(current.id);
          if (!group.includes(next.id)) group.push(next.id);
        } else {
          toMerge.push([current.id, next.id]);
        }
      }
    }

    // Merge grouped conversations
    let threaded = 0;
    for (const group of toMerge) {
      if (group.length > 1) {
        const primary = group[0];
        for (let i = 1; i < group.length; i++) {
          await this.mergeConversations(workspaceId, primary, group[i]);
          threaded++;
        }
      }
    }

    this.logger.log(
      `Auto-threading complete: merged ${threaded} conversations`,
    );

    return {
      threaded,
      conversations: conversations.length - threaded,
    };
  }
}
