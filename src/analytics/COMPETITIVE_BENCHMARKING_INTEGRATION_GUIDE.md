# Competitive Benchmarking Integration Guide

## Quick Start

### 1. Database Setup

First, run the Prisma migration to create the necessary tables:

```bash
# Run migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 2. Environment Variables

Ensure your `.env` file includes:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ai_social_platform"
MONGODB_URI="mongodb://localhost:27017/ai_social_platform"
```

### 3. Module Import

The competitive benchmarking module is already integrated into the analytics module. No additional imports needed.

### 4. Start the Application

```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## API Usage Examples

### Track a Competitor

```typescript
// Example: Track a competitor on Instagram and Twitter
const response = await fetch('http://localhost:3000/api/analytics/competitive/competitors', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Hootsuite',
    description: 'Leading social media management platform',
    industry: 'Social Media Marketing',
    tags: ['direct-competitor', 'enterprise'],
    accounts: [
      {
        platform: 'instagram',
        platformAccountId: '123456789',
        username: 'hootsuite',
        displayName: 'Hootsuite',
        avatar: 'https://example.com/avatar.jpg'
      },
      {
        platform: 'twitter',
        platformAccountId: '987654321',
        username: 'hootsuite',
        displayName: 'Hootsuite'
      }
    ]
  })
});

const competitor = await response.json();
console.log('Competitor created:', competitor.id);
```

### Get Competitive Benchmark

```typescript
// Example: Compare your performance against competitors
const params = new URLSearchParams({
  platforms: 'instagram,twitter',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  metric: 'engagement'
});

const response = await fetch(
  `http://localhost:3000/api/analytics/competitive/benchmark?${params}`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  }
);

const benchmark = await response.json();

// Display rankings
console.log('Your rank by engagement:', 
  benchmark.rankings.byEngagement.find(r => r.isWorkspace)?.rank
);

// Display insights
benchmark.insights.forEach(insight => {
  console.log('💡', insight);
});
```

### Calculate Share of Voice

```typescript
// Example: Calculate your share of voice
const response = await fetch(
  'http://localhost:3000/api/analytics/competitive/share-of-voice?platforms=instagram',
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  }
);

const shareOfVoice = await response.json();

// Display your share
const yourShare = shareOfVoice.breakdown.find(b => b.isWorkspace);
console.log(`Your engagement share: ${yourShare.engagementPercentage.toFixed(1)}%`);

// Display competitor shares
shareOfVoice.breakdown
  .filter(b => !b.isWorkspace)
  .forEach(competitor => {
    console.log(`${competitor.name}: ${competitor.engagementPercentage.toFixed(1)}%`);
  });
```

### Monitor Competitor Activity

```typescript
// Example: Monitor competitor posting patterns
const params = new URLSearchParams({
  competitorId: 'comp_123',
  platform: 'instagram',
  limit: '30'
});

const response = await fetch(
  `http://localhost:3000/api/analytics/competitive/activity?${params}`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  }
);

const activity = await response.json();

