import { Injectable } from '@nestjs/common';
import { IMetricsFetcher } from '../interfaces/metrics-fetcher.interface';
import { InstagramMetricsFetcher } from './instagram-metrics-fetcher';
import { TwitterMetricsFetcher } from './twitter-metrics-fetcher';
import { FacebookMetricsFetcher } from './facebook-metrics-fetcher';
import { LinkedInMetricsFetcher } from './linkedin-metrics-fetcher';

@Injectable()
export class MetricsFetcherFactory {
  private readonly fetchers: Map<string, IMetricsFetcher>;

  constructor(
    private readonly instagramFetcher: InstagramMetricsFetcher,
    private readonly twitterFetcher: TwitterMetricsFetcher,
    private readonly facebookFetcher: FacebookMetricsFetcher,
    private readonly linkedInFetcher: LinkedInMetricsFetcher,
  ) {
    this.fetchers = new Map<string, IMetricsFetcher>([
      ['INSTAGRAM', this.instagramFetcher as IMetricsFetcher],
      ['TWITTER', this.twitterFetcher as IMetricsFetcher],
      ['FACEBOOK', this.facebookFetcher as IMetricsFetcher],
      ['LINKEDIN', this.linkedInFetcher as IMetricsFetcher],
    ]);
  }

  getFetcher(platform: string): IMetricsFetcher {
    const fetcher = this.fetchers.get(platform.toUpperCase());
    if (!fetcher) {
      throw new Error(`Metrics fetcher not implemented for platform: ${platform}`);
    }
    return fetcher;
  }

  getSupportedPlatforms(): string[] {
    return Array.from(this.fetchers.keys());
  }
}
