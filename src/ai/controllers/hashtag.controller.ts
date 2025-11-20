import {
  Controller,
  Post,
  Get,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { HashtagIntelligenceAgent } from '../agents/hashtag-intelligence.agent';

@Controller('api/ai/hashtags')
@UseGuards(JwtAuthGuard)
export class HashtagController {
  constructor(
    private readonly hashtagAgent: HashtagIntelligenceAgent,
  ) {}

  /**
   * Analyze content and suggest hashtags
   * POST /api/ai/hashtags/analyze
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeContent(
    @Body()
    body: {
      content: string;
      platform: string;
      count?: number;
    },
    @Request() req: any,
  ) {
    const workspaceId = req.user.workspaceId;

    return this.hashtagAgent.analyzeAndSuggest({
      content: body.content,
      platform: body.platform,
      count: body.count,
      workspaceId,
    });
  }

  /**
   * Track hashtag performance
   * POST /api/ai/hashtags/performance
   */
  @Post('performance')
  @HttpCode(HttpStatus.OK)
  async trackPerformance(
    @Body()
    body: {
      hashtags: string[];
      platform: string;
      startDate?: string;
      endDate?: string;
    },
    @Request() req: any,
  ) {
    const workspaceId = req.user.workspaceId;

    return this.hashtagAgent.trackPerformance({
      hashtags: body.hashtags,
      platform: body.platform,
      workspaceId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  /**
   * Get trending hashtags
   * GET /api/ai/hashtags/trending
   */
  @Get('trending')
  async getTrending(
    @Query('platform') platform?: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const workspaceId = req.user.workspaceId;

    return this.hashtagAgent.detectTrending({
      platform,
      category,
      location,
      workspaceId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Analyze hashtag competition
   * GET /api/ai/hashtags/:hashtag/competition
   */
  @Get(':hashtag/competition')
  async analyzeCompetition(
    @Param('hashtag') hashtag: string,
    @Query('platform') platform: string,
    @Request() req: any,
  ) {
    const workspaceId = req.user.workspaceId;

    return this.hashtagAgent.analyzeCompetition(
      hashtag,
      platform,
      workspaceId,
    );
  }

  /**
   * Create hashtag group
   * POST /api/ai/hashtags/groups
   */
  @Post('groups')
  @HttpCode(HttpStatus.CREATED)
  async createGroup(
    @Body()
    body: {
      name: string;
      hashtags: string[];
      description?: string;
      category?: string;
    },
    @Request() req: any,
  ) {
    const workspaceId = req.user.workspaceId;

    return this.hashtagAgent.createHashtagGroup(
      workspaceId,
      body.name,
      body.hashtags,
      body.description,
      body.category,
    );
  }

  /**
   * Get hashtag groups
   * GET /api/ai/hashtags/groups
   */
  @Get('groups')
  async getGroups(@Request() req: any) {
    const workspaceId = req.user.workspaceId;

    return this.hashtagAgent.getHashtagGroups(workspaceId);
  }

  /**
   * Update hashtag group
   * PUT /api/ai/hashtags/groups/:id
   */
  @Put('groups/:id')
  async updateGroup(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      hashtags?: string[];
      description?: string;
      category?: string;
    },
  ) {
    return this.hashtagAgent.updateHashtagGroup(id, body);
  }

  /**
   * Delete hashtag group
   * DELETE /api/ai/hashtags/groups/:id
   */
  @Delete('groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(@Param('id') id: string) {
    await this.hashtagAgent.deleteHashtagGroup(id);
  }
}
