# Competitive Benchmarking Architecture

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Dashboard UI]
        API_CLIENT[API Client]
    end

    subgraph "API Layer"
        CONTROLLER[CompetitiveBenchmarking<br/>Controller]
        AUTH[JWT Auth Guard]
    end

    subgraph "Service Layer"
        SERVICE[CompetitiveBenchmarking<br/>Service]
        METRICS_SERVICE[Metrics Collection<br/>Service]
    end

    subgraph "Data Layer"
        POSTGRES[(PostgreSQL<br/>Competitors)]
        MONGO[(MongoDB<br/>Metrics)]
    end

    subgraph "Background Jobs"
        CRON[Competitor Metrics<br/>Collection Cron]
        CLEANUP[Data Cleanup<br/>Cron]
    end

    subgraph "External APIs"
        INSTAGRAM[Instagram API]
        TWITTER[Twitter API]
        LINKEDIN[LinkedIn API]
        FACEBOOK[Facebook API]
        TIKTOK[TikTok API]
    end

    UI --> API_CLIENT
    API_CLIENT --> AUTH
    AUTH --> CONTROLLER
    CONTROLLER --> SERVICE
    
    SERVICE --> POSTGRES
    SERVICE --> MONGO
    SERVICE --> METRICS_SERVICE
    
    CRON --> SERVICE
    CRON --> INSTAGRAM
    CRON --> TWITTER
    CRON --> LINKEDIN
    CRON --> FACEBOOK
    CRON --> TIKTOK
    
    CLEANUP --> MONGO
    
    METRICS_SERVICE --> MONGO
```

## Data Flow Diagrams

### 1. Competitor Creation Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant Service
    participant Prisma
    participant MongoDB

    Client->>Controller: POST /competitors
    Controller->>Service: createCompetitor(dto)
    Service->>Prisma: Create competitor + accounts
    Prisma-->>Service: Competitor created
    Service-->>Controller: Return competitor
    Controller-->>Client: 201 Created
```

### 2. Metrics Collection Flow

```mermaid
sequenceDiagram
    participant Cron
    participant Service
    participant Prisma
    participant Platform APIs
    participant MongoDB

    Cron->>Prisma: Get active competitors
    Prisma-->>Cron: Competitor list
    
    loop For each competitor account
        Cron->>Platform APIs: Fetch metrics
        Platform APIs-->>Cron: Metrics data
        Cron->>Service: storeCompetitorMetrics()
        Service->>MongoDB: Save metrics
        MongoDB-->>Service: Saved
    end
    
    Cron->>Cron: Log results
```

### 3. Competitive Benchmark Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant Service
    participant Prisma
    participant MongoDB

    Client->>Controller: GET /benchmark
    Controller->>Service: getCompetitiveBenchmark(query)
    
    Service->>Prisma: Get competitors
    Prisma-->>Service: Competitor list
    
    Service->>MongoDB: Get workspace metrics
    MongoDB-->>Service: Workspace data
    
    loop For each competitor
        Service->>MongoDB: Get competitor metrics
        MongoDB-->>Service: Competitor data
    end
    
    Service->>Service: Calculate rankings
    Service->>Service: Generate insights
    Service-->>Controller: Benchmark data
    Controller-->>Client: 200 OK
```

### 4. Share of Voice Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant Service
    participant MongoDB

    Client->>Controller: GET /share-of-voice
    Controller->>Service: getShareOfVoice(query)
    
    Service->>MongoDB: Get workspace engagement
    MongoDB-->>Service: Workspace totals
    
    loop For each competitor
        Service->>MongoDB: Get competitor engagement
        MongoDB-->>Service: Competitor totals
    end
    
    Service->>Service: Calculate percentages
    Service-->>Controller: Share of voice data
    Controller-->>Client: 200 OK
```

## Database Schema

### PostgreSQL (Prisma)

```mermaid
erDiagram
    WORKSPACE ||--o{ COMPETITOR : has
    COMPETITOR ||--o{ COMPETITOR_ACCOUNT : has
    
    WORKSPACE {
        string id PK
        string name
        string slug
        enum plan
    }
    
    COMPETITOR {
        string id PK
        string workspaceId FK
        string name
        string description
        string industry
        string[] tags
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }
    
    COMPETITOR_ACCOUNT {
        string id PK
        string competitorId FK
        enum platform
        string platformAccountId
        string username
        string displayName
        string avatar
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }
```

### MongoDB Collections

```javascript
// competitor_metrics collection
{
  _id: ObjectId,
  workspaceId: String,
  competitorId: String,
  competitorAccountId: String,
  platform: String,
  timestamp: Date,
  
  // Follower metrics
  followers: Number,
  following: Number,
  
  // Engagement metrics
  totalPosts: Number,
  totalLikes: Number,
  totalComments: Number,
  totalShares: Number,
  totalViews: Number,
  totalSaves: Number,
  
  // Calculated metrics
  engagementRate: Number,
  averageLikesPerPost: Number,
  averageCommentsPerPost: Number,
  postingFrequency: Number,
  
  // Content analysis
  contentTypes: {
    image: Number,
    video: Number,
    carousel: Number,
    text: Number
  },
  topHashtags: [String],
  topMentions: [String],
  
  // Metadata
  metadata: Object
}
```

## Component Interactions

### Service Dependencies

```mermaid
graph LR
    CONTROLLER[Controller] --> SERVICE[Service]
    SERVICE --> PRISMA[PrismaService]
    SERVICE --> MONGO[MongoDB Model]
    CRON[Cron Job] --> SERVICE
    CRON --> PLATFORM[Platform APIs]
```

### Module Structure

