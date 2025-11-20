import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FlowExecutionContext } from '../interfaces/flow-node.interface';

@Injectable()
export class ChatbotSessionService {
  private readonly logger = new Logger(ChatbotSessionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create or get existing chatbot session
   */
  async getOrCreateSession(
    chatbotId: string,
    conversationId: string,
  ): Promise<{
    id: string;
    context: FlowExecutionContext;
  }> {
    // Try to find active session
    let session = await this.prisma.chatbotSession.findFirst({
      where: {
        chatbotId,
        conversationId,
        isActive: true,
      },
    });

    // Create new session if none exists
    if (!session) {
      session = await this.prisma.chatbotSession.create({
        data: {
          chatbotId,
          conversationId,
          currentContext: [],
          variables: {},
          isActive: true,
        },
      });
    }

    // Build execution context
    const context: FlowExecutionContext = {
      sessionId: session.id,
      variables: (session.variables as Record<string, any>) || {},
      contexts: session.currentContext || [],
      currentNode: 'start',
      visitedNodes: [],
    };

    return {
      id: session.id,
      context,
    };
  }

  /**
   * Update session with new context
   */
  async updateSession(
    sessionId: string,
    context: FlowExecutionContext,
  ): Promise<void> {
    await this.prisma.chatbotSession.update({
      where: { id: sessionId },
      data: {
        currentContext: context.contexts,
        variables: context.variables,
        lastActivityAt: new Date(),
      },
    });
  }

  /**
   * Increment session counters
   */
  async incrementCounters(
    sessionId: string,
    type: 'message' | 'intent' | 'fallback',
  ): Promise<void> {
    const updateData: any = {
      lastActivityAt: new Date(),
    };

    switch (type) {
      case 'message':
        updateData.messageCount = { increment: 1 };
        break;
      case 'intent':
        updateData.intentMatches = { increment: 1 };
        break;
      case 'fallback':
        updateData.fallbackCount = { increment: 1 };
        break;
    }

    await this.prisma.chatbotSession.update({
      where: { id: sessionId },
      data: updateData,
    });
  }

  /**
   * End a chatbot session
   */
  async endSession(sessionId: string): Promise<void> {
    await this.prisma.chatbotSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });
  }

  /**
   * Clean up inactive sessions (older than 24 hours)
   */
  async cleanupInactiveSessions(): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.prisma.chatbotSession.updateMany({
      where: {
        isActive: true,
        lastActivityAt: {
          lt: oneDayAgo,
        },
      },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });

    this.logger.log(`Cleaned up ${result.count} inactive sessions`);
    return result.count;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(chatbotId: string, days: number = 7): Promise<{
    totalSessions: number;
    activeSessions: number;
    avgMessagesPerSession: number;
    avgIntentMatchRate: number;
    avgFallbackRate: number;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const sessions = await this.prisma.chatbotSession.findMany({
      where: {
        chatbotId,
        startedAt: {
          gte: startDate,
        },
      },
    });

    const activeSessions = sessions.filter((s) => s.isActive).length;
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const totalIntents = sessions.reduce((sum, s) => sum + s.intentMatches, 0);
    const totalFallbacks = sessions.reduce((sum, s) => sum + s.fallbackCount, 0);

    return {
      totalSessions: sessions.length,
      activeSessions,
      avgMessagesPerSession: sessions.length > 0 ? totalMessages / sessions.length : 0,
      avgIntentMatchRate: totalMessages > 0 ? (totalIntents / totalMessages) * 100 : 0,
      avgFallbackRate: totalMessages > 0 ? (totalFallbacks / totalMessages) * 100 : 0,
    };
  }
}
