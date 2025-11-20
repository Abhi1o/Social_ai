# RBAC Architecture Diagram

## System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Request                           │
│                    (HTTP with JWT Token)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway / Router                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Workspace Isolation Middleware                      │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ 1. Extract tenantId from request                     │       │
│  │ 2. Validate against user.tenantId                    │       │
│  │ 3. Prevent cross-tenant access                       │       │
│  │ 4. Attach tenantId to request                        │       │
│  └──────────────────────────────────────────────────────┘       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      JwtAuthGuard                                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ 1. Validate JWT token                                │       │
│  │ 2. Extract user from token                           │       │
│  │ 3. Attach user to request                            │       │
│  └──────────────────────────────────────────────────────┘       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PermissionsGuard                              │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ 1. Get required permissions from @Permissions()      │       │
│  │ 2. Get user's role from request.user                 │       │
│  │ 3. Lookup role permissions from ROLE_PERMISSIONS     │       │
│  │ 4. Validate user has required permissions            │       │
│  │ 5. Allow/Deny access                                 │       │
│  └──────────────────────────────────────────────────────┘       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Controller Method                           │
│                    (Business Logic)                              │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interaction

```
┌──────────────────┐
│   Permission     │
│     Enum         │◄──────────────┐
│  (50+ perms)     │               │
└──────────────────┘               │
                                   │
┌──────────────────┐               │
│   UserRole       │               │
│     Enum         │               │
│  (4 roles)       │               │
└──────────────────┘               │
        │                          │
        │                          │
        ▼                          │
┌──────────────────┐               │
│ ROLE_PERMISSIONS │               │
│     Mapping      │───────────────┤
│  (Role → Perms)  │               │
└──────────────────┘               │
        │                          │
        │                          │
        ▼                          │
┌──────────────────┐               │
│  Permission      │               │
│    Service       │◄──────────────┤
│  (Utilities)     │               │
└──────────────────┘               │
        │                          │
        │                          │
        ▼                          │
┌──────────────────┐               │
│  Permissions     │               │
│     Guard        │───────────────┘
│  (Validation)    │
└──────────────────┘
        │
        │
        ▼
┌──────────────────┐
│  @Permissions()  │
│    Decorator     │
│  (Route Config)  │
└──────────────────┘
```

## Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                          ADMIN                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │ • All 50+ permissions                              │     │
│  │ • Workspace management (delete, billing)           │     │
│  │ • Team management (invite, update, remove)         │     │
│  │ • Full content control                             │     │
│  │ • AI training and configuration                    │     │
│  │ • Audit log access                                 │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        MANAGER                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │ • 35+ permissions                                  │     │
│  │ • Content approval                                 │     │
│  │ • Team invitations                                 │     │
│  │ • Publishing control                               │     │
│  │ • Analytics export                                 │     │
│  │ • Workflow management                              │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         EDITOR                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │ • 20+ permissions                                  │     │
│  │ • Content creation and editing                     │     │
│  │ • Scheduling (needs approval to publish)           │     │
│  │ • Media management                                 │     │
│  │ • AI content generation                            │     │
│  │ • Inbox replies                                    │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         VIEWER                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │ • 10+ permissions                                  │     │
│  │ • Read-only access                                 │     │
│  │ • View posts, analytics, campaigns                 │     │
│  │ • View team members                                │     │
│  │ • View inbox messages                              │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Workspace Isolation

```
┌─────────────────────────────────────────────────────────────┐
│                      Tenant A                                │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Users: user1@a.com, user2@a.com                   │     │
│  │  Posts: post-a1, post-a2, post-a3                  │     │
│  │  Social Accounts: instagram-a, twitter-a           │     │
│  │  Analytics: metrics-a                              │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ ✗ Cross-tenant access blocked
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Tenant B                                │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Users: user1@b.com, user2@b.com                   │     │
│  │  Posts: post-b1, post-b2, post-b3                  │     │
│  │  Social Accounts: instagram-b, twitter-b           │     │
│  │  Analytics: metrics-b                              │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘

Workspace Isolation Middleware ensures:
✓ user1@a.com can ONLY access Tenant A data
✓ user1@b.com can ONLY access Tenant B data
✓ No cross-tenant data leakage
✓ Complete tenant separation
```

## Permission Check Flow

