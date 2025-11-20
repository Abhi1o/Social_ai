import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ContentTone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  FRIENDLY = 'friendly',
  FORMAL = 'formal',
  HUMOROUS = 'humorous',
}

export class ContentContextDto {
  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsEnum(ContentTone)
  tone?: ContentTone;

  @IsArray()
  @IsString({ each: true })
  platforms: string[];

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class GenerateContentDto {
  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContentContextDto)
  context?: ContentContextDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  variations?: number;

  @IsOptional()
  @IsString()
  brandVoiceId?: string;
}

export class OptimizeContentDto {
  @IsString()
  content: string;

  @IsString()
  platform: string;

  @IsArray()
  @IsEnum(['engagement', 'reach', 'conversions'], { each: true })
  optimizationGoals: ('engagement' | 'reach' | 'conversions')[];
}

export class CheckBrandVoiceDto {
  @IsString()
  content: string;

  @IsString()
  brandVoiceId: string;
}

export class TrainBrandVoiceDto {
  @IsOptional()
  @IsString()
  brandVoiceId?: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  tone: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vocabulary?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidWords?: string[];

  @IsArray()
  @IsString({ each: true })
  examples: string[];

  @IsOptional()
  @IsString()
  guidelines?: string;
}
