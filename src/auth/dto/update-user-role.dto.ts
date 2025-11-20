import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../user/entities/user.entity';

/**
 * DTO for updating user role
 */
export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
