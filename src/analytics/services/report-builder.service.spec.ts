import { Test, TestingModule } from '@nestjs/testing';
import { ReportBuilderService } from './report-builder.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { PostPerformanceService } from './post-performance.service';
import { AudienceAnalyticsService } from './audience-analytics.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ReportFormat, ReportFrequency, WidgetType, MetricType } from '../dto/report-builder.dto';

describe('ReportBuilderService', () => {
  let service: ReportBuilderService;
  let prismaService: PrismaService;
  let dashboardService: AnalyticsDashboardService;

  const mockPrismaService = {
    reportTemplate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    generatedReport: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    scheduledReport: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockDashboardService = {
    getOverviewKPIs: jest.fn(),
  };

  const mockPostPerformanceService = {};
  const mockAudienceService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportBuilderService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AnalyticsDashboardService,
          useValue: mockDashboardService,
        },
        {
          provide: PostPerformanceService,
          useValue: mockPostPerformanceService,
        },
        {
          provide: AudienceAnalyticsService,
          useValue: mockAudienceService,
        },
      ],
    }).compile();

    service = module.get<ReportBuilderService>(ReportBuilderService);
    prismaService = module.get<PrismaService>(PrismaService);
    dashboardService = module.get<AnalyticsDashboardService>(AnalyticsDashboardService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTemplate', () => {
    it('should create a report template successfully', async () => {
      const workspaceId = 'workspace-1';
      const dto = {
        name: 'Monthly Performance Report',
        description: 'Monthly overview of social media performance',
        widgets: [
          {
            type: WidgetType.KPI_CARD,
            title: 'Total Followers',
            metrics: [MetricType.FOLLOWERS],
          },
        ],
        tags: ['monthly', 'performance'],
        isPublic: false,
      };

      const expectedTemplate = {
        id: 'template-1',
        workspaceId,
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.reportTemplate.create.mockResolvedValue(expectedTemplate);

      const result = await service.createTemplate(workspaceId, dto);

      expect(result).toEqual(expectedTemplate);
      expect(mockPrismaService.reportTemplate.create).toHaveBeenCalledWith({
        data: {
          workspaceId,
          name: dto.name,
          description: dto.description,
          widgets: dto.widgets,
          branding: undefined,
          tags: dto.tags,
          isPublic: dto.isPublic,
        },
      });
    });

    it('should throw BadRequestException if widgets are empty', async () => {
      const workspaceId = 'workspace-1';
      const dto = {
        name: 'Invalid Report',
        widgets: [],
      };

      await expect(service.createTemplate(workspaceId, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if widget configuration is invalid', async () => {
      const workspaceId = 'workspace-1';
      const dto = {
        name: 'Invalid Report',
        widgets: [
          {
            type: WidgetType.KPI_CARD,
            // Missing title and metrics
          },
        ],
      };

      await expect(service.createTemplate(workspaceId, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getTemplates', () => {
    it('should return templates for workspace', async () => {
      const workspaceId = 'workspace-1';
      const templates = [
        {
          id: 'template-1',
          workspaceId,
          name: 'Template 1',
          widgets: [],
          _count: { generatedReports: 5, scheduledReports: 2 },
        },
      ];

      mockPrismaService.reportTemplate.findMany.mockResolvedValue(templates);

      const result = await service.getTemplates(workspaceId);

      expect(result).toEqual(templates);
      expect(mockPrismaService.reportTemplate.findMany).toHaveBeenCalled();
    });

    it('should include public templates when requested', async () => {
      const workspaceId = 'workspace-1';
      const templates = [
        {
          id: 'template-1',
          workspaceId,
          name: 'Private Template',
          isPublic: false,
        },
        {
          id: 'template-2',
          workspaceId: 'other-workspace',
          name: 'Public Template',
          isPublic: true,
        },
      ];

      mockPrismaService.reportTemplate.findMany.mockResolvedValue(templates);

      const result = await service.getTemplates(workspaceId, true);

      expect(result).toEqual(templates);
    });
  });

  describe('getTemplate', () => {
    it('should return a specific template', async () => {
      const templateId = 'template-1';
      const workspaceId = 'workspace-1';
      const template = {
        id: templateId,
        workspaceId,
        name: 'Test Template',
        widgets: [],
        _count: { generatedReports: 0, scheduledReports: 0 },
      };

      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(template);

      const result = await service.getTemplate(templateId, workspaceId);

      expect(result).toEqual(template);
    });

    it('should throw NotFoundException if template not found', async () => {
      const templateId = 'non-existent';
      const workspaceId = 'workspace-1';

      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(null);

      await expect(service.getTemplate(templateId, workspaceId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTemplate', () => {
    it('should update a template successfully', async () => {
      const templateId = 'template-1';
      const workspaceId = 'workspace-1';
      const existingTemplate = {
        id: templateId,
        workspaceId,
        name: 'Old Name',
      };
      const dto = {
        name: 'New Name',
        description: 'Updated description',
      };
      const updatedTemplate = {
        ...existingTemplate,
        ...dto,
      };

      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(existingTemplate);
      mockPrismaService.reportTemplate.update.mockResolvedValue(updatedTemplate);

      const result = await service.updateTemplate(templateId, workspaceId, dto);

      expect(result).toEqual(updatedTemplate);
      expect(mockPrismaService.reportTemplate.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if template not owned by workspace', async () => {
      const templateId = 'template-1';
      const workspaceId = 'workspace-1';
      const dto = { name: 'New Name' };

      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(null);

      await expect(service.updateTemplate(templateId, workspaceId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template successfully', async () => {
      const templateId = 'template-1';
      const workspaceId = 'workspace-1';
      const template = { id: templateId, workspaceId };

      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(template);
      mockPrismaService.reportTemplate.delete.mockResolvedValue(template);

      const result = await service.deleteTemplate(templateId, workspaceId);

      expect(result).toEqual({ success: true, message: 'Report template deleted' });
      expect(mockPrismaService.reportTemplate.delete).toHaveBeenCalledWith({
        where: { id: templateId },
      });
    });

    it('should throw NotFoundException if template not found', async () => {
      const templateId = 'non-existent';
      const workspaceId = 'workspace-1';

      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(null);

      await expect(service.deleteTemplate(templateId, workspaceId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('scheduleReport', () => {
    it('should schedule a report successfully', async () => {
      const workspaceId = 'workspace-1';
      const userId = 'user-1';
      const dto = {
        templateId: 'template-1',
        frequency: ReportFrequency.WEEKLY,
        format: ReportFormat.PDF,
        recipients: ['user@example.com'],
        dayOfWeek: 'monday',
        time: '09:00',
        isActive: true,
      };

      const template = {
        id: dto.templateId,
        workspaceId,
        name: 'Test Template',
      };

      const scheduledReport = {
        id: 'schedule-1',
        ...dto,
        workspaceId,
        createdBy: userId,
        nextRunAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(template);
      mockPrismaService.scheduledReport.create.mockResolvedValue(scheduledReport);

      const result = await service.scheduleReport(workspaceId, userId, dto);

      expect(result).toEqual(scheduledReport);
      expect(mockPrismaService.scheduledReport.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if weekly report missing dayOfWeek', async () => {
      const workspaceId = 'workspace-1';
      const userId = 'user-1';
      const dto = {
        templateId: 'template-1',
        frequency: ReportFrequency.WEEKLY,
        format: ReportFormat.PDF,
        recipients: ['user@example.com'],
        // Missing dayOfWeek
      };

      const template = { id: dto.templateId, workspaceId };
      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(template);

      await expect(service.scheduleReport(workspaceId, userId, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no recipients provided', async () => {
      const workspaceId = 'workspace-1';
      const userId = 'user-1';
      const dto = {
        templateId: 'template-1',
        frequency: ReportFrequency.DAILY,
        format: ReportFormat.PDF,
        recipients: [], // Empty recipients
      };

      const template = { id: dto.templateId, workspaceId };
      mockPrismaService.reportTemplate.findFirst.mockResolvedValue(template);

      await expect(service.scheduleReport(workspaceId, userId, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getGeneratedReports', () => {
    it('should return generated reports with pagination', async () => {
      const workspaceId = 'workspace-1';
      const reports = [
        {
          id: 'report-1',
          workspaceId,
          name: 'Report 1',
          template: { id: 'template-1', name: 'Template 1' },
        },
      ];

      mockPrismaService.generatedReport.findMany.mockResolvedValue(reports);
      mockPrismaService.generatedReport.count.mockResolvedValue(1);

      const result = await service.getGeneratedReports(workspaceId, 50, 0);

      expect(result).toEqual({
        reports,
        total: 1,
        limit: 50,
        offset: 0,
      });
    });
  });

  describe('getScheduledReports', () => {
    it('should return scheduled reports for workspace', async () => {
      const workspaceId = 'workspace-1';
      const reports = [
        {
          id: 'schedule-1',
          workspaceId,
          frequency: ReportFrequency.DAILY,
          template: { id: 'template-1', name: 'Template 1' },
        },
      ];

      mockPrismaService.scheduledReport.findMany.mockResolvedValue(reports);

      const result = await service.getScheduledReports(workspaceId);

      expect(result).toEqual(reports);
    });
  });

  describe('updateScheduledReport', () => {
    it('should update a scheduled report successfully', async () => {
      const scheduleId = 'schedule-1';
      const workspaceId = 'workspace-1';
      const existingSchedule = {
        id: scheduleId,
        workspaceId,
        frequency: ReportFrequency.DAILY,
      };
      const dto = {
        frequency: ReportFrequency.WEEKLY,
        dayOfWeek: 'monday',
      };
      const updatedSchedule = {
        ...existingSchedule,
        ...dto,
      };

      mockPrismaService.scheduledReport.findFirst.mockResolvedValue(existingSchedule);
      mockPrismaService.scheduledReport.update.mockResolvedValue(updatedSchedule);

      const result = await service.updateScheduledReport(scheduleId, workspaceId, dto);

      expect(result).toEqual(updatedSchedule);
    });
  });

  describe('deleteScheduledReport', () => {
    it('should delete a scheduled report successfully', async () => {
      const scheduleId = 'schedule-1';
      const workspaceId = 'workspace-1';
      const schedule = { id: scheduleId, workspaceId };

      mockPrismaService.scheduledReport.findFirst.mockResolvedValue(schedule);
      mockPrismaService.scheduledReport.delete.mockResolvedValue(schedule);

      const result = await service.deleteScheduledReport(scheduleId, workspaceId);

      expect(result).toEqual({ success: true, message: 'Scheduled report deleted' });
    });
  });
});
