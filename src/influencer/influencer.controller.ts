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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InfluencerDiscoveryService } from './services/influencer-discovery.service';
import { InfluencerAnalysisService } from './services/influencer-analysis.service';
import { SearchInfluencersDto } from './dto/search-influencers.dto';
import { AnalyzeInfluencerDto } from './dto/analyze-influencer.dto';
import { UpdateInfluencerDto } from './dto/update-influencer.dto';

@Controller('api/influencers')
@UseGuards(JwtAuthGuard)
export class InfluencerController {
  constructor(
    private readonly discoveryService: InfluencerDiscoveryService,
    private readonly analysisService: InfluencerAnalysisService,
  ) {}

  /**
   * Search for influencers
   * GET /api/influencers/search
   */
  @Get('search')
  async searchInfluencers(
    @Request() req,
    @Query() searchDto: SearchInfluencersDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.discoveryService.searchInfluencers(workspaceId, searchDto);
  }

  /**
   * Get influencer by ID
   * GET /api/influencers/:id
   */
  @Get(':id')
  async getInfluencer(@Request() req, @Param('id') id: string) {
    const workspaceId = req.user.workspaceId;
    return this.discoveryService.getInfluencerById(workspaceId, id);
  }

  /**
   * Analyze an influencer from a platform
   * POST /api/influencers/analyze
   */
  @Post('analyze')
  async analyzeInfluencer(
    @Request() req,
    @Body() analyzeDto: AnalyzeInfluencerDto,
    @Body('targetNiches') targetNiches?: string[],
  ) {
    const workspaceId = req.user.workspaceId;
    return this.analysisService.analyzeInfluencer(
      workspaceId,
      analyzeDto,
      targetNiches,
    );
  }

  /**
   * Batch analyze multiple influencers
   * POST /api/influencers/analyze/batch
   */
  @Post('analyze/batch')
  async batchAnalyzeInfluencers(
    @Request() req,
    @Body('influencers') influencers: AnalyzeInfluencerDto[],
    @Body('targetNiches') targetNiches?: string[],
  ) {
    const workspaceId = req.user.workspaceId;
    return this.analysisService.batchAnalyzeInfluencers(
      workspaceId,
      influencers,
      targetNiches,
    );
  }

  /**
   * Re-analyze an existing influencer
   * POST /api/influencers/:id/reanalyze
   */
  @Post(':id/reanalyze')
  async reanalyzeInfluencer(
    @Request() req,
    @Param('id') id: string,
    @Body('targetNiches') targetNiches?: string[],
  ) {
    const workspaceId = req.user.workspaceId;
    return this.analysisService.reanalyzeInfluencer(
      workspaceId,
      id,
      targetNiches,
    );
  }

  /**
   * Compare multiple influencers
   * POST /api/influencers/compare
   */
  @Post('compare')
  async compareInfluencers(
    @Request() req,
    @Body('influencerIds') influencerIds: string[],
  ) {
    const workspaceId = req.user.workspaceId;
    return this.analysisService.compareInfluencers(workspaceId, influencerIds);
  }

  /**
   * Update influencer
   * PUT /api/influencers/:id
   */
  @Put(':id')
  async updateInfluencer(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateInfluencerDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.discoveryService.updateInfluencer(workspaceId, id, updateDto);
  }

  /**
   * Delete influencer
   * DELETE /api/influencers/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInfluencer(@Request() req, @Param('id') id: string) {
    const workspaceId = req.user.workspaceId;
    await this.discoveryService.deleteInfluencer(workspaceId, id);
  }

  /**
   * Get influencer statistics for workspace
   * GET /api/influencers/stats
   */
  @Get('stats/overview')
  async getInfluencerStats(@Request() req) {
    const workspaceId = req.user.workspaceId;
    return this.discoveryService.getInfluencerStats(workspaceId);
  }
}
