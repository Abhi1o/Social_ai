# Response Management

This document describes the Response Management feature implementation for the Community Management module.

## Overview

The Response Management feature provides comprehensive tools for managing customer interactions including:
- **Saved Reply Templates**: Reusable message templates with variable substitution
- **Conversation History Tracking**: Complete audit trail of conversation changes
- **SLA Tracking & Alerts**: Service Level Agreement monitoring and escalation

## Features

### 1. Saved Reply Templates

Create and manage reusable message templates to speed up response times and maintain consistency.

#### Key Features:
- Template variable substitution (e.g., `{{name}}`, `{{product}}`)
- Category organization
- Usage tracking and analytics
- Template search and filtering
- Automatic variable extraction from content

#### API Endpoints:

**Create Template**
```http
POST /inbox/templates
Content-Type: application/json

{
  "name": "Welcome Message",
  "content": "Hi {{name}}, welcome to {{company}}! How can we help you today?",
  "category": "greeting",
  "tags": ["welcome", "onboarding"]
}
```

**List Templates**
```http
GET /inbox/templates?category=greeting&isActive=true&search=welcome
```

**Reply with Template**
```http
POST /inbox/conversations/:id/reply-with-template
Content-Type: application/json

{
  "templateId": "template-uuid",
  "variables": {
    "name": "John",
    "company": "Acme Corp"
  }
}
```

**Get Template Statistics**
```http
GET /inbox/templates-stats
```

Response:
```json
{
  "totalTemplates": 25,
  "activeTemplates": 20,
  "totalUsage": 1543,
  "topTemplates": [
    {
      "id": "uuid",
      "name": "Welcome Message",
      "usageCount": 342
    }
  ]
}
```

### 2. Conversation History Tracking

Automatically track all changes to conversations including status updates, priority changes, and assignments.

#### Key Features:
- Automatic change tracking
- User attribution
- Optional notes for context
- Activity summaries
- Complete audit trail

#### API Endpoints:

**Get Conversation History**
```http
GET /inbox/conversations/:id/history
```

Response:
```json
[
  {
    "id": "uuid",
    "conversationId": "conv-uuid",
    "field": "status",
    "oldValue": "OPEN",
    "newValue": "RESOLVED",
    "changedBy": "user-uuid",
    "changedAt": "2024-01-07T10:30:00Z",
    "notes": "Issue resolved via phone call"
  }
]
```

**Get Activity Summary**
```http
GET /inbox/conversations/:id/activity-summary
```

Response:
```json
{
  "totalChanges": 12,
  "statusChanges": 3,
  "priorityChanges": 2,
  "assignmentChanges": 4,
  "lastActivity": "2024-01-07T10:30:00Z"
}
```

**Update Status with Tracking**
```http
PUT /inbox/conversations/:id/status
Content-Type: application/json

{
  "status": "RESOLVED",
  "notes": "Customer issue resolved"
}
```

**Update Priority with Tracking**
```http
PUT /inbox/conversations/:id/priority
Content-Type: application/json

{
  "priority": "HIGH",
  "notes": "Escalated due to customer VIP status"
}
```

### 3. SLA Tracking & Alerts

Monitor response times and resolution times against configured Service Level Agreements.

#### Key Features:
- Flexible SLA configuration by priority, platform, and conversation type
- First response time tracking
- Resolution time tracking
- Business hours support
- Automatic escalation
- At-risk conversation detection
- Comprehensive SLA statistics

#### SLA Configuration:

**Create SLA Config**
```http
POST /inbox/sla/configs
Content-Type: application/json

{
  "name": "High Priority SLA",
  "description": "SLA for high priority conversations",
  "priority": "HIGH",
  "platform": "INSTAGRAM",
  "type": "DM",
  "firstResponseTime": 15,
  "resolutionTime": 120,
  "businessHoursOnly": true,
  "businessHours": {
    "start": "09:00",
    "end": "17:00",
    "days": ["mon", "tue", "wed", "thu", "fri"]
  },
  "timezone": "America/New_York",
  "escalationEnabled": true,
  "escalationTime": 30,
  "escalateTo": ["manager-user-id"]
}
```

