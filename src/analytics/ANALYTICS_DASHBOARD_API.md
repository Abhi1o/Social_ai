# Analytics Dashboard API

## Overview

The Analytics Dashboard API provides comprehensive analytics endpoints for social media performance tracking, including KPIs, engagement metrics, follower growth, platform breakdowns, post performance rankings, and time-series data for visualizations.

**Requirements Implemented:** 4.1, 11.1

## Features

1. **Overview KPIs** - High-level metrics for dashboard display
2. **Engagement Metrics** - Detailed breakdown of likes, comments, shares, saves
3. **Follower Growth Tracking** - Historical follower data with growth rates
4. **Reach & Impressions Aggregation** - Total reach and impressions with growth
5. **Post Performance Ranking** - Top performing posts by various metrics
6. **Platform Breakdown** - Analytics segmented by social platform
7. **Time-Series Data** - Historical data for charts and visualizations

## API Endpoints

### 1. Get Overview Analytics

Get high-level KPI metrics for the dashboard.

**Endpoint:** `GET /api/analytics/dashboard/overview`

**Query Parameters:**
- `startDate` (required): ISO date string (e.g., "2024-01-01")
- `endDate` (required): ISO date string (e.g., "2024-01-31")
- `platforms` (optional): Array of platform names (e.g., ["instagram", "twitter"])
- `accountIds` (optional): Array of social account IDs

**Response:**
```json
{
  "totalFollowers": 15420,
  "followerGrowth": 342,
  "followerGrowthRate": 2.27,
  "totalEngagement": 8945,
  "engagementRate": 4.52,
  "engagementGrowth": 523,
  "totalReach": 197850,
  "reachGrowth": 12340,
  "totalImpressions": 245670,
  "impressionsGrowth": 18920,
  "totalPosts": 45,
  "postsGrowth": 8,
  "avgEngagementPerPost": 198.78
}
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/analytics/dashboard/overview?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Get Engagement Metrics

Get detailed engagement metrics breakdown.

**Endpoint:** `GET /api/analytics/dashboard/engagement`

**Query Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string
- `platforms` (optional): Array of platform names
- `accountIds` (optional): Array of social account IDs

**Response:**
```json
{
  "totalLikes": 5420,
  "totalComments": 1234,
  "totalShares": 892,
  "totalSaves": 1399,
  "totalEngagement": 8945,
  "engagementRate": 4.52,
  "likesGrowth": 342,
  "commentsGrowth": 89,
  "sharesGrowth": 45,
  "savesGrowth": 47
}
```

### 3. Get Follower Growth

Get follower growth tracking over time with trend analysis.

**Endpoint:** `GET /api/analytics/dashboard/follower-growth`

**Query Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string
- `granularity` (optional): "hourly" | "daily" | "weekly" | "monthly" (default: "daily")
- `platforms` (optional): Array of platform names
- `accountIds` (optional): Array of social account IDs

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "followers": 15078,
    "growth": 0,
    "growthRate": 0
  },
  {
    "date": "2024-01-02",
    "followers": 15123,
    "growth": 45,
    "growthRate": 0.30
  },
  {
    "date": "2024-01-03",
    "followers": 15189,
    "growth": 66,
    "growthRate": 0.44
  }
]
```

### 4. Get Platform Breakdown

Get analytics segmented by social media platform.

**Endpoint:** `GET /api/analytics/dashboard/platform-breakdown`

**Query Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string
- `accountIds` (optional): Array of social account IDs

**Response:**
```json
[
  {
    "platform": "instagram",
    "followers": 8420,
    "engagement": 5234,
    "reach": 125340,
    "impressions": 156780,
    "posts": 28,
    "engagementRate": 4.17
  },
  {
    "platform": "twitter",
    "followers": 4200,
    "engagement": 2341,
    "reach": 45670,
    "impressions": 58920,
    "posts": 12,
    "engagementRate": 5.13
  }
]
```

### 5. Get Top Performing Posts

Get ranked list of top performing posts.

**Endpoint:** `GET /api/analytics/dashboard/top-posts`

**Query Parameters:**
- `startDate` (optional): ISO date string (default: 30 days ago)
- `endDate` (optional): ISO date string (default: now)
- `sortBy` (optional): "engagement" | "reach" | "impressions" | "likes" | "comments" (default: "engagement")
- `limit` (optional): Number of posts to return (default: 10)
- `platforms` (optional): Array of platform names

**Response:**
```json
[
  {
    "postId": "uuid-1234",
    "platformPostId": "instagram-post-id",
    "platform": "instagram",
    "content": "Check out our new product launch! 🚀",
    "publishedAt": "2024-01-15T10:30:00Z",
    "likes": 1234,
    "comments": 89,
    "shares": 45,
    "saves": 234,
    "totalEngagement": 1602,
    "reach": 25340,
    "impressions": 32450,
    "engagementRate": 6.32
  }
]
```

### 6. Get Time-Series Data

Get historical metrics data for charts and visualizations.

**Endpoint:** `GET /api/analytics/dashboard/time-series`

**Query Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string
- `granularity` (optional): "hourly" | "daily" | "weekly" | "monthly" (default: "daily")
- `platforms` (optional): Array of platform names
- `accountIds` (optional): Array of social account IDs

**Response:**
```json
[
  {
    "timestamp": "2024-01-01",
    "metrics": {
      "likes": 234,
      "comments": 45,
      "shares": 23,
      "saves": 67,
      "engagement": 369,
      "reach": 8920,
      "impressions": 11450,
      "followers": 15078
    }
  },
  {
    "timestamp": "2024-01-02",
    "metrics": {
      "likes": 289,
      "comments": 52,
      "shares": 31,
      "saves": 78,
      "engagement": 450,
      "reach": 9340,
      "impressions": 12120,
      "followers": 15123
    }
  }
]
```

