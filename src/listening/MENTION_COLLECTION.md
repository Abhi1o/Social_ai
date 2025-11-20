# Real-Time Mention Collection System

## Overview

The Real-Time Mention Collection system monitors social media platforms for brand mentions, keywords, and conversations in real-time. It provides comprehensive listening capabilities across multiple platforms with intelligent filtering, categorization, and alerting.

## Architecture

### Components

1. **Listening Streams** - Platform-specific implementations for collecting mentions
2. **Stream Manager** - Orchestrates multiple streams and manages their lifecycle
3. **Mention Processing** - Handles deduplication, filtering, and categorization
4. **Collection Worker** - Background service ensuring streams stay active
5. **WebSocket Gateway** - Real-time updates to connected clients

### Data Flow

```
Social Platform APIs
        ↓
Listening Streams (Platform-specific)
        ↓
Stream Manager (Orchestration)
        ↓
Mention Processing (Deduplication, Filtering, Categorization)
        ↓
Database Storage (PostgreSQL)
        ↓
WebSocket Gateway (Real-time updates)
        ↓
Frontend Clients
```

## Features

### 1. Multi-Platform Support

Currently implemented platforms:
- Twitter/X (Full implementation)
- Instagram (Placeholder)
- Facebook (Placeholder)
- LinkedIn (Placeholder)
- TikTok (Placeholder)
- Reddit (Placeholder)

Each platform has a dedicated stream implementation that:
- Polls the platform API at configurable intervals (default: 5 minutes)
- Applies platform-specific filtering
- Normalizes data into a common format

### 2. Intelligent Deduplication

The system prevents duplicate mentions through:
- **In-memory cache**: Fast lookup for recent mentions (10,000 most recent)
- **Database uniqueness**: Enforced at the database level using platform + platformPostId
- **Automatic cache management**: Clears when full to prevent memory issues

### 3. Spam Filtering

Automatically filters out spam based on:
- Common spam patterns (buy now, click here, etc.)
- Excessive URLs (3+ in a single post)
- Excessive hashtags (15+)
- Excessive mentions (10+)
- Known spam keywords

### 4. Automatic Categorization

Mentions are automatically categorized into:
- **Brand Mention**: Direct brand/company references
- **Product Mention**: Product-specific discussions
- **Customer Feedback**: Reviews and opinions
- **Support Request**: Help or issue reports
- **Complaint**: Negative feedback
- **Praise**: Positive feedback
- **Question**: Inquiries
- **Other**: Uncategorized content

### 5. Influencer Detection

Automatically identifies influencers based on:
- Follower count (10,000+ followers)
- Engagement rate (>5% with 1,000+ followers)
- Marks mentions from influencers for priority handling

### 6. Real-Time Updates

WebSocket gateway provides:
- Live mention updates as they're collected
- Sentiment analysis updates
- Alert notifications
- Query-specific and workspace-wide subscriptions

### 7. Alert System

Configurable alerts for:
- Volume spikes (mentions exceeding threshold)
- Sentiment shifts (significant changes in sentiment)
- Crisis detection (negative sentiment spikes)
- Influencer mentions (high-reach accounts)
- Keyword trends (emerging topics)

## API Endpoints

### Query Management

```
POST   /api/listening/queries              - Create listening query
GET    /api/listening/queries              - List all queries
GET    /api/listening/queries/:id          - Get query details
PUT    /api/listening/queries/:id          - Update query
DELETE /api/listening/queries/:id          - Delete query
POST   /api/listening/queries/:id/activate - Activate query
POST   /api/listening/queries/:id/deactivate - Deactivate query
```

### Mention Management

```
GET    /api/listening/mentions             - List mentions
GET    /api/listening/mentions/:id         - Get mention details
GET    /api/listening/mentions/stats/summary - Get statistics
```

### Query Parameters

**List Mentions:**
- `queryId`: Filter by specific query
- `platform`: Filter by platform
- `sentiment`: Filter by sentiment (POSITIVE, NEUTRAL, NEGATIVE)
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset

**Statistics:**
- `queryId`: Filter by specific query
- `days`: Number of days to analyze (default: 7)

## WebSocket Events

### Client → Server

```typescript
// Subscribe to query mentions
socket.emit('subscribe:query', { queryId: 'query-id' });

// Unsubscribe from query
socket.emit('unsubscribe:query', { queryId: 'query-id' });

// Subscribe to workspace mentions
socket.emit('subscribe:workspace', { workspaceId: 'workspace-id' });

// Unsubscribe from workspace
socket.emit('unsubscribe:workspace', { workspaceId: 'workspace-id' });
```

### Server → Client

