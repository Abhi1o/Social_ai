import { IsOptional, IsEnum, IsInt, Min, Max, IsDateString, IsString, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Platform, Sentiment } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryMentionsDto {
  @ApiPropertyOptional({ description: 'Listening query ID to filter by' })
  @IsOptional()
  @IsString()
  queryId?: string;

  @ApiPropertyOptional({ 
    description: 'Platform to filter by', 
    enum: Platform 
  })
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @ApiPropertyOptional({ 
    description: 'Sentiment to filter by', 
    enum: Sentiment 
  })
  @IsOptional()
  @IsEnum(Sentiment)
  sentiment?: Sentiment;

  @ApiPropertyOptional({ description: 'Start date for filtering (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by language code' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Filter by location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Filter by influencer status' })
  @IsOptional()
  @IsString()
  isInfluencer?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by tags', 
    type: [String] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Page number', 
    default: 1,
    minimum: 1 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Items per page', 
    default: 50,
    minimum: 1,
    maximum: 100 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ 
    description: 'Sort field',
    enum: ['publishedAt', 'reach', 'likes', 'sentimentScore'],
    default: 'publishedAt'
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'publishedAt';

  @ApiPropertyOptional({ 
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
