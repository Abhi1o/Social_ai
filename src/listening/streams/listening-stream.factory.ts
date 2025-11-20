import { Injectable, Logger } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { IListeningStream } from '../interfaces/listening-stream.interface';
import { TwitterListeningStream } from './twitter-listening-stream';
import { InstagramListeningStream } from './instagram-listening-stream';
import { FacebookListeningStream } from './facebook-listening-stream';
import { LinkedInListeningStream } from './linkedin-listening-stream';
import { TikTokListeningStream } from './tiktok-listening-stream';
import { RedditListeningStream } from './reddit-listening-stream';
import { BaseListeningStream } from './base-listening-stream';

/**
 * Placeholder stream for platforms not yet implemented
 */
class PlaceholderListeningStream extends BaseListeningStream {
  constructor(platform: Platform) {
    super(platform, 300000);
  }

  protected async fetchMentions(): Promise<void> {
    this.logger.debug(`Placeholder stream for ${this.platform} - no actual fetching`);
  }
}

/**
 * Factory for creating platform-specific listening streams
 */
@Injectable()
export class ListeningStreamFactory {
  private readonly logger = new Logger(ListeningStreamFactory.name);

  /**
   * Create a listening stream for a specific platform
   */
  createStream(platform: Platform): IListeningStream {
    this.logger.debug(`Creating listening stream for platform: ${platform}`);

    switch (platform) {
      case Platform.TWITTER:
        return new TwitterListeningStream();
      
      case Platform.INSTAGRAM:
        return new InstagramListeningStream();
      
      case Platform.FACEBOOK:
        return new FacebookListeningStream();
      
      case Platform.LINKEDIN:
        return new LinkedInListeningStream();
      
      case Platform.TIKTOK:
        return new TikTokListeningStream();
      
      case Platform.REDDIT:
        return new RedditListeningStream();
      
      case Platform.YOUTUBE:
        return new PlaceholderListeningStream(Platform.YOUTUBE);
      
      case Platform.PINTEREST:
        return new PlaceholderListeningStream(Platform.PINTEREST);
      
      case Platform.THREADS:
        return new PlaceholderListeningStream(Platform.THREADS);
      
      default:
        this.logger.warn(`No stream implementation for platform: ${platform}, using placeholder`);
        return new PlaceholderListeningStream(platform);
    }
  }

  /**
   * Create streams for multiple platforms
   */
  createStreams(platforms: Platform[]): Map<Platform, IListeningStream> {
    const streams = new Map<Platform, IListeningStream>();

    for (const platform of platforms) {
      streams.set(platform, this.createStream(platform));
    }

    return streams;
  }
}