```typescript
// New mention received
socket.on('mention:new', (data) => {
  // data: { queryId, mention }
});

// Mention updated (e.g., sentiment analysis completed)
socket.on('mention:update', (data) => {
  // data: { queryId, mention }
});

// Alert triggered
socket.on('alert:new', (data) => {
  // data: { queryId, alert }
});

// Sentiment analysis update
socket.on('sentiment:update', (data) => {
  // data: { queryId, sentiment }
});
```

## Configuration

### Stream Polling Intervals

Default: 5 minutes (300,000ms)

Can be customized per platform in the stream constructor:

```typescript
constructor() {
  super(Platform.TWITTER, 180000); // 3 minutes
}
```

### Deduplication Cache

- Max size: 10,000 mentions
- Automatically clears when full
- Stores: `platform:platformPostId` keys

### Influencer Thresholds

- Minimum followers: 10,000
- OR: 1,000+ followers with >5% engagement rate

### Spam Detection

Configurable patterns in `MentionProcessingService`:
- Spam keywords
- URL limits
- Hashtag limits
- Mention limits

## Usage Examples

### Creating a Listening Query

```typescript
POST /api/listening/queries
{
  "name": "Brand Monitoring",
  "description": "Monitor all brand mentions",
  "keywords": ["@brandname", "#brandhashtag", "brand name"],
  "platforms": ["TWITTER", "INSTAGRAM", "FACEBOOK"],
  "languages": ["en", "es"],
  "excludeKeywords": ["spam", "bot"],
  "alertsEnabled": true,
  "alertThreshold": 50
}
```

### Subscribing to Real-Time Updates

```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/listening', {
  auth: { token: 'jwt-token' }
});

// Subscribe to query
socket.emit('subscribe:query', { queryId: 'query-id' });

// Listen for new mentions
socket.on('mention:new', (data) => {
  console.log('New mention:', data.mention);
});

// Listen for alerts
socket.on('alert:new', (data) => {
  console.log('Alert:', data.alert);
});
```

### Fetching Mentions

```typescript
GET /api/listening/mentions?queryId=query-id&limit=20&offset=0

Response:
{
  "mentions": [
    {
      "id": "mention-id",
      "platform": "TWITTER",
      "authorUsername": "user123",
      "content": "Love this brand!",
      "sentiment": "POSITIVE",
      "likes": 42,
      "isInfluencer": false,
      "tags": ["praise", "customer_feedback"]
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

## Performance Considerations

### Scalability

- Each query runs independent streams per platform
- Streams use polling (not true streaming) to avoid connection limits
- Background worker ensures failed streams are restarted
- Health checks every 5 minutes

### Database Optimization

- Unique index on `platform + platformPostId` for fast deduplication
- Indexes on `workspaceId`, `queryId`, `platform`, `sentiment`, `publishedAt`
- Consider partitioning `listening_mentions` table by date for large volumes

### Memory Management

- Deduplication cache limited to 10,000 entries
- Automatic cache clearing when full
- Consider Redis for distributed caching in production

## Future Enhancements

1. **True Streaming**: Implement WebSocket connections to platform APIs where available
2. **Advanced Sentiment**: Integrate ML-based sentiment analysis
3. **Language Detection**: Automatic language detection for mentions
4. **Trend Detection**: Identify emerging topics and viral content
5. **Competitor Tracking**: Dedicated competitor monitoring features
6. **Export Functionality**: Export mentions to CSV/Excel
7. **Advanced Filtering**: More sophisticated filtering rules
8. **Bulk Operations**: Bulk tagging, categorization, and actions

## Troubleshooting

### Streams Not Starting

Check:
1. Query is marked as `isActive: true`
2. Platform credentials are configured
3. Worker service is running
4. Check logs for error messages

### Missing Mentions

Possible causes:
1. Spam filter too aggressive
2. Platform API rate limits
3. Polling interval too long
4. Keywords not matching content

### High Memory Usage

Solutions:
1. Reduce deduplication cache size
2. Implement Redis for caching
3. Archive old mentions
4. Optimize query filters

### WebSocket Connection Issues

Check:
1. CORS configuration
2. JWT authentication
3. Network/firewall settings
4. Socket.io version compatibility

## Monitoring

Key metrics to monitor:
- Active streams count
- Mentions processed per minute
- Deduplication hit rate
- Spam filter rate
- Alert trigger frequency
- WebSocket connection count
- API error rates
- Stream restart frequency

## Security

- All API endpoints require JWT authentication
- Workspace isolation enforced at database level
- WebSocket connections authenticated
- Platform credentials encrypted at rest
- Rate limiting on API endpoints
- Input validation on all queries
