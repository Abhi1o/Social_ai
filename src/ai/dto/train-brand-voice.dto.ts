import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  MinLength,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';

export class TrainBrandVoiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @MinLength(1)
  tone: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  vocabulary?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  avoidWords?: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one example is required for training' })
  examples: string[];

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  guidelines?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateBrandVoiceDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  @MinLength(1)
  tone?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  vocabulary?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  avoidWords?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  examples?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  guidelines?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class CheckBrandVoiceDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsString()
  brandVoiceId: string;
}
