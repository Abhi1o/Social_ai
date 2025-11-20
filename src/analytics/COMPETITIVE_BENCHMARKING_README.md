# Competitive Benchmarking System

## Overview

The Competitive Benchmarking system provides comprehensive competitor tracking and analysis capabilities, enabling users to monitor competitor performance, calculate share of voice, compare against industry benchmarks, and gain competitive intelligence insights.

## Features

### 1. Competitor Account Tracking
- Track up to 20 competitor brands per workspace
- Monitor multiple social media accounts per competitor
- Support for all major platforms (Instagram, Facebook, Twitter, LinkedIn, TikTok, YouTube, Pinterest, Threads, Reddit)
- Automatic metrics collection every 6 hours
- 90-day historical data retention

### 2. Share of Voice Calculation
- Measure brand presence vs competitors
- Calculate share by mentions, engagement, and reach
- Percentage breakdown across all tracked accounts
- Time-series analysis of share of voice trends
- Platform-specific share of voice metrics

### 3. Competitive Performance Comparison
- Side-by-side metrics comparison
- Rankings by followers, engagement, growth, and posting frequency
- Automated insights and recommendations
- Identify performance gaps and opportunities
- Track competitive positioning over time

### 4. Industry Benchmarking
- Compare performance against industry averages
- Identify top performers in your industry
- Percentile rankings for key metrics
- Platform-specific industry standards
- Goal-setting based on industry benchmarks

### 5. Competitor Activity Monitoring
- Track posting frequency and patterns
- Identify peak posting times
- Analyze content type distribution
- Monitor hashtag strategies
- Detect content trends and themes

### 6. Competitive Intelligence Dashboard
- Visual comparison charts
- Real-time ranking updates
- Trend analysis and forecasting
- Automated competitive alerts
- Exportable reports

## Architecture

### Database Schema

**PostgreSQL (Prisma):**
- `competitors`: Competitor profiles and metadata
- `competitor_accounts`: Social media accounts to track

**MongoDB:**
- `competitor_metrics`: Time-series metrics data

### Services

**CompetitiveBenchmarkingService:**
- Core business logic for competitive analysis
- Metrics aggregation and comparison
- Ranking calculations
- Insight generation

**CompetitorMetricsCollectionCron:**
- Automated metrics collection every 6 hours
- Platform API integration
- Error handling and retry logic
- Data cleanup (90-day retention)

### Controllers

**CompetitiveBenchmarkingController:**
- RESTful API endpoints
- Request validation
- Authentication and authorization
- Response formatting

## API Endpoints

### Competitor Management
- `POST /api/analytics/competitive/competitors` - Create competitor
- `GET /api/analytics/competitive/competitors` - List competitors
- `GET /api/analytics/competitive/competitors/:id` - Get competitor
- `PUT /api/analytics/competitive/competitors/:id` - Update competitor
- `DELETE /api/analytics/competitive/competitors/:id` - Delete competitor

### Competitive Analysis
- `GET /api/analytics/competitive/benchmark` - Get competitive benchmark
- `GET /api/analytics/competitive/share-of-voice` - Get share of voice
- `GET /api/analytics/competitive/industry-benchmarks` - Get industry benchmarks
- `GET /api/analytics/competitive/activity` - Get competitor activity

See [COMPETITIVE_BENCHMARKING_API.md](./COMPETITIVE_BENCHMARKING_API.md) for detailed API documentation.

## Data Collection

### Automated Collection
The system automatically collects competitor metrics every 6 hours:

1. **Fetch Metrics**: Retrieve data from platform APIs
2. **Calculate Derived Metrics**: Engagement rate, growth, etc.
3. **Store Data**: Save to MongoDB for time-series analysis
4. **Update Rankings**: Recalculate competitive rankings
5. **Generate Insights**: Create automated recommendations

### Metrics Collected
- Followers/Following counts
- Total posts
- Engagement metrics (likes, comments, shares, saves, views)
- Engagement rate
- Posting frequency
- Content type distribution
- Top hashtags and mentions

### Data Retention
- Raw metrics: 90 days
- Aggregated metrics: Indefinite
- Cleanup runs daily at 2 AM

## Usage Examples

### Track a New Competitor

```typescript
import { CompetitiveBenchmarkingService } from './services/competitive-benchmarking.service';

// Create competitor
const competitor = await competitiveBenchmarkingService.createCompetitor(
  workspaceId,
  {
    name: 'Competitor Name',
    description: 'Main competitor in our market',
    industry: 'Social Media Marketing',
    tags: ['direct-competitor'],
    accounts: [
      {
        platform: 'instagram',
        platformAccountId: '123456789',
        username: 'competitor_handle',
        displayName: 'Competitor Display Name',
      },
    ],
  }
);
```

### Get Competitive Benchmark

```typescript
// Compare performance
const benchmark = await competitiveBenchmarkingService.getCompetitiveBenchmark(
  workspaceId,
  {
    competitorIds: ['comp_123', 'comp_456'],
    platforms: ['instagram', 'twitter'],
    startDate: '2024-01-01',
    endDate: '2024-01-31',
  }
);

console.log('Your rank:', benchmark.rankings.byEngagement.find(r => r.isWorkspace)?.rank);
console.log('Insights:', benchmark.insights);
```

