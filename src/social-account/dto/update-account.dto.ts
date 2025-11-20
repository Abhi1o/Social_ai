import { IsBoolean, IsOptional, IsObject } from 'class-validator';

export class UpdateSocialAccountDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