console.log('Posting frequency:', activity.summary.postingFrequency, 'posts/day');
console.log('Peak posting time:', activity.summary.peakPostingTime);
console.log('Top hashtags:', activity.summary.mostUsedHashtags.join(', '));
```

## Frontend Integration

### React Component Example

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface CompetitiveBenchmark {
  workspace: any;
  competitors: any[];
  rankings: any;
  insights: string[];
}

export function CompetitiveBenchmarkDashboard() {
  const { token } = useAuth();
  const [benchmark, setBenchmark] = useState<CompetitiveBenchmark | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBenchmark() {
      try {
        const response = await fetch(
          '/api/analytics/competitive/benchmark?platforms=instagram,twitter',
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            }
          }
        );
        const data = await response.json();
        setBenchmark(data);
      } catch (error) {
        console.error('Failed to fetch benchmark:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBenchmark();
  }, [token]);

  if (loading) return <div>Loading...</div>;
  if (!benchmark) return <div>No data available</div>;

  return (
    <div className="competitive-benchmark">
      <h2>Competitive Benchmark</h2>
      
      {/* Rankings */}
      <div className="rankings">
        <h3>Rankings by Engagement</h3>
        <ol>
          {benchmark.rankings.byEngagement.map(item => (
            <li key={item.id} className={item.isWorkspace ? 'highlight' : ''}>
              {item.name}: {item.value.toFixed(2)}%
            </li>
          ))}
        </ol>
      </div>

      {/* Insights */}
      <div className="insights">
        <h3>Insights</h3>
        <ul>
          {benchmark.insights.map((insight, index) => (
            <li key={index}>{insight}</li>
          ))}
        </ul>
      </div>

      {/* Competitor Metrics */}
      <div className="competitors">
        <h3>Competitor Performance</h3>
        <table>
          <thead>
            <tr>
              <th>Competitor</th>
              <th>Platform</th>
              <th>Followers</th>
              <th>Engagement Rate</th>
              <th>Growth</th>
            </tr>
          </thead>
          <tbody>
            {benchmark.competitors.map(comp => (
              <tr key={`${comp.competitorId}-${comp.platform}`}>
                <td>{comp.competitorName}</td>
                <td>{comp.platform}</td>
                <td>{comp.metrics.followers.toLocaleString()}</td>
                <td>{comp.metrics.engagementRate.toFixed(2)}%</td>
                <td>{comp.metrics.followersGrowthPercentage.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Next.js Page Example

```typescript
// app/analytics/competitive/page.tsx
import { CompetitiveBenchmarkDashboard } from '@/components/CompetitiveBenchmarkDashboard';
import { ShareOfVoiceChart } from '@/components/ShareOfVoiceChart';
import { CompetitorActivityTimeline } from '@/components/CompetitorActivityTimeline';

export default function CompetitiveAnalyticsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Competitive Analytics</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompetitiveBenchmarkDashboard />
        <ShareOfVoiceChart />
      </div>
      
      <div className="mt-6">
        <CompetitorActivityTimeline />
      </div>
    </div>
  );
}
```

## Backend Integration

### Using the Service in Other Modules

```typescript
import { Injectable } from '@nestjs/common';
import { CompetitiveBenchmarkingService } from '../analytics/services/competitive-benchmarking.service';

@Injectable()
export class ReportingService {
  constructor(
    private competitiveBenchmarkingService: CompetitiveBenchmarkingService,
  ) {}

