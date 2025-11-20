import { Platform } from '@prisma/client';

/**
 * Media asset for publishing
 */
export interface PublishMediaAsset {
  url: string;
  type: 'image' | 'video' | 'gif';
  thumbnailUrl?: string;
  altText?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number; // for videos in seconds
}

/**
 * Content to be published
 */
export interface PublishContent {
  text: string;
  media: PublishMediaAsset[];
  hashtags: string[];
  mentions: string[];
  link?: string;
  firstComment?: string; // Instagram-specific
}

/**
 * Platform-specific requirements and limits
 */
export interface PlatformRequirements {
  maxTextLength: number;
  maxHashtags: number;
  maxMentions: number;
  maxMediaCount: number;
  supportedMediaTypes: ('image' | 'video' | 'gif')[];
  maxImageSize: number; // bytes
  maxVideoSize: number; // bytes
  maxVideoDuration: number; // seconds
  imageFormats: string[]; // e.g., ['jpg', 'png', 'webp']
  videoFormats: string[]; // e.g., ['mp4', 'mov']
  aspectRatios: {
    min: number;
    max: number;
  };
  requiresLink: boolean;
  supportsFirstComment: boolean;
  supportsScheduling: boolean;
}

/**
 * Result of a publish operation
 */
export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  url?: string;
  error?: string;
  publishedAt: Date;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

/**
 * Interface for platform-specific publishing adapters
 */
export interface IPlatformPublisher {
  /**
   * The platform this publisher handles
   */
  readonly platform: Platform;

  /**
   * Get platform-specific requirements and limits
   */
  getRequirements(): PlatformRequirements;

  /**
   * Validate content against platform requirements
   * @param content - Content to validate
   * @returns Array of validation errors, empty if valid
   */
  validateContent(content: PublishContent): Promise<string[]>;

  /**
   * Format content for this platform
   * @param content - Generic content
   * @returns Platform-optimized content
   */
  formatContent(content: PublishContent): Promise<PublishContent>;

  /**
   * Publish content to the platform
   * @param accountId - Platform account ID
   * @param accessToken - Valid access token
   * @param content - Content to publish
   */
  publishPost(
    accountId: string,
    accessToken: string,
    content: PublishContent,
  ): Promise<PublishResult>;

  /**
   * Schedule content for future publishing
   * @param accountId - Platform account ID
   * @param accessToken - Valid access token
   * @param content - Content to publish
   * @param scheduledTime - When to publish
   */
  schedulePost(
    accountId: string,
    accessToken: string,
    content: PublishContent,
    scheduledTime: Date,
  ): Promise<PublishResult>;

  /**
   * Delete a published post
   * @param accountId - Platform account ID
   * @param accessToken - Valid access token
   * @param platformPostId - ID of the post on the platform
   */
  deletePost(
    accountId: string,
    accessToken: string,
    platformPostId: string,
  ): Promise<void>;

  /**
   * Get current rate limit status
   * @param accessToken - Valid access token
   */
  getRateLimitInfo(accessToken: string): Promise<RateLimitInfo>;
}
