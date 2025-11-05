// User and Authentication Types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  tenantId: string;
  preferences: Record<string, any>;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  tenant: Tenant;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export interface Tenant {
  id: string;
  name: string;
  planTier: PlanTier;
  billingStatus: string;
  settings: Record<string, any>;
  aiBudgetLimit: number;
  aiUsageCurrent: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum PlanTier {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

// Social Media Types
export interface SocialAccount {
  id: string;
  tenantId: string;
  platform: SocialPlatform;
  accountIdentifier: string;
  displayName?: string;
  accountMetadata: Record<string, any>;
  status: string;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum SocialPlatform {
  INSTAGRAM = 'instagram',
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  FACEBOOK = 'facebook',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  PINTEREST = 'pinterest',
  THREADS = 'threads',
  REDDIT = 'reddit',
}

// Content Types
export interface Post {
  id: string;
  tenantId: string;
  content: string;
  mediaUrls: string[];
  platforms: SocialPlatform[];
  scheduledAt?: Date;
  publishedAt?: Date;
  status: PostStatus;
  aiGenerated: boolean;
  aiPrompt?: string;
  analytics?: PostAnalytics;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface PostAnalytics {
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  saves: number;
}

// AI Agent Types
export interface AIAgent {
  id: string;
  name: string;
  type: AgentType;
  personality: AgentPersonality;
  isActive: boolean;
  configuration: Record<string, any>;
  performance: AgentPerformance;
  lastActivity?: Date;
}

export enum AgentType {
  CONTENT_CREATOR = 'content_creator',
  STRATEGY = 'strategy',
  ENGAGEMENT = 'engagement',
  ANALYTICS = 'analytics',
  TREND_DETECTION = 'trend_detection',
  COMPETITOR_ANALYSIS = 'competitor_analysis',
}

export interface AgentPersonality {
  tone: 'professional' | 'casual' | 'friendly' | 'bold' | 'creative';
  creativity: number; // 0-1
  formality: number; // 0-1
  humor: number; // 0-1
  brandVoice: string[];
}

export interface AgentPerformance {
  tasksCompleted: number;
  successRate: number;
  averageResponseTime: number;
  costEfficiency: number;
  userSatisfaction: number;
}

// Media Types
export interface MediaAsset {
  id: string;
  tenantId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  cdnUrl: string;
  s3Key: string;
  folder: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
}

// Analytics Types
export interface AnalyticsData {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: Date;
  endDate: Date;
  metrics: AnalyticsMetrics;
  platformBreakdown: PlatformAnalytics[];
  topPosts: Post[];
  insights: AIInsight[];
}

export interface AnalyticsMetrics {
  totalPosts: number;
  totalImpressions: number;
  totalReach: number;
  totalEngagement: number;
  engagementRate: number;
  followerGrowth: number;
  clickThroughRate: number;
  costPerEngagement: number;
}

export interface PlatformAnalytics {
  platform: SocialPlatform;
  metrics: AnalyticsMetrics;
  bestPostingTimes: string[];
  audienceDemographics: AudienceDemographics;
}

export interface AudienceDemographics {
  ageGroups: Record<string, number>;
  genders: Record<string, number>;
  locations: Record<string, number>;
  interests: string[];
}

export interface AIInsight {
  id: string;
  type: 'performance' | 'optimization' | 'trend' | 'competitor';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendations: string[];
  confidence: number;
  createdAt: Date;
}

// Inbox Types
export interface Conversation {
  id: string;
  platform: SocialPlatform;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage: Message;
  unreadCount: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  priority: 'high' | 'medium' | 'low';
  assignedTo?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  mediaUrls: string[];
  isFromUser: boolean;
  aiSuggested?: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
  createdAt: Date;
}

// Team Types
export interface TeamMember {
  id: string;
  user: User;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastActivity?: Date;
  invitedAt: Date;
  joinedAt?: Date;
}

export interface Permission {
  resource: string;
  actions: string[];
}

// Notification Types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

export enum NotificationType {
  POST_PUBLISHED = 'post_published',
  POST_FAILED = 'post_failed',
  ENGAGEMENT_SPIKE = 'engagement_spike',
  BUDGET_ALERT = 'budget_alert',
  TEAM_INVITE = 'team_invite',
  SYSTEM_UPDATE = 'system_update',
}

// API Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterForm {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  tenantName: string;
  planTier?: PlanTier;
}

export interface PostForm {
  content: string;
  mediaFiles: File[];
  platforms: SocialPlatform[];
  scheduledAt?: Date;
  firstComment?: string;
  location?: string;
  tags?: string[];
}

// UI Types
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  data?: any;
  isVisible: boolean;
}

export enum WidgetType {
  AI_INSIGHTS = 'ai_insights',
  QUICK_COMPOSER = 'quick_composer',
  SCHEDULE_PREVIEW = 'schedule_preview',
  PERFORMANCE_SNAPSHOT = 'performance_snapshot',
  AGENT_ACTIVITY = 'agent_activity',
  TRENDING_TOPICS = 'trending_topics',
  COMPETITOR_TRACKER = 'competitor_tracker',
  ENGAGEMENT_ALERTS = 'engagement_alerts',
}

export interface Theme {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  accentColor: string;
  borderRadius: number;
  fontSize: 'small' | 'medium' | 'large';
}

export interface UserPreferences {
  theme: Theme;
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  dashboard: DashboardPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  digest: 'daily' | 'weekly' | 'never';
  types: NotificationType[];
}

export interface DashboardPreferences {
  widgets: DashboardWidget[];
  layout: 'grid' | 'list';
  density: 'compact' | 'comfortable' | 'spacious';
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
}

export interface RealtimeUpdate {
  type: 'post_published' | 'engagement_update' | 'agent_activity' | 'team_activity';
  data: any;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Search Types
export interface SearchResult {
  type: 'post' | 'media' | 'conversation' | 'user' | 'insight';
  id: string;
  title: string;
  description?: string;
  url?: string;
  metadata?: Record<string, any>;
}

// Export all types
export type * from './api';
export type * from './components';