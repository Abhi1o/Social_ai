import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { UpdateConversationDto } from '../dto/update-conversation.dto';
import { QueryConversationsDto } from '../dto/query-conversations.dto';
import { Conversation, Prisma } from '@prisma/client';
import { SLAService } from './sla.service';

@Injectable()
export class ConversationService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SLAService))
    private slaService: SLAService,
  ) {}

  /**
   * Create a new conversation
   */
  async create(
    workspaceId: string,
    createConversationDto: CreateConversationDto,
  ): Promise<Conversation> {
    const conversation = await this.prisma.conversation.create({
      data: {
        workspaceId,
        ...createConversationDto,
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
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Start SLA tracking for the conversation
    try {
      await this.slaService.startTracking(conversation);
    } catch (error) {
      // Log error but don't fail conversation creation
      console.error('Failed to start SLA tracking:', error);
    }

    return conversation;
  }

  /**
   * Find or create a conversation based on platform and participant
   */
  async findOrCreate(
    workspaceId: string,
    accountId: string,
    platform: string,
    participantId: string,
    createData: Partial<CreateConversationDto>,
  ): Promise<Conversation> {
    // Try to find existing conversation
    const existing = await this.prisma.conversation.findFirst({
      where: {
        workspaceId,
        accountId,
        platform: platform as any,
        participantId,
        status: {
          not: 'ARCHIVED',
        },
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
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Create new conversation
    return this.create(workspaceId, {
      accountId,
      platform: platform as any,
      participantId,
      ...createData,
    } as CreateConversationDto);
  }

  /**
   * Query conversations with filters and pagination
   */
  async query(
    workspaceId: string,
    queryDto: QueryConversationsDto,
  ): Promise<{
    conversations: Conversation[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
  }> {
    const {
      status,
      priority,
      sentiment,
      assignedTo,
      platform,
      unreadOnly,
      search,
      page = 1,
      limit = 20,
    } = queryDto;

    // Build where clause
    const where: Prisma.ConversationWhereInput = {
      workspaceId,
    };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (sentiment) {
      where.sentiment = sentiment;
    }

    if (assignedTo) {
      where.assignedToId = assignedTo;
    }

    if (platform) {
      where.platform = platform;
    }

    if (search) {
      where.OR = [
        { participantName: { contains: search, mode: 'insensitive' } },
        { participantId: { contains: search, mode: 'insensitive' } },
        {
          messages: {
            some: {
              content: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    // Get total count
    const total = await this.prisma.conversation.count({ where });

    // Get unread count (conversations with unread messages)
    const unreadCount = await this.prisma.conversation.count({
      where: {
        ...where,
        messages: {
          some: {
            direction: 'INBOUND',
            // In a real implementation, you'd track read status
          },
        },
      },
    });

    // Get paginated conversations
    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            platform: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
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
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      conversations,
      total,
      unreadCount,
      page,
      limit,
    };
  }

  /**
   * Get a single conversation by ID
   */
  async findOne(
    workspaceId: string,
    conversationId: string,
  ): Promise<Conversation> {
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
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * Update a conversation
   */
  async update(
    workspaceId: string,
    conversationId: string,
    updateDto: UpdateConversationDto,
  ): Promise<Conversation> {
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

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: updateDto,
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
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Assign conversation to a user
   */
  async assign(
    workspaceId: string,
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    return this.update(workspaceId, conversationId, {
      assignedToId: userId,
    });
  }

  /**
   * Archive a conversation
   */
  async archive(
    workspaceId: string,
    conversationId: string,
  ): Promise<Conversation> {
    return this.update(workspaceId, conversationId, {
      status: 'ARCHIVED',
    });
  }

  /**
   * Get conversation statistics for a workspace
   */
  async getStats(workspaceId: string): Promise<{
    total: number;
    open: number;
    pending: number;
    resolved: number;
    byPriority: Record<string, number>;
    bySentiment: Record<string, number>;
    byPlatform: Record<string, number>;
  }> {
    const [
      total,
      open,
      pending,
      resolved,
      byPriority,
      bySentiment,
      byPlatform,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: { workspaceId } }),
      this.prisma.conversation.count({
        where: { workspaceId, status: 'OPEN' },
      }),
      this.prisma.conversation.count({
        where: { workspaceId, status: 'PENDING' },
      }),
      this.prisma.conversation.count({
        where: { workspaceId, status: 'RESOLVED' },
      }),
      this.prisma.conversation.groupBy({
        by: ['priority'],
        where: { workspaceId },
        _count: true,
      }),
      this.prisma.conversation.groupBy({
        by: ['sentiment'],
        where: { workspaceId },
        _count: true,
      }),
      this.prisma.conversation.groupBy({
        by: ['platform'],
        where: { workspaceId },
        _count: true,
      }),
    ]);

    return {
      total,
      open,
      pending,
      resolved,
      byPriority: byPriority.reduce(
        (acc, item) => ({
          ...acc,
          [item.priority]: item._count,
        }),
        {},
      ),
      bySentiment: bySentiment.reduce(
        (acc, item) => ({
          ...acc,
          [item.sentiment]: item._count,
        }),
        {},
      ),
      byPlatform: byPlatform.reduce(
        (acc, item) => ({
          ...acc,
          [item.platform]: item._count,
        }),
        {},
      ),
    };
  }
}
