import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Conversation,
  ConversationStatus,
  Priority,
  Sentiment,
  Platform,
  Prisma,
} from '@prisma/client';

/**
 * Advanced filter configuration
 */
export interface InboxFilter {
  // Status filters
  status?: ConversationStatus | ConversationStatus[];
  priority?: Priority | Priority[];
  sentiment?: Sentiment | Sentiment[];

  // Assignment filters
  assignedTo?: string | string[];
  unassigned?: boolean;
  assignedToMe?: string; // userId

  // Platform filters
  platform?: Platform | Platform[];

  // Time filters
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;

  // Content filters
  participantName?: string;
  participantId?: string;
  messageContent?: string;
  tags?: string[];
  hasTag?: string;

  // Engagement filters
  hasUnreadMessages?: boolean;
  minMessages?: number;
  maxMessages?: number;

  // SLA filters
  slaOverdue?: boolean;
  slaDueSoon?: number; // minutes

  // Advanced
  customQuery?: Prisma.ConversationWhereInput;
}

/**
 * Saved filter configuration
 */
export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filter: InboxFilter;
  isDefault?: boolean;
  userId: string;
}

/**
 * Service for advanced inbox filtering and search
 */
@Injectable()
export class InboxFilterService {
  constructor(private prisma: PrismaService) {}

  /**
   * Apply filters to get conversations
   */
  async applyFilters(
    workspaceId: string,
    filter: InboxFilter,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    conversations: Conversation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where = this.buildWhereClause(workspaceId, filter);

    const [total, conversations] = await Promise.all([
      this.prisma.conversation.count({ where }),
      this.prisma.conversation.findMany({
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
      }),
    ]);

    return {
      conversations,
      total,
      page,
      limit,
    };
  }

  /**
   * Build Prisma where clause from filter
   */
  private buildWhereClause(
    workspaceId: string,
    filter: InboxFilter,
  ): Prisma.ConversationWhereInput {
    const where: Prisma.ConversationWhereInput = {
      workspaceId,
    };

    // Status filters
    if (filter.status) {
      where.status = Array.isArray(filter.status)
        ? { in: filter.status }
        : filter.status;
    }

    if (filter.priority) {
      where.priority = Array.isArray(filter.priority)
        ? { in: filter.priority }
        : filter.priority;
    }

    if (filter.sentiment) {
      where.sentiment = Array.isArray(filter.sentiment)
        ? { in: filter.sentiment }
        : filter.sentiment;
    }

    // Assignment filters
    if (filter.assignedTo) {
      where.assignedToId = Array.isArray(filter.assignedTo)
        ? { in: filter.assignedTo }
        : filter.assignedTo;
    }

    if (filter.unassigned) {
      where.assignedToId = null;
    }

    if (filter.assignedToMe) {
      where.assignedToId = filter.assignedToMe;
    }

    // Platform filters
    if (filter.platform) {
      where.platform = Array.isArray(filter.platform)
        ? { in: filter.platform }
        : filter.platform;
    }

    // Time filters
    if (filter.createdAfter || filter.createdBefore) {
      where.createdAt = {};
      if (filter.createdAfter) {
        where.createdAt.gte = filter.createdAfter;
      }
      if (filter.createdBefore) {
        where.createdAt.lte = filter.createdBefore;
      }
    }

    if (filter.updatedAfter || filter.updatedBefore) {
      where.updatedAt = {};
      if (filter.updatedAfter) {
        where.updatedAt.gte = filter.updatedAfter;
      }
      if (filter.updatedBefore) {
        where.updatedAt.lte = filter.updatedBefore;
      }
    }

    // Content filters
    if (filter.participantName) {
      where.participantName = {
        contains: filter.participantName,
        mode: 'insensitive',
      };
    }

    if (filter.participantId) {
      where.participantId = filter.participantId;
    }

    if (filter.messageContent) {
      where.messages = {
        some: {
          content: {
            contains: filter.messageContent,
            mode: 'insensitive',
          },
        },
      };
    }

    if (filter.tags && filter.tags.length > 0) {
      where.tags = {
        hasEvery: filter.tags,
      };
    }

    if (filter.hasTag) {
      where.tags = {
        has: filter.hasTag,
      };
    }

    // Engagement filters
    if (filter.minMessages !== undefined || filter.maxMessages !== undefined) {
      where.messages = where.messages || {};
      if (filter.minMessages !== undefined) {
        // This is tricky with Prisma - would need a raw query or post-filter
        // For now, we'll skip this in the where clause
      }
    }

    // SLA filters
    if (filter.slaOverdue) {
      where.slaDeadline = {
        lt: new Date(),
      };
    }

    if (filter.slaDueSoon) {
      const dueTime = new Date(Date.now() + filter.slaDueSoon * 60 * 1000);
      where.slaDeadline = {
        lte: dueTime,
        gte: new Date(),
      };
    }

    // Custom query
    if (filter.customQuery) {
      Object.assign(where, filter.customQuery);
    }

    return where;
  }

