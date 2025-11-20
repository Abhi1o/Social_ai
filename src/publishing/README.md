# Platform API Abstraction Layer

This module provides a unified interface for publishing content across multiple social media platforms with built-in rate limiting, retry logic, content formatting, and media optimization.

## Features

- **Unified Interface**: Single API for publishing to Instagram, Facebook, Twitter, LinkedIn, TikTok, YouTube, and Pinterest
- **Platform-Specific Adapters**: Each platform has its own adapter handling platform-specific requirements
- **Content Formatting**: Automatic content adaptation for each platform's requirements (character limits, hashtag placement, etc.)
- **Media Optimization**: Image resizing, compression, and format conversion
- **Rate Limiting**: Per-platform rate limiting to avoid API throttling
- **Retry Logic**: Exponential backoff retry for transient failures
- **Error Handling**: Comprehensive error handling with detailed error messages

## Architecture

```
publishing/
├── interfaces/
│   └── platform-publisher.interface.ts    # Core interfaces
├── adapters/
│   ├── base-platform-publisher.adapter.ts # Base adapter with common functionality
│   ├── instagram-publisher.adapter.ts     # Instagram-specific implementation
│   ├── facebook-publisher.adapter.ts      # Facebook-specific implementation
│   ├── twitter-publisher.adapter.ts       # Twitter-specific implementation
│   ├── linkedin-publisher.adapter.ts      # LinkedIn-specific implementation
│   ├── tiktok-publisher.adapter.ts        # TikTok-specific implementation
│   ├── youtube-publisher.adapter.ts       # YouTube-specific implementation
│   ├── pinterest-publisher.adapter.ts     # Pinterest-specific implementation
│   └── platform-publisher.factory.ts      # Factory for creating adapters
├── utils/
│   ├── media-optimizer.ts                 # Image/video optimization
│   ├── rate-limiter.ts                    # Rate limiting logic
│   ├── retry-handler.ts                   # Retry with exponential backoff
│   └── content-formatter.ts               # Content formatting utilities
└── publishing.module.ts                   # NestJS module
```

## Usage

### Basic Publishing

```typescript
import { PlatformPublisherFactory } from './publishing/adapters/platform-publisher.factory';
import { Platform } from '@prisma/client';

@Injectable()
export class PostService {
  constructor(
    private readonly publisherFactory: PlatformPublisherFactory,
  ) {}

  async publishPost(platform: Platform, accountId: string, accessToken: string) {
    // Get the appropriate publisher
    const publisher = this.publisherFactory.getPublisher(platform);

    // Prepare content
    const content = {
      text: 'Check out our new product! #innovation #tech',
      media: [
        {
          url: 'https://example.com/image.jpg',
          type: 'image' as const,
          altText: 'Product photo',
        },
      ],
      hashtags: ['innovation', 'tech'],
      mentions: ['techcompany'],
      link: 'https://example.com/product',
    };

    // Publish
    const result = await publisher.publishPost(accountId, accessToken, content);

    if (result.success) {
      console.log(`Published to ${platform}: ${result.platformPostId}`);
    } else {
      console.error(`Failed to publish: ${result.error}`);
    }

    return result;
  }
}
```

### Scheduling Posts

```typescript
async schedulePost(
  platform: Platform,
  accountId: string,
  accessToken: string,
  scheduledTime: Date,
) {
  const publisher = this.publisherFactory.getPublisher(platform);

  const content = {
    text: 'Scheduled post content',
    media: [],
    hashtags: ['scheduled'],
    mentions: [],
  };

  const result = await publisher.schedulePost(
    accountId,
    accessToken,
    content,
    scheduledTime,
  );

  return result;
}
```

### Multi-Platform Publishing

```typescript
async publishToMultiplePlatforms(
  platforms: Platform[],
  accounts: Map<Platform, { accountId: string; accessToken: string }>,
  content: PublishContent,
) {
  const results = await Promise.all(
    platforms.map(async (platform) => {
      const publisher = this.publisherFactory.getPublisher(platform);
      const account = accounts.get(platform);

      if (!account) {
        return {
          platform,
          success: false,
          error: 'No account configured',
        };
      }

      const result = await publisher.publishPost(
        account.accountId,
        account.accessToken,
        content,
      );

      return {
        platform,
        ...result,
      };
    }),
  );

  return results;
}
```

### Content Validation

```typescript
async validateContent(platform: Platform, content: PublishContent) {
  const publisher = this.publisherFactory.getPublisher(platform);

  // Get platform requirements
  const requirements = publisher.getRequirements();
  console.log(`Platform: ${platform}`);
  console.log(`Max text length: ${requirements.maxTextLength}`);
  console.log(`Max hashtags: ${requirements.maxHashtags}`);
  console.log(`Supported media types: ${requirements.supportedMediaTypes.join(', ')}`);

  // Validate content
  const errors = await publisher.validateContent(content);

  if (errors.length > 0) {
    console.error('Validation errors:', errors);
    return false;
  }

  return true;
}
```

### Media Optimization

```typescript
import { MediaOptimizer } from './publishing/utils/media-optimizer';

@Injectable()
export class MediaService {
  constructor(private readonly mediaOptimizer: MediaOptimizer) {}

  async optimizeForInstagram(imageBuffer: Buffer) {
    // Instagram requirements
    const optimized = await this.mediaOptimizer.optimizeImage(imageBuffer, {
      maxWidth: 1080,
      maxHeight: 1350,
      quality: 85,
      format: 'jpeg',
      maxFileSize: 8 * 1024 * 1024, // 8MB
    });

    return optimized;
  }

  async cropToAspectRatio(imageBuffer: Buffer, ratio: number) {
    const cropped = await this.mediaOptimizer.cropToAspectRatio(
      imageBuffer,
      ratio,
    );

    return cropped;
  }
}
```

