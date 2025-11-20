# Multi-Agent Orchestration System

## Overview

The Multi-Agent Orchestration System implements advanced CrewAI-like patterns for coordinating multiple AI agents with full communication protocols, task history tracking, automation modes, and performance monitoring.

## Features

### 1. Agent Communication Protocols

Agents can communicate with each other through structured message passing:

- **Message Types**: request, response, notification, feedback
- **Communication Patterns**: point-to-point, broadcast, feedback loops
- **Message History**: Complete audit trail of agent interactions
- **Context Sharing**: Agents share context and build upon each other's work

**Example:**
```typescript
// Send a message from one agent to another
await communicationService.sendMessage({
  id: 'msg-123',
  fromAgent: AgentType.STRATEGY,
  toAgent: AgentType.CONTENT_CREATOR,
  messageType: 'request',
  content: {
    type: 'content_generation',
    strategy: 'Focus on engagement',
  },
  timestamp: new Date(),
});

// Broadcast to all agents
await communicationService.broadcastMessage({
  id: 'msg-124',
  fromAgent: AgentType.ANALYTICS,
  messageType: 'notification',
  content: {
    type: 'performance_update',
    metrics: { engagement: 0.85 },
  },
  timestamp: new Date(),
});
```

### 2. Task History and Learning

The system maintains comprehensive task history and extracts learning insights:

- **Task Recording**: Every agent execution is recorded with full context
- **Feedback Collection**: Users can rate and provide feedback on agent outputs
- **Learning Extraction**: System identifies successful patterns and common mistakes
- **Performance Trends**: Track agent performance over time
- **Best Practices**: Automatically identify and recommend best practices

**Example:**
```typescript
// Record task execution
await taskHistoryService.recordTask(
  workspaceId,
  taskId,
  AgentType.CONTENT_CREATOR,
  input,
  output,
  result,
  workflowId,
);

// Add user feedback
await taskHistoryService.addFeedback(taskId, {
  rating: 5,
  wasUseful: true,
  performanceMetrics: {
    engagement: 245,
    reach: 12000,
  },
  comments: 'Great content, very engaging!',
});

// Get learning insights
const insights = await taskHistoryService.getLearningInsights(
  workspaceId,
  AgentType.CONTENT_CREATOR,
);
```

### 3. Automation Modes

Four automation modes control how AI agents operate:

#### Full Autonomous Mode
- AI generates, schedules, and publishes content automatically
- No human approval required
- Best for: Established brands with proven content strategies

#### Assisted Mode (Default)
- AI generates content
- Human approval required before publishing
- Best for: Most users, balanced control and automation

#### Manual Mode
- User creates content
- AI provides suggestions and improvements
- Best for: Users who prefer full control

#### Hybrid Mode
- Mix of autonomous and assisted based on rules
- Configurable rules determine behavior
- Best for: Advanced users with specific workflows

**Example:**
```typescript
// Set automation mode
await automationConfigService.setMode(
  workspaceId,
  AutomationMode.HYBRID,
);

// Add automation rule
await automationConfigService.addRule(workspaceId, {
  name: 'Auto-publish high-performing content',
  condition: {
    type: 'performance',
    operator: 'greater_than',
    value: 0.8,
  },
  action: {
    type: 'auto_publish',
  },
  priority: 10,
  isActive: true,
});

// Evaluate rules for context
const evaluation = await automationConfigService.evaluateRules(
  workspaceId,
  {
    platform: 'instagram',
    contentType: 'image',
    performance: 0.85,
  },
);
// Returns: { shouldAutoPublish: true, requiresApproval: false }
```

### 4. Performance Monitoring

Comprehensive monitoring of agent performance:

- **Real-time Metrics**: Success rate, execution time, cost, cache hit rate
- **Performance Trends**: Track improvements or degradations over time
- **Agent Comparison**: Compare performance across different agents
- **Health Monitoring**: Identify agents with issues
- **Cost Analysis**: Track and optimize AI spending
- **Alerts**: Automatic alerts for performance issues

**Example:**
```typescript
// Get performance metrics
const metrics = await performanceMonitor.getPerformanceMetrics(
  workspaceId,
  AgentType.CONTENT_CREATOR,
  startDate,
  endDate,
);

// Get performance dashboard
const dashboard = await performanceMonitor.getPerformanceDashboard(
  workspaceId,
);

// Compare agents
const comparison = await performanceMonitor.compareAgents(
  workspaceId,
  [AgentType.CONTENT_CREATOR, AgentType.STRATEGY],
  startDate,
  endDate,
);

// Get agent health
const health = await performanceMonitor.getAgentHealth(
  workspaceId,
  AgentType.CONTENT_CREATOR,
);
```

### 5. Collaborative Workflows

Execute complex workflows with multiple agents collaborating:

