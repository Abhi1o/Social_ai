import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FlowEngineService } from './flow-engine.service';
import { IntentMatchingService } from './intent-matching.service';
import { EntityExtractionService } from './entity-extraction.service';
import { ChatbotSessionService } from './chatbot-session.service';
import { ChatbotAnalyticsService } from './chatbot-analytics.service';
import { Platform } from '@prisma/client';

@Injectable()
export class AutomatedResponseService {
  private readonly logger = new Logger(AutomatedResponseService.name);

  constructor(
    private prisma: PrismaService,
    private flowEngine: FlowEngineService,
    private intentMatching: IntentMatchingService,
    private entityExtraction: EntityExtractionService,
    private sessionService: ChatbotSessionService,
    private analytics: ChatbotAnalyticsService,
  ) {}

  /**
   * Process incoming message and generate automated response if applicable
   */
  async processIncomingMessage(
    conversationId: string,
    message: string,
    platform: Platform,
    accountId: string,
  ): Promise<{
    shouldRespond: boolean;
    response?: string;
    responseType?: string;
    handoff?: boolean;
  }> {
    try {
      // Find active chatbot for this account and platform
      const chatbot = await this.findActiveChatbot(accountId, platform);

      if (!chatbot) {
        return { shouldRespond: false };
      }

      const startTime = Date.now();

      // Get or create session
      const { id: sessionId, context } =
        await this.sessionService.getOrCreateSession(chatbot.id, conversationId);

      // Increment message counter
      await this.sessionService.incrementCounters(sessionId, 'message');

      // Try to match intent
      const intentMatch = await this.intentMatching.matchIntent(
        chatbot.id,
        message,
        context.contexts,
      );

      if (!intentMatch) {
        // No intent matched - check if we should use fallback
        await this.sessionService.incrementCounters(sessionId, 'fallback');

        // Only respond with fallback if configured to do so
        if (chatbot.fallbackMessage) {
          await this.analytics.recordInteraction(
            sessionId,
            message,
            null,
            null,
            {},
            chatbot.fallbackMessage,
            'TEXT',
            null,
            null,
            Date.now() - startTime,
          );

          return {
            shouldRespond: true,
            response: chatbot.fallbackMessage,
            responseType: 'TEXT',
          };
        }

        return { shouldRespond: false };
      }

      // Intent matched - increment counter
      await this.sessionService.incrementCounters(sessionId, 'intent');

      // Extract entities
      const entities = await this.entityExtraction.extractEntities(
        chatbot.id,
        message,
      );

      // Update context with entities
      entities.forEach((entity) => {
        context.variables[entity.name] = entity.value;
      });

      // Update context with intent contexts
      context.contexts = intentMatch.contexts;

      // Find matching flow
      const flowId = await this.flowEngine.findMatchingFlow(
        chatbot.id,
        message,
        context.contexts,
      );

      let response: string;
      let responseType: string = 'TEXT';
      let handoff = false;

      if (flowId) {
        // Execute flow
        const flowResult = await this.flowEngine.executeFlow(
          flowId,
          sessionId,
          message,
          context,
        );

        response = flowResult.response;
        responseType = flowResult.responseType;
        handoff = flowResult.handoff || false;

        // Update context
        context.variables = flowResult.updatedContext.variables;
        context.contexts = flowResult.updatedContext.contexts;
      } else {
        // No flow found, use intent response
        response = await this.intentMatching.getIntentResponse(
          chatbot.id,
          intentMatch.intent,
        );
      }

      // Record interaction
      await this.analytics.recordInteraction(
        sessionId,
        message,
        intentMatch.intent,
        intentMatch.confidence,
        entities,
        response,
        responseType,
        flowId,
        null,
        Date.now() - startTime,
      );

      // Update session with new context
      await this.sessionService.updateSession(sessionId, context);

      return {
        shouldRespond: true,
        response,
        responseType,
        handoff,
      };
    } catch (error: any) {
      this.logger.error(
        `Error processing automated response: ${error.message}`,
        error.stack,
      );
      return { shouldRespond: false };
    }
  }

  /**
   * Find active chatbot for account and platform
   */
  private async findActiveChatbot(
    accountId: string,
    platform: Platform,
  ): Promise<any | null> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
      select: { workspaceId: true },
    });

    if (!account) {
      return null;
    }

    // Find chatbot that is active for this platform and account
    const chatbot = await this.prisma.chatbot.findFirst({
      where: {
        workspaceId: account.workspaceId,
        isActive: true,
        platforms: {
          has: platform,
        },
        accountIds: {
          has: accountId,
        },
      },
    });

    return chatbot;
  }

  /**
   * Check if automated response is enabled for conversation
   */
  async isAutomatedResponseEnabled(
    conversationId: string,
  ): Promise<boolean> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        account: true,
      },
    });

    if (!conversation) {
      return false;
    }

    const chatbot = await this.findActiveChatbot(
      conversation.accountId,
      conversation.platform,
    );

    return chatbot !== null;
  }

  /**
   * Disable automated responses for a conversation (handoff to human)
   */
  async disableForConversation(conversationId: string): Promise<void> {
    // Find active session for this conversation
    const session = await this.prisma.chatbotSession.findFirst({
      where: {
        conversationId,
        isActive: true,
      },
    });

    if (session) {
      await this.sessionService.endSession(session.id);
    }
  }

  /**
   * Re-enable automated responses for a conversation
   */
  async enableForConversation(
    conversationId: string,
    accountId: string,
    platform: Platform,
  ): Promise<boolean> {
    const chatbot = await this.findActiveChatbot(accountId, platform);

    if (!chatbot) {
      return false;
    }

    // Create new session
    await this.sessionService.getOrCreateSession(chatbot.id, conversationId);

    return true;
  }

  /**
   * Get chatbot status for account
   */
  async getChatbotStatus(
    accountId: string,
    platform: Platform,
  ): Promise<{
    enabled: boolean;
    chatbotId?: string;
    chatbotName?: string;
  }> {
    const chatbot = await this.findActiveChatbot(accountId, platform);

    if (!chatbot) {
      return { enabled: false };
    }

    return {
      enabled: true,
      chatbotId: chatbot.id,
      chatbotName: chatbot.name,
    };
  }
}
