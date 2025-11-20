import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { BaseMetricsFetcher } from './base-metrics-fetcher';
import { PostMetrics, AccountMetrics } from '../interfaces/metrics-fetcher.interface';

@Injectable()
export class InstagramMetricsFetcher extends BaseMetricsFetcher {
  private readonly apiBaseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    super('Instagram');
  }

  async fetchPostMetrics(platformPostId: string, accessToken: string): Promise<PostMetrics> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/${platformPostId}`, {
        params: {
          fields: 'id,media_type,like_count,comments_count,timestamp,insights.metric(impressions,reach,saved,engagement)',
          access_token: accessToken,
        },
      });

      const data = response.data;
      const insights = this.parseInsights(data.insights?.data || []);

      const metrics: PostMetrics = {
        postId: platformPostId,
        platformPostId: platformPostId,
        contentType: data.media_type?.toLowerCase() || 'post',
        timestamp: new Date(data.timestamp),
        likes: data.like_count || 0,
        comments: data.comments_count || 0,
        impressions: insights.impressions || 0,
        reach: insights.reach || 0,
        saves: insights.saved || 0,
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
          fields: 'followers_count,follows_count,media_count,username,insights.metric(impressions,reach,profile_views,website_clicks,email_contacts)',
          access_token: accessToken,
        },
      });

      const data = response.data;
      const insights = this.parseInsights(data.insights?.data || []);

      return {
        accountId: platformAccountId,
        timestamp: new Date(),
        followers: data.followers_count || 0,
        following: data.follows_count || 0,
        impressions: insights.impressions || 0,
        reach: insights.reach || 0,
        profileViews: insights.profile_views || 0,
        websiteClicks: insights.website_clicks || 0,
        emailClicks: insights.email_contacts || 0,
      };
    } catch (error) {
      this.handleError(error, 'fetchAccountMetrics');
      throw error;
    }
  }

  async fetchBatchPostMetrics(platformPostIds: string[], accessToken: string): Promise<PostMetrics[]> {
    try {
      // Instagram Graph API supports batch requests
      const batchRequests = platformPostIds.map((id) => ({
        method: 'GET',
        relative_url: `${id}?fields=id,media_type,like_count,comments_count,timestamp,insights.metric(impressions,reach,saved,engagement)`,
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
          contentType: data.media_type?.toLowerCase() || 'post',
          timestamp: new Date(data.timestamp),
          likes: data.like_count || 0,
          comments: data.comments_count || 0,
          impressions: insights.impressions || 0,
          reach: insights.reach || 0,
          saves: insights.saved || 0,
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
