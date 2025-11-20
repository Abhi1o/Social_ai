export enum AIModel {
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
  CLAUDE_3_5_SONNET = 'claude-3-5-sonnet-20241022',
  CLAUDE_HAIKU = 'claude-3-haiku-20240307',
}

export enum ModelTier {
  PREMIUM = 'premium',
  COST_EFFICIENT = 'cost_efficient',
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  workspaceId: string;
  cacheKey?: string;
  cacheTTL?: number;
}

export interface AICompletionResponse {
  content: string;
  model: AIModel;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  cached: boolean;
}

export interface ModelConfig {
  model: AIModel;
  tier: ModelTier;
  costPer1kTokens: {
    input: number;
    output: number;
  };
  maxTokens: number;
  contextWindow: number;
}

export interface CostTrackingEntry {
  workspaceId: string;
  model: AIModel;
  tokensUsed: number;
  cost: number;
  timestamp: Date;
  requestType: string;
}

export interface WorkspaceBudget {
  workspaceId: string;
  monthlyBudget: number;
  currentSpend: number;
  alertThreshold: number;
  isThrottled: boolean;
}

export interface CacheEntry {
  key: string;
  value: string;
  ttl: number;
  createdAt: Date;
}

export interface AgentConfig {
  name: string;
  type: AgentType;
  personality: string;
  systemPrompt: string;
  preferredModel: AIModel;
  temperature: number;
  maxTokens: number;
}

export enum AgentType {
  CONTENT_CREATOR = 'content_creator',
  STRATEGY = 'strategy',
  ENGAGEMENT = 'engagement',
  ANALYTICS = 'analytics',
  TREND_DETECTION = 'trend_detection',
  COMPETITOR_ANALYSIS = 'competitor_analysis',
  CRISIS_MANAGEMENT = 'crisis_management',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
}

export interface AgentTask {
  id: string;
  agentType: AgentType;
  input: any;
  context?: any;
  priority: 'low' | 'medium' | 'high';
  workspaceId: string;
}

export interface AgentTaskResult {
  taskId: string;
  agentType: AgentType;
  output: any;
  tokensUsed: number;
  cost: number;
  executionTime: number;
}
