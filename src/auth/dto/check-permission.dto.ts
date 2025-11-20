import { IsEnum, IsArray, IsOptional } from 'class-validator';
import { Permission } from '../enums/permission.enum';
import { UserRole } from '../../user/entities/user.entity';

/**
 * DTO for checking permissions
 */
export class CheckPermissionDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];

  @IsOptional()
  matchAll?: boolean; // If true, check if role has ALL permissions; if false, check ANY
}
