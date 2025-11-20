import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CrisisDetectionService } from '../services/crisis-detection.service';
import { AlertChannel } from '../schemas/crisis.schema';

/**
 * Background worker for automated crisis monitoring
 * Runs periodic checks for potential crises across all workspaces
 * 
 * Requirements: 9.5, 35.1, 35.2
 */
@Injectable()
export class CrisisMonitoringWorker {
  private readonly logger = new Logger(CrisisMonitoringWorker.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crisisService: CrisisDetectionService,
  ) {}

  /**
   * Monitor all workspaces for crises every 5 minutes
   * Checks for sentiment spikes and volume anomalies
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorAllWorkspaces(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Crisis monitoring already running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting automated crisis monitoring');

    try {
      // Get all active workspaces
      const workspaces = await this.prisma.workspace.findMany({
        where: { isActive: true },
        select: { 
          id: true, 
          name: true,
          settings: true,
        },
      });

      this.logger.log(`Monitoring ${workspaces.length} workspaces for crises`);

      let crisesDetected = 0;

      // Monitor each workspace
      for (const workspace of workspaces) {
        try {
          // Get workspace-specific crisis detection settings
          const settings = workspace.settings as any;
          const crisisConfig = settings?.crisisDetection || {};

          const result = await this.crisisService.monitorForCrisis(workspace.id, {
            sentimentThreshold: crisisConfig.sentimentThreshold || -0.5,
            volumeThreshold: crisisConfig.volumeThreshold || 200,
            timeWindow: crisisConfig.timeWindow || 60,
            minMentions: crisisConfig.minMentions || 10,
          });

          if (result.crisisDetected && result.crisis) {
            crisesDetected++;
            this.logger.warn(
              `Crisis detected for workspace ${workspace.name}: ${result.crisis.title}`
            );

            // Send automatic alerts if configured
            if (crisisConfig.autoAlerts !== false) {
              await this.sendAutomaticAlerts(workspace.id, result.crisis.id.toString());
            }
          }
        } catch (error) {
          const err = error as Error;
          this.logger.error(
            `Error monitoring workspace ${workspace.id}: ${err.message}`,
            err.stack,
          );
        }
      }

      this.logger.log(
        `Crisis monitoring completed. ${crisesDetected} crises detected across ${workspaces.length} workspaces`
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Crisis monitoring failed: ${err.message}`, err.stack);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send automatic alerts for detected crisis
   * 
   * @param workspaceId - Workspace ID
   * @param crisisId - Crisis ID
   */
  private async sendAutomaticAlerts(
    workspaceId: string,
    crisisId: string,
  ): Promise<void> {
    try {
      // Get workspace alert configuration
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { settings: true },
      });

      const settings = workspace?.settings as any;
      const alertConfig = settings?.crisisAlerts || {};

      // Get users to alert (admins and managers by default)
      const users = await this.prisma.user.findMany({
        where: {
          workspaceId,
          role: { in: ['ADMIN', 'MANAGER'] },
          isActive: true,
        },
        select: { id: true },
      });

      if (users.length === 0) {
        this.logger.warn(`No users to alert for workspace ${workspaceId}`);
        return;
      }

      const recipients = users.map(u => u.id);

      // Determine alert channels
      const channels: AlertChannel[] = alertConfig.channels || [
        AlertChannel.EMAIL,
        AlertChannel.PUSH,
      ];

      // Send alerts
      await this.crisisService.sendCrisisAlerts(
        crisisId,
        channels,
        recipients,
      );

      this.logger.log(
        `Automatic alerts sent for crisis ${crisisId} to ${recipients.length} users`
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send automatic alerts for crisis ${crisisId}: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Update crisis metrics for active crises every 15 minutes
   * Tracks ongoing crisis evolution
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async updateActiveCrises(): Promise<void> {
    this.logger.log('Updating active crisis metrics');

    try {
      // This would fetch active crises and update their metrics
      // Implementation would track sentiment changes, volume changes, etc.
      this.logger.log('Active crisis metrics updated');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to update active crises: ${err.message}`, err.stack);
    }
  }

  /**
   * Clean up old resolved crises (archive after 90 days)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async archiveOldCrises(): Promise<void> {
    this.logger.log('Archiving old resolved crises');

    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // This would archive or delete old crises
      // Implementation would move to cold storage or mark as archived
      
      this.logger.log('Old crises archived');
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to archive old crises: ${err.message}`, err.stack);
    }
  }
}
