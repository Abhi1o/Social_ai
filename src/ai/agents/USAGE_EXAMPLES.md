# Content Creator Agent - Usage Examples

## Basic Content Generation

### Example 1: Generate Instagram Post
```typescript
const response = await fetch('/api/ai/content/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    context: {
      topic: 'New Product Launch',
      tone: 'professional',
      platforms: ['instagram'],
      targetAudience: 'Tech enthusiasts aged 25-40',
      keywords: ['innovation', 'technology', 'future']
    },
    variations: 3
  })
});

const result = await response.json();
// Returns 3 scored variations optimized for Instagram
```

### Example 2: Multi-Platform Content
```typescript
const response = await fetch('/api/ai/content/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    prompt: 'Announce our summer sale with 30% off',
    context: {
      tone: 'friendly',
      platforms: ['instagram', 'twitter', 'facebook'],
    },
    variations: 5
  })
});
```

## Content Optimization

### Example 3: Optimize for Engagement
```typescript
const response = await fetch('/api/ai/content/optimize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    content: 'Check out our new product. It has great features.',
    platform: 'instagram',
    optimizationGoals: ['engagement', 'reach']
  })
});

const result = await response.json();
// Returns optimized content with suggestions
```

## Brand Voice Management

### Example 4: Create Brand Voice Profile
```typescript
const response = await fetch('/api/ai/content/brand-voice', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    name: 'Tech Startup Voice',
    description: 'Innovative, forward-thinking, professional',
    tone: 'professional',
    vocabulary: ['innovative', 'cutting-edge', 'revolutionary'],
    avoidWords: ['cheap', 'basic', 'old'],
    examples: [
      'Our innovative solution transforms the way you work',
      'Experience cutting-edge technology that adapts to you'
    ],
    guidelines: 'Always maintain professional tone while being approachable'
  })
});
```

### Example 5: Check Brand Voice Consistency
```typescript
const response = await fetch('/api/ai/content/check-brand-voice', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    content: 'Our cheap and basic product is simple to use',
    brandVoiceId: 'bv-123'
  })
});

const result = await response.json();
// Returns score, issues, and suggestions
```

## Response Examples

### Content Generation Response
```json
{
  "variations": [
    {
      "id": "var-1234567890-0",
      "content": {
        "text": "🚀 Exciting news! Our revolutionary product is here...",
        "hashtags": ["innovation", "tech", "productlaunch"],
        "mentions": []
      },
      "platform": "instagram",
      "score": 87,
      "reasoning": "Strong hook with emoji, clear message, optimal hashtags"
    }
  ],
  "cost": 0.002,
  "tokensUsed": 350
}
```

### Optimization Response
```json
{
  "optimizedContent": "Check out our new product! 🎉 What features excite you most?",
  "suggestions": [
    {
      "type": "engagement",
      "original": "Check out our new product. It has great features.",
      "suggested": "Check out our new product! 🎉 What features excite you most?",
      "reasoning": "Added emoji and question to increase engagement"
    }
  ],
  "predictedPerformance": {
    "engagementRate": 0.05,
    "reachEstimate": 10000
  }
}
```

### Brand Voice Check Response
```json
{
  "score": 45,
  "issues": [
    "Uses avoided word: cheap",
    "Uses avoided word: basic",
    "Tone doesn't match brand voice"
  ],
  "suggestions": [
    "Replace 'cheap' with 'affordable' or 'accessible'",
    "Replace 'basic' with 'essential' or 'streamlined'",
    "Add more professional language"
  ]
}
```
