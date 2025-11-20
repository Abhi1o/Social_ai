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
} from '../interfaces/orchestration.interface';

/**
 * Multi-Agent Orchestration Service
 * Implements CrewAI-like patterns for coordinating multiple AI agents
 * with communication protocols, task history, automation modes, and performance monitoring
 */
@Injectable()
export class MultiAgentOrchestratorService {
  private readonly logger = new Logger(MultiAgentOrchestratorService.name);

  constructor(
    private readonly aiCoordinator: AICoordinatorService,
    private readonly communication: AgentCommunicationService,
    private readonly taskHistory: AgentTaskHistoryService,
    private readonly automationConfig: AutomationConfigService,
    private readonly performanceMonitor: AgentPerformanceMonitorService,
  ) {}

  /**
   * Execute a workflow with multiple agents collaborating
   */
  async executeWorkflow(workflow: AgentWorkflow): Promise<WorkflowResult> {
    const startTime = Date.now();
    this.logger.log(`Starting workflow: ${workflow.name}`);

    const results: AgentTaskResult[] = [];
    let context: any = workflow.initialContext || {};

    try {
      for (const step of workflow.steps) {
        this.logger.debug(`Executing step: ${step.name}`);

        // Execute agent task with accumulated context
        const task: AgentTask = {
          id: `${workflow.id}-${step.name}-${Date.now()}`,
          agentType: step.agentType,
          input: step.input,
          context: {
            ...context,
            previousResults: results,
          },
          priority: step.priority || 'medium',
          workspaceId: workflow.workspaceId,
        };

        const result = await this.aiCoordinator.executeAgentTask(task);
        results.push(result);

        // Update context with result
        context[step.name] = result.output;

        // Check if we should continue based on step condition
        if (step.continueCondition && !step.continueCondition(result)) {
          this.logger.log(`Workflow stopped at step: ${step.name}`);
          break;
        }
      }

      const executionTime = Date.now() - startTime;
      const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
      const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);

      this.logger.log(
        `Workflow completed: ${workflow.name} (${executionTime}ms, ${totalTokens} tokens, $${totalCost.toFixed(4)})`,
      );

      return {
        workflowId: workflow.id,
        name: workflow.name,
        status: 'completed',
        results,
        finalContext: context,
        executionTime,
        totalCost,
        totalTokens,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Workflow error: ${err.message}`, err.stack);
      return {
        workflowId: workflow.id,
        name: workflow.name,
        status: 'failed',
        results,
        finalContext: context,
        executionTime: Date.now() - startTime,
        totalCost: results.reduce((sum, r) => sum + r.cost, 0),
        totalTokens: results.reduce((sum, r) => sum + r.tokensUsed, 0),
        error: err.message,
      };
    }
  }

  /**
   * Execute agents in parallel
   */
  async executeParallel(
    tasks: AgentTask[],
  ): Promise<AgentTaskResult[]> {
    this.logger.log(`Executing ${tasks.length} agents in parallel`);

    const promises = tasks.map((task) =>
      this.aiCoordinator.executeAgentTask(task),
    );

    return Promise.all(promises);
  }

  /**
   * Execute agents in sequence with context passing
   */
  async executeSequence(
    tasks: AgentTask[],
  ): Promise<AgentTaskResult[]> {
    this.logger.log(`Executing ${tasks.length} agents in sequence`);

    const results: AgentTaskResult[] = [];
    let context: any = {};

    for (const task of tasks) {
      // Add previous results to context
      task.context = {
        ...task.context,
        previousResults: results,
        accumulatedContext: context,
      };

      const result = await this.aiCoordinator.executeAgentTask(task);
      results.push(result);

      // Update context
      context[task.agentType] = result.output;
    }

    return results;
  }

  /**
   * Create a content generation workflow
   * Strategy Agent -> Content Creator Agent -> Engagement Agent
   */
  async createContentWorkflow(
    workspaceId: string,
    input: {
      topic: string;
      platform: string;
      brandVoice?: string;
      targetAudience?: string;
    },
  ): Promise<WorkflowResult> {
    const workflow: AgentWorkflow = {
      id: `content-${Date.now()}`,
      name: 'Content Generation Workflow',
      workspaceId,
      initialContext: input,
      steps: [
        {
          name: 'strategy',
          agentType: AgentType.STRATEGY,
          input: {
            task: 'Analyze the topic and provide strategic recommendations for content creation',
            topic: input.topic,
            platform: input.platform,
            targetAudience: input.targetAudience,
          },
          priority: 'high',
        },
        {
          name: 'content_creation',
          agentType: AgentType.CONTENT_CREATOR,
          input: {
            task: 'Create engaging content based on the strategy',
            topic: input.topic,
            platform: input.platform,
            brandVoice: input.brandVoice,
          },
          priority: 'high',
        },
        {
          name: 'engagement_optimization',
          agentType: AgentType.ENGAGEMENT,
          input: {
            task: 'Optimize the content for engagement and suggest improvements',
            platform: input.platform,
          },
          priority: 'medium',
        },
      ],
    };

    return this.executeWorkflow(workflow);
  }

  /**
   * Create a crisis detection and response workflow
   * Sentiment Analysis -> Crisis Detection -> Crisis Management
   */
  async createCrisisWorkflow(
    workspaceId: string,
    input: {
      mentions: any[];
      brand: string;
    },
  ): Promise<WorkflowResult> {
    const workflow: AgentWorkflow = {
      id: `crisis-${Date.now()}`,
      name: 'Crisis Detection Workflow',
      workspaceId,
      initialContext: input,
      steps: [
        {
          name: 'sentiment_analysis',
          agentType: AgentType.SENTIMENT_ANALYSIS,
          input: {
            task: 'Analyze sentiment of mentions',
            mentions: input.mentions,
          },
          priority: 'high',
        },
        {
          name: 'crisis_detection',
          agentType: AgentType.CRISIS_MANAGEMENT,
          input: {
            task: 'Detect potential crisis situations',
            brand: input.brand,
          },
          priority: 'high',
          continueCondition: (result) => {
            // Only continue if crisis detected
            try {
              const output = JSON.parse(result.output);
              return output.crisisDetected === true;
            } catch {
              return false;
            }
          },
        },
        {
          name: 'crisis_response',
          agentType: AgentType.CRISIS_MANAGEMENT,
          input: {
            task: 'Generate crisis response strategy',
            brand: input.brand,
          },
          priority: 'high',
        },
      ],
    };

    return this.executeWorkflow(workflow);
  }

  /**
   * Create a competitive analysis workflow
   * Competitor Analysis -> Strategy -> Content Recommendations
   */
  async createCompetitiveAnalysisWorkflow(
    workspaceId: string,
    input: {
      competitors: string[];
      industry: string;
    },
  ): Promise<WorkflowResult> {
    const workflow: AgentWorkflow = {
      id: `competitive-${Date.now()}`,
      name: 'Competitive Analysis Workflow',
      workspaceId,
      initialContext: input,
      steps: [
        {
          name: 'competitor_analysis',
          agentType: AgentType.COMPETITOR_ANALYSIS,
          input: {
            task: 'Analyze competitor strategies and content',
            competitors: input.competitors,
            industry: input.industry,
          },
          priority: 'medium',
        },
        {
          name: 'strategy_recommendations',
          agentType: AgentType.STRATEGY,
          input: {
            task: 'Provide strategic recommendations based on competitive analysis',
            industry: input.industry,
          },
          priority: 'medium',
        },
        {
          name: 'content_recommendations',
          agentType: AgentType.CONTENT_CREATOR,
          input: {
            task: 'Suggest content ideas based on competitive gaps',
            industry: input.industry,
          },
          priority: 'low',
        },
      ],
    };

    return this.executeWorkflow(workflow);
  }

  /**
   * Create a trend analysis and content workflow
   * Trend Detection -> Strategy -> Content Creation
   */
  async createTrendContentWorkflow(
    workspaceId: string,
    input: {
      platform: string;
      industry: string;
    },
  ): Promise<WorkflowResult> {
    const workflow: AgentWorkflow = {
      id: `trend-${Date.now()}`,
      name: 'Trend-Based Content Workflow',
      workspaceId,
      initialContext: input,
      steps: [
        {
          name: 'trend_detection',
          agentType: AgentType.TREND_DETECTION,
          input: {
            task: 'Identify current trends and viral topics',
            platform: input.platform,
            industry: input.industry,
          },
          priority: 'high',
        },
        {
          name: 'strategy',
          agentType: AgentType.STRATEGY,
          input: {
            task: 'Develop strategy to leverage trends',
            platform: input.platform,
          },
          priority: 'medium',
        },
        {
          name: 'content_creation',
          agentType: AgentType.CONTENT_CREATOR,
          input: {
            task: 'Create trend-based content',
            platform: input.platform,
          },
          priority: 'high',
        },
      ],
    };

    return this.executeWorkflow(workflow);
  }
}

/**
 * Workflow definition
 */
export interface AgentWorkflow {
  id: string;
  name: string;
  workspaceId: string;
  initialContext?: any;
  steps: WorkflowStep[];
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  name: string;
  agentType: AgentType;
  input: any;
  priority?: 'low' | 'medium' | 'high';
  continueCondition?: (result: AgentTaskResult) => boolean;
  broadcastResult?: boolean;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  workflowId: string;
  name: string;
  status: 'completed' | 'failed';
  results: AgentTaskResult[];
  finalContext: any;
  executionTime: number;
  totalCost: number;
  totalTokens: number;
  error?: string;
  agentMessages?: any[];
  automationMode?: any;
}
