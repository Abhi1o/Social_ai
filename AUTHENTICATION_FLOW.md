# Authentication System Flow Diagrams

## 1. Registration Flow

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant TenantService
    participant UserService
    participant Database

    Client->>AuthController: POST /auth/register
    AuthController->>AuthService: register(registerDto)
    AuthService->>TenantService: create(tenantData)
    TenantService->>Database: INSERT tenant
    Database-->>TenantService: tenant
    TenantService-->>AuthService: tenant
    
    AuthService->>UserService: create(userData)
    UserService->>UserService: hash password (bcrypt)
    UserService->>Database: INSERT user
    Database-->>UserService: user
    UserService-->>AuthService: user
    
    AuthService->>AuthService: generateTokens(user)
    AuthService->>AuthService: hashToken(refreshToken)
    AuthService->>UserService: updateRefreshToken(userId, hashedToken)
    UserService->>Database: UPDATE user.refreshToken
    
    AuthService-->>AuthController: { access_token, refresh_token, user, tenant }
    AuthController-->>Client: 201 Created
```

## 2. Login Flow

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant LocalAuthGuard
    participant AuthService
    participant UserService
    participant Database

    Client->>AuthController: POST /auth/login
    AuthController->>LocalAuthGuard: validate credentials
    LocalAuthGuard->>AuthService: validateUser(email, password)
    AuthService->>UserService: findByEmail(email)
    UserService->>Database: SELECT user
    Database-->>UserService: user
    UserService-->>AuthService: user
    
    AuthService->>UserService: validatePassword(user, password)
    UserService->>UserService: bcrypt.compare(password, hash)
    UserService-->>AuthService: true/false
    AuthService-->>LocalAuthGuard: user/null
    
    LocalAuthGuard-->>AuthController: user
    AuthController->>AuthService: login(loginDto)
    AuthService->>AuthService: check isActive
    AuthService->>UserService: updateLastLogin(userId)
    AuthService->>AuthService: generateTokens(user)
    AuthService->>AuthService: hashToken(refreshToken)
    AuthService->>UserService: updateRefreshToken(userId, hashedToken)
    
    AuthService-->>AuthController: { access_token, refresh_token, user, tenant }
    AuthController-->>Client: 200 OK
```

## 3. Protected Route Access Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant JwtAuthGuard
    participant JwtStrategy
    participant AuthService
    participant UserService
    participant Database

    Client->>Controller: GET /auth/profile (with Bearer token)
    Controller->>JwtAuthGuard: canActivate()
    JwtAuthGuard->>JwtStrategy: validate(payload)
    JwtStrategy->>JwtStrategy: extract JWT payload
    JwtStrategy->>AuthService: validateJwtPayload(payload)
    AuthService->>UserService: findOne(userId, tenantId)
    UserService->>Database: SELECT user
    Database-->>UserService: user
    UserService-->>AuthService: user
    AuthService->>AuthService: check isActive
    AuthService-->>JwtStrategy: user
    JwtStrategy-->>JwtAuthGuard: user
    JwtAuthGuard-->>Controller: user (attached to request)
    Controller->>Controller: process request with user
    Controller-->>Client: 200 OK with data
```

## 4. Token Refresh Flow

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant UserService
    participant Database

    Client->>AuthController: POST /auth/refresh
    AuthController->>AuthService: refreshTokens(userId, refreshToken)
    AuthService->>UserService: findById(userId)
    UserService->>Database: SELECT user
    Database-->>UserService: user
    UserService-->>AuthService: user
    
    AuthService->>AuthService: check isActive
    AuthService->>AuthService: check refreshToken exists
    AuthService->>AuthService: bcrypt.compare(token, storedHash)
    
    alt Token Valid
        AuthService->>AuthService: generateTokens(user)
        AuthService->>AuthService: hashToken(newRefreshToken)
        AuthService->>UserService: updateRefreshToken(userId, newHash)
        UserService->>Database: UPDATE user.refreshToken
        AuthService-->>AuthController: { access_token, refresh_token }
        AuthController-->>Client: 200 OK
    else Token Invalid
        AuthService-->>AuthController: ForbiddenException
        AuthController-->>Client: 403 Forbidden
    end
```