**List SLA Configs**
```http
GET /inbox/sla/configs?isActive=true
```

**Get SLA Tracking for Conversation**
```http
GET /inbox/conversations/:id/sla
```

Response:
```json
{
  "id": "tracking-uuid",
  "conversationId": "conv-uuid",
  "slaConfigId": "config-uuid",
  "startedAt": "2024-01-07T10:00:00Z",
  "firstResponseAt": "2024-01-07T10:12:00Z",
  "firstResponseTime": 12,
  "firstResponseStatus": "MET",
  "firstResponseBreached": false,
  "resolutionStatus": "PENDING",
  "escalated": false,
  "slaConfig": {
    "name": "High Priority SLA",
    "firstResponseTime": 15,
    "resolutionTime": 120
  }
}
```

**Get SLA Statistics**
```http
GET /inbox/sla/stats?startDate=2024-01-01&endDate=2024-01-31
```

Response:
```json
{
  "totalTracked": 1250,
  "firstResponseMet": 1100,
  "firstResponseBreached": 150,
  "resolutionMet": 980,
  "resolutionBreached": 270,
  "avgFirstResponseTime": 8.5,
  "avgResolutionTime": 95.3,
  "escalated": 45
}
```

**Get At-Risk Conversations**
```http
GET /inbox/sla/at-risk
```

Response:
```json
[
  {
    "conversation": {
      "id": "conv-uuid",
      "participantName": "John Doe",
      "priority": "HIGH",
      "status": "OPEN"
    },
    "tracking": {
      "startedAt": "2024-01-07T10:00:00Z",
      "firstResponseStatus": "PENDING"
    },
    "minutesUntilBreach": 3
  }
]
```

**Check and Escalate**
```http
POST /inbox/conversations/:id/check-escalation
```

Response:
```json
{
  "shouldEscalate": true,
  "tracking": {
    "escalated": true,
    "escalatedAt": "2024-01-07T10:30:00Z",
    "escalateTo": ["manager-user-id"]
  }
}
```

## Database Schema

