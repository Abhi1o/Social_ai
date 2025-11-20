import { UserRole } from '../../user/entities/user.entity';
import { Permission } from '../enums/permission.enum';
import {
  getRolePermissions,
  roleHasPermission,
  roleHasAllPermissions,
  roleHasAnyPermission,
} from './role-permissions';

describe('Role Permissions', () => {
  describe('getRolePermissions', () => {
    it('should return all permissions for ADMIN role', () => {
      const permissions = getRolePermissions(UserRole.ADMIN);
      expect(permissions).toContain(Permission.POSTS_CREATE);
      expect(permissions).toContain(Permission.WORKSPACE_DELETE);
      expect(permissions).toContain(Permission.WORKSPACE_BILLING);
      expect(permissions).toContain(Permission.TEAM_REMOVE);
      expect(permissions.length).toBeGreaterThan(40);
    });

    it('should return limited permissions for VIEWER role', () => {
      const permissions = getRolePermissions(UserRole.VIEWER);
      expect(permissions).toContain(Permission.POSTS_READ);
      expect(permissions).not.toContain(Permission.POSTS_CREATE);
      expect(permissions).not.toContain(Permission.POSTS_DELETE);
      expect(permissions.length).toBeLessThan(15);
    });

    it('should return appropriate permissions for EDITOR role', () => {
      const permissions = getRolePermissions(UserRole.EDITOR);
      expect(permissions).toContain(Permission.POSTS_CREATE);
      expect(permissions).toContain(Permission.POSTS_READ);
      expect(permissions).toContain(Permission.POSTS_UPDATE);
      expect(permissions).not.toContain(Permission.POSTS_DELETE);
      expect(permissions).not.toContain(Permission.POSTS_APPROVE);
    });

    it('should return management permissions for MANAGER role', () => {
      const permissions = getRolePermissions(UserRole.MANAGER);
      expect(permissions).toContain(Permission.POSTS_CREATE);
      expect(permissions).toContain(Permission.POSTS_APPROVE);
      expect(permissions).toContain(Permission.TEAM_INVITE);
      expect(permissions).not.toContain(Permission.WORKSPACE_DELETE);
      expect(permissions).not.toContain(Permission.WORKSPACE_BILLING);
    });
  });

  describe('roleHasPermission', () => {
    it('should return true when role has permission', () => {
      expect(roleHasPermission(UserRole.EDITOR, Permission.POSTS_CREATE)).toBe(true);
      expect(roleHasPermission(UserRole.MANAGER, Permission.POSTS_APPROVE)).toBe(true);
      expect(roleHasPermission(UserRole.ADMIN, Permission.WORKSPACE_DELETE)).toBe(true);
    });

    it('should return false when role does not have permission', () => {
      expect(roleHasPermission(UserRole.VIEWER, Permission.POSTS_CREATE)).toBe(false);
      expect(roleHasPermission(UserRole.EDITOR, Permission.POSTS_DELETE)).toBe(false);
      expect(roleHasPermission(UserRole.MANAGER, Permission.WORKSPACE_DELETE)).toBe(false);
    });
  });

  describe('roleHasAllPermissions', () => {
    it('should return true when role has all permissions', () => {
      expect(
        roleHasAllPermissions(UserRole.EDITOR, [
          Permission.POSTS_CREATE,
          Permission.POSTS_READ,
          Permission.POSTS_UPDATE,
        ])
      ).toBe(true);

      expect(
        roleHasAllPermissions(UserRole.MANAGER, [
          Permission.POSTS_CREATE,
          Permission.POSTS_APPROVE,
          Permission.TEAM_INVITE,
        ])
      ).toBe(true);
    });

    it('should return false when role is missing any permission', () => {
      expect(
        roleHasAllPermissions(UserRole.EDITOR, [
          Permission.POSTS_CREATE,
          Permission.POSTS_DELETE, // EDITOR doesn't have this
        ])
      ).toBe(false);

      expect(
        roleHasAllPermissions(UserRole.VIEWER, [
          Permission.POSTS_READ,
          Permission.POSTS_CREATE, // VIEWER doesn't have this
        ])
      ).toBe(false);
    });
  });

  describe('roleHasAnyPermission', () => {
    it('should return true when role has at least one permission', () => {
      expect(
        roleHasAnyPermission(UserRole.EDITOR, [
          Permission.POSTS_CREATE, // Has this
          Permission.POSTS_DELETE, // Doesn't have this
        ])
      ).toBe(true);

      expect(
        roleHasAnyPermission(UserRole.VIEWER, [
          Permission.POSTS_READ, // Has this
          Permission.POSTS_CREATE, // Doesn't have this
        ])
      ).toBe(true);
    });

    it('should return false when role has none of the permissions', () => {
      expect(
        roleHasAnyPermission(UserRole.VIEWER, [
          Permission.POSTS_CREATE,
          Permission.POSTS_DELETE,
          Permission.TEAM_INVITE,
        ])
      ).toBe(false);

      expect(
        roleHasAnyPermission(UserRole.EDITOR, [
          Permission.WORKSPACE_DELETE,
          Permission.WORKSPACE_BILLING,
        ])
      ).toBe(false);
    });
  });

  describe('Permission Hierarchy', () => {
    it('should ensure ADMIN has more permissions than MANAGER', () => {
      const adminPerms = getRolePermissions(UserRole.ADMIN);
      const managerPerms = getRolePermissions(UserRole.MANAGER);
      expect(adminPerms.length).toBeGreaterThan(managerPerms.length);
    });

    it('should ensure MANAGER has more permissions than EDITOR', () => {
      const managerPerms = getRolePermissions(UserRole.MANAGER);
      const editorPerms = getRolePermissions(UserRole.EDITOR);
      expect(managerPerms.length).toBeGreaterThan(editorPerms.length);
    });

    it('should ensure EDITOR has more permissions than VIEWER', () => {
      const editorPerms = getRolePermissions(UserRole.EDITOR);
      const viewerPerms = getRolePermissions(UserRole.VIEWER);
      expect(editorPerms.length).toBeGreaterThan(viewerPerms.length);
    });
  });

  describe('Specific Permission Requirements', () => {
    it('should ensure only ADMIN can remove team members', () => {
      expect(roleHasPermission(UserRole.ADMIN, Permission.TEAM_REMOVE)).toBe(true);
      expect(roleHasPermission(UserRole.MANAGER, Permission.TEAM_REMOVE)).toBe(false);
      expect(roleHasPermission(UserRole.EDITOR, Permission.TEAM_REMOVE)).toBe(false);
      expect(roleHasPermission(UserRole.VIEWER, Permission.TEAM_REMOVE)).toBe(false);
    });

    it('should ensure only ADMIN can manage billing', () => {
      expect(roleHasPermission(UserRole.ADMIN, Permission.WORKSPACE_BILLING)).toBe(true);
      expect(roleHasPermission(UserRole.MANAGER, Permission.WORKSPACE_BILLING)).toBe(false);
      expect(roleHasPermission(UserRole.EDITOR, Permission.WORKSPACE_BILLING)).toBe(false);
    });

    it('should ensure EDITOR cannot publish without approval', () => {
      expect(roleHasPermission(UserRole.EDITOR, Permission.POSTS_CREATE)).toBe(true);
      expect(roleHasPermission(UserRole.EDITOR, Permission.POSTS_PUBLISH)).toBe(false);
    });

    it('should ensure MANAGER and ADMIN can approve posts', () => {
      expect(roleHasPermission(UserRole.ADMIN, Permission.POSTS_APPROVE)).toBe(true);
      expect(roleHasPermission(UserRole.MANAGER, Permission.POSTS_APPROVE)).toBe(true);
      expect(roleHasPermission(UserRole.EDITOR, Permission.POSTS_APPROVE)).toBe(false);
      expect(roleHasPermission(UserRole.VIEWER, Permission.POSTS_APPROVE)).toBe(false);
    });

    it('should ensure all roles can read posts', () => {
      expect(roleHasPermission(UserRole.ADMIN, Permission.POSTS_READ)).toBe(true);
      expect(roleHasPermission(UserRole.MANAGER, Permission.POSTS_READ)).toBe(true);
      expect(roleHasPermission(UserRole.EDITOR, Permission.POSTS_READ)).toBe(true);
      expect(roleHasPermission(UserRole.VIEWER, Permission.POSTS_READ)).toBe(true);
    });
  });
});
