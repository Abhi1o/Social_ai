import { UserRole } from '../../user/entities/user.entity';
import { Permission } from '../enums/permission.enum';

/**
 * Role-Permission Mappings
 * Defines which permissions each role has
 * Based on Requirements 5.3, 5.4, 32.1
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  /**
   * ADMIN - Full administrative access
   * Can manage workspace, team, settings, and all content operations
   * First user in workspace is always ADMIN
   * Has all permissions including workspace deletion and billing
   */
  [UserRole.ADMIN]: [
    // Post permissions
    Permission.POSTS_CREATE,
    Permission.POSTS_READ,
    Permission.POSTS_UPDATE,
    Permission.POSTS_DELETE,
    Permission.POSTS_PUBLISH,
    Permission.POSTS_SCHEDULE,
    Permission.POSTS_APPROVE,

    // Analytics permissions
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_EXPORT,

    // Social Account permissions
    Permission.SOCIAL_ACCOUNTS_CREATE,
    Permission.SOCIAL_ACCOUNTS_READ,
    Permission.SOCIAL_ACCOUNTS_UPDATE,
    Permission.SOCIAL_ACCOUNTS_DELETE,

    // Media permissions
    Permission.MEDIA_CREATE,
    Permission.MEDIA_READ,
    Permission.MEDIA_UPDATE,
    Permission.MEDIA_DELETE,

    // Campaign permissions
    Permission.CAMPAIGNS_CREATE,
    Permission.CAMPAIGNS_READ,
    Permission.CAMPAIGNS_UPDATE,
    Permission.CAMPAIGNS_DELETE,

    // Inbox permissions
    Permission.INBOX_READ,
    Permission.INBOX_REPLY,
    Permission.INBOX_ASSIGN,
    Permission.INBOX_MANAGE,

    // Listening permissions
    Permission.LISTENING_READ,
    Permission.LISTENING_CREATE,
    Permission.LISTENING_UPDATE,
    Permission.LISTENING_DELETE,

    // Team permissions
    Permission.TEAM_READ,
    Permission.TEAM_INVITE,
    Permission.TEAM_UPDATE,
    Permission.TEAM_REMOVE,

    // Workspace permissions (full access for ADMIN)
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_DELETE,
    Permission.WORKSPACE_BILLING,

    // Workflow permissions
    Permission.WORKFLOWS_CREATE,
    Permission.WORKFLOWS_READ,
    Permission.WORKFLOWS_UPDATE,
    Permission.WORKFLOWS_DELETE,

    // AI permissions
    Permission.AI_GENERATE,
    Permission.AI_TRAIN,

    // Audit permissions
    Permission.AUDIT_READ,
  ],

  /**
   * MANAGER - Content and team management
   * Can create, edit, publish content and manage team members
   * Cannot manage workspace settings or delete social accounts
   */
  [UserRole.MANAGER]: [
    // Post permissions
    Permission.POSTS_CREATE,
    Permission.POSTS_READ,
    Permission.POSTS_UPDATE,
    Permission.POSTS_DELETE,
    Permission.POSTS_PUBLISH,
    Permission.POSTS_SCHEDULE,
    Permission.POSTS_APPROVE,

    // Analytics permissions
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_EXPORT,

    // Social Account permissions (read only)
    Permission.SOCIAL_ACCOUNTS_READ,

    // Media permissions
    Permission.MEDIA_CREATE,
    Permission.MEDIA_READ,
    Permission.MEDIA_UPDATE,
    Permission.MEDIA_DELETE,

    // Campaign permissions
    Permission.CAMPAIGNS_CREATE,
    Permission.CAMPAIGNS_READ,
    Permission.CAMPAIGNS_UPDATE,
    Permission.CAMPAIGNS_DELETE,

    // Inbox permissions
    Permission.INBOX_READ,
    Permission.INBOX_REPLY,
    Permission.INBOX_ASSIGN,
    Permission.INBOX_MANAGE,

    // Listening permissions
    Permission.LISTENING_READ,
    Permission.LISTENING_CREATE,
    Permission.LISTENING_UPDATE,

    // Team permissions (limited)
    Permission.TEAM_READ,
    Permission.TEAM_INVITE,

    // Workspace permissions (read only)
    Permission.WORKSPACE_READ,

    // Workflow permissions
    Permission.WORKFLOWS_CREATE,
    Permission.WORKFLOWS_READ,
    Permission.WORKFLOWS_UPDATE,

    // AI permissions
    Permission.AI_GENERATE,
  ],

  /**
   * EDITOR - Content creation and editing
   * Can create and edit content, but needs approval to publish
   * Cannot manage team or workspace settings
   */
  [UserRole.EDITOR]: [
    // Post permissions (no delete or approve)
    Permission.POSTS_CREATE,
    Permission.POSTS_READ,
    Permission.POSTS_UPDATE,
    Permission.POSTS_SCHEDULE,

    // Analytics permissions (read only)
    Permission.ANALYTICS_READ,

    // Social Account permissions (read only)
    Permission.SOCIAL_ACCOUNTS_READ,

    // Media permissions
    Permission.MEDIA_CREATE,
    Permission.MEDIA_READ,
    Permission.MEDIA_UPDATE,

    // Campaign permissions (limited)
    Permission.CAMPAIGNS_READ,

    // Inbox permissions
    Permission.INBOX_READ,
    Permission.INBOX_REPLY,

    // Listening permissions (read only)
    Permission.LISTENING_READ,

    // Team permissions (read only)
    Permission.TEAM_READ,

    // Workspace permissions (read only)
    Permission.WORKSPACE_READ,

    // Workflow permissions (read only)
    Permission.WORKFLOWS_READ,

    // AI permissions
    Permission.AI_GENERATE,
  ],

  /**
   * VIEWER - Read-only access
   * Can view content and analytics but cannot make changes
   */
  [UserRole.VIEWER]: [
    // Post permissions (read only)
    Permission.POSTS_READ,

    // Analytics permissions (read only)
    Permission.ANALYTICS_READ,

    // Social Account permissions (read only)
    Permission.SOCIAL_ACCOUNTS_READ,

    // Media permissions (read only)
    Permission.MEDIA_READ,

    // Campaign permissions (read only)
    Permission.CAMPAIGNS_READ,

    // Inbox permissions (read only)
    Permission.INBOX_READ,

    // Listening permissions (read only)
    Permission.LISTENING_READ,

    // Team permissions (read only)
    Permission.TEAM_READ,

    // Workspace permissions (read only)
    Permission.WORKSPACE_READ,

    // Workflow permissions (read only)
    Permission.WORKFLOWS_READ,
  ],
};

/**
 * Get permissions for a specific role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

/**
 * Check if a role has all of the specified permissions
 */
export function roleHasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = getRolePermissions(role);
  return permissions.every(permission => rolePermissions.includes(permission));
}

/**
 * Check if a role has any of the specified permissions
 */
export function roleHasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = getRolePermissions(role);
  return permissions.some(permission => rolePermissions.includes(permission));
}
