# Post Performance Analytics API

This document describes the Post Performance Analytics endpoints that provide detailed insights into individual post metrics, engagement rates, content type performance, and optimal posting times.

## Requirements

- **Requirements 4.1**: Unified Social Media Analytics
- **Requirements 11.1**: Advanced Analytics and Reporting

## Endpoints

### 1. Get Individual Post Metrics

**Endpoint**: `GET /analytics/posts/:postId/metrics`

**Description**: Track individual post metrics including engagement, reach, impressions, and engagement rate.

**Parameters**:
- `postId` (path parameter): The unique identifier of the post

**Response**:
```json
{
  "postId": "string",
  "platformPostId": "string",
  "platform": "string",
  "content": "string",
  "publishedAt": "2024-01-01T00:00:00.000Z",
  "likes": 100,
  "comments": 20,
  "shares": 10,
  "saves": 5,
  "totalEngagement": 135,
  "reach": 1000,
  "impressions": 1500,
  "engagementRate": 13.5,
  "clickThroughRate": 3.33,
  "videoViews": 500,
  "videoCompletionRate": 75.5
}
```

**Example**:
```bash
curl -X GET http://localhost:3000/analytics/posts/abc123/metrics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 2. Calculate Engagement Rate

**Endpoint**: `GET /analytics/posts/:postId/engagement-rate`

**Description**: Calculate the engagement rate for a specific post with a detailed breakdown of engagement metrics.

**Parameters**:
- `postId` (path parameter): The unique identifier of the post

**Response**:
```json
{
  "postId": "string",
  "engagementRate": 13.5,
  "reach": 1000,
  "totalEngagement": 135,
  "breakdown": {
    "likes": 100,
    "comments": 20,
    "shares": 10,
    "saves": 5
  }
}
```

**Example**:
```bash
curl -X GET http://localhost:3000/analytics/posts/abc123/engagement-rate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 3. Compare Posts

**Endpoint**: `GET /analytics/posts/compare`

**Description**: Compare two posts side-by-side with detailed performance differences.

**Query Parameters**:
- `postId1` (required): First post ID to compare
- `postId2` (required): Second post ID to compare

**Response**:
```json
{
  "post1": {
    "postId": "string",
    "platformPostId": "string",
    "platform": "string",
    "content": "string",
    "publishedAt": "2024-01-01T00:00:00.000Z",
    "likes": 100,
    "comments": 20,
    "shares": 10,
    "saves": 5,
    "totalEngagement": 135,
    "reach": 1000,
    "impressions": 1500,
    "engagementRate": 13.5
  },
  "post2": {
    "postId": "string",
    "platformPostId": "string",
    "platform": "string",
    "content": "string",
    "publishedAt": "2024-01-02T00:00:00.000Z",
    "likes": 80,
    "comments": 15,
    "shares": 8,
    "saves": 3,
    "totalEngagement": 106,
    "reach": 800,
    "impressions": 1200,
    "engagementRate": 13.25
  },
  "comparison": {
    "engagementDiff": 29,
    "engagementRateDiff": 0.25,
    "reachDiff": 200,
    "impressionsDiff": 300,
    "likesDiff": 20,
    "commentsDiff": 5,
    "sharesDiff": 2,
    "savesDiff": 2
  }
}
```

**Example**:
```bash
curl -X GET "http://localhost:3000/analytics/posts/compare?postId1=abc123&postId2=def456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 4. Analyze Content Type Performance

**Endpoint**: `GET /analytics/posts/content-type-performance`

**Description**: Analyze performance metrics grouped by content type (text, image, video, carousel, link).

**Query Parameters**:
- `startDate` (required): Start date for analysis (ISO 8601 format)
- `endDate` (required): End date for analysis (ISO 8601 format)
- `platforms` (optional): Array of platforms to filter by

**Response**:
```json
[
  {
    "contentType": "video",
    "postCount": 25,
    "avgEngagement": 150.5,
    "avgEngagementRate": 15.2,
    "avgReach": 1200,
    "avgImpressions": 1800,
    "totalEngagement": 3762,
    "totalReach": 30000,
    "bestPerformingPost": {
      "postId": "string",
      "engagement": 350,
      "engagementRate": 25.5
    }
  },
  {
    "contentType": "image",
    "postCount": 50,
    "avgEngagement": 120.3,
    "avgEngagementRate": 12.8,
    "avgReach": 950,
    "avgImpressions": 1400,
    "totalEngagement": 6015,
    "totalReach": 47500,
    "bestPerformingPost": {
      "postId": "string",
      "engagement": 280,
      "engagementRate": 22.1
    }
  }
]
```

**Example**:
```bash
curl -X GET "http://localhost:3000/analytics/posts/content-type-performance?startDate=2024-01-01&endDate=2024-01-31&platforms=instagram&platforms=facebook" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 5. Analyze Best Time to Post

