# Competitive Benchmarking API Documentation

## Overview

The Competitive Benchmarking API provides comprehensive competitor tracking, performance comparison, share of voice analysis, industry benchmarking, and competitor activity monitoring capabilities.

## Features

- **Competitor Account Tracking**: Track up to 20 competitor social media accounts
- **Share of Voice Calculation**: Measure your brand's presence vs competitors
- **Competitive Performance Comparison**: Compare metrics across all tracked accounts
- **Industry Benchmarking**: Compare performance against industry averages
- **Competitor Activity Monitoring**: Track competitor posting patterns and content strategy
- **Competitive Intelligence Dashboard**: Visualize competitive landscape

## API Endpoints

### Competitor Management

#### Create Competitor
```http
POST /api/analytics/competitive/competitors
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Competitor Name",
  "description": "Main competitor in our market",
  "industry": "Social Media Marketing",
  "tags": ["direct-competitor", "enterprise"],
  "accounts": [
    {
      "platform": "instagram",
      "platformAccountId": "123456789",
      "username": "competitor_handle",
      "displayName": "Competitor Display Name",
      "avatar": "https://example.com/avatar.jpg"
    },
    {
      "platform": "twitter",
      "platformAccountId": "987654321",
      "username": "competitor_twitter",
      "displayName": "Competitor on Twitter"
    }
  ]
}
```

**Response:**
```json
{
  "id": "comp_123",
  "workspaceId": "ws_456",
  "name": "Competitor Name",
  "description": "Main competitor in our market",
  "industry": "Social Media Marketing",
  "tags": ["direct-competitor", "enterprise"],
  "isActive": true,
  "accounts": [
    {
      "id": "acc_789",
      "competitorId": "comp_123",
      "platform": "INSTAGRAM",
      "platformAccountId": "123456789",
      "username": "competitor_handle",
      "displayName": "Competitor Display Name",
      "avatar": "https://example.com/avatar.jpg",
      "isActive": true,
      "createdAt": "2024-01-05T10:00:00Z",
      "updatedAt": "2024-01-05T10:00:00Z"
    }
  ],
  "createdAt": "2024-01-05T10:00:00Z",
  "updatedAt": "2024-01-05T10:00:00Z"
}
```

#### Get All Competitors
```http
GET /api/analytics/competitive/competitors?includeInactive=false
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "comp_123",
    "name": "Competitor Name",
    "description": "Main competitor in our market",
    "industry": "Social Media Marketing",
    "tags": ["direct-competitor"],
    "isActive": true,
    "accounts": [...],
    "createdAt": "2024-01-05T10:00:00Z",
    "updatedAt": "2024-01-05T10:00:00Z"
  }
]
```

#### Get Single Competitor
```http
GET /api/analytics/competitive/competitors/{competitorId}
Authorization: Bearer {token}
```

#### Update Competitor
```http
PUT /api/analytics/competitive/competitors/{competitorId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Competitor Name",
  "isActive": false,
  "tags": ["archived"]
}
```

#### Delete Competitor
```http
DELETE /api/analytics/competitive/competitors/{competitorId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true
}
```

### Competitive Analysis

#### Get Competitive Benchmark
Compare your performance against tracked competitors.

```http
GET /api/analytics/competitive/benchmark?competitorIds=comp_123,comp_456&platforms=instagram,twitter&startDate=2024-01-01&endDate=2024-01-31&metric=engagement&granularity=day
Authorization: Bearer {token}
```

**Query Parameters:**
- `competitorIds` (optional): Comma-separated list of competitor IDs to include
- `platforms` (optional): Comma-separated list of platforms (instagram, facebook, twitter, linkedin, tiktok)
- `startDate` (optional): Start date (ISO 8601 format). Default: 30 days ago
- `endDate` (optional): End date (ISO 8601 format). Default: today
- `metric` (optional): Primary metric to focus on (followers, engagement, posts, engagementRate, growth)
- `granularity` (optional): Data granularity (day, week, month)

