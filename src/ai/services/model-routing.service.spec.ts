import { Test, TestingModule } from '@nestjs/testing';
import { ModelRoutingService } from './model-routing.service';
import { AIModel, ModelTier } from '../interfaces/ai.interface';

describe('ModelRoutingService', () => {
  let service: ModelRoutingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModelRoutingService],
    }).compile();

    service = module.get<ModelRoutingService>(ModelRoutingService);
    service.resetCounter(); // Reset for consistent testing
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('selectModel', () => {
    it('should use explicitly specified model', () => {
      const model = service.selectModel({
        messages: [],
        workspaceId: 'test',
        model: AIModel.GPT_4O,
      });
      expect(model).toBe(AIModel.GPT_4O);
    });

    it('should implement 70/30 routing strategy', () => {
      const models: AIModel[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const model = service.selectModel({
          messages: [],
          workspaceId: 'test',
        });
        models.push(model);
      }

      const costEfficientCount = models.filter(
        (m) => m === AIModel.GPT_4O_MINI || m === AIModel.CLAUDE_HAIKU,
      ).length;

      const costEfficientPercentage = costEfficientCount / iterations;

      // Should be approximately 70% cost-efficient (allow 5% margin)
      expect(costEfficientPercentage).toBeGreaterThanOrEqual(0.65);
      expect(costEfficientPercentage).toBeLessThanOrEqual(0.75);
    });
  });

  describe('getModelConfig', () => {
    it('should return config for GPT-4o', () => {
      const config = service.getModelConfig(AIModel.GPT_4O);
      expect(config.tier).toBe(ModelTier.PREMIUM);
      expect(config.costPer1kTokens.input).toBe(0.0025);
    });

    it('should return config for GPT-4o-mini', () => {
      const config = service.getModelConfig(AIModel.GPT_4O_MINI);
      expect(config.tier).toBe(ModelTier.COST_EFFICIENT);
      expect(config.costPer1kTokens.input).toBe(0.00015);
    });
  });

  describe('getCostEfficientModels', () => {
    it('should return cost-efficient models', () => {
      const models = service.getCostEfficientModels();
      expect(models).toContain(AIModel.GPT_4O_MINI);
      expect(models).toContain(AIModel.CLAUDE_HAIKU);
      expect(models).not.toContain(AIModel.GPT_4O);
    });
  });

  describe('getPremiumModels', () => {
    it('should return premium models', () => {
      const models = service.getPremiumModels();
      expect(models).toContain(AIModel.GPT_4O);
      expect(models).toContain(AIModel.CLAUDE_3_5_SONNET);
      expect(models).not.toContain(AIModel.GPT_4O_MINI);
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for GPT-4o', () => {
      const cost = service.estimateCost(AIModel.GPT_4O, 1000, 500);
      // (1000/1000 * 0.0025) + (500/1000 * 0.01) = 0.0025 + 0.005 = 0.0075
      expect(cost).toBeCloseTo(0.0075, 4);
    });

    it('should estimate cost for GPT-4o-mini', () => {
      const cost = service.estimateCost(AIModel.GPT_4O_MINI, 1000, 500);
      // (1000/1000 * 0.00015) + (500/1000 * 0.0006) = 0.00015 + 0.0003 = 0.00045
      expect(cost).toBeCloseTo(0.00045, 5);
    });
  });

  describe('selectCheapestModel', () => {
    it('should return the cheapest cost-efficient model', () => {
      const model = service.selectCheapestModel();
      expect([AIModel.GPT_4O_MINI, AIModel.CLAUDE_HAIKU]).toContain(model);
    });
  });

  describe('selectPremiumModel', () => {
    it('should return GPT-4o for premium tasks', () => {
      const model = service.selectPremiumModel();
      expect(model).toBe(AIModel.GPT_4O);
    });
  });

  describe('getRoutingStats', () => {
    it('should return routing statistics', () => {
      // Make some requests
      for (let i = 0; i < 10; i++) {
        service.selectModel({ messages: [], workspaceId: 'test' });
      }

      const stats = service.getRoutingStats();
      expect(stats.totalRequests).toBe(10);
      expect(stats.costEfficientPercentage).toBeGreaterThan(0);
      expect(stats.premiumPercentage).toBeGreaterThan(0);
      expect(
        stats.costEfficientPercentage + stats.premiumPercentage,
      ).toBeCloseTo(100, 0);
    });
  });
});
