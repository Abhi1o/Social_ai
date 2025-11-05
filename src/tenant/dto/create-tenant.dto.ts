import { IsString, IsEnum, IsOptional, IsNumber, IsObject } from 'class-validator';
import { PlanTier } from '../entities/tenant.entity';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsEnum(PlanTier)
  @IsOptional()
  planTier?: PlanTier;

  @IsString()
  @IsOptional()
  billingStatus?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;

  @IsNumber()
  @IsOptional()
  aiBudgetLimit?: number;
}