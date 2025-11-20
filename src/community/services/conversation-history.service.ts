import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationHistory } from '@prisma/client';

@Injectable()
export class ConversationHistoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Track a change in conversation
   */
  async trackChange(
    conversationId: string,
    field: string,
    oldValue: string | null,
    newValue: string | null,
    changedBy: string,
    notes?: string,
  ): Promise<ConversationHistory> {
    return this.prisma.conversationHistory.create({
      data: {
        conversationId,
        field,
        oldValue,
        newValue,
        changedBy,
        notes,
      },
    });
  }

  /**
   * Get history for a conversation
   */
  async getHistory(conversationId: string): Promise<ConversationHistory[]> {
    return this.prisma.conversationHistory.findMany({
      where: { conversationId },
      orderBy: { changedAt: 'desc' },
    });
  }

  /**
   * Track status change
   */
  async trackStatusChange(
    conversationId: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string,
    notes?: string,
  ): Promise<ConversationHistory> {
    return this.trackChange(
      conversationId,
      'status',
      oldStatus,
      newStatus,
      changedBy,
      notes,
    );
  }

  /**
   * Track priority change
   */
  async trackPriorityChange(
    conversationId: string,
    oldPriority: string,
    newPriority: string,
    changedBy: string,
    notes?: string,
  ): Promise<ConversationHistory> {
    return this.trackChange(
      conversationId,
      'priority',
      oldPriority,
      newPriority,
      changedBy,
      notes,
    );
  }

  /**
   * Track assignment change
   */
  async trackAssignmentChange(
    conversationId: string,
    oldAssignee: string | null,
    newAssignee: string | null,
    changedBy: string,
    notes?: string,
  ): Promise<ConversationHistory> {
    return this.trackChange(
      conversationId,
      'assignedTo',
      oldAssignee,
      newAssignee,
      changedBy,
      notes,
    );
  }

  /**
   * Get activity summary for a conversation
   */
  async getActivitySummary(conversationId: string): Promise<{
    totalChanges: number;
    statusChanges: number;
    priorityChanges: number;
    assignmentChanges: number;
    lastActivity: Date | null;
  }> {
    const history = await this.getHistory(conversationId);

    return {
      totalChanges: history.length,
      statusChanges: history.filter((h) => h.field === 'status').length,
      priorityChanges: history.filter((h) => h.field === 'priority').length,
      assignmentChanges: history.filter((h) => h.field === 'assignedTo')
        .length,
      lastActivity: history.length > 0 ? history[0].changedAt : null,
    };
  }
}
