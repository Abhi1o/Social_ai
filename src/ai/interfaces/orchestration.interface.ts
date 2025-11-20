/**
 * Multi-Agent Orchestration Interfaces
 * Defines types for agent communication, task history, automation modes, and performance monitoring
 */

import { AgentType, AgentTaskResult } from './ai.interface';

/**
 * Automation modes for AI agent behavior
 */
export enum AutomationMode {
  FULL_AUTONOMOUS = 'full_autonomous', // AI generates and publishes without approval
  ASSISTED = 'assisted', // AI generates, user approves before publishing
  MANUAL = 'manual', // User creates content, AI provides suggestions
  HYBRID = 'hybrid', // Mix of autonomous and assisted based on rules
}

/**
 * Automation configuration per workspace
 */
export interface AutomationConfig {
  workspaceId: string;
  mode: AutomationMode;
  rules?: AutomationRule[];
  enabledAgents: AgentType[];
  scheduleAutomation: boolean;
  contentApprovalRequired: boolean;
  maxDailyPosts?: number;
  allowedPlatforms?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Automation rule for hybrid mode
 */
export interface AutomationRule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  isActive: boolean;
}

export interface RuleCondition {
  type: 'platform' | 'content_type' | 'time' | 'performance' | 'sentiment';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface RuleAction {
  type: 'auto_publish' | 'require_approval' | 'skip' | 'notify';
  parameters?: any;
}

/**
 * Agent communication message
 */
export interface AgentMessage {
  id: string;
  fromAgent: AgentType;
  toAgent: AgentType;
  messageType: 'request' | 'response' | 'notification' | 'feedback';
  content: any;
  metadata?: {
    workflowId?: string;
    taskId?: string;
    priority?: 'low' | 'medium' | 'high';
  };
  timestamp: Date;
}

/**
 * Agent communication protocol
 */
export interface AgentCommunicationProtocol {
  sendMessage(message: AgentMessage): Promise<void>;
  receiveMessage(agentType: AgentType): Promise<AgentMessage[]>;
  broadcastMessage(message: Omit<AgentMessage, 'toAgent'>): Promise<void>;
  requestFeedback(
    fromAgent: AgentType,
    toAgent: AgentType,
    content: any,
  ): Promise<AgentMessage>;
}

/**
 * Agent task history entry
 */
export interface AgentTaskHistory {
  id: string;
  workspaceId: string;
  taskId: string;
  agentType: AgentType;
  input: any;
  output: any;
  result: AgentTaskResult;
  workflowId?: string;
  parentTaskId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  feedback?: TaskFeedback;
  learningData?: LearningData;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Task feedback for learning
 */
export interface TaskFeedback {
  rating: number; // 1-5
  wasUseful: boolean;
  userModifications?: string;
  performanceMetrics?: {
    engagement?: number;
    reach?: number;
    conversions?: number;
  };
  comments?: string;
}

/**
 * Learning data extracted from task execution
 */
export interface LearningData {
  successPatterns?: string[];
  failurePatterns?: string[];
  optimalParameters?: Record<string, any>;
  contextualInsights?: string[];
}

/**
 * Agent performance metrics
 */
export interface AgentPerformanceMetrics {
  agentType: AgentType;
  workspaceId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageExecutionTime: number;
    averageCost: number;
    averageTokensUsed: number;
    averageRating: number;
    cacheHitRate: number;
  };
  performanceTrends: {
    timestamp: Date;
    successRate: number;
    avgExecutionTime: number;
    avgCost: number;
  }[];
  topPerformingTasks: {
    taskId: string;
    rating: number;
    executionTime: number;
  }[];
  commonFailures: {
    errorType: string;
    count: number;
  }[];
}

/**
 * Workflow execution context
 */
export interface WorkflowExecutionContext {
  workflowId: string;
  workspaceId: string;
  automationMode: AutomationMode;
  agentMessages: AgentMessage[];
  sharedState: Record<string, any>;
  executionHistory: AgentTaskHistory[];
}

/**
 * Agent learning insights
 */
export interface AgentLearningInsights {
  agentType: AgentType;
  workspaceId: string;
  insights: {
    bestPractices: string[];
    commonMistakes: string[];
    optimalSettings: Record<string, any>;
    contentPatterns: {
      pattern: string;
      successRate: number;
      avgEngagement: number;
    }[];
    platformSpecificLearnings: Record<
      string,
      {
        bestTimes: string[];
        optimalLength: number;
        effectiveHashtags: string[];
      }
    >;
  };
  lastUpdated: Date;
}

/**
 * Collaborative workflow result
 */
export interface CollaborativeWorkflowResult {
  workflowId: string;
  workspaceId: string;
  automationMode: AutomationMode;
  participatingAgents: AgentType[];
  agentContributions: {
    agentType: AgentType;
    contribution: any;
    executionTime: number;
    cost: number;
  }[];
  finalOutput: any;
  communicationLog: AgentMessage[];
  performanceMetrics: {
    totalExecutionTime: number;
    totalCost: number;
    totalTokens: number;
    collaborationEfficiency: number; // 0-1 score
  };
  status: 'completed' | 'failed' | 'partial';
  createdAt: Date;
  completedAt: Date;
}
