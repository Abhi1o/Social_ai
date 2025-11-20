# Role-Based Access Control (RBAC) Implementation Guide

## Overview

This document provides a comprehensive guide to the Role-Based Access Control (RBAC) system implemented in the AI Social Media Management Platform. The RBAC system ensures secure, granular access control across all platform features while maintaining workspace/tenant isolation.

**Requirements Coverage:** 5.3, 5.4, 32.1

## Architecture

### Components

1. **Permission Enum** (`src/auth/enums/permission.enum.ts`)
   - Defines all available permissions in the system
   - Format: `RESOURCE_ACTION` (e.g., `posts:create`, `team:invite`)
   - Organized by resource type for easy management

2. **Role-Permission Mappings** (`src/auth/rbac/role-permissions.ts`)
   - Maps each role to its set of permissions
   - Implements permission hierarchy
   - Provides utility functions for permission checking

3. **Permission Guard** (`src/auth/guards/permissions.guard.ts`)
   - NestJS guard that validates user permissions
   - Works with `@Permissions()` decorator
   - Supports ALL or ANY matching strategies

4. **Workspace Isolation Middleware** (`src/auth/middleware/workspace-isolation.middleware.ts`)
   - Ensures complete tenant separation
   - Validates workspace/tenant access on every request
   - Prevents cross-tenant data access

5. **Permission Service** (`src/auth/services/permission.service.ts`)
   - Provides programmatic permission checking
   - Offers role comparison and hierarchy utilities
   - Used for dynamic permission validation

6. **Permissions Controller** (`src/auth/controllers/permissions.controller.ts`)
   - REST API for permission management
   - Role assignment and permission queries
   - Permission hierarchy information

## User Roles

### Role Hierarchy (Highest to Lowest)

1. **ADMIN** - Full administrative access
2. **MANAGER** - Content and team management
3. **EDITOR** - Content creation and editing
4. **VIEWER** - Read-only access

### Role Permissions Matrix

| Permission Category | ADMIN | MANAGER | EDITOR | VIEWER |
|-------------------|-------|---------|--------|--------|
| **Posts** |
| Create | ✓ | ✓ | ✓ | ✗ |
| Read | ✓ | ✓ | ✓ | ✓ |
| Update | ✓ | ✓ | ✓ | ✗ |
| Delete | ✓ | ✓ | ✗ | ✗ |
| Publish | ✓ | ✓ | ✗ | ✗ |
| Schedule | ✓ | ✓ | ✓ | ✗ |
| Approve | ✓ | ✓ | ✗ | ✗ |
| **Analytics** |
| Read | ✓ | ✓ | ✓ | ✓ |
| Export | ✓ | ✓ | ✗ | ✗ |
| **Social Accounts** |
| Create | ✓ | ✗ | ✗ | ✗ |
| Read | ✓ | ✓ | ✓ | ✓ |
| Update | ✓ | ✗ | ✗ | ✗ |
| Delete | ✓ | ✗ | ✗ | ✗ |
| **Team** |
| Read | ✓ | ✓ | ✓ | ✓ |
| Invite | ✓ | ✓ | ✗ | ✗ |
| Update | ✓ | ✗ | ✗ | ✗ |
| Remove | ✓ | ✗ | ✗ | ✗ |
| **Workspace** |
| Read | ✓ | ✓ | ✓ | ✓ |
| Update | ✓ | ✗ | ✗ | ✗ |
| Delete | ✓ | ✗ | ✗ | ✗ |
| Billing | ✓ | ✗ | ✗ | ✗ |
| **AI** |
| Generate | ✓ | ✓ | ✓ | ✗ |
| Train | ✓ | ✗ | ✗ | ✗ |

## Usage Guide

### 1. Protecting Routes with Permissions

Use the `@Permissions()` decorator along with guards to protect routes:

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