  async generateCompetitiveReport(workspaceId: string) {
    // Get competitive benchmark
    const benchmark = await this.competitiveBenchmarkingService.getCompetitiveBenchmark(
      workspaceId,
      {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      }
    );

    // Get share of voice
    const shareOfVoice = await this.competitiveBenchmarkingService.getShareOfVoice(
      workspaceId,
      {}
    );

    // Generate report
    return {
      title: 'Competitive Analysis Report',
      generatedAt: new Date(),
      benchmark,
      shareOfVoice,
    };
  }
}
```

### Creating Custom Alerts

```typescript
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CompetitiveBenchmarkingService } from '../analytics/services/competitive-benchmarking.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class CompetitiveAlertService {
  constructor(
    private competitiveBenchmarkingService: CompetitiveBenchmarkingService,
    private notificationService: NotificationService,
  ) {}

  @Cron('0 9 * * *') // Daily at 9 AM
  async checkCompetitivePosition() {
    const workspaces = await this.getActiveWorkspaces();

    for (const workspace of workspaces) {
      const benchmark = await this.competitiveBenchmarkingService.getCompetitiveBenchmark(
        workspace.id,
        {}
      );

      // Check if ranking dropped
      const currentRank = benchmark.rankings.byEngagement.find(r => r.isWorkspace)?.rank;
      const previousRank = await this.getPreviousRank(workspace.id);

      if (currentRank > previousRank) {
        await this.notificationService.send({
          workspaceId: workspace.id,
          type: 'competitive_alert',
          title: 'Competitive Position Changed',
          message: `Your engagement ranking dropped from #${previousRank} to #${currentRank}`,
          severity: 'warning',
        });
      }
    }
  }

  private async getActiveWorkspaces() {
    // Implementation
    return [];
  }

  private async getPreviousRank(workspaceId: string) {
    // Implementation
    return 1;
  }
}
```

## Platform API Integration

### Instagram Metrics Fetcher

```typescript
import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class InstagramCompetitorFetcher {
  async fetchMetrics(username: string, accessToken: string) {
    try {
      // Get user ID from username
      const userResponse = await axios.get(
        `https://graph.instagram.com/v18.0/${username}`,
        {
          params: {
            fields: 'id,username,followers_count,follows_count,media_count',
            access_token: accessToken,
          },
        }
      );

      const user = userResponse.data;

      // Get recent media
      const mediaResponse = await axios.get(
        `https://graph.instagram.com/v18.0/${user.id}/media`,
        {
          params: {
            fields: 'id,caption,like_count,comments_count,timestamp',
            limit: 25,
            access_token: accessToken,
          },
        }
      );

      const media = mediaResponse.data.data;

      // Calculate metrics
      const totalLikes = media.reduce((sum, m) => sum + (m.like_count || 0), 0);
      const totalComments = media.reduce((sum, m) => sum + (m.comments_count || 0), 0);
      const engagementRate = user.followers_count > 0
        ? ((totalLikes + totalComments) / (user.followers_count * media.length)) * 100
        : 0;

      return {
        followers: user.followers_count,
        following: user.follows_count,
        totalPosts: user.media_count,
        totalLikes,
        totalComments,
        totalShares: 0, // Not available via API
        totalViews: 0, // Not available for all content types
        totalSaves: 0, // Not available via API
        engagementRate,
        averageLikesPerPost: media.length > 0 ? totalLikes / media.length : 0,
        averageCommentsPerPost: media.length > 0 ? totalComments / media.length : 0,
        postingFrequency: this.calculatePostingFrequency(media),
      };
    } catch (error) {
      console.error('Failed to fetch Instagram metrics:', error);
      throw error;
    }
  }

  private calculatePostingFrequency(media: any[]) {
    if (media.length < 2) return 0;

    const timestamps = media.map(m => new Date(m.timestamp).getTime());
    const sortedTimestamps = timestamps.sort((a, b) => b - a);
    
    const daysDiff = (sortedTimestamps[0] - sortedTimestamps[sortedTimestamps.length - 1]) / (1000 * 60 * 60 * 24);
    
    return daysDiff > 0 ? media.length / daysDiff : 0;
  }
}
```

### Twitter Metrics Fetcher

```typescript
import { Injectable } from '@nestjs/common';
import { TwitterApi } from 'twitter-api-v2';

