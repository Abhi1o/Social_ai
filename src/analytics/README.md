# Analytics Module - Metrics Collection System

## Overview

The Analytics module provides comprehensive metrics collection, aggregation, caching, and real-time updates for social media analytics. It collects data from multiple social platforms (Instagram, Facebook, Twitter, LinkedIn) and provides both raw and aggregated metrics through REST APIs and WebSocket connections.

## Architecture

### Components

1. **Metrics Collection Service** - Collects metrics from social platforms
2. **Metrics Aggregation Service** - Aggregates metrics into daily/weekly/monthly rollups
3. **Metrics Cache Service** - Provides Redis-based caching for fast data retrieval
4. **Platform Fetchers** - Platform-specific API integrations
5. **Cron Jobs** - Scheduled tasks for automated collection and aggregation
6. **WebSocket Gateway** - Real-time metrics updates to connected clients

### Data Flow

```
Social Platform APIs
        ↓
Platform Fetchers (Instagram, Facebook, Twitter, LinkedIn)
        ↓
Metrics Collection Service
        ↓
MongoDB (Time-series data)
        ↓
Metrics Aggregation Service
        ↓
MongoDB (Aggregated metrics)
        ↓
Redis Cache Layer
        ↓
REST API / WebSocket Gateway
        ↓
Frontend Clients
```

## Features

### 1. Hourly Metrics Collection

- Automatically collects metrics every hour for all active social accounts
- Fetches both account-level and post-level metrics
- Supports batch fetching for improved performance
- Stores raw metrics in MongoDB time-series collections

### 2. Metrics Aggregation

- **Daily Aggregation**: Runs at midnight, aggregates previous day's metrics
- **Weekly Aggregation**: Runs every Monday at 1 AM, aggregates previous week
- **Monthly Aggregation**: Runs on the 1st of each month at 2 AM, aggregates previous month

Aggregated metrics include:
- Total engagement (likes, comments, shares, saves)
- Average engagement rates
- Min/Max values
- Follower growth and growth rates
- Post counts

### 3. Redis Caching

- 5-minute TTL for real-time metrics
- 1-hour TTL for aggregated metrics
- Automatic cache invalidation on data updates
- Pattern-based cache clearing

### 4. Real-time Updates via WebSocket

Clients can subscribe to:
- Workspace-level metrics updates
- Account-level metrics updates
- Post-level metrics updates
- Aggregated metrics updates

### 5. Platform Support

Currently supported platforms:
- **Instagram**: Posts, Stories, Reels metrics
- **Facebook**: Page and post metrics
- **Twitter**: Tweet and account metrics
- **LinkedIn**: Post and organization metrics

## API Endpoints

### Get Workspace Metrics
```
GET /analytics/workspace/:workspaceId/metrics?startDate=2024-01-01&endDate=2024-01-31
```

### Get Account Metrics
```
GET /analytics/account/:accountId/metrics?startDate=2024-01-01&endDate=2024-01-31
```

### Get Post Metrics
```
GET /analytics/post/:postId/metrics
```

### Get Aggregated Metrics
```
GET /analytics/workspace/:workspaceId/aggregated?period=daily&startDate=2024-01-01&endDate=2024-01-31
```

### Manual Collection Triggers
```
POST /analytics/workspace/:workspaceId/collect
POST /analytics/account/:accountId/collect
POST /analytics/workspace/:workspaceId/aggregate/daily?date=2024-01-15
```

### Cache Management
```
POST /analytics/workspace/:workspaceId/cache/invalidate
```

## WebSocket Events

### Client → Server

**Subscribe to workspace metrics:**
```javascript
socket.emit('subscribe:workspace', { workspaceId: 'workspace-123' });
```

**Subscribe to account metrics:**
```javascript
socket.emit('subscribe:account', { accountId: 'account-456' });
```

**Unsubscribe:**
```javascript
socket.emit('unsubscribe:workspace', { workspaceId: 'workspace-123' });
socket.emit('unsubscribe:account', { accountId: 'account-456' });
```

