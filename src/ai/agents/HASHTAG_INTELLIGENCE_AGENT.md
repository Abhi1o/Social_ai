# Hashtag Intelligence Agent

## Overview

The Hashtag Intelligence Agent is a specialized AI component that provides comprehensive hashtag analysis, categorization, performance tracking, and trend detection capabilities. It helps users maximize content discoverability and reach through strategic hashtag selection.

## Features

### 1. Hashtag Analysis and Suggestions
- **Content Analysis**: Analyzes post content to suggest relevant hashtags
- **Platform-Specific Optimization**: Tailored recommendations for each social platform
- **Categorization**: Hashtags categorized by reach potential (high-reach, medium-reach, niche)
- **Competition Analysis**: Assesses competition level for each hashtag
- **Relevance Scoring**: Scores hashtags based on content alignment (0-100)
- **Reach Estimation**: Estimates potential reach for each hashtag

### 2. Hashtag Performance Tracking
- **Historical Performance**: Tracks hashtag performance over time
- **Engagement Metrics**: Monitors total engagement, average engagement, and engagement rate
- **Trend Detection**: Identifies rising, stable, or declining hashtags
- **Performance Recommendations**: Provides actionable insights based on data
- **Best Performer Identification**: Highlights top-performing hashtags

### 3. Hashtag Group Management
- **Create Groups**: Save and organize hashtag sets for different content categories
- **Reusable Sets**: Quickly apply pre-defined hashtag groups to posts
- **Category Organization**: Organize groups by campaign, topic, or platform
- **Easy Management**: Update and delete groups as needed

### 4. Trending Hashtag Detection
- **Real-Time Trends**: Identifies currently trending hashtags
- **Growth Velocity**: Calculates how fast hashtags are growing
- **Sentiment Analysis**: Assesses sentiment around trending topics
- **Related Topics**: Identifies related hashtags and topics
- **Platform-Specific Trends**: Filters trends by platform

### 5. Competition Analysis
- **Competition Level**: Assesses low, medium, or high competition
- **Difficulty Score**: Provides 0-100 difficulty rating
- **Strategic Recommendations**: Suggests how to use competitive hashtags
- **Volume Analysis**: Estimates total posts using the hashtag

## API Endpoints

### Analyze Content for Hashtags
```http
POST /api/ai/hashtags/analyze
Authorization: Bearer <token>

{
  "content": "Tips for creating engaging social media content",
  "platform": "instagram",
  "count": 30
}
```

**Response:**
```json
{
  "hashtags": [
    {
      "tag": "socialmedia",
      "category": "high-reach",
      "competition": "high",
      "relevanceScore": 85,
      "estimatedReach": 100000,
      "reasoning": "Highly relevant to social media content"
    }
  ],
  "totalSuggestions": 30,
  "categoryBreakdown": {
    "highReach": 9,
    "mediumReach": 12,
    "niche": 9
  },
  "cost": 0.001,
  "tokensUsed": 300
}
```