@Injectable()
export class TwitterCompetitorFetcher {
  private client: TwitterApi;

  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
  }

  async fetchMetrics(username: string) {
    try {
      // Get user info
      const user = await this.client.v2.userByUsername(username, {
        'user.fields': ['public_metrics', 'created_at'],
      });

      // Get recent tweets
      const tweets = await this.client.v2.userTimeline(user.data.id, {
        max_results: 100,
        'tweet.fields': ['public_metrics', 'created_at'],
      });

      const tweetData = tweets.data.data || [];

      // Calculate metrics
      const totalLikes = tweetData.reduce((sum, t) => sum + (t.public_metrics?.like_count || 0), 0);
      const totalRetweets = tweetData.reduce((sum, t) => sum + (t.public_metrics?.retweet_count || 0), 0);
      const totalReplies = tweetData.reduce((sum, t) => sum + (t.public_metrics?.reply_count || 0), 0);

      const followers = user.data.public_metrics?.followers_count || 0;
      const engagementRate = followers > 0 && tweetData.length > 0
        ? ((totalLikes + totalRetweets + totalReplies) / (followers * tweetData.length)) * 100
        : 0;

      return {
        followers,
        following: user.data.public_metrics?.following_count || 0,
        totalPosts: user.data.public_metrics?.tweet_count || 0,
        totalLikes,
        totalComments: totalReplies,
        totalShares: totalRetweets,
        totalViews: 0, // Not available
        totalSaves: 0, // Not available
        engagementRate,
        averageLikesPerPost: tweetData.length > 0 ? totalLikes / tweetData.length : 0,
        averageCommentsPerPost: tweetData.length > 0 ? totalReplies / tweetData.length : 0,
        postingFrequency: this.calculatePostingFrequency(tweetData),
      };
    } catch (error) {
      console.error('Failed to fetch Twitter metrics:', error);
      throw error;
    }
  }

  private calculatePostingFrequency(tweets: any[]) {
    if (tweets.length < 2) return 0;

    const timestamps = tweets.map(t => new Date(t.created_at).getTime());
    const sortedTimestamps = timestamps.sort((a, b) => b - a);
    
    const daysDiff = (sortedTimestamps[0] - sortedTimestamps[sortedTimestamps.length - 1]) / (1000 * 60 * 60 * 24);
    
    return daysDiff > 0 ? tweets.length / daysDiff : 0;
  }
}
```

## Testing

### Integration Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Competitive Benchmarking (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let competitorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login and get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a competitor', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/analytics/competitive/competitors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Competitor',
        industry: 'Social Media',
        accounts: [
          {
            platform: 'instagram',
            platformAccountId: '123456',
            username: 'test_competitor',
            displayName: 'Test Competitor',
          },
        ],
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Test Competitor');
    competitorId = response.body.id;
  });

  it('should get competitive benchmark', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/analytics/competitive/benchmark')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('workspace');
    expect(response.body).toHaveProperty('competitors');
    expect(response.body).toHaveProperty('rankings');
    expect(response.body).toHaveProperty('insights');
  });

  it('should delete a competitor', async () => {
    await request(app.getHttpServer())
      .delete(`/api/analytics/competitive/competitors/${competitorId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
```

## Troubleshooting

### Common Issues

**Issue: Prisma client not generated**
```bash
# Solution: Generate Prisma client
npx prisma generate
```

**Issue: Migration fails**
```bash
# Solution: Reset database and run migrations
npx prisma migrate reset
npx prisma migrate deploy
```

**Issue: MongoDB connection error**
```bash
# Solution: Check MongoDB is running
# Windows:
net start MongoDB

# Linux/Mac:
sudo systemctl start mongod
```

**Issue: Cron jobs not running**
```typescript
// Solution: Ensure ScheduleModule is imported in app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ... other modules
  ],
})
export class AppModule {}
```

## Performance Optimization

### Enable Query Caching

```typescript
// In competitive-benchmarking.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CompetitiveBenchmarkingService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    // ... other dependencies
  ) {}

  async getCompetitiveBenchmark(workspaceId: string, query: any) {
    const cacheKey = `benchmark:${workspaceId}:${JSON.stringify(query)}`;
    
    // Check cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // Calculate benchmark
    const result = await this.calculateBenchmark(workspaceId, query);

    // Store in cache (6 hours)
    await this.cacheManager.set(cacheKey, result, 6 * 60 * 60 * 1000);

    return result;
  }
}
```

### Database Query Optimization

```typescript
// Use lean() for MongoDB queries to improve performance
const metrics = await this.competitorMetricModel
  .find(query)
  .lean()
  .sort({ timestamp: -1 })
  .limit(100);

// Use select() to fetch only needed fields
const competitors = await this.prisma.competitor.findMany({
  where: { workspaceId },
  select: {
    id: true,
    name: true,
    accounts: {
      select: {
        id: true,
        platform: true,
        username: true,
      },
    },
  },
});
```

## Next Steps

1. **Implement Platform API Integration**: Replace mock data with real platform API calls
2. **Add Real-time Updates**: Implement WebSocket for live competitive updates
3. **Create Dashboard UI**: Build React components for visualization
4. **Set Up Monitoring**: Configure alerts and logging
5. **Performance Testing**: Load test with realistic data volumes
6. **Documentation**: Add API documentation with Swagger/OpenAPI

## Support

For questions or issues:
- Check the [API Documentation](./COMPETITIVE_BENCHMARKING_API.md)
- Review the [Architecture Guide](./COMPETITIVE_BENCHMARKING_ARCHITECTURE.md)
- Read the [README](./COMPETITIVE_BENCHMARKING_README.md)
- Open an issue on GitHub
