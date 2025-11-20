import { IsString, IsOptional, IsObject } from 'class-validator';

export class ProcessMessageDto {
  @IsString()
  message: string;

  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
