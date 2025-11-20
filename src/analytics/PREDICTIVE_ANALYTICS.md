# Predictive Analytics Engine

## Overview

The Predictive Analytics Engine provides AI-powered forecasting, trend analysis, anomaly detection, and actionable insights for social media performance metrics. It uses TensorFlow.js for machine learning models and statistical analysis to help users make data-driven decisions.

## Features

### 1. Engagement Prediction
Predicts engagement metrics (likes, comments, shares, saves) for posts based on:
- Time of day (0-23)
- Day of week (0-6)
- Content length
- Hashtag count
- Media count

**Endpoint:** `POST /analytics/predictive/engagement`

**Request Body:**
```json
{
  "platform": "instagram",
  "timeOfDay": 14,
  "dayOfWeek": 3,
  "contentLength": 150,
  "hashtagCount": 10,
  "mediaCount": 1
}
```

**Response:**
```json
{
  "predictedEngagement": 250,
  "predictedLikes": 180,
  "predictedComments": 45,
  "predictedShares": 20,
  "confidence": 0.75,
  "factors": {
    "timeOfDay": 14,
    "dayOfWeek": 3,
    "contentLength": 150,
    "hashtagCount": 10,
    "mediaCount": 1
  }
}
```

### 2. Reach Forecasting
Forecasts reach and impressions for future dates using linear regression with confidence intervals.

**Endpoint:** `POST /analytics/predictive/forecast-reach`

**Request Body:**
```json
{
  "platform": "instagram",
  "daysAhead": 7
}
```

**Response:**
```json
[
  {
    "date": "2024-01-15",
    "predictedReach": 5420,
    "predictedImpressions": 8130,
    "lowerBound": 4200,
    "upperBound": 6640,
    "confidence": 0.95
  }
]
```

### 3. Performance Trend Prediction
Predicts trends for multiple metrics (engagement, reach, followers, impressions) with trend direction and confidence scores.

**Endpoint:** `POST /analytics/predictive/trends`

**Request Body:**
```json
{
  "platform": "instagram",
  "metrics": ["engagement", "reach", "followers"],
  "daysAhead": 30
}
```

**Response:**
```json
[
  {
    "metric": "engagement",
    "trend": "increasing",
    "changeRate": 5.2,
    "prediction": [1250, 1305, 1360, ...],
    "dates": ["2024-01-15", "2024-01-16", ...],
    "confidence": 0.82
  }
]
```

### 4. Anomaly Detection
Detects unusual patterns in metrics using statistical analysis (standard deviation-based).

**Endpoint:** `POST /analytics/predictive/anomalies`

**Request Body:**
```json
{
  "platform": "instagram",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "sensitivity": 2.5
}
```

**Response:**
```json
[
  {
    "date": "2024-01-15",
    "metric": "engagement",
    "value": 5000,
    "expectedValue": 1200,
    "deviation": 3800,
    "severity": "high",
    "type": "spike"
  }
]
```

### 5. AI-Powered Insights
Generates actionable insights by analyzing anomalies and trends.

**Endpoint:** `POST /analytics/predictive/insights`

**Request Body:**
```json
{
  "platform": "instagram",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

**Response:**
```json
[
  {
    "type": "opportunity",
    "title": "Exceptional engagement performance detected",
    "description": "Your engagement spiked to 5000 on 2024-01-15, which is 316% above normal. Analyze what worked and replicate this success.",
    "impact": "high",
    "actionable": true,
    "suggestedAction": "Review content posted on 2024-01-15 and identify successful patterns",
    "data": { ... }
  }
]
```

## Technical Implementation

### Machine Learning Models

#### Engagement Prediction Model
- **Architecture:** Sequential neural network
- **Input:** 5 features (time, day, content length, hashtags, media)
- **Output:** 4 predictions (likes, comments, shares, saves)
- **Layers:**
  - Dense (16 units, ReLU activation)
  - Dropout (20%)
  - Dense (8 units, ReLU activation)
  - Dense (4 units, linear activation)
- **Training:** Automatic training on historical data (50+ posts required)
- **Retraining:** Every 24 hours

#### Reach Forecasting Model
- **Method:** Linear regression with confidence intervals
- **Input:** Historical reach and impressions data (90 days)
- **Output:** Future predictions with upper/lower bounds
- **Confidence:** 95% confidence intervals using standard deviation

### Statistical Methods

#### Trend Analysis
- **Method:** Linear regression with R-squared calculation
- **Trend Direction:** Based on slope and threshold (1% of mean)
- **Confidence:** R-squared value (0.5 to 0.95)

#### Anomaly Detection
- **Method:** Standard deviation-based outlier detection
- **Threshold:** Configurable sensitivity (default: 2.5 standard deviations)
- **Severity Levels:**
  - Low: 1.0-1.5x threshold
  - Medium: 1.5-2.0x threshold
  - High: >2.0x threshold

## Requirements Validation

### Requirement 4.2
✅ **AI-powered insights identifying top-performing content types, optimal posting times, and engagement trends**
- Engagement prediction model identifies optimal posting times
- Trend analysis identifies engagement patterns
- Anomaly detection highlights top-performing content

### Requirement 11.2
✅ **Machine learning to predict future performance, identify anomalies, and recommend optimization strategies**
- TensorFlow.js models for engagement prediction
- Statistical forecasting for reach and impressions
- Anomaly detection with severity classification
- AI-generated insights with actionable recommendations

## Performance Considerations

### Model Training
- Training occurs automatically when insufficient recent training data exists
- Training requires minimum 50 historical posts
- Training is cached for 24 hours to avoid unnecessary retraining
- Training uses 80/20 train/validation split

### Memory Management
- TensorFlow tensors are properly disposed after use
- Models are initialized once and reused
- Predictions are stateless and don't accumulate memory

### Data Requirements
- **Engagement Prediction:** 50+ historical posts
- **Reach Forecasting:** 30+ days of historical data
- **Trend Analysis:** 7+ days of historical data
- **Anomaly Detection:** 7+ days of historical data

## Future Enhancements

1. **Advanced Models:**
   - LSTM networks for time-series forecasting
   - Ensemble models for improved accuracy
   - Transfer learning from similar accounts

2. **Additional Features:**
   - Content type-specific predictions
   - Hashtag performance prediction
   - Optimal posting schedule generation
   - Competitor benchmarking predictions

3. **Model Persistence:**
   - Save trained models to disk
   - Load pre-trained models on startup
   - Model versioning and A/B testing

4. **Real-time Updates:**
   - Streaming predictions via WebSocket
   - Live anomaly alerts
   - Dynamic model retraining

## Dependencies

- `@tensorflow/tfjs`: ^4.22.0 - Machine learning framework
- `simple-statistics`: ^7.8.3 - Statistical analysis library

## Testing

Run tests with:
```bash
npm test -- predictive-analytics.service.spec.ts
```

All tests validate:
- Model initialization
- Engagement predictions
- Reach forecasting
- Anomaly detection
- Trend analysis
- Insight generation
