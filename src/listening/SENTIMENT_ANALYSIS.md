# Sentiment Analysis Engine

## Overview

The Sentiment Analysis Engine provides AI-powered sentiment analysis for social media mentions using Hugging Face Transformers. It analyzes text content to determine sentiment (positive, neutral, negative) with confidence scores, tracks sentiment trends over time, and provides topic-based sentiment breakdowns.

**Requirements:** 9.2, 9.4

## Features

### 1. AI-Powered Sentiment Analysis
- Uses Hugging Face Transformers (DistilBERT model fine-tuned on SST-2)
- Sentiment classification: POSITIVE, NEUTRAL, NEGATIVE
- Sentiment scoring on -1 to 1 scale
- Confidence scores for each classification
- Automatic text preprocessing (removes URLs, mentions, hashtags)
- Fallback to keyword-based analysis if AI model unavailable

### 2. Batch Processing
- Efficient batch sentiment analysis for multiple texts
- Automatic sentiment updates for mentions
- Batch update capabilities for large datasets

### 3. Sentiment Trend Analysis
- Time-series sentiment tracking
- Configurable time intervals (hourly, daily)
- Aggregated statistics per time period
- Sentiment distribution (positive/neutral/negative counts)

### 4. Topic-Based Sentiment Breakdown
- Sentiment analysis grouped by topics/tags
- Percentage distribution per topic
- Average sentiment scores per topic
- Sorted by mention count

### 5. Sentiment Timeline Visualization
- Formatted data for charting libraries
- Summary statistics (average score, trend, volatility)
- Trend detection (improving, declining, stable)
- Volatility calculation (standard deviation)

## Architecture

### Service: SentimentAnalysisService

Located at: `src/listening/services/sentiment-analysis.service.ts`

**Key Methods:**

```typescript
// Analyze single text
analyzeSentiment(text: string): Promise<SentimentAnalysisResult>

// Analyze multiple texts
analyzeSentimentBatch(texts: string[]): Promise<SentimentAnalysisResult[]>

// Update mention sentiment
updateMentionSentiment(mentionId: string): Promise<void>

// Batch update mentions
updateMentionsSentimentBatch(mentionIds: string[]): Promise<number>

// Get sentiment trends
getSentimentTrend(
  workspaceId: string,
  queryId?: string,
  days?: number,
  interval?: 'day' | 'hour'
): Promise<SentimentTrendPoint[]>

// Get topic sentiment breakdown
getTopicSentimentBreakdown(
  workspaceId: string,
  queryId?: string,
  days?: number
): Promise<TopicSentiment[]>

// Get sentiment timeline
getSentimentTimeline(
  workspaceId: string,
  queryId?: string,
  days?: number
): Promise<{
  timeline: Array<{...}>;
  summary: {...};
}>
```

### Controller: SentimentAnalysisController

Located at: `src/listening/controllers/sentiment-analysis.controller.ts`

**Endpoints:**

- `POST /listening/sentiment/analyze` - Analyze sentiment of text
- `POST /listening/sentiment/analyze/batch` - Batch sentiment analysis
- `POST /listening/sentiment/mentions/update` - Update mention sentiment
- `POST /listening/sentiment/mentions/update/batch` - Batch update mentions
- `GET /listening/sentiment/trend` - Get sentiment trend
- `GET /listening/sentiment/topics` - Get topic sentiment breakdown
- `GET /listening/sentiment/timeline` - Get sentiment timeline

## Data Models

### SentimentAnalysisResult

```typescript
interface SentimentAnalysisResult {
  sentiment: Sentiment; // POSITIVE | NEUTRAL | NEGATIVE
  score: number; // -1 to 1 scale
  confidence: number; // 0 to 1
  rawScores: {
    positive: number;
    neutral: number;
    negative: number;
  };
}
```

### SentimentTrendPoint

```typescript
interface SentimentTrendPoint {
  date: Date;
  averageScore: number;
  sentiment: Sentiment;
  mentionCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
}
```

### TopicSentiment

```typescript
interface TopicSentiment {
  topic: string;
  averageScore: number;
  sentiment: Sentiment;
  mentionCount: number;
  positivePercentage: number;
  neutralPercentage: number;
  negativePercentage: number;
}
```

## Integration

### Automatic Sentiment Analysis

The sentiment analysis service is automatically integrated with the mention processing pipeline. When new mentions are collected:

1. Mention is received from social platform
2. Content is preprocessed (spam filtering, categorization)
3. **Sentiment analysis is performed automatically**
4. Mention is stored with sentiment score
5. Real-time updates sent to frontend

### Manual Sentiment Updates

You can manually trigger sentiment analysis for existing mentions:

```typescript
// Update single mention
await sentimentService.updateMentionSentiment(mentionId);

// Batch update
await sentimentService.updateMentionsSentimentBatch([id1, id2, id3]);
```

