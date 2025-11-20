# Analytics Dashboard API - Integration Example

## Complete Integration Flow

This document demonstrates a complete integration flow for the Analytics Dashboard API, from data collection to visualization.

## Step 1: Data Collection

First, ensure metrics are being collected for your social accounts:

```bash
# Manually trigger metrics collection for a workspace
curl -X POST "http://localhost:3000/api/analytics/workspace/workspace-123/collect" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Or for a specific account
curl -X POST "http://localhost:3000/api/analytics/account/account-456/collect" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Step 2: Fetch Dashboard Data

### Get Overview KPIs

```typescript
// Frontend code (React/Next.js)
import { useState, useEffect } from 'react';

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

function useAnalyticsKPIs(startDate: string, endDate: string) {
  const [kpis, setKpis] = useState<KPIMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKPIs() {
      try {
        const response = await fetch(
          `/api/analytics/dashboard/overview?startDate=${startDate}&endDate=${endDate}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        const data = await response.json();
        setKpis(data);
      } catch (error) {
        console.error('Failed to fetch KPIs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchKPIs();
  }, [startDate, endDate]);

  return { kpis, loading };
}

// Usage in component
function DashboardOverview() {
  const { kpis, loading } = useAnalyticsKPIs('2024-01-01', '2024-01-31');

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        title="Total Followers"
        value={kpis.totalFollowers}
        growth={kpis.followerGrowth}
        growthRate={kpis.followerGrowthRate}
      />
      <MetricCard
        title="Engagement"
        value={kpis.totalEngagement}
        growth={kpis.engagementGrowth}
        rate={kpis.engagementRate}
      />
      <MetricCard
        title="Reach"
        value={kpis.totalReach}
        growth={kpis.reachGrowth}
      />
      <MetricCard
        title="Posts"
        value={kpis.totalPosts}
        growth={kpis.postsGrowth}
      />
    </div>
  );
}
```

### Get Time-Series Data for Charts

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

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

function EngagementChart({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [data, setData] = useState<TimeSeriesData[]>([]);

  useEffect(() => {
    async function fetchTimeSeriesData() {
      const response = await fetch(
        `/api/analytics/dashboard/time-series?startDate=${startDate}&endDate=${endDate}&granularity=daily`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const result = await response.json();
      setData(result);
    }

    fetchTimeSeriesData();
  }, [startDate, endDate]);

  return (
    <div className="w-full h-96">
      <h3 className="text-lg font-semibold mb-4">Engagement Trend</h3>
      <LineChart width={800} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="metrics.engagement" 
          stroke="#8884d8" 
          name="Engagement"
        />
        <Line 
          type="monotone" 
          dataKey="metrics.reach" 
          stroke="#82ca9d" 
          name="Reach"
        />
        <Line 
          type="monotone" 
          dataKey="metrics.followers" 
          stroke="#ffc658" 
          name="Followers"
        />
      </LineChart>
    </div>
  );
}
```

### Get Platform Breakdown

```typescript
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PlatformBreakdown {
  platform: string;
  followers: number;
  engagement: number;
  reach: number;
  impressions: number;
  posts: number;
  engagementRate: number;
}

const COLORS = {
  instagram: '#E4405F',
  twitter: '#1DA1F2',
  facebook: '#4267B2',
  linkedin: '#0077B5',
  tiktok: '#000000',
};

function PlatformBreakdownChart({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [platforms, setPlatforms] = useState<PlatformBreakdown[]>([]);

  useEffect(() => {
    async function fetchPlatformData() {
      const response = await fetch(
        `/api/analytics/dashboard/platform-breakdown?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const result = await response.json();
      setPlatforms(result);
    }

    fetchPlatformData();
  }, [startDate, endDate]);

  const chartData = platforms.map(p => ({
    name: p.platform,
    value: p.engagement,
  }));

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">Platform Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#999999'} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Platform Details Table */}
      <div className="mt-6">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Platform</th>
              <th className="text-right py-2">Followers</th>
              <th className="text-right py-2">Engagement</th>
              <th className="text-right py-2">Posts</th>
              <th className="text-right py-2">Eng. Rate</th>
            </tr>
          </thead>
          <tbody>
            {platforms.map((platform) => (
              <tr key={platform.platform} className="border-b">
                <td className="py-2 capitalize">{platform.platform}</td>
                <td className="text-right">{platform.followers.toLocaleString()}</td>
                <td className="text-right">{platform.engagement.toLocaleString()}</td>
                <td className="text-right">{platform.posts}</td>
                <td className="text-right">{platform.engagementRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Get Top Performing Posts

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

function TopPostsList({ limit = 10 }: { limit?: number }) {
  const [posts, setPosts] = useState<PostPerformance[]>([]);
  const [sortBy, setSortBy] = useState<'engagement' | 'reach' | 'likes'>('engagement');

  useEffect(() => {
    async function fetchTopPosts() {
      const response = await fetch(
        `/api/analytics/dashboard/top-posts?sortBy=${sortBy}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const result = await response.json();
      setPosts(result);
    }

    fetchTopPosts();
  }, [sortBy, limit]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Top Performing Posts</h3>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as any)}
          className="border rounded px-3 py-1"
        >
          <option value="engagement">By Engagement</option>
          <option value="reach">By Reach</option>
          <option value="likes">By Likes</option>
        </select>
      </div>

      <div className="space-y-4">
        {posts.map((post, index) => (
          <div key={post.postId} className="border rounded-lg p-4 hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs uppercase">
                    {post.platform}
                  </span>
                </div>
                <p className="text-gray-800 mb-2">{post.content}</p>
                <p className="text-sm text-gray-500">
                  {new Date(post.publishedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="ml-4 text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {post.totalEngagement.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">Total Engagement</div>
                <div className="text-sm text-green-600 mt-1">
                  {post.engagementRate}% rate
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div>
                <div className="text-sm text-gray-500">Likes</div>
                <div className="font-semibold">{post.likes.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Comments</div>
                <div className="font-semibold">{post.comments.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Shares</div>
                <div className="font-semibold">{post.shares.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Reach</div>
                <div className="font-semibold">{post.reach.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Step 3: Complete Dashboard Page

```typescript
import { useState } from 'react';
import { DateRangePicker } from '@/components/ui/date-range-picker';

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <DateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={setDateRange}
        />
      </div>

      {/* KPI Overview */}
      <DashboardOverview />

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <EngagementChart 
            startDate={dateRange.startDate} 
            endDate={dateRange.endDate} 
          />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <PlatformBreakdownChart 
            startDate={dateRange.startDate} 
            endDate={dateRange.endDate} 
          />
        </div>
      </div>

      {/* Top Posts */}
      <div className="bg-white rounded-lg shadow p-6">
        <TopPostsList limit={10} />
      </div>

      {/* Follower Growth */}
      <div className="bg-white rounded-lg shadow p-6">
        <FollowerGrowthChart 
          startDate={dateRange.startDate} 
          endDate={dateRange.endDate} 
        />
      </div>
    </div>
  );
}
```

## Step 4: Real-Time Updates (Optional)

For real-time analytics updates, you can use WebSocket connections:

```typescript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function useRealtimeAnalytics(workspaceId: string) {
  const [socket, setSocket] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    newSocket.on('connect', () => {
      console.log('Connected to analytics stream');
      newSocket.emit('subscribe', { workspaceId });
    });

    newSocket.on('metrics:update', (data) => {
      setLiveMetrics(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [workspaceId]);

  return liveMetrics;
}
```

## Step 5: Error Handling

```typescript
async function fetchAnalytics(endpoint: string, params: Record<string, string>) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`/api/analytics/dashboard/${endpoint}?${queryString}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login
        window.location.href = '/login';
        return null;
      }
      
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch analytics');
    }

    return await response.json();
  } catch (error) {
    console.error('Analytics fetch error:', error);
    // Show error toast/notification
    return null;
  }
}
```

## Testing the Integration

### 1. Unit Tests

```bash
npm run test src/analytics/services/analytics-dashboard.service.spec.ts
```

### 2. Integration Tests

```bash
npm run test:e2e analytics
```

### 3. Manual Testing with cURL

```bash
# Get overview KPIs
curl -X GET "http://localhost:3000/api/analytics/dashboard/overview?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get time-series data
curl -X GET "http://localhost:3000/api/analytics/dashboard/time-series?startDate=2024-01-01&endDate=2024-01-31&granularity=daily" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get top posts
curl -X GET "http://localhost:3000/api/analytics/dashboard/top-posts?sortBy=engagement&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Performance Optimization Tips

1. **Use React Query for caching:**
```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['analytics', 'overview', startDate, endDate],
  queryFn: () => fetchAnalytics('overview', { startDate, endDate }),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

2. **Implement pagination for large datasets**
3. **Use debouncing for date range changes**
4. **Lazy load charts and heavy components**
5. **Implement virtual scrolling for long lists**

## Conclusion

This integration example demonstrates a complete flow from backend API to frontend visualization. The Analytics Dashboard API provides all the necessary endpoints to build a comprehensive analytics dashboard with real-time updates, interactive charts, and detailed metrics.
