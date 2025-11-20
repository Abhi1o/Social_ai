import { Injectable, NestMiddleware, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { User } from '../../user/entities/user.entity';

// Extend Express Request type to include custom properties
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      workspaceId?: string;
    }
  }
}

/**
 * Workspace Isolation Middleware
 * Ensures complete tenant separation by validating workspace/tenant access
 * 
 * Requirements: 5.3, 5.4, 32.1
 * 
 * This middleware:
 * 1. Validates that tenantId in request matches user's tenant
 * 2. Prevents cross-tenant data access
 * 3. Ensures multi-tenancy isolation
 * 
 * Note: Uses tenantId internally but supports both tenantId and workspaceId
 * in the API for flexibility (they are synonymous in this system)
 */
@Injectable()
export class WorkspaceIsolationMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const user = req.user as User;

    // Skip if no user (will be caught by auth guard)
    if (!user) {
      return next();
    }

    // Extract tenantId/workspaceId from various sources
    const tenantId = this.extractTenantId(req);

    // If no tenantId in request, allow (might be tenant-agnostic endpoint)
    if (!tenantId) {
      return next();
    }

    // Validate tenant access
    if (tenantId !== user.tenantId) {
      throw new ForbiddenException(
        'Access denied: You do not have permission to access this workspace',
      );
    }

    // Attach tenantId to request for easy access in controllers
    // Support both tenantId and workspaceId for API flexibility
    req['tenantId'] = tenantId;
    req['workspaceId'] = tenantId;

    next();
  }

  /**
   * Extract tenantId from request
   * Checks params, query, and body
   * Supports both tenantId and workspaceId naming
   */
  private extractTenantId(req: Request): string | null {
    // Check route params first (e.g., /workspaces/:workspaceId/posts or /tenants/:tenantId/posts)
    if (req.params?.tenantId) {
      return req.params.tenantId;
    }
    if (req.params?.workspaceId) {
      return req.params.workspaceId;
    }

    // Check query params (e.g., ?tenantId=xxx or ?workspaceId=xxx)
    if (req.query?.tenantId) {
      return req.query.tenantId as string;
    }
    if (req.query?.workspaceId) {
      return req.query.workspaceId as string;
    }

    // Check request body
    if (req.body?.tenantId) {
      return req.body.tenantId;
    }
    if (req.body?.workspaceId) {
      return req.body.workspaceId;
    }

    // Check for tenant/workspace in headers (optional)
    if (req.headers['x-tenant-id']) {
      return req.headers['x-tenant-id'] as string;
    }
    if (req.headers['x-workspace-id']) {
      return req.headers['x-workspace-id'] as string;
    }

    return null;
  }
}

/**
 * Decorator to get tenantId/workspaceId from request
 * Use in controllers after WorkspaceIsolationMiddleware
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const WorkspaceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;
    
    // Return tenantId from user (guaranteed to be validated by middleware)
    // Note: workspaceId and tenantId are synonymous in this system
    if (!user?.tenantId) {
      throw new BadRequestException('Workspace ID not found');
    }
    
    return user.tenantId;
  },
);

/**
 * Decorator to get tenantId from request
 * Alias for WorkspaceId for clarity in code
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;
    
    if (!user?.tenantId) {
      throw new BadRequestException('Tenant ID not found');
    }
    
    return user.tenantId;
  },
);
