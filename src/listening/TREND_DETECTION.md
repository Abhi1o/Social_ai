# Trend Detection System

## Overview

The Trend Detection System provides comprehensive capabilities for identifying, tracking, and analyzing trending topics, hashtags, and conversations across social media platforms. It implements real-time trend identification, growth velocity calculation, viral content detection, and conversation clustering.

**Requirements:** 9.4, 18.4

## Features

### 1. Trending Topic Identification

Automatically detects emerging trends by analyzing mention patterns and growth rates:

- **Real-time Detection**: Analyzes mentions from the last 24 hours
- **Multi-platform Support**: Tracks trends across all connected social platforms
- **Growth Analysis**: Compares current vs. previous period to identify growth
- **Status Classification**: Categorizes trends as emerging, rising, viral, stable, or declining
- **Type Detection**: Identifies hashtags, keywords, topics, and conversations

### 2. Hashtag Trend Tracking

Specialized tracking for hashtag performance:

- **Historical Analysis**: Tracks hashtag usage over configurable time periods (1-90 days)
- **Growth Velocity**: Calculates rate of change in hashtag usage
- **Engagement Metrics**: Tracks likes, comments, shares, and reach
- **Sentiment Analysis**: Analyzes sentiment around hashtag usage
- **Influencer Involvement**: Identifies influencers using the hashtag
- **Platform Distribution**: Shows which platforms drive hashtag usage

### 3. Growth Velocity Calculation

Measures the rate of change in trend growth:

- **Time Window Analysis**: Configurable time windows (1-168 hours)
- **Velocity Scoring**: Calculates acceleration/deceleration of growth
- **Status Indicators**: Classifies velocity as explosive, rapid, growing, stable, or declining
- **Predictive Insights**: Helps predict trend trajectory

### 4. Viral Content Detection

Identifies content with viral potential:

- **Virality Scoring**: Multi-factor algorithm (0-100 scale)
  - Engagement velocity (40%)
  - Reach (30%)
  - Influencer factor (20%)
  - Recency (10%)
- **Real-time Monitoring**: Tracks content as it gains traction
- **Threshold Filtering**: Configurable minimum virality score
- **Platform-specific**: Analyzes viral patterns per platform

### 5. Conversation Clustering

Groups related mentions and conversations by topic:

- **Keyword-based Clustering**: Uses keyword overlap for grouping
- **Cohesion Scoring**: Measures how tightly related mentions are (0-1 scale)
- **Diversity Analysis**: Tracks unique contributors vs. total mentions
- **Temporal Tracking**: Monitors cluster evolution over time
- **Engagement Aggregation**: Calculates total and average engagement
- **Sentiment Distribution**: Analyzes sentiment across the cluster

### 6. Trend Alert System

Automated monitoring and notifications:

- **Hourly Detection**: Runs every hour to identify new trends
- **Daily Cleanup**: Archives inactive trends
- **6-hour Clustering**: Updates conversation clusters regularly
- **Configurable Thresholds**: Set custom alert criteria
- **Multi-channel Alerts**: Email, SMS, push notifications, Slack

## Architecture

### Data Models

#### Trend Schema (MongoDB)
```typescript
{
  workspaceId: string;
  term: string;
  type: 'hashtag' | 'topic' | 'keyword' | 'conversation';
  status: 'emerging' | 'rising' | 'stable' | 'declining' | 'viral';
  platforms: string[];
  currentVolume: number;
  previousVolume: number;
  peakVolume: number;
  growthRate: number;
  growthVelocity: number;
  momentum: number;
  viralityScore: number;
  sentimentScore: number;
  influencerCount: number;
  // ... additional metrics
}
```

#### Conversation Cluster Schema (MongoDB)
```typescript
{
  workspaceId: string;
  name: string;
  keywords: string[];
  hashtags: string[];
  mentionIds: string[];
  size: number;
  cohesionScore: number;
  diversityScore: number;
  totalEngagement: number;
  averageSentiment: number;
  // ... additional metrics
}
```

### Services

#### TrendDetectionService

Main service implementing all trend detection logic:

- `detectTrends()` - Identify trending topics
- `trackHashtagTrend()` - Track specific hashtag
- `calculateGrowthVelocity()` - Calculate growth rate
- `detectViralContent()` - Find viral content
- `clusterConversations()` - Group related conversations
- `getTrends()` - Query trends with filters

#### TrendDetectionWorker