### SavedReply
```prisma
model SavedReply {
  id          String   @id @default(uuid())
  workspaceId String
  name        String
  content     String
  category    String?
  variables   String[]
  usageCount  Int      @default(0)
  lastUsedAt  DateTime?
  tags        String[]
  isActive    Boolean  @default(true)
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### ConversationHistory
```prisma
model ConversationHistory {
  id             String   @id @default(uuid())
  conversationId String
  field          String
  oldValue       String?
  newValue       String?
  changedBy      String
  changedAt      DateTime @default(now())
  notes          String?
}
```

### SLAConfig
```prisma
model SLAConfig {
  id                String    @id @default(uuid())
  workspaceId       String
  name              String
  description       String?
  priority          Priority
  platform          Platform?
  type              ConversationType?
  firstResponseTime Int
  resolutionTime    Int
  businessHoursOnly Boolean   @default(false)
  businessHours     Json?
  timezone          String    @default("UTC")
  escalationEnabled Boolean   @default(false)
  escalationTime    Int?
  escalateTo        String[]
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

### SLATracking
```prisma
model SLATracking {
  id                    String    @id @default(uuid())
  conversationId        String
  slaConfigId           String
  startedAt             DateTime  @default(now())
  firstResponseAt       DateTime?
  resolvedAt            DateTime?
  firstResponseStatus   SLAStatus @default(PENDING)
  resolutionStatus      SLAStatus @default(PENDING)
  firstResponseBreached Boolean   @default(false)
  resolutionBreached    Boolean   @default(false)
  firstResponseTime     Int?
  resolutionTime        Int?
  escalated             Boolean   @default(false)
  escalatedAt           DateTime?
  escalateTo            String[]
  metadata              Json?
}
```

## WebSocket Events

### SLA Escalation
When a conversation is escalated due to SLA breach:

```javascript
socket.on('sla:escalation', (data) => {
  console.log('SLA escalation:', data);
  // {
  //   conversationId: 'uuid',
  //   tracking: { ... }
  // }
});

// For users in escalation list
socket.on('sla:escalation:assigned', (data) => {
  console.log('Conversation escalated to you:', data);
});
```

## Integration Examples

### Automatic SLA Tracking

SLA tracking is automatically started when a conversation is created:

```typescript
// When creating a conversation
const conversation = await conversationService.create(workspaceId, {
  accountId: 'account-uuid',
  platform: 'INSTAGRAM',
  type: 'DM',
  participantId: 'user-123',
  participantName: 'John Doe',
  priority: 'HIGH'
});

// SLA tracking is automatically started based on matching config
```

### Recording First Response

First response is automatically recorded when replying:

```typescript
// When replying to a conversation
const message = await messageService.reply(
  conversationId,
  workspaceId,
  'Thank you for contacting us!',
  userId,
  false
);

// First response time is automatically recorded for SLA tracking
```

### Template Usage in Replies

```typescript
// Reply using a template
const message = await messageService.replyWithTemplate(
  conversationId,
  workspaceId,
  templateId,
  {
    name: 'John',
    product: 'Premium Plan',
    issue: 'billing'
  },
  userId
);

// Template usage count is automatically incremented
```

## Best Practices

### Saved Reply Templates

1. **Use Clear Variable Names**: Use descriptive variable names like `{{customerName}}` instead of `{{n}}`
2. **Organize by Category**: Group templates by purpose (greeting, support, sales, etc.)
3. **Keep Templates Flexible**: Design templates that work for multiple scenarios
4. **Review Usage Stats**: Regularly review template usage to identify and improve popular templates
5. **Maintain Active Status**: Deactivate outdated templates instead of deleting them

### SLA Configuration

1. **Start Conservative**: Begin with achievable SLA targets and adjust based on performance
2. **Use Business Hours**: Enable business hours for more realistic SLA tracking
3. **Configure Escalation**: Set up escalation paths to ensure urgent issues get attention
4. **Monitor At-Risk**: Regularly check at-risk conversations to prevent breaches
5. **Analyze Statistics**: Use SLA stats to identify bottlenecks and improve processes

### Conversation History

1. **Add Context Notes**: Include notes when making significant changes
2. **Review Activity**: Check conversation history before taking action
3. **Track Patterns**: Use history to identify common conversation flows
4. **Audit Compliance**: Leverage history for compliance and quality assurance

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 10.3**: Reply composition, saved reply templates, and template variable substitution
- **Requirement 10.5**: Conversation status management, reply history tracking, and SLA tracking with alerts

## Testing

To test the Response Management features:

1. **Create Templates**: Test template creation with various variable patterns
2. **Reply with Templates**: Verify variable substitution works correctly
3. **Track History**: Ensure all conversation changes are logged
4. **Configure SLAs**: Set up SLA configs for different priorities
5. **Monitor SLAs**: Create conversations and verify SLA tracking
6. **Test Escalation**: Wait for escalation time and verify alerts are sent
7. **Check Statistics**: Verify all statistics endpoints return accurate data

## Future Enhancements

Potential improvements for future iterations:

1. **AI-Powered Template Suggestions**: Suggest templates based on conversation context
2. **Template A/B Testing**: Test different template variations for effectiveness
3. **Advanced SLA Rules**: Support more complex SLA rules (e.g., based on customer tier)
4. **SLA Pause/Resume**: Allow pausing SLA tracking during customer wait times
5. **Template Versioning**: Track template changes over time
6. **Bulk Template Operations**: Import/export templates in bulk
7. **Template Analytics**: Detailed analytics on template effectiveness
8. **Smart Escalation**: AI-powered escalation based on conversation sentiment
