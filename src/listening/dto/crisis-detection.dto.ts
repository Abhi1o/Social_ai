import { IsString, IsNumber, IsEnum, IsArray, IsOptional, IsBoolean, Min, Max, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '@prisma/client';
import { CrisisStatus, CrisisSeverity, CrisisType, AlertChannel } from '../schemas/crisis.schema';

/**
 * DTO for monitoring workspace for crisis
 */
export class MonitorCrisisDto {
  @ApiPropertyOptional({ description: 'Sentiment threshold for detection', example: -0.5 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  sentimentThreshold?: number;

  @ApiPropertyOptional({ description: 'Volume change threshold percentage', example: 200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volumeThreshold?: number;

  @ApiPropertyOptional({ description: 'Time window in minutes', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  timeWindow?: number;

  @ApiPropertyOptional({ description: 'Minimum mentions required', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minMentions?: number;

  @ApiPropertyOptional({ description: 'Platforms to monitor', type: [String], enum: Platform })
  @IsOptional()
  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms?: Platform[];
}

/**
 * DTO for sending crisis alerts
 */
export class SendCrisisAlertsDto {
  @ApiProperty({ description: 'Alert channels to use', type: [String], enum: AlertChannel })
  @IsArray()
  @IsEnum(AlertChannel, { each: true })
  channels: AlertChannel[];

  @ApiProperty({ description: 'User IDs to alert', type: [String] })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiPropertyOptional({ description: 'Custom alert message' })
  @IsOptional()
  @IsString()
  customMessage?: string;
}

/**
 * DTO for updating crisis status
 */
export class UpdateCrisisStatusDto {
  @ApiProperty({ description: 'New crisis status', enum: CrisisStatus })
  @IsEnum(CrisisStatus)
  status: CrisisStatus;

  @ApiPropertyOptional({ description: 'Optional notes about the status change' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for adding crisis response
 */
export class AddCrisisResponseDto {
  @ApiProperty({ description: 'Action taken', example: 'Posted official statement' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ description: 'Response content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Platform where response was posted', enum: Platform })
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;
}

/**
 * DTO for creating post-mortem
 */
export class CreatePostMortemDto {
  @ApiProperty({ description: 'Root cause of the crisis' })
  @IsString()
  rootCause: string;

  @ApiProperty({ description: 'Response effectiveness score (0-100)', example: 85 })
  @IsNumber()
  @Min(0)
  @Max(100)
  responseEffectiveness: number;

  @ApiProperty({ description: 'Lessons learned', type: [String] })
  @IsArray()
  @IsString({ each: true })
  lessonsLearned: string[];

  @ApiProperty({ description: 'Preventive measures', type: [String] })
  @IsArray()
  @IsString({ each: true })
  preventiveMeasures: string[];
}

/**
 * DTO for assigning crisis
 */
export class AssignCrisisDto {
  @ApiProperty({ description: 'User IDs to assign', type: [String] })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

/**
 * DTO for querying crisis dashboard
 */
export class CrisisDashboardQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status', type: [String], enum: CrisisStatus })
  @IsOptional()
  @IsArray()
  @IsEnum(CrisisStatus, { each: true })
  status?: CrisisStatus[];

  @ApiPropertyOptional({ description: 'Filter by severity', type: [String], enum: CrisisSeverity })
  @IsOptional()
  @IsArray()
  @IsEnum(CrisisSeverity, { each: true })
  severity?: CrisisSeverity[];

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * DTO for querying crisis history
 */
export class CrisisHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Number of results to return', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ description: 'Include only crises with post-mortems' })
  @IsOptional()
  @IsBoolean()
  includePostMortems?: boolean;
}
