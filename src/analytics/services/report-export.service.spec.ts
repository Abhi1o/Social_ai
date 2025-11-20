import { Test, TestingModule } from '@nestjs/testing';
import { ReportExportService } from './report-export.service';

describe('ReportExportService', () => {
  let service: ReportExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportExportService],
    }).compile();

    service = module.get<ReportExportService>(ReportExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportToCSV', () => {
    it('should export report data to CSV format', async () => {
      const reportName = 'Test Report';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const data = {
        'Total Followers': {
          type: 'kpi_card',
          title: 'Total Followers',
          metrics: {
            followers: 10000,
            follower_growth: 500,
          },
        },
      };

      const result = await service.exportToCSV(reportName, data, startDate, endDate);

      expect(result).toBeInstanceOf(Buffer);
      const csvContent = result.toString('utf-8');
      expect(csvContent).toContain('Test Report');
      expect(csvContent).toContain('2024-01-01');
      expect(csvContent).toContain('2024-01-31');
      expect(csvContent).toContain('Total Followers');
      expect(csvContent).toContain('followers');
      expect(csvContent).toContain('10000');
    });

    it('should handle multiple widgets in CSV export', async () => {
      const reportName = 'Multi-Widget Report';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const data = {
        'Widget 1': {
          metrics: { metric1: 100 },
        },
        'Widget 2': {
          metrics: { metric2: 200 },
        },
      };

      const result = await service.exportToCSV(reportName, data, startDate, endDate);
      const csvContent = result.toString('utf-8');

      expect(csvContent).toContain('Widget 1');
      expect(csvContent).toContain('Widget 2');
      expect(csvContent).toContain('metric1');
      expect(csvContent).toContain('metric2');
    });
  });

  describe('exportToExcel', () => {
    it('should export report data to Excel format', async () => {
      const reportName = 'Test Report';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const data = {
        'Total Engagement': {
          type: 'kpi_card',
          title: 'Total Engagement',
          metrics: {
            likes: 5000,
            comments: 1000,
            shares: 500,
          },
        },
      };

      const result = await service.exportToExcel(reportName, data, startDate, endDate);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should apply branding to Excel export', async () => {
      const reportName = 'Branded Report';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const data = {
        'Metrics': {
          metrics: { followers: 10000 },
        },
      };
      const branding = {
        companyName: 'Test Company',
        primaryColor: '#FF0000',
      };

      const result = await service.exportToExcel(reportName, data, startDate, endDate, branding);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('exportToPDF', () => {
    it('should export report data to PDF format (HTML)', async () => {
      const reportName = 'Test Report';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const data = {
        'Performance Metrics': {
          type: 'kpi_card',
          title: 'Performance Metrics',
          metrics: {
            reach: 50000,
            impressions: 100000,
          },
        },
      };

      const result = await service.exportToPDF(reportName, data, startDate, endDate);

      expect(result).toBeInstanceOf(Buffer);
      const htmlContent = result.toString('utf-8');
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('Test Report');
      expect(htmlContent).toContain('Performance Metrics');
    });

    it('should include branding in PDF export', async () => {
      const reportName = 'Branded Report';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const data = {
        'Metrics': {
          metrics: { followers: 10000 },
        },
      };
      const branding = {
        companyName: 'Test Company',
        primaryColor: '#3B82F6',
        logoUrl: 'https://example.com/logo.png',
        footerText: 'Custom Footer',
      };

      const result = await service.exportToPDF(reportName, data, startDate, endDate, branding);
      const htmlContent = result.toString('utf-8');

      expect(htmlContent).toContain('Test Company');
      expect(htmlContent).toContain('#3B82F6');
      expect(htmlContent).toContain('https://example.com/logo.png');
      expect(htmlContent).toContain('Custom Footer');
    });

    it('should format large numbers correctly', async () => {
      const reportName = 'Large Numbers Report';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const data = {
        'Metrics': {
          metrics: {
            small: 500,
            thousands: 5000,
            millions: 5000000,
          },
        },
      };

      const result = await service.exportToPDF(reportName, data, startDate, endDate);
      const htmlContent = result.toString('utf-8');

      expect(htmlContent).toContain('500'); // Small numbers unchanged
      expect(htmlContent).toContain('5.00K'); // Thousands formatted
      expect(htmlContent).toContain('5.00M'); // Millions formatted
    });
  });
});
