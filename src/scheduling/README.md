# Scheduling Module

The Scheduling Module provides comprehensive post scheduling capabilities for the AI Social Media Platform, including:

- **Time-based scheduling** with timezone support
- **BullMQ job queue** for reliable post publishing
- **Optimal posting time calculator** based on historical performance data
- **Evergreen content rotation** with diminishing frequency
- **Cron jobs** for processing due posts

## Features

### 1. Post Scheduling

Schedule posts for future publishing with timezone-aware scheduling.

**Endpoints:**
- `POST /api/scheduling/posts/:id/schedule` - Schedule a post
- `PUT /api/scheduling/posts/:id/reschedule` - Reschedule a post
- `DELETE /api/scheduling/posts/:id/cancel` - Cancel scheduled post
- `GET /api/scheduling/posts` - Get all scheduled posts

**Example:**
```typescript
// Schedule a post
POST /api/scheduling/posts/post-123/schedule
{
  "scheduledAt": "2024-12-25T10:00:00Z",
  "timezone": "America/New_York"
}

// Reschedule a post
PUT /api/scheduling/posts/post-123/reschedule
{
  "newScheduledAt": "2024-12-26T14:00:00Z",
  "timezone": "America/New_York"
}

// Cancel scheduled post
DELETE /api/scheduling/posts/post-123/cancel
```

### 2. Optimal Time Calculator

Calculate the best times to post based on historical engagement data from the last 90 days.

**Endpoints:**
- `GET /api/scheduling/optimal-times` - Get all optimal time slots
- `GET /api/scheduling/best-time` - Get single best time to post
- `GET /api/scheduling/next-optimal-time` - Get next available optimal time
- `POST /api/scheduling/suggest-batch` - Get suggested times for batch scheduling

**Example:**
```typescript
// Get optimal times for Instagram
GET /api/scheduling/optimal-times?platform=INSTAGRAM&timezone=UTC

// Response:
[
  {
    "dayOfWeek": 2,  // Tuesday
    "hour": 10,      // 10 AM
    "score": 95,     // 0-100 score
    "averageEngagement": 1250,
    "postCount": 45
  },
  // ... more time slots
]

// Get next optimal time
GET /api/scheduling/next-optimal-time?platform=INSTAGRAM

// Suggest schedule for 10 posts
POST /api/scheduling/suggest-batch
{
  "postCount": 10,
  "platform": "INSTAGRAM",
  "timezone": "America/Los_Angeles"
}
```

### 3. Evergreen Content Rotation

Automatically rotate evergreen content with diminishing frequency to avoid over-posting.

**Endpoints:**
- `GET /api/scheduling/evergreen` - Get all evergreen posts
- `POST /api/scheduling/evergreen/rotate` - Schedule evergreen rotation
- `POST /api/scheduling/evergreen/auto-rotate` - Auto-rotate based on frequency
- `GET /api/scheduling/evergreen/stats` - Get rotation statistics

**Example:**
```typescript
// Tag a post as evergreen
// Add "evergreen" to the post's tags array when creating/updating

// Schedule rotation of 5 evergreen posts
POST /api/scheduling/evergreen/rotate
{
  "count": 5,
  "platform": "INSTAGRAM"
}

// Auto-rotate evergreen content (posts not published in 30 days)
POST /api/scheduling/evergreen/auto-rotate
{
  "frequencyDays": 30,
  "maxPostsPerRotation": 3
}

// Get rotation statistics
GET /api/scheduling/evergreen/stats
```

### 4. Queue Management

Monitor and manage the publishing queue.

**Endpoints:**
- `GET /api/scheduling/queue/stats` - Get queue statistics

**Example:**
```typescript
GET /api/scheduling/queue/stats

// Response:
{
  "waiting": 5,
  "active": 2,
  "completed": 100,
  "failed": 3,
  "delayed": 10,
  "total": 17
}
```

## Architecture

### Components

1. **SchedulingService** - Main service for scheduling operations
2. **PostSchedulerProcessor** - BullMQ worker that processes scheduled posts
3. **OptimalTimeCalculator** - Analyzes historical data to find best posting times
4. **EvergreenRotationService** - Manages evergreen content rotation
5. **PostSchedulerCron** - Cron job that processes due posts every 5 minutes

### Job Queue

The module uses BullMQ for reliable job processing:

- **Queue Name:** `post-publishing`
- **Job Type:** `publish-scheduled-post`
- **Retry Strategy:** Automatic retries with exponential backoff
- **Job Retention:** 
  - Completed jobs: 24 hours
  - Failed jobs: 7 days

### Cron Jobs

- **Process Due Posts:** Runs every 5 minutes to ensure scheduled posts are published
- **Cleanup:** Runs daily at 2 AM (handled automatically by BullMQ)

## How It Works

### Scheduling Flow

1. User schedules a post via API
2. Post status updated to `SCHEDULED` in database
3. Job added to BullMQ queue with delay
4. At scheduled time, job is processed
5. PostSchedulerProcessor calls PublishingService to publish
6. Post status updated to `PUBLISHED` or `FAILED`
7. Platform-specific results stored in database

### Optimal Time Calculation

1. Fetch posts from last 90 days
2. Get engagement metrics from MongoDB
3. Group posts by day of week and hour
4. Calculate average engagement per time slot
5. Score time slots (0-100) based on engagement
6. Return top 20 time slots sorted by score

### Evergreen Rotation

1. Posts tagged with "evergreen" are eligible for rotation
2. Priority calculated based on:
   - Time since last published (higher priority if longer)
   - Number of times published (diminishing returns)
3. Auto-rotation schedules posts that haven't been published in X days
4. Uses optimal time calculator to schedule at best times

## Configuration

### Environment Variables

```env
# Redis (required for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# MongoDB (required for metrics)
MONGODB_URI=mongodb://admin:password@localhost:27017/ai_social_analytics?authSource=admin
```

### Queue Configuration

The queue is configured in `scheduling.module.ts`:

```typescript
BullModule.registerQueue({
  name: 'post-publishing',
})
```

## Error Handling

The module includes comprehensive error handling:

- **NotFoundException:** Post not found or doesn't belong to workspace
- **BadRequestException:** Invalid scheduling time or post already published
- **Job Failures:** Automatically retried with exponential backoff
- **Cron Backup:** Cron job ensures posts are published even if queue job fails

## Testing

Run tests with:

```bash
npm test -- src/scheduling/scheduling.service.spec.ts
```

## Integration

The module is integrated into the main application in `app.module.ts`:

```typescript
import { SchedulingModule } from './scheduling/scheduling.module';

@Module({
  imports: [
    // ... other modules
    SchedulingModule,
  ],
})
export class AppModule {}
```

## Future Enhancements

- [ ] Support for recurring posts (daily, weekly, monthly)
- [ ] Bulk scheduling via CSV upload
- [ ] Smart scheduling based on audience timezone distribution
- [ ] A/B testing for optimal times
- [ ] Integration with AI agents for automatic scheduling
- [ ] Queue priority based on post importance
- [ ] Advanced retry strategies per platform
- [ ] Scheduling conflicts detection and resolution
