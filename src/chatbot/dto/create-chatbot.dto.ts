import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Platform } from '@prisma/client';

export class CreateChatbotDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  platforms: Platform[];

  @IsArray()
  @IsString({ each: true })
  accountIds: string[];

  @IsOptional()
  @IsString()
  greeting?: string;

  @IsOptional()
  @IsString()
  fallbackMessage?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
