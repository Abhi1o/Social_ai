export interface PlatformMetrics {
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  impressions?: number;
  reach?: number;
  followers?: number;
  following?: number;
  views?: number;
  watchTime?: number;
  completionRate?: number;
  replies?: number;
  exits?: number;
  tapsForward?: number;
  tapsBack?: number;
  profileViews?: number;
  websiteClicks?: number;
  emailClicks?: number;
  engagementRate?: number;
}

export interface PostMetrics extends PlatformMetrics {
  postId: string;
  platformPostId: string;
  contentType: string;
  timestamp: Date;
}

export interface AccountMetrics extends PlatformMetrics {
  accountId: string;
  timestamp: Date;
}

export interface IMetricsFetcher {
  /**
   * Fetch metrics for a specific post
   */
  fetchPostMetrics(platformPostId: string, accessToken: string): Promise<PostMetrics>;

  /**
   * Fetch account-level metrics
   */
  fetchAccountMetrics(platformAccountId: string, accessToken: string): Promise<AccountMetrics>;

  /**
   * Fetch metrics for multiple posts in batch
   */
  fetchBatchPostMetrics(platformPostIds: string[], accessToken: string): Promise<PostMetrics[]>;

  /**
   * Check if the platform supports real-time metrics
   */
  supportsRealTimeMetrics(): boolean;
}
