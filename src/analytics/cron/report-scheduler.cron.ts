import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportBuilderService } from '../services/report-builder.service';

/**
 * Report Scheduler Cron Job
 * Processes scheduled reports and sends them to recipients
 * Requirements: 4.4, 11.4
 */
@Injectable()
export class ReportSchedulerCron {
  private readonly logger = new Logger(ReportSchedulerCron.name);

  constructor(
    private readonly reportBuilderService: ReportBuilderService,
  ) {}

  /**
   * Process scheduled reports every hour
   * Requirements: 4.4, 11.4
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledReports() {
    this.logger.log('Starting scheduled report processing...');

    try {
      const results = await this.reportBuilderService.processScheduledReports();

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      this.logger.log(
        `Scheduled report processing completed. Success: ${successful}, Failed: ${failed}`,
      );

      if (failed > 0) {
        this.logger.warn(
          `Failed reports: ${JSON.stringify(results.filter(r => !r.success))}`,
        );
      }
    } catch (error) {
      this.logger.error('Error processing scheduled reports:', error);
    }
  }
}