### Server → Client

**Metrics update:**
```javascript
socket.on('metrics:update', (data) => {
  console.log(data.workspaceId, data.metrics, data.timestamp);
});
```

**Post metrics update:**
```javascript
socket.on('metrics:post', (data) => {
  console.log(data.postId, data.metrics, data.timestamp);
});
```

**Aggregated metrics update:**
```javascript
socket.on('metrics:aggregated', (data) => {
  console.log(data.period, data.metrics, data.timestamp);
});
```

## Database Schema

### Metrics Collection (MongoDB Time-series)

```typescript
{
  workspaceId: string;
  accountId: string;
  platform: string;
  timestamp: Date;
  metricType: 'post' | 'account' | 'story' | 'reel';
  metadata: {
    postId?: string;
    platformPostId?: string;
    contentType?: string;
  };
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    impressions: number;
    reach: number;
    followers: number;
    engagementRate: number;
    // ... more metrics
  };
  collectedAt: Date;
}
```

### Aggregated Metrics (MongoDB)

```typescript
{
  workspaceId: string;
  accountId: string;
  platform: string;
  period: 'daily' | 'weekly' | 'monthly';
  periodStart: Date;
  periodEnd: Date;
  aggregatedMetrics: {
    totalLikes: number;
    totalComments: number;
    avgEngagementRate: number;
    followerGrowth: number;
    followerGrowthRate: number;
    postCount: number;
    // ... more aggregated metrics
  };
}
```

## Scheduled Jobs

### Hourly Collection
- **Schedule**: Every hour (0 * * * *)
- **Action**: Collects metrics for all workspaces
- **Duration**: ~5-10 minutes for 100 workspaces

### Daily Aggregation
- **Schedule**: Midnight (0 0 * * *)
- **Action**: Aggregates previous day's metrics
- **Duration**: ~2-5 minutes for 100 workspaces

### Weekly Aggregation
- **Schedule**: Monday 1 AM (0 1 * * 1)
- **Action**: Aggregates previous week's metrics
- **Duration**: ~5-10 minutes for 100 workspaces

### Monthly Aggregation
- **Schedule**: 1st of month 2 AM (0 2 1 * *)
- **Action**: Aggregates previous month's metrics
- **Duration**: ~10-15 minutes for 100 workspaces

## Performance Considerations

### Optimization Strategies

1. **Batch Fetching**: Fetches multiple posts in a single API call when supported
2. **Parallel Processing**: Processes workspaces in batches of 10
3. **Caching**: Redis caching reduces database queries by 80%
4. **Time-series Storage**: MongoDB time-series collections optimize storage and queries
5. **Aggregation Pipeline**: Pre-calculated aggregations for fast dashboard loading

### Scaling

- Horizontal scaling: Multiple worker instances can run collection jobs
- Database sharding: MongoDB supports sharding by workspaceId
- Cache distribution: Redis cluster for distributed caching
- Rate limiting: Respects platform API rate limits

## Error Handling

- Automatic retry with exponential backoff for API failures
- Graceful degradation: Failed accounts don't block others
- Comprehensive logging for debugging
- Alert notifications for critical failures

## Testing

Run tests:
```bash
npm test -- src/analytics
```

Run specific test:
```bash
npm test -- src/analytics/services/metrics-collection.service.spec.ts
```

## Future Enhancements

1. Add support for TikTok, YouTube, Pinterest metrics
2. Implement predictive analytics using ML models
3. Add custom metric definitions
4. Support for custom aggregation periods
5. Export metrics to data warehouses (BigQuery, Snowflake)
6. Advanced anomaly detection
7. Competitive benchmarking data collection

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 4.1**: Real-time engagement metrics collection across all platforms
- **Requirement 4.5**: Performance data history with configurable retention periods

## Related Modules

- **Publishing Module**: Triggers metrics collection after post publishing
- **Social Account Module**: Provides account credentials for API access
- **AI Module**: Uses metrics data for strategy recommendations
