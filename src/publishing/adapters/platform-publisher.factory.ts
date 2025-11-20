import { Injectable, Logger } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { IPlatformPublisher } from '../interfaces/platform-publisher.interface';
import { InstagramPublisher } from './instagram-publisher.adapter';
import { FacebookPublisher } from './facebook-publisher.adapter';
import { TwitterPublisher } from './twitter-publisher.adapter';
import { LinkedInPublisher } from './linkedin-publisher.adapter';
import { TikTokPublisher } from './tiktok-publisher.adapter';
import { YouTubePublisher } from './youtube-publisher.adapter';
import { PinterestPublisher } from './pinterest-publisher.adapter';
import { RateLimiter } from '../utils/rate-limiter';

/**
 * Factory for creating platform-specific publisher adapters
 */
@Injectable()
export class PlatformPublisherFactory {
  private readonly logger = new Logger(PlatformPublisherFactory.name);
  private readonly publishers: Map<Platform, IPlatformPublisher>;

  constructor(
    private readonly rateLimiter: RateLimiter,
    private readonly instagramPublisher: InstagramPublisher,
    private readonly facebookPublisher: FacebookPublisher,
    private readonly twitterPublisher: TwitterPublisher,
    private readonly linkedInPublisher: LinkedInPublisher,
    private readonly tiktokPublisher: TikTokPublisher,
    private readonly youtubePublisher: YouTubePublisher,
    private readonly pinterestPublisher: PinterestPublisher,
  ) {
    // Initialize publisher map
    this.publishers = new Map<Platform, IPlatformPublisher>([
      [Platform.INSTAGRAM, instagramPublisher],
      [Platform.FACEBOOK, facebookPublisher],
      [Platform.TWITTER, twitterPublisher],
      [Platform.LINKEDIN, linkedInPublisher],
      [Platform.TIKTOK, tiktokPublisher],
      [Platform.YOUTUBE, youtubePublisher],
      [Platform.PINTEREST, pinterestPublisher],
    ]);

    this.logger.log(`Initialized ${this.publishers.size} platform publishers`);
  }

  /**
   * Get publisher for a specific platform
   */
  getPublisher(platform: Platform): IPlatformPublisher {
    const publisher = this.publishers.get(platform);

    if (!publisher) {
      throw new Error(`No publisher found for platform: ${platform}`);
    }

    return publisher;
  }

  /**
   * Get all available publishers
   */
  getAllPublishers(): IPlatformPublisher[] {
    return Array.from(this.publishers.values());
  }

  /**
   * Get all supported platforms
   */
  getSupportedPlatforms(): Platform[] {
    return Array.from(this.publishers.keys());
  }

  /**
   * Check if a platform is supported
   */
  isPlatformSupported(platform: Platform): boolean {
    return this.publishers.has(platform);
  }

  /**
   * Get requirements for all platforms
   */
  getAllRequirements(): Map<Platform, any> {
    const requirements = new Map();

    for (const [platform, publisher] of this.publishers.entries()) {
      requirements.set(platform, publisher.getRequirements());
    }

    return requirements;
  }
}
