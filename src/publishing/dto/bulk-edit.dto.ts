import { IsArray, IsOptional, IsDateString, IsEnum, IsUUID, IsString } from 'class-validator';
import { Platform, PostStatus } from '@prisma/client';

export class BulkEditDto {
  @IsArray()
  @IsUUID('4', { each: true })
  postIds: string[];

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms?: Platform[];

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsUUID()
  campaignId?: string;
}

export class BulkEditResult {
  success: boolean;
  totalPosts: number;
  successCount: number;
  failureCount: number;
  results: BulkEditPostResult[];
}

export class BulkEditPostResult {
  postId: string;
  success: boolean;
  error?: string;
}
