# Smart Inbox Routing

## Overview

The Smart Inbox Routing system provides AI-powered message categorization, sentiment detection, intent detection, priority scoring, and automatic team member assignment for the unified inbox.

**Requirements:** 10.2, 10.4

## Features

### 1. AI-Powered Message Categorization

Messages are automatically categorized into:
- **Urgent**: Requires immediate attention (crisis, severe issue, time-sensitive)
- **Customer Support**: Technical support or customer service issue
- **Sales**: Sales inquiry, pricing, or purchase-related
- **Marketing**: Marketing feedback, campaign-related, or brand inquiry
- **General Inquiry**: General questions or information requests
- **Spam**: Spam or irrelevant content

### 2. Sentiment Detection

Uses AI to analyze message sentiment:
- **Positive**: Happy, satisfied customers
- **Neutral**: Informational or neutral tone
- **Negative**: Complaints, frustration, dissatisfaction

Sentiment scores range from -1 (very negative) to 1 (very positive).

### 3. Intent Detection

Identifies the primary intent of messages:
- **Question**: User is asking a question
- **Complaint**: User is expressing dissatisfaction or a problem
- **Praise**: User is giving positive feedback or compliments
- **Support Request**: User needs technical or customer support
- **Sales Inquiry**: User is interested in purchasing or pricing
- **Feedback**: User is providing general feedback or suggestions
- **Spam**: Message appears to be spam or irrelevant
- **General**: General conversation or unclear intent

### 4. Priority Scoring

Automatically calculates message priority based on:
- Sentiment (negative sentiment increases priority)
- Intent (complaints and support requests get higher priority)
- Category (urgent category gets highest priority)
- Keywords (urgent, asap, emergency, critical, immediately)

Priority levels:
- **Urgent**: Requires immediate attention
- **High**: Important, should be addressed soon
- **Medium**: Normal priority
- **Low**: Can be addressed when convenient

### 5. Automatic Team Member Assignment

Intelligently assigns messages to team members based on:
- Current workload (number of open conversations)
- User skills and specializations (future enhancement)
- User availability and working hours (future enhancement)
- Historical performance (future enhancement)
- Category/intent matching (future enhancement)

### 6. Routing Rules Engine

Configurable routing rules that automatically:
- Assign messages to specific team members
- Set priority levels
- Add tags for organization
- Trigger automated responses (future enhancement)

## API Endpoints

### Analyze Message Sentiment
```http
POST /inbox/messages/:id/analyze-sentiment
```

Returns sentiment analysis for a specific message.

**Response:**
```json
{
  "sentiment": "negative",
  "score": -0.8,
  "reasoning": "Message contains complaint language and frustration"
}
```

### Detect Message Intent
```http
POST /inbox/messages/:id/detect-intent
```

Returns intent classification for a specific message.

**Response:**
```json
{
  "intent": "complaint",
  "confidence": 0.9,
  "reasoning": "User is expressing dissatisfaction with a problem"
}
```

### Categorize Message
```http
POST /inbox/messages/:id/categorize
```

Returns category classification for routing purposes.

**Response:**
```json
{
  "category": "customer_support",
  "confidence": 0.85,
  "reasoning": "Technical support issue requiring assistance"
}
```

### Route Message
```http
POST /inbox/conversations/:id/messages/:messageId/route
```

Performs complete analysis and applies routing rules.

**Response:**
```json
{
  "routingResult": {
    "category": "urgent",
    "intent": "complaint",
    "sentiment": "negative",
    "sentimentScore": -0.8,
    "priority": "urgent",
    "suggestedAssignee": "user-123",
    "confidence": 0.9,
    "reasoning": "Sentiment: negative (Contains complaint language). Intent: complaint (User has a problem). Category: urgent (Requires immediate attention). Priority: urgent."
  },
  "conversation": {
    "id": "conv-123",
    "priority": "urgent",
    "sentiment": "negative",
    "assignedToId": "user-123",
    "tags": ["urgent", "complaint", "needs-attention"]
  }
}
```

