import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ReportFormat } from '../dto/report-builder.dto';

/**
 * Report Export Service
 * Handles PDF, CSV, and Excel export functionality
 * Requirements: 4.4, 11.4
 */
@Injectable()
export class ReportExportService {
  /**
   * Export report data to CSV format
   * Requirements: 4.4, 11.4
   */
  async exportToCSV(
    reportName: string,
    data: any,
    startDate: Date,
    endDate: Date,
  ): Promise<Buffer> {
    const rows: string[][] = [];

    // Add header
    rows.push([
      `Report: ${reportName}`,
      `Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    ]);
    rows.push([]); // Empty row

    // Process each widget
    for (const [widgetTitle, widgetData] of Object.entries(data)) {
      rows.push([widgetTitle as string]);
      rows.push(['Metric', 'Value']);

      const widget = widgetData as any;
      for (const [metric, value] of Object.entries(widget.metrics)) {
        const displayValue = typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : String(value);
        rows.push([metric, displayValue]);
      }

      rows.push([]); // Empty row between widgets
    }

    // Convert to CSV string
    const csvContent = rows
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Export report data to Excel format
   * Requirements: 4.4, 11.4
   */
  async exportToExcel(
    reportName: string,
    data: any,
    startDate: Date,
    endDate: Date,
    branding?: any,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = branding?.companyName || 'Social Media Platform';
    workbook.created = new Date();

    // Create summary sheet
    const summarySheet = workbook.addWorksheet('Summary');

    // Add title
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = reportName;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Add date range
    summarySheet.mergeCells('A2:D2');
    const dateCell = summarySheet.getCell('A2');
    dateCell.value = `Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`;
    dateCell.alignment = { horizontal: 'center' };

    let currentRow = 4;

    // Add each widget as a section
    for (const [widgetTitle, widgetData] of Object.entries(data)) {
      const widget = widgetData as any;

      // Widget title
      summarySheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const widgetTitleCell = summarySheet.getCell(`A${currentRow}`);
      widgetTitleCell.value = widgetTitle;
      widgetTitleCell.font = { size: 14, bold: true };
      widgetTitleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      currentRow++;

      // Headers
      summarySheet.getCell(`A${currentRow}`).value = 'Metric';
      summarySheet.getCell(`B${currentRow}`).value = 'Value';
      summarySheet.getRow(currentRow).font = { bold: true };
      currentRow++;

      // Metrics
      for (const [metric, value] of Object.entries(widget.metrics)) {
        summarySheet.getCell(`A${currentRow}`).value = metric;
        const displayValue = typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : value;
        summarySheet.getCell(`B${currentRow}`).value = displayValue as any;
        currentRow++;
      }

      currentRow += 2; // Add spacing
    }

    // Auto-fit columns
    summarySheet.columns.forEach((column: any) => {
      column.width = 20;
    });

    // Apply branding colors if provided
    if (branding?.primaryColor) {
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: branding.primaryColor.replace('#', 'FF') },
      };
      titleCell.font = { ...titleCell.font, color: { argb: 'FFFFFFFF' } };
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export report data to PDF format
   * Requirements: 4.4, 11.4
   * Note: This is a placeholder. Full PDF generation would require puppeteer or similar
   */
  async exportToPDF(
    reportName: string,
    data: any,
    startDate: Date,
    endDate: Date,
    branding?: any,
  ): Promise<Buffer> {
    // Generate HTML content
    const html = this.generateReportHTML(reportName, data, startDate, endDate, branding);

    // TODO: Use puppeteer or similar to convert HTML to PDF
    // For now, return HTML as buffer (would need proper PDF generation in production)
    return Buffer.from(html, 'utf-8');
  }

  /**
   * Generate HTML for report
   * Used for PDF generation and email previews
   * Requirements: 4.4, 11.4
   */
  private generateReportHTML(
    reportName: string,
    data: any,
    startDate: Date,
    endDate: Date,
    branding?: any,
  ): string {
    const primaryColor = branding?.primaryColor || '#3B82F6';
    const companyName = branding?.companyName || 'Social Media Platform';
    const logoUrl = branding?.logoUrl || '';

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 3px solid ${primaryColor};
      margin-bottom: 30px;
    }
    .logo {
      max-width: 200px;
      margin-bottom: 20px;
    }
    h1 {
      color: ${primaryColor};
      margin: 0;
      font-size: 32px;
    }
    .date-range {
      color: #666;
      font-size: 16px;
      margin-top: 10px;
    }
    .widget {
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .widget-title {
      font-size: 20px;
      font-weight: bold;
      color: ${primaryColor};
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid ${primaryColor};
    }
    .metrics-table {
      width: 100%;
      border-collapse: collapse;
    }
    .metrics-table th {
      background: ${primaryColor};
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    .metrics-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .metrics-table tr:hover {
      background: #f3f4f6;
    }
    .footer {
      text-align: center;
      padding: 30px 0;
      margin-top: 50px;
      border-top: 1px solid #e5e7eb;
      color: #666;
      font-size: 14px;
    }
    .metric-value {
      font-weight: 600;
      color: ${primaryColor};
    }
  </style>
</head>
<body>
  <div class="header">
    ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo">` : ''}
    <h1>${reportName}</h1>
    <div class="date-range">
      ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
    </div>
  </div>
`;

    // Add each widget
    for (const [widgetTitle, widgetData] of Object.entries(data)) {
      const widget = widgetData as any;

      html += `
  <div class="widget">
    <div class="widget-title">${widgetTitle}</div>
    <table class="metrics-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
`;

      for (const [metric, value] of Object.entries(widget.metrics)) {
        const displayValue = typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : this.formatMetricValue(value as any);

        html += `
        <tr>
          <td>${this.formatMetricName(metric)}</td>
          <td class="metric-value">${displayValue}</td>
        </tr>
`;
      }

      html += `
      </tbody>
    </table>
  </div>
`;
    }

    // Add footer
    html += `
  <div class="footer">
    ${branding?.footerText || `Generated by ${companyName}`}
    ${branding?.showPoweredBy !== false ? '<br>Powered by AI Social Media Platform' : ''}
  </div>
</body>
</html>
`;

    return html;
  }

  private formatMetricName(metric: string): string {
    return metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatMetricValue(value: any): string {
    if (typeof value === 'number') {
      if (value > 1000000) {
        return `${(value / 1000000).toFixed(2)}M`;
      } else if (value > 1000) {
        return `${(value / 1000).toFixed(2)}K`;
      }
      return value.toLocaleString();
    }
    return String(value);
  }
}
