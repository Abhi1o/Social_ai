import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PERMISSION_MATCH_KEY, PermissionMatch } from '../decorators/permissions.decorator';
import { Permission } from '../enums/permission.enum';
import { getRolePermissions } from '../rbac/role-permissions';
import { User } from '../../user/entities/user.entity';

/**
 * Permissions Guard
 * Validates that the authenticated user has the required permissions
 * Works in conjunction with JwtAuthGuard
 * 
 * Requirements: 5.3, 5.4, 32.1
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Get permission matching strategy (default to ALL)
    const matchStrategy = this.reflector.getAllAndOverride<PermissionMatch>(
      PERMISSION_MATCH_KEY,
      [context.getHandler(), context.getClass()],
    ) || PermissionMatch.ALL;

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get user's permissions based on role
    const userPermissions = getRolePermissions(user.role);

    // Check if user has required permissions
    const hasPermission = this.checkPermissions(
      userPermissions,
      requiredPermissions,
      matchStrategy,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * Check if user permissions satisfy the requirements
   */
  private checkPermissions(
    userPermissions: Permission[],
    requiredPermissions: Permission[],
    matchStrategy: PermissionMatch,
  ): boolean {
    if (matchStrategy === PermissionMatch.ALL) {
      // User must have ALL required permissions
      return requiredPermissions.every(permission =>
        userPermissions.includes(permission),
      );
    } else {
      // User must have ANY of the required permissions
      return requiredPermissions.some(permission =>
        userPermissions.includes(permission),
      );
    }
  }
}
