import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SchedulingService } from '../scheduling.service';
import { OptimalTimeCalculator } from './optimal-time-calculator.service';
import { EvergreenPost } from '../interfaces/scheduling.interface';
import { Platform, PostStatus } from '@prisma/client';

@Injectable()
export class EvergreenRotationService {
  private readonly logger = new Logger(EvergreenRotationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulingService: SchedulingService,
    private readonly optimalTimeCalculator: OptimalTimeCalculator,
  ) {}

  /**
   * Get evergreen posts for a workspace
   * Evergreen posts are posts tagged with 'evergreen' that can be reposted
   */
  async getEvergreenPosts(workspaceId: string): Promise<EvergreenPost[]> {
    const posts = await this.prisma.post.findMany({
      where: {
        workspaceId,
        tags: {
          has: 'evergreen',
        },
        status: {
          in: [PostStatus.PUBLISHED, PostStatus.DRAFT],
        },
      },
      include: {
        platformPosts: true,
      },
      orderBy: {
        publishedAt: 'asc',
      },
    });

    return posts.map(post => {
      // Count how many times this post has been published
      const publishCount = post.platformPosts.filter(
        pp => pp.publishStatus === 'PUBLISHED',
      ).length;

      return {
        postId: post.id,
        lastPublished: post.publishedAt || undefined,
        publishCount,
        priority: this.calculateEvergreenPriority(post.publishedAt, publishCount),
      };
    });
  }

  /**
   * Calculate priority for evergreen post rotation
   * Posts that haven't been published recently get higher priority
   * Posts with fewer publishes get higher priority
   */
  private calculateEvergreenPriority(lastPublished: Date | null, publishCount: number): number {
    let priority = 100;

    if (lastPublished) {
      const daysSincePublished = Math.floor(
        (Date.now() - lastPublished.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Reduce priority based on recency (max reduction: 50 points)
      priority -= Math.min(50, Math.max(0, 50 - daysSincePublished));
    }

    // Reduce priority based on publish count (diminishing returns)
    // First publish: 0 reduction
    // Second: -5
    // Third: -8
    // Fourth: -10, etc.
    priority -= Math.min(30, publishCount * 3);

    return Math.max(0, priority);
  }

  /**
   * Schedule next batch of evergreen posts
   */
  async scheduleEvergreenRotation(
    workspaceId: string,
    count: number = 5,
    platform?: Platform,
    accountId?: string,
  ): Promise<any[]> {
    this.logger.log(`Scheduling ${count} evergreen posts for workspace ${workspaceId}`);

    // Get evergreen posts sorted by priority
    const evergreenPosts = await this.getEvergreenPosts(workspaceId);

    if (evergreenPosts.length === 0) {
      this.logger.warn('No evergreen posts found');
      return [];
    }

    // Sort by priority (highest first)
    evergreenPosts.sort((a, b) => b.priority - a.priority);

    // Take top N posts
    const postsToSchedule = evergreenPosts.slice(0, Math.min(count, evergreenPosts.length));

    // Get optimal times for scheduling
    const optimalTimes = await this.optimalTimeCalculator.suggestScheduleForBatch(
      workspaceId,
      postsToSchedule.length,
      platform,
      accountId,
    );

    if (optimalTimes.length === 0) {
      this.logger.warn('Could not calculate optimal times');
      return [];
    }

    // Schedule each post
    const scheduled = [];

    for (let i = 0; i < postsToSchedule.length; i++) {
      const evergreenPost = postsToSchedule[i];
      const scheduledAt = optimalTimes[i] || optimalTimes[optimalTimes.length - 1];

      try {
        // Check if post is already scheduled
        const post = await this.prisma.post.findUnique({
          where: { id: evergreenPost.postId },
        });

        if (post && post.status === PostStatus.SCHEDULED) {
          this.logger.log(`Post ${evergreenPost.postId} is already scheduled, skipping`);
          continue;
        }

        // Schedule the post
        const result = await this.schedulingService.schedulePost(
          workspaceId,
          evergreenPost.postId,
          {
            scheduledAt: scheduledAt.toISOString(),
          },
        );

        scheduled.push({
          postId: evergreenPost.postId,
          scheduledAt,
          priority: evergreenPost.priority,
          publishCount: evergreenPost.publishCount,
        });

        this.logger.log(`Scheduled evergreen post ${evergreenPost.postId} for ${scheduledAt}`);
      } catch (error) {
        this.logger.error(`Error scheduling evergreen post ${evergreenPost.postId}:`, error);
      }
    }

    return scheduled;
  }

  /**
   * Auto-rotate evergreen content based on frequency settings
   */
  async autoRotateEvergreen(
    workspaceId: string,
    frequencyDays: number = 30,
    maxPostsPerRotation: number = 3,
  ): Promise<any> {
    this.logger.log(
      `Auto-rotating evergreen content for workspace ${workspaceId} (frequency: ${frequencyDays} days)`,
    );

    // Get evergreen posts that haven't been published recently
    const evergreenPosts = await this.getEvergreenPosts(workspaceId);

    const dueForRotation = evergreenPosts.filter(post => {
      if (!post.lastPublished) {
        return true; // Never published, definitely due
      }

      const daysSincePublished = Math.floor(
        (Date.now() - post.lastPublished.getTime()) / (1000 * 60 * 60 * 24),
      );

      return daysSincePublished >= frequencyDays;
    });

    if (dueForRotation.length === 0) {
      this.logger.log('No evergreen posts due for rotation');
      return {
        scheduled: [],
        message: 'No posts due for rotation',
      };
    }

    // Sort by priority and take top N
    dueForRotation.sort((a, b) => b.priority - a.priority);
    const toSchedule = dueForRotation.slice(0, maxPostsPerRotation);

    // Schedule them
    const scheduled = await this.scheduleEvergreenRotation(
      workspaceId,
      toSchedule.length,
    );

    return {
      scheduled,
      totalDue: dueForRotation.length,
      totalScheduled: scheduled.length,
    };
  }

  /**
   * Get rotation statistics
   */
  async getRotationStats(workspaceId: string): Promise<any> {
    const evergreenPosts = await this.getEvergreenPosts(workspaceId);

    const stats = {
      totalEvergreenPosts: evergreenPosts.length,
      neverPublished: evergreenPosts.filter(p => !p.lastPublished).length,
      averagePublishCount:
        evergreenPosts.length > 0
          ? evergreenPosts.reduce((sum, p) => sum + p.publishCount, 0) / evergreenPosts.length
          : 0,
      highPriorityPosts: evergreenPosts.filter(p => p.priority >= 70).length,
      mediumPriorityPosts: evergreenPosts.filter(p => p.priority >= 40 && p.priority < 70).length,
      lowPriorityPosts: evergreenPosts.filter(p => p.priority < 40).length,
    };

    return stats;
  }
}