### Content Formatting

```typescript
import { ContentFormatter } from './publishing/utils/content-formatter';

@Injectable()
export class ContentService {
  constructor(private readonly contentFormatter: ContentFormatter) {}

  async formatForPlatform(content: PublishContent, platform: Platform) {
    // Optimize content for specific platform
    const optimized = this.contentFormatter.optimizeForPlatform(
      content,
      platform,
    );

    return optimized;
  }

  async createThread(longText: string, platform: Platform) {
    const maxLength = platform === Platform.TWITTER ? 280 : 2200;

    // Split into multiple posts
    const posts = this.contentFormatter.splitIntoThread(longText, maxLength);

    // Add numbering
    const numberedPosts = this.contentFormatter.addThreadNumbering(posts);

    return numberedPosts;
  }
}
```

### Rate Limiting

```typescript
import { RateLimiter } from './publishing/utils/rate-limiter';

@Injectable()
export class PublishingService {
  constructor(private readonly rateLimiter: RateLimiter) {}

  async checkRateLimit(platform: Platform, accountId: string) {
    const config = {
      maxRequests: 200,
      windowMs: 60 * 60 * 1000, // 1 hour
      keyPrefix: `${platform}:publish`,
    };

    const result = await this.rateLimiter.checkLimit(accountId, config);

    if (!result.allowed) {
      console.log(`Rate limit exceeded. Retry after ${result.retryAfter}s`);
      return false;
    }

    console.log(`Remaining requests: ${result.remaining}`);
    return true;
  }
}
```

## Platform Requirements

### Instagram
- Max text: 2,200 characters
- Max hashtags: 30
- Max media: 10 (carousel)
- Supported media: image, video
- Scheduling: ✅ Supported

### Facebook
- Max text: 63,206 characters
- Max hashtags: 50
- Max media: 10
- Supported media: image, video, gif
- Scheduling: ✅ Supported

### Twitter
- Max text: 280 characters
- Max hashtags: 10
- Max media: 4
- Supported media: image, video, gif
- Scheduling: ❌ Not supported (use our scheduler)

### LinkedIn
- Max text: 3,000 characters
- Max hashtags: 30
- Max media: 9
- Supported media: image, video
- Scheduling: ❌ Not supported (use our scheduler)

### TikTok
- Max text: 2,200 characters
- Max hashtags: 30
- Max media: 1 (video only)
- Supported media: video
- Scheduling: ❌ Not supported (use our scheduler)

### YouTube
- Max text: 5,000 characters (description)
- Max hashtags: 15
- Max media: 1 (video only)
- Supported media: video
- Scheduling: ✅ Supported

### Pinterest
- Max text: 500 characters
- Max hashtags: 20
- Max media: 1
- Supported media: image, video
- Scheduling: ✅ Supported
- **Requires destination link**

## Error Handling

All publishers implement comprehensive error handling:

```typescript
try {
  const result = await publisher.publishPost(accountId, accessToken, content);

  if (!result.success) {
    // Handle specific errors
    if (result.error?.includes('rate limit')) {
      // Wait and retry
    } else if (result.error?.includes('invalid token')) {
      // Refresh token
    } else {
      // Log error
    }
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
}
```

## Testing

```typescript
import { Test } from '@nestjs/testing';
import { PlatformPublisherFactory } from './adapters/platform-publisher.factory';
import { PublishingModule } from './publishing.module';

describe('Platform Publishing', () => {
  let factory: PlatformPublisherFactory;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [PublishingModule],
    }).compile();

    factory = module.get<PlatformPublisherFactory>(PlatformPublisherFactory);
  });

  it('should get Instagram publisher', () => {
    const publisher = factory.getPublisher(Platform.INSTAGRAM);
    expect(publisher).toBeDefined();
    expect(publisher.platform).toBe(Platform.INSTAGRAM);
  });

  it('should validate content', async () => {
    const publisher = factory.getPublisher(Platform.INSTAGRAM);
    const content = {
      text: 'Test post',
      media: [],
      hashtags: [],
      mentions: [],
    };

    const errors = await publisher.validateContent(content);
    expect(errors).toHaveLength(0);
  });
});
```

## Configuration

Add to your `.env` file:

```env
# Redis (for rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379

# Platform API credentials (example for Instagram)
INSTAGRAM_CLIENT_ID=your_client_id
INSTAGRAM_CLIENT_SECRET=your_client_secret
INSTAGRAM_REDIRECT_URI=https://your-app.com/auth/instagram/callback
```

## Best Practices

1. **Always validate content** before publishing
2. **Check rate limits** before making API calls
3. **Use retry logic** for transient failures
4. **Optimize media** before uploading
5. **Format content** for each platform
6. **Handle errors gracefully**
7. **Log all publishing attempts** for debugging
8. **Test with platform-specific requirements**

## Future Enhancements

- [ ] Support for Instagram Stories and Reels
- [ ] Support for Twitter Threads
- [ ] Support for LinkedIn Articles
- [ ] Video transcoding and optimization
- [ ] Automatic alt text generation for images
- [ ] Content A/B testing
- [ ] Performance analytics integration
