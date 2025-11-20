import { IsOptional, IsEnum, IsDateString, IsArray, IsString } from 'class-validator';
import { Platform, PostStatus } from '@prisma/client';

export class ExportPostsDto {
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postIds?: string[];
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}
