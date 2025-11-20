import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AICoordinatorService } from './services/ai-coordinator.service';
import { CostTrackingService } from './services/cost-tracking.service';
import { ModelRoutingService } from './services/model-routing.service';
import { CacheService } from './services/cache.service';
import { MultiAgentOrchestratorService } from './services/multi-agent-orchestrator.service';
import { LangChainService } from './services/langchain.service';
import {
  AICompletionRequest,
  AgentTask,
  AgentType,
  AIModel,
} from './interfaces/ai.interface';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(
    private readonly aiCoordinator: AICoordinatorService,
    private readonly costTracking: CostTrackingService,
    private readonly modelRouting: ModelRoutingService,
    private readonly cache: CacheService,
    private readonly orchestrator: MultiAgentOrchestratorService,
    private readonly langchain: LangChainService,
  ) {}

  /**
   * Generate AI completion
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @Body() request: AICompletionRequest,
    @Request() req: any,
  ) {
    // Use workspace from authenticated user
    request.workspaceId = req.user.workspaceId;
    return this.aiCoordinator.complete(request);
  }

  /**
   * Execute agent task
   */
  @Post('agent/execute')
  @HttpCode(HttpStatus.OK)
  async executeAgentTask(
    @Body()
    body: {
      agentType: AgentType;
      input: any;
      context?: any;
      priority?: 'low' | 'medium' | 'high';
    },
    @Request() req: any,
  ) {
    const task: AgentTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentType: body.agentType,
      input: body.input,
      context: body.context,
      priority: body.priority || 'medium',
      workspaceId: req.user.workspaceId,
    };

    return this.aiCoordinator.executeAgentTask(task);
  }

  /**
   * Get workspace AI statistics
   */
  @Get('stats')
  async getStats(@Request() req: any) {
    return this.aiCoordinator.getWorkspaceStats(req.user.workspaceId);
  }

  /**
   * Get workspace budget
   */
  @Get('budget')
  async getBudget(@Request() req: any) {
    return this.costTracking.getWorkspaceBudget(req.user.workspaceId);
  }

  /**
   * Set workspace budget
   */
  @Post('budget')
  @HttpCode(HttpStatus.OK)
  async setBudget(
    @Body() body: { monthlyBudget: number; alertThreshold?: number },
    @Request() req: any,
  ) {
    await this.costTracking.setWorkspaceBudget(
      req.user.workspaceId,
      body.monthlyBudget,
      body.alertThreshold,
    );
    return { success: true };
  }

  /**
   * Get cost breakdown
   */
  @Get('costs/breakdown')
  async getCostBreakdown(@Request() req: any) {
    return this.costTracking.getCostBreakdown(req.user.workspaceId);
  }

  /**
   * Get cost history
   */
  @Get('costs/history')
  async getCostHistory(@Request() req: any) {
    return this.costTracking.getCostHistory(req.user.workspaceId, 6);
  }

  /**
   * Get routing statistics
   */
  @Get('routing/stats')
  async getRoutingStats() {
    return this.modelRouting.getRoutingStats();
  }

  /**
   * Get cache statistics
   */
  @Get('cache/stats')
  async getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Invalidate cache by pattern
   */
  @Post('cache/invalidate')
  @HttpCode(HttpStatus.OK)
  async invalidateCache(@Body() body: { pattern: string }) {
    const deleted = await this.cache.invalidate(body.pattern);
    return { deleted };
  }

  /**
   * Execute content generation workflow
   */
  @Post('workflows/content')
  @HttpCode(HttpStatus.OK)
  async executeContentWorkflow(
    @Body()
    body: {
      topic: string;
      platform: string;
      brandVoice?: string;
      targetAudience?: string;
    },
    @Request() req: any,
  ) {
    return this.orchestrator.createContentWorkflow(req.user.workspaceId, body);
  }

  /**
   * Execute crisis detection workflow
   */
  @Post('workflows/crisis')
  @HttpCode(HttpStatus.OK)
  async executeCrisisWorkflow(
    @Body() body: { mentions: any[]; brand: string },
    @Request() req: any,
  ) {
    return this.orchestrator.createCrisisWorkflow(req.user.workspaceId, body);
  }

  /**
   * Execute competitive analysis workflow
   */
  @Post('workflows/competitive')
  @HttpCode(HttpStatus.OK)
  async executeCompetitiveWorkflow(
    @Body() body: { competitors: string[]; industry: string },
    @Request() req: any,
  ) {
    return this.orchestrator.createCompetitiveAnalysisWorkflow(
      req.user.workspaceId,
      body,
    );
  }

  /**
   * Execute trend-based content workflow
   */
  @Post('workflows/trend')
  @HttpCode(HttpStatus.OK)
  async executeTrendWorkflow(
    @Body() body: { platform: string; industry: string },
    @Request() req: any,
  ) {
    return this.orchestrator.createTrendContentWorkflow(
      req.user.workspaceId,
      body,
    );
  }

  /**
   * Generate content using LangChain
   */
  @Post('langchain/content')
  @HttpCode(HttpStatus.OK)
  async generateContent(
    @Body()
    body: {
      topic: string;
      platform: string;
      tone?: string;
      brandVoice?: string;
      targetAudience?: string;
      model?: AIModel;
    },
  ) {
    const model = body.model || AIModel.GPT_4O_MINI;
    return this.langchain.generateContent(model, body);
  }

  /**
   * Analyze sentiment using LangChain
   */
  @Post('langchain/sentiment')
  @HttpCode(HttpStatus.OK)
  async analyzeSentiment(
    @Body() body: { text: string; model?: AIModel },
  ) {
    const model = body.model || AIModel.GPT_4O_MINI;
    return this.langchain.analyzeSentiment(model, body.text);
  }

  /**
   * Generate hashtags using LangChain
   */
  @Post('langchain/hashtags')
  @HttpCode(HttpStatus.OK)
  async generateHashtags(
    @Body()
    body: {
      content: string;
      platform: string;
      count?: number;
      model?: AIModel;
    },
  ) {
    const model = body.model || AIModel.GPT_4O_MINI;
    return this.langchain.generateHashtags(
      model,
      body.content,
      body.platform,
      body.count,
    );
  }

  /**
   * Generate strategy using LangChain
   */
  @Post('langchain/strategy')
  @HttpCode(HttpStatus.OK)
  async generateStrategy(
    @Body()
    body: {
      goals: string[];
      currentPerformance: any;
      industry: string;
      targetAudience: string;
      model?: AIModel;
    },
  ) {
    const model = body.model || AIModel.GPT_4O;
    return this.langchain.generateStrategy(model, body);
  }

  /**
   * Generate crisis response using LangChain
   */
  @Post('langchain/crisis')
  @HttpCode(HttpStatus.OK)
  async generateCrisisResponse(
    @Body()
    body: {
      situation: string;
      brand: string;
      tone: string;
      model?: AIModel;
    },
  ) {
    const model = body.model || AIModel.GPT_4O;
    return this.langchain.generateCrisisResponse(model, body);
  }

  /**
   * Analyze competitors using LangChain
   */
  @Post('langchain/competitors')
  @HttpCode(HttpStatus.OK)
  async analyzeCompetitors(
    @Body()
    body: {
      competitors: string[];
      competitorData: any[];
      industry: string;
      model?: AIModel;
    },
  ) {
    const model = body.model || AIModel.GPT_4O;
    return this.langchain.analyzeCompetitors(model, body);
  }

  /**
   * Detect trends using LangChain
   */
  @Post('langchain/trends')
  @HttpCode(HttpStatus.OK)
  async detectTrends(
    @Body()
    body: {
      platform: string;
      industry: string;
      recentContent: any[];
      model?: AIModel;
    },
  ) {
    const model = body.model || AIModel.GPT_4O_MINI;
    return this.langchain.detectTrends(model, body);
  }
}
