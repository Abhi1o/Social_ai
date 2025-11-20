import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SchedulingService } from '../scheduling.service';

@Injectable()
export class PostSchedulerCron {
  private readonly logger = new Logger(PostSchedulerCron.name);

  constructor(private readonly schedulingService: SchedulingService) {}

  /**
   * Process due posts every 5 minutes
   * This ensures that posts scheduled for publishing are processed even if
   * the queue job was missed or failed
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processDuePosts() {
    this.logger.log('Running scheduled post processing cron job');

    try {
      await this.schedulingService.processDuePosts();
      this.logger.log('Scheduled post processing completed');
    } catch (error) {
      this.logger.error('Error in scheduled post processing cron job:', error);
    }
  }

  /**
   * Clean up old completed jobs every day at 2 AM
   */
  @Cron('0 2 * * *')
  async cleanupOldJobs() {
    this.logger.log('Running job cleanup cron');
    // BullMQ handles this automatically with removeOnComplete/removeOnFail options
    // This is just a placeholder for any additional cleanup logic
    this.logger.log('Job cleanup completed');
  }
}
