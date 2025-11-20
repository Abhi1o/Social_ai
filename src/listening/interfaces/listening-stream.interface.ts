import { Platform } from '@prisma/client';

/**
 * Configuration for a listening stream
 */
export interface ListeningStreamConfig {
  queryId: string;
  workspaceId: string;
  platform: Platform;
  query: string;
  keywords: string[];
  languages?: string[];
  locations?: string[];
  excludeKeywords?: string[];
  includeRetweets?: boolean;
  minFollowers?: number;
}

/**
 * Mention data from a listening stream
 */
export interface StreamMention {
  platform: Platform;
  authorId: string;
  authorUsername: string;
  authorName: string;
  authorAvatar?: string;
  authorFollowers?: number;
  content: string;
  url: string;
  platformPostId: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  language?: string;
  location?: string;
  publishedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Interface for platform-specific listening stream implementations
 */
export interface IListeningStream {
  /**
   * Start the listening stream
   */
  start(config: ListeningStreamConfig): Promise<void>;

  /**
   * Stop the listening stream
   */
  stop(): Promise<void>;

  /**
   * Check if the stream is active
   */
  isActive(): boolean;

  /**
   * Get the platform this stream monitors
   */
  getPlatform(): Platform;

  /**
   * Callback for when a new mention is found
   */
  onMention(callback: (mention: StreamMention) => void): void;

  /**
   * Callback for when an error occurs
   */
  onError(callback: (error: Error) => void): void;
}
