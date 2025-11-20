import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';
import { MessageDirection } from '@prisma/client';

export class CreateMessageDto {
  @IsString()
  conversationId: string;

  @IsEnum(MessageDirection)
  direction: MessageDirection;

  @IsString()
  content: string;

  @IsString()
  platformMessageId: string;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsNumber()
  sentiment?: number;

  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