### Calculate Share of Voice

```typescript
// Get share of voice
const shareOfVoice = await competitiveBenchmarkingService.getShareOfVoice(
  workspaceId,
  {
    platforms: ['instagram'],
    startDate: '2024-01-01',
    endDate: '2024-01-31',
  }
);

console.log('Your share:', shareOfVoice.breakdown.find(b => b.isWorkspace)?.engagementPercentage);
```

### Monitor Competitor Activity

```typescript
// Track competitor activity
const activity = await competitiveBenchmarkingService.getCompetitorActivity(
  workspaceId,
  {
    competitorId: 'comp_123',
    platform: 'instagram',
    limit: 30,
  }
);

console.log('Posting frequency:', activity.summary.postingFrequency);
console.log('Top hashtags:', activity.summary.mostUsedHashtags);
```

## Integration with Platform APIs

### Platform-Specific Implementation

The system integrates with platform APIs to fetch competitor metrics:

**Instagram Graph API:**
- Business account insights
- Public profile metrics
- Content performance data

**Twitter API v2:**
- User metrics
- Tweet analytics
- Engagement data

**LinkedIn API:**
- Organization metrics
- Post performance
- Follower demographics

**Facebook Graph API:**
- Page insights
- Post metrics
- Audience data

**TikTok API:**
- Creator metrics
- Video performance
- Engagement data

### Rate Limiting

Each platform has specific rate limits:
- Instagram: 200 calls/hour per user
- Twitter: 300 calls/15 minutes
- LinkedIn: 100 calls/day per app
- Facebook: 200 calls/hour per user
- TikTok: 100 calls/day per app

The system implements:
- Exponential backoff on rate limit errors
- Request queuing and throttling
- Distributed rate limiting across workers
- Automatic retry with jitter

## Performance Optimization

### Caching Strategy
- Competitor metrics: 6-hour TTL
- Industry benchmarks: 24-hour TTL
- Share of voice: 1-hour TTL
- Rankings: Real-time with 5-minute cache

### Database Optimization
- Indexed queries on workspaceId, competitorId, timestamp
- Aggregation pipelines for efficient calculations
- Materialized views for common queries
- Partitioning by date for time-series data

### Scalability
- Horizontal scaling of metrics collection workers
- Distributed job queue with BullMQ
- MongoDB sharding for large datasets
- CDN caching for static reports

## Monitoring and Alerts

### Metrics to Monitor
- Metrics collection success rate
- API error rates by platform
- Data freshness (time since last update)
- Query performance
- Storage usage

### Alerts
- Failed metrics collection (>10% failure rate)
- API rate limit exceeded
- Stale data (>12 hours old)
- Ranking changes (significant drops)
- Competitor activity spikes

## Security and Privacy

### Data Protection
- Encrypted storage of competitor data
- Access control via workspace isolation
- Audit logging of all operations
- GDPR-compliant data retention

### Compliance
- Public data only (no private account tracking)
- Platform terms of service compliance
- Rate limit adherence
- Ethical competitive intelligence

## Testing

### Unit Tests
```bash
npm test src/analytics/services/competitive-benchmarking.service.spec.ts
```

### Integration Tests
```bash
npm test src/analytics/competitive-benchmarking.integration.spec.ts
```

### E2E Tests
```bash
npm run test:e2e -- --grep "Competitive Benchmarking"
```

## Troubleshooting

### Common Issues

**Metrics Not Updating:**
- Check cron job is running
- Verify platform API credentials
- Check rate limit status
- Review error logs

**Inaccurate Rankings:**
- Ensure all competitors have recent data
- Verify date range parameters
- Check for data collection errors
- Recalculate aggregations

**Slow Queries:**
- Check database indexes
- Review query complexity
- Enable query caching
- Optimize aggregation pipelines

## Future Enhancements

### Planned Features
1. **AI-Powered Insights**: ML-based competitive strategy recommendations
2. **Content Analysis**: Deep dive into competitor content themes
3. **Sentiment Analysis**: Track competitor brand sentiment
4. **Predictive Analytics**: Forecast competitor performance
5. **Automated Reporting**: Scheduled competitive intelligence reports
6. **Competitive Alerts**: Real-time notifications of competitor changes
7. **Influencer Tracking**: Monitor competitor influencer partnerships
8. **Ad Monitoring**: Track competitor paid social campaigns

### Roadmap
- Q1 2024: Enhanced content analysis
- Q2 2024: AI-powered insights
- Q3 2024: Predictive analytics
- Q4 2024: Automated reporting

## Contributing

When contributing to competitive benchmarking:

1. Follow existing code patterns
2. Add comprehensive tests
3. Update API documentation
4. Consider performance impact
5. Respect platform rate limits
6. Maintain data privacy standards

## Support

For issues or questions:
- GitHub Issues: [Link to issues]
- Documentation: [Link to docs]
- Email: support@example.com

## License

[License information]
