# Role-Based Access Control (RBAC) Documentation

## Overview

This document describes the Role-Based Access Control (RBAC) system implemented for the AI Social Media Management Platform. The system ensures secure, granular access control and complete workspace isolation.

**Requirements Addressed:**
- 5.3: Role-based access control with granular permissions
- 5.4: Workspace isolation ensuring tenant separation
- 32.1: SOC 2 Type II compliance with security controls

## Architecture

### Components

1. **Permission Enum** (`enums/permission.enum.ts`)
   - Defines all available permissions in the system
   - Format: `RESOURCE:ACTION` (e.g., `posts:create`)

2. **Role-Permission Mappings** (`rbac/role-permissions.ts`)
   - Maps each role to its allowed permissions
   - Provides utility functions for permission checking

3. **Permission Guard** (`guards/permissions.guard.ts`)
   - NestJS guard that validates user permissions
   - Works with `@Permissions()` decorator

4. **Workspace Isolation Middleware** (`middleware/workspace-isolation.middleware.ts`)
   - Ensures complete tenant separation
   - Validates workspace access on every request

5. **Permission Service** (`services/permission.service.ts`)
   - Provides utilities for permission management
   - Role comparison and hierarchy management

6. **Permissions Controller** (`controllers/permissions.controller.ts`)
   - API endpoints for permission management
   - Role updates and permission queries

## Roles and Permissions

### Role Hierarchy

1. **OWNER** - Full system access
   - All permissions
   - Can manage billing and delete workspace
   - Cannot be removed from workspace

2. **ADMIN** - Administrative access
   - All permissions except workspace deletion and billing
   - Can manage team members and settings
   - Can approve content and manage workflows

3. **MANAGER** - Content and team management
   - Can create, edit, publish content
   - Can manage team members (limited)
   - Can approve content
   - Cannot manage workspace settings

4. **EDITOR** - Content creation
   - Can create and edit content
   - Cannot publish without approval
   - Cannot manage team or settings
   - Read-only access to analytics

5. **VIEWER** - Read-only access
   - Can view all content and analytics
   - Cannot make any changes
   - Useful for clients or stakeholders

### Permission Categories

#### Post Permissions
- `posts:create` - Create new posts
- `posts:read` - View posts
- `posts:update` - Edit posts
- `posts:delete` - Delete posts
- `posts:publish` - Publish posts immediately
- `posts:schedule` - Schedule posts
- `posts:approve` - Approve posts in workflow

#### Analytics Permissions
- `analytics:read` - View analytics
- `analytics:export` - Export analytics data

#### Social Account Permissions
- `social_accounts:create` - Connect new accounts
- `social_accounts:read` - View connected accounts
- `social_accounts:update` - Update account settings
- `social_accounts:delete` - Disconnect accounts

#### Media Permissions
- `media:create` - Upload media
- `media:read` - View media library
- `media:update` - Edit media
- `media:delete` - Delete media

#### Campaign Permissions
- `campaigns:create` - Create campaigns
- `campaigns:read` - View campaigns
- `campaigns:update` - Edit campaigns
- `campaigns:delete` - Delete campaigns

#### Inbox Permissions
- `inbox:read` - View messages
- `inbox:reply` - Reply to messages
- `inbox:assign` - Assign conversations
- `inbox:manage` - Manage inbox settings

#### Listening Permissions
- `listening:read` - View mentions
- `listening:create` - Create listening queries
- `listening:update` - Edit queries
- `listening:delete` - Delete queries

#### Team Permissions
- `team:read` - View team members
- `team:invite` - Invite new members
- `team:update` - Update member roles
- `team:remove` - Remove members

#### Workspace Permissions
- `workspace:read` - View workspace settings
- `workspace:update` - Update workspace settings
- `workspace:delete` - Delete workspace
- `workspace:billing` - Manage billing

#### Workflow Permissions
- `workflows:create` - Create workflows
- `workflows:read` - View workflows
- `workflows:update` - Edit workflows
- `workflows:delete` - Delete workflows

#### AI Permissions
- `ai:generate` - Generate content with AI
- `ai:train` - Train brand voice

#### Audit Permissions
- `audit:read` - View audit logs

