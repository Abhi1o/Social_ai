import { Injectable } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { IPlatformAdapter } from '../interfaces/platform-adapter.interface';
import { InstagramAdapter } from './instagram.adapter';
import { FacebookAdapter } from './facebook.adapter';
import { TwitterAdapter } from './twitter.adapter';
import { LinkedInAdapter } from './linkedin.adapter';
import { TikTokAdapter } from './tiktok.adapter';

/**
 * Factory for creating platform-specific adapters
 */
@Injectable()
export class PlatformAdapterFactory {
  constructor(
    private readonly instagramAdapter: InstagramAdapter,
    private readonly facebookAdapter: FacebookAdapter,
    private readonly twitterAdapter: TwitterAdapter,
    private readonly linkedInAdapter: LinkedInAdapter,
    private readonly tiktokAdapter: TikTokAdapter,
  ) {}

  /**
   * Get the appropriate adapter for a platform
   * @param platform - The social media platform
   * @returns Platform-specific adapter
   */
  getAdapter(platform: Platform): IPlatformAdapter {
    switch (platform) {
      case Platform.INSTAGRAM:
        return this.instagramAdapter;
      case Platform.FACEBOOK:
        return this.facebookAdapter;
      case Platform.TWITTER:
        return this.twitterAdapter;
      case Platform.LINKEDIN:
        return this.linkedInAdapter;
      case Platform.TIKTOK:
        return this.tiktokAdapter;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Get all available platform adapters
   */
  getAllAdapters(): IPlatformAdapter[] {
    return [
      this.instagramAdapter,
      this.facebookAdapter,
      this.twitterAdapter,
      this.linkedInAdapter,
      this.tiktokAdapter,
    ];
  }

  /**
   * Check if a platform is supported
   */
  isPlatformSupported(platform: Platform): boolean {
    try {
      this.getAdapter(platform);
      return true;
    } catch {
      return false;
    }
  }
}
