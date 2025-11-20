import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TrendDetectionService } from '../services/trend-detection.service';

/**
 * Background worker for automated trend detection
 * Runs periodically to detect and update trends across all workspaces
 * 
 * Requirements: 9.4, 18.4
 */
@Injectable()
export class TrendDetectionWorker {
  private readonly logger = new Logger(TrendDetectionWorker.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly trendService: TrendDetectionService,
  ) {}

  /**
   * Detect trends every hour
   * Analyzes mentions from the last 24 hours to identify trending topics
   */
  @Cron(CronExpression.EVERY_HOUR)
  async detectTrendsHourly() {
    if (this.isRunning) {
      this.logger.warn('Trend detection already running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting hourly trend detection');

    try {
      // Get all active workspaces
      const workspaces = await this.prisma.workspace.findMany({
        select: { id: true, name: true },
      });

      this.logger.log(`Processing ${workspaces.length} workspaces`);

      // Process each workspace
      for (const workspace of workspaces) {
        try {
          const result = await this.trendService.detectTrends(workspace.id);
          this.logger.log(
            `Workspace ${workspace.name}: Detected ${result.trends.length} trends ` +
            `(${result.summary.emerging} emerging, ${result.summary.viral} viral)`,
          );
        } catch (error) {
          const err = error as Error;
          this.logger.error(
            `Error detecting trends for workspace ${workspace.name}: ${err.message}`,
            err.stack,
          );
        }
      }

      this.logger.log('Hourly trend detection completed');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error in trend detection worker: ${err.message}`,
        err.stack,
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up old trends every day
   * Archives trends that haven't been seen in 7 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldTrends() {
    this.logger.log('Starting trend cleanup');

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Mark old trends as inactive
      const result = await this.trendService['trendModel'].updateMany(
        {
          lastSeenAt: { $lt: sevenDaysAgo },
          isActive: true,
        },
        {
          $set: {
            isActive: false,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Archive after 30 days
          },
        },
      );

      this.logger.log(`Marked ${result.modifiedCount} trends as inactive`);

      // Delete expired trends
      const deleteResult = await this.trendService['trendModel'].deleteMany({
        expiresAt: { $lt: new Date() },
      });

      this.logger.log(`Deleted ${deleteResult.deletedCount} expired trends`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error cleaning up trends: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Update conversation clusters every 6 hours
   */
  @Cron('0 */6 * * *') // Every 6 hours
  async updateConversationClusters() {
    this.logger.log('Starting conversation clustering');

    try {
      // Get all active workspaces
      const workspaces = await this.prisma.workspace.findMany({
        select: { id: true, name: true },
      });

      for (const workspace of workspaces) {
        try {
          const clusters = await this.trendService.clusterConversations(
            workspace.id,
            { minSize: 5, minCohesion: 0.5, days: 7, limit: 50 },
          );

          this.logger.log(
            `Workspace ${workspace.name}: Created ${clusters.length} conversation clusters`,
          );
        } catch (error) {
          const err = error as Error;
          this.logger.error(
            `Error clustering conversations for workspace ${workspace.name}: ${err.message}`,
            err.stack,
          );
        }
      }

      this.logger.log('Conversation clustering completed');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error in conversation clustering: ${err.message}`,
        err.stack,
      );
    }
  }
}