  /**
   * Search conversations with full-text search
   */
  async search(
    workspaceId: string,
    query: string,
    limit: number = 50,
  ): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: {
        workspaceId,
        OR: [
          {
            participantName: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            participantId: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            messages: {
              some: {
                content: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            tags: {
              has: query,
            },
          },
        ],
      },
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
      take: limit,
    });
  }

  /**
   * Get quick filter presets
   */
  getQuickFilters(): Record<string, InboxFilter> {
    return {
      unread: {
        hasUnreadMessages: true,
      },
      urgent: {
        priority: 'URGENT',
        status: 'OPEN',
      },
      needsResponse: {
        status: 'OPEN',
        unassigned: false,
      },
      negative: {
        sentiment: 'NEGATIVE',
        status: ['OPEN', 'PENDING'],
      },
      slaOverdue: {
        slaOverdue: true,
      },
      assignedToMe: {
        // userId would be passed dynamically
        status: ['OPEN', 'PENDING'],
      },
      resolved: {
        status: 'RESOLVED',
      },
      archived: {
        status: 'ARCHIVED',
      },
    };
  }

  /**
   * Get filter suggestions based on workspace data
   */
  async getFilterSuggestions(workspaceId: string): Promise<{
    platforms: Platform[];
    tags: string[];
    assignees: Array<{ id: string; name: string }>;
    statusCounts: Record<ConversationStatus, number>;
    priorityCounts: Record<Priority, number>;
    sentimentCounts: Record<Sentiment, number>;
  }> {
    const [
      platforms,
      tags,
      assignees,
      statusGroups,
      priorityGroups,
      sentimentGroups,
    ] = await Promise.all([
      // Get unique platforms
      this.prisma.conversation
        .findMany({
          where: { workspaceId },
          select: { platform: true },
          distinct: ['platform'],
        })
        .then((results) => results.map((r) => r.platform)),

      // Get all unique tags
      this.prisma.conversation
        .findMany({
          where: { workspaceId },
          select: { tags: true },
        })
        .then((results) => {
          const allTags = results.flatMap((r) => r.tags);
          return Array.from(new Set(allTags));
        }),

      // Get assignees
      this.prisma.conversation
        .findMany({
          where: {
            workspaceId,
            assignedToId: { not: null },
          },
          select: {
            assignedTo: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          distinct: ['assignedToId'],
        })
        .then((results) =>
          results
            .filter((r) => r.assignedTo)
            .map((r) => r.assignedTo as { id: string; name: string }),
        ),

      // Get status counts
      this.prisma.conversation.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: true,
      }),

      // Get priority counts
      this.prisma.conversation.groupBy({
        by: ['priority'],
        where: { workspaceId },
        _count: true,
      }),

      // Get sentiment counts
      this.prisma.conversation.groupBy({
        by: ['sentiment'],
        where: { workspaceId },
        _count: true,
      }),
    ]);

    return {
      platforms,
      tags,
      assignees,
      statusCounts: statusGroups.reduce(
        (acc, item) => ({
          ...acc,
          [item.status]: item._count,
        }),
        {} as Record<ConversationStatus, number>,
      ),
      priorityCounts: priorityGroups.reduce(
        (acc, item) => ({
          ...acc,
          [item.priority]: item._count,
        }),
        {} as Record<Priority, number>,
      ),
      sentimentCounts: sentimentGroups.reduce(
        (acc, item) => ({
          ...acc,
          [item.sentiment]: item._count,
        }),
        {} as Record<Sentiment, number>,
      ),
    };
  }

  /**
   * Validate filter configuration
   */
  validateFilter(filter: InboxFilter): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check date ranges
    if (filter.createdAfter && filter.createdBefore) {
      if (filter.createdAfter > filter.createdBefore) {
        errors.push('createdAfter must be before createdBefore');
      }
    }

    if (filter.updatedAfter && filter.updatedBefore) {
      if (filter.updatedAfter > filter.updatedBefore) {
        errors.push('updatedAfter must be before updatedBefore');
      }
    }

    // Check message count ranges
    if (
      filter.minMessages !== undefined &&
      filter.maxMessages !== undefined
    ) {
      if (filter.minMessages > filter.maxMessages) {
        errors.push('minMessages must be less than maxMessages');
      }
    }

    // Check conflicting filters
    if (filter.unassigned && filter.assignedTo) {
      errors.push('Cannot filter for both unassigned and assignedTo');
    }

    if (filter.unassigned && filter.assignedToMe) {
      errors.push('Cannot filter for both unassigned and assignedToMe');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
