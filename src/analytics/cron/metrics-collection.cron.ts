import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsCollectionService } from '../services/metrics-collection.service';
import { MetricsAggregationService } from '../services/metrics-aggregation.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MetricsCollectionCron {
  private readonly logger = new Logger(MetricsCollectionCron.name);

  constructor(
    private readonly metricsCollectionService: MetricsCollectionService,
    private readonly metricsAggregationService: MetricsAggregationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Collect metrics every hour for all workspaces
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyMetricsCollection() {
    this.logger.log('Starting hourly metrics collection');

    try {
      await this.metricsCollectionService.collectAllWorkspacesMetrics();
      this.logger.log('Completed hourly metrics collection');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error in hourly metrics collection: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Aggregate daily metrics at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyAggregation() {
    this.logger.log('Starting daily metrics aggregation');

    try {
      const workspaces = await this.prisma.workspace.findMany({
        select: { id: true },
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      for (const workspace of workspaces) {
        try {
          await this.metricsAggregationService.aggregateDailyMetrics(
            workspace.id,
            yesterday,
          );
        } catch (error) {
          const err = error as Error;
          this.logger.error(
            `Failed to aggregate daily metrics for workspace ${workspace.id}: ${err.message}`,
          );
        }
      }

      this.logger.log('Completed daily metrics aggregation');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error in daily aggregation: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Aggregate weekly metrics every Monday at 1 AM
   */
  @Cron('0 1 * * 1')
  async handleWeeklyAggregation() {
    this.logger.log('Starting weekly metrics aggregation');

    try {
      const workspaces = await this.prisma.workspace.findMany({
        select: { id: true },
      });

      // Get the start of last week (Monday)
      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      lastWeekStart.setHours(0, 0, 0, 0);
      const dayOfWeek = lastWeekStart.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      lastWeekStart.setDate(lastWeekStart.getDate() - daysToMonday);

      for (const workspace of workspaces) {
        try {
          await this.metricsAggregationService.aggregateWeeklyMetrics(
            workspace.id,
            lastWeekStart,
          );
        } catch (error) {
          const err = error as Error;
          this.logger.error(
            `Failed to aggregate weekly metrics for workspace ${workspace.id}: ${err.message}`,
          );
        }
      }

      this.logger.log('Completed weekly metrics aggregation');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error in weekly aggregation: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Aggregate monthly metrics on the 1st of each month at 2 AM
   */
  @Cron('0 2 1 * *')
  async handleMonthlyAggregation() {
    this.logger.log('Starting monthly metrics aggregation');

    try {
      const workspaces = await this.prisma.workspace.findMany({
        select: { id: true },
      });

      // Get the start of last month
      const lastMonthStart = new Date();
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      lastMonthStart.setDate(1);
      lastMonthStart.setHours(0, 0, 0, 0);

      for (const workspace of workspaces) {
        try {
          await this.metricsAggregationService.aggregateMonthlyMetrics(
            workspace.id,
            lastMonthStart,
          );
        } catch (error) {
          const err = error as Error;
          this.logger.error(
            `Failed to aggregate monthly metrics for workspace ${workspace.id}: ${err.message}`,
          );
        }
      }

      this.logger.log('Completed monthly metrics aggregation');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error in monthly aggregation: ${err.message}`,
        err.stack,
      );
    }
  }
}
