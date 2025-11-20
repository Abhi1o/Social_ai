import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ChatbotAnalyticsService {
  private readonly logger = new Logger(ChatbotAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Record a chatbot interaction
   */
  async recordInteraction(
    sessionId: string,
    userMessage: string,
    detectedIntent: string | null,
    confidence: number | null,
    extractedEntities: any,
    botResponse: string,
    responseType: string,
    flowId: string | null,
    nodeId: string | null,
    processingTime: number,
  ): Promise<void> {
    await this.prisma.chatbotInteraction.create({
      data: {
        sessionId,
        userMessage,
        detectedIntent,
        confidence,
        extractedEntities,
        botResponse,
        responseType: responseType as any,
        flowId,
        nodeId,
        processingTime,
      },
    });
  }

  /**
   * Get chatbot analytics for a specific date
   */
  async getAnalytics(chatbotId: string, date: Date): Promise<any> {
    const analytics = await this.prisma.chatbotAnalytics.findUnique({
      where: {
        chatbotId_date: {
          chatbotId,
          date,
        },
      },
    });

    return analytics;
  }

  /**
   * Get analytics for a date range
   */
  async getAnalyticsRange(
    chatbotId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return this.prisma.chatbotAnalytics.findMany({
      where: {
        chatbotId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Calculate and store daily analytics
   * Runs daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async calculateDailyAnalytics(): Promise<void> {
    this.logger.log('Starting daily chatbot analytics calculation');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    // Get all active chatbots
    const chatbots = await this.prisma.chatbot.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const chatbot of chatbots) {
      try {
        await this.calculateAnalyticsForChatbot(chatbot.id, yesterday, today);
      } catch (error) {
        this.logger.error(
          `Failed to calculate analytics for chatbot ${chatbot.id}`,
          error,
        );
      }
    }

    this.logger.log('Completed daily chatbot analytics calculation');
  }

  /**
   * Calculate analytics for a specific chatbot and date
   */
  private async calculateAnalyticsForChatbot(
    chatbotId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    // Get all sessions for the date
    const sessions = await this.prisma.chatbotSession.findMany({
      where: {
        chatbotId,
        startedAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        interactions: true,
      },
    });

    if (sessions.length === 0) {
      return;
    }

    // Calculate metrics
    const totalSessions = sessions.length;
    const totalInteractions = sessions.reduce(
      (sum, s) => sum + s.interactions.length,
      0,
    );
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);

    // Calculate confidence scores
    const confidenceScores = sessions
      .flatMap((s) => s.interactions)
      .map((i) => i.confidence)
      .filter((c): c is number => c !== null);

    const avgConfidence =
      confidenceScores.length > 0
        ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length
        : 0;

    // Calculate rates
    const totalIntentMatches = sessions.reduce(
      (sum, s) => sum + s.intentMatches,
      0,
    );
    const totalFallbacks = sessions.reduce((sum, s) => sum + s.fallbackCount, 0);

    const intentMatchRate =
      totalMessages > 0 ? (totalIntentMatches / totalMessages) * 100 : 0;
    const fallbackRate =
      totalMessages > 0 ? (totalFallbacks / totalMessages) * 100 : 0;

    // Calculate handoff rate
    const handoffInteractions = sessions
      .flatMap((s) => s.interactions)
      .filter((i) => i.responseType === 'HANDOFF').length;
    const handoffRate =
      totalInteractions > 0 ? (handoffInteractions / totalInteractions) * 100 : 0;

    // Calculate session length
    const avgSessionLength =
      totalSessions > 0 ? totalMessages / totalSessions : 0;

    // Calculate response time
    const responseTimes = sessions
      .flatMap((s) => s.interactions)
      .map((i) => i.processingTime)
      .filter((t): t is number => t !== null);

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
        : 0;

    // Get top intents
    const intentCounts: Record<string, number> = {};
    sessions.flatMap((s) => s.interactions).forEach((i) => {
      if (i.detectedIntent) {
        intentCounts[i.detectedIntent] = (intentCounts[i.detectedIntent] || 0) + 1;
      }
    });

    const topIntents = Object.entries(intentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([intent, count]) => ({ intent, count }));

    // Upsert analytics record
    await this.prisma.chatbotAnalytics.upsert({
      where: {
        chatbotId_date: {
          chatbotId,
          date: startDate,
        },
      },
      create: {
        chatbotId,
        date: startDate,
        totalSessions,
        totalInteractions,
        totalMessages,
        avgConfidence,
        intentMatchRate,
        fallbackRate,
        handoffRate,
        avgSessionLength,
        avgResponseTime,
        topIntents,
      },
      update: {
        totalSessions,
        totalInteractions,
        totalMessages,
        avgConfidence,
        intentMatchRate,
        fallbackRate,
        handoffRate,
        avgSessionLength,
        avgResponseTime,
        topIntents,
      },
    });

    this.logger.log(
      `Calculated analytics for chatbot ${chatbotId} on ${startDate.toISOString()}`,
    );
  }

  /**
   * Get chatbot performance summary
   */
  async getPerformanceSummary(
    chatbotId: string,
    days: number = 30,
  ): Promise<{
    totalSessions: number;
    totalInteractions: number;
    avgConfidence: number;
    intentMatchRate: number;
    fallbackRate: number;
    handoffRate: number;
    avgSessionLength: number;
    avgResponseTime: number;
    topIntents: Array<{ intent: string; count: number }>;
    trend: {
      sessions: number;
      interactions: number;
      confidence: number;
    };
  }> {
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const analytics = await this.getAnalyticsRange(chatbotId, startDate, endDate);

    if (analytics.length === 0) {
      return {
        totalSessions: 0,
        totalInteractions: 0,
        avgConfidence: 0,
        intentMatchRate: 0,
        fallbackRate: 0,
        handoffRate: 0,
        avgSessionLength: 0,
        avgResponseTime: 0,
        topIntents: [],
        trend: {
          sessions: 0,
          interactions: 0,
          confidence: 0,
        },
      };
    }

    // Aggregate metrics
    const totalSessions = analytics.reduce((sum, a) => sum + a.totalSessions, 0);
    const totalInteractions = analytics.reduce(
      (sum, a) => sum + a.totalInteractions,
      0,
    );

    const avgConfidence =
      analytics.reduce((sum, a) => sum + a.avgConfidence, 0) / analytics.length;
    const intentMatchRate =
      analytics.reduce((sum, a) => sum + a.intentMatchRate, 0) / analytics.length;
    const fallbackRate =
      analytics.reduce((sum, a) => sum + a.fallbackRate, 0) / analytics.length;
    const handoffRate =
      analytics.reduce((sum, a) => sum + a.handoffRate, 0) / analytics.length;
    const avgSessionLength =
      analytics.reduce((sum, a) => sum + a.avgSessionLength, 0) / analytics.length;
    const avgResponseTime =
      analytics.reduce((sum, a) => sum + a.avgResponseTime, 0) / analytics.length;

    // Aggregate top intents
    const intentCounts: Record<string, number> = {};
    analytics.forEach((a) => {
      const topIntents = a.topIntents as Array<{ intent: string; count: number }>;
      topIntents?.forEach(({ intent, count }) => {
        intentCounts[intent] = (intentCounts[intent] || 0) + count;
      });
    });

    const topIntents = Object.entries(intentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([intent, count]) => ({ intent, count }));

    // Calculate trends (compare first half vs second half)
    const midpoint = Math.floor(analytics.length / 2);
    const firstHalf = analytics.slice(0, midpoint);
    const secondHalf = analytics.slice(midpoint);

    const firstHalfSessions = firstHalf.reduce((sum, a) => sum + a.totalSessions, 0);
    const secondHalfSessions = secondHalf.reduce(
      (sum, a) => sum + a.totalSessions,
      0,
    );
    const sessionsTrend =
      firstHalfSessions > 0
        ? ((secondHalfSessions - firstHalfSessions) / firstHalfSessions) * 100
        : 0;

    const firstHalfInteractions = firstHalf.reduce(
      (sum, a) => sum + a.totalInteractions,
      0,
    );
    const secondHalfInteractions = secondHalf.reduce(
      (sum, a) => sum + a.totalInteractions,
      0,
    );
    const interactionsTrend =
      firstHalfInteractions > 0
        ? ((secondHalfInteractions - firstHalfInteractions) /
            firstHalfInteractions) *
          100
        : 0;

    const firstHalfConfidence =
      firstHalf.reduce((sum, a) => sum + a.avgConfidence, 0) / firstHalf.length;
    const secondHalfConfidence =
      secondHalf.reduce((sum, a) => sum + a.avgConfidence, 0) / secondHalf.length;
    const confidenceTrend =
      firstHalfConfidence > 0
        ? ((secondHalfConfidence - firstHalfConfidence) / firstHalfConfidence) * 100
        : 0;

    return {
      totalSessions,
      totalInteractions,
      avgConfidence,
      intentMatchRate,
      fallbackRate,
      handoffRate,
      avgSessionLength,
      avgResponseTime,
      topIntents,
      trend: {
        sessions: sessionsTrend,
        interactions: interactionsTrend,
        confidence: confidenceTrend,
      },
    };
  }

  /**
   * Get intent performance breakdown
   */
  async getIntentPerformance(
    chatbotId: string,
    days: number = 30,
  ): Promise<
    Array<{
      intent: string;
      count: number;
      avgConfidence: number;
      successRate: number;
    }>
  > {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.prisma.chatbotSession.findMany({
      where: {
        chatbotId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        interactions: true,
      },
    });

    const intentStats: Record<
      string,
      { count: number; confidences: number[]; successes: number }
    > = {};

    sessions.flatMap((s) => s.interactions).forEach((interaction) => {
      if (interaction.detectedIntent) {
        const intent = interaction.detectedIntent;
        if (!intentStats[intent]) {
          intentStats[intent] = { count: 0, confidences: [], successes: 0 };
        }

        intentStats[intent].count++;
        if (interaction.confidence !== null) {
          intentStats[intent].confidences.push(interaction.confidence);
        }

        // Consider it a success if confidence > 0.7 and there was a response
        if (
          interaction.confidence &&
          interaction.confidence > 0.7 &&
          interaction.botResponse
        ) {
          intentStats[intent].successes++;
        }
      }
    });

    return Object.entries(intentStats)
      .map(([intent, stats]) => ({
        intent,
        count: stats.count,
        avgConfidence:
          stats.confidences.length > 0
            ? stats.confidences.reduce((sum, c) => sum + c, 0) /
              stats.confidences.length
            : 0,
        successRate: stats.count > 0 ? (stats.successes / stats.count) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
