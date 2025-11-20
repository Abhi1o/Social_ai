# Community Management Module

## Overview

The Community Management module provides a unified inbox system for managing all social media interactions across multiple platforms. It aggregates messages, comments, mentions, and reviews into a single interface with advanced filtering, threading, and real-time synchronization capabilities.

## Features

### 1. Conversation Aggregation
- Unified view of all social media interactions
- Support for multiple conversation types: comments, DMs, mentions, reviews
- Automatic conversation creation and participant tracking
- Platform-agnostic conversation management

### 2. Message Collection
- Webhook-based message ingestion from social platforms
- Automatic deduplication of messages
- Batch processing support for high-volume scenarios
- Sentiment analysis integration
- Real-time message sync

### 3. Conversation Threading
- Intelligent message grouping and threading
- Context-aware conversation history
- Merge and split conversation capabilities
- Auto-threading based on time proximity
- Related conversation discovery

### 4. Advanced Filtering & Search
- Multi-criteria filtering (status, priority, sentiment, platform, etc.)
- Full-text search across conversations and messages
- Saved filter configurations
- Quick filter presets
- Filter suggestions based on workspace data

### 5. Real-time Updates (WebSocket)
- Live message notifications
- Typing indicators
- Presence tracking (online/offline status)
- Conversation assignment notifications
- Unread count updates

## Architecture

```
community/
├── dto/                          # Data Transfer Objects
│   ├── create-conversation.dto.ts
│   ├── create-message.dto.ts
│   ├── query-conversations.dto.ts
│   ├── update-conversation.dto.ts
│   └── reply-message.dto.ts
├── services/                     # Business Logic
│   ├── conversation.service.ts           # Conversation CRUD operations
│   ├── message.service.ts                # Message management
│   ├── message-collection.service.ts     # Message ingestion & processing
│   ├── conversation-threading.service.ts # Threading logic
│   └── inbox-filter.service.ts           # Advanced filtering
├── gateways/                     # WebSocket Gateways
│   └── inbox.gateway.ts                  # Real-time inbox updates
├── community.controller.ts       # REST API endpoints
├── community.module.ts           # Module definition
└── README.md                     # This file
```

## API Endpoints

### Conversations

#### GET /inbox/conversations
Get all conversations with filters and pagination.

