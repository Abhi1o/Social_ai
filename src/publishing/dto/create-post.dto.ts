import { IsString, IsArray, IsOptional, IsBoolean, IsDateString, ValidateNested, IsEnum, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { Platform } from '@prisma/client';

export class PostContentDto {
  @IsString()
  text: string;

  @IsArray()
  @IsUUID('4', { each: true })
  media: string[]; // media asset IDs

  @IsArray()
  @IsString({ each: true })
  hashtags: string[];

  @IsArray()
  @IsString({ each: true })
  mentions: string[];

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  firstComment?: string;
}

export class PlatformPostDto {
  @IsEnum(Platform)
  platform: Platform;

  @IsUUID()
  accountId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PostContentDto)
  customContent?: Partial<PostContentDto>;
}

export class CreatePostDto {
  @ValidateNested()
  @Type(() => PostContentDto)
  content: PostContentDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformPostDto)
  platforms: PlatformPostDto[];

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;
}
