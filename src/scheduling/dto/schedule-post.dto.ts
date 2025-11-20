import { IsDateString, IsOptional, IsString, IsTimeZone } from 'class-validator';

export class SchedulePostDto {
  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}

export class ReschedulePostDto {
  @IsDateString()
  newScheduledAt: string;

  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}

export class OptimalTimeRequestDto {
  @IsString()
  platform: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsTimeZone()
  timezone?: string;
}
