import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { Permission } from '../enums/permission.enum';
import { PermissionService } from '../services/permission.service';
import { UserService } from '../../user/user.service';
import { CheckPermissionDto } from '../dto/check-permission.dto';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';
import { UserRole } from '../../user/entities/user.entity';
import { WorkspaceId } from '../middleware/workspace-isolation.middleware';

/**
 * Permissions Controller
 * Manages permission checking and user role updates
 * 
 * Requirements: 5.3, 5.4, 32.1
 */
@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly userService: UserService,
  ) {}

  /**
   * Get all permissions for a specific role
   * GET /permissions/roles/:role
   */
  @Get('roles/:role')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.TEAM_READ)
  async getRolePermissions(@Param('role') role: UserRole) {
    const permissions = this.permissionService.getPermissionsForRole(role);
    
    return {
      role,
      permissions,
      count: permissions.length,
    };
  }

  /**
   * Get all available permissions in the system
   * GET /permissions
   */
  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.TEAM_READ)
  async getAllPermissions() {
    return {
      permissions: Object.values(Permission),
      count: Object.values(Permission).length,
    };
  }

  /**
   * Check if a role has specific permissions
   * POST /permissions/check
   */
  @Post('check')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.TEAM_READ)
  async checkPermissions(@Body() dto: CheckPermissionDto) {
    const hasPermission = dto.matchAll
      ? this.permissionService.hasAllPermissions(dto.role, dto.permissions)
      : this.permissionService.hasAnyPermission(dto.role, dto.permissions);

    const missingPermissions = dto.matchAll
      ? this.permissionService.getMissingPermissions(dto.role, dto.permissions)
      : [];

    return {
      role: dto.role,
      requestedPermissions: dto.permissions,
      hasPermission,
      missingPermissions,
    };
  }

  /**
   * Get role hierarchy
   * GET /permissions/hierarchy
   */
  @Get('hierarchy')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.TEAM_READ)
  async getRoleHierarchy() {
    const hierarchy = this.permissionService.getRoleHierarchy();
    
    return {
      hierarchy,
      roles: hierarchy.map(role => ({
        role,
        permissions: this.permissionService.getPermissionsForRole(role),
        permissionCount: this.permissionService.getPermissionsForRole(role).length,
      })),
    };
  }

  /**
   * Update user role
   * POST /permissions/users/:userId/role
   */
  @Post('users/:userId/role')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.TEAM_UPDATE)
  async updateUserRole(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
    @WorkspaceId() tenantId: string,
  ) {
    // Get the target user to verify they exist and belong to the same tenant
    const targetUser = await this.userService.findOne(userId, tenantId);

    // Update the role
    const updatedUser = await this.userService.updateRole(userId, dto.role);

    // Remove sensitive data
    const { password, refreshToken, ...userWithoutSensitiveData } = updatedUser;

    return {
      message: 'User role updated successfully',
      user: userWithoutSensitiveData,
      newPermissions: this.permissionService.getPermissionsForRole(dto.role),
    };
  }

  /**
   * Get roles that have a specific permission
   * GET /permissions/:permission/roles
   */
  @Get(':permission/roles')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.TEAM_READ)
  async getRolesWithPermission(@Param('permission') permission: Permission) {
    const roles = this.permissionService.getRolesWithPermission(permission);
    
    return {
      permission,
      roles,
      count: roles.length,
    };
  }

  /**
   * Compare two roles
   * GET /permissions/compare/:role1/:role2
   */
  @Get('compare/:role1/:role2')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.TEAM_READ)
  async compareRoles(
    @Param('role1') role1: UserRole,
    @Param('role2') role2: UserRole,
  ) {
    const comparison = this.permissionService.compareRoles(role1, role2);
    const isHigher = this.permissionService.isHigherRole(role1, role2);
    const canManage = this.permissionService.canManageRole(role1, role2);

    return {
      role1: {
        role: role1,
        permissions: this.permissionService.getPermissionsForRole(role1),
        permissionCount: this.permissionService.getPermissionsForRole(role1).length,
      },
      role2: {
        role: role2,
        permissions: this.permissionService.getPermissionsForRole(role2),
        permissionCount: this.permissionService.getPermissionsForRole(role2).length,
      },
      comparison: {
        result: comparison,
        role1IsHigher: isHigher,
        role1CanManageRole2: canManage,
      },
    };
  }
}
