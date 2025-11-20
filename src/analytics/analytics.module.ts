import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Metric, MetricSchema } from './schemas/metric.schema';
import { AggregatedMetric, AggregatedMetricSchema } from './schemas/aggregated-metric.schema';
import { AudienceDemographic, AudienceDemographicSchema } from './schemas/audience-demographic.schema';
import { CompetitorMetric, CompetitorMetricSchema } from './schemas/competitor-metric.schema';
import { MetricsCollectionService } from './services/metrics-collection.service';
import { MetricsAggregationService } from './services/metrics-aggregation.service';
import { MetricsCacheService } from './services/metrics-cache.service';
import { AnalyticsDashboardService } from './services/analytics-dashboard.service';
import { PostPerformanceService } from './services/post-performance.service';
import { AudienceAnalyticsService } from './services/audience-analytics.service';
import { PredictiveAnalyticsService } from './services/predictive-analytics.service';
import { CompetitiveBenchmarkingService } from './services/competitive-benchmarking.service';
import { InstagramMetricsFetcher } from './fetchers/instagram-metrics-fetcher';
import { TwitterMetricsFetcher } from './fetchers/twitter-metrics-fetcher';
import { FacebookMetricsFetcher } from './fetchers/facebook-metrics-fetcher';
import { LinkedInMetricsFetcher } from './fetchers/linkedin-metrics-fetcher';
import { MetricsFetcherFactory } from './fetchers/metrics-fetcher.factory';
import { MetricsCollectionCron } from './cron/metrics-collection.cron';
import { ReportSchedulerCron } from './cron/report-scheduler.cron';
import { CompetitorMetricsCollectionCron } from './cron/competitor-metrics-collection.cron';
import { MetricsGateway } from './gateways/metrics.gateway';
import { AnalyticsController } from './analytics.controller';
import { ReportBuilderController } from './controllers/report-builder.controller';
import { CompetitiveBenchmarkingController } from './controllers/competitive-benchmarking.controller';
import { ReportBuilderService } from './services/report-builder.service';
import { ReportExportService } from './services/report-export.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Metric.name, schema: MetricSchema },
      { name: AggregatedMetric.name, schema: AggregatedMetricSchema },
      { name: AudienceDemographic.name, schema: AudienceDemographicSchema },
      { name: CompetitorMetric.name, schema: CompetitorMetricSchema },
    ]),
    PrismaModule,
  ],
  controllers: [
    AnalyticsController,
    ReportBuilderController,
    CompetitiveBenchmarkingController,
  ],
  providers: [
    // Services
    MetricsCollectionService,
    MetricsAggregationService,
    MetricsCacheService,
    AnalyticsDashboardService,
    PostPerformanceService,
    AudienceAnalyticsService,
    PredictiveAnalyticsService,
    ReportBuilderService,
    ReportExportService,
    CompetitiveBenchmarkingService,
    
    // Fetchers
    InstagramMetricsFetcher,
    TwitterMetricsFetcher,
    FacebookMetricsFetcher,
    LinkedInMetricsFetcher,
    MetricsFetcherFactory,
    
    // Cron jobs
    MetricsCollectionCron,
    ReportSchedulerCron,
    CompetitorMetricsCollectionCron,
    
    // WebSocket gateway
    MetricsGateway,
  ],
  exports: [
    MetricsCollectionService,
    MetricsAggregationService,
    MetricsCacheService,
    AnalyticsDashboardService,
    PostPerformanceService,
    AudienceAnalyticsService,
    PredictiveAnalyticsService,
    ReportBuilderService,
    ReportExportService,
    CompetitiveBenchmarkingService,
    MetricsGateway,
  ],
})
export class AnalyticsModule {}