## 5. Logout Flow

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant JwtAuthGuard
    participant AuthService
    participant UserService
    participant Database

    Client->>AuthController: POST /auth/logout (with Bearer token)
    AuthController->>JwtAuthGuard: validate token
    JwtAuthGuard-->>AuthController: user
    AuthController->>AuthService: logout(userId)
    AuthService->>UserService: updateRefreshToken(userId, null)
    UserService->>Database: UPDATE user.refreshToken = NULL
    Database-->>UserService: success
    UserService-->>AuthService: void
    AuthService-->>AuthController: void
    AuthController-->>Client: 200 OK { message: "Logged out successfully" }
```

## Security Features

### Password Security
- **Hashing Algorithm**: bcrypt
- **Salt Rounds**: 12
- **Minimum Length**: 8 characters
- **Storage**: Never stored in plain text
- **Validation**: Secure comparison using bcrypt.compare()

### Token Security
- **Access Token**:
  - Expiry: 15 minutes (configurable)
  - Secret: JWT_SECRET
  - Payload: userId, email, tenantId, role
  
- **Refresh Token**:
  - Expiry: 7 days (configurable)
  - Secret: JWT_REFRESH_SECRET (separate from access token)
  - Storage: Hashed with bcrypt before database storage
  - Rotation: New token generated on each refresh
  - Invalidation: Removed from database on logout

### Account Security
- **Status Checking**: Active/inactive account verification
- **Tenant Isolation**: Multi-tenant architecture with data separation
- **Role-Based Access**: Admin, Manager, Editor, Viewer roles
- **Last Login Tracking**: Audit trail for user access

### API Security
- **Route Protection**: JwtAuthGuard for protected endpoints
- **Input Validation**: class-validator decorators on DTOs
- **Error Handling**: Proper exception handling with appropriate HTTP status codes
- **Data Sanitization**: Sensitive data removed from responses

## Token Payload Structure

### Access Token Payload
```typescript
{
  sub: "user-id",           // User ID
  email: "user@example.com", // User email
  tenantId: "tenant-id",     // Tenant ID for isolation
  role: "admin",             // User role
  iat: 1234567890,           // Issued at timestamp
  exp: 1234568790            // Expiration timestamp
}
```

### Refresh Token Payload
```typescript
{
  sub: "user-id",           // User ID
  email: "user@example.com", // User email
  tenantId: "tenant-id",     // Tenant ID
  role: "admin",             // User role
  iat: 1234567890,           // Issued at timestamp
  exp: 1235172690            // Expiration timestamp (7 days)
}
```

## Error Handling

| Error | Status Code | Scenario |
|-------|-------------|----------|
| UnauthorizedException | 401 | Invalid credentials, inactive account, invalid token |
| ForbiddenException | 403 | Invalid refresh token, token mismatch |
| ConflictException | 409 | User already exists (registration) |
| NotFoundException | 404 | User not found |

## Environment Configuration

```env
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Application
NODE_ENV=development
PORT=3000
```

## Best Practices Implemented

1. ✅ **Separate Secrets**: Different secrets for access and refresh tokens
2. ✅ **Short-Lived Access Tokens**: 15-minute expiry reduces attack window
3. ✅ **Token Rotation**: New refresh token on each use prevents replay attacks
4. ✅ **Hashed Storage**: Refresh tokens hashed before database storage
5. ✅ **Token Invalidation**: Logout removes refresh token from database
6. ✅ **Password Hashing**: Bcrypt with 12 salt rounds
7. ✅ **Input Validation**: DTOs with class-validator
8. ✅ **Error Handling**: Proper exception handling
9. ✅ **Tenant Isolation**: Multi-tenant architecture
10. ✅ **Role-Based Access**: Foundation for granular permissions
