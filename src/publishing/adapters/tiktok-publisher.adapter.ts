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
 * TikTok publishing adapter using TikTok API
 */
@Injectable()
export class TikTokPublisher extends BasePlatformPublisher {
  readonly platform = Platform.TIKTOK;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  getRequirements(): PlatformRequirements {
    return {
      maxTextLength: 2200,
      maxHashtags: 30,
      maxMentions: 20,
      maxMediaCount: 1, // TikTok is single video
      supportedMediaTypes: ['video'],
      maxImageSize: 0, // No images
      maxVideoSize: 287 * 1024 * 1024, // 287MB
      maxVideoDuration: 600, // 10 minutes
      imageFormats: [],
      videoFormats: ['mp4', 'mov', 'webm'],
      aspectRatios: {
        min: 0.5625, // 9:16 portrait
        max: 1.7778, // 16:9 landscape
      },
      requiresLink: false,
      supportsFirstComment: false,
      supportsScheduling: false,
    };
  }

  protected getRateLimitConfig(): RateLimitConfig {
    return {
      maxRequests: 100,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      keyPrefix: 'tiktok:publish',
    };
  }

  protected async applyPlatformSpecificFormatting(
    content: PublishContent,
  ): Promise<PublishContent> {
    const formatted = { ...content };

    // TikTok hashtags should have # prefix
    formatted.hashtags = formatted.hashtags.map((tag) =>
      tag.startsWith('#') ? tag : `#${tag}`,
    );

    // Add hashtags to caption
    if (formatted.hashtags.length > 0) {
      formatted.text = `${formatted.text} ${formatted.hashtags.join(' ')}`;
    }

    return formatted;
  }

  protected async performPublish(
    accountId: string,
    accessToken: string,
    content: PublishContent,
  ): Promise<PublishResult> {
    try {
      if (content.media.length === 0 || content.media[0].type !== 'video') {
        throw new Error('TikTok requires a video');
      }

      const video = content.media[0];

      // TikTok requires a multi-step upload process
      // 1. Initialize upload
      const initResponse = await this.makeAuthenticatedRequest<any>(
        'https://open-api.tiktok.com/share/video/upload/',
        accessToken,
        'POST',
        {
          video: {
            video_url: video.url,
          },
        },
      );

      // 2. Create post
      const postResponse = await this.makeAuthenticatedRequest<any>(
        'https://open-api.tiktok.com/share/video/create/',
        accessToken,
        'POST',
        {
          video_id: initResponse.data.video_id,
          text: content.text,
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
      );

      return {
        success: true,
        platformPostId: postResponse.data.share_id,
        url: `https://www.tiktok.com/@user/video/${postResponse.data.share_id}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to publish to TikTok: ${errorMessage}`);
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
    throw new Error('TikTok does not support native scheduling via API');
  }

  protected async performDelete(
    accountId: string,
    accessToken: string,
    platformPostId: string,
  ): Promise<void> {
    await this.makeAuthenticatedRequest(
      `https://open-api.tiktok.com/share/video/delete/`,
      accessToken,
      'POST',
      {
        video_id: platformPostId,
      },
    );
  }
}