**Endpoint**: `GET /analytics/posts/best-time-to-post`

**Description**: Analyze historical post performance to identify the best times to post based on day of week and hour.

**Query Parameters**:
- `startDate` (required): Start date for analysis (ISO 8601 format)
- `endDate` (required): End date for analysis (ISO 8601 format)
- `platforms` (optional): Array of platforms to filter by

**Response**:
```json
[
  {
    "dayOfWeek": "Monday",
    "hour": 10,
    "avgEngagement": 145.5,
    "avgEngagementRate": 14.2,
    "postCount": 15,
    "confidence": 75
  },
  {
    "dayOfWeek": "Wednesday",
    "hour": 14,
    "avgEngagement": 138.2,
    "avgEngagementRate": 13.8,
    "postCount": 12,
    "confidence": 60
  }
]
```

**Notes**:
- Results are sorted by `avgEngagementRate` in descending order
- `confidence` is calculated based on sample size (more posts = higher confidence)
- Confidence ranges from 0-100, with 100 representing 10+ posts in that time slot

**Example**:
```bash
curl -X GET "http://localhost:3000/analytics/posts/best-time-to-post?startDate=2024-01-01&endDate=2024-03-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 6. Get Post Performance Timeline

**Endpoint**: `GET /analytics/posts/:postId/timeline`

**Description**: Get a time-series view of post performance showing how engagement evolved over time.

**Parameters**:
- `postId` (path parameter): The unique identifier of the post

**Response**:
```json
{
  "postId": "string",
  "timeline": [
    {
      "timestamp": "2024-01-01T10:00:00.000Z",
      "likes": 10,
      "comments": 2,
      "shares": 1,
      "saves": 0,
      "engagement": 13,
      "reach": 100,
      "impressions": 150,
      "engagementRate": 13.0
    },
    {
      "timestamp": "2024-01-01T11:00:00.000Z",
      "likes": 50,
      "comments": 10,
      "shares": 5,
      "saves": 2,
      "engagement": 67,
      "reach": 500,
      "impressions": 750,
      "engagementRate": 13.4
    }
  ],
  "peakEngagementTime": "2024-01-01T12:00:00.000Z",
  "engagementVelocity": 54.5
}
```

**Notes**:
- `engagementVelocity` represents the average engagement per hour
- `peakEngagementTime` indicates when the post received the most engagement
- Timeline data points are collected hourly by the metrics collection system

**Example**:
```bash
curl -X GET http://localhost:3000/analytics/posts/abc123/timeline \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Use Cases

### 1. Post Performance Dashboard
Combine multiple endpoints to create a comprehensive post performance dashboard:
- Use `GET /analytics/posts/:postId/metrics` for overall metrics
- Use `GET /analytics/posts/:postId/timeline` to show engagement over time
- Use `GET /analytics/posts/:postId/engagement-rate` for detailed engagement breakdown

### 2. Content Strategy Optimization
Identify what content performs best:
- Use `GET /analytics/posts/content-type-performance` to see which content types drive the most engagement
- Use `GET /analytics/posts/best-time-to-post` to optimize posting schedule
- Compare top-performing posts with `GET /analytics/posts/compare`

### 3. A/B Testing
Compare different content variations:
- Create two similar posts with different elements (copy, images, hashtags)
- Use `GET /analytics/posts/compare` to identify which performed better
- Apply learnings to future content

### 4. Real-time Monitoring
Track post performance in real-time:
- Use `GET /analytics/posts/:postId/timeline` to monitor engagement velocity
- Identify peak engagement times for optimal follow-up actions
- Detect viral content early based on engagement velocity

---

## Error Responses

All endpoints return standard HTTP status codes:

- `200 OK`: Successful request
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Post not found
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "statusCode": 404,
  "message": "Post post-123 not found",
  "error": "Not Found"
}
```

---

## Authentication

All endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

The token must belong to a user with access to the workspace containing the posts being analyzed.

---

## Rate Limiting

These endpoints are subject to rate limiting:
- 100 requests per minute per user
- 1000 requests per hour per workspace

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```
