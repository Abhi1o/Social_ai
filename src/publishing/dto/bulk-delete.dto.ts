import { IsArray, IsBoolean, IsUUID } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  @IsUUID('4', { each: true })
  postIds: string[];

  @IsBoolean()
  confirmed: boolean;
}

export class BulkDeleteResult {
  success: boolean;
  totalPosts: number;
  successCount: number;
  failureCount: number;
  results: BulkDeletePostResult[];
}

export class BulkDeletePostResult {
  postId: string;
  success: boolean;
  error?: string;
}
