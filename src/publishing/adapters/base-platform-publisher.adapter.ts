import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Platform } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import {
  IPlatformPublisher,
  PublishContent,
  PublishResult,
  PlatformRequirements,
  RateLimitInfo,
} from '../interfaces/platform-publisher.interface';
import { RetryHandler, RetryConfig } from '../utils/retry-handler';
import { RateLimiter, RateLimitConfig } from '../utils/rate-limiter';

/**
 * Base class for platform publishing adapters
 */
export abstract class BasePlatformPublisher implements IPlatformPublisher {
  protected readonly logger: Logger;
  protected readonly httpClient: AxiosInstance;
  protected readonly retryHandler: RetryHandler;

  abstract readonly platform: Platform;

  constructor(protected readonly rateLimiter: RateLimiter) {
    this.logger = new Logger(this.constructor.name);
    this.retryHandler = new RetryHandler();

    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  /**
   * Get platform-specific requirements
   */
  abstract getRequirements(): PlatformRequirements;

  /**
   * Get rate limit configuration for this platform
   */
  protected abstract getRateLimitConfig(): RateLimitConfig;

  /**
   * Get retry configuration for this platform
   */
  protected getRetryConfig(): RetryConfig {
    return {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      retryableErrors: [
        'rate limit',
        'timeout',
        'network',
        '429',
        '500',
        '502',
        '503',
        '504',
      ],
    };
  }

  /**
   * Validate content against platform requirements
   */
  async validateContent(content: PublishContent): Promise<string[]> {
    const errors: string[] = [];
    const requirements = this.getRequirements();

    // Validate text length
    if (content.text.length > requirements.maxTextLength) {
      errors.push(
        `Text exceeds maximum length of ${requirements.maxTextLength} characters`,
      );
    }

    // Validate hashtags
    if (content.hashtags.length > requirements.maxHashtags) {
      errors.push(
        `Too many hashtags. Maximum allowed: ${requirements.maxHashtags}`,
      );
    }

    // Validate mentions
    if (content.mentions.length > requirements.maxMentions) {
      errors.push(
        `Too many mentions. Maximum allowed: ${requirements.maxMentions}`,
      );
    }

    // Validate media count
    if (content.media.length > requirements.maxMediaCount) {
      errors.push(
        `Too many media items. Maximum allowed: ${requirements.maxMediaCount}`,
      );
    }

    // Validate media types
    for (const media of content.media) {
      if (!requirements.supportedMediaTypes.includes(media.type)) {
        errors.push(`Media type '${media.type}' is not supported`);
      }
    }

    // Validate link requirement
    if (requirements.requiresLink && !content.link) {
      errors.push('Link is required for this platform');
    }

    // Validate first comment support
    if (content.firstComment && !requirements.supportsFirstComment) {
      errors.push('First comment is not supported on this platform');
    }

    return errors;
  }

  /**
   * Format content for platform-specific requirements
   */
  async formatContent(content: PublishContent): Promise<PublishContent> {
    const requirements = this.getRequirements();
    const formatted = { ...content };

    // Truncate text if needed
    if (formatted.text.length > requirements.maxTextLength) {
      formatted.text = this.truncateText(
        formatted.text,
        requirements.maxTextLength,
      );
      this.logger.warn(
        `Text truncated to ${requirements.maxTextLength} characters`,
      );
    }

    // Limit hashtags
    if (formatted.hashtags.length > requirements.maxHashtags) {
      formatted.hashtags = formatted.hashtags.slice(0, requirements.maxHashtags);
      this.logger.warn(`Hashtags limited to ${requirements.maxHashtags}`);
    }

    // Limit mentions
    if (formatted.mentions.length > requirements.maxMentions) {
      formatted.mentions = formatted.mentions.slice(0, requirements.maxMentions);
      this.logger.warn(`Mentions limited to ${requirements.maxMentions}`);
    }

    // Limit media
    if (formatted.media.length > requirements.maxMediaCount) {
      formatted.media = formatted.media.slice(0, requirements.maxMediaCount);
      this.logger.warn(`Media limited to ${requirements.maxMediaCount} items`);
    }

    // Apply platform-specific formatting
    return this.applyPlatformSpecificFormatting(formatted);
  }

  /**
   * Apply platform-specific content formatting
   * Override in subclasses for custom formatting
   */
  protected async applyPlatformSpecificFormatting(
    content: PublishContent,
  ): Promise<PublishContent> {
    return content;
  }

  /**
   * Truncate text intelligently (at word boundary)
   */
  protected truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Try to truncate at word boundary
    const truncated = text.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  /**
   * Publish post with rate limiting and retry logic
   */
  async publishPost(
    accountId: string,
    accessToken: string,
    content: PublishContent,
  ): Promise<PublishResult> {
    // Check rate limit
    const rateLimitKey = `${this.platform}:${accountId}`;
    const rateLimitResult = await this.rateLimiter.checkLimit(
      rateLimitKey,
      this.getRateLimitConfig(),
    );

    if (!rateLimitResult.allowed) {
      throw new HttpException(
        {
          message: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
          resetAt: rateLimitResult.resetAt,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Validate content
    const errors = await this.validateContent(content);
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: 'Content validation failed',
          errors,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Format content
    const formattedContent = await this.formatContent(content);

    // Publish with retry logic
    return this.retryHandler.executeWithRetry(
      () => this.performPublish(accountId, accessToken, formattedContent),
      this.getRetryConfig(),
      `Publish to ${this.platform}`,
    );
  }

  /**
   * Perform the actual publish operation
   * Must be implemented by platform-specific adapters
   */
  protected abstract performPublish(
    accountId: string,
    accessToken: string,
    content: PublishContent,
  ): Promise<PublishResult>;

  /**
   * Schedule post for future publishing
   */
  async schedulePost(
    accountId: string,
    accessToken: string,
    content: PublishContent,
    scheduledTime: Date,
  ): Promise<PublishResult> {
    const requirements = this.getRequirements();

    if (!requirements.supportsScheduling) {
      throw new HttpException(
        'Scheduling is not supported on this platform',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate content
    const errors = await this.validateContent(content);
    if (errors.length > 0) {
      throw new HttpException(
        {
          message: 'Content validation failed',
          errors,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Format content
    const formattedContent = await this.formatContent(content);

    // Schedule with retry logic
    return this.retryHandler.executeWithRetry(
      () =>
        this.performSchedule(
          accountId,
          accessToken,
          formattedContent,
          scheduledTime,
        ),
      this.getRetryConfig(),
      `Schedule post on ${this.platform}`,
    );
  }

  /**
   * Perform the actual schedule operation
   * Must be implemented by platform-specific adapters
   */
  protected abstract performSchedule(
    accountId: string,
    accessToken: string,
    content: PublishContent,
    scheduledTime: Date,
  ): Promise<PublishResult>;

  /**
   * Delete a published post
   */
  async deletePost(
    accountId: string,
    accessToken: string,
    platformPostId: string,
  ): Promise<void> {
    return this.retryHandler.executeWithRetry(
      () => this.performDelete(accountId, accessToken, platformPostId),
      this.getRetryConfig(),
      `Delete post from ${this.platform}`,
    );
  }

  /**
   * Perform the actual delete operation
   * Must be implemented by platform-specific adapters
   */
  protected abstract performDelete(
    accountId: string,
    accessToken: string,
    platformPostId: string,
  ): Promise<void>;

  /**
   * Get rate limit information
   */
  async getRateLimitInfo(accessToken: string): Promise<RateLimitInfo> {
    // This is a basic implementation using our rate limiter
    // Platform-specific adapters can override to use platform's rate limit API
    const config = this.getRateLimitConfig();
    const status = await this.rateLimiter.getStatus(accessToken, config);

    return {
      limit: config.maxRequests,
      remaining: status.remaining,
      resetAt: status.resetAt,
    };
  }

  /**
   * Make authenticated API request with error handling
   */
  protected async makeAuthenticatedRequest<T>(
    url: string,
    accessToken: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
  ): Promise<T> {
    try {
      const response = await this.httpClient.request({
        method,
        url,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;

        this.logger.error(
          `API request failed: ${method} ${url} - Status: ${status}, Message: ${message}`,
        );

        if (status === 429) {
          throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
        } else if (status === 401) {
          throw new HttpException('Invalid or expired token', HttpStatus.UNAUTHORIZED);
        } else if (status && status >= 500) {
          throw new HttpException('Platform service unavailable', HttpStatus.BAD_GATEWAY);
        }

        throw new HttpException(
          message || 'Failed to communicate with platform',
          status || HttpStatus.BAD_REQUEST,
        );
      }

      throw error;
    }
  }
}
