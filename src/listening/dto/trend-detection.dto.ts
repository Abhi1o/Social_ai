import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, IsArray, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Platform } from '@prisma/client';
import { TrendType, TrendStatus } from '../schemas/trend.schema';

/**
 * DTO for querying trends
 */
export class GetTrendsDto {
  @ApiPropertyOptional({ enum: TrendType, description: 'Filter by trend type' })
  @IsOptional()
  @IsEnum(TrendType)
  type?: TrendType;

  @ApiPropertyOptional({ enum: TrendStatus, description: 'Filter by trend status' })
  @IsOptional()
  @IsEnum(TrendStatus)
  status?: TrendStatus;

  @ApiPropertyOptional({ enum: Platform, isArray: true, description: 'Filter by platforms' })
  @IsOptional()
  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms?: Platform[];

  @ApiPropertyOptional({ description: 'Minimum growth rate percentage', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minGrowthRate?: number;

  @ApiPropertyOptional({ description: 'Minimum virality score', minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minViralityScore?: number;

  @ApiPropertyOptional({ description: 'Number of results to return', default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Number of results to skip', default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Sort field', enum: ['growthRate', 'viralityScore', 'currentVolume', 'lastSeenAt'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'viralityScore';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * DTO for hashtag trend analysis
 */
export class AnalyzeHashtagTrendDto {
  @ApiProperty({ description: 'Hashtag to analyze (with or without #)' })
  @IsString()
  hashtag: string;

  @ApiPropertyOptional({ enum: Platform, isArray: true, description: 'Platforms to analyze' })
  @IsOptional()
  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms?: Platform[];

  @ApiPropertyOptional({ description: 'Number of days to analyze', default: 7, minimum: 1, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number = 7;
}

/**
 * DTO for detecting viral content
 */
export class DetectViralContentDto {
  @ApiPropertyOptional({ enum: Platform, isArray: true, description: 'Platforms to check' })
  @IsOptional()
  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms?: Platform[];

  @ApiPropertyOptional({ description: 'Minimum virality score threshold', default: 70, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minViralityScore?: number = 70;

  @ApiPropertyOptional({ description: 'Time window in hours', default: 24, minimum: 1, maximum: 168 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  timeWindowHours?: number = 24;

  @ApiPropertyOptional({ description: 'Number of results', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * DTO for conversation clustering
 */
export class GetConversationClustersDto {
  @ApiPropertyOptional({ description: 'Minimum cluster size', default: 5, minimum: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  minSize?: number = 5;

  @ApiPropertyOptional({ description: 'Minimum cohesion score', default: 0.5, minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  minCohesion?: number = 0.5;

  @ApiPropertyOptional({ description: 'Number of days to analyze', default: 7, minimum: 1, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number = 7;

  @ApiPropertyOptional({ description: 'Number of results', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * DTO for trend alert configuration
 */
export class ConfigureTrendAlertDto {
  @ApiProperty({ description: 'Alert name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: TrendType, isArray: true, description: 'Trend types to monitor' })
  @IsOptional()
  @IsArray()
  @IsEnum(TrendType, { each: true })
  trendTypes?: TrendType[];

  @ApiPropertyOptional({ description: 'Minimum growth rate to trigger alert', default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minGrowthRate?: number = 100;

  @ApiPropertyOptional({ description: 'Minimum virality score to trigger alert', default: 80 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minViralityScore?: number = 80;

  @ApiPropertyOptional({ description: 'Keywords to monitor', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Email recipients for alerts', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];
}

/**
 * DTO for trend growth velocity calculation
 */
export class CalculateTrendVelocityDto {
  @ApiProperty({ description: 'Trend term to analyze' })
  @IsString()
  term: string;

  @ApiPropertyOptional({ description: 'Time window in hours for velocity calculation', default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  timeWindowHours?: number = 24;
}
