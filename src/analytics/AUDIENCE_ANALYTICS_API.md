# Audience Analytics API Documentation

## Overview

The Audience Analytics API provides comprehensive demographic data, segmentation, location analytics, interest/behavior analysis, and growth trend tracking for social media audiences. This API enables data-driven decision making by providing insights into who your audience is, where they're located, what they're interested in, and how they're growing over time.

**Requirements Implemented:** 4.1, 11.1

## Endpoints

### 1. Get Demographic Data

Get age and gender distribution of your audience.

**Endpoint:** `GET /api/analytics/audience/demographics`

**Query Parameters:**
- `startDate` (required): Start date for the analysis period (ISO 8601 format)
- `endDate` (required): End date for the analysis period (ISO 8601 format)
- `platforms` (optional): Array of platform names to filter by
- `accountIds` (optional): Array of account IDs to filter by

**Response:**
```json
{
  "ageDistribution": [
    {
      "ageRange": "18-24",
      "count": 1000,
      "percentage": 22.2
    },
    {
      "ageRange": "25-34",
      "count": 2000,
      "percentage": 44.4
    },
    {
      "ageRange": "35-44",
      "count": 1500,
      "percentage": 33.3
    }
  ],
  "genderDistribution": [
    {
      "gender": "male",
      "count": 2500,
      "percentage": 55.6
    },
    {
      "gender": "female",
      "count": 2000,
      "percentage": 44.4
    }
  ],
  "totalAudience": 4500
}
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/analytics/audience/demographics?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 2. Get Audience Segments

Get audience segmented by age, gender, location, interests, or language.

**Endpoint:** `GET /api/analytics/audience/segments`

**Query Parameters:**
- `startDate` (required): Start date for the analysis period
- `endDate` (required): End date for the analysis period
- `segmentBy` (optional): Segmentation type - `age`, `gender`, `location`, `interests`, or `language` (default: `age`)
- `platforms` (optional): Array of platform names to filter by
- `accountIds` (optional): Array of account IDs to filter by

**Response:**
```json
[
  {
    "segmentName": "25-34",
    "segmentType": "age",
    "audienceSize": 2000,
    "percentage": 44.4,
    "engagementRate": 0,
    "growthRate": 0
  },
  {
    "segmentName": "35-44",
    "segmentType": "age",
    "audienceSize": 1500,
    "percentage": 33.3,
    "engagementRate": 0,
    "growthRate": 0
  }
]
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/analytics/audience/segments?startDate=2024-01-01&endDate=2024-01-31&segmentBy=gender" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 3. Get Location Analytics

Get geographic distribution of your audience by country and city.

**Endpoint:** `GET /api/analytics/audience/locations`

**Query Parameters:**
- `startDate` (required): Start date for the analysis period
- `endDate` (required): End date for the analysis period
- `platforms` (optional): Array of platform names to filter by
- `accountIds` (optional): Array of account IDs to filter by

**Response:**
```json
{
  "topCountries": [
    {
      "country": "United States",
      "countryCode": "US",
      "percentage": 50,
      "count": 2250
    },
    {
      "country": "Canada",
      "countryCode": "CA",
      "percentage": 20,
      "count": 900
    }
  ],
  "topCities": [
    {
      "city": "New York",
      "country": "US",
      "percentage": 15,
      "count": 675
    },
    {
      "city": "Los Angeles",
      "country": "US",
      "percentage": 10,
      "count": 450
    }
  ],
  "totalLocations": 4
}
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/analytics/audience/locations?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 4. Get Interest and Behavior Analysis

Get insights into audience interests, device usage, and activity patterns.

**Endpoint:** `GET /api/analytics/audience/interests-behavior`

**Query Parameters:**
- `startDate` (required): Start date for the analysis period
- `endDate` (required): End date for the analysis period
- `platforms` (optional): Array of platform names to filter by
- `accountIds` (optional): Array of account IDs to filter by

**Response:**
```json
{
  "topInterests": [
    {
      "interest": "Technology",
      "category": "Tech",
      "percentage": 40,
      "count": 1800
    },
    {
      "interest": "Travel",
      "category": "Lifestyle",
      "percentage": 30,
      "count": 1350
    }
  ],
  "deviceDistribution": {
    "mobile": 3000,
    "desktop": 1200,
    "tablet": 300
  },
  "activeHours": [
    { "hour": 0, "activity": 50 },
    { "hour": 1, "activity": 30 },
    { "hour": 9, "activity": 200 },
    { "hour": 12, "activity": 350 },
    { "hour": 18, "activity": 400 }
  ],
  "activeDays": [
    { "day": "monday", "activity": 600 },
    { "day": "tuesday", "activity": 650 },
    { "day": "wednesday", "activity": 700 }
  ]
}
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/analytics/audience/interests-behavior?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 5. Get Audience Growth Trend

