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
 * Pinterest publishing adapter using Pinterest API
 */
@Injectable()
export class PinterestPublisher extends BasePlatformPublisher {
  readonly platform = Platform.PINTEREST;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  getRequirements(): PlatformRequirements {
    return {
      maxTextLength: 500,
      maxHashtags: 20,
      maxMentions: 10,
      maxMediaCount: 1, // Single image or video
      supportedMediaTypes: ['image', 'video'],
      maxImageSize: 32 * 1024 * 1024, // 32MB
      maxVideoSize: 2 * 1024 * 1024 * 1024, // 2GB
      maxVideoDuration: 900, // 15 minutes
      imageFormats: ['jpg', 'jpeg', 'png'],
      videoFormats: ['mp4', 'mov', 'm4v'],
      aspectRatios: {
        min: 0.5, // 1:2 (tall)
        max: 1.91, // 1.91:1 (wide)
      },
      requiresLink: true, // Pinterest requires a destination link
      supportsFirstComment: false,
      supportsScheduling: true,
    };
  }

  protected getRateLimitConfig(): RateLimitConfig {
    return {
      maxRequests: 200,
      windowMs: 60 * 60 * 1000, // 1 hour
      keyPrefix: 'pinterest:publish',
    };
  }

  protected async applyPlatformSpecificFormatting(
    content: PublishContent,
  ): Promise<PublishContent> {
    const formatted = { ...content };

    // Pinterest hashtags should have # prefix
    formatted.hashtags = formatted.hashtags.map((tag) =>
      tag.startsWith('#') ? tag : `#${tag}`,
    );

    // Add hashtags to description
    if (formatted.hashtags.length > 0) {
      formatted.text = `${formatted.text}\n\n${formatted.hashtags.join(' ')}`;
    }

    return formatted;
  }

  protected async performPublish(
    accountId: string,
    accessToken: string,
    content: PublishContent,
  ): Promise<PublishResult> {
    try {
      if (content.media.length === 0) {
        throw new Error('Pinterest requires at least one media item');
      }

      if (!content.link) {
        throw new Error('Pinterest requires a destination link');
      }

      const media = content.media[0];
      const isVideo = media.type === 'video';

      const pinData: any = {
        board_id: accountId, // In Pinterest, we publish to boards
        description: content.text,
        link: content.link,
      };

      if (isVideo) {
        pinData.media_source = {
          source_type: 'video_url',
          url: media.url,
        };
      } else {
        pinData.media_source = {
          source_type: 'image_url',
          url: media.url,
        };
      }

      // Add alt text if available
      if (media.altText) {
        pinData.alt_text = media.altText;
      }

      const response = await this.makeAuthenticatedRequest<any>(
        'https://api.pinterest.com/v5/pins',
        accessToken,
        'POST',
        pinData,
      );

      return {
        success: true,
        platformPostId: response.id,
        url: `https://www.pinterest.com/pin/${response.id}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to publish to Pinterest: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        publishedAt: new Date(),
      };
    }
  }

  protected async performSchedule(
    accountId: string,
    accessToken: string,
    content: PublishContent,
    scheduledTime: Date,
  ): Promise<PublishResult> {
    try {
      if (content.media.length === 0) {
        throw new Error('Pinterest requires at least one media item');
      }

      if (!content.link) {
        throw new Error('Pinterest requires a destination link');
      }

      const media = content.media[0];
      const publishTime = Math.floor(scheduledTime.getTime() / 1000);

      const pinData: any = {
        board_id: accountId,
        description: content.text,
        link: content.link,
        publish_time: publishTime,
        media_source: {
          source_type: media.type === 'video' ? 'video_url' : 'image_url',
          url: media.url,
        },
      };

      if (media.altText) {
        pinData.alt_text = media.altText;
      }

      const response = await this.makeAuthenticatedRequest<any>(
        'https://api.pinterest.com/v5/pins',
        accessToken,
        'POST',
        pinData,
      );

      return {
        success: true,
        platformPostId: response.id,
        publishedAt: scheduledTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to schedule Pinterest pin: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        publishedAt: scheduledTime,
      };
    }
  }

  protected async performDelete(
    accountId: string,
    accessToken: string,
    platformPostId: string,
  ): Promise<void> {
    await this.makeAuthenticatedRequest(
      `https://api.pinterest.com/v5/pins/${platformPostId}`,
      accessToken,
      'DELETE',
    );
  }
}