## Usage

### Protecting Routes with Permissions

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

@Controller('posts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PostsController {
  
  // Requires posts:create permission
  @Post()
  @Permissions(Permission.POSTS_CREATE)
  async createPost() {
    // Only users with posts:create permission can access
  }
  
  // Requires posts:read permission
  @Get()
  @Permissions(Permission.POSTS_READ)
  async getPosts() {
    // Only users with posts:read permission can access
  }
  
  // Requires multiple permissions (ALL by default)
  @Post(':id/publish')
  @Permissions(Permission.POSTS_UPDATE, Permission.POSTS_PUBLISH)
  async publishPost() {
    // User must have BOTH permissions
  }
}
```

### Using Permission Match Strategy

```typescript
import { PermissionMatchStrategy, PermissionMatch } from '../auth/decorators/permissions.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  
  // User needs ANY of these permissions
  @Get()
  @Permissions(Permission.POSTS_READ, Permission.ANALYTICS_READ)
  @PermissionMatchStrategy(PermissionMatch.ANY)
  async getDashboard() {
    // User needs either posts:read OR analytics:read
  }
}
```

### Workspace Isolation

The `WorkspaceIsolationMiddleware` automatically validates workspace access:

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { WorkspaceId } from '../auth/middleware/workspace-isolation.middleware';

@Controller('posts')
export class PostsController {
  
  @Get()
  async getPosts(@WorkspaceId() workspaceId: string) {
    // workspaceId is automatically validated against user's workspace
    // Cross-workspace access is prevented
  }
}
```

### Using Permission Service

```typescript
import { Injectable } from '@nestjs/common';
import { PermissionService } from '../auth/services/permission.service';
import { Permission } from '../auth/enums/permission.enum';
import { UserRole } from '../user/entities/user.entity';

@Injectable()
export class MyService {
  constructor(private permissionService: PermissionService) {}
  
  async checkAccess(userRole: UserRole) {
    // Check single permission
    const canCreate = this.permissionService.hasPermission(
      userRole, 
      Permission.POSTS_CREATE
    );
    
    // Check multiple permissions (ALL)
    const canManagePosts = this.permissionService.hasAllPermissions(
      userRole,
      [Permission.POSTS_CREATE, Permission.POSTS_UPDATE, Permission.POSTS_DELETE]
    );
    
    // Check multiple permissions (ANY)
    const canViewContent = this.permissionService.hasAnyPermission(
      userRole,
      [Permission.POSTS_READ, Permission.MEDIA_READ]
    );
    
    // Get all permissions for a role
    const permissions = this.permissionService.getPermissionsForRole(userRole);
    
    // Check if role can manage another role
    const canManage = this.permissionService.canManageRole(
      UserRole.ADMIN,
      UserRole.EDITOR
    );
  }
}
```

## API Endpoints

### Get Role Permissions
```
GET /permissions/roles/:role
Authorization: Bearer <token>
Required Permission: team:read

Response:
{
  "role": "MANAGER",
  "permissions": ["posts:create", "posts:read", ...],
  "count": 25
}
```

### Get All Permissions
```
GET /permissions
Authorization: Bearer <token>
Required Permission: team:read

Response:
{
  "permissions": ["posts:create", "posts:read", ...],
  "count": 50
}
```

### Check Permissions
```
POST /permissions/check
Authorization: Bearer <token>
Required Permission: team:read

Request:
{
  "role": "EDITOR",
  "permissions": ["posts:create", "posts:publish"],
  "matchAll": true
}

Response:
{
  "role": "EDITOR",
  "requestedPermissions": ["posts:create", "posts:publish"],
  "hasPermission": false,
  "missingPermissions": ["posts:publish"]
}
```

### Update User Role
```
POST /permissions/users/:userId/role
Authorization: Bearer <token>
Required Permission: team:update

Request:
{
  "role": "MANAGER"
}

Response:
{
  "message": "User role updated successfully",
  "user": { ... },
  "newPermissions": ["posts:create", ...]
}
```

