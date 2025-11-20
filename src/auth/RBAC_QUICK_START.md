# RBAC Quick Start Guide

## 5-Minute Setup

This guide will get you started with the RBAC system in 5 minutes.

## Step 1: Protect Your Controller (30 seconds)

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { WorkspaceId } from '../auth/middleware/workspace-isolation.middleware';

@Controller('posts')
@UseGuards(JwtAuthGuard, PermissionsGuard)  // Add these guards
export class PostsController {
  
  @Get()
  @Permissions(Permission.POSTS_READ)  // Add permission requirement
  async getPosts(@WorkspaceId() tenantId: string) {
    // Your code here
    // tenantId is automatically validated
  }
  
  @Post()
  @Permissions(Permission.POSTS_CREATE)
  async createPost(@WorkspaceId() tenantId: string) {
    // Your code here
  }
}
```

**That's it!** Your routes are now protected.

## Step 2: Check Permissions in Services (1 minute)

```typescript
import { Injectable } from '@nestjs/common';
import { PermissionService } from '../auth/services/permission.service';
import { Permission } from '../auth/enums/permission.enum';

@Injectable()
export class PostsService {
  constructor(private permissionService: PermissionService) {}
  
  async canUserPublish(user: User): boolean {
    return this.permissionService.hasPermission(
      user.role,
      Permission.POSTS_PUBLISH
    );
  }
  
  async getUserCapabilities(user: User) {
    return {
      canCreate: this.permissionService.hasPermission(user.role, Permission.POSTS_CREATE),
      canPublish: this.permissionService.hasPermission(user.role, Permission.POSTS_PUBLISH),
      canDelete: this.permissionService.hasPermission(user.role, Permission.POSTS_DELETE),
    };
  }
}
```

## Step 3: Handle Multiple Permissions (30 seconds)

### Require ALL permissions
```typescript
@Post('publish')
@Permissions(Permission.POSTS_CREATE, Permission.POSTS_PUBLISH)
async publishPost() {
  // User must have BOTH permissions
}
```

### Require ANY permission
```typescript
import { PermissionMatchStrategy, PermissionMatch } from '../auth/decorators/permissions.decorator';

@Get('dashboard')
@Permissions(Permission.POSTS_READ, Permission.ANALYTICS_READ)
@PermissionMatchStrategy(PermissionMatch.ANY)
async getDashboard() {
  // User needs EITHER permission
}
```

## Common Patterns

### Pattern 1: Basic CRUD Controller

```typescript
@Controller('campaigns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CampaignsController {
  
  @Get()
  @Permissions(Permission.CAMPAIGNS_READ)
  async findAll(@WorkspaceId() tenantId: string) {
    return this.campaignsService.findAll(tenantId);
  }
  
  @Post()
  @Permissions(Permission.CAMPAIGNS_CREATE)
  async create(@WorkspaceId() tenantId: string, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(tenantId, dto);
  }
  
  @Put(':id')
  @Permissions(Permission.CAMPAIGNS_UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(id, dto);
  }
  
  @Delete(':id')
  @Permissions(Permission.CAMPAIGNS_DELETE)
  async remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }
}
```

### Pattern 2: Admin-Only Endpoints

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  
  @Get('users')
  @Permissions(Permission.TEAM_READ)
  async getUsers() {
    // Only ADMIN and MANAGER can access
  }
  
  @Delete('users/:id')
  @Permissions(Permission.TEAM_REMOVE)
  async removeUser(@Param('id') id: string) {
    // Only ADMIN can access
  }
  
  @Get('billing')
  @Permissions(Permission.WORKSPACE_BILLING)
  async getBilling() {
    // Only ADMIN can access
  }
}
```

### Pattern 3: Conditional Logic Based on Permissions

```typescript
@Injectable()
export class PostsService {
  constructor(private permissionService: PermissionService) {}
  
  async createPost(user: User, dto: CreatePostDto) {
    const post = await this.postsRepository.create(dto);
    
    // Auto-publish if user has permission
    if (this.permissionService.hasPermission(user.role, Permission.POSTS_PUBLISH)) {
      post.status = 'published';
    } else {
      // Otherwise, require approval
      post.status = 'pending_approval';
    }
    
    return this.postsRepository.save(post);
  }
}
```

