import { IsString, IsOptional, IsArray, IsNumber, IsBoolean } from 'class-validator';

export class CreateIntentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  trainingPhrases: string[];

  @IsArray()
  @IsString({ each: true })
  responses: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredEntities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionalEntities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inputContexts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  outputContexts?: string[];

  @IsOptional()
  @IsNumber()
  lifespan?: number;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
