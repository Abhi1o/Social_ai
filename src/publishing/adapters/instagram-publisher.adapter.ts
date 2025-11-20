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
 * Instagram publishing adapter using Instagram Graph API
 */
@Injectable()
export class InstagramPublisher extends BasePlatformPublisher {
  readonly platform = Platform.INSTAGRAM;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  getRequirements(): PlatformRequirements {
    return {
      maxTextLength: 2200,
      maxHashtags: 30,
      maxMentions: 20,
      maxMediaCount: 10, // carousel
      supportedMediaTypes: ['image', 'video'],
      maxImageSize: 8 * 1024 * 1024, // 8MB
      maxVideoSize: 100 * 1024 * 1024, // 100MB
      maxVideoDuration: 60, // 60 seconds for feed, 90 for reels
      imageFormats: ['jpg', 'jpeg', 'png'],
      videoFormats: ['mp4', 'mov'],
      aspectRatios: {
        min: 0.8, // 4:5 portrait
        max: 1.91, // 1.91:1 landscape
      },
      requiresLink: false,
      supportsFirstComment: true,
      supportsScheduling: true,
    };
  }

  protected getRateLimitConfig(): RateLimitConfig {
    return {
      maxRequests: 200, // Instagram Graph API limit
      windowMs: 60 * 60 * 1000, // 1 hour
      keyPrefix: 'instagram:publish',
    };
  }

  protected async applyPlatformSpecificFormatting(
    content: PublishContent,
  ): Promise<PublishContent> {
    const formatted = { ...content };

    // Instagram hashtags should be in the caption or first comment
    // Format hashtags with # prefix if not already present
    formatted.hashtags = formatted.hashtags.map((tag) =>
      tag.startsWith('#') ? tag : `#${tag}`,
    );

    // Format mentions with @ prefix
    formatted.mentions = formatted.mentions.map((mention) =>
      mention.startsWith('@') ? mention : `@${mention}`,
    );

    // Combine text with hashtags for Instagram
    // (hashtags are part of the caption, not separate)
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
      // Instagram requires a two-step process:
      // 1. Create media container
      // 2. Publish the container

      let containerId: string;

      if (content.media.length === 0) {
        throw new Error('Instagram requires at least one media item');
      }

      if (content.media.length === 1) {
        // Single media post
        containerId = await this.createSingleMediaContainer(
          accountId,
          accessToken,
          content,
        );
      } else {
        // Carousel post
        containerId = await this.createCarouselContainer(
          accountId,
          accessToken,
          content,
        );
      }

      // Publish the container
      const publishData = await this.makeAuthenticatedRequest<any>(
        `https://graph.instagram.com/v18.0/${accountId}/media_publish`,
        accessToken,
        'POST',
        {
          creation_id: containerId,
        },
      );

      // Post first comment if provided
      if (content.firstComment) {
        await this.postComment(
          publishData.id,
          accessToken,
          content.firstComment,
        );
      }

      return {
        success: true,
        platformPostId: publishData.id,
        url: `https://www.instagram.com/p/${publishData.id}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to publish to Instagram: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        publishedAt: new Date(),
      };
    }
  }

  private async createSingleMediaContainer(
    accountId: string,
    accessToken: string,
    content: PublishContent,
  ): Promise<string> {
    const media = content.media[0];
    const isVideo = media.type === 'video';

    const params: any = {
      caption: content.text,
      access_token: accessToken,
    };

    if (isVideo) {
      params.media_type = 'VIDEO';
      params.video_url = media.url;
      if (media.thumbnailUrl) {
        params.thumb_offset = 0; // Use first frame as thumbnail
      }
    } else {
      params.image_url = media.url;
    }

    const response = await this.makeAuthenticatedRequest<any>(
      `https://graph.instagram.com/v18.0/${accountId}/media`,
      accessToken,
      'POST',
      params,
    );

    return response.id;
  }

  private async createCarouselContainer(
    accountId: string,
    accessToken: string,
    content: PublishContent,
  ): Promise<string> {
    // Create individual media containers
    const childrenIds: string[] = [];

    for (const media of content.media) {
      const isVideo = media.type === 'video';
      const params: any = {
        access_token: accessToken,
      };

      if (isVideo) {
        params.media_type = 'VIDEO';
        params.video_url = media.url;
      } else {
        params.image_url = media.url;
      }

      const response = await this.makeAuthenticatedRequest<any>(
        `https://graph.instagram.com/v18.0/${accountId}/media`,
        accessToken,
        'POST',
        params,
      );

      childrenIds.push(response.id);
    }

    // Create carousel container
    const carouselResponse = await this.makeAuthenticatedRequest<any>(
      `https://graph.instagram.com/v18.0/${accountId}/media`,
      accessToken,
      'POST',
      {
        media_type: 'CAROUSEL',
        children: childrenIds.join(','),
        caption: content.text,
        access_token: accessToken,
      },
    );

    return carouselResponse.id;
  }

  private async postComment(
    mediaId: string,
    accessToken: string,
    comment: string,
  ): Promise<void> {
    await this.makeAuthenticatedRequest(
      `https://graph.instagram.com/v18.0/${mediaId}/comments`,
      accessToken,
      'POST',
      {
        message: comment,
      },
    );
  }

  protected async performSchedule(
    accountId: string,
    accessToken: string,
    content: PublishContent,
    scheduledTime: Date,
  ): Promise<PublishResult> {
    try {
      // Instagram Content Publishing API supports scheduling
      const publishTime = Math.floor(scheduledTime.getTime() / 1000);

      let containerId: string;

      if (content.media.length === 1) {
        containerId = await this.createSingleMediaContainer(
          accountId,
          accessToken,
          content,
        );
      } else {
        containerId = await this.createCarouselContainer(
          accountId,
          accessToken,
          content,
        );
      }

      // Schedule the container
      const scheduleData = await this.makeAuthenticatedRequest<any>(
        `https://graph.instagram.com/v18.0/${accountId}/media_publish`,
        accessToken,
        'POST',
        {
          creation_id: containerId,
          published: false,
          scheduled_publish_time: publishTime,
        },
      );

      return {
        success: true,
        platformPostId: scheduleData.id,
        publishedAt: scheduledTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to schedule Instagram post: ${errorMessage}`);
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
      `https://graph.instagram.com/v18.0/${platformPostId}`,
      accessToken,
      'DELETE',
    );
  }
}
