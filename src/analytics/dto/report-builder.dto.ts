import { IsString, IsArray, IsOptional, IsEnum, IsObject, IsBoolean, ValidateNested, IsDateString, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  EXCEL = 'excel',
}

export enum ReportFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum WidgetType {
  KPI_CARD = 'kpi_card',
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  TABLE = 'table',
  HEATMAP = 'heatmap',
  FUNNEL = 'funnel',
  GAUGE = 'gauge',
}

export enum MetricType {
  FOLLOWERS = 'followers',
  ENGAGEMENT = 'engagement',
  REACH = 'reach',
  IMPRESSIONS = 'impressions',
  LIKES = 'likes',
  COMMENTS = 'comments',
  SHARES = 'shares',
  SAVES = 'saves',
  CLICKS = 'clicks',
  CONVERSIONS = 'conversions',
  REVENUE = 'revenue',
  ENGAGEMENT_RATE = 'engagement_rate',
  FOLLOWER_GROWTH = 'follower_growth',
  POST_COUNT = 'post_count',
}

export class WidgetConfigDto {
  @IsEnum(WidgetType)
  type: WidgetType;

  @IsString()
  title: string;

  @IsArray()
  @IsEnum(MetricType, { each: true })
  metrics: MetricType[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accountIds?: string[];

  @IsOptional()
  @IsObject()
  chartConfig?: {
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
    colors?: string[];
  };

  @IsOptional()
  @IsObject()
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class BrandingConfigDto {
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  footerText?: string;

  @IsOptional()
  @IsBoolean()
  showPoweredBy?: boolean;
}

export class CreateReportTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetConfigDto)
  widgets: WidgetConfigDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingConfigDto)
  branding?: BrandingConfigDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateReportTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetConfigDto)
  widgets?: WidgetConfigDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingConfigDto)
  branding?: BrandingConfigDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class GenerateReportDto {
  @IsString()
  templateId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(ReportFormat)
  format: ReportFormat;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accountIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingConfigDto)
  customBranding?: BrandingConfigDto;
}

export class ScheduleReportDto {
  @IsString()
  templateId: string;

  @IsEnum(ReportFrequency)
  frequency: ReportFrequency;

  @IsEnum(ReportFormat)
  format: ReportFormat;

  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[];

  @IsOptional()
  @IsString()
  dayOfWeek?: string; // For weekly reports: 'monday', 'tuesday', etc.

  @IsOptional()
  @IsString()
  dayOfMonth?: string; // For monthly reports: '1', '15', 'last', etc.

  @IsOptional()
  @IsString()
  time?: string; // Time in HH:mm format

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accountIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateScheduledReportDto {
  @IsOptional()
  @IsEnum(ReportFrequency)
  frequency?: ReportFrequency;

  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  recipients?: string[];

  @IsOptional()
  @IsString()
  dayOfWeek?: string;

  @IsOptional()
  @IsString()
  dayOfMonth?: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accountIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ExportReportDto {
  @IsString()
  reportId: string;

  @IsEnum(ReportFormat)
  format: ReportFormat;
}
