/**
 * Permission Enum
 * Defines all available permissions in the system
 * Format: RESOURCE_ACTION
 */
export enum Permission {
  // Post permissions
  POSTS_CREATE = 'posts:create',
  POSTS_READ = 'posts:read',
  POSTS_UPDATE = 'posts:update',
  POSTS_DELETE = 'posts:delete',
  POSTS_PUBLISH = 'posts:publish',
  POSTS_SCHEDULE = 'posts:schedule',
  POSTS_APPROVE = 'posts:approve',

  // Analytics permissions
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',

  // Social Account permissions
  SOCIAL_ACCOUNTS_CREATE = 'social_accounts:create',
  SOCIAL_ACCOUNTS_READ = 'social_accounts:read',
  SOCIAL_ACCOUNTS_UPDATE = 'social_accounts:update',
  SOCIAL_ACCOUNTS_DELETE = 'social_accounts:delete',

  // Media permissions
  MEDIA_CREATE = 'media:create',
  MEDIA_READ = 'media:read',
  MEDIA_UPDATE = 'media:update',
  MEDIA_DELETE = 'media:delete',

  // Campaign permissions
  CAMPAIGNS_CREATE = 'campaigns:create',
  CAMPAIGNS_READ = 'campaigns:read',
  CAMPAIGNS_UPDATE = 'campaigns:update',
  CAMPAIGNS_DELETE = 'campaigns:delete',

  // Inbox/Community permissions
  INBOX_READ = 'inbox:read',
  INBOX_REPLY = 'inbox:reply',
  INBOX_ASSIGN = 'inbox:assign',
  INBOX_MANAGE = 'inbox:manage',

  // Listening permissions
  LISTENING_READ = 'listening:read',
  LISTENING_CREATE = 'listening:create',
  LISTENING_UPDATE = 'listening:update',
  LISTENING_DELETE = 'listening:delete',

  // Team permissions
  TEAM_READ = 'team:read',
  TEAM_INVITE = 'team:invite',
  TEAM_UPDATE = 'team:update',
  TEAM_REMOVE = 'team:remove',

  // Workspace/Settings permissions
  WORKSPACE_READ = 'workspace:read',
  WORKSPACE_UPDATE = 'workspace:update',
  WORKSPACE_DELETE = 'workspace:delete',
  WORKSPACE_BILLING = 'workspace:billing',

  // Workflow permissions
  WORKFLOWS_CREATE = 'workflows:create',
  WORKFLOWS_READ = 'workflows:read',
  WORKFLOWS_UPDATE = 'workflows:update',
  WORKFLOWS_DELETE = 'workflows:delete',

  // AI permissions
  AI_GENERATE = 'ai:generate',
  AI_TRAIN = 'ai:train',

  // Audit permissions
  AUDIT_READ = 'audit:read',
}

/**
 * Resource Enum
 * Defines all resources in the system
 */
export enum Resource {
  POSTS = 'posts',
  ANALYTICS = 'analytics',
  SOCIAL_ACCOUNTS = 'social_accounts',
  MEDIA = 'media',
  CAMPAIGNS = 'campaigns',
  INBOX = 'inbox',
  LISTENING = 'listening',
  TEAM = 'team',
  WORKSPACE = 'workspace',
  WORKFLOWS = 'workflows',
  AI = 'ai',
  AUDIT = 'audit',
}

/**
 * Action Enum
 * Defines all actions that can be performed on resources
 */
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  PUBLISH = 'publish',
  SCHEDULE = 'schedule',
  APPROVE = 'approve',
  EXPORT = 'export',
  REPLY = 'reply',
  ASSIGN = 'assign',
  MANAGE = 'manage',
  INVITE = 'invite',
  REMOVE = 'remove',
  BILLING = 'billing',
  GENERATE = 'generate',
  TRAIN = 'train',
}
