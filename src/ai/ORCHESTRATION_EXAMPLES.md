# Multi-Agent Orchestration - Usage Examples

## Table of Contents
1. [Basic Workflow Execution](#basic-workflow-execution)
2. [Automation Configuration](#automation-configuration)
3. [Learning and Feedback](#learning-and-feedback)
4. [Performance Monitoring](#performance-monitoring)
5. [Advanced Scenarios](#advanced-scenarios)

## Basic Workflow Execution

### Example 1: Simple Content Generation Workflow

```typescript
// Execute a collaborative workflow with multiple agents
const result = await orchestrator.executeCollaborativeWorkflow(
  'workspace-123',
  'LinkedIn Content Generation',
  [
    AgentType.STRATEGY,
    AgentType.CONTENT_CREATOR,
    AgentType.ENGAGEMENT,
  ],
  {
    topic: 'The Future of AI in Marketing',
    platform: 'linkedin',
    targetAudience: 'Marketing professionals and CMOs',
    tone: 'professional',
  }
);

console.log('Workflow Result:', {
  status: result.status,
  participatingAgents: result.participatingAgents,
  totalCost: result.performanceMetrics.totalCost,
  executionTime: result.performanceMetrics.totalExecutionTime,
  collaborationEfficiency: result.performanceMetrics.collaborationEfficiency,
});

// Access individual agent contributions
result.agentContributions.forEach(contribution => {
  console.log(`${contribution.agentType}:`, contribution.contribution);
});

// Review communication log
console.log('Agent Messages:', result.communicationLog.length);
```

### Example 2: Workflow with Automation Rules

```typescript
// Execute workflow with automation context
const { result, shouldAutoPublish, requiresApproval } = 
  await orchestrator.executeWithAutomation(
    'workspace-123',
    'Instagram Post Creation',
    [AgentType.CONTENT_CREATOR, AgentType.ENGAGEMENT],
    {
      topic: 'Product Launch',
      platform: 'instagram',
    },
    {
      platform: 'instagram',
      contentType: 'image',
      performance: 0.85, // High historical performance
    }
  );

if (shouldAutoPublish) {
  console.log('Content approved for auto-publishing');
  // Proceed with publishing
} else if (requiresApproval) {
  console.log('Content requires manual approval');
  // Send to approval queue
}
```

### Example 3: Learning-Enhanced Execution

```typescript
// Execute agent with learning insights
const { result, learningInsights, recommendations } = 
  await orchestrator.executeWithLearning(
    'workspace-123',
    AgentType.CONTENT_CREATOR,
    {
      topic: 'Social Media Trends 2024',
      platform: 'twitter',
    }
  );

console.log('Generated Content:', result.output);
console.log('Best Practices Applied:', learningInsights.insights.bestPractices);
console.log('Recommendations:', recommendations);
```

## Automation Configuration

### Example 4: Setting Up Automation Modes

```typescript
// Start with Assisted mode (default)
await automationConfig.setMode('workspace-123', AutomationMode.ASSISTED);

// Upgrade to Hybrid mode with rules
await automationConfig.setMode('workspace-123', AutomationMode.HYBRID);

// Create default rules
await automationConfig.createDefaultRules('workspace-123');

// Add custom rule for Instagram
await automationConfig.addRule('workspace-123', {
  name: 'Auto-publish Instagram during peak hours',
  condition: {
    type: 'platform',
    operator: 'equals',
    value: 'instagram',
  },
  action: {
    type: 'auto_publish',
  },
  priority: 15,
  isActive: true,
});

// Add rule for high-performing content
await automationConfig.addRule('workspace-123', {
  name: 'Auto-publish high performers',
  condition: {
    type: 'performance',
    operator: 'greater_than',
    value: 0.8,
  },
  action: {
    type: 'auto_publish',
  },
  priority: 20,
  isActive: true,
});

// Add rule for negative sentiment
await automationConfig.addRule('workspace-123', {
  name: 'Require approval for negative sentiment',
  condition: {
    type: 'sentiment',
    operator: 'less_than',
    value: 0.3,
  },
  action: {
    type: 'require_approval',
  },
  priority: 25, // Higher priority
  isActive: true,
});
```

### Example 5: Evaluating Automation Rules

```typescript
// Evaluate rules for specific context
const evaluation = await automationConfig.evaluateRules(
  'workspace-123',
  {
    platform: 'instagram',
    contentType: 'image',
    time: new Date(),
    performance: 0.85,
    sentiment: 0.7,
  }
);

console.log('Should Auto-Publish:', evaluation.shouldAutoPublish);
console.log('Requires Approval:', evaluation.requiresApproval);
console.log('Matched Rules:', evaluation.matchedRules.map(r => r.name));

// Use evaluation result
if (evaluation.shouldAutoPublish) {
  // Proceed with automatic publishing
  await publishContent(content);
} else if (evaluation.requiresApproval) {
  // Send to approval workflow
  await sendToApproval(content);
}
```

### Example 6: Managing Enabled Agents

```typescript
// Enable only specific agents
await automationConfig.setEnabledAgents('workspace-123', [
  AgentType.CONTENT_CREATOR,
  AgentType.STRATEGY,
  AgentType.ENGAGEMENT,
]);

// Check if agent is enabled
const isEnabled = await automationConfig.isAgentEnabled(
  'workspace-123',
  AgentType.CONTENT_CREATOR
);

// Get automation statistics
const stats = await automationConfig.getAutomationStats('workspace-123');
console.log('Automation Stats:', {
  mode: stats.mode,
  totalRules: stats.totalRules,
  activeRules: stats.activeRules,
  enabledAgents: stats.enabledAgents,
});
```

## Learning and Feedback

### Example 7: Recording and Learning from Feedback

```typescript
// Execute task
const task = await aiCoordinator.executeAgentTask({
  id: 'task-123',
  agentType: AgentType.CONTENT_CREATOR,
  input: { topic: 'AI Trends', platform: 'linkedin' },
  priority: 'high',
  workspaceId: 'workspace-123',
});

// User provides feedback after content performs well
await taskHistory.addFeedback('task-123', {
  rating: 5,
  wasUseful: true,
  userModifications: 'Added more specific examples',
  performanceMetrics: {
    engagement: 342,
    reach: 15000,
    conversions: 23,
  },
  comments: 'Great content! Very engaging and drove good results.',
});

// Get learning insights
const insights = await taskHistory.getLearningInsights(
  'workspace-123',
  AgentType.CONTENT_CREATOR
);

console.log('Best Practices:', insights.insights.bestPractices);
console.log('Common Mistakes:', insights.insights.commonMistakes);
console.log('Optimal Settings:', insights.insights.optimalSettings);
console.log('Content Patterns:', insights.insights.contentPatterns);
```

### Example 8: Analyzing Successful Patterns

```typescript
// Get successful patterns for content creator
const patterns = await taskHistory.getSuccessfulPatterns(
  'workspace-123',
  AgentType.CONTENT_CREATOR,
  4.0 // Minimum rating
);

patterns.forEach(pattern => {
  console.log(`Pattern: ${pattern.pattern}`);
  console.log(`Frequency: ${pattern.frequency} times`);
  console.log(`Average Rating: ${pattern.avgRating}`);
  console.log(`Examples:`, pattern.examples);
  console.log('---');
});

// Apply learnings to next task
const nextTask = {
  topic: 'New Product Launch',
  platform: 'linkedin',
  applyPattern: patterns[0].pattern, // Use top pattern
};
```

### Example 9: Performance Trend Analysis

```typescript
// Analyze performance trends over 30 days
const trends = await taskHistory.analyzePerformanceTrends(
  'workspace-123',
  AgentType.CONTENT_CREATOR,
  30
);

console.log('Trend Direction:', trends.trend); // 'improving', 'declining', or 'stable'

trends.metrics.forEach(metric => {
  console.log(`Date: ${metric.date.toISOString()}`);
  console.log(`Average Rating: ${metric.avgRating}`);
  console.log(`Execution Time: ${metric.avgExecutionTime}ms`);
  console.log(`Success Rate: ${(metric.successRate * 100).toFixed(1)}%`);
});
```

## Performance Monitoring

### Example 10: Real-Time Performance Dashboard

```typescript
// Get real-time dashboard
const dashboard = await performanceMonitor.getPerformanceDashboard('workspace-123');

console.log('Overall Metrics:', {
  totalTasks: dashboard.overall.totalTasks,
  successRate: `${(dashboard.overall.successRate * 100).toFixed(1)}%`,
  avgCost: `$${dashboard.overall.avgCost.toFixed(4)}`,
  cacheHitRate: `${(dashboard.overall.cacheHitRate * 100).toFixed(1)}%`,
});

// Check each agent's status
dashboard.agents.forEach(agent => {
  console.log(`\n${agent.agentType}:`);
  console.log(`  Status: ${agent.status}`);
  console.log(`  Current Load: ${agent.currentLoad.toFixed(1)}%`);
  console.log(`  Success Rate: ${(agent.successRate * 100).toFixed(1)}%`);
  console.log(`  Avg Response Time: ${agent.avgResponseTime.toFixed(0)}ms`);
  console.log(`  Recent Errors: ${agent.recentErrors}`);
});
```

### Example 11: Agent Health Monitoring

```typescript
// Check agent health
const health = await performanceMonitor.getAgentHealth(
  'workspace-123',
  AgentType.CONTENT_CREATOR
);

console.log('Health Status:', health.status);

if (health.status !== 'healthy') {
  console.log('Issues:');
  health.issues.forEach(issue => console.log(`  - ${issue}`));
  
  console.log('Recommendations:');
  health.recommendations.forEach(rec => console.log(`  - ${rec}`));
}

console.log('Metrics:', {
  uptime: `${(health.metrics.uptime * 100).toFixed(2)}%`,
  errorRate: `${(health.metrics.errorRate * 100).toFixed(2)}%`,
  avgResponseTime: `${health.metrics.avgResponseTime.toFixed(0)}ms`,
  throughput: `${health.metrics.throughput.toFixed(1)} tasks/hour`,
});
```

### Example 12: Cost Analysis and Optimization

```typescript
// Get cost analysis for last 30 days
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);
const endDate = new Date();

const costAnalysis = await performanceMonitor.getCostAnalysis(
  'workspace-123',
  startDate,
  endDate
);

console.log('Total Cost:', `$${costAnalysis.totalCost.toFixed(2)}`);
console.log('Projected Monthly Cost:', `$${costAnalysis.projectedMonthlyCost.toFixed(2)}`);

console.log('\nCost by Agent:');
Object.entries(costAnalysis.costByAgent).forEach(([agent, cost]) => {
  console.log(`  ${agent}: $${cost.toFixed(2)}`);
});

console.log('\nCost by Model:');
Object.entries(costAnalysis.costByModel).forEach(([model, cost]) => {
  console.log(`  ${model}: $${cost.toFixed(2)}`);
});

console.log('\nOptimization Recommendations:');
costAnalysis.recommendations.forEach(rec => console.log(`  - ${rec}`));
```

### Example 13: Comparing Agent Performance

```typescript
// Compare multiple agents
const comparison = await performanceMonitor.compareAgents(
  'workspace-123',
  [
    AgentType.CONTENT_CREATOR,
    AgentType.STRATEGY,
    AgentType.ENGAGEMENT,
  ],
  startDate,
  endDate
);

console.log('Best Performer:', comparison.bestPerformer);

console.log('\nComparison:');
comparison.comparison.forEach(agent => {
  console.log(`\n${agent.agentType}:`);
  console.log(`  Success Rate: ${(agent.metrics.successRate * 100).toFixed(1)}%`);
  console.log(`  Avg Execution Time: ${agent.metrics.avgExecutionTime.toFixed(0)}ms`);
  console.log(`  Avg Cost: $${agent.metrics.avgCost.toFixed(4)}`);
  console.log(`  Avg Rating: ${agent.metrics.avgRating.toFixed(1)}/5`);
});

console.log('\nRecommendations:');
comparison.recommendations.forEach(rec => console.log(`  - ${rec}`));
```

### Example 14: Performance Alerts

```typescript
// Get active performance alerts
const alerts = await performanceMonitor.getPerformanceAlerts('workspace-123');

alerts.forEach(alert => {
  console.log(`\n[${alert.severity.toUpperCase()}] ${alert.agentType}`);
  console.log(`Message: ${alert.message}`);
  console.log(`Metric: ${alert.metric}`);
  console.log(`Value: ${alert.value} (Threshold: ${alert.threshold})`);
  console.log(`Time: ${alert.timestamp.toISOString()}`);
});

// Set up alert handling
if (alerts.some(a => a.severity === 'critical')) {
  // Send notification to admin
  await notifyAdmin('Critical performance issues detected');
}
```

### Example 15: Generating Performance Reports

```typescript
// Generate comprehensive performance report
const report = await performanceMonitor.generatePerformanceReport(
  'workspace-123',
  startDate,
  endDate
);

console.log('Report Summary:', report.summary);

console.log('\nKey Insights:');
report.insights.forEach(insight => console.log(`  - ${insight}`));

console.log('\nRecommendations:');
report.recommendations.forEach(rec => console.log(`  - ${rec}`));

// Export report
const reportData = {
  generatedAt: new Date(),
  period: { start: startDate, end: endDate },
  summary: report.summary,
  metrics: report.metrics,
  insights: report.insights,
  recommendations: report.recommendations,
};

// Save or send report
await saveReport(reportData);
```

## Advanced Scenarios

### Example 16: Multi-Stage Content Pipeline

```typescript
// Stage 1: Strategy and Research
const strategyResult = await orchestrator.executeCollaborativeWorkflow(
  'workspace-123',
  'Strategy Phase',
  [AgentType.STRATEGY, AgentType.TREND_DETECTION, AgentType.COMPETITOR_ANALYSIS],
  {
    topic: 'Q4 Marketing Campaign',
    industry: 'SaaS',
    competitors: ['competitor1', 'competitor2'],
  }
);

// Stage 2: Content Creation
const contentResult = await orchestrator.executeCollaborativeWorkflow(
  'workspace-123',
  'Content Creation Phase',
  [AgentType.CONTENT_CREATOR, AgentType.ENGAGEMENT],
  {
    strategy: strategyResult.finalOutput,
    platforms: ['linkedin', 'twitter', 'instagram'],
  }
);

// Stage 3: Review and Optimization
const finalResult = await orchestrator.executeCollaborativeWorkflow(
  'workspace-123',
  'Review Phase',
  [AgentType.ANALYTICS, AgentType.SENTIMENT_ANALYSIS],
  {
    content: contentResult.finalOutput,
    predictPerformance: true,
  }
);

console.log('Pipeline Complete:', {
  strategyInsights: strategyResult.finalOutput.strategy,
  generatedContent: contentResult.finalOutput.content,
  performancePrediction: finalResult.finalOutput.prediction,
});
```

### Example 17: Adaptive Automation

```typescript
// Monitor performance and adjust automation
setInterval(async () => {
  const dashboard = await performanceMonitor.getPerformanceDashboard('workspace-123');
  
  // If success rate drops below 90%, switch to assisted mode
  if (dashboard.overall.successRate < 0.9) {
    console.log('Success rate low, switching to assisted mode');
    await automationConfig.setMode('workspace-123', AutomationMode.ASSISTED);
  }
  
  // If success rate is consistently high, enable more automation
  if (dashboard.overall.successRate > 0.95) {
    console.log('Success rate high, enabling hybrid mode');
    await automationConfig.setMode('workspace-123', AutomationMode.HYBRID);
  }
  
  // Adjust agent priorities based on performance
  const agents = dashboard.agents.sort((a, b) => b.successRate - a.successRate);
  console.log('Top performing agent:', agents[0].agentType);
  
}, 3600000); // Check every hour
```

### Example 18: A/B Testing with Agents

```typescript
// Generate two variations
const variationA = await orchestrator.executeWithLearning(
  'workspace-123',
  AgentType.CONTENT_CREATOR,
  {
    topic: 'Product Launch',
    platform: 'linkedin',
    tone: 'professional',
  }
);

const variationB = await orchestrator.executeWithLearning(
  'workspace-123',
  AgentType.CONTENT_CREATOR,
  {
    topic: 'Product Launch',
    platform: 'linkedin',
    tone: 'casual',
  }
);

// Track performance of both
const testResults = {
  variationA: {
    content: variationA.result.output,
    taskId: variationA.result.taskId,
  },
  variationB: {
    content: variationB.result.output,
    taskId: variationB.result.taskId,
  },
};

// After publishing and collecting metrics, provide feedback
setTimeout(async () => {
  // Variation A performed better
  await taskHistory.addFeedback(testResults.variationA.taskId, {
    rating: 5,
    wasUseful: true,
    performanceMetrics: { engagement: 450, reach: 18000 },
  });
  
  // Variation B performed worse
  await taskHistory.addFeedback(testResults.variationB.taskId, {
    rating: 3,
    wasUseful: false,
    performanceMetrics: { engagement: 180, reach: 8000 },
  });
}, 86400000); // After 24 hours
```

### Example 19: Crisis Response Workflow

```typescript
// Detect potential crisis
const crisisDetection = await orchestrator.executeCollaborativeWorkflow(
  'workspace-123',
  'Crisis Detection',
  [AgentType.SENTIMENT_ANALYSIS, AgentType.CRISIS_MANAGEMENT],
  {
    mentions: recentMentions,
    brand: 'YourBrand',
  }
);

if (crisisDetection.finalOutput.crisisDetected) {
  console.log('Crisis detected! Severity:', crisisDetection.finalOutput.severity);
  
  // Generate response strategy
  const responseStrategy = await orchestrator.executeCollaborativeWorkflow(
    'workspace-123',
    'Crisis Response',
    [AgentType.CRISIS_MANAGEMENT, AgentType.CONTENT_CREATOR],
    {
      crisis: crisisDetection.finalOutput,
      brand: 'YourBrand',
    }
  );
  
  // Require manual approval for crisis responses
  await automationConfig.addRule('workspace-123', {
    name: 'Crisis response requires approval',
    condition: {
      type: 'sentiment',
      operator: 'less_than',
      value: 0.2,
    },
    action: {
      type: 'require_approval',
    },
    priority: 100, // Highest priority
    isActive: true,
  });
  
  console.log('Response Strategy:', responseStrategy.finalOutput);
  // Send to crisis management team for approval
}
```

### Example 20: Continuous Learning Loop

```typescript
// Continuous learning and improvement
async function continuousLearningLoop(workspaceId: string) {
  while (true) {
    // Get learning insights
    const insights = await taskHistory.getLearningInsights(
      workspaceId,
      AgentType.CONTENT_CREATOR
    );
    
    // Analyze trends
    const trends = await taskHistory.analyzePerformanceTrends(
      workspaceId,
      AgentType.CONTENT_CREATOR,
      7 // Last 7 days
    );
    
    // If performance is improving, maintain current settings
    if (trends.trend === 'improving') {
      console.log('Performance improving, maintaining settings');
    }
    
    // If performance is declining, adjust
    if (trends.trend === 'declining') {
      console.log('Performance declining, adjusting settings');
      
      // Apply best practices more aggressively
      const bestPractices = insights.insights.bestPractices;
      console.log('Applying best practices:', bestPractices);
      
      // Increase supervision
      await automationConfig.setMode(workspaceId, AutomationMode.ASSISTED);
    }
    
    // Wait 24 hours before next check
    await new Promise(resolve => setTimeout(resolve, 86400000));
  }
}

// Start continuous learning
continuousLearningLoop('workspace-123');
```

## Integration with Publishing System

### Example 21: End-to-End Content Creation and Publishing

```typescript
async function createAndPublishContent(
  workspaceId: string,
  topic: string,
  platforms: string[]
) {
  // 1. Generate content with agents
  const { result, shouldAutoPublish, requiresApproval } = 
    await orchestrator.executeWithAutomation(
      workspaceId,
      'Content Generation',
      [AgentType.STRATEGY, AgentType.CONTENT_CREATOR, AgentType.ENGAGEMENT],
      { topic, platforms },
      { contentType: 'social_post' }
    );
  
  // 2. Create post in publishing system
  const post = await publishingService.createPost({
    content: result.finalOutput.content,
    platforms: platforms.map(p => ({ platform: p, accountId: 'account-id' })),
    workspaceId,
  });
  
  // 3. Handle based on automation rules
  if (shouldAutoPublish) {
    // Publish immediately
    await publishingService.publishPost(post.id);
    console.log('Content auto-published');
  } else if (requiresApproval) {
    // Send to approval workflow
    await approvalService.requestApproval(post.id);
    console.log('Content sent for approval');
  }
  
  // 4. Track performance after publishing
  setTimeout(async () => {
    const metrics = await analyticsService.getPostMetrics(post.id);
    
    // Provide feedback to learning system
    await taskHistory.addFeedback(result.workflowId, {
      rating: metrics.engagement > 200 ? 5 : 3,
      wasUseful: true,
      performanceMetrics: metrics,
    });
  }, 86400000); // After 24 hours
  
  return { post, result };
}
```

## Best Practices

1. **Start Simple**: Begin with Assisted mode and basic workflows
2. **Provide Feedback**: Always rate agent outputs to improve learning
3. **Monitor Performance**: Regularly check dashboards and alerts
4. **Iterate Rules**: Refine automation rules based on results
5. **Use Learning**: Apply insights from successful patterns
6. **Test Thoroughly**: A/B test different approaches
7. **Handle Errors**: Implement proper error handling and fallbacks
8. **Scale Gradually**: Increase automation as confidence grows
9. **Review Regularly**: Analyze trends and adjust strategies
10. **Document Learnings**: Keep track of what works for your audience
