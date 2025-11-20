import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { BaseMetricsFetcher } from './base-metrics-fetcher';
import { PostMetrics, AccountMetrics } from '../interfaces/metrics-fetcher.interface';

@Injectable()
export class LinkedInMetricsFetcher extends BaseMetricsFetcher {
  private readonly apiBaseUrl = 'https://api.linkedin.com/v2';

  constructor() {
    super('LinkedIn');
  }

  async fetchPostMetrics(platformPostId: string, accessToken: string): Promise<PostMetrics> {
    try {
      // Fetch post statistics
      const statsResponse = await axios.get(
        `${this.apiBaseUrl}/socialActions/${platformPostId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const stats = statsResponse.data;

      const metrics: PostMetrics = {
        postId: platformPostId,
        platformPostId: platformPostId,
        contentType: 'post',
        timestamp: new Date(),
        likes: stats.likeCount || 0,
        comments: stats.commentCount || 0,
        shares: stats.shareCount || 0,
        impressions: stats.impressionCount || 0,
        engagementRate: 0,
      };

      metrics.engagementRate = this.calculateEngagementRate(metrics);

      return metrics;
    } catch (error) {
      this.handleError(error, 'fetchPostMetrics');
      throw error;
    }
  }

  async fetchAccountMetrics(platformAccountId: string, accessToken: string): Promise<AccountMetrics> {
    try {
      // Fetch organization statistics
      const response = await axios.get(
        `${this.apiBaseUrl}/organizationalEntityFollowerStatistics`,
        {
          params: {
            q: 'organizationalEntity',
            organizationalEntity: platformAccountId,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = response.data.elements?.[0] || {};

      return {
        accountId: platformAccountId,
        timestamp: new Date(),
        followers: data.followerCounts?.organicFollowerCount || 0,
      };
    } catch (error) {
      this.handleError(error, 'fetchAccountMetrics');
      throw error;
    }
  }

  async fetchBatchPostMetrics(platformPostIds: string[], accessToken: string): Promise<PostMetrics[]> {
    // LinkedIn doesn't support batch requests, fetch sequentially
    const metricsPromises = platformPostIds.map((id) =>
      this.fetchPostMetrics(id, accessToken).catch((error) => {
        this.logger.warn(`Failed to fetch metrics for post ${id}: ${error.message}`);
        return null;
      }),
    );

    const results = await Promise.all(metricsPromises);
    return results.filter(Boolean) as PostMetrics[];
  }

  supportsRealTimeMetrics(): boolean {
    return false; // LinkedIn has delayed metrics
  }
}
