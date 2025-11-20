import { Logger } from '@nestjs/common';
import { IMetricsFetcher, PostMetrics, AccountMetrics } from '../interfaces/metrics-fetcher.interface';

export abstract class BaseMetricsFetcher implements IMetricsFetcher {
  protected readonly logger: Logger;
  protected readonly platform: string;

  constructor(platform: string) {
    this.platform = platform;
    this.logger = new Logger(`${platform}MetricsFetcher`);
  }

  abstract fetchPostMetrics(platformPostId: string, accessToken: string): Promise<PostMetrics>;
  abstract fetchAccountMetrics(platformAccountId: string, accessToken: string): Promise<AccountMetrics>;
  abstract fetchBatchPostMetrics(platformPostIds: string[], accessToken: string): Promise<PostMetrics[]>;
  abstract supportsRealTimeMetrics(): boolean;

  protected calculateEngagementRate(metrics: {
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    impressions?: number;
    reach?: number;
  }): number {
    const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0) + (metrics.saves || 0);
    const denominator = metrics.reach || metrics.impressions || 1;
    return denominator > 0 ? (engagement / denominator) * 100 : 0;
  }

  protected handleError(error: any, context: string): void {
    this.logger.error(`Error in ${context}: ${error.message}`, error.stack);
    throw error;
  }
}
