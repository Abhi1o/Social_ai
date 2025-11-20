import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AICoordinatorService } from './services/ai-coordinator.service';
import { ModelRoutingService } from './services/model-routing.service';
import { CostTrackingService } from './services/cost-tracking.service';
import { CacheService } from './services/cache.service';
import { MultiAgentOrchestratorService } from './services/multi-agent-orchestrator.service';
import { EnhancedMultiAgentOrchestratorService } from './services/enhanced-multi-agent-orchestrator.service';
import { AgentCommunicationService } from './services/agent-communication.service';
import { AgentTaskHistoryService } from './services/agent-task-history.service';
import { AutomationConfigService } from './services/automation-config.service';
import { AgentPerformanceMonitorService } from './services/agent-performance-monitor.service';
import { LangChainService } from './services/langchain.service';
import { BrandVoiceService } from './services/brand-voice.service';
import { OpenAIService } from './providers/openai.service';
import { AnthropicService } from './providers/anthropic.service';
import { AIController } from './ai.controller';
import { ContentController } from './controllers/content.controller';
import { StrategyController } from './controllers/strategy.controller';
import { HashtagController } from './controllers/hashtag.controller';
import { OrchestrationController } from './controllers/orchestration.controller';
import { BrandVoiceController } from './controllers/brand-voice.controller';
import { ContentCreatorAgent } from './agents/content-creator.agent';
import { StrategyAgent } from './agents/strategy.agent';
import { HashtagIntelligenceAgent } from './agents/hashtag-intelligence.agent';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [
    AIController,
    ContentController,
    StrategyController,
    HashtagController,
    OrchestrationController,
    BrandVoiceController,
  ],
  providers: [
    AICoordinatorService,
    ModelRoutingService,
    CostTrackingService,
    CacheService,
    MultiAgentOrchestratorService,
    EnhancedMultiAgentOrchestratorService,
    AgentCommunicationService,
    AgentTaskHistoryService,
    AutomationConfigService,
    AgentPerformanceMonitorService,
    LangChainService,
    BrandVoiceService,
    OpenAIService,
    AnthropicService,
    ContentCreatorAgent,
    StrategyAgent,
    HashtagIntelligenceAgent,
  ],
  exports: [
    AICoordinatorService,
    ModelRoutingService,
    CostTrackingService,
    MultiAgentOrchestratorService,
    EnhancedMultiAgentOrchestratorService,
    AgentCommunicationService,
    AgentTaskHistoryService,
    AutomationConfigService,
    AgentPerformanceMonitorService,
    LangChainService,
    BrandVoiceService,
    OpenAIService,
    AnthropicService,
    ContentCreatorAgent,
    StrategyAgent,
    HashtagIntelligenceAgent,
  ],
})
export class AIModule {}
