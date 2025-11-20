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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConversationService } from './services/conversation.service';
import { MessageService } from './services/message.service';
import { MessageCollectionService } from './services/message-collection.service';
import { ConversationThreadingService } from './services/conversation-threading.service';
import { InboxFilterService, InboxFilter } from './services/inbox-filter.service';
import { SmartInboxRoutingService } from './services/smart-inbox-routing.service';
import { SavedReplyService } from './services/saved-reply.service';
import { ConversationHistoryService } from './services/conversation-history.service';
import { SLAService } from './services/sla.service';
import { InboxGateway } from './gateways/inbox.gateway';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { ReplyMessageDto } from './dto/reply-message.dto';
import { ReplyWithTemplateDto } from './dto/reply-with-template.dto';
import { CreateSavedReplyDto } from './dto/create-saved-reply.dto';
import { UpdateSavedReplyDto } from './dto/update-saved-reply.dto';
import { CreateSLAConfigDto } from './dto/create-sla-config.dto';
import { UpdateSLAConfigDto } from './dto/update-sla-config.dto';

@Controller('inbox')
export class CommunityController {
  constructor(
    private conversationService: ConversationService,
    private messageService: MessageService,
    private messageCollectionService: MessageCollectionService,
    private threadingService: ConversationThreadingService,
    private filterService: InboxFilterService,
    private smartRoutingService: SmartInboxRoutingService,
    private savedReplyService: SavedReplyService,
    private conversationHistoryService: ConversationHistoryService,
    private slaService: SLAService,
    private inboxGateway: InboxGateway,
  ) {}

  /**
   * Get all conversations with filters and pagination
   * GET /inbox/conversations
   */
  @Get('conversations')
  async getConversations(
    @Request() req: any,
    @Query() queryDto: QueryConversationsDto,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.conversationService.query(workspaceId, queryDto);
  }