## API Usage Examples

### Analyze Text Sentiment

```bash
POST /listening/sentiment/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "I love this product! It works amazingly well."
}

Response:
{
  "sentiment": "POSITIVE",
  "score": 0.85,
  "confidence": 0.92,
  "rawScores": {
    "positive": 0.92,
    "neutral": 0.05,
    "negative": 0.03
  }
}
```

### Get Sentiment Trend

```bash
GET /listening/sentiment/trend?days=30&interval=day
Authorization: Bearer <token>

Response:
[
  {
    "date": "2024-01-15T00:00:00.000Z",
    "averageScore": 0.45,
    "sentiment": "POSITIVE",
    "mentionCount": 125,
    "positiveCount": 85,
    "neutralCount": 30,
    "negativeCount": 10
  },
  ...
]
```

### Get Topic Sentiment Breakdown

```bash
GET /listening/sentiment/topics?days=30
Authorization: Bearer <token>

Response:
[
  {
    "topic": "customer_service",
    "averageScore": -0.35,
    "sentiment": "NEGATIVE",
    "mentionCount": 45,
    "positivePercentage": 15.5,
    "neutralPercentage": 22.2,
    "negativePercentage": 62.3
  },
  ...
]
```

### Get Sentiment Timeline

```bash
GET /listening/sentiment/timeline?days=30
Authorization: Bearer <token>

Response:
{
  "timeline": [
    {
      "date": "2024-01-15",
      "score": 0.45,
      "positive": 85,
      "neutral": 30,
      "negative": 10
    },
    ...
  ],
  "summary": {
    "averageScore": 0.42,
    "trend": "improving",
    "volatility": 0.15
  }
}
```

## Performance Considerations

### Model Initialization

The sentiment analysis model is loaded on service startup. First analysis may take a few seconds as the model downloads and initializes.

### Caching

Consider implementing caching for:
- Frequently analyzed texts
- Trend data (cache for 5-15 minutes)
- Topic breakdowns (cache for 15-30 minutes)

### Batch Processing

Always use batch methods when analyzing multiple texts:
- More efficient than individual calls
- Reduces model loading overhead
- Better resource utilization

### Fallback Mechanism

If the AI model fails to load or encounters errors:
- Service falls back to keyword-based sentiment analysis
- Ensures system continues to function
- Logs warnings for monitoring

## Monitoring

### Key Metrics to Track

1. **Analysis Performance**
   - Average analysis time per text
   - Batch processing throughput
   - Model initialization time

2. **Accuracy Indicators**
   - Confidence score distribution
   - Fallback usage frequency
   - Manual sentiment corrections

3. **Usage Statistics**
   - Analyses per day
   - Batch vs. individual requests
   - Trend query frequency

## Future Enhancements

1. **Multi-Language Support**
   - Language-specific sentiment models
   - Automatic language detection
   - Cross-language sentiment comparison

2. **Advanced Analytics**
   - Emotion detection (joy, anger, sadness, etc.)
   - Sarcasm detection
   - Context-aware sentiment analysis

3. **Custom Models**
   - Industry-specific sentiment models
   - Brand-specific fine-tuning
   - Custom sentiment categories

4. **Real-Time Alerts**
   - Sentiment spike detection
   - Negative sentiment alerts
   - Trend change notifications

## Testing

Run tests with:

```bash
npm test -- src/listening/services/sentiment-analysis.service.spec.ts
```

Tests cover:
- Sentiment analysis (positive, negative, neutral)
- Batch processing
- Mention updates
- Trend analysis
- Topic breakdown
- Timeline generation
- Edge cases (empty text, special characters)

## Dependencies

- `@xenova/transformers` - Hugging Face Transformers for JavaScript/TypeScript
- `@prisma/client` - Database access
- `@nestjs/common` - NestJS framework

## Configuration

No additional configuration required. The service uses:
- Model: `Xenova/distilbert-base-uncased-finetuned-sst-2-english`
- Auto-downloads on first use
- Cached locally for subsequent uses

## Troubleshooting

### Model fails to load

**Symptom:** Service logs "Failed to initialize sentiment analysis model"

**Solution:**
- Check internet connectivity (model downloads on first use)
- Verify disk space for model cache
- Service will use fallback keyword-based analysis

### Slow analysis performance

**Symptom:** Sentiment analysis takes several seconds

**Solution:**
- Use batch processing for multiple texts
- Implement caching for frequently analyzed content
- Consider running on GPU-enabled infrastructure

### Inaccurate results

**Symptom:** Sentiment classifications seem incorrect

**Solution:**
- Review text preprocessing (may be removing important context)
- Consider domain-specific model fine-tuning
- Collect feedback for model improvement
