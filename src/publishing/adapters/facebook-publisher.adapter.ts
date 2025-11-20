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
 * Facebook publishing adapter using Facebook Graph API
 */
@Injectable()
export class FacebookPublisher extends BasePlatformPublisher {
  readonly platform = Platform.FACEBOOK;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  getRequirements(): PlatformRequirements {
    return {
      maxTextLength: 63206,
      maxHashtags: 50,
      maxMentions: 50,
      maxMediaCount: 10,
      supportedMediaTypes: ['image', 'video', 'gif'],
      maxImageSize: 4 * 1024 * 1024, // 4MB
      maxVideoSize: 1024 * 1024 * 1024, // 1GB
      maxVideoDuration: 240 * 60, // 240 minutes
      imageFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp'],
      videoFormats: ['mp4', 'mov', 'avi'],
      aspectRatios: {
        min: 0.5,
        max: 2.0,
      },
      requiresLink: false,
      supportsFirstComment: false,
      supportsScheduling: true,
    };
  }

  protected getRateLimitConfig(): RateLimitConfig {
    return {
      maxRequests: 200,
      windowMs: 60 * 60 * 1000, // 1 hour
      keyPrefix: 'facebook:publish',
    };
  }

  protected async performPublish(
    accountId: string,
    accessToken: string,
    content: PublishContent,
  ): Promise<PublishResult> {
    try {
      const endpoint = `https://graph.facebook.com/v18.0/${accountId}/feed`;

      const params: any = {
        message: content.text,
      };

      // Add link if provided
      if (content.link) {
        params.link = content.link;
      }

      // Handle media
      if (content.media.length > 0) {
        if (content.media.length === 1) {
          // Single media post
          const media = content.media[0];
          if (media.type === 'video') {
            return this.publishVideo(accountId, accessToken, content);
          } else {
            params.url = media.url;
          }
        } else {
          // Multiple photos
          return this.publishMultiplePhotos(accountId, accessToken, content);
        }
      }

      const response = await this.makeAuthenticatedRequest<any>(
        endpoint,
        accessToken,
        'POST',
        params,
      );

      return {
        success: true,
        platformPostId: response.id,
        url: `https://www.facebook.com/${response.id}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to publish to Facebook: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        publishedAt: new Date(),
      };
    }
  }

  private async publishVideo(
    accountId: string,
    accessToken: string,
    content: PublishContent,
  ): Promise<PublishResult> {
    const video = content.media[0];

    const response = await this.makeAuthenticatedRequest<any>(
      `https://graph.facebook.com/v18.0/${accountId}/videos`,
      accessToken,
      'POST',
      {
        description: content.text,
        file_url: video.url,
      },
    );

    return {
      success: true,
      platformPostId: response.id,
      url: `https://www.facebook.com/${response.id}`,
      publishedAt: new Date(),
    };
  }

  private async publishMultiplePhotos(
    accountId: string,
    accessToken: string,
    content: PublishContent,
  ): Promise<PublishResult> {
    // Upload photos first
    const photoIds: string[] = [];

    for (const media of content.media) {
      if (media.type === 'image') {
        const photoResponse = await this.makeAuthenticatedRequest<any>(
          `https://graph.facebook.com/v18.0/${accountId}/photos`,
          accessToken,
          'POST',
          {
            url: media.url,
            published: false,
          },
        );
        photoIds.push(photoResponse.id);
      }
    }

    // Create album post with photos
    const attachedMedia = photoIds.map((id) => ({ media_fbid: id }));

    const response = await this.makeAuthenticatedRequest<any>(
      `https://graph.facebook.com/v18.0/${accountId}/feed`,
      accessToken,
      'POST',
      {
        message: content.text,
        attached_media: JSON.stringify(attachedMedia),
      },
    );

    return {
      success: true,
      platformPostId: response.id,
      url: `https://www.facebook.com/${response.id}`,
      publishedAt: new Date(),
    };
  }

  protected async performSchedule(
    accountId: string,
    accessToken: string,
    content: PublishContent,
    scheduledTime: Date,
  ): Promise<PublishResult> {
    try {
      const publishTime = Math.floor(scheduledTime.getTime() / 1000);

      const params: any = {
        message: content.text,
        published: false,
        scheduled_publish_time: publishTime,
      };

      if (content.link) {
        params.link = content.link;
      }

      if (content.media.length > 0 && content.media[0].type === 'image') {
        params.url = content.media[0].url;
      }

      const response = await this.makeAuthenticatedRequest<any>(
        `https://graph.facebook.com/v18.0/${accountId}/feed`,
        accessToken,
        'POST',
        params,
      );

      return {
        success: true,
        platformPostId: response.id,
        publishedAt: scheduledTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to schedule Facebook post: ${errorMessage}`);
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
      `https://graph.facebook.com/v18.0/${platformPostId}`,
      accessToken,
      'DELETE',
    );
  }
}
