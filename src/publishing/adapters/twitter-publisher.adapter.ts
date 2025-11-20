import { Injectable } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { BasePlatformPublisher } from './base-platform-publisher.adapter';
import {
  PublishContent,
  PublishResult,
  PlatformRequirements,
} from '../interfaces/platform-publisher.interface';
import { RateLimiter, RateLimitConfig } from '../utils/rate-limiter';

/**
 * Twitter/X publishing adapter using Twitter API v2
 */
@Injectable()
export class TwitterPublisher extends BasePlatformPublisher {
  readonly platform = Platform.TWITTER;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  getRequirements(): PlatformRequirements {
    return {
      maxTextLength: 280, // 280 for regular, 25000 for premium
      maxHashtags: 10,
      maxMentions: 10,
      maxMediaCount: 4,
      supportedMediaTypes: ['image', 'video', 'gif'],
      maxImageSize: 5 * 1024 * 1024, // 5MB
      maxVideoSize: 512 * 1024 * 1024, // 512MB
      maxVideoDuration: 140, // 140 seconds
      imageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      videoFormats: ['mp4', 'mov'],
      aspectRatios: {
        min: 0.5,
        max: 2.0,
      },
      requiresLink: false,
      supportsFirstComment: false,
      supportsScheduling: false, // Twitter API doesn't support native scheduling
    };
  }

  protected getRateLimitConfig(): RateLimitConfig {
    return {
      maxRequests: 300, // Twitter API v2 limit
      windowMs: 15 * 60 * 1000, // 15 minutes
      keyPrefix: 'twitter:publish',
    };
  }

  protected async applyPlatformSpecificFormatting(
    content: PublishContent,
  ): Promise<PublishContent> {
    const formatted = { ...content };

    // Twitter hashtags and mentions are inline in the text
    // No special formatting needed, but ensure they're properly formatted
    formatted.hashtags = formatted.hashtags.map((tag) =>
      tag.startsWith('#') ? tag : `#${tag}`,
    );

    formatted.mentions = formatted.mentions.map((mention) =>
      mention.startsWith('@') ? mention : `@${mention}`,
    );

    return formatted;
  }

  protected async performPublish(
    accountId: string,
    accessToken: string,
    content: PublishContent,
  ): Promise<PublishResult> {
    try {
      const tweetData: any = {
        text: content.text,
      };

      // Upload media if present
      if (content.media.length > 0) {
        const mediaIds = await this.uploadMedia(accessToken, content.media);
        tweetData.media = {
          media_ids: mediaIds,
        };
      }

      const response = await this.makeAuthenticatedRequest<any>(
        'https://api.twitter.com/2/tweets',
        accessToken,
        'POST',
        tweetData,
      );

      return {
        success: true,
        platformPostId: response.data.id,
        url: `https://twitter.com/i/web/status/${response.data.id}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to publish to Twitter: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        publishedAt: new Date(),
      };
    }
  }

  private async uploadMedia(
    accessToken: string,
    media: any[],
  ): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const item of media) {
      // Twitter requires media to be uploaded via v1.1 API
      const uploadResponse = await this.makeAuthenticatedRequest<any>(
        'https://upload.twitter.com/1.1/media/upload.json',
        accessToken,
        'POST',
        {
          media_url: item.url,
          media_category: item.type === 'video' ? 'tweet_video' : 'tweet_image',
        },
      );

      mediaIds.push(uploadResponse.media_id_string);
    }

    return mediaIds;
  }

  protected async performSchedule(
    accountId: string,
    accessToken: string,
    content: PublishContent,
    scheduledTime: Date,
  ): Promise<PublishResult> {
    // Twitter API v2 doesn't support native scheduling
    // This would need to be handled by our own scheduling system
    throw new Error('Twitter does not support native scheduling via API');
  }

  protected async performDelete(
    accountId: string,
    accessToken: string,
    platformPostId: string,
  ): Promise<void> {
    await this.makeAuthenticatedRequest(
      `https://api.twitter.com/2/tweets/${platformPostId}`,
      accessToken,
      'DELETE',
    );
  }
}