```
analytics/
├── controllers/
│   └── competitive-benchmarking.controller.ts
├── services/
│   └── competitive-benchmarking.service.ts
├── cron/
│   └── competitor-metrics-collection.cron.ts
├── dto/
│   └── competitive-benchmarking.dto.ts
├── schemas/
│   └── competitor-metric.schema.ts
└── analytics.module.ts
```

## API Endpoint Structure

```
/api/analytics/competitive/
├── competitors/
│   ├── POST    /              (Create)
│   ├── GET     /              (List)
│   ├── GET     /:id           (Get)
│   ├── PUT     /:id           (Update)
│   └── DELETE  /:id           (Delete)
├── benchmark                  (Competitive comparison)
├── share-of-voice            (Share of voice analysis)
├── industry-benchmarks       (Industry comparison)
└── activity                  (Activity monitoring)
```

## Cron Job Schedule

```
Metrics Collection:
┌─────────────── minute (0)
│ ┌───────────── hour (*/6 = every 6 hours)
│ │ ┌─────────── day of month (*)
│ │ │ ┌───────── month (*)
│ │ │ │ ┌─────── day of week (*)
│ │ │ │ │
0 */6 * * *

Data Cleanup:
┌─────────────── minute (0)
│ ┌───────────── hour (2 = 2 AM)
│ │ ┌─────────── day of month (*)
│ │ │ ┌───────── month (*)
│ │ │ │ ┌─────── day of week (*)
│ │ │ │ │
0 2 * * *
```

## Performance Considerations

### Caching Strategy

```mermaid
graph TD
    REQUEST[API Request] --> CACHE{Cache Hit?}
    CACHE -->|Yes| RETURN[Return Cached Data]
    CACHE -->|No| DB[Query Database]
    DB --> CALC[Calculate Metrics]
    CALC --> STORE[Store in Cache]
    STORE --> RETURN
```

**Cache TTLs:**
- Competitor metrics: 6 hours
- Industry benchmarks: 24 hours
- Share of voice: 1 hour
- Rankings: 5 minutes

### Database Indexes

**MongoDB:**
```javascript
// Compound indexes for efficient queries
{ workspaceId: 1, timestamp: -1 }
{ competitorId: 1, timestamp: -1 }
{ competitorAccountId: 1, timestamp: -1 }
{ workspaceId: 1, platform: 1, timestamp: -1 }
```

**PostgreSQL:**
```sql
-- Indexes on competitors table
CREATE INDEX idx_competitors_workspace ON competitors(workspaceId);
CREATE INDEX idx_competitors_active ON competitors(isActive);

-- Indexes on competitor_accounts table
CREATE INDEX idx_competitor_accounts_competitor ON competitor_accounts(competitorId);
CREATE UNIQUE INDEX idx_competitor_accounts_unique 
  ON competitor_accounts(competitorId, platform, platformAccountId);
```

## Security Architecture

```mermaid
graph TB
    REQUEST[API Request] --> AUTH[JWT Auth Guard]
    AUTH --> WORKSPACE[Workspace Isolation]
    WORKSPACE --> PERMISSION[Permission Check]
    PERMISSION --> SERVICE[Service Layer]
    SERVICE --> DATA[Data Access]
    
    AUTH -->|Invalid| REJECT[401 Unauthorized]
    WORKSPACE -->|Wrong Workspace| REJECT
    PERMISSION -->|No Permission| REJECT2[403 Forbidden]
```

## Scalability Strategy

### Horizontal Scaling

```mermaid
graph TB
    LB[Load Balancer]
    
    subgraph "API Servers"
        API1[API Server 1]
        API2[API Server 2]
        API3[API Server 3]
    end
    
    subgraph "Worker Nodes"
        WORKER1[Worker 1]
        WORKER2[Worker 2]
        WORKER3[Worker 3]
    end
    
    subgraph "Data Layer"
        POSTGRES[(PostgreSQL<br/>Primary)]
        POSTGRES_REPLICA[(PostgreSQL<br/>Replica)]
        MONGO[(MongoDB<br/>Sharded)]
    end
    
    LB --> API1
    LB --> API2
    LB --> API3
    
    API1 --> POSTGRES
    API2 --> POSTGRES
    API3 --> POSTGRES
    
    API1 --> MONGO
    API2 --> MONGO
    API3 --> MONGO
    
    WORKER1 --> MONGO
    WORKER2 --> MONGO
    WORKER3 --> MONGO
    
    POSTGRES --> POSTGRES_REPLICA
```

### Data Partitioning

**MongoDB Sharding Strategy:**
- Shard key: `{ workspaceId: 1, timestamp: 1 }`
- Enables horizontal scaling
- Efficient time-series queries
- Workspace isolation

## Monitoring and Observability

### Key Metrics to Track

```mermaid
graph LR
    METRICS[Metrics to Monitor]
    
    METRICS --> COLLECTION[Collection Success Rate]
    METRICS --> LATENCY[API Response Time]
    METRICS --> ERRORS[Error Rate]
    METRICS --> STORAGE[Storage Usage]
    METRICS --> CACHE[Cache Hit Rate]
```

### Alert Thresholds

- Collection failure rate > 10%
- API response time > 2 seconds (p95)
- Error rate > 5%
- Storage usage > 80%
- Cache hit rate < 70%

## Future Architecture Enhancements

1. **Event-Driven Architecture**: Implement event bus for real-time updates
2. **GraphQL API**: Add GraphQL support for flexible queries
3. **Real-time WebSocket**: Push updates to connected clients
4. **ML Pipeline**: Integrate machine learning for predictive analytics
5. **Data Warehouse**: Export to BigQuery/Snowflake for advanced analytics
