import { IsString, IsOptional, IsObject } from 'class-validator';

export class ReplyWithTemplateDto {
  @IsString()
  templateId: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @IsOptional()
  @IsString()
  additionalContent?: string;
}
