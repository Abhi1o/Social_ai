import { Injectable, Logger } from '@nestjs/common';
import {
  AIModel,
  ModelTier,
  ModelConfig,
  AICompletionRequest,
} from '../interfaces/ai.interface';

@Injectable()
export class ModelRoutingService {
  private readonly logger = new Logger(ModelRoutingService.name);

  // Model configurations with pricing and capabilities
  private readonly modelConfigs: Record<AIModel, ModelConfig> = {
    [AIModel.GPT_4O]: {
      model: AIModel.GPT_4O,
      tier: ModelTier.PREMIUM,
      costPer1kTokens: { input: 0.0025, output: 0.01 },
      maxTokens: 4096,
      contextWindow: 128000,
    },
    [AIModel.GPT_4O_MINI]: {
      model: AIModel.GPT_4O_MINI,
      tier: ModelTier.COST_EFFICIENT,
      costPer1kTokens: { input: 0.00015, output: 0.0006 },
      maxTokens: 4096,
      contextWindow: 128000,
    },
    [AIModel.CLAUDE_3_5_SONNET]: {
      model: AIModel.CLAUDE_3_5_SONNET,
      tier: ModelTier.PREMIUM,
      costPer1kTokens: { input: 0.003, output: 0.015 },
      maxTokens: 4096,
      contextWindow: 200000,
    },
    [AIModel.CLAUDE_HAIKU]: {
      model: AIModel.CLAUDE_HAIKU,
      tier: ModelTier.COST_EFFICIENT,
      costPer1kTokens: { input: 0.00025, output: 0.00125 },
      maxTokens: 4096,
      contextWindow: 200000,
    },
  };

  // Routing strategy: 70% cost-efficient, 30% premium
  private readonly COST_EFFICIENT_RATIO = 0.7;
  private routingCounter = 0;

  /**
   * Select optimal model based on routing strategy
   */
  selectModel(request: AICompletionRequest): AIModel {
    // If model explicitly specified, use it
    if (request.model) {
      this.logger.debug(`Using explicitly specified model: ${request.model}`);
      return request.model;
    }

    // Implement 70/30 routing strategy
    this.routingCounter++;
    const useCostEfficient =
      (this.routingCounter % 10) < this.COST_EFFICIENT_RATIO * 10;

    if (useCostEfficient) {
      // Alternate between cost-efficient models
      const model =
        this.routingCounter % 2 === 0
          ? AIModel.GPT_4O_MINI
          : AIModel.CLAUDE_HAIKU;
      this.logger.debug(`Routing to cost-efficient model: ${model}`);
      return model;
    } else {
      // Alternate between premium models
      const model =
        this.routingCounter % 2 === 0
          ? AIModel.GPT_4O
          : AIModel.CLAUDE_3_5_SONNET;
      this.logger.debug(`Routing to premium model: ${model}`);
      return model;
    }
  }

  /**
   * Get model configuration
   */
  getModelConfig(model: AIModel): ModelConfig {
    return this.modelConfigs[model];
  }

  /**
   * Get all cost-efficient models
   */
  getCostEfficientModels(): AIModel[] {
    return Object.values(this.modelConfigs)
      .filter((config) => config.tier === ModelTier.COST_EFFICIENT)
      .map((config) => config.model);
  }

  /**
   * Get all premium models
   */
  getPremiumModels(): AIModel[] {
    return Object.values(this.modelConfigs)
      .filter((config) => config.tier === ModelTier.PREMIUM)
      .map((config) => config.model);
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(
    model: AIModel,
    estimatedInputTokens: number,
    estimatedOutputTokens: number,
  ): number {
    const config = this.modelConfigs[model];
    if (!config) {
      return 0;
    }

    const inputCost =
      (estimatedInputTokens / 1000) * config.costPer1kTokens.input;
    const outputCost =
      (estimatedOutputTokens / 1000) * config.costPer1kTokens.output;

    return inputCost + outputCost;
  }

  /**
   * Select cheapest model for a task
   */
  selectCheapestModel(): AIModel {
    const costEfficientModels = this.getCostEfficientModels();
    // Return the cheapest cost-efficient model
    return costEfficientModels.reduce((cheapest, current) => {
      const cheapestConfig = this.modelConfigs[cheapest];
      const currentConfig = this.modelConfigs[current];

      const cheapestAvgCost =
        (cheapestConfig.costPer1kTokens.input +
          cheapestConfig.costPer1kTokens.output) /
        2;
      const currentAvgCost =
        (currentConfig.costPer1kTokens.input +
          currentConfig.costPer1kTokens.output) /
        2;

      return currentAvgCost < cheapestAvgCost ? current : cheapest;
    });
  }

  /**
   * Select best model for complex tasks
   */
  selectPremiumModel(): AIModel {
    // Default to GPT-4o for complex tasks
    return AIModel.GPT_4O;
  }

  /**
   * Get routing statistics
   */
  getRoutingStats(): {
    totalRequests: number;
    costEfficientPercentage: number;
    premiumPercentage: number;
  } {
    const costEfficientCount = Math.floor(
      this.routingCounter * this.COST_EFFICIENT_RATIO,
    );
    const premiumCount = this.routingCounter - costEfficientCount;

    return {
      totalRequests: this.routingCounter,
      costEfficientPercentage:
        this.routingCounter > 0
          ? (costEfficientCount / this.routingCounter) * 100
          : 0,
      premiumPercentage:
        this.routingCounter > 0
          ? (premiumCount / this.routingCounter) * 100
          : 0,
    };
  }

  /**
   * Reset routing counter (for testing)
   */
  resetCounter(): void {
    this.routingCounter = 0;
  }
}
