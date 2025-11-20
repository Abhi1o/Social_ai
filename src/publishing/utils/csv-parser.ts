import { parse } from 'csv-parse/sync';
import { BadRequestException } from '@nestjs/common';
import { CreatePostDto, PostContentDto, PlatformPostDto } from '../dto/create-post.dto';
import { Platform } from '@prisma/client';

export interface CsvRow {
  text: string;
  platforms: string;
  accountIds: string;
  scheduledAt?: string;
  hashtags?: string;
  mentions?: string;
  link?: string;
  firstComment?: string;
  mediaIds?: string;
  campaignId?: string;
  tags?: string;
}

export class CsvParser {
  /**
   * Parse CSV content into CreatePostDto array
   */
  static parseBulkScheduleCsv(csvContent: string): CreatePostDto[] {
    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as CsvRow[];

      if (records.length === 0) {
        throw new BadRequestException('CSV file is empty');
      }

      return records.map((row, index) => this.parseRow(row, index));
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`CSV parsing error: ${error.message}`);
    }
  }

  /**
   * Parse a single CSV row into CreatePostDto
   */
  private static parseRow(row: CsvRow, index: number): CreatePostDto {
    const errors: string[] = [];

    // Validate required fields
    if (!row.text || row.text.trim() === '') {
      errors.push(`Row ${index + 1}: 'text' is required`);
    }

    if (!row.platforms || row.platforms.trim() === '') {
      errors.push(`Row ${index + 1}: 'platforms' is required`);
    }

    if (!row.accountIds || row.accountIds.trim() === '') {
      errors.push(`Row ${index + 1}: 'accountIds' is required`);
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }

    // Parse platforms
    const platforms = row.platforms
      .split(',')
      .map(p => p.trim().toUpperCase())
      .filter(p => p);

    // Parse account IDs
    const accountIds = row.accountIds
      .split(',')
      .map(id => id.trim())
      .filter(id => id);

    // Validate platforms and accountIds match
    if (platforms.length !== accountIds.length) {
      throw new BadRequestException(
        `Row ${index + 1}: Number of platforms (${platforms.length}) must match number of accountIds (${accountIds.length})`,
      );
    }

    // Validate platforms are valid enum values
    const validPlatforms = Object.values(Platform);
    const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p as Platform));
    if (invalidPlatforms.length > 0) {
      throw new BadRequestException(
        `Row ${index + 1}: Invalid platforms: ${invalidPlatforms.join(', ')}. Valid platforms: ${validPlatforms.join(', ')}`,
      );
    }

    // Parse hashtags
    const hashtags = row.hashtags
      ? row.hashtags
          .split(',')
          .map(h => h.trim())
          .filter(h => h)
      : [];

    // Parse mentions
    const mentions = row.mentions
      ? row.mentions
          .split(',')
          .map(m => m.trim())
          .filter(m => m)
      : [];

    // Parse media IDs
    const mediaIds = row.mediaIds
      ? row.mediaIds
          .split(',')
          .map(id => id.trim())
          .filter(id => id)
      : [];

    // Parse tags
    const tags = row.tags
      ? row.tags
          .split(',')
          .map(t => t.trim())
          .filter(t => t)
      : [];

    // Build content
    const content: PostContentDto = {
      text: row.text.trim(),
      media: mediaIds,
      hashtags,
      mentions,
      link: row.link?.trim() || undefined,
      firstComment: row.firstComment?.trim() || undefined,
    };

    // Build platform posts
    const platformPosts: PlatformPostDto[] = platforms.map((platform, i) => ({
      platform: platform as Platform,
      accountId: accountIds[i],
    }));

    // Build DTO
    const dto: CreatePostDto = {
      content,
      platforms: platformPosts,
      scheduledAt: row.scheduledAt?.trim() || undefined,
      campaignId: row.campaignId?.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      aiGenerated: false,
    };

    return dto;
  }

  /**
   * Generate CSV template
   */
  static generateTemplate(): string {
    const headers = [
      'text',
      'platforms',
      'accountIds',
      'scheduledAt',
      'hashtags',
      'mentions',
      'link',
      'firstComment',
      'mediaIds',
      'campaignId',
      'tags',
    ];

    const example = [
      'Check out our new product launch! 🚀',
      'INSTAGRAM,FACEBOOK',
      'account-uuid-1,account-uuid-2',
      '2024-12-25T10:00:00Z',
      'product,launch,innovation',
      '@partner,@influencer',
      'https://example.com/product',
      'Link in bio for more details!',
      'media-uuid-1,media-uuid-2',
      'campaign-uuid',
      'marketing,product',
    ];

    return `${headers.join(',')}\n${example.join(',')}`;
  }

  /**
   * Validate CSV structure
   */
  static validateCsvStructure(csvContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as CsvRow[];

      if (records.length === 0) {
        errors.push('CSV file is empty');
        return { valid: false, errors };
      }

      // Check required columns
      const requiredColumns = ['text', 'platforms', 'accountIds'];
      const firstRow = records[0];
      const missingColumns = requiredColumns.filter(col => !(col in firstRow));

      if (missingColumns.length > 0) {
        errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      // Validate each row
      records.forEach((row, index) => {
        if (!row.text || row.text.trim() === '') {
          errors.push(`Row ${index + 1}: 'text' is required`);
        }

        if (!row.platforms || row.platforms.trim() === '') {
          errors.push(`Row ${index + 1}: 'platforms' is required`);
        }

        if (!row.accountIds || row.accountIds.trim() === '') {
          errors.push(`Row ${index + 1}: 'accountIds' is required`);
        }

        // Validate date format if provided
        if (row.scheduledAt && row.scheduledAt.trim()) {
          const date = new Date(row.scheduledAt);
          if (isNaN(date.getTime())) {
            errors.push(`Row ${index + 1}: Invalid date format for 'scheduledAt'`);
          }
        }
      });

      return { valid: errors.length === 0, errors };
    } catch (error: any) {
      errors.push(`CSV parsing error: ${error.message}`);
      return { valid: false, errors };
    }
  }
}