  /**
   * Get a single conversation with all messages
   * GET /inbox/conversations/:id
   */
  @Get('conversations/:id')
  async getConversation(@Request() req: any, @Param('id') id: string) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.conversationService.findOne(workspaceId, id);
  }

  /**
   * Get threaded conversation with context
   * GET /inbox/conversations/:id/thread
   */
  @Get('conversations/:id/thread')
  async getThreadedConversation(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.threadingService.getThreadedConversation(id, workspaceId);
  }

  /**
   * Create a new conversation
   * POST /inbox/conversations
   */
  @Post('conversations')
  async createConversation(
    @Request() req: any,
    @Body() createDto: CreateConversationDto,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    const conversation = await this.conversationService.create(
      workspaceId,
      createDto,
    );

    // Emit to WebSocket
    this.inboxGateway.emitNewConversation(workspaceId, conversation);

    return conversation;
  }

  /**
   * Update a conversation
   * PUT /inbox/conversations/:id
   */
  @Put('conversations/:id')
  async updateConversation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateConversationDto,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    const conversation = await this.conversationService.update(
      workspaceId,
      id,
      updateDto,
    );

    // Emit to WebSocket
    this.inboxGateway.emitConversationUpdate(workspaceId, conversation);

    return conversation;
  }

  /**
   * Assign conversation to a user
   * PUT /inbox/conversations/:id/assign
   */
  @Put('conversations/:id/assign')
  async assignConversation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { assignedToId: string },
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    const conversation = await this.conversationService.assign(
      workspaceId,
      id,
      body.assignedToId,
    );

    // Emit to WebSocket
    this.inboxGateway.emitConversationAssignment(
      body.assignedToId,
      conversation,
    );

    return conversation;
  }

  /**
   * Archive a conversation
   * PUT /inbox/conversations/:id/archive
   */
  @Put('conversations/:id/archive')
  async archiveConversation(@Request() req: any, @Param('id') id: string) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.conversationService.archive(workspaceId, id);
  }

  /**
   * Get messages for a conversation
   * GET /inbox/conversations/:id/messages
   */
  @Get('conversations/:id/messages')
  async getMessages(@Request() req: any, @Param('id') conversationId: string) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.messageService.findByConversation(conversationId, workspaceId);
  }

  /**
   * Reply to a conversation
   * POST /inbox/conversations/:id/reply
   */
  @Post('conversations/:id/reply')
  @HttpCode(HttpStatus.CREATED)
  async replyToConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() replyDto: ReplyMessageDto,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    const userId = req.user?.id || 'default-user';

    const message = await this.messageService.reply(
      conversationId,
      workspaceId,
      replyDto.content,
      userId,
      replyDto.aiGenerated || false,
    );

    // Emit to WebSocket
    this.inboxGateway.emitNewMessage(conversationId, message);

    return message;
  }

  /**
   * Get conversation statistics
   * GET /inbox/stats
   */
  @Get('stats')
  async getStats(@Request() req: any) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.conversationService.getStats(workspaceId);
  }

  /**
   * Get message collection statistics
   * GET /inbox/collection-stats
   */
  @Get('collection-stats')
  async getCollectionStats(@Request() req: any) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.messageCollectionService.getCollectionStats(workspaceId);
  }

  /**
   * Apply advanced filters
   * POST /inbox/filter
   */
  @Post('filter')
  async applyFilters(
    @Request() req: any,
    @Body() body: { filter: InboxFilter; page?: number; limit?: number },
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.filterService.applyFilters(
      workspaceId,
      body.filter,
      body.page,
      body.limit,
    );
  }

  /**
   * Search conversations
   * GET /inbox/search
   */
  @Get('search')
  async search(@Request() req: any, @Query('q') query: string) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.filterService.search(workspaceId, query);
  }

  /**
   * Get filter suggestions
   * GET /inbox/filter-suggestions
   */
  @Get('filter-suggestions')
  async getFilterSuggestions(@Request() req: any) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.filterService.getFilterSuggestions(workspaceId);
  }

  /**
   * Get quick filters
   * GET /inbox/quick-filters
   */
  @Get('quick-filters')
  getQuickFilters() {
    return this.filterService.getQuickFilters();
  }

  /**
   * Get related conversations for a participant
   * GET /inbox/conversations/:id/related
   */
  @Get('conversations/:id/related')
  async getRelatedConversations(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';

    // First get the conversation to get participant ID
    const conversation = await this.conversationService.findOne(
      workspaceId,
      conversationId,
    );

    return this.threadingService.getRelatedConversations(
      workspaceId,
      conversation.participantId,
      conversationId,
    );
  }

  /**
   * Merge conversations
   * POST /inbox/conversations/:id/merge
   */
  @Post('conversations/:id/merge')
  async mergeConversations(
    @Request() req: any,
    @Param('id') primaryId: string,
    @Body() body: { secondaryId: string },
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.threadingService.mergeConversations(
      workspaceId,
      primaryId,
      body.secondaryId,
    );
  }

  /**
   * Split conversation
   * POST /inbox/conversations/:id/split
   */
  @Post('conversations/:id/split')
  async splitConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() body: { splitAtMessageId: string },
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.threadingService.splitConversation(
      workspaceId,
      conversationId,
      body.splitAtMessageId,
    );
  }

  /**
   * Auto-thread messages
   * POST /inbox/auto-thread
   */
  @Post('auto-thread')
  async autoThread(
    @Request() req: any,
    @Body()
    body: {
      accountId: string;
      participantId: string;
      timeWindowMinutes?: number;
    },
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.threadingService.autoThreadMessages(
      workspaceId,
      body.accountId,
      body.participantId,
      body.timeWindowMinutes,
    );
  }

  /**
   * Get online users in workspace
   * GET /inbox/presence/online
   */
  @Get('presence/online')
  getOnlineUsers(@Request() req: any) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return {
      users: this.inboxGateway.getOnlineUsers(workspaceId),
    };
  }

  /**
   * Analyze message sentiment
   * POST /inbox/messages/:id/analyze-sentiment
   */
  @Post('messages/:id/analyze-sentiment')
  async analyzeSentiment(
    @Request() req: any,
    @Param('id') messageId: string,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    const message = await this.messageService.findOne(messageId, workspaceId);
    return this.smartRoutingService.detectSentiment(message.content);
  }

  /**
   * Detect message intent
   * POST /inbox/messages/:id/detect-intent
   */
  @Post('messages/:id/detect-intent')
  async detectIntent(
    @Request() req: any,
    @Param('id') messageId: string,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    const message = await this.messageService.findOne(messageId, workspaceId);
    return this.smartRoutingService.detectIntent(message.content);
  }

  /**
   * Categorize message
   * POST /inbox/messages/:id/categorize
   */
  @Post('messages/:id/categorize')
  async categorizeMessage(
    @Request() req: any,
    @Param('id') messageId: string,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    const message = await this.messageService.findOne(messageId, workspaceId);
    return this.smartRoutingService.categorizeMessage(message.content);
  }

  /**
   * Analyze and route a message
   * POST /inbox/conversations/:id/messages/:messageId/route
   */
  @Post('conversations/:id/messages/:messageId/route')
  async routeMessage(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    const message = await this.messageService.findOne(messageId, workspaceId);

    // Analyze and route
    const routingResult = await this.smartRoutingService.analyzeAndRoute(
      workspaceId,
      conversationId,
      message,
    );

    // Apply routing rules
    await this.smartRoutingService.applyRoutingRules(
      workspaceId,
      conversationId,
      routingResult,
    );

    // Get updated conversation
    const conversation = await this.conversationService.findOne(
      workspaceId,
      conversationId,
    );

    // Emit to WebSocket
    this.inboxGateway.emitConversationUpdate(workspaceId, conversation);

    return {
      routingResult,
      conversation,
    };
  }

  /**
   * Batch analyze messages
   * POST /inbox/batch-analyze
   */
  @Post('batch-analyze')
  async batchAnalyze(
    @Request() req: any,
    @Body() body: { messageIds: string[] },
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';

    // Fetch all messages
    const messages = await Promise.all(
      body.messageIds.map(async (messageId) => {
        const message = await this.messageService.findOne(
          messageId,
          workspaceId,
        );
        return {
          conversationId: message.conversationId,
          message,
        };
      }),
    );

    // Batch analyze
    const results = await this.smartRoutingService.batchAnalyze(
      workspaceId,
      messages,
    );

    // Convert Map to object for JSON response
    return {
      results: Object.fromEntries(results),
    };
  }

  // ============================================
  // Response Management - Saved Replies
  // ============================================

  /**
   * Create a saved reply template
   * POST /inbox/templates
   */
  @Post('templates')
  async createTemplate(
    @Request() req: any,
    @Body() createDto: CreateSavedReplyDto,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    const userId = req.user?.id || 'default-user';

    return this.savedReplyService.create(workspaceId, userId, createDto);
  }

  /**
   * Get all saved reply templates
   * GET /inbox/templates
   */
  @Get('templates')
  async getTemplates(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';

    return this.savedReplyService.findAll(workspaceId, {
      category,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search,
    });
  }

  /**
   * Get a single saved reply template
   * GET /inbox/templates/:id
   */
  @Get('templates/:id')
  async getTemplate(@Request() req: any, @Param('id') id: string) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.savedReplyService.findOne(workspaceId, id);
  }

  /**
   * Update a saved reply template
   * PUT /inbox/templates/:id
   */
  @Put('templates/:id')
  async updateTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateSavedReplyDto,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.savedReplyService.update(workspaceId, id, updateDto);
  }

  /**
   * Delete a saved reply template
   * DELETE /inbox/templates/:id
   */
  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Request() req: any, @Param('id') id: string) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    await this.savedReplyService.delete(workspaceId, id);
  }

  /**
   * Get template categories
   * GET /inbox/templates/categories
   */
  @Get('templates-categories')
  async getTemplateCategories(@Request() req: any) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.savedReplyService.getCategories(workspaceId);
  }

  /**
   * Get template usage statistics
   * GET /inbox/templates/stats
   */
  @Get('templates-stats')
  async getTemplateStats(@Request() req: any) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.savedReplyService.getUsageStats(workspaceId);
  }

  /**
   * Reply to conversation using a template
   * POST /inbox/conversations/:id/reply-with-template
   */
  @Post('conversations/:id/reply-with-template')
  @HttpCode(HttpStatus.CREATED)
  async replyWithTemplate(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() replyDto: ReplyWithTemplateDto,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    const userId = req.user?.id || 'default-user';

    const message = await this.messageService.replyWithTemplate(
      conversationId,
      workspaceId,
      replyDto.templateId,
      replyDto.variables || {},
      userId,
    );

    // Record first response for SLA tracking
    await this.slaService.recordFirstResponse(conversationId);

    // Emit to WebSocket
    this.inboxGateway.emitNewMessage(conversationId, message);

    return message;
  }

  // ============================================
  // Response Management - Conversation History
  // ============================================

  /**
   * Get conversation history
   * GET /inbox/conversations/:id/history
   */
  @Get('conversations/:id/history')
  async getConversationHistory(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    return this.conversationHistoryService.getHistory(conversationId);
  }

  /**
   * Get conversation activity summary
   * GET /inbox/conversations/:id/activity-summary
   */
  @Get('conversations/:id/activity-summary')
  async getActivitySummary(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    return this.conversationHistoryService.getActivitySummary(conversationId);
  }

  /**
   * Update conversation status with history tracking
   * PUT /inbox/conversations/:id/status
   */
  @Put('conversations/:id/status')
  async updateConversationStatus(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() body: { status: string; notes?: string },
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    const userId = req.user?.id || 'default-user';

    // Get current conversation
    const conversation = await this.conversationService.findOne(
      workspaceId,
      conversationId,
    );

    // Update status
    const updated = await this.conversationService.update(
      workspaceId,
      conversationId,
      { status: body.status as any },
    );

    // Track history
    await this.conversationHistoryService.trackStatusChange(
      conversationId,
      conversation.status,
      body.status,
      userId,
      body.notes,
    );

    // If resolved, record in SLA tracking
    if (body.status === 'RESOLVED') {
      await this.slaService.recordResolution(conversationId);
    }

    // Emit to WebSocket
    this.inboxGateway.emitConversationUpdate(workspaceId, updated);

    return updated;
  }

  /**
   * Update conversation priority with history tracking
   * PUT /inbox/conversations/:id/priority
   */
  @Put('conversations/:id/priority')
  async updateConversationPriority(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() body: { priority: string; notes?: string },
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    const userId = req.user?.id || 'default-user';

    // Get current conversation
    const conversation = await this.conversationService.findOne(
      workspaceId,
      conversationId,
    );

    // Update priority
    const updated = await this.conversationService.update(
      workspaceId,
      conversationId,
      { priority: body.priority as any },
    );

    // Track history
    await this.conversationHistoryService.trackPriorityChange(
      conversationId,
      conversation.priority,
      body.priority,
      userId,
      body.notes,
    );

    // Emit to WebSocket
    this.inboxGateway.emitConversationUpdate(workspaceId, updated);

    return updated;
  }

  // ============================================
  // Response Management - SLA Tracking
  // ============================================

  /**
   * Create SLA configuration
   * POST /inbox/sla/configs
   */
  @Post('sla/configs')
  async createSLAConfig(
    @Request() req: any,
    @Body() createDto: CreateSLAConfigDto,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.slaService.createConfig(workspaceId, createDto);
  }

  /**
   * Get all SLA configurations
   * GET /inbox/sla/configs
   */
  @Get('sla/configs')
  async getSLAConfigs(
    @Request() req: any,
    @Query('isActive') isActive?: string,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.slaService.findAllConfigs(
      workspaceId,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    );
  }

  /**
   * Get a single SLA configuration
   * GET /inbox/sla/configs/:id
   */
  @Get('sla/configs/:id')
  async getSLAConfig(@Request() req: any, @Param('id') id: string) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.slaService.findOneConfig(workspaceId, id);
  }

  /**
   * Update SLA configuration
   * PUT /inbox/sla/configs/:id
   */
  @Put('sla/configs/:id')
  async updateSLAConfig(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateSLAConfigDto,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.slaService.updateConfig(workspaceId, id, updateDto);
  }

  /**
   * Delete SLA configuration
   * DELETE /inbox/sla/configs/:id
   */
  @Delete('sla/configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSLAConfig(@Request() req: any, @Param('id') id: string) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    await this.slaService.deleteConfig(workspaceId, id);
  }

  /**
   * Get SLA tracking for a conversation
   * GET /inbox/conversations/:id/sla
   */
  @Get('conversations/:id/sla')
  async getConversationSLA(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    return this.slaService.getTracking(conversationId);
  }

  /**
   * Get SLA statistics for workspace
   * GET /inbox/sla/stats
   */
  @Get('sla/stats')
  async getSLAStats(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.slaService.getStats(
      workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Get conversations at risk of SLA breach
   * GET /inbox/sla/at-risk
   */
  @Get('sla/at-risk')
  async getAtRiskConversations(@Request() req: any) {
    const workspaceId = req.user?.workspaceId || 'default-workspace';
    return this.slaService.getAtRiskConversations(workspaceId);
  }

  /**
   * Check and escalate conversation if needed
   * POST /inbox/conversations/:id/check-escalation
   */
  @Post('conversations/:id/check-escalation')
  async checkEscalation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    const result = await this.slaService.checkAndEscalate(conversationId);

    if (result.shouldEscalate && result.tracking) {
      // Emit escalation notification
      const workspaceId = req.user?.workspaceId || 'default-workspace';
      this.inboxGateway.emitSLAEscalation(
        workspaceId,
        conversationId,
        result.tracking,
      );
    }

    return result;
  }
}
