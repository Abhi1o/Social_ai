import { Test, TestingModule } from '@nestjs/testing';
import { CompetitiveBenchmarkingService } from './competitive-benchmarking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getModelToken } from '@nestjs/mongoose';
import { CompetitorMetric } from '../schemas/competitor-metric.schema';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CompetitiveBenchmarkingService', () => {
  let service: CompetitiveBenchmarkingService;
  let prismaService: PrismaService;
  let competitorMetricModel: any;

  const mockPrismaService = {
    competitor: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCompetitorMetricModel = {
    create: jest.fn(),
    find: jest.fn(),
    deleteMany: jest.fn(),
    aggregate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitiveBenchmarkingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: getModelToken(CompetitorMetric.name),
          useValue: mockCompetitorMetricModel,
        },
      ],
    }).compile();

    service = module.get<CompetitiveBenchmarkingService>(CompetitiveBenchmarkingService);
    prismaService = module.get<PrismaService>(PrismaService);
    competitorMetricModel = module.get(getModelToken(CompetitorMetric.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCompetitor', () => {
    it('should create a competitor with accounts', async () => {
      const workspaceId = 'ws_123';
      const dto = {
        name: 'Competitor A',
        description: 'Main competitor',
        industry: 'Social Media',
        tags: ['direct-competitor'],
        accounts: [
          {
            platform: 'instagram',
            platformAccountId: '123456',
            username: 'competitor_a',
            displayName: 'Competitor A',
          },
        ],
      };

      const expectedResult = {
        id: 'comp_123',
        workspaceId,
        name: dto.name,
        description: dto.description,
        industry: dto.industry,
        tags: dto.tags,
        accounts: [
          {
            id: 'acc_123',
            competitorId: 'comp_123',
            platform: 'INSTAGRAM',
            platformAccountId: dto.accounts[0].platformAccountId,
            username: dto.accounts[0].username,
            displayName: dto.accounts[0].displayName,
            avatar: undefined,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.competitor.create.mockResolvedValue(expectedResult);

      const result = await service.createCompetitor(workspaceId, dto);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.competitor.create).toHaveBeenCalledWith({
        data: {
          workspaceId,
          name: dto.name,
          description: dto.description,
          industry: dto.industry,
          tags: dto.tags,
          accounts: {
            create: [
              {
                platform: 'INSTAGRAM',
                platformAccountId: dto.accounts[0].platformAccountId,
                username: dto.accounts[0].username,
                displayName: dto.accounts[0].displayName,
                avatar: undefined,
              },
            ],
          },
        },
        include: {
          accounts: true,
        },
      });
    });
  });

  describe('getCompetitors', () => {
    it('should return all active competitors', async () => {
      const workspaceId = 'ws_123';
      const expectedCompetitors = [
        {
          id: 'comp_123',
          workspaceId,
          name: 'Competitor A',
          isActive: true,
          accounts: [],
        },
      ];

      mockPrismaService.competitor.findMany.mockResolvedValue(expectedCompetitors);

      const result = await service.getCompetitors(workspaceId);

      expect(result).toEqual(expectedCompetitors);
      expect(mockPrismaService.competitor.findMany).toHaveBeenCalledWith({
        where: { workspaceId, isActive: true },
        include: { accounts: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should include inactive competitors when requested', async () => {
      const workspaceId = 'ws_123';

      await service.getCompetitors(workspaceId, true);

      expect(mockPrismaService.competitor.findMany).toHaveBeenCalledWith({
        where: { workspaceId },
        include: { accounts: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getCompetitor', () => {
    it('should return a single competitor', async () => {
      const workspaceId = 'ws_123';
      const competitorId = 'comp_123';
      const expectedCompetitor = {
        id: competitorId,
        workspaceId,
        name: 'Competitor A',
        accounts: [],
      };

      mockPrismaService.competitor.findFirst.mockResolvedValue(expectedCompetitor);

      const result = await service.getCompetitor(workspaceId, competitorId);

      expect(result).toEqual(expectedCompetitor);
      expect(mockPrismaService.competitor.findFirst).toHaveBeenCalledWith({
        where: { id: competitorId, workspaceId },
        include: { accounts: true },
      });
    });

    it('should throw NotFoundException if competitor not found', async () => {
      const workspaceId = 'ws_123';
      const competitorId = 'comp_999';

      mockPrismaService.competitor.findFirst.mockResolvedValue(null);

      await expect(
        service.getCompetitor(workspaceId, competitorId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCompetitor', () => {
    it('should update a competitor', async () => {
      const workspaceId = 'ws_123';
      const competitorId = 'comp_123';
      const dto = { name: 'Updated Name', isActive: false };

      const existingCompetitor = {
        id: competitorId,
        workspaceId,
        name: 'Old Name',
        accounts: [],
      };

      const updatedCompetitor = {
        ...existingCompetitor,
        ...dto,
      };

      mockPrismaService.competitor.findFirst.mockResolvedValue(existingCompetitor);
      mockPrismaService.competitor.update.mockResolvedValue(updatedCompetitor);

      const result = await service.updateCompetitor(workspaceId, competitorId, dto);

      expect(result).toEqual(updatedCompetitor);
      expect(mockPrismaService.competitor.update).toHaveBeenCalledWith({
        where: { id: competitorId },
        data: dto,
        include: { accounts: true },
      });
    });
  });

  describe('deleteCompetitor', () => {
    it('should delete a competitor and its metrics', async () => {
      const workspaceId = 'ws_123';
      const competitorId = 'comp_123';

      const existingCompetitor = {
        id: competitorId,
        workspaceId,
        name: 'Competitor A',
        accounts: [],
      };

      mockPrismaService.competitor.findFirst.mockResolvedValue(existingCompetitor);
      mockPrismaService.competitor.delete.mockResolvedValue(existingCompetitor);
      mockCompetitorMetricModel.deleteMany.mockResolvedValue({ deletedCount: 10 });

      const result = await service.deleteCompetitor(workspaceId, competitorId);

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.competitor.delete).toHaveBeenCalledWith({
        where: { id: competitorId },
      });
      expect(mockCompetitorMetricModel.deleteMany).toHaveBeenCalledWith({
        competitorId,
      });
    });
  });

  describe('storeCompetitorMetrics', () => {
    it('should store competitor metrics', async () => {
      const workspaceId = 'ws_123';
      const competitorId = 'comp_123';
      const competitorAccountId = 'acc_123';
      const platform = 'instagram';
      const metrics = {
        followers: 10000,
        engagementRate: 3.5,
        totalPosts: 100,
      };

      const expectedMetric = {
        _id: 'metric_123',
        workspaceId,
        competitorId,
        competitorAccountId,
        platform,
        timestamp: expect.any(Date),
        ...metrics,
      };

      mockCompetitorMetricModel.create.mockResolvedValue(expectedMetric);

      const result = await service.storeCompetitorMetrics(
        workspaceId,
        competitorId,
        competitorAccountId,
        platform,
        metrics,
      );

      expect(result).toEqual(expectedMetric);
      expect(mockCompetitorMetricModel.create).toHaveBeenCalledWith({
        workspaceId,
        competitorId,
        competitorAccountId,
        platform,
        timestamp: expect.any(Date),
        ...metrics,
      });
    });
  });

  describe('getCompetitiveBenchmark', () => {
    it('should return competitive benchmark data', async () => {
      const workspaceId = 'ws_123';
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockCompetitors = [
        {
          id: 'comp_123',
          name: 'Competitor A',
          accounts: [
            {
              id: 'acc_123',
              platform: 'INSTAGRAM',
            },
          ],
        },
      ];

      mockPrismaService.competitor.findMany.mockResolvedValue(mockCompetitors);
      mockCompetitorMetricModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              followers: 15000,
              engagementRate: 4.2,
              totalPosts: 120,
              postingFrequency: 4.0,
            },
          ]),
        }),
      });

      const result = await service.getCompetitiveBenchmark(workspaceId, query);

      expect(result).toHaveProperty('workspace');
      expect(result).toHaveProperty('competitors');
      expect(result).toHaveProperty('rankings');
      expect(result).toHaveProperty('insights');
      expect(Array.isArray(result.insights)).toBe(true);
    });
  });

  describe('getShareOfVoice', () => {
    it('should calculate share of voice', async () => {
      const workspaceId = 'ws_123';
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockCompetitors = [
        {
          id: 'comp_123',
          name: 'Competitor A',
        },
      ];

      mockPrismaService.competitor.findMany.mockResolvedValue(mockCompetitors);
      mockCompetitorMetricModel.aggregate.mockResolvedValue([
        {
          _id: null,
          mentions: 2000,
          engagement: 10000,
          reach: 100000,
        },
      ]);

      const result = await service.getShareOfVoice(workspaceId, query);

      expect(result).toHaveProperty('totalMentions');
      expect(result).toHaveProperty('totalEngagement');
      expect(result).toHaveProperty('totalReach');
      expect(result).toHaveProperty('breakdown');
      expect(Array.isArray(result.breakdown)).toBe(true);
      expect(result.breakdown.length).toBeGreaterThan(0);
    });
  });

  describe('getIndustryBenchmarks', () => {
    it('should return industry benchmarks', async () => {
      const workspaceId = 'ws_123';
      const query = {
        industry: 'Social Media Marketing',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockCompetitors = [
        {
          id: 'comp_123',
          name: 'Competitor A',
          industry: 'Social Media Marketing',
          accounts: [
            {
              id: 'acc_123',
              platform: 'INSTAGRAM',
            },
          ],
        },
      ];

      mockPrismaService.competitor.findMany.mockResolvedValue(mockCompetitors);
      mockCompetitorMetricModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              followers: 15000,
              engagementRate: 4.2,
              postingFrequency: 4.0,
            },
          ]),
        }),
      });

      const result = await service.getIndustryBenchmarks(workspaceId, query);

      expect(result).toHaveProperty('industry');
      expect(result).toHaveProperty('benchmarks');
      expect(result).toHaveProperty('workspaceComparison');
      expect(result.industry).toBe(query.industry);
    });

    it('should throw BadRequestException if no competitors in industry', async () => {
      const workspaceId = 'ws_123';
      const query = {
        industry: 'Unknown Industry',
      };

      mockPrismaService.competitor.findMany.mockResolvedValue([]);

      await expect(
        service.getIndustryBenchmarks(workspaceId, query),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCompetitorActivity', () => {
    it('should return competitor activity data', async () => {
      const workspaceId = 'ws_123';
      const query = {
        competitorId: 'comp_123',
        platform: 'instagram',
        limit: 30,
      };

      const mockCompetitor = {
        id: 'comp_123',
        name: 'Competitor A',
        accounts: [],
      };

      mockPrismaService.competitor.findFirst.mockResolvedValue(mockCompetitor);
      mockCompetitorMetricModel.aggregate.mockResolvedValue([
        {
          _id: { date: '2024-01-01', platform: 'instagram' },
          posts: 3,
          totalLikes: 1500,
          totalComments: 120,
          totalShares: 45,
          engagementRate: 4.2,
          topHashtags: [['#marketing', '#socialmedia']],
        },
      ]);

      const result = await service.getCompetitorActivity(workspaceId, query);

      expect(result).toHaveProperty('competitorId');
      expect(result).toHaveProperty('competitorName');
      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('activities');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray(result.activities)).toBe(true);
    });
  });
});
