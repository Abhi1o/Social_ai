# Brand Voice Training System

## Overview

The Brand Voice Training system enables workspaces to create, train, and maintain consistent brand voice profiles. The system analyzes example content to extract patterns, tone, and style, then uses this training data to ensure all AI-generated content maintains brand consistency.

## Features

### 1. Brand Voice Profile Creation
- Create multiple brand voice profiles per workspace
- Set one profile as default for automatic application
- Define tone, vocabulary preferences, and words to avoid
- Provide example content for training

### 2. Automated Training
- Analyzes example content to extract patterns:
  - Sentence structure (short, medium, long)
  - Common phrases and vocabulary
  - Punctuation style (formal, enthusiastic, inquisitive)
  - Average word length
  - Vocabulary complexity (simple, medium, complex)
- Calculates consistency score across examples
- Stores training data for future reference

### 3. Brand Voice Consistency Checking
- Check any content against a brand voice profile
- Receive a consistency score (0-100)
- Get detailed issues and suggestions
- Identify:
  - Use of avoided words
  - Missing preferred vocabulary
  - Sentence structure mismatches
  - Punctuation style differences
  - Tone alignment

### 4. Database Persistence
- All brand voice profiles stored in PostgreSQL
- Workspace isolation for multi-tenancy
- Training data and consistency scores persisted
- Support for active/inactive profiles

## API Endpoints

### Create Brand Voice Profile
```http
POST /api/ai/brand-voice
Authorization: Bearer <token>

{
  "name": "Tech Startup Voice",
  "description": "Friendly, innovative, and approachable",
  "tone": "friendly",
  "vocabulary": ["innovative", "cutting-edge", "seamless", "empower"],
  "avoidWords": ["cheap", "basic", "old-fashioned"],
  "examples": [
    "We empower teams to build innovative solutions that transform the way they work.",
    "Our cutting-edge platform makes collaboration seamless and intuitive."
  ],
  "guidelines": "Always use active voice. Keep sentences concise.",
  "isDefault": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bv-123",
    "workspaceId": "ws-456",
    "name": "Tech Startup Voice",
    "description": "Friendly, innovative, and approachable",
    "tone": "friendly",
    "vocabulary": ["innovative", "cutting-edge", "seamless", "empower"],
    "avoidWords": ["cheap", "basic", "old-fashioned"],
    "examples": [...],
    "guidelines": "Always use active voice. Keep sentences concise."
  },
  "message": "Brand voice profile created and trained successfully"
}
```

### Get All Brand Voice Profiles
```http
GET /api/ai/brand-voice
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bv-123",
      "name": "Tech Startup Voice",
      "tone": "friendly",
      ...
    }
  ],
  "count": 1
}
```

### Get Default Brand Voice
```http
GET /api/ai/brand-voice/default
Authorization: Bearer <token>
```

### Get Brand Voice by ID
```http
GET /api/ai/brand-voice/:id
Authorization: Bearer <token>
```

### Update Brand Voice Profile
```http
PUT /api/ai/brand-voice/:id
Authorization: Bearer <token>

{
  "name": "Updated Name",
  "examples": ["New example content"]
}
```

### Delete Brand Voice Profile
```http
DELETE /api/ai/brand-voice/:id
Authorization: Bearer <token>
```

### Check Content Against Brand Voice
```http
POST /api/ai/brand-voice/check
Authorization: Bearer <token>

{
  "content": "Check out our amazing new features!",
  "brandVoiceId": "bv-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 75,
    "issues": [
      "Missing preferred vocabulary"
    ],
    "suggestions": [
      "Consider using: innovative, cutting-edge, seamless"
    ]
  }
}
```

## Training Algorithm

### Pattern Extraction

1. **Sentence Structure Analysis**
   - Categorizes sentences as short (≤5 words), medium (6-15 words), or long (>15 words)
   - Tracks distribution across examples

2. **Common Phrase Detection**
   - Identifies 2-word combinations that appear multiple times
   - Ranks by frequency
   - Stores top 10 common phrases

3. **Punctuation Style**
   - Analyzes ratio of exclamation marks, questions, and periods
   - Classifies as:
     - Enthusiastic: High exclamation usage (>30% of periods)
     - Inquisitive: High question usage (>20% of periods)
     - Formal: Balanced punctuation

4. **Vocabulary Analysis**
   - Calculates average word length
   - Determines complexity based on long words (>8 characters):
     - Complex: >15% long words
     - Simple: <5% long words
     - Medium: 5-15% long words

### Consistency Scoring

The consistency score measures how well examples align with each other:

- **Base Score**: 100
- **Deductions**:
  - High sentence structure variety: -15 points
  - Vocabulary repetition too low (<30%): -10 points
  - Vocabulary repetition too high (>70%): -10 points
  - Inconsistent punctuation style: -10 points