Background worker for automated processing:

- Hourly trend detection
- Daily trend cleanup
- 6-hour conversation clustering

## API Endpoints

### GET /listening/trends

Get trending topics and hashtags.

**Query Parameters:**
- `type` - Filter by trend type (hashtag, topic, keyword, conversation)
- `status` - Filter by status (emerging, rising, viral, stable, declining)
- `platforms` - Filter by platforms
- `minGrowthRate` - Minimum growth rate percentage
- `minViralityScore` - Minimum virality score (0-100)
- `limit` - Number of results (default: 50, max: 100)
- `offset` - Pagination offset
- `sortBy` - Sort field (growthRate, viralityScore, currentVolume, lastSeenAt)
- `sortOrder` - Sort order (asc, desc)

**Response:**
```json
{
  "trends": [
    {
      "term": "#ai",
      "type": "hashtag",
      "status": "viral",
      "growthRate": 450.5,
      "viralityScore": 85.3,
      "currentVolume": 1250,
      "platforms": ["twitter", "instagram"],
      "sentimentScore": 0.65
    }
  ],
  "total": 150
}
```

### POST /listening/trends/detect

Manually trigger trend detection.

**Request Body:**
```json
{
  "platforms": ["twitter", "instagram"]
}
```

**Response:**
```json
{
  "trends": [...],
  "summary": {
    "total": 45,
    "emerging": 12,
    "rising": 18,
    "viral": 3,
    "declining": 12
  }
}
```

### POST /listening/trends/hashtag/analyze

Analyze a specific hashtag trend.

**Request Body:**
```json
{
  "hashtag": "#ai",
  "platforms": ["twitter", "instagram"],
  "days": 7
}
```

**Response:**
```json
{
  "term": "#ai",
  "type": "hashtag",
  "currentVolume": 1250,
  "growthVelocity": 2.5,
  "totalEngagement": 45000,
  "sentimentScore": 0.65,
  "influencerCount": 25,
  "topInfluencers": ["@user1", "@user2"]
}
```

### POST /listening/trends/velocity/calculate

Calculate growth velocity for a term.

**Request Body:**
```json
{
  "term": "#ai",
  "timeWindowHours": 24
}
```

**Response:**
```json
{
  "term": "#ai",
  "timeWindowHours": 24,
  "growthVelocity": 2.5,
  "growthRate": 250,
  "status": "rapid"
}
```

### GET /listening/trends/viral

Detect viral content.

**Query Parameters:**
- `platforms` - Platforms to check
- `minViralityScore` - Minimum score (default: 70)
- `timeWindowHours` - Time window (default: 24)
- `limit` - Number of results (default: 20)

**Response:**
```json
{
  "viralContent": [
    {
      "mentionId": "uuid",
      "platform": "twitter",
      "content": "...",
      "author": {
        "username": "@user",
        "followers": 50000
      },
      "viralityScore": 85.3,
      "engagement": 5000,
      "reach": 100000,
      "growthRate": 500
    }
  ],
  "count": 15,
  "timeWindow": "24 hours"
}
```

### GET /listening/trends/clusters

Get conversation clusters.

**Query Parameters:**
- `minSize` - Minimum cluster size (default: 5)
- `minCohesion` - Minimum cohesion score (default: 0.5)
- `days` - Days to analyze (default: 7)
- `limit` - Number of results (default: 20)

**Response:**
```json
{
  "clusters": [
    {
      "name": "AI & Technology & Innovation",
      "keywords": ["ai", "technology", "innovation"],
      "hashtags": ["#ai", "#tech"],
      "size": 150,
      "cohesionScore": 0.75,
      "totalEngagement": 25000,
      "averageSentiment": 0.6
    }
  ],
  "count": 12,
  "period": "7 days"
}
```

### GET /listening/trends/summary

Get comprehensive trend summary.

**Response:**
```json
{
  "trends": {
    "total": 45,
    "emerging": 12,
    "rising": 18,
    "viral": 3,
    "declining": 10,
    "stable": 2
  },
  "viralContent": {
    "count": 15,
    "topScore": 92.5
  },
  "clusters": {
    "count": 12,
    "totalConversations": 850
  },
  "topTrends": [...]
}
```

## Usage Examples

### Detect Trends for Workspace

```typescript
const result = await trendService.detectTrends(workspaceId);
console.log(`Found ${result.trends.length} trends`);
console.log(`Viral trends: ${result.summary.viral}`);
```

