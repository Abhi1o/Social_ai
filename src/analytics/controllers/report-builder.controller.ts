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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReportBuilderService } from '../services/report-builder.service';
import {
  CreateReportTemplateDto,
  UpdateReportTemplateDto,
  GenerateReportDto,
  ScheduleReportDto,
  UpdateScheduledReportDto,
} from '../dto/report-builder.dto';

/**
 * Report Builder Controller
 * Handles custom report templates, generation, and scheduling
 * Requirements: 4.4, 11.4
 */
@Controller('analytics/reports')
@UseGuards(JwtAuthGuard)
export class ReportBuilderController {
  constructor(
    private readonly reportBuilderService: ReportBuilderService,
  ) {}

  // ============================================
  // Report Template Endpoints
  // ============================================

  /**
   * Create a new report template
   * Requirements: 4.4, 11.4
   */
  @Post('templates')
  async createTemplate(
    @Request() req: any,
    @Body() dto: CreateReportTemplateDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.reportBuilderService.createTemplate(workspaceId, dto);
  }

  /**
   * Get all report templates for workspace
   * Requirements: 4.4, 11.4
   */
  @Get('templates')
  async getTemplates(
    @Request() req: any,
    @Query('includePublic') includePublic?: string,
  ) {
    const workspaceId = req.user.workspaceId;
    const includePublicTemplates = includePublic === 'true';
    return this.reportBuilderService.getTemplates(workspaceId, includePublicTemplates);
  }

  /**
   * Get a specific report template
   * Requirements: 4.4, 11.4
   */
  @Get('templates/:templateId')
  async getTemplate(
    @Request() req: any,
    @Param('templateId') templateId: string,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.reportBuilderService.getTemplate(templateId, workspaceId);
  }

  /**
   * Update a report template
   * Requirements: 4.4, 11.4
   */
  @Put('templates/:templateId')
  async updateTemplate(
    @Request() req: any,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateReportTemplateDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.reportBuilderService.updateTemplate(templateId, workspaceId, dto);
  }

  /**
   * Delete a report template
   * Requirements: 4.4, 11.4
   */
  @Delete('templates/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(
    @Request() req: any,
    @Param('templateId') templateId: string,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.reportBuilderService.deleteTemplate(templateId, workspaceId);
  }

  // ============================================
  // Report Generation Endpoints
  // ============================================

  /**
   * Generate a report from a template
   * Requirements: 4.4, 11.4
   */
  @Post('generate')
  async generateReport(
    @Request() req: any,
    @Body() dto: GenerateReportDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const userId = req.user.userId;
    return this.reportBuilderService.generateReport(workspaceId, userId, dto);
  }

  /**
   * Get generated reports for workspace
   * Requirements: 4.4, 11.4
   */
  @Get('generated')
  async getGeneratedReports(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const workspaceId = req.user.workspaceId;
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    return this.reportBuilderService.getGeneratedReports(workspaceId, limitNum, offsetNum);
  }

  // ============================================
  // Report Scheduling Endpoints
  // ============================================

  /**
   * Schedule a report for automatic generation
   * Requirements: 4.4, 11.4
   */
  @Post('schedule')
  async scheduleReport(
    @Request() req: any,
    @Body() dto: ScheduleReportDto,
  ) {
    const workspaceId = req.user.workspaceId;
    const userId = req.user.userId;
    return this.reportBuilderService.scheduleReport(workspaceId, userId, dto);
  }

  /**
   * Get scheduled reports for workspace
   * Requirements: 4.4, 11.4
   */
  @Get('scheduled')
  async getScheduledReports(@Request() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.reportBuilderService.getScheduledReports(workspaceId);
  }

  /**
   * Get a specific scheduled report
   * Requirements: 4.4, 11.4
   */
  @Get('scheduled/:scheduleId')
  async getScheduledReport(
    @Request() req: any,
    @Param('scheduleId') scheduleId: string,
  ) {
    const workspaceId = req.user.workspaceId;
    const schedules = await this.reportBuilderService.getScheduledReports(workspaceId);
    return schedules.find(s => s.id === scheduleId);
  }

  /**
   * Update a scheduled report
   * Requirements: 4.4, 11.4
   */
  @Put('scheduled/:scheduleId')
  async updateScheduledReport(
    @Request() req: any,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateScheduledReportDto,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.reportBuilderService.updateScheduledReport(scheduleId, workspaceId, dto);
  }

  /**
   * Delete a scheduled report
   * Requirements: 4.4, 11.4
   */
  @Delete('scheduled/:scheduleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteScheduledReport(
    @Request() req: any,
    @Param('scheduleId') scheduleId: string,
  ) {
    const workspaceId = req.user.workspaceId;
    return this.reportBuilderService.deleteScheduledReport(scheduleId, workspaceId);
  }
}