Track audience growth over time with detailed metrics on new followers, unfollowers, and net growth.

**Endpoint:** `GET /api/analytics/audience/growth-trend`

**Query Parameters:**
- `startDate` (required): Start date for the analysis period
- `endDate` (required): End date for the analysis period
- `granularity` (optional): Time granularity - `hourly`, `daily`, `weekly`, or `monthly` (default: `daily`)
- `platforms` (optional): Array of platform names to filter by
- `accountIds` (optional): Array of account IDs to filter by

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "totalFollowers": 4000,
    "newFollowers": 50,
    "unfollowers": 10,
    "netGrowth": 40,
    "growthRate": 1.0
  },
  {
    "date": "2024-01-02",
    "totalFollowers": 4040,
    "newFollowers": 60,
    "unfollowers": 20,
    "netGrowth": 40,
    "growthRate": 0.99
  }
]
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/analytics/audience/growth-trend?startDate=2024-01-01&endDate=2024-01-31&granularity=daily" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 6. Get Audience Insights

Get AI-powered insights and recommendations based on audience data.

**Endpoint:** `GET /api/analytics/audience/insights`

**Query Parameters:**
- `startDate` (required): Start date for the analysis period
- `endDate` (required): End date for the analysis period
- `platforms` (optional): Array of platform names to filter by
- `accountIds` (optional): Array of account IDs to filter by

**Response:**
```json
{
  "summary": {
    "totalAudience": 4500,
    "audienceGrowth": 40,
    "growthRate": 0.89,
    "engagementRate": 0,
    "topDemographic": "female, 25-34",
    "topLocation": "United States"
  },
  "recommendations": [
    {
      "type": "growth",
      "title": "Strong Growth Momentum",
      "description": "Your audience is growing rapidly. Maintain your current strategy and consider scaling content production.",
      "priority": "medium"
    },
    {
      "type": "location",
      "title": "Geographic Concentration",
      "description": "70.0% of your audience is from United States. Consider localized content and optimal posting times for this region.",
      "priority": "medium"
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/analytics/audience/insights?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Data Collection

Demographic data is collected from platform APIs during the metrics collection process. The `AudienceAnalyticsService.collectDemographicData()` method should be called by platform-specific fetchers when demographic data is available.

**Example Usage:**
```typescript
await audienceAnalyticsService.collectDemographicData(
  accountId,
  workspaceId,
  'instagram',
  {
    accountName: 'example_account',
    platformAccountId: '123456789',
    ageRanges: {
      '18-24': 1000,
      '25-34': 2000,
      '35-44': 1500,
    },
    gender: {
      male: 2500,
      female: 2000,
    },
    topCountries: [
      { country: 'United States', countryCode: 'US', percentage: 50, count: 2250 },
    ],
    topCities: [
      { city: 'New York', country: 'US', percentage: 15, count: 675 },
    ],
    topLanguages: [
      { language: 'English', languageCode: 'en', percentage: 80, count: 3600 },
    ],
    topInterests: [
      { interest: 'Technology', category: 'Tech', percentage: 40, count: 1800 },
    ],
    deviceTypes: {
      mobile: 3000,
      desktop: 1200,
      tablet: 300,
    },
    activeHours: {
      '9': 200,
      '12': 350,
      '18': 400,
    },
    activeDays: {
      monday: 600,
      tuesday: 650,
      wednesday: 700,
    },
    totalFollowers: 4500,
    totalReach: 50000,
    engagedAudience: 2000,
    newFollowers: 50,
    unfollowers: 10,
  }
);
```

## Use Cases

### 1. Content Strategy Optimization
Use demographic and interest data to tailor content to your audience's preferences and characteristics.

### 2. Posting Time Optimization
Analyze active hours and days to determine the best times to post for maximum engagement.

### 3. Geographic Targeting
Use location analytics to create region-specific content and campaigns.

### 4. Audience Growth Monitoring
Track growth trends to identify what's working and what needs improvement.

### 5. Segmentation for Personalization
Create targeted campaigns for specific audience segments based on demographics, interests, or location.

## Error Handling

All endpoints return standard HTTP status codes:
- `200 OK`: Successful request
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting

API requests are subject to rate limiting based on your subscription plan. Check response headers for rate limit information:
- `X-RateLimit-Limit`: Maximum requests per time window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Notes

- Demographic data availability depends on the social media platform's API capabilities
- Some platforms may not provide all demographic fields
- Data is collected during scheduled metrics collection runs (typically hourly)
- Historical data retention depends on your subscription plan