**Query Parameters:**
- `status`: Filter by conversation status (OPEN, PENDING, RESOLVED, ARCHIVED)
- `priority`: Filter by priority (LOW, MEDIUM, HIGH, URGENT)
- `sentiment`: Filter by sentiment (POSITIVE, NEUTRAL, NEGATIVE)
- `assignedTo`: Filter by assigned user ID
- `platform`: Filter by social platform
- `unreadOnly`: Show only unread conversations
- `search`: Search query
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "conversations": [...],
  "total": 150,
  "unreadCount": 23,
  "page": 1,
  "limit": 20
}
```

#### GET /inbox/conversations/:id
Get a single conversation with all messages.

#### GET /inbox/conversations/:id/thread
Get threaded conversation with context (response times, message counts, etc.).

#### POST /inbox/conversations
Create a new conversation.

#### PUT /inbox/conversations/:id
Update a conversation.

#### PUT /inbox/conversations/:id/assign
Assign conversation to a user.

#### PUT /inbox/conversations/:id/archive
Archive a conversation.

### Messages

#### GET /inbox/conversations/:id/messages
Get all messages for a conversation.

#### POST /inbox/conversations/:id/reply
Reply to a conversation.

**Request Body:**
```json
{
  "content": "Thank you for reaching out!",
  "media": ["media-id-1", "media-id-2"],
  "isPrivate": false,
  "aiGenerated": false
}
```

### Statistics

#### GET /inbox/stats
Get conversation statistics for the workspace.

**Response:**
```json
{
  "total": 500,
  "open": 120,
  "pending": 45,
  "resolved": 300,
  "byPriority": {
    "LOW": 200,
    "MEDIUM": 250,
    "HIGH": 40,
    "URGENT": 10
  },
  "bySentiment": {
    "POSITIVE": 300,
    "NEUTRAL": 150,
    "NEGATIVE": 50
  },
  "byPlatform": {
    "INSTAGRAM": 200,
    "FACEBOOK": 150,
    "TWITTER": 100,
    "LINKEDIN": 50
  }
}
```

#### GET /inbox/collection-stats
Get message collection statistics.

### Filtering & Search

#### POST /inbox/filter
Apply advanced filters to conversations.

**Request Body:**
```json
{
  "filter": {
    "status": ["OPEN", "PENDING"],
    "priority": "HIGH",
    "sentiment": "NEGATIVE",
    "platform": "INSTAGRAM",
    "createdAfter": "2024-01-01T00:00:00Z",
    "slaOverdue": true
  },
  "page": 1,
  "limit": 20
}
```

#### GET /inbox/search?q=query
Search conversations by participant name, content, or tags.

#### GET /inbox/filter-suggestions
Get filter suggestions based on workspace data (available platforms, tags, assignees, etc.).

#### GET /inbox/quick-filters
Get predefined quick filter configurations.

### Threading

#### GET /inbox/conversations/:id/related
Get related conversations for the same participant.

#### POST /inbox/conversations/:id/merge
Merge two conversations into one.

**Request Body:**
```json
{
  "secondaryId": "conversation-id-to-merge"
}
```

#### POST /inbox/conversations/:id/split
Split a conversation into two separate threads.

**Request Body:**
```json
{
  "splitAtMessageId": "message-id-where-to-split"
}
```

#### POST /inbox/auto-thread
Auto-thread messages based on time proximity.

**Request Body:**
```json
{
  "accountId": "social-account-id",
  "participantId": "participant-id",
  "timeWindowMinutes": 60
}
```

### Presence

#### GET /inbox/presence/online
Get list of online users in the workspace.

## WebSocket Events

### Client -> Server

#### subscribe:conversation
Subscribe to updates for a specific conversation.
```javascript
socket.emit('subscribe:conversation', { conversationId: 'conv-123' });
```

#### unsubscribe:conversation
Unsubscribe from conversation updates.
```javascript
socket.emit('unsubscribe:conversation', { conversationId: 'conv-123' });
```

#### typing:start
Indicate user is typing.
```javascript
socket.emit('typing:start', { conversationId: 'conv-123', userId: 'user-123' });
```

#### typing:stop
Indicate user stopped typing.
```javascript
socket.emit('typing:stop', { conversationId: 'conv-123', userId: 'user-123' });
```

### Server -> Client

#### message:new
New message received in a conversation.
```javascript
socket.on('message:new', (data) => {
  console.log('New message:', data.message);
});
```

#### conversation:update
Conversation was updated.
```javascript
socket.on('conversation:update', (data) => {
  console.log('Conversation updated:', data.conversation);
});
```

#### conversation:new
New conversation created.
```javascript
socket.on('conversation:new', (data) => {
  console.log('New conversation:', data.conversation);
});
```

#### conversation:assigned
Conversation was assigned to you.
```javascript
socket.on('conversation:assigned', (data) => {
  console.log('Assigned conversation:', data.conversation);
});
```

#### typing:user
User typing status changed.
```javascript
socket.on('typing:user', (data) => {
  console.log(`User ${data.userId} typing: ${data.typing}`);
});
```

#### unread:count
Unread count updated.
```javascript
socket.on('unread:count', (data) => {
  console.log('Unread count:', data.count);
});
```

#### presence:update
User online/offline status changed.
```javascript
socket.on('presence:update', (data) => {
  console.log(`User ${data.userId} is ${data.status}`);
});
```

## Usage Examples

### Processing Incoming Messages

```typescript
import { MessageCollectionService, IncomingMessage } from './services/message-collection.service';