**Response:**
```json
{
  "workspace": {
    "id": "ws_456",
    "metrics": {
      "followers": 10000,
      "followersGrowth": 500,
      "followersGrowthPercentage": 5.0,
      "totalPosts": 100,
      "postsGrowth": 10,
      "engagementRate": 3.5,
      "engagementRateChange": 0.5,
      "averageLikesPerPost": 350,
      "averageCommentsPerPost": 25,
      "postingFrequency": 3.3
    }
  },
  "competitors": [
    {
      "competitorId": "comp_123",
      "competitorName": "Competitor A",
      "platform": "instagram",
      "metrics": {
        "followers": 15000,
        "followersGrowth": 300,
        "followersGrowthPercentage": 2.0,
        "totalPosts": 120,
        "postsGrowth": 8,
        "engagementRate": 4.2,
        "engagementRateChange": 0.3,
        "averageLikesPerPost": 630,
        "averageCommentsPerPost": 45,
        "postingFrequency": 4.0
      },
      "period": {
        "startDate": "2024-01-01T00:00:00Z",
        "endDate": "2024-01-31T23:59:59Z"
      }
    }
  ],
  "rankings": {
    "byFollowers": [
      {
        "id": "comp_123",
        "name": "Competitor A",
        "value": 15000,
        "rank": 1,
        "isWorkspace": false
      },
      {
        "id": "workspace",
        "name": "Your Brand",
        "value": 10000,
        "rank": 2,
        "isWorkspace": true
      }
    ],
    "byEngagement": [...],
    "byGrowth": [...],
    "byPostingFrequency": [...]
  },
  "insights": [
    "You rank #2 in follower count among competitors.",
    "Your engagement rate is 0.7% lower than the top competitor. Focus on creating more engaging content.",
    "Your follower growth is strong. Keep up the momentum!"
  ]
}
```

#### Get Share of Voice
Analyze your brand's share of voice compared to competitors.

```http
GET /api/analytics/competitive/share-of-voice?competitorIds=comp_123&platforms=instagram&startDate=2024-01-01&endDate=2024-01-31&metric=engagement
Authorization: Bearer {token}
```

**Query Parameters:**
- `competitorIds` (optional): Comma-separated list of competitor IDs
- `platforms` (optional): Comma-separated list of platforms
- `startDate` (optional): Start date (ISO 8601 format)
- `endDate` (optional): End date (ISO 8601 format)
- `metric` (optional): Metric to measure (mentions, engagement, reach)

**Response:**
```json
{
  "totalMentions": 5000,
  "totalEngagement": 25000,
  "totalReach": 250000,
  "breakdown": [
    {
      "id": "ws_456",
      "name": "Your Brand",
      "mentions": 1000,
      "mentionsPercentage": 20.0,
      "engagement": 5000,
      "engagementPercentage": 20.0,
      "reach": 50000,
      "reachPercentage": 20.0,
      "isWorkspace": true
    },
    {
      "id": "comp_123",
      "name": "Competitor A",
      "mentions": 2000,
      "mentionsPercentage": 40.0,
      "engagement": 10000,
      "engagementPercentage": 40.0,
      "reach": 100000,
      "reachPercentage": 40.0,
      "isWorkspace": false
    }
  ],
  "period": {
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z"
  }
}
```

#### Get Industry Benchmarks
Compare your performance against industry averages.

```http
GET /api/analytics/competitive/industry-benchmarks?industry=Social%20Media%20Marketing&platforms=instagram,twitter&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer {token}
```

**Query Parameters:**
- `industry` (required): Industry name
- `platforms` (optional): Comma-separated list of platforms
- `startDate` (optional): Start date (ISO 8601 format)
- `endDate` (optional): End date (ISO 8601 format)

**Response:**
```json
{
  "industry": "Social Media Marketing",
  "benchmarks": [
    {
      "platform": "instagram",
      "averageFollowers": 12500,
      "averageEngagementRate": 3.8,
      "averagePostingFrequency": 3.5,
      "topPerformers": [
        {
          "name": "Top Performer 1",
          "followers": 50000,
          "engagementRate": 6.5
        },
        {
          "name": "Top Performer 2",
          "followers": 45000,
          "engagementRate": 6.2
        }
      ]
    }
  ],
  "workspaceComparison": [
    {
      "platform": "instagram",
      "workspaceValue": 3.5,
      "industryAverage": 3.8,
      "percentile": 50,
      "status": "average"
    }
  ]
}
```