### Pattern 4: Role-Based UI Features

```typescript
@Controller('features')
@UseGuards(JwtAuthGuard)
export class FeaturesController {
  constructor(private permissionService: PermissionService) {}
  
  @Get('available')
  async getAvailableFeatures(@Request() req) {
    const user = req.user;
    const permissions = this.permissionService.getPermissionsForRole(user.role);
    
    return {
      canCreatePosts: permissions.includes(Permission.POSTS_CREATE),
      canPublish: permissions.includes(Permission.POSTS_PUBLISH),
      canManageTeam: permissions.includes(Permission.TEAM_INVITE),
      canViewAnalytics: permissions.includes(Permission.ANALYTICS_READ),
      canExportData: permissions.includes(Permission.ANALYTICS_EXPORT),
      canManageBilling: permissions.includes(Permission.WORKSPACE_BILLING),
    };
  }
}
```

## Role Assignment

### Assign Role to User

```typescript
// Via API
POST /permissions/users/:userId/role
{
  "role": "manager"
}

// Programmatically
await this.userService.updateRole(userId, UserRole.MANAGER);
```

### Check User's Permissions

```typescript
// Via API
POST /permissions/check
{
  "role": "editor",
  "permissions": ["posts:create", "posts:publish"],
  "matchAll": true
}

// Programmatically
const hasPermission = this.permissionService.hasPermission(
  user.role,
  Permission.POSTS_CREATE
);
```

## Testing Your Protected Routes

### Unit Test Example

```typescript
import { Test } from '@nestjs/testing';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserRole } from '../user/entities/user.entity';

describe('PostsController', () => {
  let controller: PostsController;
  let permissionsGuard: PermissionsGuard;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        PostsService,
        PermissionsGuard,
        // ... other providers
      ],
    }).compile();
    
    controller = module.get<PostsController>(PostsController);
    permissionsGuard = module.get<PermissionsGuard>(PermissionsGuard);
  });
  
  it('should allow EDITOR to create posts', async () => {
    const mockUser = {
      id: 'user-1',
      role: UserRole.EDITOR,
      tenantId: 'tenant-1',
    };
    
    // Mock the request
    const mockRequest = { user: mockUser };
    const mockContext = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
    
    const canActivate = permissionsGuard.canActivate(mockContext as any);
    expect(canActivate).toBe(true);
  });
  
  it('should deny VIEWER from creating posts', async () => {
    const mockUser = {
      id: 'user-1',
      role: UserRole.VIEWER,
      tenantId: 'tenant-1',
    };
    
    const mockRequest = { user: mockUser };
    const mockContext = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
    
    expect(() => {
      permissionsGuard.canActivate(mockContext as any);
    }).toThrow(ForbiddenException);
  });
});
```

### Integration Test Example

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('Posts API (e2e)', () => {
  let app: INestApplication;
  let editorToken: string;
  let viewerToken: string;
  
  beforeAll(async () => {
    // Setup app and get tokens
    editorToken = await getAuthToken('editor@example.com', 'password');
    viewerToken = await getAuthToken('viewer@example.com', 'password');
  });
  
  it('should allow EDITOR to create posts', () => {
    return request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ content: 'Test post' })
      .expect(201);
  });
  
  it('should deny VIEWER from creating posts', () => {
    return request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ content: 'Test post' })
      .expect(403);
  });
});
```

## Troubleshooting

### Issue: Getting 403 Forbidden

**Check:**
1. Is the user authenticated? (JWT token valid?)
2. Does the user's role have the required permission?
3. Are both guards applied? (`JwtAuthGuard` and `PermissionsGuard`)
4. Is the permission spelled correctly?

```typescript
// Debug in your controller
@Post()
@Permissions(Permission.POSTS_CREATE)
async createPost(@Request() req) {
  console.log('User role:', req.user.role);
  console.log('User permissions:', 
    this.permissionService.getPermissionsForRole(req.user.role)
  );
  // Your code
}
```

### Issue: Workspace Access Denied

**Check:**
1. Is the tenantId in the request?
2. Does it match the user's tenantId?
3. Is the workspace isolation middleware applied?

```typescript
// Debug
@Get()
async getPosts(@Request() req, @WorkspaceId() tenantId: string) {
  console.log('User tenantId:', req.user.tenantId);
  console.log('Request tenantId:', tenantId);
  // Your code
}
```

### Issue: Permission Not Working

**Verify the permission exists:**
```typescript
import { Permission } from '../auth/enums/permission.enum';

