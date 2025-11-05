import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { PlanTier } from '../../tenant/entities/tenant.entity';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  tenantName: string;

  @IsEnum(PlanTier)
  @IsOptional()
  planTier?: PlanTier;
}