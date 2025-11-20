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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ListeningQueryService } from './services/listening-query.service';
import { CreateListeningQueryDto } from './dto/create-listening-query.dto';
import { UpdateListeningQueryDto } from './dto/update-listening-query.dto';
import { Platform } from '@prisma/client';

@ApiTags('listening')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('listening/queries')
export class ListeningController {
  constructor(private readonly queryService: ListeningQueryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new listening query' })
  @ApiResponse({ status: 201, description: 'Listening query created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query or parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Request() req, @Body() dto: CreateListeningQueryDto) {
    const workspaceId = req.user.workspaceId;
    return this.queryService.create(workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all listening queries for workspace' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of listening queries' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Request() req,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const workspaceId = req.user.workspaceId;
    const includeInactiveBool = includeInactive === 'true';
    return this.queryService.findAll(workspaceId, includeInactiveBool);
  }

  @Get('languages')
  @ApiOperation({ summary: 'Get list of supported languages' })
  @ApiResponse({ status: 200, description: 'List of supported language codes' })
  getSupportedLanguages() {
    return this.queryService.getSupportedLanguages();
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a boolean query without saving' })
  @ApiResponse({ status: 200, description: 'Query validation result' })
  validateQuery(@Body() body: { query: string }) {
    return this.queryService.validateQuery(body.query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a listening query by ID' })
  @ApiParam({ name: 'id', description: 'Listening query ID' })
  @ApiResponse({ status: 200, description: 'Listening query details' })
  @ApiResponse({ status: 404, description: 'Listening query not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Request() req, @Param('id') id: string) {
    const workspaceId = req.user.workspaceId;
    return this.queryService.findOne(id, workspaceId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a listening query' })
  @ApiParam({ name: 'id', description: 'Listening query ID' })
  @ApiResponse({ status: 200, description: 'Listening query updated successfully' })
  @ApiResponse({ status: 404, description: 'Listening query not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateListeningQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.queryService.update(id, workspaceId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a listening query' })
  @ApiParam({ name: 'id', description: 'Listening query ID' })
  @ApiResponse({ status: 200, description: 'Listening query deleted successfully' })
  @ApiResponse({ status: 404, description: 'Listening query not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async remove(@Request() req, @Param('id') id: string) {
    const workspaceId = req.user.workspaceId;
    return this.queryService.remove(id, workspaceId);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a listening query' })
  @ApiParam({ name: 'id', description: 'Listening query ID' })
  @ApiResponse({ status: 200, description: 'Listening query activated' })
  @ApiResponse({ status: 404, description: 'Listening query not found' })
  async activate(@Request() req, @Param('id') id: string) {
    const workspaceId = req.user.workspaceId;
    return this.queryService.activate(id, workspaceId);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a listening query' })
  @ApiParam({ name: 'id', description: 'Listening query ID' })
  @ApiResponse({ status: 200, description: 'Listening query deactivated' })
  @ApiResponse({ status: 404, description: 'Listening query not found' })
  async deactivate(@Request() req, @Param('id') id: string) {
    const workspaceId = req.user.workspaceId;
    return this.queryService.deactivate(id, workspaceId);
  }

  @Get(':id/platform/:platform')
  @ApiOperation({ summary: 'Get platform-specific query configuration' })
  @ApiParam({ name: 'id', description: 'Listening query ID' })
  @ApiParam({ name: 'platform', enum: Platform, description: 'Social media platform' })
  @ApiResponse({ status: 200, description: 'Platform-specific query configuration' })
  @ApiResponse({ status: 404, description: 'Listening query not found' })
  @ApiResponse({ status: 400, description: 'Platform not configured for this query' })
  async getPlatformQuery(
    @Request() req,
    @Param('id') id: string,
    @Param('platform') platform: Platform,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.queryService.getPlatformQuery(id, workspaceId, platform);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get query statistics and metrics' })
  @ApiParam({ name: 'id', description: 'Listening query ID' })
  @ApiResponse({ status: 200, description: 'Query statistics' })
  @ApiResponse({ status: 404, description: 'Listening query not found' })
  async getStatistics(@Request() req, @Param('id') id: string) {
    const workspaceId = req.user.workspaceId;
    return this.queryService.getStatistics(id, workspaceId);
  }
}


/**
 * Controller for mention collection and management
 */
@ApiTags('listening')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('listening/mentions')
export class MentionController {
  constructor(
    private readonly queryService: ListeningQueryService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get mentions for workspace' })
  @ApiQuery({ name: 'queryId', required: false, description: 'Filter by query ID' })
  @ApiQuery({ name: 'platform', required: false, enum: Platform, description: 'Filter by platform' })
  @ApiQuery({ name: 'sentiment', required: false, description: 'Filter by sentiment' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset' })
  @ApiResponse({ status: 200, description: 'List of mentions' })
  async getMentions(
    @Request() req,
    @Query('queryId') queryId?: string,
    @Query('platform') platform?: Platform,
    @Query('sentiment') sentiment?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const workspaceId = req.user.workspaceId;
    
    // Build filter
    const where: any = { workspaceId };
    if (queryId) where.queryId = queryId;
    if (platform) where.platform = platform;
    if (sentiment) where.sentiment = sentiment;

    const take = limit ? parseInt(limit) : 50;
    const skip = offset ? parseInt(offset) : 0;

    const [mentions, total] = await Promise.all([
      this.prisma.listeningMention.findMany({
        where,
        take,
        skip,
        orderBy: { publishedAt: 'desc' },
        include: {
          query: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.listeningMention.count({ where }),
    ]);

    return {
      mentions,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + take < total,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get mention by ID' })
  @ApiParam({ name: 'id', description: 'Mention ID' })
  @ApiResponse({ status: 200, description: 'Mention details' })
  @ApiResponse({ status: 404, description: 'Mention not found' })
  async getMention(@Request() req, @Param('id') id: string) {
    const workspaceId = req.user.workspaceId;
    
    const mention = await this.prisma.listeningMention.findFirst({
      where: { id, workspaceId },
      include: {
        query: {
          select: { id: true, name: true },
        },
      },
    });

    if (!mention) {
      throw new Error('Mention not found');
    }

    return mention;
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get mention statistics summary' })
  @ApiQuery({ name: 'queryId', required: false, description: 'Filter by query ID' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to analyze' })
  @ApiResponse({ status: 200, description: 'Mention statistics' })
  async getMentionStats(
    @Request() req,
    @Query('queryId') queryId?: string,
    @Query('days') days?: string,
  ) {
    const workspaceId = req.user.workspaceId;
    const daysNum = days ? parseInt(days) : 7;
    const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const where: any = {
      workspaceId,
      publishedAt: { gte: since },
    };
    if (queryId) where.queryId = queryId;

    const [
      total,
      byPlatform,
      bySentiment,
      influencerMentions,
      avgEngagement,
    ] = await Promise.all([
      this.prisma.listeningMention.count({ where }),
      this.prisma.listeningMention.groupBy({
        by: ['platform'],
        where,
        _count: true,
      }),
      this.prisma.listeningMention.groupBy({
        by: ['sentiment'],
        where,
        _count: true,
      }),
      this.prisma.listeningMention.count({
        where: { ...where, isInfluencer: true },
      }),
      this.prisma.listeningMention.aggregate({
        where,
        _avg: {
          likes: true,
          comments: true,
          shares: true,
          reach: true,
        },
      }),
    ]);

    return {
      total,
      byPlatform,
      bySentiment,
      influencerMentions,
      avgEngagement,
      period: { days: daysNum, since },
    };
  }
}
