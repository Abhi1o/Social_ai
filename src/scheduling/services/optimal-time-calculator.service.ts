import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { OptimalTimeSlot } from '../interfaces/scheduling.interface';
import { Platform } from '@prisma/client';

@Injectable()
export class OptimalTimeCalculator {
  private readonly logger = new Logger(OptimalTimeCalculator.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  /**
   * Calculate optimal posting times based on historical performance data
   * Analyzes last 90 days of posts and their engagement metrics
   */
  async calculateOptimalTimes(
    workspaceId: string,
    platform?: Platform,
    accountId?: string,
    timezone: string = 'UTC',
  ): Promise<OptimalTimeSlot[]> {
    this.logger.log(
      `Calculating optimal times for workspace ${workspaceId}, platform: ${platform}, timezone: ${timezone}`,
    );

    // Get date 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Build query for published posts
    const where: any = {
      workspaceId,
      status: 'PUBLISHED',
      publishedAt: {
        gte: ninetyDaysAgo,
      },
    };

    if (platform || accountId) {
      where.platformPosts = {
        some: {},
      };

      if (platform) {
        where.platformPosts.some.platform = platform;
      }

      if (accountId) {
        where.platformPosts.some.accountId = accountId;
      }
    }

    // Get published posts
    const posts = await this.prisma.post.findMany({
      where,
      include: {
        platformPosts: true,
      },
    });

    if (posts.length === 0) {
      this.logger.warn('No historical data available, returning default optimal times');
      return this.getDefaultOptimalTimes();
    }

    // Try to get engagement metrics from MongoDB
    let metricsMap: Map<string, any> = new Map();
    
    try {
      const metricsCollection = this.mongoConnection.collection('metrics');
      const postIds = posts.map(p => p.id);
      
      const metrics = await metricsCollection
        .find({
          postId: { $in: postIds },
        })
        .toArray();

      metrics.forEach(metric => {
        metricsMap.set(metric.postId, metric);
      });
    } catch (error) {
      this.logger.warn('Could not fetch metrics from MongoDB, using post count only', error);
    }

    // Group posts by day of week and hour
    const timeSlots: Map<string, { posts: number; totalEngagement: number }> = new Map();

    posts.forEach(post => {
      if (!post.publishedAt) return;

      const publishDate = new Date(post.publishedAt);
      const dayOfWeek = publishDate.getUTCDay();
      const hour = publishDate.getUTCHours();
      const key = `${dayOfWeek}-${hour}`;

      const existing = timeSlots.get(key) || { posts: 0, totalEngagement: 0 };
      
      // Get engagement from metrics if available
      const metrics = metricsMap.get(post.id);
      const engagement = metrics
        ? (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0)
        : 0;

      timeSlots.set(key, {
        posts: existing.posts + 1,
        totalEngagement: existing.totalEngagement + engagement,
      });
    });

    // Convert to OptimalTimeSlot array and calculate scores
    const slots: OptimalTimeSlot[] = [];
    let maxEngagement = 0;

    // Find max engagement for normalization
    timeSlots.forEach(data => {
      const avgEngagement = data.posts > 0 ? data.totalEngagement / data.posts : 0;
      if (avgEngagement > maxEngagement) {
        maxEngagement = avgEngagement;
      }
    });

    // Create slots with scores
    timeSlots.forEach((data, key) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      const avgEngagement = data.posts > 0 ? data.totalEngagement / data.posts : 0;
      
      // Score based on engagement (0-100)
      // If no metrics available, score based on post count
      const score = maxEngagement > 0
        ? Math.round((avgEngagement / maxEngagement) * 100)
        : Math.min(100, data.posts * 10); // Fallback scoring

      slots.push({
        dayOfWeek,
        hour,
        score,
        averageEngagement: avgEngagement,
        postCount: data.posts,
      });
    });

    // Sort by score descending
    slots.sort((a, b) => b.score - a.score);

    // Return top 20 time slots
    const topSlots = slots.slice(0, 20);

    this.logger.log(`Calculated ${topSlots.length} optimal time slots`);

    return topSlots;
  }

