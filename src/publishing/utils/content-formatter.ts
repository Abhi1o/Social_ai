import { Injectable, Logger } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { PublishContent } from '../interfaces/platform-publisher.interface';

/**
 * Utility service for formatting content for different platforms
 */
@Injectable()
export class ContentFormatter {
  private readonly logger = new Logger(ContentFormatter.name);

  /**
   * Extract hashtags from text
   */
  extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map((tag) => tag.substring(1)) : [];
  }

  /**
   * Extract mentions from text
   */
  extractMentions(text: string): string[] {
    const mentionRegex = /@[\w\u0590-\u05ff]+/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map((mention) => mention.substring(1)) : [];
  }

  /**
   * Extract URLs from text
   */
  extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches || [];
  }

  /**
   * Remove hashtags from text
   */
  removeHashtags(text: string): string {
    return text.replace(/#[\w\u0590-\u05ff]+/g, '').trim();
  }

  /**
   * Remove mentions from text
   */
  removeMentions(text: string): string {
    return text.replace(/@[\w\u0590-\u05ff]+/g, '').trim();
  }

  /**
   * Remove URLs from text
   */
  removeUrls(text: string): string {
    return text.replace(/(https?:\/\/[^\s]+)/g, '').trim();
  }

  /**
   * Format hashtags for a specific platform
   */
  formatHashtagsForPlatform(hashtags: string[], platform: Platform): string[] {
    switch (platform) {
      case Platform.INSTAGRAM:
      case Platform.FACEBOOK:
      case Platform.TWITTER:
      case Platform.TIKTOK:
      case Platform.LINKEDIN:
      case Platform.PINTEREST:
        // These platforms use # prefix
        return hashtags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
      case Platform.YOUTUBE:
        // YouTube doesn't use # in tags
        return hashtags.map((tag) => tag.replace('#', ''));
      default:
        return hashtags;
    }
  }

  /**
   * Format mentions for a specific platform
   */
  formatMentionsForPlatform(mentions: string[], platform: Platform): string[] {
    switch (platform) {
      case Platform.INSTAGRAM:
      case Platform.FACEBOOK:
      case Platform.TWITTER:
      case Platform.TIKTOK:
      case Platform.LINKEDIN:
        // These platforms use @ prefix
        return mentions.map((mention) =>
          mention.startsWith('@') ? mention : `@${mention}`,
        );
      default:
        return mentions;
    }
  }

  /**
   * Truncate text to fit platform limits
   */
  truncateText(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) {
      return text;
    }

    const truncateLength = maxLength - suffix.length;

    // Try to truncate at word boundary
    const truncated = text.substring(0, truncateLength);
    const lastSpace = truncated.lastIndexOf(' ');

    // If we can find a space in the last 20% of the text, use it
    if (lastSpace > truncateLength * 0.8) {
      return truncated.substring(0, lastSpace) + suffix;
    }

    // Otherwise, just truncate at the limit
    return truncated + suffix;
  }

  /**
   * Split long text into multiple posts (thread)
   */
  splitIntoThread(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const posts: string[] = [];
    let remainingText = text;

    while (remainingText.length > 0) {
      if (remainingText.length <= maxLength) {
        posts.push(remainingText);
        break;
      }

      // Find a good breaking point
      let breakPoint = maxLength;
      const lastPeriod = remainingText.substring(0, maxLength).lastIndexOf('.');
      const lastNewline = remainingText.substring(0, maxLength).lastIndexOf('\n');
      const lastSpace = remainingText.substring(0, maxLength).lastIndexOf(' ');

      // Prefer breaking at sentence end
      if (lastPeriod > maxLength * 0.7) {
        breakPoint = lastPeriod + 1;
      } else if (lastNewline > maxLength * 0.7) {
        breakPoint = lastNewline + 1;
      } else if (lastSpace > maxLength * 0.8) {
        breakPoint = lastSpace + 1;
      }

      posts.push(remainingText.substring(0, breakPoint).trim());
      remainingText = remainingText.substring(breakPoint).trim();
    }

    return posts;
  }

  /**
   * Add thread numbering to posts
   */
  addThreadNumbering(posts: string[], format: string = '{index}/{total}'): string[] {
    if (posts.length <= 1) {
      return posts;
    }

    return posts.map((post, index) => {
      const numbering = format
        .replace('{index}', (index + 1).toString())
        .replace('{total}', posts.length.toString());
      return `${numbering} ${post}`;
    });
  }

  /**
   * Optimize content for a specific platform
   */
  optimizeForPlatform(content: PublishContent, platform: Platform): PublishContent {
    const optimized = { ...content };

    // Format hashtags and mentions
    optimized.hashtags = this.formatHashtagsForPlatform(content.hashtags, platform);
    optimized.mentions = this.formatMentionsForPlatform(content.mentions, platform);

    // Platform-specific optimizations
    switch (platform) {
      case Platform.TWITTER:
        // Twitter: Keep it concise, hashtags inline
        if (optimized.hashtags.length > 0) {
          optimized.text = `${optimized.text} ${optimized.hashtags.join(' ')}`;
        }
        break;

      case Platform.INSTAGRAM:
        // Instagram: Hashtags can be in caption or first comment
        // We'll put them in the caption by default
        if (optimized.hashtags.length > 0) {
          optimized.text = `${optimized.text}\n\n${optimized.hashtags.join(' ')}`;
        }
        break;

      case Platform.LINKEDIN:
        // LinkedIn: Professional tone, hashtags at the end
        if (optimized.hashtags.length > 0) {
          optimized.text = `${optimized.text}\n\n${optimized.hashtags.join(' ')}`;
        }
        break;

      case Platform.FACEBOOK:
        // Facebook: More casual, hashtags optional
        if (optimized.hashtags.length > 0) {
          optimized.text = `${optimized.text}\n\n${optimized.hashtags.join(' ')}`;
        }
        break;

      case Platform.TIKTOK:
        // TikTok: Hashtags inline, trending hashtags important
        if (optimized.hashtags.length > 0) {
          optimized.text = `${optimized.text} ${optimized.hashtags.join(' ')}`;
        }
        break;

      case Platform.YOUTUBE:
        // YouTube: Hashtags in description, no # prefix in tags
        if (optimized.hashtags.length > 0) {
          const formattedHashtags = optimized.hashtags.map((tag) =>
            tag.startsWith('#') ? tag : `#${tag}`,
          );
          optimized.text = `${optimized.text}\n\n${formattedHashtags.join(' ')}`;
        }
        break;

      case Platform.PINTEREST:
        // Pinterest: Descriptive text, hashtags for discovery
        if (optimized.hashtags.length > 0) {
          optimized.text = `${optimized.text}\n\n${optimized.hashtags.join(' ')}`;
        }
        break;
    }

    return optimized;
  }

  /**
   * Clean text by removing extra whitespace and normalizing line breaks
   */
  cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line breaks
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive line breaks
      .replace(/[ \t]+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Count characters for a specific platform (some platforms count emojis differently)
   */
  countCharacters(text: string, platform: Platform): number {
    switch (platform) {
      case Platform.TWITTER:
        // Twitter counts emojis and URLs differently
        // This is a simplified version
        return text.length;
      default:
        return text.length;
    }
  }

  /**
   * Validate content structure
   */
  validateContent(content: PublishContent): string[] {
    const errors: string[] = [];

    if (!content.text || content.text.trim().length === 0) {
      errors.push('Content text is required');
    }

    if (content.media && content.media.length > 0) {
      for (let i = 0; i < content.media.length; i++) {
        const media = content.media[i];
        if (!media.url) {
          errors.push(`Media item ${i + 1} is missing URL`);
        }
        if (!media.type) {
          errors.push(`Media item ${i + 1} is missing type`);
        }
      }
    }

    return errors;
  }
}
