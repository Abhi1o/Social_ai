import { IsString, IsOptional, IsArray, IsBoolean, IsEnum, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCompetitorDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsArray()
  accounts: CompetitorAccountDto[];
}

export class CompetitorAccountDto {
  @IsEnum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'threads', 'reddit'])
  platform: string;

  @IsString()
  platformAccountId: string;

  @IsString()
  username: string;

  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class UpdateCompetitorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CompetitiveBenchmarkQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competitorIds?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'threads', 'reddit'], { each: true })
  platforms?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['followers', 'engagement', 'posts', 'engagementRate', 'growth'])
  metric?: string;

  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  granularity?: string;
}

export class ShareOfVoiceQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competitorIds?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'threads', 'reddit'], { each: true })
  platforms?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['mentions', 'engagement', 'reach'])
  metric?: string;
}

export class IndustryBenchmarkQueryDto {
  @IsString()
  industry: string;

  @IsOptional()
  @IsArray()
  @IsEnum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'threads', 'reddit'], { each: true })
  platforms?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CompetitorActivityQueryDto {
  @IsString()
  competitorId: string;

  @IsOptional()
  @IsEnum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'threads', 'reddit'])
  platform?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export interface CompetitorMetricsResponse {
  competitorId: string;
  competitorName: string;
  platform: string;
  metrics: {
    followers: number;
    followersGrowth: number;
    followersGrowthPercentage: number;
    totalPosts: number;
    postsGrowth: number;
    engagementRate: number;
    engagementRateChange: number;
    averageLikesPerPost: number;
    averageCommentsPerPost: number;
    postingFrequency: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface CompetitiveComparisonResponse {
  workspace: {
    id: string;
    metrics: any;
  };
  competitors: CompetitorMetricsResponse[];
  rankings: {
    byFollowers: RankingItem[];
    byEngagement: RankingItem[];
    byGrowth: RankingItem[];
    byPostingFrequency: RankingItem[];
  };
  insights: string[];
}

export interface RankingItem {
  id: string;
  name: string;
  value: number;
  rank: number;
  isWorkspace: boolean;
}

export interface ShareOfVoiceResponse {
  totalMentions: number;
  totalEngagement: number;
  totalReach: number;
  breakdown: {
    id: string;
    name: string;
    mentions: number;
    mentionsPercentage: number;
    engagement: number;
    engagementPercentage: number;
    reach: number;
    reachPercentage: number;
    isWorkspace: boolean;
  }[];
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface IndustryBenchmarkResponse {
  industry: string;
  benchmarks: {
    platform: string;
    averageFollowers: number;
    averageEngagementRate: number;
    averagePostingFrequency: number;
    topPerformers: {
      name: string;
      followers: number;
      engagementRate: number;
    }[];
  }[];
  workspaceComparison: {
    platform: string;
    workspaceValue: number;
    industryAverage: number;
    percentile: number;
    status: 'above' | 'average' | 'below';
  }[];
}

export interface CompetitorActivityResponse {
  competitorId: string;
  competitorName: string;
  platform: string;
  activities: {
    date: string;
    posts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    engagementRate: number;
    topPosts: {
      id: string;
      content: string;
      likes: number;
      comments: number;
      shares: number;
      timestamp: string;
    }[];
  }[];
  summary: {
    totalPosts: number;
    averageEngagement: number;
    peakPostingTime: string;
    mostUsedHashtags: string[];
    contentTypeDistribution: Record<string, number>;
  };
}
