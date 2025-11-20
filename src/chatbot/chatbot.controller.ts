import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatbotService } from './services/chatbot.service';
import { FlowEngineService } from './services/flow-engine.service';
import { IntentMatchingService } from './services/intent-matching.service';
import { EntityExtractionService } from './services/entity-extraction.service';
import { ChatbotAnalyticsService } from './services/chatbot-analytics.service';
import { ChatbotSessionService } from './services/chatbot-session.service';
import { CreateChatbotDto } from './dto/create-chatbot.dto';
import { UpdateChatbotDto } from './dto/update-chatbot.dto';
import { CreateFlowDto } from './dto/create-flow.dto';
import { CreateIntentDto } from './dto/create-intent.dto';
import { CreateEntityDto } from './dto/create-entity.dto';
import { ProcessMessageDto } from './dto/process-message.dto';

@Controller('chatbot')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly flowEngine: FlowEngineService,
    private readonly intentMatching: IntentMatchingService,
    private readonly entityExtraction: EntityExtractionService,
    private readonly analytics: ChatbotAnalyticsService,
    private readonly sessionService: ChatbotSessionService,
  ) {}

  // ============================================
  // Chatbot Management
  // ============================================

  @Post()
  async create(@Request() req: any, @Body() dto: CreateChatbotDto) {
    return this.chatbotService.create(req.user.workspaceId, req.user.userId, dto);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.chatbotService.findAll(req.user.workspaceId);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.chatbotService.findOne(id, req.user.workspaceId);
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateChatbotDto,
  ) {
    return this.chatbotService.update(id, req.user.workspaceId, dto);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.chatbotService.remove(id, req.user.workspaceId);
  }

  @Post(':id/train')
  async train(@Request() req: any, @Param('id') id: string) {
    return this.chatbotService.trainChatbot(id, req.user.workspaceId);
  }

  // ============================================
  // Flow Management
  // ============================================

  @Post(':chatbotId/flows')
  async createFlow(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Body() dto: CreateFlowDto,
  ) {
    return this.chatbotService.createFlow(chatbotId, req.user.workspaceId, dto);
  }

  @Get(':chatbotId/flows')
  async findFlows(@Request() req: any, @Param('chatbotId') chatbotId: string) {
    return this.chatbotService.findFlows(chatbotId, req.user.workspaceId);
  }

  @Get(':chatbotId/flows/:flowId')
  async findFlow(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Param('flowId') flowId: string,
  ) {
    return this.chatbotService.findFlow(flowId, chatbotId, req.user.workspaceId);
  }

  @Put(':chatbotId/flows/:flowId')
  async updateFlow(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Param('flowId') flowId: string,
    @Body() dto: Partial<CreateFlowDto>,
  ) {
    return this.chatbotService.updateFlow(
      flowId,
      chatbotId,
      req.user.workspaceId,
      dto,
    );
  }

  @Delete(':chatbotId/flows/:flowId')
  async removeFlow(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Param('flowId') flowId: string,
  ) {
    return this.chatbotService.removeFlow(flowId, chatbotId, req.user.workspaceId);
  }

  // ============================================
  // Intent Management
  // ============================================

  @Post(':chatbotId/intents')
  async createIntent(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Body() dto: CreateIntentDto,
  ) {
    return this.chatbotService.createIntent(chatbotId, req.user.workspaceId, dto);
  }

  @Get(':chatbotId/intents')
  async findIntents(@Request() req: any, @Param('chatbotId') chatbotId: string) {
    return this.chatbotService.findIntents(chatbotId, req.user.workspaceId);
  }

  @Put(':chatbotId/intents/:intentId')
  async updateIntent(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Param('intentId') intentId: string,
    @Body() dto: Partial<CreateIntentDto>,
  ) {
    return this.chatbotService.updateIntent(
      intentId,
      chatbotId,
      req.user.workspaceId,
      dto,
    );
  }

  @Delete(':chatbotId/intents/:intentId')
  async removeIntent(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Param('intentId') intentId: string,
  ) {
    return this.chatbotService.removeIntent(
      intentId,
      chatbotId,
      req.user.workspaceId,
    );
  }

  // ============================================
  // Entity Management
  // ============================================

  @Post(':chatbotId/entities')
  async createEntity(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Body() dto: CreateEntityDto,
  ) {
    return this.chatbotService.createEntity(chatbotId, req.user.workspaceId, dto);
  }

  @Get(':chatbotId/entities')
  async findEntities(@Request() req: any, @Param('chatbotId') chatbotId: string) {
    return this.chatbotService.findEntities(chatbotId, req.user.workspaceId);
  }

  @Put(':chatbotId/entities/:entityId')
  async updateEntity(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Param('entityId') entityId: string,
    @Body() dto: Partial<CreateEntityDto>,
  ) {
    return this.chatbotService.updateEntity(
      entityId,
      chatbotId,
      req.user.workspaceId,
      dto,
    );
  }

  @Delete(':chatbotId/entities/:entityId')
  async removeEntity(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Param('entityId') entityId: string,
  ) {
    return this.chatbotService.removeEntity(
      entityId,
      chatbotId,
      req.user.workspaceId,
    );
  }

  // ============================================
  // Message Processing
  // ============================================

  @Post(':chatbotId/process')
  async processMessage(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Body() dto: ProcessMessageDto,
  ) {
    const startTime = Date.now();

    // Get or create session
    const { id: sessionId, context } = await this.sessionService.getOrCreateSession(
      chatbotId,
      dto.conversationId,
    );

    // Merge provided context
    if (dto.context) {
      context.variables = { ...context.variables, ...dto.context };
    }

    // Increment message counter
    await this.sessionService.incrementCounters(sessionId, 'message');

    // Try to match intent
    const intentMatch = await this.intentMatching.matchIntent(
      chatbotId,
      dto.message,
      context.contexts,
    );

    let response: string;
    let responseType: string = 'TEXT';
    let quickReplies: any[] | undefined;
    let handoff = false;

    if (intentMatch) {
      // Intent matched - increment counter
      await this.sessionService.incrementCounters(sessionId, 'intent');

      // Extract entities
      const entities = await this.entityExtraction.extractEntities(
        chatbotId,
        dto.message,
      );

      // Update context with entities
      entities.forEach((entity) => {
        context.variables[entity.name] = entity.value;
      });

      // Update context with intent contexts
      context.contexts = intentMatch.contexts;

      // Find matching flow
      const flowId = await this.flowEngine.findMatchingFlow(
        chatbotId,
        dto.message,
        context.contexts,
      );

      if (flowId) {
        // Execute flow
        const flowResult = await this.flowEngine.executeFlow(
          flowId,
          sessionId,
          dto.message,
          context,
        );

        response = flowResult.response;
        responseType = flowResult.responseType;
        quickReplies = flowResult.quickReplies;
        handoff = flowResult.handoff || false;

        // Update context
        context.variables = flowResult.updatedContext.variables;
        context.contexts = flowResult.updatedContext.contexts;
      } else {
        // No flow found, use intent response
        response = await this.intentMatching.getIntentResponse(
          chatbotId,
          intentMatch.intent,
        );
      }

      // Record interaction
      await this.analytics.recordInteraction(
        sessionId,
        dto.message,
        intentMatch.intent,
        intentMatch.confidence,
        entities,
        response,
        responseType,
        flowId,
        null,
        Date.now() - startTime,
      );
    } else {
      // No intent matched - use fallback
      await this.sessionService.incrementCounters(sessionId, 'fallback');

      const chatbot = await this.chatbotService.findOne(
        chatbotId,
        req.user.workspaceId,
      );
      response =
        chatbot.fallbackMessage ||
        "I'm sorry, I didn't understand that. Can you please rephrase?";

      // Record interaction
      await this.analytics.recordInteraction(
        sessionId,
        dto.message,
        null,
        null,
        {},
        response,
        responseType,
        null,
        null,
        Date.now() - startTime,
      );
    }

    // Update session with new context
    await this.sessionService.updateSession(sessionId, context);

    return {
      response,
      responseType,
      quickReplies,
      handoff,
      intent: intentMatch?.intent,
      confidence: intentMatch?.confidence,
      entities: intentMatch?.entities,
      sessionId,
    };
  }

  // ============================================
  // Analytics
  // ============================================

  @Get(':chatbotId/analytics/summary')
  async getAnalyticsSummary(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.analytics.getPerformanceSummary(chatbotId, daysNum);
  }

  @Get(':chatbotId/analytics/intents')
  async getIntentPerformance(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.analytics.getIntentPerformance(chatbotId, daysNum);
  }

  @Get(':chatbotId/analytics/sessions')
  async getSessionStats(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.sessionService.getSessionStats(chatbotId, daysNum);
  }

  @Get(':chatbotId/analytics/range')
  async getAnalyticsRange(
    @Request() req: any,
    @Param('chatbotId') chatbotId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analytics.getAnalyticsRange(
      chatbotId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ============================================
  // Session Management
  // ============================================

  @Post('sessions/:sessionId/end')
  async endSession(@Param('sessionId') sessionId: string) {
    return this.sessionService.endSession(sessionId);
  }

  @Post('sessions/cleanup')
  async cleanupSessions() {
    const count = await this.sessionService.cleanupInactiveSessions();
    return { message: `Cleaned up ${count} inactive sessions` };
  }
}
