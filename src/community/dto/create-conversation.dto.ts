import { IsString, IsEnum, IsOptional, IsArray, IsDateString } from 'class-validator';
import { Platform, ConversationType, Priority, Sentiment } from '@prisma/client';

export class CreateConversationDto {
  @IsString()
  accountId: string;

  @IsEnum(Platform)
  platform: Platform;

  @IsEnum(ConversationType)
  type: ConversationType;

  @IsString()
  participantId: string;

  @IsString()
  participantName: string;

  @IsOptional()
  @IsString()
  participantAvatar?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(Sentiment)
  sentiment?: Sentiment;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsDateString()
  slaDeadline?: string;
}
