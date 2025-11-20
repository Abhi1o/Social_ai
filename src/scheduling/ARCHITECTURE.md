# Scheduling System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User/Client                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ POST /api/scheduling/posts/:id/schedule
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SchedulingController                              │
│  - Validates request                                                 │
│  - Extracts workspace context                                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SchedulingService                                 │
│  1. Verify post exists and belongs to workspace                      │
│  2. Validate scheduled time is in future                             │
│  3. Update post status to SCHEDULED                                  │
│  4. Calculate delay until scheduled time                             │
│  5. Add job to BullMQ queue                                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BullMQ Queue (Redis)                            │
│  - Job stored with delay                                             │
│  - Persistent storage                                                │
│  - Automatic retry on failure                                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ (Wait until scheduled time)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  PostSchedulerProcessor                              │
│  1. Verify post still exists and is scheduled                        │
│  2. Call PublishingService.publishPost()                             │
│  3. Update post status based on result                               │
│  4. Store platform-specific results                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PublishingService                                 │
│  - Publishes to each platform                                        │
│  - Handles platform-specific formatting                              │
│  - Updates database with results                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Backup Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PostSchedulerCron                                 │
│  Runs every 5 minutes                                                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              SchedulingService.processDuePosts()                     │
│  1. Query posts with status=SCHEDULED and scheduledAt <= now         │
│  2. For each due post:                                               │
│     - Check if job exists in queue                                   │
│     - If not, add to queue immediately                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Optimal Time Calculation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Request                                 │
│  GET /api/scheduling/optimal-times?platform=INSTAGRAM                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  OptimalTimeCalculator                               │
│  1. Query posts from last 90 days                                    │
│  2. Fetch engagement metrics from MongoDB                            │
│  3. Group by day of week and hour                                    │
│  4. Calculate average engagement per slot                            │
│  5. Score slots 0-100 based on engagement                            │
│  6. Return top 20 slots sorted by score                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Evergreen Rotation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Request                                 │
│  POST /api/scheduling/evergreen/rotate                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                EvergreenRotationService                              │
│  1. Get posts tagged with "evergreen"                                │
│  2. Calculate priority for each:                                     │
│     - Higher if not published recently                               │
│     - Lower with more publish count (diminishing)                    │
│  3. Sort by priority                                                 │
│  4. Take top N posts                                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  OptimalTimeCalculator                               │
│  Suggest optimal times for batch                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SchedulingService                                 │
│  Schedule each post at suggested time                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Relationships

```
┌──────────────────────────────────────────────────────────────────┐
│                      SchedulingModule                             │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              SchedulingController                           │ │
│  │  - REST API endpoints                                       │ │
│  │  - Request validation                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              SchedulingService                              │ │
│  │  - Core scheduling logic                                    │ │
│  │  - Queue management                                         │ │
│  │  - Post status updates                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│         ┌────────────────────┼────────────────────┐              │
│         ▼                    ▼                    ▼              │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────┐    │
│  │  Optimal    │  │   Evergreen      │  │  Post Scheduler │    │
│  │    Time     │  │   Rotation       │  │    Processor    │    │
│  │ Calculator  │  │   Service        │  │   (BullMQ)      │    │
│  └─────────────┘  └──────────────────┘  └─────────────────┘    │
│         │                    │                    │              │
│         └────────────────────┴────────────────────┘              │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              PostSchedulerCron                              │ │
│  │  - Runs every 5 minutes                                     │ │
│  │  - Backup processing                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    External Dependencies                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │   MongoDB    │  │    Redis     │          │
│  │  (Posts DB)  │  │  (Metrics)   │  │  (Queue)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              PublishingService                            │   │
│  │  - Platform-specific publishing                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. BullMQ over Bull
- Modern, TypeScript-first library
- Better performance and reliability
- Active maintenance and support

### 2. Dual Processing Strategy
- Primary: BullMQ delayed jobs
- Backup: Cron job every 5 minutes
- Ensures posts are published even if queue fails

### 3. Priority-Based Evergreen Rotation
- Time-based priority (longer since last publish = higher priority)
- Diminishing returns (more publishes = lower priority)
- Prevents over-posting of same content

### 4. Historical Data Analysis
- 90-day window balances recency with data volume
- Day of week + hour granularity captures patterns
- Engagement-based scoring ensures quality recommendations

### 5. Timezone Support
- Full timezone awareness throughout system
- User can specify timezone per operation
- Automatic conversion handled by service layer
