import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from './permission.service';
import { UserRole } from '../../user/entities/user.entity';
import { Permission } from '../enums/permission.enum';

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionService],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPermissionsForRole', () => {
    it('should return permissions for a role', () => {
      const permissions = service.getPermissionsForRole(UserRole.EDITOR);
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
    });
  });

  describe('hasPermission', () => {
    it('should return true for valid permission', () => {
      expect(service.hasPermission(UserRole.EDITOR, Permission.POSTS_CREATE)).toBe(true);
    });

    it('should return false for invalid permission', () => {
      expect(service.hasPermission(UserRole.VIEWER, Permission.POSTS_CREATE)).toBe(false);
    });
  });

  describe('getMissingPermissions', () => {
    it('should return missing permissions', () => {
      const missing = service.getMissingPermissions(UserRole.EDITOR, [
        Permission.POSTS_CREATE,
        Permission.POSTS_DELETE,
      ]);
      expect(missing).toContain(Permission.POSTS_DELETE);
      expect(missing).not.toContain(Permission.POSTS_CREATE);
    });

    it('should return empty array when all permissions present', () => {
      const missing = service.getMissingPermissions(UserRole.EDITOR, [
        Permission.POSTS_CREATE,
        Permission.POSTS_READ,
      ]);
      expect(missing).toEqual([]);
    });
  });

  describe('canPerformAction', () => {
    it('should check action on resource', () => {
      expect(service.canPerformAction(UserRole.EDITOR, 'posts', 'create')).toBe(true);
      expect(service.canPerformAction(UserRole.VIEWER, 'posts', 'create')).toBe(false);
    });
  });

  describe('getRolesWithPermission', () => {
    it('should return roles with specific permission', () => {
      const roles = service.getRolesWithPermission(Permission.POSTS_CREATE);
      expect(roles).toContain(UserRole.ADMIN);
      expect(roles).toContain(UserRole.MANAGER);
      expect(roles).toContain(UserRole.EDITOR);
      expect(roles).not.toContain(UserRole.VIEWER);
    });

    it('should return only ADMIN for billing permission', () => {
      const roles = service.getRolesWithPermission(Permission.WORKSPACE_BILLING);
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });

  describe('compareRoles', () => {
    it('should return 1 when first role has more permissions', () => {
      expect(service.compareRoles(UserRole.ADMIN, UserRole.EDITOR)).toBe(1);
    });

    it('should return -1 when second role has more permissions', () => {
      expect(service.compareRoles(UserRole.EDITOR, UserRole.ADMIN)).toBe(-1);
    });

    it('should return 0 when roles have equal permissions', () => {
      expect(service.compareRoles(UserRole.EDITOR, UserRole.EDITOR)).toBe(0);
    });
  });

  describe('canManageRole', () => {
    it('should allow ADMIN to manage all roles', () => {
      expect(service.canManageRole(UserRole.ADMIN, UserRole.MANAGER)).toBe(true);
      expect(service.canManageRole(UserRole.ADMIN, UserRole.EDITOR)).toBe(true);
      expect(service.canManageRole(UserRole.ADMIN, UserRole.VIEWER)).toBe(true);
    });

    it('should allow MANAGER to manage EDITOR and VIEWER', () => {
      expect(service.canManageRole(UserRole.MANAGER, UserRole.ADMIN)).toBe(false);
      expect(service.canManageRole(UserRole.MANAGER, UserRole.EDITOR)).toBe(true);
      expect(service.canManageRole(UserRole.MANAGER, UserRole.VIEWER)).toBe(true);
    });

    it('should not allow EDITOR to manage any role', () => {
      expect(service.canManageRole(UserRole.EDITOR, UserRole.ADMIN)).toBe(false);
      expect(service.canManageRole(UserRole.EDITOR, UserRole.MANAGER)).toBe(false);
      expect(service.canManageRole(UserRole.EDITOR, UserRole.VIEWER)).toBe(false);
    });
  });

  describe('getRoleHierarchy', () => {
    it('should return roles in correct order', () => {
      const hierarchy = service.getRoleHierarchy();
      expect(hierarchy).toEqual([
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.EDITOR,
        UserRole.VIEWER,
      ]);
    });
  });

  describe('isHigherRole', () => {
    it('should return true when first role is higher', () => {
      expect(service.isHigherRole(UserRole.ADMIN, UserRole.EDITOR)).toBe(true);
      expect(service.isHigherRole(UserRole.ADMIN, UserRole.VIEWER)).toBe(true);
      expect(service.isHigherRole(UserRole.MANAGER, UserRole.VIEWER)).toBe(true);
    });

    it('should return false when first role is lower', () => {
      expect(service.isHigherRole(UserRole.EDITOR, UserRole.ADMIN)).toBe(false);
      expect(service.isHigherRole(UserRole.VIEWER, UserRole.ADMIN)).toBe(false);
      expect(service.isHigherRole(UserRole.VIEWER, UserRole.MANAGER)).toBe(false);
    });

    it('should return false when roles are equal', () => {
      expect(service.isHigherRole(UserRole.EDITOR, UserRole.EDITOR)).toBe(false);
    });
  });
});