console.log(Permission.POSTS_CREATE); // Should output: 'posts:create'
```

**Verify the role has the permission:**
```typescript
import { getRolePermissions } from '../auth/rbac/role-permissions';
import { UserRole } from '../user/entities/user.entity';

const permissions = getRolePermissions(UserRole.EDITOR);
console.log(permissions.includes(Permission.POSTS_CREATE)); // Should be true
```

## Quick Reference

### All Available Permissions

```typescript
// Posts
Permission.POSTS_CREATE
Permission.POSTS_READ
Permission.POSTS_UPDATE
Permission.POSTS_DELETE
Permission.POSTS_PUBLISH
Permission.POSTS_SCHEDULE
Permission.POSTS_APPROVE

// Analytics
Permission.ANALYTICS_READ
Permission.ANALYTICS_EXPORT

// Social Accounts
Permission.SOCIAL_ACCOUNTS_CREATE
Permission.SOCIAL_ACCOUNTS_READ
Permission.SOCIAL_ACCOUNTS_UPDATE
Permission.SOCIAL_ACCOUNTS_DELETE

// Media
Permission.MEDIA_CREATE
Permission.MEDIA_READ
Permission.MEDIA_UPDATE
Permission.MEDIA_DELETE

// Campaigns
Permission.CAMPAIGNS_CREATE
Permission.CAMPAIGNS_READ
Permission.CAMPAIGNS_UPDATE
Permission.CAMPAIGNS_DELETE

// Inbox
Permission.INBOX_READ
Permission.INBOX_REPLY
Permission.INBOX_ASSIGN
Permission.INBOX_MANAGE

// Listening
Permission.LISTENING_READ
Permission.LISTENING_CREATE
Permission.LISTENING_UPDATE
Permission.LISTENING_DELETE

// Team
Permission.TEAM_READ
Permission.TEAM_INVITE
Permission.TEAM_UPDATE
Permission.TEAM_REMOVE

// Workspace
Permission.WORKSPACE_READ
Permission.WORKSPACE_UPDATE
Permission.WORKSPACE_DELETE
Permission.WORKSPACE_BILLING

// Workflows
Permission.WORKFLOWS_CREATE
Permission.WORKFLOWS_READ
Permission.WORKFLOWS_UPDATE
Permission.WORKFLOWS_DELETE

// AI
Permission.AI_GENERATE
Permission.AI_TRAIN

// Audit
Permission.AUDIT_READ
```

### Role Capabilities Summary

**ADMIN:**
- Everything (all 50+ permissions)

**MANAGER:**
- Content management (create, edit, publish, approve)
- Team invitations
- Analytics export
- Cannot: manage workspace settings, delete social accounts

**EDITOR:**
- Content creation and editing
- Scheduling (needs approval to publish)
- Media management
- Cannot: publish, delete, manage team

**VIEWER:**
- Read-only access to everything
- Cannot: create, edit, delete anything

## Next Steps

1. **Read the full documentation:** `src/auth/RBAC_IMPLEMENTATION.md`
2. **View the architecture:** `src/auth/RBAC_ARCHITECTURE.md`
3. **Add permissions to your controllers**
4. **Write tests for your protected routes**
5. **Build role management UI**

## Need Help?

- Check the comprehensive docs: `src/auth/RBAC_IMPLEMENTATION.md`
- View test examples: `src/auth/rbac/role-permissions.spec.ts`
- Review the architecture: `src/auth/RBAC_ARCHITECTURE.md`

Happy coding! 🚀
