import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CrisisDetectionService } from '../services/crisis-detection.service';
import {
  MonitorCrisisDto,
  SendCrisisAlertsDto,
  UpdateCrisisStatusDto,
  AddCrisisResponseDto,
  CreatePostMortemDto,
  AssignCrisisDto,
  CrisisDashboardQueryDto,
  CrisisHistoryQueryDto,
} from '../dto/crisis-detection.dto';

/**
 * Controller for crisis detection and management
 * Provides endpoints for monitoring, alerting, and managing PR crises
 * 
 * Requirements: 9.5, 35.1, 35.2, 35.3, 35.4, 35.5
 */
@ApiTags('Crisis Detection')
@Controller('listening/crisis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrisisDetectionController {
  private readonly logger = new Logger(CrisisDetectionController.name);

  constructor(private readonly crisisService: CrisisDetectionService) {}

  /**
   * Monitor workspace for potential crises
   * Analyzes recent mentions for sentiment spikes and volume anomalies
   * 
   * POST /api/listening/crisis/monitor
   */
  @Post('monitor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Monitor for crisis',
    description: 'Analyzes recent mentions to detect potential PR crises based on sentiment and volume anomalies'
  })
  @ApiResponse({ status: 200, description: 'Crisis monitoring result' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async monitorForCrisis(
    @Request() req: any,
    @Body() dto: MonitorCrisisDto,
  ) {
    const workspaceId = req.user.workspaceId;
    
    this.logger.log(`Monitoring workspace ${workspaceId} for crisis`);
    
    const result = await this.crisisService.monitorForCrisis(workspaceId, {
      sentimentThreshold: dto.sentimentThreshold,
      volumeThreshold: dto.volumeThreshold,
      timeWindow: dto.timeWindow,
      minMentions: dto.minMentions,
      platforms: dto.platforms,
    });

    if (result.crisisDetected) {
      this.logger.warn(`Crisis detected for workspace ${workspaceId}`);
    }

    return result;
  }

  /**
   * Get crisis dashboard data
   * Provides real-time crisis monitoring and statistics
   * 
   * GET /api/listening/crisis/dashboard
   */
  @Get('dashboard')
  @ApiOperation({ 
    summary: 'Get crisis dashboard',
    description: 'Retrieves real-time crisis monitoring data, active crises, and statistics'
  })
  @ApiResponse({ status: 200, description: 'Crisis dashboard data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCrisisDashboard(
    @Request() req: any,
    @Query() query: CrisisDashboardQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;

    const filters: any = {};
    
    if (query.status) {
      filters.status = query.status;
    }
    
    if (query.severity) {
      filters.severity = query.severity;
    }
    
    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }
    
    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }

    return this.crisisService.getCrisisDashboard(workspaceId, filters);
  }

  /**
   * Get crisis by ID
   * 
   * GET /api/listening/crisis/:id
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Get crisis details',
    description: 'Retrieves detailed information about a specific crisis'
  })
  @ApiResponse({ status: 200, description: 'Crisis details' })
  @ApiResponse({ status: 404, description: 'Crisis not found' })
  async getCrisis(
    @Param('id') id: string,
  ) {
    // This would be implemented in the service
    // For now, returning a placeholder
    return { message: 'Get crisis by ID - to be implemented' };
  }

  /**
   * Send crisis alerts
   * Sends alerts via multiple channels (SMS, email, push, Slack)
   * 
   * POST /api/listening/crisis/:id/alerts
   */
  @Post(':id/alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Send crisis alerts',
    description: 'Sends multi-channel alerts (SMS, email, push, Slack) for a detected crisis'
  })
  @ApiResponse({ status: 200, description: 'Alerts sent successfully' })
  @ApiResponse({ status: 404, description: 'Crisis not found' })
  async sendCrisisAlerts(
    @Param('id') crisisId: string,
    @Body() dto: SendCrisisAlertsDto,
  ) {
    this.logger.log(`Sending crisis alerts for ${crisisId}`);
    
    return this.crisisService.sendCrisisAlerts(
      crisisId,
      dto.channels,
      dto.recipients,
      dto.customMessage,
    );
  }

  /**
   * Update crisis status
   * 
   * PUT /api/listening/crisis/:id/status
   */
  @Put(':id/status')
  @ApiOperation({ 
    summary: 'Update crisis status',
    description: 'Updates the status of a crisis (detected, acknowledged, responding, resolved)'
  })
  @ApiResponse({ status: 200, description: 'Crisis status updated' })
  @ApiResponse({ status: 404, description: 'Crisis not found' })
  async updateCrisisStatus(
    @Request() req: any,
    @Param('id') crisisId: string,
    @Body() dto: UpdateCrisisStatusDto,
  ) {
    const userId = req.user.id;
    
    return this.crisisService.updateCrisisStatus(
      crisisId,
      dto.status,
      userId,
      dto.notes,
    );
  }

  /**
   * Add crisis response
   * 
   * POST /api/listening/crisis/:id/responses
   */
  @Post(':id/responses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Add crisis response',
    description: 'Records a response action taken for the crisis'
  })
  @ApiResponse({ status: 201, description: 'Response added successfully' })
  @ApiResponse({ status: 404, description: 'Crisis not found' })
  async addCrisisResponse(
    @Request() req: any,
    @Param('id') crisisId: string,
    @Body() dto: AddCrisisResponseDto,
  ) {
    const userId = req.user.id;
    
    return this.crisisService.addCrisisResponse(crisisId, {
      userId,
      action: dto.action,
      content: dto.content,
      platform: dto.platform,
    });
  }

  /**
   * Assign crisis to team members
   * 
   * PUT /api/listening/crisis/:id/assign
   */
  @Put(':id/assign')
  @ApiOperation({ 
    summary: 'Assign crisis',
    description: 'Assigns the crisis to specific team members for response coordination'
  })
  @ApiResponse({ status: 200, description: 'Crisis assigned successfully' })
  @ApiResponse({ status: 404, description: 'Crisis not found' })
  async assignCrisis(
    @Param('id') crisisId: string,
    @Body() dto: AssignCrisisDto,
  ) {
    return this.crisisService.assignCrisis(crisisId, dto.userIds);
  }

  /**
   * Create post-mortem analysis
   * 
   * POST /api/listening/crisis/:id/post-mortem
   */
  @Post(':id/post-mortem')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create post-mortem',
    description: 'Creates a post-mortem analysis for a resolved crisis with lessons learned'
  })
  @ApiResponse({ status: 201, description: 'Post-mortem created successfully' })
  @ApiResponse({ status: 400, description: 'Crisis must be resolved first' })
  @ApiResponse({ status: 404, description: 'Crisis not found' })
  async createPostMortem(
    @Request() req: any,
    @Param('id') crisisId: string,
    @Body() dto: CreatePostMortemDto,
  ) {
    const userId = req.user.id;
    
    return this.crisisService.createPostMortem(crisisId, {
      rootCause: dto.rootCause,
      responseEffectiveness: dto.responseEffectiveness,
      lessonsLearned: dto.lessonsLearned,
      preventiveMeasures: dto.preventiveMeasures,
      createdBy: userId,
    });
  }

  /**
   * Get crisis history
   * 
   * GET /api/listening/crisis/history
   */
  @Get('history/all')
  @ApiOperation({ 
    summary: 'Get crisis history',
    description: 'Retrieves historical crisis data for analysis and learning'
  })
  @ApiResponse({ status: 200, description: 'Crisis history' })
  async getCrisisHistory(
    @Request() req: any,
    @Query() query: CrisisHistoryQueryDto,
  ) {
    const workspaceId = req.user.workspaceId;
    
    return this.crisisService.getCrisisHistory(workspaceId, {
      limit: query.limit,
      offset: query.offset,
      includePostMortems: query.includePostMortems,
    });
  }
}