// In your webhook handler
async handleWebhook(payload: any) {
  const incomingMessage: IncomingMessage = {
    platform: 'INSTAGRAM',
    accountId: 'account-123',
    type: 'COMMENT',
    participantId: 'user-456',
    participantName: 'John Doe',
    participantAvatar: 'https://...',
    content: 'Great product!',
    platformMessageId: 'ig-msg-789',
    sentiment: 0.8,
    metadata: { postId: 'post-123' },
  };

  const result = await this.messageCollectionService.processIncomingMessage(
    'workspace-id',
    incomingMessage,
  );

  console.log('Message processed:', result);
}
```

### Filtering Conversations

```typescript
import { InboxFilterService } from './services/inbox-filter.service';

// Get urgent negative conversations
const result = await this.filterService.applyFilters(
  'workspace-id',
  {
    priority: 'URGENT',
    sentiment: 'NEGATIVE',
    status: ['OPEN', 'PENDING'],
    slaOverdue: true,
  },
  1,
  20,
);

console.log('Urgent conversations:', result.conversations);
```

### Real-time Updates

```typescript
import { InboxGateway } from './gateways/inbox.gateway';

// Emit new message to conversation subscribers
this.inboxGateway.emitNewMessage(conversationId, message);

// Emit conversation assignment
this.inboxGateway.emitConversationAssignment(userId, conversation);

// Broadcast to entire workspace
this.inboxGateway.broadcastToWorkspace(workspaceId, 'custom:event', data);
```

## Database Schema

### Conversation
```prisma
model Conversation {
  id               String              @id @default(uuid())
  workspaceId      String
  accountId        String
  platform         Platform
  type             ConversationType
  participantId    String
  participantName  String
  participantAvatar String?
  status           ConversationStatus  @default(OPEN)
  priority         Priority            @default(MEDIUM)
  sentiment        Sentiment           @default(NEUTRAL)
  assignedToId     String?
  tags             String[]
  slaDeadline      DateTime?
  messages         Message[]
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
}
```

### Message
```prisma
model Message {
  id                String           @id @default(uuid())
  conversationId    String
  direction         MessageDirection
  content           String
  platformMessageId String
  authorId          String?
  sentiment         Float?
  aiGenerated       Boolean          @default(false)
  metadata          Json?
  createdAt         DateTime         @default(now())
}
```

## Integration with Other Modules

### Social Account Module
- Uses social account data for conversation context
- Validates account ownership before processing messages

### AI Module
- Sentiment analysis for incoming messages
- AI-powered response suggestions
- Automated response generation

### Analytics Module
- Response time tracking
- Conversation volume metrics
- Sentiment trends

## Performance Considerations

1. **Message Deduplication**: All incoming messages are checked for duplicates using `platformMessageId`
2. **Batch Processing**: Use `processBatch()` for high-volume message ingestion
3. **WebSocket Scaling**: Gateway supports multiple server instances with Redis adapter
4. **Database Indexing**: Conversations indexed by workspace, status, platform, and assignee
5. **Pagination**: All list endpoints support pagination to handle large datasets

## Security

1. **Workspace Isolation**: All queries filtered by workspaceId
2. **Authentication**: WebSocket connections require JWT authentication
3. **Authorization**: Users can only access conversations in their workspace
4. **Data Validation**: All DTOs validated using class-validator

## Future Enhancements

- [ ] Saved reply templates
- [ ] Automated routing rules
- [ ] SLA tracking and alerts
- [ ] Conversation tags and categories
- [ ] Bulk operations (assign, archive, tag)
- [ ] Message read receipts
- [ ] Rich media support in messages
- [ ] Conversation notes and internal comments
- [ ] Integration with CRM systems
- [ ] Advanced analytics and reporting

## Requirements Validation

This implementation satisfies the following requirements from the specification:

**Requirement 10.1**: ✅ Unified inbox aggregating messages, comments, mentions, and reviews from all connected platforms

**Requirement 10.5**: ✅ Real-time message sync via WebSocket with typing indicators and presence tracking

Additional features implemented:
- Advanced filtering and search capabilities
- Conversation threading and context management
- Message collection workers for webhook processing
- Statistics and analytics endpoints
- Presence tracking and online user management
