import { CsvParser } from './csv-parser';
import { BadRequestException } from '@nestjs/common';
import { Platform } from '@prisma/client';

describe('CsvParser', () => {
  describe('parseBulkScheduleCsv', () => {
    it('should parse valid CSV content', () => {
      const csvContent = `text,platforms,accountIds,scheduledAt,hashtags,mentions,link,firstComment,mediaIds,campaignId,tags
"Test post content",INSTAGRAM,account-123,2024-12-25T10:00:00Z,"tag1,tag2","@user1,@user2",https://example.com,"First comment","media-1,media-2",campaign-123,"marketing,social"`;

      const result = CsvParser.parseBulkScheduleCsv(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].content.text).toBe('Test post content');
      expect(result[0].platforms).toHaveLength(1);
      expect(result[0].platforms[0].platform).toBe(Platform.INSTAGRAM);
      expect(result[0].platforms[0].accountId).toBe('account-123');
      expect(result[0].content.hashtags).toEqual(['tag1', 'tag2']);
      expect(result[0].content.mentions).toEqual(['@user1', '@user2']);
      expect(result[0].content.link).toBe('https://example.com');
      expect(result[0].content.firstComment).toBe('First comment');
      expect(result[0].content.media).toEqual(['media-1', 'media-2']);
      expect(result[0].campaignId).toBe('campaign-123');
      expect(result[0].tags).toEqual(['marketing', 'social']);
    });

    it('should parse multiple platforms', () => {
      const csvContent = `text,platforms,accountIds
"Multi-platform post","INSTAGRAM,FACEBOOK","account-1,account-2"`;

      const result = CsvParser.parseBulkScheduleCsv(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].platforms).toHaveLength(2);
      expect(result[0].platforms[0].platform).toBe(Platform.INSTAGRAM);
      expect(result[0].platforms[1].platform).toBe(Platform.FACEBOOK);
    });

    it('should throw error for empty CSV', () => {
      const csvContent = '';

      expect(() => CsvParser.parseBulkScheduleCsv(csvContent)).toThrow(BadRequestException);
    });

    it('should throw error for missing required fields', () => {
      const csvContent = `text,platforms,accountIds
"",INSTAGRAM,account-123`;

      expect(() => CsvParser.parseBulkScheduleCsv(csvContent)).toThrow(BadRequestException);
    });

    it('should throw error for mismatched platforms and accountIds', () => {
      const csvContent = `text,platforms,accountIds
"Test post","INSTAGRAM,FACEBOOK",account-123`;

      expect(() => CsvParser.parseBulkScheduleCsv(csvContent)).toThrow(BadRequestException);
    });

    it('should throw error for invalid platform', () => {
      const csvContent = `text,platforms,accountIds
"Test post",INVALID_PLATFORM,account-123`;

      expect(() => CsvParser.parseBulkScheduleCsv(csvContent)).toThrow(BadRequestException);
    });
  });

  describe('validateCsvStructure', () => {
    it('should validate correct CSV structure', () => {
      const csvContent = `text,platforms,accountIds
"Test post",INSTAGRAM,account-123`;

      const result = CsvParser.validateCsvStructure(csvContent);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required columns', () => {
      const csvContent = `text,platforms
"Test post",INSTAGRAM`;

      const result = CsvParser.validateCsvStructure(csvContent);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid date format', () => {
      const csvContent = `text,platforms,accountIds,scheduledAt
"Test post",INSTAGRAM,account-123,invalid-date`;

      const result = CsvParser.validateCsvStructure(csvContent);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid date format'))).toBe(true);
    });
  });

  describe('generateTemplate', () => {
    it('should generate CSV template', () => {
      const template = CsvParser.generateTemplate();

      expect(template).toContain('text,platforms,accountIds');
      expect(template).toContain('Check out our new product launch!');
    });
  });
});
