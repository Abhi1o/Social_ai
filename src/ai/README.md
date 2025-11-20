# AI Infrastructure

This module provides a comprehensive AI infrastructure for the social media management platform, featuring multi-agent orchestration, intelligent model routing, cost tracking, and response caching.

## Architecture Overview

The AI infrastructure is built on several key components:

1. **AI Coordinator Service** - Main orchestration layer for AI completions
2. **Model Routing Service** - Intelligent routing between models (70% cost-efficient, 30% premium)
3. **Cost Tracking Service** - Per-workspace budget management and cost monitoring
4. **Cache Service** - Redis-based response caching with configurable TTL
5. **Multi-Agent Orchestrator** - CrewAI-like workflow orchestration for agent collaboration
6. **LangChain Service** - Advanced LLM application framework with prompt templates and chains
7. **Provider Services** - OpenAI and Anthropic API integrations

## Features

### 1. Multi-Model Support

- **OpenAI Models**: GPT-4o, GPT-4o-mini
- **Anthropic Models**: Claude 3.5 Sonnet, Claude Haiku
- Automatic model selection based on routing strategy
- Fallback mechanisms for API failures

### 2. Intelligent Model Routing

The system implements a 70/30 routing strategy:
- 70% of requests go to cost-efficient models (GPT-4o-mini, Claude Haiku)
- 30% of requests go to premium models (GPT-4o, Claude 3.5 Sonnet)

This achieves optimal balance between cost and quality, targeting $0.50-$2.00 per user per month.

### 3. Cost Optimization

**Caching Strategy:**
- 24-hour TTL for general content generation
- 7-day TTL for brand voice analysis
- 1-hour TTL for real-time tasks (engagement, trends)
- 30-minute TTL for crisis management

**Budget Management:**
- Per-workspace monthly budgets
- Automatic throttling at budget limits
- Alert thresholds (default 80%)
- Real-time cost tracking

**Batch Processing:**
- Support for non-urgent batch requests
- 50% cost savings through OpenAI Batch API

### 4. Multi-Agent System

Eight specialized AI agents:

1. **Content Creator Agent** - Creative content generation
2. **Strategy Agent** - Data-driven strategic recommendations
3. **Engagement Agent** - Community management and responses
4. **Analytics Agent** - Data analysis and insights
5. **Trend Detection Agent** - Emerging topics and viral content
6. **Competitor Analysis Agent** - Competitive intelligence
7. **Crisis Management Agent** - PR crisis detection and response
8. **Sentiment Analysis Agent** - Emotional tone analysis

### 5. Workflow Orchestration

Pre-built workflows for common use cases:

- **Content Generation Workflow**: Strategy → Content Creation → Engagement Optimization
- **Crisis Detection Workflow**: Sentiment Analysis → Crisis Detection → Response Strategy
- **Competitive Analysis Workflow**: Competitor Analysis → Strategy → Content Recommendations
- **Trend Content Workflow**: Trend Detection → Strategy → Content Creation

## API Endpoints

### Completions

```typescript
POST /api/ai/complete
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant" },
    { "role": "user", "content": "Generate a tweet about AI" }
  ],
  "temperature": 0.7,
  "maxTokens": 1000
}
```

### Agent Execution

```typescript
POST /api/ai/agent/execute
{
  "agentType": "content_creator",
  "input": {
    "topic": "AI in social media",
    "platform": "twitter"
  },
  "priority": "high"
}
```

### Workflows

```typescript
POST /api/ai/workflows/content
{
  "topic": "AI trends 2024",
  "platform": "linkedin",
  "brandVoice": "professional and insightful",
  "targetAudience": "tech professionals"
}
```

### Cost Management

```typescript
GET /api/ai/budget
POST /api/ai/budget
{
  "monthlyBudget": 100,
  "alertThreshold": 0.8
}

GET /api/ai/costs/breakdown
GET /api/ai/costs/history
```

### Statistics

```typescript
GET /api/ai/stats
GET /api/ai/routing/stats
GET /api/ai/cache/stats
```

### LangChain Operations

```typescript
// Generate content
POST /api/ai/langchain/content
{
  "topic": "AI trends 2024",
  "platform": "linkedin",
  "tone": "professional",
  "brandVoice": "thought leadership",
  "targetAudience": "tech professionals"
}

// Analyze sentiment
POST /api/ai/langchain/sentiment
{
  "text": "This product is amazing!"
}

// Generate hashtags
POST /api/ai/langchain/hashtags
{
  "content": "Excited to announce our new AI feature!",
  "platform": "twitter",
  "count": 10
}

// Generate strategy
POST /api/ai/langchain/strategy
{
  "goals": ["Increase engagement", "Grow followers"],
  "currentPerformance": { "engagement": 2.5 },
  "industry": "SaaS",
  "targetAudience": "B2B marketers"
}

// Crisis response
POST /api/ai/langchain/crisis
{
  "situation": "Negative reviews about product quality",
  "brand": "YourBrand",
  "tone": "empathetic"
}

// Competitive analysis
POST /api/ai/langchain/competitors
{
  "competitors": ["Competitor1", "Competitor2"],
  "competitorData": [...],
  "industry": "SaaS"
}

// Trend detection
POST /api/ai/langchain/trends
{
  "platform": "twitter",
  "industry": "technology",
  "recentContent": [...]
}
```

