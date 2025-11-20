import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateReportTemplateDto,
  UpdateReportTemplateDto,
  GenerateReportDto,
  ScheduleReportDto,
  UpdateScheduledReportDto,
  ReportFormat,
  ReportFrequency,
} from '../dto/report-builder.dto';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { PostPerformanceService } from './post-performance.service';
import { AudienceAnalyticsService } from './audience-analytics.service';

/**
 * Report Builder Service
 * Handles custom report templates, generation, and scheduling
 * Requirements: 4.4, 11.4
 */
@Injectable()
export class ReportBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: AnalyticsDashboardService,
    private readonly postPerformanceService: PostPerformanceService,
    private readonly audienceService: AudienceAnalyticsService,
  ) {}

  /**
   * Create a new report template
   * Requirements: 4.4, 11.4
   */
  async createTemplate(
    workspaceId: string,
    dto: CreateReportTemplateDto,
  ) {
    // Validate widgets configuration
    this.validateWidgets(dto.widgets);

    const template = await this.prisma.reportTemplate.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        widgets: dto.widgets as any,
        branding: dto.branding as any,
        tags: dto.tags || [],
        isPublic: dto.isPublic || false,
      },
    });

    return template;
  }

  /**
   * Get all report templates for a workspace
   * Requirements: 4.4, 11.4
   */
  async getTemplates(workspaceId: string, includePublic = true) {
    const where: any = {
      OR: [
        { workspaceId },
      ],
    };

    if (includePublic) {
      where.OR.push({ isPublic: true });
    } else {
      delete where.OR;
      where.workspaceId = workspaceId;
    }

    const templates = await this.prisma.reportTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            generatedReports: true,
            scheduledReports: true,
          },
        },
      },
    });

    return templates;
  }

  /**
   * Get a specific report template
   * Requirements: 4.4, 11.4
   */
  async getTemplate(templateId: string, workspaceId: string) {
    const template = await this.prisma.reportTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { workspaceId },
          { isPublic: true },
        ],
      },
      include: {
        _count: {
          select: {
            generatedReports: true,
            scheduledReports: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Report template not found');
    }

    return template;
  }

  /**
   * Update a report template
   * Requirements: 4.4, 11.4
   */
  async updateTemplate(
    templateId: string,
    workspaceId: string,
    dto: UpdateReportTemplateDto,
  ) {
    // Verify ownership
    const template = await this.prisma.reportTemplate.findFirst({
      where: {
        id: templateId,
        workspaceId,
      },
    });

    if (!template) {
      throw new NotFoundException('Report template not found or access denied');
    }

    // Validate widgets if provided
    if (dto.widgets) {
      this.validateWidgets(dto.widgets);
    }

    const updated = await this.prisma.reportTemplate.update({
      where: { id: templateId },
      data: {
        name: dto.name,
        description: dto.description,
        widgets: dto.widgets as any,
        branding: dto.branding as any,
        tags: dto.tags,
        isPublic: dto.isPublic,
      },
    });

    return updated;
  }

  /**
   * Delete a report template
   * Requirements: 4.4, 11.4
   */
  async deleteTemplate(templateId: string, workspaceId: string) {
    // Verify ownership
    const template = await this.prisma.reportTemplate.findFirst({
      where: {
        id: templateId,
        workspaceId,
      },
    });

    if (!template) {
      throw new NotFoundException('Report template not found or access denied');
    }

    await this.prisma.reportTemplate.delete({
      where: { id: templateId },
    });

    return { success: true, message: 'Report template deleted' };
  }

  /**
   * Generate a report from a template
   * Requirements: 4.4, 11.4
   */
  async generateReport(
    workspaceId: string,
    userId: string,
    dto: GenerateReportDto,
  ) {
    // Get template
    const template = await this.getTemplate(dto.templateId, workspaceId);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Collect data for all widgets
    const reportData = await this.collectReportData(
      workspaceId,
      template.widgets as any,
      startDate,
      endDate,
      dto.platforms,
      dto.accountIds,
    );

    // Apply custom branding if provided
    const branding = dto.customBranding || template.branding;

    // Generate the report file based on format
    let fileUrl: string;
    let fileSize: number;

    switch (dto.format) {
      case ReportFormat.PDF:
        ({ fileUrl, fileSize } = await this.generatePDF(
          template.name,
          reportData,
          branding as any,
          startDate,
          endDate,
        ));
        break;
      case ReportFormat.CSV:
        ({ fileUrl, fileSize } = await this.generateCSV(
          template.name,
          reportData,
          startDate,
          endDate,
        ));
        break;
      case ReportFormat.EXCEL:
        ({ fileUrl, fileSize } = await this.generateExcel(
          template.name,
          reportData,
          startDate,
          endDate,
        ));
        break;
      default:
        throw new BadRequestException('Invalid report format');
    }

    // Save generated report record
    const generatedReport = await this.prisma.generatedReport.create({
      data: {
        templateId: dto.templateId,
        workspaceId,
        name: `${template.name} - ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        format: dto.format,
        startDate,
        endDate,
        fileUrl,
        fileSize,
        platforms: dto.platforms || [],
        accountIds: dto.accountIds || [],
        metadata: {
          widgetCount: (template.widgets as any).length,
          generatedAt: new Date().toISOString(),
        },
        generatedBy: userId,
      },
    });

    return {
      ...generatedReport,
      downloadUrl: fileUrl,
    };
  }

  /**
   * Get generated reports for a workspace
   * Requirements: 4.4, 11.4
   */
  async getGeneratedReports(
    workspaceId: string,
    limit = 50,
    offset = 0,
  ) {
    const reports = await this.prisma.generatedReport.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const total = await this.prisma.generatedReport.count({
      where: { workspaceId },
    });

    return {
      reports,
      total,
      limit,
      offset,
    };
  }

  /**
   * Schedule a report for automatic generation
   * Requirements: 4.4, 11.4
   */
  async scheduleReport(
    workspaceId: string,
    userId: string,
    dto: ScheduleReportDto,
  ) {
    // Verify template exists and is accessible
    await this.getTemplate(dto.templateId, workspaceId);

    // Validate scheduling configuration
    this.validateScheduleConfig(dto);

    // Calculate next run time
    const nextRunAt = this.calculateNextRunTime(dto);

    const scheduledReport = await this.prisma.scheduledReport.create({
      data: {
        templateId: dto.templateId,
        workspaceId,
        frequency: dto.frequency,
        format: dto.format,
        recipients: dto.recipients,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
        time: dto.time || '09:00',
        platforms: dto.platforms || [],
        accountIds: dto.accountIds || [],
        isActive: dto.isActive !== false,
        nextRunAt,
        createdBy: userId,
      },
    });

    return scheduledReport;
  }

  /**
   * Get scheduled reports for a workspace
   * Requirements: 4.4, 11.4
   */
  async getScheduledReports(workspaceId: string) {
    const reports = await this.prisma.scheduledReport.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return reports;
  }

  /**
   * Update a scheduled report
   * Requirements: 4.4, 11.4
   */
  async updateScheduledReport(
    scheduleId: string,
    workspaceId: string,
    dto: UpdateScheduledReportDto,
  ) {
    // Verify ownership
    const schedule = await this.prisma.scheduledReport.findFirst({
      where: {
        id: scheduleId,
        workspaceId,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Scheduled report not found or access denied');
    }

    // Recalculate next run time if schedule changed
    let nextRunAt = schedule.nextRunAt;
    if (dto.frequency || dto.dayOfWeek || dto.dayOfMonth || dto.time) {
      const scheduleConfig = {
        frequency: dto.frequency || schedule.frequency,
        dayOfWeek: dto.dayOfWeek || schedule.dayOfWeek,
        dayOfMonth: dto.dayOfMonth || schedule.dayOfMonth,
        time: dto.time || schedule.time,
      } as any;
      nextRunAt = this.calculateNextRunTime(scheduleConfig);
    }

    const updated = await this.prisma.scheduledReport.update({
      where: { id: scheduleId },
      data: {
        frequency: dto.frequency,
        format: dto.format,
        recipients: dto.recipients,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
        time: dto.time,
        platforms: dto.platforms,
        accountIds: dto.accountIds,
        isActive: dto.isActive,
        nextRunAt,
      },
    });

    return updated;
  }

  /**
   * Delete a scheduled report
   * Requirements: 4.4, 11.4
   */
  async deleteScheduledReport(scheduleId: string, workspaceId: string) {
    // Verify ownership
    const schedule = await this.prisma.scheduledReport.findFirst({
      where: {
        id: scheduleId,
        workspaceId,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Scheduled report not found or access denied');
    }

    await this.prisma.scheduledReport.delete({
      where: { id: scheduleId },
    });

    return { success: true, message: 'Scheduled report deleted' };
  }

  /**
   * Process scheduled reports that are due
   * Called by cron job
   * Requirements: 4.4, 11.4
   */
  async processScheduledReports() {
    const now = new Date();

    const dueReports = await this.prisma.scheduledReport.findMany({
      where: {
        isActive: true,
        nextRunAt: {
          lte: now,
        },
      },
      include: {
        template: true,
      },
    });

    const results = [];

    for (const schedule of dueReports) {
      try {
        // Calculate date range based on frequency
        const { startDate, endDate } = this.calculateReportDateRange(schedule.frequency);

        // Generate the report
        const report = await this.generateReport(
          schedule.workspaceId,
          schedule.createdBy,
          {
            templateId: schedule.templateId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            format: schedule.format,
            platforms: schedule.platforms,
            accountIds: schedule.accountIds,
          },
        );

        // Send email to recipients
        await this.sendReportEmail(
          schedule.recipients,
          schedule.template.name,
          report.downloadUrl,
          startDate,
          endDate,
        );

        // Update schedule
        const nextRunAt = this.calculateNextRunTime(schedule as any);
        await this.prisma.scheduledReport.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            nextRunAt,
          },
        });

        results.push({
          scheduleId: schedule.id,
          success: true,
          reportId: report.id,
        });
      } catch (error) {
        results.push({
          scheduleId: schedule.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private validateWidgets(widgets: any[]) {
    if (!widgets || widgets.length === 0) {
      throw new BadRequestException('Report must have at least one widget');
    }

    for (const widget of widgets) {
      if (!widget.type || !widget.title || !widget.metrics || widget.metrics.length === 0) {
        throw new BadRequestException('Invalid widget configuration');
      }
    }
  }

  private validateScheduleConfig(dto: ScheduleReportDto) {
    if (dto.frequency === ReportFrequency.WEEKLY && !dto.dayOfWeek) {
      throw new BadRequestException('Day of week is required for weekly reports');
    }

    if (dto.frequency === ReportFrequency.MONTHLY && !dto.dayOfMonth) {
      throw new BadRequestException('Day of month is required for monthly reports');
    }

    if (dto.recipients.length === 0) {
      throw new BadRequestException('At least one recipient is required');
    }
  }

  private calculateNextRunTime(schedule: any): Date {
    const now = new Date();
    const [hours, minutes] = (schedule.time || '09:00').split(':').map(Number);

    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    switch (schedule.frequency) {
      case ReportFrequency.DAILY:
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case ReportFrequency.WEEKLY:
        const targetDay = this.getDayOfWeekNumber(schedule.dayOfWeek);
        const currentDay = nextRun.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0 || (daysToAdd === 0 && nextRun <= now)) {
          daysToAdd += 7;
        }
        nextRun.setDate(nextRun.getDate() + daysToAdd);
        break;

      case ReportFrequency.MONTHLY:
        if (schedule.dayOfMonth === 'last') {
          nextRun = new Date(nextRun.getFullYear(), nextRun.getMonth() + 1, 0);
          nextRun.setHours(hours, minutes, 0, 0);
          if (nextRun <= now) {
            nextRun = new Date(nextRun.getFullYear(), nextRun.getMonth() + 2, 0);
            nextRun.setHours(hours, minutes, 0, 0);
          }
        } else {
          const day = parseInt(schedule.dayOfMonth);
          nextRun.setDate(day);
          if (nextRun <= now) {
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
        }
        break;

      case ReportFrequency.ONCE:
        // For one-time reports, set to immediate execution
        nextRun = new Date(now.getTime() + 60000); // 1 minute from now
        break;
    }

    return nextRun;
  }

  private getDayOfWeekNumber(day: string): number {
    const days: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    return days[day.toLowerCase()] || 1;
  }

  private calculateReportDateRange(frequency: ReportFrequency): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (frequency) {
      case ReportFrequency.DAILY:
        startDate.setDate(startDate.getDate() - 1);
        break;
      case ReportFrequency.WEEKLY:
        startDate.setDate(startDate.getDate() - 7);
        break;
      case ReportFrequency.MONTHLY:
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

  private async collectReportData(
    workspaceId: string,
    widgets: any[],
    startDate: Date,
    endDate: Date,
    platforms?: string[],
    accountIds?: string[],
  ) {
    const data: any = {};

    for (const widget of widgets) {
      const widgetData: any = {
        type: widget.type,
        title: widget.title,
        metrics: {},
      };

      // Collect data for each metric in the widget
      for (const metric of widget.metrics) {
        try {
          widgetData.metrics[metric] = await this.fetchMetricData(
            workspaceId,
            metric,
            startDate,
            endDate,
            platforms || widget.platforms,
            accountIds || widget.accountIds,
          );
        } catch (error) {
          widgetData.metrics[metric] = { error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }

      data[widget.title] = widgetData;
    }

    return data;
  }

  private async fetchMetricData(
    workspaceId: string,
    metric: string,
    startDate: Date,
    endDate: Date,
    platforms?: string[],
    accountIds?: string[],
  ) {
    // Fetch data from appropriate service based on metric type
    const kpis = await this.dashboardService.getOverviewKPIs(
      workspaceId,
      startDate,
      endDate,
      platforms,
      accountIds,
    );

    // Map metric to KPI data
    const metricMap: any = {
      followers: kpis.totalFollowers,
      engagement: kpis.totalEngagement,
      reach: kpis.totalReach,
      impressions: kpis.totalImpressions,
      likes: kpis.totalEngagement, // Simplified
      engagement_rate: kpis.engagementRate,
      follower_growth: kpis.followerGrowth,
      post_count: kpis.totalPosts || 0,
    };

    return metricMap[metric] || 0;
  }

  private async generatePDF(
    name: string,
    data: any,
    branding: any,
    startDate: Date,
    endDate: Date,
  ): Promise<{ fileUrl: string; fileSize: number }> {
    // TODO: Implement PDF generation using a library like puppeteer or pdfkit
    // For now, return a placeholder
    return {
      fileUrl: `/reports/pdf/${Date.now()}.pdf`,
      fileSize: 1024000, // 1MB placeholder
    };
  }

  private async generateCSV(
    name: string,
    data: any,
    startDate: Date,
    endDate: Date,
  ): Promise<{ fileUrl: string; fileSize: number }> {
    // TODO: Implement CSV generation
    // For now, return a placeholder
    return {
      fileUrl: `/reports/csv/${Date.now()}.csv`,
      fileSize: 50000, // 50KB placeholder
    };
  }

  private async generateExcel(
    name: string,
    data: any,
    startDate: Date,
    endDate: Date,
  ): Promise<{ fileUrl: string; fileSize: number }> {
    // TODO: Implement Excel generation using a library like exceljs
    // For now, return a placeholder
    return {
      fileUrl: `/reports/excel/${Date.now()}.xlsx`,
      fileSize: 100000, // 100KB placeholder
    };
  }

  private async sendReportEmail(
    recipients: string[],
    reportName: string,
    downloadUrl: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    // TODO: Implement email sending using SendGrid or similar
    // For now, just log
    console.log(`Sending report "${reportName}" to ${recipients.join(', ')}`);
    console.log(`Download URL: ${downloadUrl}`);
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
  }
}
