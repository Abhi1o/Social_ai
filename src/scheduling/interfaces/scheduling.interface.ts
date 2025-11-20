export interface ScheduledPostJob {
  postId: string;
  workspaceId: string;
  scheduledAt: Date;
  timezone?: string;
}

export interface OptimalTimeSlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  score: number; // 0-100
  averageEngagement: number;
  postCount: number;
}

export interface EvergreenPost {
  postId: string;
  lastPublished?: Date;
  publishCount: number;
  priority: number;
}

export interface PublishingResult {
  postId: string;
  success: boolean;
  platformResults: PlatformPublishResult[];
  error?: string;
}

export interface PlatformPublishResult {
  platform: string;
  success: boolean;
  platformPostId?: string;
  url?: string;
  error?: string;
}
