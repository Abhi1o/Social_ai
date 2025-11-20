import { IsString, IsOptional, IsInt, Min, Max, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for analyzing sentiment of text
 */
export class AnalyzeSentimentDto {
  @ApiProperty({
    description: 'Text content to analyze',
    example: 'I love this product! It works amazingly well.',
  })
  @IsString()
  text: string;
}

/**
 * DTO for batch sentiment analysis
 */
export class AnalyzeSentimentBatchDto {
  @ApiProperty({
    description: 'Array of text content to analyze',
    example: [
      'I love this product!',
      'This is terrible service.',
      'It works okay.',
    ],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  texts: string[];
}

/**
 * DTO for updating mention sentiment
 */
export class UpdateMentionSentimentDto {
  @ApiProperty({
    description: 'Mention ID to update',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  mentionId: string;
}

/**
 * DTO for batch updating mention sentiments
 */
export class UpdateMentionsSentimentBatchDto {
  @ApiProperty({
    description: 'Array of mention IDs to update',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  mentionIds: string[];
}

/**
 * DTO for querying sentiment trends
 */
export class GetSentimentTrendDto {
  @ApiPropertyOptional({
    description: 'Listening query ID to filter by',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  queryId?: string;

  @ApiPropertyOptional({
    description: 'Number of days to analyze',
    example: 30,
    default: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;

  @ApiPropertyOptional({
    description: 'Time interval for grouping',
    example: 'day',
    enum: ['day', 'hour'],
    default: 'day',
  })
  @IsOptional()
  @IsEnum(['day', 'hour'])
  interval?: 'day' | 'hour';
}

/**
 * DTO for querying topic sentiment breakdown
 */
export class GetTopicSentimentDto {
  @ApiPropertyOptional({
    description: 'Listening query ID to filter by',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  queryId?: string;

  @ApiPropertyOptional({
    description: 'Number of days to analyze',
    example: 30,
    default: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

/**
 * DTO for querying sentiment timeline
 */
export class GetSentimentTimelineDto {
  @ApiPropertyOptional({
    description: 'Listening query ID to filter by',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  queryId?: string;

  @ApiPropertyOptional({
    description: 'Number of days to analyze',
    example: 30,
    default: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}
