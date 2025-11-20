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
 * YouTube publishing adapter using YouTube Data API v3
 */
@Injectable()
export class YouTubePublisher extends BasePlatformPublisher {
  readonly platform = Platform.YOUTUBE;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  getRequirements(): PlatformRequirements {
    return {
      maxTextLength: 5000, // Description
      maxHashtags: 15,
      maxMentions: 50,
      maxMediaCount: 1, // Single video
      supportedMediaTypes: ['video'],
      maxImageSize: 0,
      maxVideoSize: 256 * 1024 * 1024 * 1024, // 256GB
      maxVideoDuration: 12 * 60 * 60, // 12 hours
      imageFormats: [],
      videoFormats: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'],
      aspectRatios: {
        min: 0.5625, // 9:16
        max: 1.7778, // 16:9
      },
      requiresLink: false,
      supportsFirstComment: false,
      supportsScheduling: true,
    };
  }

  protected getRateLimitConfig(): RateLimitConfig {
    return {
      maxRequests: 10000, // YouTube has quota units, not simple rate limits
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      keyPrefix: 'youtube:publish',
    };
  }

  protected async applyPlatformSpecificFormatting(
    content: PublishContent,
  ): Promise<PublishContent> {
    const formatted = { ...content };

    // YouTube hashtags should have # prefix
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
      if (content.media.length === 0 || content.media[0].type !== 'video') {
        throw new Error('YouTube requires a video');
      }

      const video = content.media[0];

      // Extract title from first line of text or use default
      const lines = content.text.split('\n');
      const title = lines[0].substring(0, 100) || 'Untitled Video';
      const description = content.text;

      const videoData = {
        snippet: {
          title,
          description,
          tags: content.hashtags.map((tag) => tag.replace('#', '')),
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      };

      // Upload video (simplified - actual implementation would use resumable upload)
      const response = await this.makeAuthenticatedRequest<any>(
        'https://www.googleapis.com/youtube/v3/videos?part=snippet,status',
        accessToken,
        'POST',
        {
          ...videoData,
          // In real implementation, video file would be uploaded here
          videoUrl: video.url,
        },
      );

      return {
        success: true,
        platformPostId: response.id,
        url: `https://www.youtube.com/watch?v=${response.id}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to publish to YouTube: ${errorMessage}`);
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
      if (content.media.length === 0 || content.media[0].type !== 'video') {
        throw new Error('YouTube requires a video');
      }

      const video = content.media[0];
      const lines = content.text.split('\n');
      const title = lines[0].substring(0, 100) || 'Untitled Video';
      const description = content.text;

      const videoData = {
        snippet: {
          title,
          description,
          tags: content.hashtags.map((tag) => tag.replace('#', '')),
          categoryId: '22',
        },
        status: {
          privacyStatus: 'private',
          publishAt: scheduledTime.toISOString(),
          selfDeclaredMadeForKids: false,
        },
      };

      const response = await this.makeAuthenticatedRequest<any>(
        'https://www.googleapis.com/youtube/v3/videos?part=snippet,status',
        accessToken,
        'POST',
        {
          ...videoData,
          videoUrl: video.url,
        },
      );

      return {
        success: true,
        platformPostId: response.id,
        publishedAt: scheduledTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to schedule YouTube video: ${errorMessage}`);
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
      `https://www.googleapis.com/youtube/v3/videos?id=${platformPostId}`,
      accessToken,
      'DELETE',
    );
  }
}
