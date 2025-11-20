import { IsOptional, IsString, IsArray, IsEnum, IsDateString } from 'class-validator';

export class AudienceAnalyticsQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accountIds?: string[];
}

export class AudienceSegmentQueryDto extends AudienceAnalyticsQueryDto {
  @IsOptional()
  @IsEnum(['age', 'gender', 'location', 'interests', 'language'])
  segmentBy?: 'age' | 'gender' | 'location' | 'interests' | 'language';
}

export class AudienceGrowthQueryDto extends AudienceAnalyticsQueryDto {
  @IsOptional()
  @IsEnum(['hourly', 'daily', 'weekly', 'monthly'])
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly';
}
