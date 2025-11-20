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
 * LinkedIn publishing adapter using LinkedIn API
 */
@Injectable()
export class LinkedInPublisher extends BasePlatformPublisher {
  readonly platform = Platform.LINKEDIN;

  constructor(rateLimiter: RateLimiter) {
    super(rateLimiter);
  }

  getRequirements(): PlatformRequirements {
    return {
      maxTextLength: 3000,
      maxHashtags: 30,
      maxMentions: 20,
      maxMediaCount: 9,
      supportedMediaTypes: ['image', 'video'],
      maxImageSize: 10 * 1024 * 1024, // 10MB
      maxVideoSize: 5 * 1024 * 1024 * 1024, // 5GB
      maxVideoDuration: 600, // 10 minutes
      imageFormats: ['jpg', 'jpeg', 'png', 'gif'],
      videoFormats: ['mp4', 'mov', 'avi'],
      aspectRatios: {
        min: 0.5,
        max: 2.0,
      },
      requiresLink: false,
      supportsFirstComment: false,
      supportsScheduling: false, // LinkedIn doesn't support native scheduling
    };
  }

  protected getRateLimitConfig(): RateLimitConfig {
    return {
      maxRequests: 100,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      keyPrefix: 'linkedin:publish',
    };
  }

  protected async applyPlatformSpecificFormatting(
    content: PublishContent,
  ): Promise<PublishContent> {
    const formatted = { ...content };

    // LinkedIn hashtags should have # prefix
    formatted.hashtags = formatted.hashtags.map((tag) =>
      tag.startsWith('#') ? tag : `#${tag}`,
    );

    // Add hashtags to the end of the text
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
      const shareData: any = {
        author: `urn:li:person:${accountId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content.text,
            },
            shareMediaCategory: content.media.length > 0 ? 'IMAGE' : 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      // Handle media
      if (content.media.length > 0) {
        const mediaAssets = await this.uploadMedia(accountId, accessToken, content.media);
        shareData.specificContent['com.linkedin.ugc.ShareContent'].media = mediaAssets;
      }

      // Add link if provided
      if (content.link) {
        shareData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
        shareData.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            originalUrl: content.link,
          },
        ];
      }

      const response = await this.makeAuthenticatedRequest<any>(
        'https://api.linkedin.com/v2/ugcPosts',
        accessToken,
        'POST',
        shareData,
      );

      return {
        success: true,
        platformPostId: response.id,
        url: `https://www.linkedin.com/feed/update/${response.id}`,
        publishedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to publish to LinkedIn: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        publishedAt: new Date(),
      };
    }
  }

  private async uploadMedia(
    accountId: string,
    accessToken: string,
    media: any[],
  ): Promise<any[]> {
    const mediaAssets: any[] = [];

    for (const item of media) {
      if (item.type === 'image') {
        // Register upload
        const registerResponse = await this.makeAuthenticatedRequest<any>(
          'https://api.linkedin.com/v2/assets?action=registerUpload',
          accessToken,
          'POST',
          {
            registerUploadRequest: {
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
              owner: `urn:li:person:${accountId}`,
              serviceRelationships: [
                {
                  relationshipType: 'OWNER',
                  identifier: 'urn:li:userGeneratedContent',
                },
              ],
            },
          },
        );

        const uploadUrl = registerResponse.value.uploadMechanism[
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
        ].uploadUrl;
        const asset = registerResponse.value.asset;

        // Upload image (this would need actual file upload logic)
        // For now, we'll assume the media URL is accessible

        mediaAssets.push({
          status: 'READY',
          media: asset,
        });
      }
    }

    return mediaAssets;
  }

  protected async performSchedule(
    accountId: string,
    accessToken: string,
    content: PublishContent,
    scheduledTime: Date,
  ): Promise<PublishResult> {
    throw new Error('LinkedIn does not support native scheduling via API');
  }

  protected async performDelete(
    accountId: string,
    accessToken: string,
    platformPostId: string,
  ): Promise<void> {
    await this.makeAuthenticatedRequest(
      `https://api.linkedin.com/v2/ugcPosts/${platformPostId}`,
      accessToken,
      'DELETE',
    );
  }
}
