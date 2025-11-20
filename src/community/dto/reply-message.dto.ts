import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class ReplyMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media?: string[];

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;
}
