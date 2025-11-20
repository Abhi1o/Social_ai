# Strategy Agent

## Overview

The Strategy Agent is an AI-powered analytical agent specialized in social media strategy and performance analysis. It analyzes historical performance data, identifies trends, and provides actionable strategic recommendations to optimize social media presence and engagement.

## Features

### 1. Performance Data Analysis
- Analyzes 90-day historical performance data
- Calculates key metrics (engagement, reach, impressions)
- Identifies top-performing content
- Breaks down performance by platform, time, and content type

### 2. Content Theme Recommendations
- Recommends 3-5 content themes based on performance
- Provides reasoning for each theme
- Suggests posting frequency
- Identifies target audience
- Includes content examples

### 3. Optimal Posting Time Analysis
- Analyzes hourly and daily engagement patterns
- Identifies best times to post for each day of the week
- Provides confidence scores based on data volume
- Includes reasoning for each recommendation

### 4. Monthly Calendar Theme Suggestions
- Creates weekly content themes for the month
- Identifies key dates and events
- Recommends content mix (promotional, educational, entertaining, UGC)
- Provides overall monthly strategy

### 5. Audience Engagement Pattern Detection
- Identifies peak engagement hours
- Detects best-performing days
- Analyzes content type preferences
- Evaluates platform performance
- Provides impact assessment (high/medium/low)

### 6. Strategic Recommendations
- Comprehensive performance analysis
- Identifies strengths, weaknesses, and opportunities
- Provides actionable insights
- Predicts impact of recommendations

## Agent Personality

- **Name**: Strategy Analyst
- **Type**: STRATEGY
- **Personality**: Analytical, data-driven, and strategic
- **Description**: Specialized in analyzing performance data, identifying trends, and providing strategic recommendations for social media growth

## API Endpoints

### POST /api/ai/strategy/recommendations
Get comprehensive strategy recommendations based on performance data.

**Request Body:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-03-31",
  "platforms": ["instagram", "twitter"],
  "accountIds": ["account-1", "account-2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "performanceAnalysis": {
      "summary": "Analyzed 150 posts with 4.5% average engagement rate",
      "strengths": ["Consistent posting", "Strong Instagram performance"],
      "weaknesses": ["Low Twitter engagement", "Limited content variety"],
      "opportunities": ["Expand video content", "Optimize posting times"]
    },
    "contentThemes": [...],
    "optimalPostingTimes": [...],
    "monthlyCalendar": {...},
    "audiencePatterns": [...],
    "actionableInsights": [...],
    "predictedImpact": "25-40% increase in engagement"
  }
}
```

### GET /api/ai/strategy/content-themes
Get content theme recommendations.

**Query Parameters:**
- `startDate`: Start date for analysis (ISO 8601)
- `endDate`: End date for analysis (ISO 8601)

### GET /api/ai/strategy/optimal-times
Get optimal posting times based on historical data.

**Query Parameters:**
- `startDate`: Start date for analysis (ISO 8601)
- `endDate`: End date for analysis (ISO 8601)

### GET /api/ai/strategy/monthly-calendar
Get monthly content calendar with themes.

**Query Parameters:**
- `startDate`: Start date for analysis (ISO 8601)
- `endDate`: End date for analysis (ISO 8601)

### GET /api/ai/strategy/engagement-patterns
Get audience engagement patterns.

**Query Parameters:**
- `startDate`: Start date for analysis (ISO 8601)
- `endDate`: End date for analysis (ISO 8601)

## Usage Example

```typescript
import { StrategyAgent } from './agents/strategy.agent';

// Inject the agent
constructor(private readonly strategyAgent: StrategyAgent) {}

// Analyze performance
const recommendations = await this.strategyAgent.analyzePerformance({
  workspaceId: 'workspace-123',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-03-31'),
  platforms: ['instagram', 'twitter'],
});

console.log(recommendations.performanceAnalysis.summary);
console.log(recommendations.actionableInsights);
```

## AI Model Configuration

- **Model**: GPT-4o-mini (cost-efficient)
- **Temperature**: 0.3 (focused, analytical)
- **Max Tokens**: 3000
- **Cache TTL**: 7 days (strategy recommendations are stable)

## Performance Metrics Calculated

### Post-Level Metrics
- Engagement (likes, comments, shares, saves)
- Reach (unique users who saw the post)
- Impressions (total views)
- Engagement rate (engagement / reach * 100)

### Aggregate Metrics
- Total posts
- Total engagement
- Average engagement rate
- Total reach
- Total impressions
- Follower growth

### Breakdown Metrics
- **Platform**: Performance by social platform
- **Hourly**: Engagement by hour of day (0-23)
- **Daily**: Engagement by day of week (0-6)
- **Content Type**: Performance by content category

## Data Requirements

The Strategy Agent requires:
1. At least 30 days of historical data (90 days recommended)
2. Published posts with timestamps
3. Platform associations
4. Engagement metrics (can be mocked for testing)

## Fallback Behavior

If AI parsing fails or returns invalid JSON, the agent provides fallback recommendations based on:
- Statistical analysis of performance data
- Best practices for social media
- Platform-specific guidelines
- Historical patterns

## Integration with Other Agents

The Strategy Agent works alongside:
- **Content Creator Agent**: Uses strategy insights to generate optimized content
- **Analytics Agent**: Provides data for deeper analysis
- **Trend Detection Agent**: Incorporates trending topics into strategy

## Requirements Validation

This implementation satisfies **Requirement 2.5**:
> THE Strategy_Agent SHALL analyze performance data and recommend content themes, optimal posting times, and monthly calendar themes

✅ Analyzes performance data from database
✅ Recommends content themes with reasoning
✅ Identifies optimal posting times based on 90-day history
✅ Generates monthly calendar themes
✅ Detects audience engagement patterns
✅ Provides strategic recommendations endpoint

## Testing

Run tests with:
```bash
npm test -- strategy.agent.spec.ts
```

Test coverage includes:
- Performance analysis with AI recommendations
- Fallback recommendations when AI fails
- Optimal posting time identification
- Engagement pattern detection

## Future Enhancements

1. **Real Analytics Integration**: Connect to actual analytics APIs (Meta, Twitter, etc.)
2. **Competitor Analysis**: Compare performance against competitors
3. **Predictive Modeling**: ML-based engagement prediction
4. **A/B Testing**: Automated content testing recommendations
5. **Seasonal Trends**: Incorporate seasonal and holiday patterns
6. **Industry Benchmarks**: Compare against industry standards
