import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
} from 'class-validator';
import { Priority, Platform, ConversationType } from '@prisma/client';

export class CreateSLAConfigDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(Priority)
  priority: Priority;

  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  @IsInt()
  @Min(1)
  firstResponseTime: number; // in minutes

  @IsInt()
  @Min(1)
  resolutionTime: number; // in minutes

  @IsOptional()
  @IsBoolean()
  businessHoursOnly?: boolean;

  @IsOptional()
  @IsObject()
  businessHours?: {
    start: string;
    end: string;
    days: string[];
  };

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  escalationEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  escalationTime?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  escalateTo?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
