import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AIModule } from './ai.module';
import { AICoordinatorService } from './services/ai-coordinator.service';
import { ModelRoutingService } from './services/model-routing.service';
import { CostTrackingService } from './services/cost-tracking.service';
import { CacheService } from './services/cache.service';
import { MultiAgentOrchestratorService } from './services/multi-agent-orchestrator.service';
import { OpenAIService } from './providers/openai.service';
import { AnthropicService } from './providers/anthropic.service';

describe('AIModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AIModule, ConfigModule.forRoot()],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide AICoordinatorService', () => {
    const service = module.get<AICoordinatorService>(AICoordinatorService);
    expect(service).toBeDefined();
  });

  it('should provide ModelRoutingService', () => {
    const service = module.get<ModelRoutingService>(ModelRoutingService);
    expect(service).toBeDefined();
  });

  it('should provide CostTrackingService', () => {
    const service = module.get<CostTrackingService>(CostTrackingService);
    expect(service).toBeDefined();
  });

  it('should provide CacheService', () => {
    const service = module.get<CacheService>(CacheService);
    expect(service).toBeDefined();
  });

  it('should provide MultiAgentOrchestratorService', () => {
    const service = module.get<MultiAgentOrchestratorService>(
      MultiAgentOrchestratorService,
    );
    expect(service).toBeDefined();
  });

  it('should provide OpenAIService', () => {
    const service = module.get<OpenAIService>(OpenAIService);
    expect(service).toBeDefined();
  });

  it('should provide AnthropicService', () => {
    const service = module.get<AnthropicService>(AnthropicService);
    expect(service).toBeDefined();
  });
});