### Get Role Hierarchy
```
GET /permissions/hierarchy
Authorization: Bearer <token>
Required Permission: team:read

Response:
{
  "hierarchy": ["OWNER", "ADMIN", "MANAGER", "EDITOR", "VIEWER"],
  "roles": [
    {
      "role": "OWNER",
      "permissions": [...],
      "permissionCount": 50
    },
    ...
  ]
}
```

### Compare Roles
```
GET /permissions/compare/:role1/:role2
Authorization: Bearer <token>
Required Permission: team:read

Response:
{
  "role1": {
    "role": "ADMIN",
    "permissions": [...],
    "permissionCount": 45
  },
  "role2": {
    "role": "MANAGER",
    "permissions": [...],
    "permissionCount": 25
  },
  "comparison": {
    "result": 1,
    "role1IsHigher": true,
    "role1CanManageRole2": true
  }
}
```

## Security Considerations

### Workspace Isolation
- Every request is validated against user's workspace
- Cross-workspace data access is prevented at middleware level
- WorkspaceId is automatically injected and validated

### Permission Validation
- Permissions are checked on every protected route
- Guards run after authentication but before route handler
- Failed permission checks return 403 Forbidden

### Role Management
- Only higher roles can manage lower roles
- OWNER cannot be removed or demoted
- Role changes are audited (when audit system is implemented)

### Token Security
- JWT tokens include workspaceId claim
- Tokens are validated on every request
- Refresh token rotation prevents token reuse

## Best Practices

1. **Always use both guards together:**
   ```typescript
   @UseGuards(JwtAuthGuard, PermissionsGuard)
   ```

2. **Be specific with permissions:**
   ```typescript
   // Good
   @Permissions(Permission.POSTS_CREATE)
   
   // Avoid - too broad
   @Permissions(Permission.POSTS_CREATE, Permission.POSTS_READ, Permission.POSTS_UPDATE)
   ```

3. **Use WorkspaceId decorator:**
   ```typescript
   async myMethod(@WorkspaceId() workspaceId: string) {
     // Guaranteed to be user's workspace
   }
   ```

4. **Check permissions in services when needed:**
   ```typescript
   if (!this.permissionService.hasPermission(user.role, Permission.POSTS_PUBLISH)) {
     throw new ForbiddenException('Cannot publish posts');
   }
   ```

5. **Document permission requirements:**
   ```typescript
   /**
    * Create a new post
    * @requires posts:create permission
    * @requires Authenticated user
    */
   @Post()
   @Permissions(Permission.POSTS_CREATE)
   async createPost() { }
   ```

## Testing

### Unit Testing Guards

```typescript
import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('should allow access with correct permission', () => {
    // Test implementation
  });

  it('should deny access without permission', () => {
    // Test implementation
  });
});
```

### Integration Testing

```typescript
describe('POST /posts', () => {
  it('should create post with EDITOR role', async () => {
    const token = await getTokenForRole(UserRole.EDITOR);
    
    const response = await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Test post' })
      .expect(201);
  });

  it('should deny post creation for VIEWER role', async () => {
    const token = await getTokenForRole(UserRole.VIEWER);
    
    await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Test post' })
      .expect(403);
  });
});
```

## Future Enhancements

1. **Custom Permissions**
   - Allow workspace owners to create custom permissions
   - Fine-grained resource-level permissions

2. **Permission Groups**
   - Group related permissions for easier management
   - Assign permission groups to roles

3. **Temporary Permissions**
   - Grant time-limited permissions
   - Automatic expiration and revocation

4. **Permission Audit Trail**
   - Log all permission checks
   - Track permission changes over time

5. **Dynamic Permissions**
   - Permissions based on resource ownership
   - Context-aware permission evaluation

## Troubleshooting

### Common Issues

**403 Forbidden Error**
- Check if user has required permission
- Verify role assignment is correct
- Ensure guards are applied in correct order

**Workspace Access Denied**
- Verify workspaceId in request matches user's workspace
- Check if middleware is properly configured
- Ensure user is authenticated

**Permission Not Found**
- Verify permission exists in Permission enum
- Check role-permission mappings
- Ensure permission is properly imported

## Support

For questions or issues with the RBAC system:
1. Check this documentation
2. Review the code examples
3. Check the test files for usage patterns
4. Contact the development team