### Batch Analyze Messages
```http
POST /inbox/batch-analyze
```

Analyzes multiple messages in parallel.

**Request:**
```json
{
  "messageIds": ["msg-1", "msg-2", "msg-3"]
}
```

**Response:**
```json
{
  "results": {
    "conv-1": {
      "category": "sales",
      "intent": "sales_inquiry",
      "sentiment": "neutral",
      "sentimentScore": 0.1,
      "priority": "medium",
      "confidence": 0.8
    },
    "conv-2": {
      "category": "urgent",
      "intent": "complaint",
      "sentiment": "negative",
      "sentimentScore": -0.9,
      "priority": "urgent",
      "confidence": 0.95
    }
  }
}
```

## Usage Examples

### Basic Usage

```typescript
import { SmartInboxRoutingService } from './services/smart-inbox-routing.service';

// Inject the service
constructor(private smartRoutingService: SmartInboxRoutingService) {}

// Analyze and route a new message
async handleNewMessage(workspaceId: string, conversationId: string, message: Message) {
  // Perform analysis
  const routingResult = await this.smartRoutingService.analyzeAndRoute(
    workspaceId,
    conversationId,
    message,
  );

  // Apply routing rules
  await this.smartRoutingService.applyRoutingRules(
    workspaceId,
    conversationId,
    routingResult,
  );

  console.log('Message routed:', routingResult);
}
```

### Sentiment Analysis Only

```typescript
// Analyze sentiment of a message
const sentiment = await this.smartRoutingService.detectSentiment(
  'I love your product! It works great!'
);

console.log(sentiment);
// {
//   sentiment: 'positive',
//   score: 0.9,
//   reasoning: 'Contains positive language and enthusiasm'
// }
```

### Intent Detection Only

```typescript
// Detect intent of a message
const intent = await this.smartRoutingService.detectIntent(
  'How much does the premium plan cost?'
);

console.log(intent);
// {
//   intent: 'sales_inquiry',
//   confidence: 0.85,
//   reasoning: 'User asking about pricing'
// }
```

### Batch Processing

```typescript
// Analyze multiple messages at once
const messages = [
  { conversationId: 'conv-1', message: message1 },
  { conversationId: 'conv-2', message: message2 },
  { conversationId: 'conv-3', message: message3 },
];

const results = await this.smartRoutingService.batchAnalyze(
  workspaceId,
  messages,
);

// Process results
for (const [conversationId, routingResult] of results) {
  console.log(`Conversation ${conversationId}:`, routingResult);
}
```

## Routing Rules

Default routing rules are applied automatically:

### 1. Urgent Messages Rule
- **Conditions**: Category is "urgent"
- **Actions**: 
  - Set priority to URGENT
  - Add tags: ["urgent"]

### 2. Complaints Rule
- **Conditions**: Intent is "complaint" AND sentiment is "negative"
- **Actions**:
  - Set priority to HIGH
  - Add tags: ["complaint", "needs-attention"]

### 3. Sales Inquiries Rule
- **Conditions**: Category is "sales" OR intent is "sales_inquiry"
- **Actions**:
  - Add tags: ["sales", "opportunity"]

### 4. Spam Filter Rule
- **Conditions**: Intent is "spam" OR category is "spam"
- **Actions**:
  - Set priority to LOW
  - Add tags: ["spam"]

## AI Models

The system uses cost-efficient AI models by default:
- **Primary Model**: GPT-4o-mini (OpenAI)
- **Fallback**: Keyword-based detection

### Keyword-Based Fallback

When AI models are unavailable, the system falls back to keyword-based detection:

- **Spam**: "click here", "free money", "winner", "congratulations"
- **Complaints**: "problem", "issue", "broken", "not working", "error", "bug"
- **Sales**: "price", "cost", "buy", "purchase", "order", "payment"
- **Support**: "help", "support", "assist", "need", "urgent", "asap"
- **Praise**: "great", "excellent", "amazing", "love", "thank", "awesome"
- **Questions**: "?", "how", "what", "when", "where", "why", "who"

