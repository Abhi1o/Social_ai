import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AnalyticsModule } from './analytics.module';
import { PrismaService } from '../prisma/prisma.service';
import { getModelToken } from '@nestjs/mongoose';
import { Metric } from './schemas/metric.schema';
import { AggregatedMetric } from './schemas/aggregated-metric.schema';
import { AudienceDemographic } from './schemas/audience-demographic.schema';

describe('Post Performance Analytics Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const mockMetricModel = {
    aggregate: jest.fn(),
    find: jest.fn(),
  };

  const mockAggregatedMetricModel = {
    aggregate: jest.fn(),
  };

  const mockAudienceDemographicModel = {
    aggregate: jest.fn(),
    find: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AnalyticsModule],
    })
      .overrideProvider(getModelToken(Metric.name))
      .useValue(mockMetricModel)
      .overrideProvider(getModelToken(AggregatedMetric.name))
      .useValue(mockAggregatedMetricModel)
      .overrideProvider(getModelToken(AudienceDemographic.name))
      .useValue(mockAudienceDemographicModel)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /analytics/posts/:postId/metrics', () => {
    it('should return individual post metrics', async () => {
      const postId = 'test-post-id';
      const mockPost = {
        id: postId,
        content: { text: 'Test post content' },
        publishedAt: new Date('2024-01-01'),
        platformPosts: [
          {
            platformPostId: 'platform-123',
            platform: 'INSTAGRAM',
          },
        ],
      };

      const mockMetrics = [
        {
          _id: {
            postId,
            platformPostId: 'platform-123',
            platform: 'INSTAGRAM',
          },
          totalLikes: 100,
          totalComments: 20,
          totalShares: 10,
          totalSaves: 5,
          totalReach: 1000,
          totalImpressions: 1500,
        },
      ];

      jest.spyOn(prismaService.post, 'findUnique').mockResolvedValue(mockPost as any);
      mockMetricModel.aggregate.mockResolvedValue(mockMetrics);

      const response = await request(app.getHttpServer())
        .get(`/analytics/posts/${postId}/metrics`)
        .expect(200);

      expect(response.body).toHaveProperty('postId', postId);
      expect(response.body).toHaveProperty('totalEngagement', 135);
      expect(response.body).toHaveProperty('engagementRate');
      expect(response.body.engagementRate).toBeGreaterThan(0);
    });
  });

  describe('GET /analytics/posts/:postId/engagement-rate', () => {
    it('should calculate and return engagement rate', async () => {
      const postId = 'test-post-id';
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

      const response = await request(app.getHttpServer())
        .get(`/analytics/posts/${postId}/engagement-rate`)
        .expect(200);

      expect(response.body).toHaveProperty('postId', postId);
      expect(response.body).toHaveProperty('engagementRate', 13.5);
      expect(response.body).toHaveProperty('totalEngagement', 135);
      expect(response.body).toHaveProperty('breakdown');
      expect(response.body.breakdown).toHaveProperty('likes', 100);
      expect(response.body.breakdown).toHaveProperty('comments', 20);
    });
  });

  describe('GET /analytics/posts/compare', () => {
    it('should compare two posts', async () => {
      const postId1 = 'post-1';
      const postId2 = 'post-2';

      const mockPost1 = {
        id: postId1,
        content: { text: 'Post 1' },
        publishedAt: new Date('2024-01-01'),
        platformPosts: [{ platformPostId: 'platform-1', platform: 'INSTAGRAM' }],
      };

      const mockPost2 = {
        id: postId2,
        content: { text: 'Post 2' },
        publishedAt: new Date('2024-01-02'),
        platformPosts: [{ platformPostId: 'platform-2', platform: 'INSTAGRAM' }],
      };

      const mockMetrics1 = [
        {
          _id: { postId: postId1, platformPostId: 'platform-1', platform: 'INSTAGRAM' },
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
          _id: { postId: postId2, platformPostId: 'platform-2', platform: 'INSTAGRAM' },
          totalLikes: 80,
          totalComments: 15,
          totalShares: 8,
          totalSaves: 3,
          totalReach: 800,
          totalImpressions: 1200,
        },
      ];

      jest
        .spyOn(prismaService.post, 'findUnique')
        .mockResolvedValueOnce(mockPost1 as any)
        .mockResolvedValueOnce(mockPost2 as any);

      mockMetricModel.aggregate
        .mockResolvedValueOnce(mockMetrics1)
        .mockResolvedValueOnce(mockMetrics2);

      const response = await request(app.getHttpServer())
        .get(`/analytics/posts/compare?postId1=${postId1}&postId2=${postId2}`)
        .expect(200);

      expect(response.body).toHaveProperty('post1');
      expect(response.body).toHaveProperty('post2');
      expect(response.body).toHaveProperty('comparison');
      expect(response.body.comparison).toHaveProperty('engagementDiff');
      expect(response.body.comparison).toHaveProperty('likesDiff', 20);
    });
  });

  describe('GET /analytics/posts/content-type-performance', () => {
    it('should analyze content type performance', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          content: { text: 'Image post', media: [{ type: 'image' }] },
        },
        {
          id: 'post-2',
          content: { text: 'Video post', media: [{ type: 'video' }] },
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
          totalImpressions: 1500,
          totalEngagement: 135,
          engagementRate: 13.5,
        },
      ];

      jest.spyOn(prismaService.post, 'findMany').mockResolvedValue(mockPosts as any);
      mockMetricModel.aggregate.mockResolvedValue(mockMetrics);

      const response = await request(app.getHttpServer())
        .get('/analytics/posts/content-type-performance')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('contentType');
        expect(response.body[0]).toHaveProperty('postCount');
        expect(response.body[0]).toHaveProperty('avgEngagement');
        expect(response.body[0]).toHaveProperty('avgEngagementRate');
      }
    });
  });

  describe('GET /analytics/posts/best-time-to-post', () => {
    it('should analyze best time to post', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          publishedAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'post-2',
          publishedAt: new Date('2024-01-02T10:00:00Z'),
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
      ];

      jest.spyOn(prismaService.post, 'findMany').mockResolvedValue(mockPosts as any);
      mockMetricModel.aggregate.mockResolvedValue(mockMetrics);

      const response = await request(app.getHttpServer())
        .get('/analytics/posts/best-time-to-post')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('dayOfWeek');
        expect(response.body[0]).toHaveProperty('hour');
        expect(response.body[0]).toHaveProperty('avgEngagement');
        expect(response.body[0]).toHaveProperty('confidence');
      }
    });
  });

  describe('GET /analytics/posts/:postId/timeline', () => {
    it('should return post performance timeline', async () => {
      const postId = 'test-post-id';
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
      ];

      mockMetricModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMetrics),
        }),
      });

      const response = await request(app.getHttpServer())
        .get(`/analytics/posts/${postId}/timeline`)
        .expect(200);

      expect(response.body).toHaveProperty('postId', postId);
      expect(response.body).toHaveProperty('timeline');
      expect(Array.isArray(response.body.timeline)).toBe(true);
      expect(response.body).toHaveProperty('engagementVelocity');
      
      if (response.body.timeline.length > 0) {
        expect(response.body.timeline[0]).toHaveProperty('timestamp');
        expect(response.body.timeline[0]).toHaveProperty('engagement');
        expect(response.body.timeline[0]).toHaveProperty('engagementRate');
      }
    });
  });
});
