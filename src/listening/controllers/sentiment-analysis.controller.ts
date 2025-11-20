import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SentimentAnalysisService } from '../services/sentiment-analysis.service';
import {
  AnalyzeSentimentDto,
  AnalyzeSentimentBatchDto,
  UpdateMentionSentimentDto,
  UpdateMentionsSentimentBatchDto,
  GetSentimentTrendDto,
  GetTopicSentimentDto,
  GetSentimentTimelineDto,
} from '../dto/sentiment-analysis.dto';

/**
 * Controller for sentiment analysis operations
 * 
 * Requirements: 9.2, 9.4
 */
@ApiTags('listening')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('listening/sentiment')
export class SentimentAnalysisController {
  constructor(
    private readonly sentimentService: SentimentAnalysisService,
  ) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze sentiment of text content',
    description:
      'Uses AI-powered sentiment analysis to classify text as positive, neutral, or negative with confidence scores',
  })
  @ApiResponse({
    status: 200,
    description: 'Sentiment analysis result',
    schema: {
      example: {
        sentiment: 'POSITIVE',
        score: 0.85,
        confidence: 0.92,
        rawScores: {
          positive: 0.92,
          neutral: 0.05,
          negative: 0.03,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async analyzeSentiment(@Body() dto: AnalyzeSentimentDto) {
    return this.sentimentService.analyzeSentiment(dto.text);
  }

  @Post('analyze/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze sentiment of multiple texts in batch',
    description:
      'Efficiently analyzes sentiment for multiple text contents at once',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of sentiment analysis results',
    schema: {
      example: [
        {
          sentiment: 'POSITIVE',
          score: 0.85,
          confidence: 0.92,
          rawScores: { positive: 0.92, neutral: 0.05, negative: 0.03 },
        },
        {
          sentiment: 'NEGATIVE',
          score: -0.78,
          confidence: 0.88,
          rawScores: { positive: 0.06, neutral: 0.06, negative: 0.88 },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async analyzeSentimentBatch(@Body() dto: AnalyzeSentimentBatchDto) {
    return this.sentimentService.analyzeSentimentBatch(dto.texts);
  }

  @Post('mentions/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update sentiment for a specific mention',
    description:
      'Analyzes and updates the sentiment score for an existing mention',
  })
  @ApiResponse({
    status: 200,
    description: 'Mention sentiment updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Mention not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMentionSentiment(@Body() dto: UpdateMentionSentimentDto) {
    await this.sentimentService.updateMentionSentiment(dto.mentionId);
    return { success: true, message: 'Mention sentiment updated' };
  }

  @Post('mentions/update/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update sentiment for multiple mentions in batch',
    description:
      'Efficiently updates sentiment scores for multiple mentions at once',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch sentiment update result',
    schema: {
      example: {
        success: true,
        updated: 25,
        message: '25 mentions updated',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMentionsSentimentBatch(
    @Body() dto: UpdateMentionsSentimentBatchDto,
  ) {
    const updated = await this.sentimentService.updateMentionsSentimentBatch(
      dto.mentionIds,
    );
    return {
      success: true,
      updated,
      message: `${updated} mentions updated`,
    };
  }

  @Get('trend')
  @ApiOperation({
    summary: 'Get sentiment trend analysis over time',
    description:
      'Returns sentiment trends grouped by time interval with statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Sentiment trend data',
    schema: {
      example: [
        {
          date: '2024-01-15T00:00:00.000Z',
          averageScore: 0.45,
          sentiment: 'POSITIVE',
          mentionCount: 125,
          positiveCount: 85,
          neutralCount: 30,
          negativeCount: 10,
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSentimentTrend(
    @Request() req,
    @Query() query: GetSentimentTrendDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.sentimentService.getSentimentTrend(
      workspaceId,
      query.queryId,
      query.days || 30,
      query.interval || 'day',
    );
  }

  @Get('topics')
  @ApiOperation({
    summary: 'Get topic-based sentiment breakdown',
    description:
      'Analyzes sentiment by topics/tags showing distribution and averages',
  })
  @ApiResponse({
    status: 200,
    description: 'Topic sentiment breakdown',
    schema: {
      example: [
        {
          topic: 'customer_service',
          averageScore: -0.35,
          sentiment: 'NEGATIVE',
          mentionCount: 45,
          positivePercentage: 15.5,
          neutralPercentage: 22.2,
          negativePercentage: 62.3,
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTopicSentimentBreakdown(
    @Request() req,
    @Query() query: GetTopicSentimentDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.sentimentService.getTopicSentimentBreakdown(
      workspaceId,
      query.queryId,
      query.days || 30,
    );
  }

  @Get('timeline')
  @ApiOperation({
    summary: 'Get sentiment timeline visualization data',
    description:
      'Returns formatted data for charting sentiment over time with summary statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Sentiment timeline data',
    schema: {
      example: {
        timeline: [
          {
            date: '2024-01-15',
            score: 0.45,
            positive: 85,
            neutral: 30,
            negative: 10,
          },
        ],
        summary: {
          averageScore: 0.42,
          trend: 'improving',
          volatility: 0.15,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSentimentTimeline(
    @Request() req,
    @Query() query: GetSentimentTimelineDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.sentimentService.getSentimentTimeline(
      workspaceId,
      query.queryId,
      query.days || 30,
    );
  }
}