### 7. Get Reach and Impressions

Get aggregated reach and impressions data.

**Endpoint:** `GET /api/analytics/dashboard/reach-impressions`

**Query Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string
- `platforms` (optional): Array of platform names
- `accountIds` (optional): Array of social account IDs

**Response:**
```json
{
  "totalReach": 197850,
  "reachGrowth": 12340,
  "totalImpressions": 245670,
  "impressionsGrowth": 18920
}
```

## Data Models

### KPIMetrics
```typescript
interface KPIMetrics {
  totalFollowers: number;
  followerGrowth: number;
  followerGrowthRate: number;
  totalEngagement: number;
  engagementRate: number;
  engagementGrowth: number;
  totalReach: number;
  reachGrowth: number;
  totalImpressions: number;
  impressionsGrowth: number;
  totalPosts: number;
  postsGrowth: number;
  avgEngagementPerPost: number;
}
```

### EngagementMetrics
```typescript
interface EngagementMetrics {
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalEngagement: number;
  engagementRate: number;
  likesGrowth: number;
  commentsGrowth: number;
  sharesGrowth: number;
  savesGrowth: number;
}
```

### FollowerGrowthData
```typescript
interface FollowerGrowthData {
  date: string;
  followers: number;
  growth: number;
  growthRate: number;
}
```

### PlatformBreakdown
```typescript
interface PlatformBreakdown {
  platform: string;
  followers: number;
  engagement: number;
  reach: number;
  impressions: number;
  posts: number;
  engagementRate: number;
}
```

### PostPerformance
```typescript
interface PostPerformance {
  postId: string;
  platformPostId: string;
  platform: string;
  content: string;
  publishedAt: Date;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  totalEngagement: number;
  reach: number;
  impressions: number;
  engagementRate: number;
}
```

### TimeSeriesData
```typescript
interface TimeSeriesData {
  timestamp: string;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagement: number;
    reach: number;
    impressions: number;
    followers: number;
  };
}
```

## Usage Examples

### Frontend Integration (React/Next.js)

```typescript
import { useQuery } from '@tanstack/react-query';

// Fetch overview KPIs
const { data: kpis } = useQuery({
  queryKey: ['analytics', 'overview', startDate, endDate],
  queryFn: async () => {
    const response = await fetch(
      `/api/analytics/dashboard/overview?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.json();
  }
});

// Fetch time-series data for chart
const { data: chartData } = useQuery({
  queryKey: ['analytics', 'time-series', startDate, endDate, 'daily'],
  queryFn: async () => {
    const response = await fetch(
      `/api/analytics/dashboard/time-series?startDate=${startDate}&endDate=${endDate}&granularity=daily`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.json();
  }
});

// Fetch top posts
const { data: topPosts } = useQuery({
  queryKey: ['analytics', 'top-posts', 'engagement', 10],
  queryFn: async () => {
    const response = await fetch(
      `/api/analytics/dashboard/top-posts?sortBy=engagement&limit=10`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.json();
  }
});
```

### Dashboard Component Example

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export function AnalyticsDashboard() {
  const { data: kpis } = useOverviewKPIs();
  const { data: chartData } = useTimeSeriesData();
  const { data: topPosts } = useTopPosts();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Followers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.totalFollowers.toLocaleString()}</div>
            <div className="text-sm text-green-600">
              +{kpis?.followerGrowth} ({kpis?.followerGrowthRate}%)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.totalEngagement.toLocaleString()}</div>
            <div className="text-sm text-green-600">
              +{kpis?.engagementGrowth}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reach</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.totalReach.toLocaleString()}</div>
            <div className="text-sm text-green-600">
              +{kpis?.reachGrowth}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.totalPosts}</div>
            <div className="text-sm text-green-600">
              +{kpis?.postsGrowth}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart width={800} height={300} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="metrics.engagement" stroke="#8884d8" />
            <Line type="monotone" dataKey="metrics.reach" stroke="#82ca9d" />
          </LineChart>
        </CardContent>
      </Card>

      {/* Top Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPosts?.map((post) => (
              <div key={post.postId} className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{post.content.substring(0, 50)}...</div>
                  <div className="text-sm text-gray-500">{post.platform}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{post.totalEngagement}</div>
                  <div className="text-sm text-gray-500">{post.engagementRate}%</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Performance Considerations

1. **Caching**: All analytics queries are cached in Redis with appropriate TTLs
2. **Aggregations**: Pre-aggregated data is used when available for faster queries
3. **Indexes**: MongoDB indexes are optimized for time-series queries
4. **Pagination**: Use `limit` parameter for large result sets
5. **Date Ranges**: Limit date ranges to reasonable periods (e.g., 90 days max)

## Error Handling

All endpoints return standard HTTP status codes:
- `200 OK`: Successful request
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "statusCode": 400,
  "message": "Invalid date range",
  "error": "Bad Request"
}
```

## Testing

Run analytics tests:
```bash
npm run test src/analytics
```

Run integration tests:
```bash
npm run test:e2e analytics
```

## Future Enhancements

- [ ] Real-time analytics updates via WebSocket
- [ ] Custom metric calculations
- [ ] Comparative analytics (period over period)
- [ ] Predictive analytics using ML models
- [ ] Export analytics data (CSV, PDF)
- [ ] Scheduled analytics reports
- [ ] Custom dashboard configurations
- [ ] Anomaly detection alerts
