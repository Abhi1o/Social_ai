import { Controller, Get, Post, Query, Param, UseGuards, Request, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MetricsCollectionService } from './services/metrics-collection.service';
import { MetricsAggregationService } from './services/metrics-aggregation.service';
import { MetricsCacheService } from './services/metrics-cache.service';
import { AnalyticsDashboardService } from './services/analytics-dashboard.service';
import { PostPerformanceService } from './services/post-performance.service';
import { AudienceAnalyticsService } from './services/audience-analytics.service';
import { PredictiveAnalyticsService } from './services/predictive-analytics.service';
import { AnalyticsQueryDto, TimeSeriesQueryDto, PostPerformanceQueryDto } from './dto/analytics-query.dto';
import { AudienceAnalyticsQueryDto, AudienceSegmentQueryDto, AudienceGrowthQueryDto } from './dto/audience-analytics.dto';
import {
  PredictEngagementDto,
  ForecastReachDto,
  PredictTrendsDto,
  DetectAnomaliesDto,
  GenerateInsightsDto,
} from './dto/predictive-analytics.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly metricsCollectionService: MetricsCollectionService,
    private readonly metricsAggregationService: MetricsAggregationService,
    private readonly metricsCacheService: MetricsCacheService,
    private readonly analyticsDashboardService: AnalyticsDashboardService,
    private readonly postPerformanceService: PostPerformanceService,
    private readonly audienceAnalyticsService: AudienceAnalyticsService,
    private readonly predictiveAnalyticsService: PredictiveAnalyticsService,
  ) {}

  /**
   * Get workspace metrics for a date range
   */
  @Get('workspace/:workspaceId/metrics')
  async getWorkspaceMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return this.metricsCacheService.getWorkspaceMetrics(workspaceId, start, end);
  }

  /**
   * Get account metrics for a date range
   */
  @Get('account/:accountId/metrics')
  async getAccountMetrics(
    @Param('accountId') accountId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return this.metricsCacheService.getAccountMetrics(accountId, start, end);
  }

  /**
   * Get post metrics
   */
  @Get('post/:postId/metrics')
  async getPostMetrics(@Param('postId') postId: string) {
    return this.metricsCacheService.getPostMetrics(postId);
  }

  /**
   * Get aggregated metrics
   */
  @Get('workspace/:workspaceId/aggregated')
  async getAggregatedMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return this.metricsCacheService.getAggregatedMetrics(workspaceId, period, start, end);
  }

  /**
   * Manually trigger metrics collection for a workspace
   */
  @Post('workspace/:workspaceId/collect')
  async collectWorkspaceMetrics(@Param('workspaceId') workspaceId: string) {
    await this.metricsCollectionService.collectWorkspaceMetrics(workspaceId);
    return { success: true, message: 'Metrics collection started' };
  }

  /**
   * Manually trigger metrics collection for an account
   */
  @Post('account/:accountId/collect')
  async collectAccountMetrics(
    @Param('accountId') accountId: string,
    @Request() req: any,
  ) {
    const workspaceId = req.user.workspaceId;
    await this.metricsCollectionService.collectAccountMetrics(accountId, workspaceId);
    return { success: true, message: 'Account metrics collection started' };
  }

  /**
   * Manually trigger daily aggregation
   */
  @Post('workspace/:workspaceId/aggregate/daily')
  async aggregateDailyMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query('date') date?: string,
  ) {
    const targetDate = date ? new Date(date) : new Date();
    await this.metricsAggregationService.aggregateDailyMetrics(workspaceId, targetDate);
    return { success: true, message: 'Daily aggregation completed' };
  }

  /**
   * Invalidate cache for a workspace
   */
  @Post('workspace/:workspaceId/cache/invalidate')
  async invalidateWorkspaceCache(@Param('workspaceId') workspaceId: string) {
    await this.metricsCacheService.invalidateWorkspaceCache(workspaceId);
    return { success: true, message: 'Cache invalidated' };
  }

  // ============================================
  // Analytics Dashboard Endpoints
  // ============================================

  /**
   * Get overview analytics with KPIs
   * Requirements: 4.1, 11.1
   */
  @Get('dashboard/overview')
  async getOverviewAnalytics(
    @Request() req: any,
    @Query() query: AnalyticsQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.analyticsDashboardService.getOverviewKPIs(
      workspaceId,
      startDate,
      endDate,
      query.platforms,
      query.accountIds,
    );
  }

  /**
   * Get detailed engagement metrics
   * Requirements: 4.1, 11.1
   */
  @Get('dashboard/engagement')
  async getEngagementMetrics(
    @Request() req: any,
    @Query() query: AnalyticsQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.analyticsDashboardService.getEngagementMetrics(
      workspaceId,
      startDate,
      endDate,
      query.platforms,
      query.accountIds,
    );
  }

  /**
   * Get follower growth tracking and trend analysis
   * Requirements: 4.1, 11.1
   */
  @Get('dashboard/follower-growth')
  async getFollowerGrowth(
    @Request() req: any,
    @Query() query: TimeSeriesQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.analyticsDashboardService.getFollowerGrowth(
      workspaceId,
      startDate,
      endDate,
      query.granularity,
      query.platforms,
      query.accountIds,
    );
  }

  /**
   * Get platform breakdown analytics
   * Requirements: 4.1, 11.1
   */
  @Get('dashboard/platform-breakdown')
  async getPlatformBreakdown(
    @Request() req: any,
    @Query() query: AnalyticsQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.analyticsDashboardService.getPlatformBreakdown(
      workspaceId,
      startDate,
      endDate,
      query.accountIds,
    );
  }

  /**
   * Get top performing posts with ranking
   * Requirements: 4.1, 11.1
   */
  @Get('dashboard/top-posts')
  async getTopPerformingPosts(
    @Request() req: any,
    @Query() query: PostPerformanceQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    return this.analyticsDashboardService.getTopPerformingPosts(
      workspaceId,
      startDate,
      endDate,
      query.sortBy,
      query.limit,
      query.platforms,
    );
  }

  /**
   * Get time-series data for charts
   * Requirements: 4.1, 11.1
   */
  @Get('dashboard/time-series')
  async getTimeSeriesData(
    @Request() req: any,
    @Query() query: TimeSeriesQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.analyticsDashboardService.getTimeSeriesData(
      workspaceId,
      startDate,
      endDate,
      query.granularity,
      query.platforms,
      query.accountIds,
    );
  }

  /**
   * Get reach and impressions aggregation
   * Requirements: 4.1, 11.1
   */
  @Get('dashboard/reach-impressions')
  async getReachAndImpressions(
    @Request() req: any,
    @Query() query: AnalyticsQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const kpis = await this.analyticsDashboardService.getOverviewKPIs(
      workspaceId,
      startDate,
      endDate,
      query.platforms,
      query.accountIds,
    );

    return {
      totalReach: kpis.totalReach,
      reachGrowth: kpis.reachGrowth,
      totalImpressions: kpis.totalImpressions,
      impressionsGrowth: kpis.impressionsGrowth,
    };
  }

  // ============================================
  // Post Performance Analytics Endpoints
  // ============================================

  /**
   * Get individual post metrics tracking
   * Requirements: 4.1, 11.1
   */
  @Get('posts/:postId/metrics')
  async getIndividualPostMetrics(@Param('postId') postId: string) {
    return this.postPerformanceService.getPostMetrics(postId);
  }

  /**
   * Calculate engagement rate for a post
   * Requirements: 4.1, 11.1
   */
  @Get('posts/:postId/engagement-rate')
  async getPostEngagementRate(@Param('postId') postId: string) {
    return this.postPerformanceService.calculateEngagementRate(postId);
  }

  /**
   * Compare two posts
   * Requirements: 4.1, 11.1
   */
  @Get('posts/compare')
  async comparePosts(
    @Query('postId1') postId1: string,
    @Query('postId2') postId2: string,
  ) {
    return this.postPerformanceService.comparePosts(postId1, postId2);
  }

  /**
   * Analyze content type performance
   * Requirements: 4.1, 11.1
   */
  @Get('posts/content-type-performance')
  async analyzeContentTypePerformance(
    @Request() req: any,
    @Query() query: AnalyticsQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.postPerformanceService.analyzeContentTypePerformance(
      workspaceId,
      startDate,
      endDate,
      query.platforms,
    );
  }

  /**
   * Analyze best time to post
   * Requirements: 4.1, 11.1
   */
  @Get('posts/best-time-to-post')
  async analyzeBestTimeToPost(
    @Request() req: any,
    @Query() query: AnalyticsQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.postPerformanceService.analyzeBestTimeToPost(
      workspaceId,
      startDate,
      endDate,
      query.platforms,
    );
  }

  /**
   * Get post performance timeline
   * Requirements: 4.1, 11.1
   */
  @Get('posts/:postId/timeline')
  async getPostPerformanceTimeline(@Param('postId') postId: string) {
    return this.postPerformanceService.getPostPerformanceTimeline(postId);
  }

  // ============================================
  // Audience Analytics Endpoints
  // ============================================

  /**
   * Get demographic data (age, gender distribution)
   * Requirements: 4.1, 11.1
   */
  @Get('audience/demographics')
  async getDemographicData(
    @Request() req: any,
    @Query() query: AudienceAnalyticsQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.audienceAnalyticsService.getDemographicData(
      workspaceId,
      startDate,
      endDate,
      query.platforms,
      query.accountIds,
    );
  }

  /**
   * Get audience segmentation
   * Requirements: 4.1, 11.1
   */
  @Get('audience/segments')
  async getAudienceSegments(
    @Request() req: any,
    @Query() query: AudienceSegmentQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    const segmentBy = query.segmentBy || 'age';

    return this.audienceAnalyticsService.getAudienceSegments(
      workspaceId,
      startDate,
      endDate,
      segmentBy,
      query.platforms,
      query.accountIds,
    );
  }

  /**
   * Get location-based analytics
   * Requirements: 4.1, 11.1
   */
  @Get('audience/locations')
  async getLocationAnalytics(
    @Request() req: any,
    @Query() query: AudienceAnalyticsQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.audienceAnalyticsService.getLocationAnalytics(
      workspaceId,
      startDate,
      endDate,
      query.platforms,
      query.accountIds,
    );
  }

  /**
   * Get interest and behavior analysis
   * Requirements: 4.1, 11.1
   */
  @Get('audience/interests-behavior')
  async getInterestBehaviorAnalysis(
    @Request() req: any,
    @Query() query: AudienceAnalyticsQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.audienceAnalyticsService.getInterestBehaviorAnalysis(
      workspaceId,
      startDate,
      endDate,
      query.platforms,
      query.accountIds,
    );
  }

  /**
   * Get audience growth trend analysis
   * Requirements: 4.1, 11.1
   */
  @Get('audience/growth-trend')
  async getAudienceGrowthTrend(
    @Request() req: any,
    @Query() query: AudienceGrowthQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    const granularity = query.granularity || 'daily';

    return this.audienceAnalyticsService.getAudienceGrowthTrend(
      workspaceId,
      startDate,
      endDate,
      granularity,
      query.platforms,
      query.accountIds,
    );
  }

  /**
   * Get audience insights with AI-powered recommendations
   * Requirements: 4.1, 11.1
   */
  @Get('audience/insights')
  async getAudienceInsights(
    @Request() req: any,
    @Query() query: AudienceAnalyticsQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    return this.audienceAnalyticsService.getAudienceInsights(
      workspaceId,
      startDate,
      endDate,
      query.platforms,
      query.accountIds,
    );
  }

  // ============================================
  // Predictive Analytics Endpoints
  // ============================================

  /**
   * Predict engagement for a post based on features
   * Requirements: 4.2, 11.2
   */
  @Post('predictive/engagement')
  async predictEngagement(
    @Request() req: any,
    @Body() dto: PredictEngagementDto,
  ) {
    const workspaceId = req.user.workspaceId;

    return this.predictiveAnalyticsService.predictEngagement(
      workspaceId,
      dto.platform,
      {
        timeOfDay: dto.timeOfDay,
        dayOfWeek: dto.dayOfWeek,
        contentLength: dto.contentLength,
        hashtagCount: dto.hashtagCount,
        mediaCount: dto.mediaCount,
      },
    );
  }

  /**
   * Forecast reach for future dates
   * Requirements: 4.2, 11.2
   */
  @Post('predictive/forecast-reach')
  async forecastReach(
    @Request() req: any,
    @Body() dto: ForecastReachDto,
  ) {
    const workspaceId = req.user.workspaceId;

    return this.predictiveAnalyticsService.forecastReach(
      workspaceId,
      dto.platform,
      dto.daysAhead,
    );
  }

  /**
   * Predict performance trends for various metrics
   * Requirements: 4.2, 11.2
   */
  @Post('predictive/trends')
  async predictPerformanceTrends(
    @Request() req: any,
    @Body() dto: PredictTrendsDto,
  ) {
    const workspaceId = req.user.workspaceId;

    return this.predictiveAnalyticsService.predictPerformanceTrends(
      workspaceId,
      dto.platform,
      dto.metrics,
      dto.daysAhead,
    );
  }

  /**
   * Detect anomalies in metrics
   * Requirements: 4.2, 11.2
   */
  @Post('predictive/anomalies')
  async detectAnomalies(
    @Request() req: any,
    @Body() dto: DetectAnomaliesDto,
  ) {
    const workspaceId = req.user.workspaceId;

    return this.predictiveAnalyticsService.detectAnomalies(
      workspaceId,
      dto.platform,
      dto.startDate,
      dto.endDate,
      dto.sensitivity,
    );
  }

  /**
   * Generate AI-powered insights
   * Requirements: 4.2, 11.2
   */
  @Post('predictive/insights')
  async generateInsights(
    @Request() req: any,
    @Body() dto: GenerateInsightsDto,
  ) {
    const workspaceId = req.user.workspaceId;

    return this.predictiveAnalyticsService.generateInsights(
      workspaceId,
      dto.platform,
      dto.startDate,
      dto.endDate,
    );
  }
}