## Usage Examples

### Simple Completion

```typescript
import { AICoordinatorService } from './services/ai-coordinator.service';

const response = await aiCoordinator.complete({
  messages: [
    { role: 'system', content: 'You are a social media expert' },
    { role: 'user', content: 'Write a tweet about AI' }
  ],
  workspaceId: 'workspace-123',
  temperature: 0.8,
  maxTokens: 280
});

console.log(response.content);
console.log(`Cost: $${response.cost.toFixed(4)}`);
console.log(`Tokens: ${response.tokensUsed.total}`);
```

### Agent Task Execution

```typescript
import { AgentType } from './interfaces/ai.interface';

const result = await aiCoordinator.executeAgentTask({
  id: 'task-123',
  agentType: AgentType.CONTENT_CREATOR,
  input: {
    topic: 'AI in marketing',
    platform: 'linkedin',
    tone: 'professional'
  },
  priority: 'high',
  workspaceId: 'workspace-123'
});

console.log(result.output);
console.log(`Execution time: ${result.executionTime}ms`);
```

### Multi-Agent Workflow

```typescript
import { MultiAgentOrchestratorService } from './services/multi-agent-orchestrator.service';

const workflowResult = await orchestrator.createContentWorkflow(
  'workspace-123',
  {
    topic: 'Future of AI',
    platform: 'twitter',
    brandVoice: 'innovative and forward-thinking',
    targetAudience: 'tech enthusiasts'
  }
);

console.log('Strategy:', workflowResult.finalContext.strategy);
console.log('Content:', workflowResult.finalContext.content_creation);
console.log('Optimization:', workflowResult.finalContext.engagement_optimization);
console.log(`Total cost: $${workflowResult.totalCost.toFixed(4)}`);
```

## Configuration

### Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-...

# Redis Configuration (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Model Configuration

Models are configured in `ModelRoutingService` with pricing and capabilities:

```typescript
{
  [AIModel.GPT_4O]: {
    tier: ModelTier.PREMIUM,
    costPer1kTokens: { input: 0.0025, output: 0.01 },
    maxTokens: 4096,
    contextWindow: 128000,
  },
  [AIModel.GPT_4O_MINI]: {
    tier: ModelTier.COST_EFFICIENT,
    costPer1kTokens: { input: 0.00015, output: 0.0006 },
    maxTokens: 4096,
    contextWindow: 128000,
  }
}
```

## Cost Optimization Strategies

### 1. Aggressive Caching
- Cache similar requests for 24 hours
- Reduces API calls by ~40-60%
- Configurable TTL per agent type

### 2. Model Routing
- Route 70% to cost-efficient models
- Use premium models only when needed
- Automatic selection based on task priority

### 3. Batch Processing
- Queue non-urgent tasks
- Process in batches for 50% savings
- Ideal for scheduled content generation

### 4. Budget Controls
- Per-workspace monthly limits
- Automatic throttling
- Alert notifications at thresholds

## Performance Metrics

Target metrics:
- API response time: < 200ms (p95) excluding LLM latency
- Cache hit rate: > 40%
- Cost per user: $0.50-$2.00/month
- Model routing accuracy: 70/30 split

## Monitoring

The system provides comprehensive monitoring:

```typescript
// Get workspace statistics
const stats = await aiCoordinator.getWorkspaceStats('workspace-123');

console.log('Budget:', stats.budget);
console.log('Cost breakdown:', stats.costBreakdown);
console.log('Routing stats:', stats.routingStats);
console.log('Cache stats:', stats.cacheStats);
```

## Error Handling

All services implement comprehensive error handling:
- Automatic retries for transient failures
- Fallback to alternative models
- Budget exceeded errors
- Rate limiting protection

## Security

- API keys stored in environment variables
- Workspace isolation for cost tracking
- JWT authentication required for all endpoints
- Budget limits prevent runaway costs

## Future Enhancements

- [ ] Fine-tuning support for brand voice
- [ ] Custom model endpoints
- [ ] Advanced workflow builder UI
- [ ] A/B testing for model selection
- [ ] Real-time cost alerts via webhooks
- [ ] Integration with LangSmith for observability
- [ ] Support for additional LLM providers

## Requirements Satisfied

This implementation satisfies the following requirements:

- **7.1**: Multi-model support (OpenAI GPT-4o, GPT-4o-mini, Anthropic Claude 3.5 Sonnet, Haiku)
- **7.2**: Aggressive caching with 24-hour TTL
- **7.3**: Batch processing support
- **7.4**: Real-time cost tracking per workspace
- **7.5**: Target AI costs of $0.50-$2.00 per user per month
- **2.1-2.5**: Multi-agent system with specialized agents
- **3.2**: AI-powered automation modes

## Testing

Run tests:
```bash
npm test src/ai
```

Run integration tests:
```bash
npm run test:e2e
```

## Support

For issues or questions, please refer to the main project documentation or create an issue in the repository.
