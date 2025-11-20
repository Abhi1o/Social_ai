import { IsString, IsNumber, IsOptional, IsArray, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class PredictEngagementDto {
  @IsNumber()
  @Min(0)
  @Max(23)
  timeOfDay: number;

  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsNumber()
  @Min(0)
  contentLength: number;

  @IsNumber()
  @Min(0)
  hashtagCount: number;

  @IsNumber()
  @Min(0)
  mediaCount: number;

  @IsString()
  platform: string;
}

export class ForecastReachDto {
  @IsString()
  platform: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(90)
  daysAhead?: number = 7;
}

export class PredictTrendsDto {
  @IsString()
  platform: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  metrics?: string[] = ['engagement', 'reach', 'followers'];

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(90)
  daysAhead?: number = 30;
}

export class DetectAnomaliesDto {
  @IsString()
  platform: string;

  @Type(() => Date)
  startDate: Date;

  @Type(() => Date)
  endDate: Date;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  sensitivity?: number = 2.5;
}

export class GenerateInsightsDto {
  @IsString()
  platform: string;

  @Type(() => Date)
  startDate: Date;

  @Type(() => Date)
  endDate: Date;
}
