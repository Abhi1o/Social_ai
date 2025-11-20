import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';

/**
 * Metadata key for permissions
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Permissions Decorator
 * Use this decorator to protect routes with specific permissions
 * 
 * @example
 * @Permissions(Permission.POSTS_CREATE, Permission.POSTS_UPDATE)
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * async createPost() { ... }
 */
export const Permissions = (...permissions: Permission[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Metadata key for permission matching strategy
 */
export const PERMISSION_MATCH_KEY = 'permission_match';

/**
 * Permission matching strategy
 */
export enum PermissionMatch {
  ALL = 'all',  // User must have ALL specified permissions
  ANY = 'any',  // User must have ANY of the specified permissions
}

/**
 * Permission Match Decorator
 * Specifies whether user needs ALL or ANY of the permissions
 * Default is ALL
 * 
 * @example
 * @Permissions(Permission.POSTS_READ, Permission.ANALYTICS_READ)
 * @PermissionMatch(PermissionMatch.ANY)
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * async getDashboard() { ... }
 */
export const PermissionMatchStrategy = (match: PermissionMatch) =>
  SetMetadata(PERMISSION_MATCH_KEY, match);
