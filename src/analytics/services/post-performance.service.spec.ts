import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PostPerformanceService } from './post-performance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Metric } from '../schemas/metric.schema';

describe('PostPerformanceService', () => {
  let service: PostPerformanceService;
  let metricModel: any;
  let prismaService: any;

  const mockMetricModel = {
    aggregate: jest.fn(),
    find: jest.fn(),
  };

  const mockPrismaService = {
    post: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostPerformanceService,
        {
          provide: getModelToken(Metric.name),
          useValue: mockMetricModel,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PostPerformanceService>(PostPerformanceService);
    metricModel = module.get(getModelToken(Metric.name));
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPostMetrics', () => {
    it('should return post metrics with engagement rate', async () => {
      const postId = 'post-123';
      const mockPost = {
        id: postId,
        content: { text: 'Test post' },
        publishedAt: new Date('2024-01-01'),
        platformPosts: [{ platformPostId: 'platform-123', platform: 'instagram' }],
      };

      const mockMetrics = [
        {
          _id: {
            postId,
            platformPostId: 'platform-123',
            platform: 'instagram',
          },
          totalLikes: 100,
          totalComments: 20,
          totalShares: 10,
          totalSaves: 5,
          totalReach: 1000,
          totalImpressions: 1500,
          totalClicks: 50,
        },
      ];

      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockMetricModel.aggregate.mockResolvedValue(mockMetrics);

      const result = await service.getPostMetrics(postId);

      expect(result).toEqual({
        postId,
        platformPostId: 'platform-123',
        platform: 'instagram',
        content: 'Test post',
        publishedAt: mockPost.publishedAt,
        likes: 100,
        comments: 20,
        shares: 10,
        saves: 5,
        totalEngagement: 135,
        reach: 1000,
        impressions: 1500,
        engagementRate: 13.5,
        clickThroughRate: 3.33,
      });
    });

    it('should return zero metrics when no data available', async () => {
      const postId = 'post-123';
      const mockPost = {
        id: postId,
        content: { text: 'Test post' },
        publishedAt: new Date('2024-01-01'),
        platformPosts: [{ platformPostId: 'platform-123', platform: 'instagram' }],
      };

      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockMetricModel.aggregate.mockResolvedValue([]);

      const result = await service.getPostMetrics(postId);

      expect(result.totalEngagement).toBe(0);
      expect(result.engagementRate).toBe(0);
    });
  });

  describe('calculateEngagementRate', () => {
    it('should calculate engagement rate correctly', async () => {
      const postId = 'post-123';
      const mockMetrics = [
        {
          _id: postId,
          totalLikes: 100,
          totalComments: 20,
          totalShares: 10,
          totalSaves: 5,
          totalReach: 1000,
        },
      ];

      mockMetricModel.aggregate.mockResolvedValue(mockMetrics);

      const result = await service.calculateEngagementRate(postId);

      expect(result).toEqual({
        postId,
        engagementRate: 13.5,
        reach: 1000,
        totalEngagement: 135,
        breakdown: {
          likes: 100,
          comments: 20,
          shares: 10,
          saves: 5,
        },
      });
    });

    it('should return zero when no metrics available', async () => {
      const postId = 'post-123';
      mockMetricModel.aggregate.mockResolvedValue([]);

      const result = await service.calculateEngagementRate(postId);

      expect(result.engagementRate).toBe(0);
      expect(result.totalEngagement).toBe(0);
    });
  });

  describe('comparePosts', () => {
    it('should compare two posts and return differences', async () => {
      const postId1 = 'post-1';
      const postId2 = 'post-2';

      const mockPost1 = {
        id: postId1,
        content: { text: 'Post 1' },
        publishedAt: new Date('2024-01-01'),
        platformPosts: [{ platformPostId: 'platform-1', platform: 'instagram' }],
      };

      const mockPost2 = {
        id: postId2,
        content: { text: 'Post 2' },
        publishedAt: new Date('2024-01-02'),
        platformPosts: [{ platformPostId: 'platform-2', platform: 'instagram' }],
      };

      const mockMetrics1 = [
        {
          _id: { postId: postId1, platformPostId: 'platform-1', platform: 'instagram' },
          totalLikes: 100,
          totalComments: 20,
          totalShares: 10,
          totalSaves: 5,
          totalReach: 1000,
          totalImpressions: 1500,
        },
      ];

      const mockMetrics2 = [
        {
          _id: { postId: postId2, platformPostId: 'platform-2', platform: 'instagram' },
          totalLikes: 80,
          totalComments: 15,
          totalShares: 8,
          totalSaves: 3,
          totalReach: 800,
          totalImpressions: 1200,
        },
      ];

      mockPrismaService.post.findUnique
        .mockResolvedValueOnce(mockPost1)
        .mockResolvedValueOnce(mockPost2);

      mockMetricModel.aggregate
        .mockResolvedValueOnce(mockMetrics1)
        .mockResolvedValueOnce(mockMetrics2);

      const result = await service.comparePosts(postId1, postId2);

      expect(result.comparison.engagementDiff).toBe(29); // 135 - 106
      expect(result.comparison.likesDiff).toBe(20);
      expect(result.comparison.commentsDiff).toBe(5);
    });
  });

  describe('analyzeContentTypePerformance', () => {
    it('should analyze performance by content type', async () => {
      const workspaceId = 'workspace-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockPosts = [
        {
          id: 'post-1',
          content: { text: 'Text post', media: [{ type: 'image' }] },
        },
        {
          id: 'post-2',
          content: { text: 'Video post', media: [{ type: 'video' }] },
        },
        {
          id: 'post-3',
          content: { text: 'Another image', media: [{ type: 'image' }] },
        },
      ];

      const mockImageMetrics = [
        {
          _id: 'post-1',
          totalLikes: 100,
          totalComments: 20,
          totalShares: 10,
          totalSaves: 5,
          totalReach: 1000,
          totalImpressions: 1500,
          totalEngagement: 135,
          engagementRate: 13.5,
        },
        {
          _id: 'post-3',
          totalLikes: 80,
          totalComments: 15,
          totalShares: 8,
          totalSaves: 3,
          totalReach: 800,
          totalImpressions: 1200,
          totalEngagement: 106,
          engagementRate: 13.25,
        },
      ];

      const mockVideoMetrics = [
        {
          _id: 'post-2',
          totalLikes: 150,
          totalComments: 30,
          totalShares: 15,
          totalSaves: 8,
          totalReach: 1500,
          totalImpressions: 2000,
          totalEngagement: 203,
          engagementRate: 13.53,
        },
      ];

      mockPrismaService.post.findMany.mockResolvedValue(mockPosts);
      mockMetricModel.aggregate
        .mockResolvedValueOnce(mockImageMetrics)
        .mockResolvedValueOnce(mockVideoMetrics);

      const result = await service.analyzeContentTypePerformance(
        workspaceId,
        startDate,
        endDate,
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('contentType');
      expect(result[0]).toHaveProperty('postCount');
      expect(result[0]).toHaveProperty('avgEngagement');
      expect(result[0].avgEngagement).toBeGreaterThan(0);
    });
  });

  describe('analyzeBestTimeToPost', () => {
    it('should analyze best posting times', async () => {
      const workspaceId = 'workspace-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockPosts = [
        {
          id: 'post-1',
          publishedAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'post-2',
          publishedAt: new Date('2024-01-02T10:00:00Z'),
        },
        {
          id: 'post-3',
          publishedAt: new Date('2024-01-03T14:00:00Z'),
        },
      ];

      const mockMetrics = [
        {
          _id: 'post-1',
          totalLikes: 100,
          totalComments: 20,
          totalShares: 10,
          totalSaves: 5,
          totalReach: 1000,
        },
        {
          _id: 'post-2',
          totalLikes: 120,
          totalComments: 25,
          totalShares: 12,
          totalSaves: 6,
          totalReach: 1200,
        },
        {
          _id: 'post-3',
          totalLikes: 80,
          totalComments: 15,
          totalShares: 8,
          totalSaves: 3,
          totalReach: 800,
        },
      ];

      mockPrismaService.post.findMany.mockResolvedValue(mockPosts);
      mockMetricModel.aggregate.mockResolvedValue(mockMetrics);

      const result = await service.analyzeBestTimeToPost(
        workspaceId,
        startDate,
        endDate,
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('dayOfWeek');
      expect(result[0]).toHaveProperty('hour');
      expect(result[0]).toHaveProperty('avgEngagement');
      expect(result[0]).toHaveProperty('confidence');
    });
  });

  describe('getPostPerformanceTimeline', () => {
    it('should return performance timeline with velocity', async () => {
      const postId = 'post-123';
      const mockMetrics = [
        {
          timestamp: new Date('2024-01-01T10:00:00Z'),
          metrics: {
            likes: 10,
            comments: 2,
            shares: 1,
            saves: 0,
            reach: 100,
            impressions: 150,
          },
        },
        {
          timestamp: new Date('2024-01-01T11:00:00Z'),
          metrics: {
            likes: 50,
            comments: 10,
            shares: 5,
            saves: 2,
            reach: 500,
            impressions: 750,
          },
        },
        {
          timestamp: new Date('2024-01-01T12:00:00Z'),
          metrics: {
            likes: 100,
            comments: 20,
            shares: 10,
            saves: 5,
            reach: 1000,
            impressions: 1500,
          },
        },
      ];

      mockMetricModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMetrics),
        }),
      });

      const result = await service.getPostPerformanceTimeline(postId);

      expect(result.postId).toBe(postId);
      expect(result.timeline).toHaveLength(3);
      expect(result.timeline[0].engagement).toBe(13);
      expect(result.timeline[2].engagement).toBe(135);
      expect(result.engagementVelocity).toBeGreaterThan(0);
      expect(result.peakEngagementTime).toBeDefined();
    });

    it('should return empty timeline when no metrics available', async () => {
      const postId = 'post-123';

      mockMetricModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getPostPerformanceTimeline(postId);

      expect(result.timeline).toHaveLength(0);
      expect(result.engagementVelocity).toBe(0);
    });
  });
});
