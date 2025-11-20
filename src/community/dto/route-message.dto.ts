import { IsString, IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO for routing a message
 */
export class RouteMessageDto {
  @IsString()
  messageId: string;

  @IsOptional()
  @IsBoolean()
  applyRules?: boolean = true;

  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean = true;
}

/**
 * DTO for batch routing
 */
export class BatchRouteDto {
  @IsString({ each: true })
  messageIds: string[];

  @IsOptional()
  @IsBoolean()
  applyRules?: boolean = true;

  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean = true;
}
