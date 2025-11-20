import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { OptimalTimeCalculator } from './services/optimal-time-calculator.service';
import { EvergreenRotationService } from './services/evergreen-rotation.service';
import { SchedulePostDto, ReschedulePostDto, OptimalTimeRequestDto } from './dto/schedule-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Platform } from '@prisma/client';

@Controller('api/scheduling')
@UseGuards(JwtAuthGuard)
export class SchedulingController {
  constructor(
    private readonly schedulingService: SchedulingService,
    private readonly optimalTimeCalculator: OptimalTimeCalculator,
    private readonly evergreenRotationService: EvergreenRotationService,
  ) {}

  /**
   * Schedule a post
   * POST /api/scheduling/posts/:id/schedule
   */
  @Post('posts/:id/schedule')
  async schedulePost(
    @Request() req: any,
    @Param('id') postId: string,
    @Body() dto: SchedulePostDto,
  ) {
    return this.schedulingService.schedulePost(req.user.workspaceId, postId, dto);
  }

  /**
   * Reschedule a post
   * PUT /api/scheduling/posts/:id/reschedule
   */
  @Put('posts/:id/reschedule')
  async reschedulePost(
    @Request() req: any,
    @Param('id') postId: string,
    @Body() dto: ReschedulePostDto,
  ) {
    return this.schedulingService.reschedulePost(req.user.workspaceId, postId, dto);
  }

  /**
   * Cancel scheduled post
   * DELETE /api/scheduling/posts/:id/cancel
   */
  @Delete('posts/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelScheduledPost(@Request() req: any, @Param('id') postId: string) {
    return this.schedulingService.cancelScheduledPost(req.user.workspaceId, postId);
  }

  /**
   * Get all scheduled posts
   * GET /api/scheduling/posts
   */
  @Get('posts')
  async getScheduledPosts(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.schedulingService.getScheduledPosts(
      req.user.workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Get queue statistics
   * GET /api/scheduling/queue/stats
   */
  @Get('queue/stats')
  async getQueueStats() {
    return this.schedulingService.getQueueStats();
  }

  /**
   * Get optimal posting times
   * GET /api/scheduling/optimal-times
   */
  @Get('optimal-times')
  async getOptimalTimes(
    @Request() req: any,
    @Query('platform') platform?: Platform,
    @Query('accountId') accountId?: string,
    @Query('timezone') timezone?: string,
  ) {
    return this.optimalTimeCalculator.calculateOptimalTimes(
      req.user.workspaceId,
      platform,
      accountId,
      timezone || 'UTC',
    );
  }

  /**
   * Get best time to post
   * GET /api/scheduling/best-time
   */
  @Get('best-time')
  async getBestTime(
    @Request() req: any,
    @Query('platform') platform?: Platform,
    @Query('accountId') accountId?: string,
    @Query('timezone') timezone?: string,
  ) {
    return this.optimalTimeCalculator.getBestTimeToPost(
      req.user.workspaceId,
      platform,
      accountId,
      timezone || 'UTC',
    );
  }

  /**
   * Get next optimal time
   * GET /api/scheduling/next-optimal-time
   */
  @Get('next-optimal-time')
  async getNextOptimalTime(
    @Request() req: any,
    @Query('platform') platform?: Platform,
    @Query('accountId') accountId?: string,
    @Query('timezone') timezone?: string,
  ) {
    const nextTime = await this.optimalTimeCalculator.getNextOptimalTime(
      req.user.workspaceId,
      platform,
      accountId,
      timezone || 'UTC',
    );

    return {
      nextOptimalTime: nextTime,
      timezone: timezone || 'UTC',
    };
  }

  /**
   * Suggest schedule for batch of posts
   * POST /api/scheduling/suggest-batch
   */
  @Post('suggest-batch')
  async suggestBatchSchedule(
    @Request() req: any,
    @Body()
    body: {
      postCount: number;
      platform?: Platform;
      accountId?: string;
      timezone?: string;
      startDate?: string;
    },
  ) {
    const suggestions = await this.optimalTimeCalculator.suggestScheduleForBatch(
      req.user.workspaceId,
      body.postCount,
      body.platform,
      body.accountId,
      body.timezone || 'UTC',
      body.startDate ? new Date(body.startDate) : undefined,
    );

    return {
      suggestions,
      count: suggestions.length,
    };
  }

  /**
   * Get evergreen posts
   * GET /api/scheduling/evergreen
   */
  @Get('evergreen')
  async getEvergreenPosts(@Request() req: any) {
    return this.evergreenRotationService.getEvergreenPosts(req.user.workspaceId);
  }

  /**
   * Schedule evergreen rotation
   * POST /api/scheduling/evergreen/rotate
   */
  @Post('evergreen/rotate')
  async scheduleEvergreenRotation(
    @Request() req: any,
    @Body()
    body: {
      count?: number;
      platform?: Platform;
      accountId?: string;
    },
  ) {
    return this.evergreenRotationService.scheduleEvergreenRotation(
      req.user.workspaceId,
      body.count,
      body.platform,
      body.accountId,
    );
  }

  /**
   * Auto-rotate evergreen content
   * POST /api/scheduling/evergreen/auto-rotate
   */
  @Post('evergreen/auto-rotate')
  async autoRotateEvergreen(
    @Request() req: any,
    @Body()
    body: {
      frequencyDays?: number;
      maxPostsPerRotation?: number;
    },
  ) {
    return this.evergreenRotationService.autoRotateEvergreen(
      req.user.workspaceId,
      body.frequencyDays,
      body.maxPostsPerRotation,
    );
  }

  /**
   * Get rotation statistics
   * GET /api/scheduling/evergreen/stats
   */
  @Get('evergreen/stats')
  async getRotationStats(@Request() req: any) {
    return this.evergreenRotationService.getRotationStats(req.user.workspaceId);
  }
}
