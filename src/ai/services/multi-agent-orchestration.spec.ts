import { Test, TestingModule } from '@nestjs/testing';
import { EnhancedMultiAgentOrchestratorService } from './enhanced-multi-agent-orchestrator.service';
import { AgentCommunicationService } from './agent-communication.service';
import { AgentTaskHistoryService } from './agent-task-history.service';
import { AutomationConfigService } from './automation-config.service';
import { AgentPerformanceMonitorService } from './agent-performance-monitor.service';
import { AICoordinatorService } from './ai-coordinator.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentType } from '../interfaces/ai.interface';
import { AutomationMode } from '../interfaces/orchestration.interface';

describe('Multi-Agent Orchestration', () => {
  let orchestrator: EnhancedMultiAgentOrchestratorService;
  let communication: AgentCommunicationService;
  let taskHistory: AgentTaskHistoryService;
  let automationConfig: AutomationConfigService;
  let performanceMonitor: AgentPerformanceMonitorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedMultiAgentOrchestratorService,
        AgentCommunicationService,
        AgentTaskHistoryService,
        AutomationConfigService,
        AgentPerformanceMonitorService,
        {
          provide: AICoordinatorService,
          useValue: {
            executeAgentTask: jest.fn().mockResolvedValue({
              taskId: 'test-task',
              agentType: AgentType.CONTENT_CREATOR,
              output: 'Test output',
              tokensUsed: 100,
              cost: 0.01,
              executionTime: 1000,
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    orchestrator = module.get<EnhancedMultiAgentOrchestratorService>(
      EnhancedMultiAgentOrchestratorService,
    );
    communication = module.get<AgentCommunicationService>(
      AgentCommunicationService,
    );
    taskHistory = module.get<AgentTaskHistoryService>(AgentTaskHistoryService);
    automationConfig = module.get<AutomationConfigService>(
      AutomationConfigService,
    );
    performanceMonitor = module.get<AgentPerformanceMonitorService>(
      AgentPerformanceMonitorService,
    );
  });

  describe('Agent Communication', () => {
    it('should send and receive messages between agents', async () => {
      const message = {
        id: 'msg-1',
        fromAgent: AgentType.STRATEGY,
        toAgent: AgentType.CONTENT_CREATOR,
        messageType: 'request' as const,
        content: { task: 'Generate content' },
        timestamp: new Date(),
      };

      await communication.sendMessage(message);
      const messages = await communication.receiveMessage(
        AgentType.CONTENT_CREATOR,
      );

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg-1');
      expect(messages[0].fromAgent).toBe(AgentType.STRATEGY);
    });

    it('should broadcast messages to all agents', async () => {
      const message = {
        id: 'msg-2',
        fromAgent: AgentType.ANALYTICS,
        messageType: 'notification' as const,
        content: { update: 'Performance metrics updated' },
        timestamp: new Date(),
      };

      await communication.broadcastMessage(message);

      // Check that all agents except sender received the message
      const contentCreatorMessages = await communication.receiveMessage(
        AgentType.CONTENT_CREATOR,
      );
      const strategyMessages = await communication.receiveMessage(
        AgentType.STRATEGY,
      );

      expect(contentCreatorMessages.length).toBeGreaterThan(0);
      expect(strategyMessages.length).toBeGreaterThan(0);
    });

    it('should track communication statistics', () => {
      const stats = communication.getCommunicationStats();

      expect(stats).toHaveProperty('totalMessages');
      expect(stats).toHaveProperty('messagesByType');
      expect(stats).toHaveProperty('messagesByAgent');
    });
  });

  describe('Automation Configuration', () => {
    it('should get default automation config', async () => {
      const config = await automationConfig.getConfig('workspace-1');

      expect(config).toHaveProperty('mode');
      expect(config).toHaveProperty('enabledAgents');
      expect(config.mode).toBe(AutomationMode.ASSISTED);
    });

    it('should update automation mode', async () => {
      const config = await automationConfig.setMode(
        'workspace-1',
        AutomationMode.FULL_AUTONOMOUS,
      );

      expect(config.mode).toBe(AutomationMode.FULL_AUTONOMOUS);
    });

    it('should add automation rule', async () => {
      const rule = {
        name: 'Test Rule',
        condition: {
          type: 'platform' as const,
          operator: 'equals' as const,
          value: 'instagram',
        },
        action: {
          type: 'auto_publish' as const,
        },
        priority: 10,
        isActive: true,
      };

      const config = await automationConfig.addRule('workspace-1', rule);

      expect(config.rules).toBeDefined();
      expect(config.rules!.length).toBeGreaterThan(0);
    });

    it('should evaluate automation rules', async () => {
      // Add a rule first
      await automationConfig.addRule('workspace-1', {
        name: 'Auto-publish Instagram',
        condition: {
          type: 'platform',
          operator: 'equals',
          value: 'instagram',
        },
        action: {
          type: 'auto_publish',
        },
        priority: 10,
        isActive: true,
      });

      // Set to hybrid mode
      await automationConfig.setMode('workspace-1', AutomationMode.HYBRID);

      const evaluation = await automationConfig.evaluateRules('workspace-1', {
        platform: 'instagram',
      });

      expect(evaluation).toHaveProperty('shouldAutoPublish');
      expect(evaluation).toHaveProperty('requiresApproval');
      expect(evaluation).toHaveProperty('matchedRules');
    });

    it('should check if agent is enabled', async () => {
      const isEnabled = await automationConfig.isAgentEnabled(
        'workspace-1',
        AgentType.CONTENT_CREATOR,
      );

      expect(typeof isEnabled).toBe('boolean');
    });
  });

  describe('Task History', () => {
    it('should get learning insights', async () => {
      const insights = await taskHistory.getLearningInsights(
        'workspace-1',
        AgentType.CONTENT_CREATOR,
      );

      expect(insights).toHaveProperty('agentType');
      expect(insights).toHaveProperty('workspaceId');
      expect(insights).toHaveProperty('insights');
      expect(insights.insights).toHaveProperty('bestPractices');
      expect(insights.insights).toHaveProperty('commonMistakes');
    });

    it('should get successful patterns', async () => {
      const patterns = await taskHistory.getSuccessfulPatterns(
        'workspace-1',
        AgentType.CONTENT_CREATOR,
      );

      expect(Array.isArray(patterns)).toBe(true);
      if (patterns.length > 0) {
        expect(patterns[0]).toHaveProperty('pattern');
        expect(patterns[0]).toHaveProperty('frequency');
        expect(patterns[0]).toHaveProperty('avgRating');
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should get performance dashboard', async () => {
      const dashboard = await performanceMonitor.getPerformanceDashboard(
        'workspace-1',
      );

      expect(dashboard).toHaveProperty('agents');
      expect(dashboard).toHaveProperty('overall');
      expect(Array.isArray(dashboard.agents)).toBe(true);
    });

    it('should get agent health', async () => {
      const health = await performanceMonitor.getAgentHealth(
        'workspace-1',
        AgentType.CONTENT_CREATOR,
      );

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('issues');
      expect(health).toHaveProperty('recommendations');
      expect(health).toHaveProperty('metrics');
      expect(['healthy', 'degraded', 'critical']).toContain(health.status);
    });

    it('should get cost analysis', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const analysis = await performanceMonitor.getCostAnalysis(
        'workspace-1',
        startDate,
        endDate,
      );

      expect(analysis).toHaveProperty('totalCost');
      expect(analysis).toHaveProperty('costByAgent');
      expect(analysis).toHaveProperty('costByModel');
      expect(analysis).toHaveProperty('projectedMonthlyCost');
      expect(typeof analysis.totalCost).toBe('number');
    });
  });

  describe('Orchestration Statistics', () => {
    it('should get orchestration stats', async () => {
      const stats = await orchestrator.getOrchestrationStats('workspace-1');

      expect(stats).toHaveProperty('totalWorkflows');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('avgExecutionTime');
      expect(stats).toHaveProperty('avgCost');
      expect(stats).toHaveProperty('mostUsedAgents');
      expect(Array.isArray(stats.mostUsedAgents)).toBe(true);
    });
  });
});
