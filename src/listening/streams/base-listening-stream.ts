import { Logger } from '@nestjs/common';
import { Platform } from '@prisma/client';
import {
  IListeningStream,
  ListeningStreamConfig,
  StreamMention,
} from '../interfaces/listening-stream.interface';

/**
 * Base abstract class for platform-specific listening streams
 */
export abstract class BaseListeningStream implements IListeningStream {
  protected readonly logger: Logger;
  protected config?: ListeningStreamConfig;
  protected active = false;
  protected mentionCallback?: (mention: StreamMention) => void;
  protected errorCallback?: (error: Error) => void;
  protected pollInterval?: NodeJS.Timeout;

  constructor(
    protected readonly platform: Platform,
    protected readonly pollIntervalMs: number = 300000, // 5 minutes default
  ) {
    this.logger = new Logger(`${platform}ListeningStream`);
  }

  /**
   * Start the listening stream
   */
  async start(config: ListeningStreamConfig): Promise<void> {
    if (this.active) {
      this.logger.warn('Stream is already active');
      return;
    }

    this.config = config;
    this.active = true;

    this.logger.log(`Starting listening stream for query: ${config.queryId}`);

    try {
      await this.initialize();
      await this.startPolling();
    } catch (error) {
      this.logger.error(`Failed to start stream: ${error.message}`, error.stack);
      this.active = false;
      if (this.errorCallback) {
        this.errorCallback(error);
      }
      throw error;
    }
  }

  /**
   * Stop the listening stream
   */
  async stop(): Promise<void> {
    if (!this.active) {
      return;
    }

    this.logger.log('Stopping listening stream');
    this.active = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }

    await this.cleanup();
  }

  /**
   * Check if the stream is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get the platform this stream monitors
   */
  getPlatform(): Platform {
    return this.platform;
  }

  /**
   * Register callback for new mentions
   */
  onMention(callback: (mention: StreamMention) => void): void {
    this.mentionCallback = callback;
  }

  /**
   * Register callback for errors
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Start polling for mentions
   */
  protected async startPolling(): Promise<void> {
    // Initial fetch
    await this.fetchMentions();

    // Set up interval for subsequent fetches
    this.pollInterval = setInterval(async () => {
      if (this.active) {
        try {
          await this.fetchMentions();
        } catch (error) {
          this.logger.error(`Error fetching mentions: ${error.message}`, error.stack);
          if (this.errorCallback) {
            this.errorCallback(error);
          }
        }
      }
    }, this.pollIntervalMs);
  }

  /**
   * Emit a mention to the callback
   */
  protected emitMention(mention: StreamMention): void {
    if (this.mentionCallback) {
      this.mentionCallback(mention);
    }
  }

  /**
   * Emit an error to the callback
   */
  protected emitError(error: Error): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }

  /**
   * Check if a mention matches the configured filters
   */
  protected matchesFilters(mention: StreamMention): boolean {
    if (!this.config) {
      return false;
    }

    // Check language filter
    if (
      this.config.languages &&
      this.config.languages.length > 0 &&
      mention.language &&
      !this.config.languages.includes(mention.language.toLowerCase())
    ) {
      return false;
    }

    // Check location filter
    if (
      this.config.locations &&
      this.config.locations.length > 0 &&
      mention.location &&
      !this.config.locations.some(loc =>
        mention.location?.toLowerCase().includes(loc.toLowerCase()),
      )
    ) {
      return false;
    }

    // Check minimum followers
    if (
      this.config.minFollowers &&
      mention.authorFollowers !== undefined &&
      mention.authorFollowers < this.config.minFollowers
    ) {
      return false;
    }

    // Check excluded keywords
    if (this.config.excludeKeywords && this.config.excludeKeywords.length > 0) {
      const contentLower = mention.content.toLowerCase();
      for (const keyword of this.config.excludeKeywords) {
        if (contentLower.includes(keyword.toLowerCase())) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Initialize platform-specific resources
   * Override in subclasses if needed
   */
  protected async initialize(): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Cleanup platform-specific resources
   * Override in subclasses if needed
   */
  protected async cleanup(): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Fetch mentions from the platform
   * Must be implemented by subclasses
   */
  protected abstract fetchMentions(): Promise<void>;
}
