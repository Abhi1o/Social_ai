import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TrendDetectionService } from '../services/trend-detection.service';
import {
  GetTrendsDto,
  AnalyzeHashtagTrendDto,
  DetectViralContentDto,
  GetConversationClustersDto,
  CalculateTrendVelocityDto,
} from '../dto/trend-detection.dto';

/**
 * Controller for trend detection and analysis
 * Provides endpoints for trending topics, hashtag tracking, viral content detection,
 * and conversation clustering
 * 
 * Requirements: 9.4, 18.4
 */
@ApiTags('listening')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('listening/trends')
export class TrendDetectionController {
  constructor(private readonly trendService: TrendDetectionService) {}

  @Get()
  @ApiOperation({ summary: 'Get trending topics and hashtags' })
  @ApiResponse({ status: 200, description: 'List of trends' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTrends(@Request() req, @Query() dto: GetTrendsDto) {
    const workspaceId = req.user.workspaceId;
    return this.trendService.getTrends(workspaceId, dto);
  }

  @Post('detect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detect and update trends' })
  @ApiResponse({ status: 200, description: 'Trend detection completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async detectTrends(
    @Request() req,
    @Body() body: { platforms?: string[] },
  ) {
    const workspaceId = req.user.workspaceId;
    return this.trendService.detectTrends(workspaceId, body.platforms as any);
  }

  @Post('hashtag/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze hashtag trend' })
  @ApiResponse({ status: 200, description: 'Hashtag trend analysis' })
  @ApiResponse({ status: 404, description: 'No data found for hashtag' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async analyzeHashtagTrend(
    @Request() req,
    @Body() dto: AnalyzeHashtagTrendDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const trend = await this.trendService.trackHashtagTrend(
      workspaceId,
      dto.hashtag,
      dto.days,
    );

    if (!trend) {
      return {
        message: 'No data found for this hashtag',
        hashtag: dto.hashtag,
      };
    }

    return trend;
  }

  @Post('velocity/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate trend growth velocity' })
  @ApiResponse({ status: 200, description: 'Growth velocity calculated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async calculateVelocity(
    @Request() req,
    @Body() dto: CalculateTrendVelocityDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const velocity = await this.trendService.calculateGrowthVelocity(
      workspaceId,
      dto.term,
      dto.timeWindowHours,
    );

    return {
      term: dto.term,
      timeWindowHours: dto.timeWindowHours,
      growthVelocity: velocity,
      growthRate: velocity * 100,
      status: this.getVelocityStatus(velocity),
    };
  }

  @Get('viral')
  @ApiOperation({ summary: 'Detect viral content' })
  @ApiResponse({ status: 200, description: 'List of viral content' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async detectViralContent(
    @Request() req,
    @Query() dto: DetectViralContentDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const viralContent = await this.trendService.detectViralContent(
      workspaceId,
      {
        platforms: dto.platforms,
        minViralityScore: dto.minViralityScore,
        timeWindowHours: dto.timeWindowHours,
        limit: dto.limit,
      },
    );

    return {
      viralContent,
      count: viralContent.length,
      timeWindow: `${dto.timeWindowHours} hours`,
    };
  }

  @Get('clusters')
  @ApiOperation({ summary: 'Get conversation clusters' })
  @ApiResponse({ status: 200, description: 'List of conversation clusters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConversationClusters(
    @Request() req,
    @Query() dto: GetConversationClustersDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const clusters = await this.trendService.clusterConversations(
      workspaceId,
      {
        minSize: dto.minSize,
        minCohesion: dto.minCohesion,
        days: dto.days,
        limit: dto.limit,
      },
    );

    return {
      clusters,
      count: clusters.length,
      period: `${dto.days} days`,
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get trend detection summary' })
  @ApiResponse({ status: 200, description: 'Trend summary statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTrendSummary(@Request() req) {
    const workspaceId = req.user.workspaceId;

    const [trendsResult, viralContent, clusters] = await Promise.all([
      this.trendService.getTrends(workspaceId, { limit: 100 }),
      this.trendService.detectViralContent(workspaceId, { limit: 10 }),
      this.trendService.clusterConversations(workspaceId, { limit: 10 }),
    ]);

    const trends = trendsResult.trends;

    return {
      trends: {
        total: trends.length,
        emerging: trends.filter(t => t.status === 'emerging').length,
        rising: trends.filter(t => t.status === 'rising').length,
        viral: trends.filter(t => t.status === 'viral').length,
        declining: trends.filter(t => t.status === 'declining').length,
        stable: trends.filter(t => t.status === 'stable').length,
      },
      viralContent: {
        count: viralContent.length,
        topScore: viralContent[0]?.viralityScore || 0,
      },
      clusters: {
        count: clusters.length,
        totalConversations: clusters.reduce((sum, c) => sum + c.size, 0),
      },
      topTrends: trends.slice(0, 10).map(t => ({
        term: t.term,
        type: t.type,
        status: t.status,
        growthRate: t.growthRate,
        viralityScore: t.viralityScore,
        volume: t.currentVolume,
      })),
    };
  }

  /**
   * Helper to determine velocity status
   */
  private getVelocityStatus(velocity: number): string {
    if (velocity > 5) return 'explosive';
    if (velocity > 2) return 'rapid';
    if (velocity > 0.5) return 'growing';
    if (velocity > -0.2) return 'stable';
    return 'declining';
  }
}
