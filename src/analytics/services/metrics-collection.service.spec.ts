import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MetricsCollectionService } from './metrics-collection.service';
import { Metric } from '../schemas/metric.schema';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsFetcherFactory } from '../fetchers/metrics-fetcher.factory';

describe('MetricsCollectionService', () => {
  let service: MetricsCollectionService;
  let prismaService: PrismaService;
  let metricModel: any;
  let fetcherFactory: MetricsFetcherFactory;

  beforeEach(async () => {
    const mockMetricModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockPrismaService = {
      workspace: {
        findMany: jest.fn(),
      },
      socialAccount: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      platformPost: {
        findMany: jest.fn(),
      },
    };

    const mockFetcherFactory = {
      getFetcher: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsCollectionService,
        {
          provide: getModelToken(Metric.name),
          useValue: mockMetricModel,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MetricsFetcherFactory,
          useValue: mockFetcherFactory,
        },
      ],
    }).compile();

    service = module.get<MetricsCollectionService>(MetricsCollectionService);
    prismaService = module.get<PrismaService>(PrismaService);
    metricModel = module.get(getModelToken(Metric.name));
    fetcherFactory = module.get<MetricsFetcherFactory>(MetricsFetcherFactory);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('collectWorkspaceMetrics', () => {
    it('should collect metrics for all active accounts in a workspace', async () => {
      const workspaceId = 'workspace-1';
      const mockAccounts = [
        {
          id: 'account-1',
          platform: 'INSTAGRAM',
          isActive: true,
          accessToken: 'token-1',
          platformAccountId: 'platform-1',
        },
      ];

      jest.spyOn(prismaService.socialAccount, 'findMany').mockResolvedValue(mockAccounts as any);

      const mockFetcher = {
        fetchAccountMetrics: jest.fn().mockResolvedValue({
          accountId: 'platform-1',
          timestamp: new Date(),
          followers: 1000,
          following: 500,
        }),
        fetchBatchPostMetrics: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(fetcherFactory, 'getFetcher').mockReturnValue(mockFetcher as any);
      jest.spyOn(prismaService.platformPost, 'findMany').mockResolvedValue([]);

      await service.collectWorkspaceMetrics(workspaceId);

      expect(prismaService.socialAccount.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId,
          isActive: true,
        },
      });
    });
  });

  describe('collectAllWorkspacesMetrics', () => {
    it('should collect metrics for all workspaces', async () => {
      const mockWorkspaces = [
        { id: 'workspace-1' },
        { id: 'workspace-2' },
      ];

      jest.spyOn(prismaService.workspace, 'findMany').mockResolvedValue(mockWorkspaces as any);
      jest.spyOn(prismaService.socialAccount, 'findMany').mockResolvedValue([]);

      await service.collectAllWorkspacesMetrics();

      expect(prismaService.workspace.findMany).toHaveBeenCalled();
    });
  });
});
