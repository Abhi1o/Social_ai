import { Injectable, Logger } from '@nestjs/common';
import { AICoordinatorService } from './ai-coordinator.service';
import { AgentCommunicationService } from './agent-communication.service';
import { AgentTaskHistoryService } from './agent-task-history.service';
import { AutomationConfigService } from './automation-config.service';
import { AgentPerformanceMonitorService } from './agent-performance-monitor.service';
import {
  AgentTask,
  AgentTaskResult,
  AgentType,
} from '../interfaces/ai.interface';
import {
  AgentMessage,
  CollaborativeWorkflowResult,
  WorkflowExecutionContext,
  AutomationMode,
} from '../interfaces/orchestration.interface';

/**
 * Enhanced Multi-Agent Orchestration Service
 * Implements advanced CrewAI-like patterns with full communication, history, and monitoring
 */
@Injectable()
export class EnhancedMultiAgentOrchestratorService {
  private readonly logger = new Logger(
    EnhancedMultiAgentOrchestratorService.name,
  );

  constructor(
    private readonly aiCoordinator: AICoordinatorService,
    private readonly communication: AgentCommunicationService,
    private readonly taskHistory: AgentTaskHistoryService,
    private readonly automationConfig: AutomationConfigService,
    private readonly performanceMonitor: AgentPerformanceMonitorService,
  ) {}