@Controller('posts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PostsController {
  
  // Requires POSTS_CREATE permission
  @Post()
  @Permissions(Permission.POSTS_CREATE)
  async createPost() {
    // Only users with POSTS_CREATE permission can access
  }
  
  // Requires POSTS_READ permission
  @Get()
  @Permissions(Permission.POSTS_READ)
  async getPosts() {
    // All authenticated users can read posts
  }
  
  // Requires POSTS_DELETE permission
  @Delete(':id')
  @Permissions(Permission.POSTS_DELETE)
  async deletePost() {
    // Only ADMIN and MANAGER can delete posts
  }
}
```

### 2. Multiple Permissions (ALL Required)

By default, users must have ALL specified permissions:

```typescript
@Post('publish')
@Permissions(Permission.POSTS_CREATE, Permission.POSTS_PUBLISH)
async publishPost() {
  // User must have BOTH permissions
}
```

### 3. Multiple Permissions (ANY Required)

Use `@PermissionMatchStrategy()` for ANY matching:

```typescript
import { PermissionMatchStrategy, PermissionMatch } from '../auth/decorators/permissions.decorator';

@Get('dashboard')
@Permissions(Permission.POSTS_READ, Permission.ANALYTICS_READ)
@PermissionMatchStrategy(PermissionMatch.ANY)
async getDashboard() {
  // User needs EITHER permission
}
```

### 4. Workspace Isolation

The workspace isolation middleware automatically validates tenant access. Use the `@WorkspaceId()` or `@TenantId()` decorator to get the validated workspace ID:

```typescript
import { WorkspaceId } from '../auth/middleware/workspace-isolation.middleware';

@Get()
async getPosts(@WorkspaceId() tenantId: string) {
  // tenantId is guaranteed to match the authenticated user's tenant
  return this.postsService.findAll(tenantId);
}
```

### 5. Programmatic Permission Checking

Use the `PermissionService` for dynamic permission checks:

```typescript
import { PermissionService } from '../auth/services/permission.service';

@Injectable()
export class MyService {
  constructor(private permissionService: PermissionService) {}
  
  async doSomething(user: User) {
    // Check single permission
    if (this.permissionService.hasPermission(user.role, Permission.POSTS_CREATE)) {
      // User can create posts
    }
    
    // Check multiple permissions (ALL)
    if (this.permissionService.hasAllPermissions(user.role, [
      Permission.POSTS_CREATE,
      Permission.POSTS_PUBLISH
    ])) {
      // User has both permissions
    }
    
    // Check multiple permissions (ANY)
    if (this.permissionService.hasAnyPermission(user.role, [
      Permission.POSTS_READ,
      Permission.ANALYTICS_READ
    ])) {
      // User has at least one permission
    }
    
    // Get missing permissions
    const missing = this.permissionService.getMissingPermissions(
      user.role,
      [Permission.POSTS_CREATE, Permission.POSTS_DELETE]
    );
    
    // Check if user can manage another role
    if (this.permissionService.canManageRole(user.role, targetRole)) {
      // User can manage the target role
    }
  }
}
```

### 6. Role Management API

The permissions controller provides REST endpoints for role management:

```typescript
// Get all permissions for a role
GET /permissions/roles/:role

// Get all available permissions
GET /permissions

// Check if a role has specific permissions
POST /permissions/check
{
  "role": "editor",
  "permissions": ["posts:create", "posts:delete"],
  "matchAll": true
}

// Get role hierarchy
GET /permissions/hierarchy

// Update user role
POST /permissions/users/:userId/role
{
  "role": "manager"
}

// Get roles with a specific permission
GET /permissions/:permission/roles

// Compare two roles
GET /permissions/compare/:role1/:role2
```

## Security Best Practices

### 1. Always Use Both Guards

Always use both `JwtAuthGuard` and `PermissionsGuard` together:

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
```

The `JwtAuthGuard` authenticates the user, and `PermissionsGuard` validates permissions.

### 2. Workspace Isolation

The workspace isolation middleware is automatically applied to all routes except:
- `/auth/*` - Authentication endpoints
- `/health/*` - Health check endpoints

This ensures complete tenant separation without additional code.

### 3. Principle of Least Privilege

Always assign the minimum role necessary:
- Use VIEWER for read-only access
- Use EDITOR for content creators who need approval
- Use MANAGER for team leads who can approve content
- Use ADMIN only for workspace administrators

### 4. Permission Granularity

Permissions are granular by design. Instead of broad permissions like "manage_posts", we have:
- `posts:create`
- `posts:read`
- `posts:update`
- `posts:delete`
- `posts:publish`
- `posts:schedule`
- `posts:approve`

This allows fine-grained control over user capabilities.

### 5. Audit Trail

