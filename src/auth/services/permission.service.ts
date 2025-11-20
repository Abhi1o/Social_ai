import { Injectable } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';
import { UserRole } from '../../user/entities/user.entity';
import { 
  getRolePermissions, 
  roleHasPermission, 
  roleHasAllPermissions, 
  roleHasAnyPermission 
} from '../rbac/role-permissions';

/**
 * Permission Service
 * Provides utilities for checking user permissions
 * 
 * Requirements: 5.3, 5.4, 32.1
 */
@Injectable()
export class PermissionService {
  /**
   * Get all permissions for a role
   */
  getPermissionsForRole(role: UserRole): Permission[] {
    return getRolePermissions(role);
  }

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: UserRole, permission: Permission): boolean {
    return roleHasPermission(role, permission);
  }

  /**
   * Check if a role has all of the specified permissions
   */
  hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
    return roleHasAllPermissions(role, permissions);
  }

  /**
   * Check if a role has any of the specified permissions
   */
  hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
    return roleHasAnyPermission(role, permissions);
  }

  /**
   * Get missing permissions for a role
   * Returns permissions that the role does NOT have
   */
  getMissingPermissions(role: UserRole, requiredPermissions: Permission[]): Permission[] {
    const rolePermissions = getRolePermissions(role);
    return requiredPermissions.filter(permission => !rolePermissions.includes(permission));
  }

  /**
   * Check if a user can perform an action on a resource
   * This is a convenience method that constructs the permission string
   */
  canPerformAction(role: UserRole, resource: string, action: string): boolean {
    const permission = `${resource}:${action}` as Permission;
    return this.hasPermission(role, permission);
  }

  /**
   * Get all roles that have a specific permission
   */
  getRolesWithPermission(permission: Permission): UserRole[] {
    const roles: UserRole[] = [];
    
    for (const role of Object.values(UserRole)) {
      if (this.hasPermission(role, permission)) {
        roles.push(role);
      }
    }
    
    return roles;
  }

  /**
   * Compare two roles and determine if one has more permissions than the other
   * Returns:
   *  1 if role1 has more permissions
   *  0 if they have equal permissions
   * -1 if role2 has more permissions
   */
  compareRoles(role1: UserRole, role2: UserRole): number {
    const permissions1 = getRolePermissions(role1);
    const permissions2 = getRolePermissions(role2);
    
    if (permissions1.length > permissions2.length) return 1;
    if (permissions1.length < permissions2.length) return -1;
    return 0;
  }

  /**
   * Check if a role can manage another role
   * Generally, a role can manage roles with fewer permissions
   */
  canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
    // Admin can manage everyone
    if (managerRole === UserRole.ADMIN) return true;
    
    // Manager can manage Editor and Viewer
    if (managerRole === UserRole.MANAGER && 
        (targetRole === UserRole.EDITOR || targetRole === UserRole.VIEWER)) {
      return true;
    }
    
    // Others cannot manage roles
    return false;
  }

  /**
   * Get permission hierarchy
   * Returns roles ordered by permission level (most to least)
   */
  getRoleHierarchy(): UserRole[] {
    return [
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.EDITOR,
      UserRole.VIEWER,
    ];
  }

  /**
   * Check if a role is higher in hierarchy than another
   */
  isHigherRole(role1: UserRole, role2: UserRole): boolean {
    const hierarchy = this.getRoleHierarchy();
    const index1 = hierarchy.indexOf(role1);
    const index2 = hierarchy.indexOf(role2);
    
    return index1 < index2;
  }
}