### Track Hashtag Performance
```http
POST /api/ai/hashtags/performance
Authorization: Bearer <token>

{
  "hashtags": ["marketing", "socialmedia", "contentcreation"],
  "platform": "instagram",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Response:**
```json
{
  "performance": [
    {
      "tag": "marketing",
      "totalPosts": 45,
      "totalEngagement": 3500,
      "averageEngagement": 77.8,
      "totalReach": 45000,
      "averageReach": 1000,
      "engagementRate": 7.78,
      "trend": "rising"
    }
  ],
  "recommendations": [
    "Top performing hashtags: #marketing, #socialmedia. Continue using these for maximum engagement.",
    "Rising hashtags with growth potential: #contentcreation"
  ]
}
```

### Get Trending Hashtags
```http
GET /api/ai/hashtags/trending?platform=instagram&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "trending": [
    {
      "tag": "trending",
      "platform": "instagram",
      "volume": 50000,
      "growthVelocity": 150,
      "sentiment": 0.7,
      "relatedTopics": ["viral", "popular"],
      "estimatedReach": 1000000
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Analyze Hashtag Competition
```http
GET /api/ai/hashtags/marketing/competition?platform=instagram
Authorization: Bearer <token>
```

**Response:**
```json
{
  "competition": "high",
  "totalPosts": 5000000,
  "averageEngagement": 850,
  "topPerformers": 75,
  "difficulty": 80,
  "recommendation": "High competition. Use in combination with niche hashtags for better visibility."
}
```

### Create Hashtag Group
```http
POST /api/ai/hashtags/groups
Authorization: Bearer <token>

{
  "name": "Marketing Hashtags",
  "hashtags": ["marketing", "socialmedia", "digitalmarketing"],
  "description": "Hashtags for marketing campaigns",
  "category": "marketing"
}
```

### Get Hashtag Groups
```http
GET /api/ai/hashtags/groups
Authorization: Bearer <token>
```

### Update Hashtag Group
```http
PUT /api/ai/hashtags/groups/:id
Authorization: Bearer <token>

{
  "name": "Updated Name",
  "hashtags": ["new1", "new2"]
}
```

### Delete Hashtag Group
```http
DELETE /api/ai/hashtags/groups/:id
Authorization: Bearer <token>
```

## Platform-Specific Guidelines

### Instagram
- **Optimal Count**: 5-15 hashtags (up to 30 allowed)
- **Strategy**: Mix of high-reach, medium-reach, and niche hashtags
- **Placement**: Caption or first comment
- **Best Practices**: Use branded hashtags, avoid banned hashtags, consider location-based tags

### Twitter
- **Optimal Count**: 1-2 hashtags
- **Strategy**: Keep hashtags short and memorable
- **Placement**: Naturally within tweet text
- **Best Practices**: Use trending hashtags when relevant, avoid hashtag stuffing

### LinkedIn
- **Optimal Count**: 3-5 hashtags
- **Strategy**: Professional, industry-specific hashtags
- **Placement**: End of post
- **Best Practices**: Focus on thought leadership topics, mix broad and niche

### Facebook
- **Optimal Count**: 1-3 hashtags
- **Strategy**: Use sparingly compared to other platforms
- **Placement**: Within post text
- **Best Practices**: Focus on branded or campaign hashtags

### TikTok
- **Optimal Count**: 3-8 hashtags
- **Strategy**: Mix viral and niche hashtags
- **Placement**: Caption
- **Best Practices**: Use trending hashtags, include challenge hashtags, use #FYP strategically

## Categorization System

### High-Reach Hashtags
- **Definition**: Popular hashtags with 1M+ posts
- **Characteristics**: Broad appeal, high competition, maximum visibility
- **Use Case**: Brand awareness, reaching new audiences
- **Recommendation**: Use 30% of total hashtags

### Medium-Reach Hashtags
- **Definition**: Moderately popular hashtags with 100K-1M posts
- **Characteristics**: Balanced reach and competition
- **Use Case**: Targeted reach with manageable competition
- **Recommendation**: Use 40% of total hashtags

### Niche Hashtags
- **Definition**: Specific hashtags with <100K posts
- **Characteristics**: Low competition, highly targeted, specific audience
- **Use Case**: Reaching engaged, specific communities
- **Recommendation**: Use 30% of total hashtags

## Competition Levels

### Low Competition
- **Characteristics**: Easy to rank, less saturated
- **Difficulty**: 0-30
- **Strategy**: Excellent for visibility and engagement
- **Recommendation**: Use for targeted reach

### Medium Competition
- **Characteristics**: Moderate competition, balanced opportunity
- **Difficulty**: 31-60
- **Strategy**: Good balance of reach and discoverability
- **Recommendation**: Core of hashtag strategy

### High Competition
- **Characteristics**: Very competitive, harder to stand out
- **Difficulty**: 61-100
- **Strategy**: High potential reach but requires strong content
- **Recommendation**: Use sparingly with niche hashtags

## Performance Metrics

### Engagement Rate
- **Formula**: (Total Engagement / Total Reach) × 100
- **Good**: > 5%
- **Average**: 2-5%
- **Poor**: < 2%

### Trend Classification
- **Rising**: Average engagement > 100
- **Stable**: Average engagement 50-100
- **Declining**: Average engagement < 50

## Best Practices

### Content Analysis
1. Analyze content themes and topics
2. Extract key keywords and concepts
3. Consider target audience
4. Match hashtags to content intent
5. Balance reach and relevance

### Hashtag Selection
1. Use 30% high-reach, 40% medium-reach, 30% niche
2. Ensure high relevance to content
3. Check competition levels
4. Avoid banned or spammy hashtags
5. Include branded hashtags when relevant

### Performance Optimization
1. Track hashtag performance regularly
2. Replace underperforming hashtags
3. Double down on top performers
4. Test new hashtags systematically
5. Adjust strategy based on data

### Group Management
1. Create groups for different content types
2. Organize by campaign or topic
3. Update groups based on performance
4. Maintain 3-5 core groups
5. Review and refresh quarterly

## Cost Optimization

### Caching Strategy
- **Analysis Cache**: 24 hours TTL
- **Trending Cache**: 1 hour TTL (trends change quickly)
- **Performance Cache**: No caching (real-time data)

### Model Selection
- **Primary Model**: GPT-4o-mini (cost-efficient)
- **Temperature**: 0.5 (balanced creativity and focus)
- **Max Tokens**: 2000 (sufficient for comprehensive analysis)

### Cost Estimates
- **Hashtag Analysis**: ~$0.001 per request
- **Trending Detection**: ~$0.001 per request
- **Performance Tracking**: No AI cost (database queries)

## Integration Examples

### Content Creator Agent Integration
```typescript
// Generate content with hashtag suggestions
const content = await contentCreatorAgent.generateContent(request);
const hashtags = await hashtagAgent.analyzeAndSuggest({
  content: content.variations[0].content.text,
  platform: 'instagram',
  workspaceId: request.workspaceId,
});

// Combine content with optimized hashtags
const finalPost = {
  ...content.variations[0],
  hashtags: hashtags.hashtags.slice(0, 10).map(h => h.tag),
};
```

### Strategy Agent Integration
```typescript
// Get hashtag performance as part of strategy analysis
const performance = await hashtagAgent.trackPerformance({
  hashtags: ['marketing', 'socialmedia'],
  platform: 'instagram',
  workspaceId: request.workspaceId,
});

// Include in strategy recommendations
const strategy = await strategyAgent.analyzePerformance({
  ...request,
  hashtagPerformance: performance,
});
```

## Future Enhancements

### Planned Features
1. **AI-Powered Hashtag Generation**: Create custom branded hashtags
2. **Competitor Hashtag Analysis**: Analyze competitor hashtag strategies
3. **Hashtag Scheduling**: Rotate hashtags to avoid spam detection
4. **A/B Testing**: Test different hashtag combinations
5. **Hashtag Analytics Dashboard**: Visual performance tracking
6. **Banned Hashtag Detection**: Automatically filter banned hashtags
7. **Hashtag Clustering**: Group similar hashtags automatically
8. **Seasonal Trend Prediction**: Predict upcoming seasonal trends

### Database Integration
- Store hashtag performance history
- Track hashtag usage across posts
- Build hashtag recommendation engine based on historical data
- Implement hashtag groups in database

## Requirements Validation

This implementation satisfies the following requirements:

### Requirement 18.1
✅ **Hashtag Analysis and Suggestion**: AI analyzes content and suggests 30 relevant hashtags categorized by reach potential (high, medium, niche) and competition level

### Requirement 18.2
✅ **Performance Tracking**: Measures hashtag effectiveness including reach, impressions, and engagement per hashtag

### Requirement 18.3
✅ **Hashtag Groups**: Maintains hashtag groups allowing users to save and reuse hashtag sets for different content categories

### Requirement 18.4
✅ **Trending Detection**: Identifies trending hashtags in real-time with growth velocity and relevance scoring

### Requirement 18.5
✅ **Analytics**: Provides hashtag analytics showing best-performing hashtags, optimal hashtag count, and placement recommendations

## Testing

Comprehensive test suite covers:
- ✅ Hashtag analysis and suggestions
- ✅ Platform-specific optimization
- ✅ Performance tracking
- ✅ Hashtag group management (CRUD operations)
- ✅ Trending hashtag detection
- ✅ Competition analysis
- ✅ Category breakdown calculation
- ✅ Hashtag scoring and ranking
- ✅ Error handling and fallbacks

Run tests:
```bash
npm test -- hashtag-intelligence.agent.spec.ts
```

## Conclusion

The Hashtag Intelligence Agent provides a comprehensive solution for hashtag optimization, combining AI-powered analysis with performance tracking and trend detection. It helps users maximize content discoverability and engagement through strategic hashtag selection and data-driven optimization.