**Final Score**: Max(0, Min(100, calculated score))

### Content Checking Algorithm

When checking content against a brand voice:

1. **Avoided Words Check** (-10 points per word)
   - Scans for words in the avoid list
   - Provides specific suggestions to remove/replace

2. **Preferred Vocabulary Check** (-15 points if missing)
   - Checks if any preferred words are used
   - Suggests incorporating preferred vocabulary

3. **Sentence Structure Check** (-10 points if mismatch)
   - Compares average sentence length
   - Suggests adjusting to match brand pattern

4. **Punctuation Style Check** (-10 points if mismatch)
   - Analyzes punctuation ratios
   - Suggests matching brand tone

5. **Tone Alignment Check** (-10 points if missing)
   - Checks for tone-specific keywords
   - Suggests adding appropriate tone words

## Database Schema

```sql
CREATE TABLE "brand_voices" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tone" TEXT NOT NULL,
    "vocabulary" TEXT[],
    "avoidWords" TEXT[],
    "examples" TEXT[],
    "guidelines" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trainingData" JSONB,
    "consistencyScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_voices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "brand_voices_workspaceId_idx" ON "brand_voices"("workspaceId");
CREATE INDEX "brand_voices_isDefault_idx" ON "brand_voices"("isDefault");
```

## Usage Examples

### Creating a Brand Voice for a Professional Services Firm

```typescript
const brandVoice = await fetch('/api/ai/brand-voice', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Professional Services Voice',
    description: 'Authoritative, trustworthy, and expert',
    tone: 'professional',
    vocabulary: [
      'expertise',
      'strategic',
      'optimize',
      'comprehensive',
      'proven',
      'industry-leading'
    ],
    avoidWords: [
      'cheap',
      'easy',
      'simple',
      'basic'
    ],
    examples: [
      'Our proven expertise helps organizations optimize their strategic initiatives.',
      'We deliver comprehensive solutions backed by industry-leading research.',
      'Transform your business with our strategic consulting services.'
    ],
    guidelines: 'Use data-driven language. Emphasize expertise and results. Avoid casual language.',
    isDefault: true
  })
});
```

### Checking Content Before Publishing

```typescript
const check = await fetch('/api/ai/brand-voice/check', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Check out our easy and cheap solutions!',
    brandVoiceId: 'bv-123'
  })
});

// Response will show low score and suggest improvements
// {
//   "score": 45,
//   "issues": ["Contains words to avoid: cheap, easy"],
//   "suggestions": ["Remove or replace: cheap, easy", "Consider using: expertise, strategic, optimize"]
// }
```

### Integrating with Content Generation

```typescript
// Get default brand voice
const defaultVoice = await fetch('/api/ai/brand-voice/default', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Generate content with brand voice
const content = await fetch('/api/ai/content/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Announce our new consulting service',
    context: {
      platforms: ['linkedin'],
      tone: 'professional'
    },
    brandVoiceId: defaultVoice.data.id
  })
});
```

## Best Practices

### Training Data Quality

1. **Provide Diverse Examples** (3-5 minimum)
   - Include different content types (announcements, tips, questions)
   - Vary sentence lengths while maintaining consistency
   - Cover different topics in your brand's voice

2. **Maintain Consistency**
   - Use similar tone across all examples
   - Apply the same vocabulary preferences
   - Follow the same punctuation style

3. **Be Specific**
   - Define clear vocabulary preferences
   - List specific words to avoid
   - Provide detailed guidelines

### Profile Management

1. **Use Multiple Profiles**
   - Create separate profiles for different content types
   - Example: "Product Announcements", "Customer Support", "Thought Leadership"

2. **Regular Updates**
   - Review and update examples as brand evolves
   - Add new vocabulary as it emerges
   - Refine guidelines based on performance

3. **Consistency Monitoring**
   - Check all AI-generated content before publishing
   - Track consistency scores over time
   - Adjust training data if scores decline

## Integration Points

### Content Creator Agent
The Content Creator Agent automatically applies brand voice when generating content if a `brandVoiceId` is provided in the request.

### Content Optimization
The optimization endpoint checks content against brand voice and suggests improvements.

### Approval Workflows
Brand voice consistency can be checked as part of approval workflows to ensure all content meets standards.

## Performance Considerations

- Training data analysis is performed once during profile creation/update
- Consistency checking is fast (< 100ms) as it uses pre-computed patterns
- Brand voice profiles are cached for quick access
- Database queries are optimized with indexes on workspaceId and isDefault

## Future Enhancements

- [ ] Fine-tuning support for custom LLM models
- [ ] A/B testing different brand voices
- [ ] Automatic brand voice learning from published content
- [ ] Multi-language brand voice support
- [ ] Brand voice analytics and insights
- [ ] Integration with style guides and brand books
- [ ] Voice cloning from existing content libraries
