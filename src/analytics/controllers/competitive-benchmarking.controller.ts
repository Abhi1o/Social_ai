import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompetitiveBenchmarkingService } from '../services/competitive-benchmarking.service';
import {
  CreateCompetitorDto,
  UpdateCompetitorDto,
  CompetitiveBenchmarkQueryDto,
  ShareOfVoiceQueryDto,
  IndustryBenchmarkQueryDto,
  CompetitorActivityQueryDto,
} from '../dto/competitive-benchmarking.dto';

@Controller('analytics/competitive')
@UseGuards(JwtAuthGuard)
export class CompetitiveBenchmarkingController {
  constructor(
    private readonly competitiveBenchmarkingService: CompetitiveBenchmarkingService,
  ) {}

  /**
   * Create a new competitor for tracking
   * POST /api/analytics/competitive/competitors
   */
  @Post('competitors')
  async createCompetitor(
    @Request() req,
    @Body() dto: CreateCompetitorDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.competitiveBenchmarkingService.createCompetitor(workspaceId, dto);
  }

  /**
   * Get all competitors
   * GET /api/analytics/competitive/competitors
   */
  @Get('competitors')
  async getCompetitors(
    @Request() req,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.competitiveBenchmarkingService.getCompetitors(
      workspaceId,
      includeInactive === 'true',
    );
  }

  /**
   * Get a single competitor
   * GET /api/analytics/competitive/competitors/:id
   */
  @Get('competitors/:id')
  async getCompetitor(
    @Request() req,
    @Param('id') competitorId: string,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.competitiveBenchmarkingService.getCompetitor(workspaceId, competitorId);
  }

  /**
   * Update a competitor
   * PUT /api/analytics/competitive/competitors/:id
   */
  @Put('competitors/:id')
  async updateCompetitor(
    @Request() req,
    @Param('id') competitorId: string,
    @Body() dto: UpdateCompetitorDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.competitiveBenchmarkingService.updateCompetitor(
      workspaceId,
      competitorId,
      dto,
    );
  }

  /**
   * Delete a competitor
   * DELETE /api/analytics/competitive/competitors/:id
   */
  @Delete('competitors/:id')
  async deleteCompetitor(
    @Request() req,
    @Param('id') competitorId: string,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.competitiveBenchmarkingService.deleteCompetitor(workspaceId, competitorId);
  }

  /**
   * Get competitive benchmark comparison
   * GET /api/analytics/competitive/benchmark
   */
  @Get('benchmark')
  async getCompetitiveBenchmark(
    @Request() req,
    @Query() query: CompetitiveBenchmarkQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.competitiveBenchmarkingService.getCompetitiveBenchmark(
      workspaceId,
      query,
    );
  }

  /**
   * Get share of voice analysis
   * GET /api/analytics/competitive/share-of-voice
   */
  @Get('share-of-voice')
  async getShareOfVoice(
    @Request() req,
    @Query() query: ShareOfVoiceQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.competitiveBenchmarkingService.getShareOfVoice(workspaceId, query);
  }

  /**
   * Get industry benchmarks
   * GET /api/analytics/competitive/industry-benchmarks
   */
  @Get('industry-benchmarks')
  async getIndustryBenchmarks(
    @Request() req,
    @Query() query: IndustryBenchmarkQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.competitiveBenchmarkingService.getIndustryBenchmarks(
      workspaceId,
      query,
    );
  }

  /**
   * Get competitor activity monitoring
   * GET /api/analytics/competitive/activity
   */
  @Get('activity')
  async getCompetitorActivity(
    @Request() req,
    @Query() query: CompetitorActivityQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.competitiveBenchmarkingService.getCompetitorActivity(
      workspaceId,
      query,
    );
  }
}
