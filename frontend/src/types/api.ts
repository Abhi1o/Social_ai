// API Request/Response Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    tenantId: string;
  };
  tenant: {
    id: string;
    name: string;
    planTier: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  tenantName: string;
  planTier?: string;
}

export interface CreatePostRequest {
  content: string;
  platforms: string[];
  scheduledAt?: string;
  mediaUrls?: string[];
  firstComment?: string;
  location?: string;
  tags?: string[];
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {
  id: string;
}

export interface MediaUploadResponse {
  id: string;
  url: string;
  cdnUrl: string;
  fileName: string;
  size: number;
  mimeType: string;
}

export interface AnalyticsRequest {
  startDate: string;
  endDate: string;
  platforms?: string[];
  metrics?: string[];
}

export interface AIGenerateRequest {
  prompt: string;
  type: 'text' | 'image' | 'caption' | 'hashtags';
  platform?: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long';
  context?: Record<string, any>;
}

export interface AIGenerateResponse {
  content: string;
  alternatives?: string[];
  confidence: number;
  tokensUsed: number;
  cost: number;
}

export interface SocialAccountConnectRequest {
  platform: string;
  authCode: string;
  redirectUri: string;
}

export interface TeamInviteRequest {
  email: string;
  role: string;
  permissions?: string[];
}

export interface WebhookRequest {
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
}

export interface BulkActionRequest {
  action: 'delete' | 'publish' | 'schedule' | 'cancel';
  itemIds: string[];
  data?: Record<string, any>;
}

export interface SearchRequest {
  query: string;
  type?: 'all' | 'posts' | 'media' | 'conversations' | 'users';
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface ExportRequest {
  type: 'posts' | 'analytics' | 'conversations' | 'media';
  format: 'csv' | 'json' | 'pdf' | 'xlsx';
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  filters?: Record<string, any>;
}