## Performance Considerations

### Caching
- AI responses are cached for 24 hours to reduce costs
- Similar messages use cached results

### Batch Processing
- Messages are processed in batches of 5 for optimal performance
- Parallel processing reduces overall latency

### Cost Optimization
- Uses GPT-4o-mini (cost-efficient model) by default
- Falls back to keyword-based detection on errors
- Caches results to minimize API calls

## Future Enhancements

1. **Advanced Assignment Logic**
   - User skills and specializations matching
   - Availability and working hours consideration
   - Historical performance tracking
   - Round-robin and load balancing strategies

2. **Custom Routing Rules**
   - User-defined routing rules via UI
   - Complex conditional logic
   - Multi-step workflows
   - Integration with external systems

3. **Auto-Response System**
   - Automated responses for common intents
   - Template-based responses
   - AI-generated personalized responses
   - Response approval workflows

4. **Learning and Improvement**
   - Machine learning from user corrections
   - Continuous model improvement
   - A/B testing of routing strategies
   - Performance analytics and optimization

5. **Multi-Language Support**
   - Sentiment and intent detection in 42+ languages
   - Language-specific routing rules
   - Translation integration

## Testing

Run the test suite:

```bash
npm test -- smart-inbox-routing.service.spec.ts
```

The test suite covers:
- Sentiment detection (positive, negative, neutral)
- Intent detection (all intent types)
- Message categorization
- Priority calculation
- Team member assignment
- Routing rules application
- Batch processing
- Error handling and fallbacks

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    New Message Arrives                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              SmartInboxRoutingService                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Sentiment Detection (AI)                         │  │
│  │     - Positive/Neutral/Negative                      │  │
│  │     - Score: -1 to 1                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  2. Intent Detection (AI + Keywords)                 │  │
│  │     - Question/Complaint/Praise/Support/Sales/etc    │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  3. Message Categorization (AI)                      │  │
│  │     - Urgent/Support/Sales/Marketing/General/Spam    │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  4. Priority Calculation                             │  │
│  │     - Urgent/High/Medium/Low                         │  │
│  │     - Based on sentiment + intent + category         │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  5. Team Member Assignment                           │  │
│  │     - Load balancing                                 │  │
│  │     - Skills matching (future)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  6. Apply Routing Rules                              │  │
│  │     - Match conditions                               │  │
│  │     - Execute actions                                │  │
│  │     - Update conversation                            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Conversation Updated & Routed                   │
│  - Priority set                                              │
│  - Sentiment recorded                                        │
│  - Assigned to team member                                   │
│  - Tags added                                                │
│  - WebSocket notification sent                               │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

```env
# AI Configuration
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Model Selection (optional)
AI_MODEL_DEFAULT=gpt-4o-mini
AI_MODEL_PREMIUM=gpt-4o
```

### Workspace Settings

Routing behavior can be customized per workspace through the workspace settings:

```typescript
{
  "smartRouting": {
    "enabled": true,
    "autoAssign": true,
    "defaultPriority": "medium",
    "rules": [
      // Custom routing rules
    ]
  }
}
```

## Troubleshooting

### AI Model Not Available

If AI models fail, the system automatically falls back to keyword-based detection. Check:
1. API keys are configured correctly
2. API quotas are not exceeded
3. Network connectivity to AI providers

### Incorrect Routing

If messages are being routed incorrectly:
1. Review routing rules configuration
2. Check sentiment/intent detection accuracy
3. Adjust keyword patterns for fallback detection
4. Consider training custom models (future enhancement)

### Performance Issues

If routing is slow:
1. Enable caching (enabled by default)
2. Use batch processing for multiple messages
3. Monitor AI API response times
4. Consider increasing batch size

## Support

For issues or questions:
- Check the test suite for usage examples
- Review the API documentation
- Contact the development team
