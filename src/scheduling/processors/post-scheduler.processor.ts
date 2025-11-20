import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { PublishingService } from '../../publishing/publishing.service';
import { ScheduledPostJob, PublishingResult } from '../interfaces/scheduling.interface';
import { PostStatus } from '@prisma/client';

@Processor('post-publishing')
export class PostSchedulerProcessor extends WorkerHost {
  private readonly logger = new Logger(PostSchedulerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publishingService: PublishingService,
  ) {
    super();
  }

  async process(job: Job<ScheduledPostJob>): Promise<PublishingResult> {
    const { postId, workspaceId, scheduledAt } = job.data;

    this.logger.log(`Processing scheduled post ${postId} (scheduled for ${scheduledAt})`);

    try {
      // Verify post still exists and is scheduled
      const post = await this.prisma.post.findFirst({
        where: {
          id: postId,
          workspaceId,
        },
      });

      if (!post) {
        this.logger.warn(`Post ${postId} not found, skipping`);
        return {
          postId,
          success: false,
          platformResults: [],
          error: 'Post not found',
        };
      }

      if (post.status === PostStatus.PUBLISHED) {
        this.logger.warn(`Post ${postId} already published, skipping`);
        return {
          postId,
          success: true,
          platformResults: [],
          error: 'Already published',
        };
      }

      if (post.status !== PostStatus.SCHEDULED) {
        this.logger.warn(`Post ${postId} is not scheduled (status: ${post.status}), skipping`);
        return {
          postId,
          success: false,
          platformResults: [],
          error: `Invalid status: ${post.status}`,
        };
      }

      // Publish the post
      this.logger.log(`Publishing post ${postId}...`);
      const result = await this.publishingService.publishPost(workspaceId, postId);

      this.logger.log(`Post ${postId} published successfully`);

      return {
        postId,
        success: result.results.every((r: any) => r.success),
        platformResults: result.results.map((r: any) => ({
          platform: r.platform,
          success: r.success,
          platformPostId: r.platformPostId,
          url: r.url,
          error: r.error,
        })),
      };
    } catch (error: any) {
      this.logger.error(`Error publishing post ${postId}:`, error);

      // Update post status to failed
      try {
        await this.prisma.post.update({
          where: { id: postId },
          data: {
            status: PostStatus.FAILED,
          },
        });
      } catch (updateError) {
        this.logger.error(`Error updating post status to failed:`, updateError);
      }

      throw error; // Re-throw to mark job as failed
    }
  }
}
