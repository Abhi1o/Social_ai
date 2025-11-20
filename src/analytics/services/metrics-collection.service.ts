import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Metric, MetricDocument } from '../schemas/metric.schema';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsFetcherFactory } from '../fetchers/metrics-fetcher.factory';
import { PostMetrics, AccountMetrics } from '../interfaces/metrics-fetcher.interface';

@Injectable()
export class MetricsCollectionService {
  private readonly logger = new Logger(MetricsCollectionService.name);

  constructor(
    @InjectModel(Metric.name) private metricModel: Model<MetricDocument>,
    private readonly prisma: PrismaService,
    private readonly fetcherFactory: MetricsFetcherFactory,
  ) {}

  /**
   * Collect metrics for all active social accounts in a workspace
   */
  async collectWorkspaceMetrics(workspaceId: string): Promise<void> {
    this.logger.log(`Starting metrics collection for workspace: ${workspaceId}`);

    try {
      // Get all active social accounts for the workspace
      const accounts = await this.prisma.socialAccount.findMany({
        where: {
          workspaceId,
          isActive: true,
        },
      });

      this.logger.log(`Found ${accounts.length} active accounts for workspace ${workspaceId}`);

      // Collect metrics for each account
      const collectionPromises = accounts.map((account) =>
        this.collectAccountMetrics(account.id, workspaceId).catch((error) => {
          this.logger.error(
            `Failed to collect metrics for account ${account.id}: ${error.message}`,
            error.stack,
          );
        }),
      );

      await Promise.all(collectionPromises);

      this.logger.log(`Completed metrics collection for workspace: ${workspaceId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error collecting workspace metrics: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Collect metrics for a specific social account
   */
  async collectAccountMetrics(accountId: string, workspaceId: string): Promise<void> {
    try {
      const account = await this.prisma.socialAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || !account.isActive) {
        this.logger.warn(`Account ${accountId} not found or inactive`);
        return;
      }

      const fetcher = this.fetcherFactory.getFetcher(account.platform);

      // Collect account-level metrics
      const accountMetrics = await fetcher.fetchAccountMetrics(
        account.platformAccountId,
        account.accessToken,
      );

      await this.storeAccountMetrics(workspaceId, accountId, account.platform, accountMetrics);

      // Collect post-level metrics for recent posts
      await this.collectPostMetrics(workspaceId, accountId, account.platform, account.accessToken);

      this.logger.log(`Successfully collected metrics for account: ${accountId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error collecting account metrics for ${accountId}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Collect metrics for posts from a specific account
   */
  private async collectPostMetrics(
    workspaceId: string,
    accountId: string,
    platform: string,
    accessToken: string,
  ): Promise<void> {
    try {
      // Get recent published posts (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const platformPosts = await this.prisma.platformPost.findMany({
        where: {
          accountId,
          publishStatus: 'PUBLISHED',
          publishedAt: {
            gte: thirtyDaysAgo,
          },
          platformPostId: {
            not: null,
          },
        },
        include: {
          post: true,
        },
      });

      if (platformPosts.length === 0) {
        this.logger.log(`No recent posts found for account ${accountId}`);
        return;
      }

      const fetcher = this.fetcherFactory.getFetcher(platform);
      const platformPostIds = platformPosts
        .map((pp) => pp.platformPostId)
        .filter(Boolean) as string[];

      // Fetch metrics in batch if supported
      const postMetrics = await fetcher.fetchBatchPostMetrics(platformPostIds, accessToken);

      // Store metrics for each post
      const storePromises = postMetrics.map((metrics) => {
        const platformPost = platformPosts.find(
          (pp) => pp.platformPostId === metrics.platformPostId,
        );
        if (platformPost) {
          return this.storePostMetrics(
            workspaceId,
            accountId,
            platform,
            platformPost.postId,
            metrics,
          );
        }
      });

      await Promise.all(storePromises);

      this.logger.log(`Collected metrics for ${postMetrics.length} posts from account ${accountId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error collecting post metrics: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Store account-level metrics in MongoDB
   */
  private async storeAccountMetrics(
    workspaceId: string,
    accountId: string,
    platform: string,
    metrics: AccountMetrics,
  ): Promise<void> {
    try {
      await this.metricModel.create({
        workspaceId,
        accountId,
        platform,
        timestamp: metrics.timestamp,
        metricType: 'account',
        metadata: {},
        metrics: {
          followers: metrics.followers,
          following: metrics.following,
          impressions: metrics.impressions,
          reach: metrics.reach,
          profileViews: metrics.profileViews,
          websiteClicks: metrics.websiteClicks,
          emailClicks: metrics.emailClicks,
        },
        collectedAt: new Date(),
      });

      this.logger.debug(`Stored account metrics for ${accountId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error storing account metrics: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Store post-level metrics in MongoDB
   */
  private async storePostMetrics(
    workspaceId: string,
    accountId: string,
    platform: string,
    postId: string,
    metrics: PostMetrics,
  ): Promise<void> {
    try {
      await this.metricModel.create({
        workspaceId,
        accountId,
        platform,
        timestamp: metrics.timestamp,
        metricType: 'post',
        metadata: {
          postId,
          platformPostId: metrics.platformPostId,
          contentType: metrics.contentType,
        },
        metrics: {
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          saves: metrics.saves,
          impressions: metrics.impressions,
          reach: metrics.reach,
          views: metrics.views,
          watchTime: metrics.watchTime,
          completionRate: metrics.completionRate,
          engagementRate: metrics.engagementRate,
        },
        collectedAt: new Date(),
      });

      this.logger.debug(`Stored post metrics for ${postId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error storing post metrics: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Collect metrics for all workspaces
   */
  async collectAllWorkspacesMetrics(): Promise<void> {
    this.logger.log('Starting metrics collection for all workspaces');

    try {
      const workspaces = await this.prisma.workspace.findMany({
        select: { id: true },
      });

      this.logger.log(`Found ${workspaces.length} workspaces`);

      // Process workspaces in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < workspaces.length; i += batchSize) {
        const batch = workspaces.slice(i, i + batchSize);
        await Promise.all(
          batch.map((workspace) =>
            this.collectWorkspaceMetrics(workspace.id).catch((error) => {
              this.logger.error(
                `Failed to collect metrics for workspace ${workspace.id}: ${error.message}`,
              );
            }),
          ),
        );
      }

      this.logger.log('Completed metrics collection for all workspaces');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error in collectAllWorkspacesMetrics: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }
}
