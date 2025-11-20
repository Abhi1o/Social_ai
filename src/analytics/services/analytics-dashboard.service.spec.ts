import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { Metric } from '../schemas/metric.schema';
import { AggregatedMetric } from '../schemas/aggregated-metric.schema';
import { PrismaService } from '../../prisma/prisma.service';

describe('AnalyticsDashboardService', () => {
  let service: AnalyticsDashboardService;
  let metricModel: any;
  let aggregatedMetricModel: any;
  let prismaService: any;

  beforeEach(async () => {
    // Mock Mongoose models
    const mockMetricModel = {
      aggregate: jest.fn(),
    };

    const mockAggregatedMetricModel = {
      aggregate: jest.fn(),
    };

    // Mock Prisma service
    const mockPrismaService = {
      post: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsDashboardService,
        {
          provide: getModelToken(Metric.name),
          useValue: mockMetricModel,
        },
        {
          provide: getModelToken(AggregatedMetric.name),
          useValue: mockAggregatedMetricModel,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsDashboardService>(AnalyticsDashboardService);
    metricModel = module.get(getModelToken(Metric.name));
    aggregatedMetricModel = module.get(getModelToken(AggregatedMetric.name));
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverviewKPIs', () => {
    it('should return KPI metrics for a workspace', async () => {
      const workspaceId = 'workspace-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock current period metrics
      metricModel.aggregate.mockResolvedValueOnce([
        {
          _id: null,
          totalLikes: 5000,
          totalComments: 1000,
          totalShares: 500,
          totalSaves: 800,
          totalReach: 100000,
          totalImpressions: 150000,
          latestFollowers: 15000,
          postCount: 50,
        },
      ]);

      // Mock previous period metrics
      metricModel.aggregate.mockResolvedValueOnce([
        {
          _id: null,
          totalLikes: 4500,
          totalComments: 900,
          totalShares: 450,
          totalSaves: 700,
          totalReach: 90000,
          totalImpressions: 135000,
          earliestFollowers: 14500,
          latestFollowers: 14800,
          postCount: 45,
        },
      ]);

      const result = await service.getOverviewKPIs(workspaceId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.totalFollowers).toBe(15000);
      expect(result.totalEngagement).toBe(7300); // 5000 + 1000 + 500 + 800
      expect(result.totalReach).toBe(100000);
      expect(result.totalImpressions).toBe(150000);
      expect(result.totalPosts).toBe(50);
      expect(metricModel.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should handle empty metrics gracefully', async () => {
      const workspaceId = 'workspace-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      metricModel.aggregate.mockResolvedValueOnce([]);
      metricModel.aggregate.mockResolvedValueOnce([]);

      const result = await service.getOverviewKPIs(workspaceId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.totalFollowers).toBe(0);
      expect(result.totalEngagement).toBe(0);
      expect(result.totalReach).toBe(0);
    });
  });

  describe('getEngagementMetrics', () => {
    it('should return detailed engagement metrics', async () => {
      const workspaceId = 'workspace-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock current period
      metricModel.aggregate.mockResolvedValueOnce([
        {
          _id: null,
          totalLikes: 5000,
          totalComments: 1000,
          totalShares: 500,
          totalSaves: 800,
          totalReach: 100000,
        },
      ]);

      // Mock previous period
      metricModel.aggregate.mockResolvedValueOnce([
        {
          _id: null,
          totalLikes: 4500,
          totalComments: 900,
          totalShares: 450,
          totalSaves: 700,
        },
      ]);

      const result = await service.getEngagementMetrics(workspaceId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.totalLikes).toBe(5000);
      expect(result.totalComments).toBe(1000);
      expect(result.totalShares).toBe(500);
      expect(result.totalSaves).toBe(800);
      expect(result.totalEngagement).toBe(7300);
      expect(result.likesGrowth).toBe(500);
      expect(result.commentsGrowth).toBe(100);
    });
  });

  describe('getFollowerGrowth', () => {
    it('should return follower growth data over time', async () => {
      const workspaceId = 'workspace-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      metricModel.aggregate.mockResolvedValueOnce([
        { _id: '2024-01-01', followers: 14500, firstFollowers: 14500 },
        { _id: '2024-01-02', followers: 14600, firstFollowers: 14500 },
        { _id: '2024-01-03', followers: 14750, firstFollowers: 14600 },
      ]);

      const result = await service.getFollowerGrowth(workspaceId, startDate, endDate, 'daily');

      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].followers).toBe(14500);
      expect(result[0].growth).toBe(0);
      expect(result[1].growth).toBe(100);
      expect(result[2].growth).toBe(150);
    });
  });

  describe('getPlatformBreakdown', () => {
    it('should return analytics segmented by platform', async () => {
      const workspaceId = 'workspace-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      metricModel.aggregate.mockResolvedValueOnce([
        {
          _id: 'instagram',
          totalLikes: 3000,
          totalComments: 600,
          totalShares: 300,
          totalSaves: 500,
          totalReach: 60000,
          totalImpressions: 80000,
          latestFollowers: 8000,
          postCount: 30,
        },
        {
          _id: 'twitter',
          totalLikes: 2000,
          totalComments: 400,
          totalShares: 200,
          totalSaves: 300,
          totalReach: 40000,
          totalImpressions: 70000,
          latestFollowers: 7000,
          postCount: 20,
        },
      ]);

      const result = await service.getPlatformBreakdown(workspaceId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].platform).toBe('instagram');
      expect(result[0].followers).toBe(8000);
      expect(result[0].engagement).toBe(4400);
      expect(result[0].posts).toBe(30);
      expect(result[1].platform).toBe('twitter');
    });
  });

  describe('getTopPerformingPosts', () => {
    it('should return ranked list of top posts', async () => {
      const workspaceId = 'workspace-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      metricModel.aggregate.mockResolvedValueOnce([
        {
          _id: {
            postId: 'post-1',
            platformPostId: 'platform-post-1',
            platform: 'instagram',
          },
          totalLikes: 1000,
          totalComments: 200,
          totalShares: 100,
          totalSaves: 150,
          totalReach: 20000,
          totalImpressions: 25000,
          latestTimestamp: new Date('2024-01-15'),
          totalEngagement: 1450,
          engagementRate: 7.25,
        },
      ]);

      prismaService.post.findMany.mockResolvedValueOnce([
        {
          id: 'post-1',
          content: { text: 'Amazing post content!' },
          publishedAt: new Date('2024-01-15'),
        },
      ]);

      const result = await service.getTopPerformingPosts(
        workspaceId,
        startDate,
        endDate,
        'engagement',
        10,
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].postId).toBe('post-1');
      expect(result[0].platform).toBe('instagram');
      expect(result[0].totalEngagement).toBe(1450);
      expect(result[0].content).toBe('Amazing post content!');
    });
  });

  describe('getTimeSeriesData', () => {
    it('should return time-series data for charts', async () => {
      const workspaceId = 'workspace-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      metricModel.aggregate.mockResolvedValueOnce([
        {
          _id: '2024-01-01',
          likes: 200,
          comments: 50,
          shares: 25,
          saves: 40,
          reach: 5000,
          impressions: 7000,
          followers: 14500,
        },
        {
          _id: '2024-01-02',
          likes: 250,
          comments: 60,
          shares: 30,
          saves: 50,
          reach: 5500,
          impressions: 7500,
          followers: 14600,
        },
      ]);

      const result = await service.getTimeSeriesData(workspaceId, startDate, endDate, 'daily');

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe('2024-01-01');
      expect(result[0].metrics.likes).toBe(200);
      expect(result[0].metrics.engagement).toBe(315); // 200 + 50 + 25 + 40
      expect(result[1].metrics.engagement).toBe(390); // 250 + 60 + 30 + 50
    });
  });
});
