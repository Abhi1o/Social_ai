import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus } from '@prisma/client';
import { ScheduledPostJob } from './interfaces/scheduling.interface';
import { SchedulePostDto, ReschedulePostDto } from './dto/schedule-post.dto';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    @InjectQueue('post-publishing') private readonly publishQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Schedule a post for publishing at a specific time
   */
  async schedulePost(
    workspaceId: string,
    postId: string,
    dto: SchedulePostDto,
  ): Promise<any> {
    this.logger.log(`Scheduling post ${postId} for ${dto.scheduledAt}`);

    // Verify post exists and belongs to workspace
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        workspaceId,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Don't allow scheduling already published posts
    if (post.status === PostStatus.PUBLISHED) {
      throw new BadRequestException('Cannot schedule already published posts');
    }

    const scheduledAt = new Date(dto.scheduledAt);

    // Validate scheduled time is in the future
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    // Update post status and scheduled time
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        scheduledAt,
        status: PostStatus.SCHEDULED,
      },
      include: {
        platformPosts: {
          include: {
            account: true,
          },
        },
      },
    });

    // Add job to queue
    const jobData: ScheduledPostJob = {
      postId,
      workspaceId,
      scheduledAt,
      timezone: dto.timezone,
    };

    const delay = scheduledAt.getTime() - Date.now();
    
    await this.publishQueue.add(
      'publish-scheduled-post',
      jobData,
      {
        delay,
        jobId: `post-${postId}`,
        removeOnComplete: {
          age: 86400, // Keep completed jobs for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // Keep failed jobs for 7 days
        },
      },
    );

    this.logger.log(`Post ${postId} scheduled successfully for ${scheduledAt}`);

    return {
      post: updatedPost,
      scheduledAt,
      timezone: dto.timezone,
      queueJobId: `post-${postId}`,
    };
  }

  /**
   * Reschedule an existing scheduled post
   */
  async reschedulePost(
    workspaceId: string,
    postId: string,
    dto: ReschedulePostDto,
  ): Promise<any> {
    this.logger.log(`Rescheduling post ${postId} to ${dto.newScheduledAt}`);

    // Verify post exists and is scheduled
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        workspaceId,
        status: PostStatus.SCHEDULED,
      },
    });

    if (!post) {
      throw new NotFoundException('Scheduled post not found');
    }

    const newScheduledAt = new Date(dto.newScheduledAt);

    // Validate new scheduled time is in the future
    if (newScheduledAt <= new Date()) {
      throw new BadRequestException('New scheduled time must be in the future');
    }

    // Remove existing job from queue
    try {
      const job = await this.publishQueue.getJob(`post-${postId}`);
      if (job) {
        await job.remove();
        this.logger.log(`Removed existing job for post ${postId}`);
      }
    } catch (error) {
      this.logger.warn(`Could not remove existing job for post ${postId}:`, error);
    }

    // Update post with new scheduled time
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        scheduledAt: newScheduledAt,
      },
      include: {
        platformPosts: {
          include: {
            account: true,
          },
        },
      },
    });

    // Add new job to queue
    const jobData: ScheduledPostJob = {
      postId,
      workspaceId,
      scheduledAt: newScheduledAt,
      timezone: dto.timezone,
    };

    const delay = newScheduledAt.getTime() - Date.now();
    
    await this.publishQueue.add(
      'publish-scheduled-post',
      jobData,
      {
        delay,
        jobId: `post-${postId}`,
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 604800,
        },
      },
    );

    this.logger.log(`Post ${postId} rescheduled successfully to ${newScheduledAt}`);

    return {
      post: updatedPost,
      previousScheduledAt: post.scheduledAt,
      newScheduledAt,
      timezone: dto.timezone,
    };
  }

  /**
   * Cancel a scheduled post
   */
  async cancelScheduledPost(workspaceId: string, postId: string): Promise<any> {
    this.logger.log(`Canceling scheduled post ${postId}`);

    // Verify post exists and is scheduled
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        workspaceId,
        status: PostStatus.SCHEDULED,
      },
    });

    if (!post) {
      throw new NotFoundException('Scheduled post not found');
    }

    // Remove job from queue
    try {
      const job = await this.publishQueue.getJob(`post-${postId}`);
      if (job) {
        await job.remove();
        this.logger.log(`Removed job for post ${postId}`);
      }
    } catch (error) {
      this.logger.warn(`Could not remove job for post ${postId}:`, error);
    }

    // Update post status back to draft
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.DRAFT,
        scheduledAt: null,
      },
    });

    this.logger.log(`Post ${postId} schedule canceled successfully`);

    return {
      post: updatedPost,
      message: 'Schedule canceled successfully',
    };
  }

  /**
   * Get all scheduled posts for a workspace
   */
  async getScheduledPosts(workspaceId: string, startDate?: Date, endDate?: Date) {
    const where: any = {
      workspaceId,
      status: PostStatus.SCHEDULED,
    };

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) {
        where.scheduledAt.gte = startDate;
      }
      if (endDate) {
        where.scheduledAt.lte = endDate;
      }
    }

    const posts = await this.prisma.post.findMany({
      where,
      include: {
        platformPosts: {
          include: {
            account: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        campaign: true,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    return posts;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.publishQueue.getWaitingCount(),
      this.publishQueue.getActiveCount(),
      this.publishQueue.getCompletedCount(),
      this.publishQueue.getFailedCount(),
      this.publishQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  /**
   * Manually trigger processing of due posts (used by cron job)
   */
  async processDuePosts(): Promise<void> {
    this.logger.log('Processing due posts...');

    const now = new Date();

    // Find all posts that are scheduled and due
    const duePosts = await this.prisma.post.findMany({
      where: {
        status: PostStatus.SCHEDULED,
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        platformPosts: true,
      },
    });

    this.logger.log(`Found ${duePosts.length} due posts`);

    for (const post of duePosts) {
      try {
        // Check if job already exists in queue
        const existingJob = await this.publishQueue.getJob(`post-${post.id}`);
        
        if (!existingJob) {
          // Add to queue immediately (no delay)
          const jobData: ScheduledPostJob = {
            postId: post.id,
            workspaceId: post.workspaceId,
            scheduledAt: post.scheduledAt!,
          };

          await this.publishQueue.add('publish-scheduled-post', jobData, {
            jobId: `post-${post.id}`,
            removeOnComplete: {
              age: 86400,
              count: 1000,
            },
            removeOnFail: {
              age: 604800,
            },
          });

          this.logger.log(`Added due post ${post.id} to queue`);
        }
      } catch (error) {
        this.logger.error(`Error processing due post ${post.id}:`, error);
      }
    }
  }
}
