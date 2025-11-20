import { IsString, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { EntityType } from '@prisma/client';

export class CreateEntityDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EntityType)
  type: EntityType;

  @IsOptional()
  @IsObject()
  values?: any; // For custom list entities

  @IsOptional()
  @IsString()
  pattern?: string; // For regex entities

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