  /**
   * Get the single best time to post
   */
  async getBestTimeToPost(
    workspaceId: string,
    platform?: Platform,
    accountId?: string,
    timezone: string = 'UTC',
  ): Promise<OptimalTimeSlot | null> {
    const optimalTimes = await this.calculateOptimalTimes(
      workspaceId,
      platform,
      accountId,
      timezone,
    );

    return optimalTimes.length > 0 ? optimalTimes[0] : null;
  }

  /**
   * Get next available optimal time slot
   */
  async getNextOptimalTime(
    workspaceId: string,
    platform?: Platform,
    accountId?: string,
    timezone: string = 'UTC',
  ): Promise<Date | null> {
    const optimalTimes = await this.calculateOptimalTimes(
      workspaceId,
      platform,
      accountId,
      timezone,
    );

    if (optimalTimes.length === 0) {
      return null;
    }

    const now = new Date();
    const currentDayOfWeek = now.getUTCDay();
    const currentHour = now.getUTCHours();

    // Find next optimal time slot
    for (const slot of optimalTimes) {
      const nextDate = this.getNextDateForSlot(slot.dayOfWeek, slot.hour, now);
      
      // Must be at least 1 hour in the future
      if (nextDate.getTime() > now.getTime() + 3600000) {
        return nextDate;
      }
    }

    // If no slot found in near future, return the best slot next week
    const bestSlot = optimalTimes[0];
    return this.getNextDateForSlot(bestSlot.dayOfWeek, bestSlot.hour, now);
  }

  /**
   * Get default optimal times when no historical data is available
   */
  private getDefaultOptimalTimes(): OptimalTimeSlot[] {
    // Based on general social media best practices
    const defaultTimes = [
      { dayOfWeek: 2, hour: 10 }, // Tuesday 10 AM
      { dayOfWeek: 2, hour: 14 }, // Tuesday 2 PM
      { dayOfWeek: 3, hour: 10 }, // Wednesday 10 AM
      { dayOfWeek: 3, hour: 14 }, // Wednesday 2 PM
      { dayOfWeek: 4, hour: 10 }, // Thursday 10 AM
      { dayOfWeek: 4, hour: 14 }, // Thursday 2 PM
      { dayOfWeek: 1, hour: 10 }, // Monday 10 AM
      { dayOfWeek: 5, hour: 10 }, // Friday 10 AM
    ];

    return defaultTimes.map((time, index) => ({
      ...time,
      score: 100 - index * 10,
      averageEngagement: 0,
      postCount: 0,
    }));
  }

  /**
   * Get next date for a specific day of week and hour
   */
  private getNextDateForSlot(dayOfWeek: number, hour: number, fromDate: Date): Date {
    const result = new Date(fromDate);
    result.setUTCHours(hour, 0, 0, 0);

    const currentDayOfWeek = result.getUTCDay();
    let daysToAdd = dayOfWeek - currentDayOfWeek;

    if (daysToAdd < 0 || (daysToAdd === 0 && result <= fromDate)) {
      daysToAdd += 7;
    }

    result.setUTCDate(result.getUTCDate() + daysToAdd);

    return result;
  }

  /**
   * Suggest optimal times for a batch of posts
   */
  async suggestScheduleForBatch(
    workspaceId: string,
    postCount: number,
    platform?: Platform,
    accountId?: string,
    timezone: string = 'UTC',
    startDate?: Date,
  ): Promise<Date[]> {
    const optimalTimes = await this.calculateOptimalTimes(
      workspaceId,
      platform,
      accountId,
      timezone,
    );

    if (optimalTimes.length === 0) {
      return [];
    }

    const suggestions: Date[] = [];
    const now = startDate || new Date();
    let currentDate = new Date(now);

    // Distribute posts across optimal time slots
    let slotIndex = 0;

    for (let i = 0; i < postCount; i++) {
      const slot = optimalTimes[slotIndex % optimalTimes.length];
      const nextDate = this.getNextDateForSlot(slot.dayOfWeek, slot.hour, currentDate);

      // Ensure at least 1 hour gap between posts
      if (nextDate.getTime() > currentDate.getTime() + 3600000) {
        suggestions.push(nextDate);
        currentDate = new Date(nextDate);
        slotIndex++;
      } else {
        // Move to next day if too close
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
    }

    return suggestions;
  }
}
