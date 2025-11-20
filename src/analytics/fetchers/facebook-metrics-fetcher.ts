import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { BaseMetricsFetcher } from './base-metrics-fetcher';
import { PostMetrics, AccountMetrics } from '../interfaces/metrics-fetcher.interface';

@Injectable()
export class FacebookMetricsFetcher extends BaseMetricsFetcher {
  private readonly apiBaseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    super('Facebook');
  }

  async fetchPostMetrics(platformPostId: string, accessToken: string): Promise<PostMetrics> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/${platformPostId}`, {
        params: {
          fields: 'id,created_time,insights.metric(post_impressions,post_impressions_unique,post_engaged_users,post_reactions_like_total,post_clicks)',
          access_token: accessToken,
        },
      });

      const data = response.data;
      const insights = this.parseInsights(data.insights?.data || []);

      const metrics: PostMetrics = {
        postId: platformPostId,
        platformPostId: platformPostId,
        contentType: 'post',
        timestamp: new Date(data.created_time),
        likes: insights.post_reactions_like_total || 0,
        impressions: insights.post_impressions || 0,
        reach: insights.post_impressions_unique || 0,
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
      const response = await axios.get(`${this.apiBaseUrl}/${platformAccountId}`, {
        params: {
          fields: 'followers_count,fan_count,insights.metric(page_impressions,page_engaged_users,page_views_total)',
          access_token: accessToken,
        },
      });

      const data = response.data;
      const insights = this.parseInsights(data.insights?.data || []);

      return {
        accountId: platformAccountId,
        timestamp: new Date(),
        followers: data.fan_count || data.followers_count || 0,
        impressions: insights.page_impressions || 0,
        profileViews: insights.page_views_total || 0,
      };
    } catch (error) {
      this.handleError(error, 'fetchAccountMetrics');
      throw error;
    }
  }

  async fetchBatchPostMetrics(platformPostIds: string[], accessToken: string): Promise<PostMetrics[]> {
    try {
      const batchRequests = platformPostIds.map((id) => ({
        method: 'GET',
        relative_url: `${id}?fields=id,created_time,insights.metric(post_impressions,post_impressions_unique,post_engaged_users,post_reactions_like_total,post_clicks)`,
      }));

      const response = await axios.post(
        `${this.apiBaseUrl}`,
        {
          batch: batchRequests,
          access_token: accessToken,
        },
      );

      return response.data.map((item: any) => {
        if (item.code !== 200) {
          this.logger.warn(`Failed to fetch metrics for post: ${item.body}`);
          return null;
        }

        const data = JSON.parse(item.body);
        const insights = this.parseInsights(data.insights?.data || []);

        const metrics: PostMetrics = {
          postId: data.id,
          platformPostId: data.id,
          contentType: 'post',
          timestamp: new Date(data.created_time),
          likes: insights.post_reactions_like_total || 0,
          impressions: insights.post_impressions || 0,
          reach: insights.post_impressions_unique || 0,
          engagementRate: 0,
        };

        metrics.engagementRate = this.calculateEngagementRate(metrics);
        return metrics;
      }).filter(Boolean);
    } catch (error) {
      this.handleError(error, 'fetchBatchPostMetrics');
      throw error;
    }
  }

  supportsRealTimeMetrics(): boolean {
    return true;
  }

  private parseInsights(insights: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    insights.forEach((insight) => {
      result[insight.name] = insight.values?.[0]?.value || 0;
    });
    return result;
  }
}