All permission checks and role changes should be logged for audit purposes. The system maintains:
- User authentication logs
- Permission check failures
- Role assignment changes
- Workspace access attempts

## Testing

### Unit Tests

The RBAC system includes comprehensive unit tests:

```bash
# Test role-permission mappings
npm test -- src/auth/rbac/role-permissions.spec.ts

# Test permission service
npm test -- src/auth/services/permission.service.spec.ts

# Test all auth components
npm test -- src/auth
```

### Integration Tests

When writing integration tests, mock the user with appropriate roles:

```typescript
const mockUser = {
  id: 'user-id',
  tenantId: 'tenant-id',
  role: UserRole.EDITOR,
  email: 'test@example.com',
};

// Mock JWT guard to return this user
jest.spyOn(jwtAuthGuard, 'canActivate').mockImplementation(() => {
  request.user = mockUser;
  return true;
});
```

## Adding New Permissions

To add a new permission:

1. **Add to Permission Enum** (`src/auth/enums/permission.enum.ts`):
```typescript
export enum Permission {
  // ... existing permissions
  NEW_RESOURCE_ACTION = 'new_resource:action',
}
```

2. **Update Role Mappings** (`src/auth/rbac/role-permissions.ts`):
```typescript
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // ... existing permissions
    Permission.NEW_RESOURCE_ACTION,
  ],
  // ... other roles
};
```

3. **Add Tests** (`src/auth/rbac/role-permissions.spec.ts`):
```typescript
it('should ensure correct roles have new permission', () => {
  expect(roleHasPermission(UserRole.ADMIN, Permission.NEW_RESOURCE_ACTION)).toBe(true);
  expect(roleHasPermission(UserRole.VIEWER, Permission.NEW_RESOURCE_ACTION)).toBe(false);
});
```

4. **Use in Controllers**:
```typescript
@Post('new-endpoint')
@Permissions(Permission.NEW_RESOURCE_ACTION)
async newEndpoint() {
  // Implementation
}
```

## Troubleshooting

### Common Issues

1. **403 Forbidden Error**
   - Verify user has required permissions
   - Check if both guards are applied
   - Ensure user is authenticated

2. **Workspace Access Denied**
   - Verify tenantId/workspaceId in request matches user's tenant
   - Check if middleware is properly configured
   - Ensure user belongs to the correct workspace

3. **Permission Not Working**
   - Verify permission is added to role mapping
   - Check if guard is applied to route
   - Ensure permission enum value is correct

### Debug Mode

Enable debug logging for permission checks:

```typescript
// In permissions.guard.ts
console.log('Required permissions:', requiredPermissions);
console.log('User permissions:', userPermissions);
console.log('Has permission:', hasPermission);
```

## Migration Guide

If you're migrating from a simpler role system:

1. **Map Old Roles to New Roles**:
   - `owner` → `admin`
   - `admin` → `manager`
   - `user` → `editor`
   - `guest` → `viewer`

2. **Update Database**:
```sql
UPDATE users SET role = 'admin' WHERE role = 'owner';
UPDATE users SET role = 'manager' WHERE role = 'admin';
UPDATE users SET role = 'editor' WHERE role = 'user';
UPDATE users SET role = 'viewer' WHERE role = 'guest';
```

3. **Update Code**:
   - Replace role checks with permission checks
   - Add `@Permissions()` decorators to routes
   - Apply guards to controllers

## Performance Considerations

1. **Permission Caching**: Permissions are cached in memory as they're static
2. **Guard Execution**: Guards execute on every request but are optimized
3. **Middleware Overhead**: Workspace isolation adds minimal overhead (~1ms)
4. **Database Queries**: User role is loaded once during authentication

## Future Enhancements

Potential improvements to the RBAC system:

1. **Custom Roles**: Allow workspace admins to create custom roles
2. **Permission Groups**: Group related permissions for easier management
3. **Temporary Permissions**: Grant time-limited permissions
4. **Resource-Level Permissions**: Permissions on specific resources (e.g., specific posts)
5. **Permission Inheritance**: Hierarchical permission structures
6. **Audit Dashboard**: UI for viewing permission changes and access logs

## References

- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- [NestJS Middleware Documentation](https://docs.nestjs.com/middleware)
- [OWASP Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)
- Requirements: 5.3, 5.4, 32.1 in `requirements.md`
