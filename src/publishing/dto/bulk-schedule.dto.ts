import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePostDto } from './create-post.dto';

export class BulkScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePostDto)
  posts: CreatePostDto[];
}

export class BulkScheduleResult {
  success: boolean;
  totalPosts: number;
  successCount: number;
  failureCount: number;
  results: BulkPostResult[];
}

export class BulkPostResult {
  index: number;
  success: boolean;
  postId?: string;
  error?: string;
  validationErrors?: string[];
}