**Example:**
```typescript
// Execute collaborative workflow
const result = await orchestrator.executeCollaborativeWorkflow(
  workspaceId,
  'Content Generation Workflow',
  [
    AgentType.STRATEGY,
    AgentType.CONTENT_CREATOR,
    AgentType.ENGAGEMENT,
  ],
  {
    topic: 'AI in Marketing',
    platform: 'linkedin',
    targetAudience: 'Marketing professionals',
  },
);

// Result includes:
// - Agent contributions
// - Communication log
// - Performance metrics
// - Collaboration efficiency score
```

## API Endpoints

### Workflow Execution

```
POST /api/ai/orchestration/workflows/execute
Body: {
  workflowName: string,
  agents: AgentType[],
  input: any,
  context?: any
}
```

### Automation Configuration

```
GET    /api/ai/orchestration/automation/config
PUT    /api/ai/orchestration/automation/config
PUT    /api/ai/orchestration/automation/mode
POST   /api/ai/orchestration/automation/rules
PUT    /api/ai/orchestration/automation/rules/:ruleId
DELETE /api/ai/orchestration/automation/rules/:ruleId
POST   /api/ai/orchestration/automation/rules/evaluate
```

### Task History

```
GET  /api/ai/orchestration/tasks/history
GET  /api/ai/orchestration/tasks/:taskId
POST /api/ai/orchestration/tasks/:taskId/feedback
GET  /api/ai/orchestration/learning/:agentType
GET  /api/ai/orchestration/learning/:agentType/patterns
GET  /api/ai/orchestration/learning/:agentType/trends
```

### Performance Monitoring

```
GET  /api/ai/orchestration/performance/:agentType
GET  /api/ai/orchestration/performance/dashboard
POST /api/ai/orchestration/performance/compare
GET  /api/ai/orchestration/performance/:agentType/health
GET  /api/ai/orchestration/performance/cost-analysis
GET  /api/ai/orchestration/performance/alerts
POST /api/ai/orchestration/performance/report
```

## Architecture

### Service Layer

1. **EnhancedMultiAgentOrchestratorService**: Main orchestration logic
2. **AgentCommunicationService**: Message passing between agents
3. **AgentTaskHistoryService**: Task recording and learning
4. **AutomationConfigService**: Automation mode and rules management
5. **AgentPerformanceMonitorService**: Performance tracking and analysis

### Data Flow

```
User Request
    ↓
OrchestrationController
    ↓
EnhancedMultiAgentOrchestratorService
    ↓
┌─────────────────────────────────────┐
│  Agent Communication Protocol       │
│  ↓                                  │
│  Agent 1 → Message → Agent 2        │
│  ↓                                  │
│  Task History Recording             │
│  ↓                                  │
│  Performance Monitoring             │
└─────────────────────────────────────┘
    ↓
Result + Metrics + Insights
```

## Configuration

### Environment Variables

```env
# AI Configuration
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key

# Automation Defaults
DEFAULT_AUTOMATION_MODE=assisted
ENABLE_AGENT_LEARNING=true
ENABLE_PERFORMANCE_MONITORING=true

# Performance Thresholds
MAX_EXECUTION_TIME_MS=5000
MAX_COST_PER_TASK=0.05
MIN_SUCCESS_RATE=0.90
```

### Workspace Configuration

Each workspace can configure:
- Automation mode
- Enabled agents
- Automation rules
- Performance thresholds
- Budget limits

## Best Practices

### 1. Start with Assisted Mode
Begin with Assisted mode to understand agent behavior before enabling full automation.

### 2. Provide Feedback
Rate agent outputs to improve learning and recommendations.

### 3. Monitor Performance
Regularly review performance dashboards to identify optimization opportunities.

### 4. Use Hybrid Mode for Complex Workflows
Create rules that automate routine tasks while requiring approval for sensitive content.

### 5. Leverage Learning Insights
Review learning insights to understand what works best for your audience.

## Troubleshooting

### Agent Not Responding
- Check if agent is enabled in automation config
- Verify workspace budget hasn't been exceeded
- Review performance health status

### Low Collaboration Efficiency
- Reduce number of agents in workflow
- Optimize agent prompts
- Review communication patterns

### High Costs
- Increase cache TTL
- Route more requests to cost-efficient models
- Use batch processing for non-urgent tasks

## Future Enhancements

- [ ] Persistent storage for task history in database
- [ ] Advanced learning algorithms (reinforcement learning)
- [ ] Agent specialization based on workspace data
- [ ] Real-time collaboration visualization
- [ ] A/B testing framework for agent configurations
- [ ] Integration with external ML models
- [ ] Custom agent creation interface

## Related Documentation

- [AI Infrastructure](./README.md)
- [Content Creator Agent](./agents/CONTENT_CREATOR_AGENT.md)
- [Strategy Agent](./agents/STRATEGY_AGENT.md)
- [Hashtag Intelligence Agent](./agents/HASHTAG_INTELLIGENCE_AGENT.md)
