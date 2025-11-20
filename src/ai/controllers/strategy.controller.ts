import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StrategyAgent, PerformanceDataRequest } from '../agents/strategy.agent';

@Controller('api/ai/strategy')
@UseGuards(JwtAuthGuard)
export class StrategyController {
  constructor(private readonly strategyAgent: StrategyAgent) {}

  /**
   * Get comprehensive strategy recommendations
   */
  @Post('recommendations')
  @HttpCode(HttpStatus.OK)
  async getRecommendations(
    @Body()
    body: {
      startDate: string;
      endDate: string;
      platforms?: string[];
      accountIds?: string[];
    },
    @Request() req: any,
  ) {
    const request: PerformanceDataRequest = {
      workspaceId: req.user.workspaceId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      platforms: body.platforms,
      accountIds: body.accountIds,
    };

    const recommendations = await this.strategyAgent.analyzePerformance(request);

    return {
      success: true,
      data: recommendations,
    };
  }

  /**
   * Get content theme recommendations
   */
  @Get('content-themes')
  async getContentThemes(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    const request: PerformanceDataRequest = {
      workspaceId: req.user.workspaceId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };

    // First get performance data
    const performanceData = await this.strategyAgent['fetchPerformanceMetrics'](request);
    
    // Then get theme recommendations
    const themes = await this.strategyAgent.recommendContentThemes(
      req.user.workspaceId,
      performanceData,
    );

    return {
      success: true,
      data: themes,
    };
  }

  /**
   * Get optimal posting times
   */
  @Get('optimal-times')
  async getOptimalTimes(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    const request: PerformanceDataRequest = {
      workspaceId: req.user.workspaceId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };

    // Get performance data
    const performanceData = await this.strategyAgent['fetchPerformanceMetrics'](request);
    
    // Analyze optimal times
    const optimalTimes = await this.strategyAgent.analyzeOptimalPostingTimes(
      req.user.workspaceId,
      performanceData,
    );

    return {
      success: true,
      data: optimalTimes,
    };
  }

  /**
   * Get monthly calendar themes
   */
  @Get('monthly-calendar')
  async getMonthlyCalendar(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    const request: PerformanceDataRequest = {
      workspaceId: req.user.workspaceId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };

    // Get performance data
    const performanceData = await this.strategyAgent['fetchPerformanceMetrics'](request);
    
    // Generate calendar
    const calendar = await this.strategyAgent.generateMonthlyCalendar(
      req.user.workspaceId,
      performanceData,
    );

    return {
      success: true,
      data: calendar,
    };
  }

  /**
   * Get audience engagement patterns
   */
  @Get('engagement-patterns')
  async getEngagementPatterns(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any,
  ) {
    const request: PerformanceDataRequest = {
      workspaceId: req.user.workspaceId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };

    // Get performance data
    const performanceData = await this.strategyAgent['fetchPerformanceMetrics'](request);
    
    // Detect patterns
    const patterns = await this.strategyAgent.detectEngagementPatterns(
      req.user.workspaceId,
      performanceData,
    );

    return {
      success: true,
      data: patterns,
    };
  }
}
