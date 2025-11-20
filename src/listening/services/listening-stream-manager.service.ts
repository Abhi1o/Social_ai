import { Injectable, Logger, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Platform } from '@prisma/client';
import { IListeningStream, StreamMention } from '../interfaces/listening-stream.interface';
import { ListeningStreamFactory } from '../streams/listening-stream.factory';
import { MentionProcessingService } from './mention-processing.service';
import { MentionGateway } from '../gateways/mention.gateway';

/**
 * Service for managing listening streams across all platforms
 */
@Injectable()
export class ListeningStreamManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(ListeningStreamManagerService.name);
  private readonly activeStreams = new Map<string, Map<Platform, IListeningStream>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly streamFactory: ListeningStreamFactory,
    private readonly mentionProcessing: MentionProcessingService,
    @Inject(forwardRef(() => MentionGateway))
    private readonly mentionGateway: MentionGateway,
  ) {}

  /**
   * Start listening streams for a query
   */
  async startQuery(queryId: string): Promise<void> {
    this.logger.log(`Starting listening streams for query: ${queryId}`);

    // Get query configuration
    const query = await this.prisma.listeningQuery.findUnique({
      where: { id: queryId },
    });

    if (!query) {
      throw new Error(`Query ${queryId} not found`);
    }

    if (!query.isActive) {
      this.logger.warn(`Query ${queryId} is not active, skipping`);
      return;
    }

    // Stop existing streams if any
    await this.stopQuery(queryId);

    // Create streams for each platform
    const streams = this.streamFactory.createStreams(query.platforms);
    this.activeStreams.set(queryId, streams);

    // Start each stream
    for (const [platform, stream] of streams) {
      try {
        // Set up mention callback
        stream.onMention((mention) => this.handleMention(queryId, query.workspaceId, mention));

        // Set up error callback
        stream.onError((error) => this.handleStreamError(queryId, platform, error));

        // Start the stream
        await stream.start({
          queryId,
          workspaceId: query.workspaceId,
          platform,
          query: query.query,
          keywords: query.keywords,
          languages: query.languages,
          locations: query.locations,
          excludeKeywords: query.excludeKeywords,
          includeRetweets: query.includeRetweets,
          minFollowers: query.minFollowers,
        });

        this.logger.log(`Started ${platform} stream for query ${queryId}`);
      } catch (error) {
        this.logger.error(
          `Failed to start ${platform} stream for query ${queryId}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Stop listening streams for a query
   */
  async stopQuery(queryId: string): Promise<void> {
    const streams = this.activeStreams.get(queryId);
    if (!streams) {
      return;
    }

    this.logger.log(`Stopping listening streams for query: ${queryId}`);

    for (const [platform, stream] of streams) {
      try {
        await stream.stop();
        this.logger.log(`Stopped ${platform} stream for query ${queryId}`);
      } catch (error) {
        this.logger.error(
          `Error stopping ${platform} stream for query ${queryId}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.activeStreams.delete(queryId);
  }

  /**
   * Start all active queries
   */
  async startAllActiveQueries(): Promise<void> {
    this.logger.log('Starting all active listening queries');

    const activeQueries = await this.prisma.listeningQuery.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const query of activeQueries) {
      try {
        await this.startQuery(query.id);
      } catch (error) {
        this.logger.error(
          `Failed to start query ${query.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(`Started ${activeQueries.length} listening queries`);
  }

  /**
   * Stop all active streams
   */
  async stopAllStreams(): Promise<void> {
    this.logger.log('Stopping all listening streams');

    const queryIds = Array.from(this.activeStreams.keys());
    for (const queryId of queryIds) {
      await this.stopQuery(queryId);
    }

    this.logger.log('All listening streams stopped');
  }

  /**
   * Get active stream status
   */
  getStreamStatus(queryId: string): { platform: Platform; active: boolean }[] {
    const streams = this.activeStreams.get(queryId);
    if (!streams) {
      return [];
    }

    return Array.from(streams.entries()).map(([platform, stream]) => ({
      platform,
      active: stream.isActive(),
    }));
  }

  /**
   * Handle a new mention from a stream
   */
  private async handleMention(
    queryId: string,
    workspaceId: string,
    mention: StreamMention,
  ): Promise<void> {
    try {
      // Process mention (includes deduplication, filtering, categorization)
      const processed = await this.mentionProcessing.processMention(
        queryId,
        workspaceId,
        mention,
      );

      if (processed) {
        this.logger.debug(`Processed mention ${mention.platformPostId} for query ${queryId}`);
        
        // Emit real-time update to connected clients
        this.mentionGateway.emitNewMention(queryId, workspaceId, mention);
        
        // Check if alerts should be triggered
        await this.checkAlerts(queryId);
      }
    } catch (error) {
      this.logger.error(
        `Error handling mention for query ${queryId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle stream errors
   */
  private handleStreamError(queryId: string, platform: Platform, error: Error): void {
    this.logger.error(
      `Stream error for query ${queryId} on ${platform}: ${error.message}`,
      error.stack,
    );

    // Could implement retry logic, notifications, etc.
  }

  /**
   * Check if alerts should be triggered for a query
   */
  private async checkAlerts(queryId: string): Promise<void> {
    const query = await this.prisma.listeningQuery.findUnique({
      where: { id: queryId },
    });

    if (!query || !query.alertsEnabled || !query.alertThreshold) {
      return;
    }

    // Count recent mentions (last hour)
    const recentCount = await this.prisma.listeningMention.count({
      where: {
        queryId,
        publishedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
    });

    if (recentCount >= query.alertThreshold) {
      this.logger.warn(
        `Alert threshold reached for query ${queryId}: ${recentCount} mentions in last hour`,
      );

      // Create alert record
      const alert = await this.prisma.listeningAlert.create({
        data: {
          queryId,
          workspaceId: query.workspaceId,
          type: 'VOLUME_SPIKE',
          title: 'Volume Spike Detected',
          description: `${recentCount} mentions detected in the last hour`,
          severity: 'MEDIUM',
          mentionCount: recentCount,
          metadata: { threshold: query.alertThreshold },
        },
      });

      // Emit real-time alert to connected clients
      this.mentionGateway.emitAlert(queryId, query.workspaceId, alert);

      // TODO: Send notifications to alert recipients
      // This would integrate with email/SMS/Slack services
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.stopAllStreams();
  }
}