#### Get Competitor Activity
Monitor competitor posting patterns and content strategy.

```http
GET /api/analytics/competitive/activity?competitorId=comp_123&platform=instagram&startDate=2024-01-01&endDate=2024-01-31&limit=30
Authorization: Bearer {token}
```

**Query Parameters:**
- `competitorId` (required): Competitor ID
- `platform` (optional): Platform to filter by
- `startDate` (optional): Start date (ISO 8601 format)
- `endDate` (optional): End date (ISO 8601 format)
- `limit` (optional): Maximum number of days to return (1-100, default: 30)

**Response:**
```json
{
  "competitorId": "comp_123",
  "competitorName": "Competitor A",
  "platform": "instagram",
  "activities": [
    {
      "date": "2024-01-01",
      "posts": 3,
      "totalLikes": 1500,
      "totalComments": 120,
      "totalShares": 45,
      "engagementRate": 4.2,
      "topPosts": [
        {
          "id": "post_123",
          "content": "Post content preview...",
          "likes": 800,
          "comments": 65,
          "shares": 25,
          "timestamp": "2024-01-01T14:30:00Z"
        }
      ]
    }
  ],
  "summary": {
    "totalPosts": 90,
    "averageEngagement": 4.1,
    "peakPostingTime": "12:00 PM",
    "mostUsedHashtags": [
      "#marketing",
      "#socialmedia",
      "#business",
      "#entrepreneur",
      "#digitalmarketing"
    ],
    "contentTypeDistribution": {
      "image": 45,
      "video": 30,
      "carousel": 15
    }
  }
}
```

## Data Collection

Competitor metrics are automatically collected every 6 hours by the `CompetitorMetricsCollectionCron` service. The system:

1. Fetches metrics from platform APIs for all active competitor accounts
2. Stores time-series data in MongoDB
3. Calculates derived metrics (engagement rate, growth, etc.)
4. Maintains 90 days of historical data

## Rate Limiting

- Competitor tracking is limited to 20 competitors per workspace
- Each competitor can have accounts on multiple platforms
- Metrics collection respects platform API rate limits
- Data is cached to minimize API calls

## Best Practices

1. **Strategic Selection**: Track direct competitors and industry leaders
2. **Regular Review**: Review competitor performance weekly
3. **Industry Context**: Use industry benchmarks to set realistic goals
4. **Content Analysis**: Study top-performing competitor content
5. **Share of Voice**: Monitor your brand's visibility vs competitors
6. **Trend Identification**: Identify successful strategies to adapt

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "statusCode": 400,
  "message": "Invalid competitor ID",
  "error": "Bad Request"
}
```

## Integration Examples

### Track New Competitor
```typescript
const response = await fetch('/api/analytics/competitive/competitors', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Competitor Name',
    industry: 'Social Media Marketing',
    accounts: [
      {
        platform: 'instagram',
        platformAccountId: '123456789',
        username: 'competitor_handle',
        displayName: 'Competitor Display Name',
      },
    ],
  }),
});

const competitor = await response.json();
```

### Get Competitive Benchmark
```typescript
const params = new URLSearchParams({
  platforms: 'instagram,twitter',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
});

const response = await fetch(
  `/api/analytics/competitive/benchmark?${params}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const benchmark = await response.json();
```

### Monitor Competitor Activity
```typescript
const params = new URLSearchParams({
  competitorId: 'comp_123',
  platform: 'instagram',
  limit: '30',
});

const response = await fetch(
  `/api/analytics/competitive/activity?${params}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }
);

const activity = await response.json();
```

## Webhooks

Competitive benchmarking supports webhooks for real-time notifications:

- `competitor.metrics.updated`: Triggered when competitor metrics are collected
- `competitor.ranking.changed`: Triggered when your ranking changes
- `competitor.activity.spike`: Triggered when competitor shows unusual activity

Configure webhooks in workspace settings.