```
Request: POST /posts
Headers: Authorization: Bearer <jwt>
Body: { content: "Hello", tenantId: "tenant-123" }

Step 1: Workspace Isolation Middleware
├─ Extract tenantId from body: "tenant-123"
├─ Get user.tenantId from JWT: "tenant-123"
├─ Compare: "tenant-123" === "tenant-123" ✓
└─ Continue to next middleware

Step 2: JwtAuthGuard
├─ Validate JWT token ✓
├─ Extract user: { id: "user-1", role: "editor", tenantId: "tenant-123" }
├─ Attach to request.user
└─ Continue to next guard

Step 3: PermissionsGuard
├─ Get required permissions: [Permission.POSTS_CREATE]
├─ Get user role: "editor"
├─ Lookup role permissions: getRolePermissions("editor")
├─ Check: "posts:create" in editor permissions? ✓
└─ Allow access

Step 4: Controller Method Executes
└─ Business logic runs with validated user and tenant
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 1: Authentication                   │
│              (JwtAuthGuard - Who are you?)                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Layer 2: Tenant Isolation                   │
│        (WorkspaceIsolationMiddleware - Which tenant?)        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Layer 3: Authorization                     │
│           (PermissionsGuard - What can you do?)              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Layer 4: Business Logic                     │
│              (Controller - Execute operation)                │
└─────────────────────────────────────────────────────────────┘

Defense in Depth: Multiple security layers ensure comprehensive protection
```

## Permission Categories

```
┌──────────────────────────────────────────────────────────────┐
│                    Content Management                         │
│  posts:*, campaigns:*, media:*                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Analytics & Reporting                      │
│  analytics:*, audit:*                                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Social Integration                         │
│  social_accounts:*, listening:*                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Community Management                       │
│  inbox:*                                                     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Team & Workspace                           │
│  team:*, workspace:*                                         │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Automation & AI                            │
│  workflows:*, ai:*                                           │
└──────────────────────────────────────────────────────────────┘
```

## API Endpoints

```
Authentication & Authorization Endpoints:

POST   /auth/register          - Register new user
POST   /auth/login             - Login and get JWT
POST   /auth/refresh           - Refresh access token
POST   /auth/logout            - Logout and invalidate token

Permission Management Endpoints:

GET    /permissions                      - Get all permissions
GET    /permissions/roles/:role          - Get role permissions
POST   /permissions/check                - Check permissions
GET    /permissions/hierarchy            - Get role hierarchy
POST   /permissions/users/:id/role       - Update user role
GET    /permissions/:permission/roles    - Get roles with permission
GET    /permissions/compare/:r1/:r2      - Compare roles

Protected Resource Endpoints (Examples):

GET    /posts                  - Requires: posts:read
POST   /posts                  - Requires: posts:create
PUT    /posts/:id              - Requires: posts:update
DELETE /posts/:id              - Requires: posts:delete
POST   /posts/:id/publish      - Requires: posts:publish
POST   /posts/:id/approve      - Requires: posts:approve

GET    /analytics              - Requires: analytics:read
GET    /analytics/export       - Requires: analytics:export

GET    /team                   - Requires: team:read
POST   /team/invite            - Requires: team:invite
PUT    /team/:id               - Requires: team:update
DELETE /team/:id               - Requires: team:remove
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────┐
│                    401 Unauthorized                          │
│  • No JWT token provided                                    │
│  • Invalid JWT token                                        │
│  • Expired JWT token                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    403 Forbidden                             │
│  • User lacks required permissions                          │
│  • Cross-tenant access attempt                              │
│  • Role cannot manage target role                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    400 Bad Request                           │
│  • Missing tenantId/workspaceId                             │
│  • Invalid role specified                                   │
│  • Invalid permission specified                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    404 Not Found                             │
│  • User not found                                           │
│  • Resource not found in tenant                             │
└─────────────────────────────────────────────────────────────┘
```

## Performance Characteristics

```
Operation                    Time        Memory      Scalability
─────────────────────────────────────────────────────────────────
Permission Lookup            < 1ms       O(1)        Excellent
Role Validation              < 1ms       O(1)        Excellent
Tenant Validation            < 1ms       O(1)        Excellent
JWT Verification             < 5ms       O(1)        Excellent
Full Request Pipeline        < 10ms      O(1)        Excellent

Caching Strategy:
• Permissions: In-memory (static)
• Role mappings: In-memory (static)
• JWT validation: Redis cache (optional)
• User data: Database with caching
```

This architecture provides enterprise-grade security with minimal performance overhead.