  /**
   * Execute a collaborative workflow with full agent communication
   */
  async executeCollaborativeWorkflow(
    workspaceId: string,
    workflowName: string,
    agents: AgentType[],
    initialInput: any,
  ): Promise<CollaborativeWorkflowResult> {
    const startTime = Date.now();
    const workflowId = `workflow-${Date.now()}-${Math.random()}`;

    this.logger.log(
      `Starting collaborative workflow: ${workflowName} with agents: ${agents.join(', ')}`,
    );

    // Get automation config
    const automationConfig = await this.automationConfig.getConfig(workspaceId);

    const agentContributions: CollaborativeWorkflowResult['agentContributions'] =
      [];
    const communicationLog: AgentMessage[] = [];
    let sharedContext: any = { ...initialInput };

    try {
      // Execute each agent in sequence with communication
      for (const agentType of agents) {
        // Check if agent is enabled
        const isEnabled = await this.automationConfig.isAgentEnabled(
          workspaceId,
          agentType,
        );

        if (!isEnabled) {
          this.logger.warn(`Agent ${agentType} is disabled, skipping`);
          continue;
        }

        // Send task notification
        const taskMessage: AgentMessage = {
          id: `msg-${Date.now()}-${Math.random()}`,
          fromAgent: AgentType.STRATEGY, // Coordinator
          toAgent: agentType,
          messageType: 'request',
          content: {
            type: 'collaborative_task',
            input: initialInput,
            sharedContext,
          },
          metadata: {
            workflowId,
            priority: 'high',
          },
          timestamp: new Date(),
        };

        await this.communication.sendMessage(taskMessage);
        communicationLog.push(taskMessage);

        // Execute agent task
        const taskId = `${workflowId}-${agentType}-${Date.now()}`;
        const task: AgentTask = {
          id: taskId,
          agentType,
          input: {
            ...initialInput,
            sharedContext,
            previousContributions: agentContributions,
          },
          context: {
            workflowId,
            automationMode: automationConfig.mode,
          },
          priority: 'high',
          workspaceId,
        };

        const agentStartTime = Date.now();
        const result = await this.aiCoordinator.executeAgentTask(task);
        const agentExecutionTime = Date.now() - agentStartTime;

        // Record contribution
        agentContributions.push({
          agentType,
          contribution: result.output,
          executionTime: agentExecutionTime,
          cost: result.cost,
        });

        // Record in history
        await this.taskHistory.recordTask(
          workspaceId,
          taskId,
          agentType,
          task.input,
          result.output,
          result,
          workflowId,
        );

        // Update shared context
        sharedContext[agentType] = result.output;

        // Send result message
        const resultMessage: AgentMessage = {
          id: `msg-${Date.now()}-${Math.random()}`,
          fromAgent: agentType,
          toAgent: AgentType.STRATEGY,
          messageType: 'response',
          content: {
            type: 'contribution',
            output: result.output,
          },
          metadata: {
            workflowId,
            taskId,
          },
          timestamp: new Date(),
        };

        await this.communication.broadcastMessage(resultMessage);
        communicationLog.push(resultMessage);

        // Request feedback from next agent if available
        const nextAgentIndex = agents.indexOf(agentType) + 1;
        if (nextAgentIndex < agents.length) {
          const feedbackMessage = await this.communication.requestFeedback(
            agentType,
            agents[nextAgentIndex],
            result.output,
          );
          communicationLog.push(feedbackMessage);
        }
      }

      const totalExecutionTime = Date.now() - startTime;
      const totalCost = agentContributions.reduce(
        (sum, c) => sum + c.cost,
        0,
      );
      const totalTokens = agentContributions.reduce(
        (sum, c) => sum + (c.contribution.tokensUsed || 0),
        0,
      );

      // Calculate collaboration efficiency (0-1 score)
      const collaborationEfficiency = this.calculateCollaborationEfficiency(
        agentContributions,
        communicationLog,
      );

      this.logger.log(
        `Collaborative workflow completed: ${workflowName} (${totalExecutionTime}ms, $${totalCost.toFixed(4)}, efficiency: ${(collaborationEfficiency * 100).toFixed(1)}%)`,
      );

      return {
        workflowId,
        workspaceId,
        automationMode: automationConfig.mode,
        participatingAgents: agents,
        agentContributions,
        finalOutput: sharedContext,
        communicationLog,
        performanceMetrics: {
          totalExecutionTime,
          totalCost,
          totalTokens,
          collaborationEfficiency,
        },
        status: 'completed',
        createdAt: new Date(startTime),
        completedAt: new Date(),
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Collaborative workflow error: ${err.message}`,
        err.stack,
      );

      return {
        workflowId,
        workspaceId,
        automationMode: automationConfig.mode,
        participatingAgents: agents,
        agentContributions,
        finalOutput: sharedContext,
        communicationLog,
        performanceMetrics: {
          totalExecutionTime: Date.now() - startTime,
          totalCost: agentContributions.reduce((sum, c) => sum + c.cost, 0),
          totalTokens: 0,
          collaborationEfficiency: 0,
        },
        status: 'failed',
        createdAt: new Date(startTime),
        completedAt: new Date(),
      };
    }
  }

  /**
   * Execute workflow with automation mode consideration
   */
  async executeWithAutomation(
    workspaceId: string,
    workflowName: string,
    agents: AgentType[],
    input: any,
    context?: {
      platform?: string;
      contentType?: string;
      performance?: any;
    },
  ): Promise<{
    result: CollaborativeWorkflowResult;
    shouldAutoPublish: boolean;
    requiresApproval: boolean;
  }> {
    this.logger.log(
      `Executing workflow with automation: ${workflowName} for workspace ${workspaceId}`,
    );

    // Evaluate automation rules
    const ruleEvaluation = await this.automationConfig.evaluateRules(
      workspaceId,
      context || {},
    );

    // Execute workflow
    const result = await this.executeCollaborativeWorkflow(
      workspaceId,
      workflowName,
      agents,
      input,
    );

    return {
      result,
      shouldAutoPublish: ruleEvaluation.shouldAutoPublish,
      requiresApproval: ruleEvaluation.requiresApproval,
    };
  }

  /**
   * Execute agents with learning from history
   */
  async executeWithLearning(
    workspaceId: string,
    agentType: AgentType,
    input: any,
  ): Promise<{
    result: AgentTaskResult;
    learningInsights: any;
    recommendations: string[];
  }> {
    this.logger.log(
      `Executing agent ${agentType} with learning for workspace ${workspaceId}`,
    );

    // Get learning insights
    const learningInsights = await this.taskHistory.getLearningInsights(
      workspaceId,
      agentType,
    );

    // Enhance input with learning data
    const enhancedInput = {
      ...input,
      learningInsights: learningInsights.insights,
    };

    // Execute task
    const task: AgentTask = {
      id: `task-${Date.now()}-${Math.random()}`,
      agentType,
      input: enhancedInput,
      context: {
        learningEnabled: true,
      },
      priority: 'medium',
      workspaceId,
    };

    const result = await this.aiCoordinator.executeAgentTask(task);

    // Record in history
    await this.taskHistory.recordTask(
      workspaceId,
      task.id,
      agentType,
      input,
      result.output,
      result,
    );

    // Generate recommendations based on learning
    const recommendations = this.generateRecommendations(
      learningInsights,
      result,
    );

    return {
      result,
      learningInsights,
      recommendations,
    };
  }

  /**
   * Get workflow execution context
   */
  async getWorkflowContext(
    workflowId: string,
  ): Promise<WorkflowExecutionContext | null> {
    this.logger.debug(`Getting workflow context for ${workflowId}`);

    // Get communication history
    const agentMessages = this.communication.getMessageHistory(workflowId);

    if (agentMessages.length === 0) {
      return null;
    }

    // In a real implementation, this would reconstruct full context from database
    return {
      workflowId,
      workspaceId: '', // Would be retrieved from database
      automationMode: AutomationMode.ASSISTED,
      agentMessages,
      sharedState: {},
      executionHistory: [],
    };
  }

  /**
   * Get orchestration statistics
   */
  async getOrchestrationStats(workspaceId: string): Promise<{
    totalWorkflows: number;
    successRate: number;
    avgExecutionTime: number;
    avgCost: number;
    avgCollaborationEfficiency: number;
    mostUsedAgents: Array<{ agentType: AgentType; count: number }>;
    communicationStats: any;
  }> {
    this.logger.debug(`Getting orchestration stats for workspace ${workspaceId}`);

    // Get communication stats
    const communicationStats = this.communication.getCommunicationStats();

    // In a real implementation, this would aggregate from database
    return {
      totalWorkflows: 125,
      successRate: 0.94,
      avgExecutionTime: 8500,
      avgCost: 0.045,
      avgCollaborationEfficiency: 0.82,
      mostUsedAgents: [
        { agentType: AgentType.CONTENT_CREATOR, count: 85 },
        { agentType: AgentType.STRATEGY, count: 72 },
        { agentType: AgentType.ENGAGEMENT, count: 58 },
      ],
      communicationStats,
    };
  }

  /**
   * Calculate collaboration efficiency score
   */
  private calculateCollaborationEfficiency(
    contributions: CollaborativeWorkflowResult['agentContributions'],
    messages: AgentMessage[],
  ): number {
    // Factors:
    // 1. Number of successful contributions vs total agents
    // 2. Communication efficiency (messages per contribution)
    // 3. Time efficiency (no agent took too long)

    const successfulContributions = contributions.filter(
      (c) => c.contribution !== null,
    ).length;
    const contributionRate = successfulContributions / contributions.length;

    const messagesPerContribution = messages.length / contributions.length;
    const communicationEfficiency = Math.max(
      0,
      1 - (messagesPerContribution - 2) / 10,
    ); // Optimal is 2 messages per contribution

    const avgExecutionTime =
      contributions.reduce((sum, c) => sum + c.executionTime, 0) /
      contributions.length;
    const timeEfficiency = avgExecutionTime < 5000 ? 1 : 5000 / avgExecutionTime;

    // Weighted average
    return (
      contributionRate * 0.5 +
      communicationEfficiency * 0.3 +
      timeEfficiency * 0.2
    );
  }

  /**
   * Generate recommendations based on learning insights
   */
  private generateRecommendations(
    learningInsights: any,
    result: AgentTaskResult,
  ): string[] {
    const recommendations: string[] = [];

    // Check execution time
    if (result.executionTime > 5000) {
      recommendations.push(
        'Consider optimizing prompts to reduce execution time',
      );
    }

    // Check cost
    if (result.cost > 0.05) {
      recommendations.push('Consider using more cost-efficient models');
    }

    // Add learning-based recommendations
    if (learningInsights.insights.bestPractices) {
      recommendations.push(
        `Apply best practice: ${learningInsights.insights.bestPractices[0]}`,
      );
    }

    return recommendations;
  }
}
