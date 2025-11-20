import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BooleanQueryBuilderService } from './boolean-query-builder.service';
import { BooleanOperator } from '../interfaces/boolean-query.interface';
import { Platform } from '@prisma/client';

describe('BooleanQueryBuilderService', () => {
  let service: BooleanQueryBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BooleanQueryBuilderService],
    }).compile();

    service = module.get<BooleanQueryBuilderService>(BooleanQueryBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parse', () => {
    it('should parse a simple term', () => {
      const result = service.parse('brand');
      
      expect(result.keywords).toContain('brand');
      expect(result.root.type).toBe('term');
      expect(result.root.value).toBe('brand');
    });

    it('should parse a phrase with quotes', () => {
      const result = service.parse('"brand name"');
      
      expect(result.phrases).toContain('brand name');
      expect(result.root.type).toBe('phrase');
      expect(result.root.value).toBe('brand name');
    });

    it('should parse AND operator', () => {
      const result = service.parse('brand AND product');
      
      expect(result.keywords).toContain('brand');
      expect(result.keywords).toContain('product');
      expect(result.root.type).toBe('operator');
      expect(result.root.operator).toBe(BooleanOperator.AND);
    });

    it('should parse OR operator', () => {
      const result = service.parse('brand OR product');
      
      expect(result.keywords).toContain('brand');
      expect(result.keywords).toContain('product');
      expect(result.root.type).toBe('operator');
      expect(result.root.operator).toBe(BooleanOperator.OR);
    });

    it('should parse NOT operator', () => {
      // NOT is a unary operator, so we need proper syntax
      const result = service.parse('brand AND NOT competitor');
      
      expect(result.keywords).toContain('brand');
      expect(result.excludedTerms).toContain('competitor');
      expect(result.root.type).toBe('operator');
    });

    it('should parse complex query with parentheses', () => {
      const result = service.parse('(brand OR product) AND review');
      
      expect(result.keywords).toContain('brand');
      expect(result.keywords).toContain('product');
      expect(result.keywords).toContain('review');
    });

    it('should parse query with phrases and operators', () => {
      const result = service.parse('"brand name" AND (review OR feedback)');
      
      expect(result.phrases).toContain('brand name');
      expect(result.keywords).toContain('review');
      expect(result.keywords).toContain('feedback');
    });

    it('should throw error for empty query', () => {
      expect(() => service.parse('')).toThrow(BadRequestException);
      expect(() => service.parse('   ')).toThrow(BadRequestException);
    });

    it('should handle multiple spaces', () => {
      const result = service.parse('brand    AND    product');
      
      expect(result.keywords).toContain('brand');
      expect(result.keywords).toContain('product');
    });
  });

  describe('validate', () => {
    it('should validate correct query', () => {
      const result = service.validate('brand AND product');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unbalanced parentheses', () => {
      const result = service.validate('(brand AND product');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect unbalanced quotes', () => {
      const result = service.validate('"brand AND product');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect empty query', () => {
      const result = service.validate('');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query cannot be empty');
    });
  });

  describe('build', () => {
    it('should build query with OR operator', () => {
      const result = service.build(['brand', 'product'], BooleanOperator.OR);
      
      expect(result).toBe('brand OR product');
    });

    it('should build query with AND operator', () => {
      const result = service.build(['brand', 'product'], BooleanOperator.AND);
      
      expect(result).toBe('brand AND product');
    });

    it('should handle single keyword', () => {
      const result = service.build(['brand']);
      
      expect(result).toBe('brand');
    });

    it('should wrap keywords with spaces in quotes', () => {
      const result = service.build(['brand name', 'product']);
      
      expect(result).toContain('"brand name"');
    });

    it('should throw error for empty keywords array', () => {
      expect(() => service.build([])).toThrow(BadRequestException);
    });
  });

  describe('toPlatformQuery', () => {
    it('should convert to Twitter format', () => {
      const parsed = service.parse('brand AND product');
      const platformQuery = service.toPlatformQuery(parsed, Platform.TWITTER);
      
      expect(platformQuery.platform).toBe(Platform.TWITTER);
      expect(platformQuery.query).toBeTruthy();
    });

    it('should convert to Instagram format', () => {
      const parsed = service.parse('brand OR product');
      const platformQuery = service.toPlatformQuery(parsed, Platform.INSTAGRAM);
      
      expect(platformQuery.platform).toBe(Platform.INSTAGRAM);
      expect(platformQuery.query).toBeTruthy();
    });

    it('should handle NOT operator for Twitter', () => {
      const parsed = service.parse('brand AND NOT competitor');
      const platformQuery = service.toPlatformQuery(parsed, Platform.TWITTER);
      
      expect(platformQuery.query).toContain('-');
    });
  });

  describe('operator precedence', () => {
    it('should respect NOT > AND > OR precedence', () => {
      const result = service.parse('brand OR (product AND NOT competitor)');
      
      expect(result.root.type).toBe('operator');
      expect(result.keywords).toContain('brand');
      expect(result.keywords).toContain('product');
      expect(result.excludedTerms).toContain('competitor');
    });

    it('should allow parentheses to override precedence', () => {
      const result = service.parse('(brand OR product) AND review');
      
      expect(result.root.type).toBe('operator');
      expect(result.root.operator).toBe(BooleanOperator.AND);
    });
  });

  describe('edge cases', () => {
    it('should handle nested parentheses', () => {
      const result = service.parse('((brand OR product) AND review)');
      
      expect(result.keywords).toContain('brand');
      expect(result.keywords).toContain('product');
      expect(result.keywords).toContain('review');
    });

    it('should handle multiple phrases', () => {
      const result = service.parse('"brand name" OR "product review"');
      
      expect(result.phrases).toContain('brand name');
      expect(result.phrases).toContain('product review');
    });

    it('should handle mixed case operators', () => {
      // Operators must be uppercase, so lowercase 'and' is treated as a term
      const result = service.parse('brand OR and OR product');
      
      // Should treat lowercase 'and' as a regular term
      expect(result.keywords).toContain('brand');
      expect(result.keywords).toContain('and');
      expect(result.keywords).toContain('product');
    });
  });
});