### Track Specific Hashtag

```typescript
const trend = await trendService.trackHashtagTrend(
  workspaceId,
  '#ai',
  7 // days
);
console.log(`Growth velocity: ${trend.growthVelocity}`);
```

### Find Viral Content

```typescript
const viralContent = await trendService.detectViralContent(
  workspaceId,
  {
    platforms: ['twitter', 'instagram'],
    minViralityScore: 80,
    timeWindowHours: 24,
    limit: 10,
  }
);
```

### Cluster Conversations

```typescript
const clusters = await trendService.clusterConversations(
  workspaceId,
  {
    minSize: 10,
    minCohesion: 0.6,
    days: 7,
    limit: 20,
  }
);
```

## Algorithms

### Virality Score Calculation

```
viralityScore = (
  normalizedEngagementVelocity * 40 +
  normalizedReach * 30 +
  influencerFactor * 20 +
  recencyFactor * 10
)
```

Where:
- `engagementVelocity = totalEngagement / hoursElapsed`
- `normalizedEngagementVelocity = min(engagementVelocity / 100, 1)`
- `normalizedReach = min(reach / 100000, 1)`
- `influencerFactor = isInfluencer ? 1 : 0.5`
- `recencyFactor = max(0, 1 - (hoursElapsed / timeWindow))`

### Growth Velocity Calculation

```
growthVelocity = (currentVolume - previousVolume) / previousVolume
```

For time series:
```
velocity = average(dailyGrowthRates)
```

### Cohesion Score

```
cohesion = overlap / union

Where:
- overlap = keywords in both sets
- union = all unique keywords
```

### Trend Status Classification

- **Viral**: growthRate > 500% OR momentum > 90
- **Emerging**: growthRate > 200% OR momentum > 70
- **Rising**: growthRate > 50% OR momentum > 40
- **Declining**: growthRate < -20%
- **Stable**: Otherwise

## Performance Considerations

### Optimization Strategies

1. **Indexing**: MongoDB indexes on key fields (workspaceId, status, lastSeenAt)
2. **Caching**: Trend data cached for 1 hour
3. **Batch Processing**: Process multiple workspaces in parallel
4. **Incremental Updates**: Only analyze new mentions since last run
5. **Archival**: Inactive trends archived after 7 days, deleted after 30 days

### Scalability

- Handles 1M+ mentions per day
- Supports 10,000+ concurrent workspaces
- Horizontal scaling via MongoDB sharding
- Background workers prevent API blocking

## Monitoring

### Metrics to Track

- Trends detected per hour
- Average detection time
- Viral content identified
- Clusters created
- Worker execution time
- Error rates

### Logging

All operations logged with:
- Workspace ID
- Operation type
- Results summary
- Execution time
- Errors with stack traces

## Future Enhancements

1. **ML-based Prediction**: Use machine learning to predict trend trajectory
2. **Cross-platform Correlation**: Identify trends spreading across platforms
3. **Demographic Analysis**: Analyze trends by audience demographics
4. **Competitive Trends**: Compare trends against competitors
5. **Trend Recommendations**: Suggest trending topics for content creation
6. **Real-time Streaming**: WebSocket updates for live trend monitoring
7. **Advanced NLP**: Better topic extraction using transformer models
8. **Geographic Trends**: Identify location-specific trends

## Testing

Run tests:
```bash
npm test -- trend-detection
```

Test coverage includes:
- Trend detection algorithm
- Growth velocity calculation
- Viral content scoring
- Conversation clustering
- API endpoints
- Worker scheduling

## Troubleshooting

### Common Issues

**Trends not detected:**
- Check if mentions exist in the time window
- Verify MongoDB connection
- Check worker logs for errors

**Low virality scores:**
- Adjust scoring weights
- Lower threshold
- Increase time window

**Clusters too small:**
- Lower minSize parameter
- Reduce minCohesion threshold
- Increase analysis period

**Performance issues:**
- Add MongoDB indexes
- Reduce analysis window
- Increase worker frequency
- Enable caching

## References

- Requirements: 9.4 (Social Listening), 18.4 (Hashtag Intelligence)
- MongoDB Schema: `src/listening/schemas/trend.schema.ts`
- Service: `src/listening/services/trend-detection.service.ts`
- Controller: `src/listening/controllers/trend-detection.controller.ts`
- Worker: `src/listening/workers/trend-detection.worker.ts`
