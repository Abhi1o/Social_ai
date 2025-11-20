# Scheduling Module - Usage Examples

## Basic Scheduling

### 1. Schedule a Single Post

```bash
# Create a post first
POST /api/posts
{
  "content": {
    "text": "Check out our new product! #launch",
    "hashtags": ["launch", "newproduct"],
    "media": []
  },
  "platforms": [
    {
      "platform": "INSTAGRAM",
      "accountId": "account-123"
    }
  ]
}

# Response: { "id": "post-456", ... }

# Schedule the post
POST /api/scheduling/posts/post-456/schedule
{
  "scheduledAt": "2024-12-25T10:00:00Z",
  "timezone": "America/New_York"
}
```

### 2. Get Optimal Posting Times

```bash
# Get optimal times for Instagram
GET /api/scheduling/optimal-times?platform=INSTAGRAM&timezone=UTC

# Get the single best time
GET /api/scheduling/best-time?platform=INSTAGRAM

# Get next available optimal time
GET /api/scheduling/next-optimal-time?platform=INSTAGRAM
```

### 3. Batch Scheduling with Optimal Times

```bash
# Get suggested times for 10 posts
POST /api/scheduling/suggest-batch
{
  "postCount": 10,
  "platform": "INSTAGRAM",
  "timezone": "America/Los_Angeles",
  "startDate": "2024-12-20T00:00:00Z"
}

# Response: Array of suggested dates
```



## Evergreen Content Rotation

### 1. Tag Posts as Evergreen

```bash
# When creating or updating a post, add "evergreen" tag
PUT /api/posts/post-789
{
  "tags": ["evergreen", "tips", "howto"]
}
```

### 2. Schedule Evergreen Rotation

```bash
# Rotate 5 evergreen posts
POST /api/scheduling/evergreen/rotate
{
  "count": 5,
  "platform": "INSTAGRAM"
}

# Auto-rotate posts not published in 30 days
POST /api/scheduling/evergreen/auto-rotate
{
  "frequencyDays": 30,
  "maxPostsPerRotation": 3
}
```

### 3. Monitor Evergreen Stats

```bash
GET /api/scheduling/evergreen/stats

# Response:
{
  "totalEvergreenPosts": 25,
  "neverPublished": 5,
  "averagePublishCount": 2.4,
  "highPriorityPosts": 8,
  "mediumPriorityPosts": 12,
  "lowPriorityPosts": 5
}
```

## Queue Management

```bash
# Get queue statistics
GET /api/scheduling/queue/stats

# Response:
{
  "waiting": 5,
  "active": 2,
  "completed": 100,
  "failed": 3,
  "delayed": 10,
  "total": 17
}
```

## Complete Workflow Example

```javascript
// 1. Create multiple posts
const posts = await Promise.all([
  createPost({ content: "Post 1", platforms: [...] }),
  createPost({ content: "Post 2", platforms: [...] }),
  createPost({ content: "Post 3", platforms: [...] }),
]);

// 2. Get optimal times for batch
const { suggestions } = await fetch('/api/scheduling/suggest-batch', {
  method: 'POST',
  body: JSON.stringify({
    postCount: posts.length,
    platform: 'INSTAGRAM',
    timezone: 'America/New_York'
  })
});

// 3. Schedule each post at optimal time
for (let i = 0; i < posts.length; i++) {
  await fetch(`/api/scheduling/posts/${posts[i].id}/schedule`, {
    method: 'POST',
    body: JSON.stringify({
      scheduledAt: suggestions[i],
      timezone: 'America/New_York'
    })
  });
}
```
