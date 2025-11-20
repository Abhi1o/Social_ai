import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { BaseMetricsFetcher } from './base-metrics-fetcher';
import { PostMetrics, AccountMetrics } from '../interfaces/metrics-fetcher.interface';

@Injectable()
export class TwitterMetricsFetcher extends BaseMetricsFetcher {
  private readonly apiBaseUrl = 'https://api.twitter.com/2';

  constructor() {
    super('Twitter');
  }

  async fetchPostMetrics(platformPostId: string, accessToken: string): Promise<PostMetrics> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/tweets/${platformPostId}`, {
        params: {
          'tweet.fields': 'created_at,public_metrics',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = response.data.data;
      const publicMetrics = data.public_metrics || {};

      const metrics: PostMetrics = {
        postId: platformPostId,
        platformPostId: platformPostId,
        contentType: 'tweet',
        timestamp: new Date(data.created_at),
        likes: publicMetrics.like_count || 0,
        comments: publicMetrics.reply_count || 0,
        shares: publicMetrics.retweet_count || 0,
        impressions: publicMetrics.impression_count || 0,
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
      const response = await axios.get(`${this.apiBaseUrl}/users/${platformAccountId}`, {
        params: {
          'user.fields': 'public_metrics',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = response.data.data;
      const publicMetrics = data.public_metrics || {};

      return {
        accountId: platformAccountId,
        timestamp: new Date(),
        followers: publicMetrics.followers_count || 0,
        following: publicMetrics.following_count || 0,
      };
    } catch (error) {
      this.handleError(error, 'fetchAccountMetrics');
      throw error;
    }
  }

  async fetchBatchPostMetrics(platformPostIds: string[], accessToken: string): Promise<PostMetrics[]> {
    try {
      // Twitter API v2 supports fetching multiple tweets
      const response = await axios.get(`${this.apiBaseUrl}/tweets`, {
        params: {
          ids: platformPostIds.join(','),
          'tweet.fields': 'created_at,public_metrics',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.data.map((data: any) => {
        const publicMetrics = data.public_metrics || {};

        const metrics: PostMetrics = {
          postId: data.id,
          platformPostId: data.id,
          contentType: 'tweet',
          timestamp: new Date(data.created_at),
          likes: publicMetrics.like_count || 0,
          comments: publicMetrics.reply_count || 0,
          shares: publicMetrics.retweet_count || 0,
          impressions: publicMetrics.impression_count || 0,
          engagementRate: 0,
        };

        metrics.engagementRate = this.calculateEngagementRate(metrics);
        return metrics;
      });
    } catch (error) {
      this.handleError(error, 'fetchBatchPostMetrics');
      throw error;
    }
  }

  supportsRealTimeMetrics(): boolean {
    return true;
  }
}
