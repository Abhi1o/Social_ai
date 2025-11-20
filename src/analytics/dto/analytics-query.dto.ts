import { IsDateString, IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class AnalyticsQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  platforms?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  accountIds?: string[];
}

export class TimeSeriesQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  @IsEnum(['hourly', 'daily', 'weekly', 'monthly'])
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily';
}

export class PostPerformanceQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['engagement', 'reach', 'impressions', 'likes', 'comments'])
  sortBy?: string = 'engagement';

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  platforms?: string[];
}
