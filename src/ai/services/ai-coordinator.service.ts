import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OpenAIService } from '../providers/openai.service';
import { AnthropicService } from '../providers/anthropic.service';
import { ModelRoutingService } from './model-routing.service';
import { CostTrackingService } from './cost-tracking.service';
import { CacheService } from './cache.service';
import {
  AICompletionRequest,
  AICompletionResponse,
  AIModel,
  AgentTask,
  AgentTaskResult,
  AgentType,
} from '../interfaces/ai.interface';

@Injectable()
export class AICoordinatorService {
  private readonly logger = new Logger(AICoordinatorService.name);

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly anthropicService: AnthropicService,
    private readonly modelRoutingService: ModelRoutingService,
    private readonly costTrackingService: CostTrackingService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Main entry point for AI completions with caching and cost tracking
   */
  async complete(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse> {
    try {
      // Validate workspace budget
      const budget = await this.costTrackingService.getWorkspaceBudget(
        request.workspaceId,
      );
      if (budget.isThrottled) {
        throw new BadRequestException(
          `Workspace ${request.workspaceId} has exceeded AI budget limit`,
        );
      }

      // Select optimal model using routing strategy
      const selectedModel = this.modelRoutingService.selectModel(request);
      request.model = selectedModel;

      // Check cache if cacheKey provided
      if (request.cacheKey) {
        const cached = await this.cacheService.get(request.cacheKey);
        if (cached) {
          this.logger.debug(`Returning cached response for ${request.cacheKey}`);
          return cached;
        }
      }

      // Generate cache key if not provided
      const cacheKey =
        request.cacheKey ||
        this.cacheService.generateCacheKey(
          request.messages,
          selectedModel,
          request.temperature ?? 0.7,
        );

      // Route to appropriate provider
      let response: AICompletionResponse;
      if (this.isOpenAIModel(selectedModel)) {
        response = await this.openaiService.complete(request);
      } else if (this.isAnthropicModel(selectedModel)) {
        response = await this.anthropicService.complete(request);
      } else {
        throw new BadRequestException(`Unsupported model: ${selectedModel}`);
      }

      // Track cost
      await this.costTrackingService.trackCost({
        workspaceId: request.workspaceId,
        model: selectedModel,
        tokensUsed: response.tokensUsed.total,
        cost: response.cost,
        timestamp: new Date(),
        requestType: 'completion',
      });

      // Cache response
      const ttl = request.cacheTTL || 24 * 60 * 60; // 24 hours default
      await this.cacheService.set(cacheKey, response, ttl);

      return response;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`AI completion error: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Execute agent task with specialized handling
   */
  async executeAgentTask(task: AgentTask): Promise<AgentTaskResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Executing agent task: ${task.agentType} (${task.id})`);

      // Build messages based on agent type
      const messages = this.buildAgentMessages(task);

      // Select model based on task priority and agent type
      const model = this.selectModelForAgent(task);

      // Execute completion
      const response = await this.complete({
        messages,
        model,
        workspaceId: task.workspaceId,
        temperature: this.getAgentTemperature(task.agentType),
        maxTokens: 2000,
        cacheKey: this.buildAgentCacheKey(task),
        cacheTTL: this.getAgentCacheTTL(task.agentType),
      });

      const executionTime = Date.now() - startTime;

      return {
        taskId: task.id,
        agentType: task.agentType,
        output: response.content,
        tokensUsed: response.tokensUsed.total,
        cost: response.cost,
        executionTime,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Agent task execution error: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Build messages for agent task
   */
  private buildAgentMessages(task: AgentTask): any[] {
    const systemPrompt = this.getAgentSystemPrompt(task.agentType);
    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: JSON.stringify(task.input),
      },
    ];

    // Add context if provided
    if (task.context) {
      messages.push({
        role: 'user',
        content: `Context: ${JSON.stringify(task.context)}`,
      });
    }

    return messages;
  }

  /**
   * Get system prompt for agent type
   */
  private getAgentSystemPrompt(agentType: AgentType): string {
    const prompts: Record<AgentType, string> = {
      [AgentType.CONTENT_CREATOR]: `You are a creative content creator AI agent specialized in generating engaging social media content. 
Your personality is creative, enthusiastic, and brand-aware. You understand platform-specific best practices and can adapt tone and style.
Generate content that is authentic, engaging, and optimized for the target platform.`,

      [AgentType.STRATEGY]: `You are a strategic AI agent specialized in social media strategy and analytics.
Your personality is analytical, data-driven, and insightful. You analyze performance data, identify trends, and provide actionable recommendations.
Focus on ROI, engagement optimization, and long-term growth strategies.`,

      [AgentType.ENGAGEMENT]: `You are an engagement specialist AI agent focused on community management and interaction.
Your personality is friendly, empathetic, and responsive. You help craft replies, manage conversations, and maintain positive community relationships.
Prioritize authenticity, timeliness, and brand voice consistency.`,

      [AgentType.ANALYTICS]: `You are an analytics AI agent specialized in data analysis and insights generation.
Your personality is precise, thorough, and insight-focused. You analyze metrics, identify patterns, and translate data into actionable insights.
Provide clear, concise analysis with specific recommendations.`,

      [AgentType.TREND_DETECTION]: `You are a trend detection AI agent specialized in identifying emerging topics and viral content.
Your personality is observant, quick, and trend-savvy. You monitor conversations, detect patterns, and identify opportunities.
Focus on real-time trends, hashtag performance, and content virality.`,

      [AgentType.COMPETITOR_ANALYSIS]: `You are a competitive intelligence AI agent specialized in competitor analysis.
Your personality is strategic, thorough, and objective. You analyze competitor activity, identify gaps, and recommend differentiation strategies.
Provide actionable competitive insights and strategic recommendations.`,

      [AgentType.CRISIS_MANAGEMENT]: `You are a crisis management AI agent specialized in identifying and responding to PR issues.
Your personality is calm, decisive, and solution-focused. You detect potential crises, assess severity, and recommend response strategies.
Prioritize brand protection, rapid response, and stakeholder communication.`,

      [AgentType.SENTIMENT_ANALYSIS]: `You are a sentiment analysis AI agent specialized in understanding emotional tone and context.
Your personality is empathetic, nuanced, and context-aware. You analyze sentiment, detect emotions, and provide detailed sentiment breakdowns.
Focus on accuracy, context understanding, and actionable sentiment insights.`,
    };

    return prompts[agentType] || 'You are a helpful AI assistant.';
  }

  /**
   * Select model for agent based on task priority
   */
  private selectModelForAgent(task: AgentTask): AIModel {
    // High priority tasks use premium models
    if (task.priority === 'high') {
      return this.modelRoutingService.selectPremiumModel();
    }

    // Low priority tasks use cheapest model
    if (task.priority === 'low') {
      return this.modelRoutingService.selectCheapestModel();
    }

    // Medium priority uses routing strategy
    return this.modelRoutingService.selectModel({
      messages: [],
      workspaceId: task.workspaceId,
    });
  }

  /**
   * Get temperature for agent type
   */
  private getAgentTemperature(agentType: AgentType): number {
    const temperatures: Record<AgentType, number> = {
      [AgentType.CONTENT_CREATOR]: 0.8, // More creative
      [AgentType.STRATEGY]: 0.3, // More focused
      [AgentType.ENGAGEMENT]: 0.7, // Balanced
      [AgentType.ANALYTICS]: 0.2, // Very focused
      [AgentType.TREND_DETECTION]: 0.5, // Balanced
      [AgentType.COMPETITOR_ANALYSIS]: 0.3, // Focused
      [AgentType.CRISIS_MANAGEMENT]: 0.2, // Very focused
      [AgentType.SENTIMENT_ANALYSIS]: 0.3, // Focused
    };

    return temperatures[agentType] || 0.7;
  }

  /**
   * Build cache key for agent task
   */
  private buildAgentCacheKey(task: AgentTask): string {
    const inputHash = JSON.stringify(task.input);
    return `agent:${task.agentType}:${this.cacheService.generateCacheKey([{ role: 'user', content: inputHash }], '', 0)}`;
  }

  /**
   * Get cache TTL for agent type
   */
  private getAgentCacheTTL(agentType: AgentType): number {
    const ttls: Record<AgentType, number> = {
      [AgentType.CONTENT_CREATOR]: 24 * 60 * 60, // 24 hours
      [AgentType.STRATEGY]: 7 * 24 * 60 * 60, // 7 days
      [AgentType.ENGAGEMENT]: 1 * 60 * 60, // 1 hour
      [AgentType.ANALYTICS]: 24 * 60 * 60, // 24 hours
      [AgentType.TREND_DETECTION]: 1 * 60 * 60, // 1 hour
      [AgentType.COMPETITOR_ANALYSIS]: 24 * 60 * 60, // 24 hours
      [AgentType.CRISIS_MANAGEMENT]: 30 * 60, // 30 minutes
      [AgentType.SENTIMENT_ANALYSIS]: 24 * 60 * 60, // 24 hours
    };

    return ttls[agentType] || 24 * 60 * 60;
  }

  /**
   * Check if model is OpenAI
   */
  private isOpenAIModel(model: AIModel): boolean {
    return model === AIModel.GPT_4O || model === AIModel.GPT_4O_MINI;
  }

  /**
   * Check if model is Anthropic
   */
  private isAnthropicModel(model: AIModel): boolean {
    return (
      model === AIModel.CLAUDE_3_5_SONNET || model === AIModel.CLAUDE_HAIKU
    );
  }

  /**
   * Get workspace AI statistics
   */
  async getWorkspaceStats(workspaceId: string): Promise<{
    budget: any;
    costBreakdown: any;
    routingStats: any;
    cacheStats: any;
  }> {
    const [budget, costBreakdown, routingStats, cacheStats] =
      await Promise.all([
        this.costTrackingService.getWorkspaceBudget(workspaceId),
        this.costTrackingService.getCostBreakdown(workspaceId),
        this.modelRoutingService.getRoutingStats(),
        this.cacheService.getStats(),
      ]);

    return {
      budget,
      costBreakdown,
      routingStats,
      cacheStats,
    };
  }
}
