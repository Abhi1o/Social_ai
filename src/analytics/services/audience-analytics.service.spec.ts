import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AudienceAnalyticsService } from './audience-analytics.service';
import { AudienceDemographic } from '../schemas/audience-demographic.schema';
import { PrismaService } from '../../prisma/prisma.service';

describe('AudienceAnalyticsService', () => {
  let service: AudienceAnalyticsService;
  let audienceDemographicModel: Model<AudienceDemographic>;
  let prismaService: PrismaService;

  const mockAudienceDemographicModel = {
    find: jest.fn(),
    aggregate: jest.fn(),
    save: jest.fn(),
  };

  const mockPrismaService = {
    post: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudienceAnalyticsService,
        {
          provide: getModelToken(AudienceDemographic.name),
          useValue: mockAudienceDemographicModel,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AudienceAnalyticsService>(AudienceAnalyticsService);
    audienceDemographicModel = module.get<Model<AudienceDemographic>>(
      getModelToken(AudienceDemographic.name),
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDemographicData', () => {
    it('should return demographic data for a workspace', async () => {
      const workspaceId = 'workspace-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockDemographicData = {
        demographics: {
          ageRanges: {
            '18-24': 1000,
            '25-34': 2000,
            '35-44': 1500,
          },
          gender: {
            male: 2500,
            female: 2000,
          },
        },
        audienceMetrics: {
          totalFollowers: 4500,
        },
      };

      mockAudienceDemographicModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockDemographicData]),
          }),
        }),
      });

      const result = await service.getDemographicData(workspaceId, startDate, endDate);

      expect(result).toBeDefined();
      expect(result.totalAudience).toBe(4500);
      expect(result.ageDistribution).toHaveLength(3);
      expect(result.genderDistribution).toHaveLength(2);
    });

    it('should return empty data when no demographics found', async () => {
      const workspaceId = 'workspace-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockAudienceDemographicModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.getDemographicData(workspaceId, startDate, endDate);

      expect(result).toEqual({
        ageDistribution: [],
        genderDistribution: [],
        totalAudience: 0,
      });
    });
  });

  describe('getAudienceSegments', () => {
    it('should return age-based segments', async () => {
      const workspaceId = 'workspace-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockDemographicData = {
        demographics: {
          ageRanges: {
            '18-24': 1000,
            '25-34': 2000,
          },
        },
        audienceMetrics: {
          totalFollowers: 3000,
        },
      };

      mockAudienceDemographicModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockDemographicData]),
          }),
        }),
      });

      const result = await service.getAudienceSegments(
        workspaceId,
        startDate,
        endDate,
        'age',
      );

      expect(result).toHaveLength(2);
      expect(result[0].segmentType).toBe('age');
      expect(result[0].audienceSize).toBeGreaterThan(0);
    });

    it('should return gender-based segments', async () => {
      const workspaceId = 'workspace-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockDemographicData = {
        demographics: {
          gender: {
            male: 1500,
            female: 1500,
          },
        },
        audienceMetrics: {
          totalFollowers: 3000,
        },
      };

      mockAudienceDemographicModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockDemographicData]),
          }),
        }),
      });

      const result = await service.getAudienceSegments(
        workspaceId,
        startDate,
        endDate,
        'gender',
      );

      expect(result).toHaveLength(2);
      expect(result[0].segmentType).toBe('gender');
    });
  });

  describe('getLocationAnalytics', () => {
    it('should return location analytics', async () => {
      const workspaceId = 'workspace-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockDemographicData = {
        demographics: {
          topCountries: [
            { country: 'United States', countryCode: 'US', percentage: 50, count: 1500 },
            { country: 'Canada', countryCode: 'CA', percentage: 30, count: 900 },
          ],
          topCities: [
            { city: 'New York', country: 'US', percentage: 20, count: 600 },
          ],
        },
      };

      mockAudienceDemographicModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockDemographicData]),
          }),
        }),
      });

      const result = await service.getLocationAnalytics(workspaceId, startDate, endDate);

      expect(result.topCountries).toHaveLength(2);
      expect(result.topCities).toHaveLength(1);
      expect(result.totalLocations).toBe(3);
    });
  });

  describe('getInterestBehaviorAnalysis', () => {
    it('should return interest and behavior data', async () => {
      const workspaceId = 'workspace-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockDemographicData = {
        demographics: {
          topInterests: [
            { interest: 'Technology', category: 'Tech', percentage: 40, count: 1200 },
          ],
          deviceTypes: {
            mobile: 2000,
            desktop: 800,
            tablet: 200,
          },
          activeHours: {
            '9': 100,
            '12': 200,
            '18': 300,
          },
          activeDays: {
            monday: 500,
            tuesday: 600,
            wednesday: 550,
          },
        },
      };

      mockAudienceDemographicModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockDemographicData]),
          }),
        }),
      });

      const result = await service.getInterestBehaviorAnalysis(
        workspaceId,
        startDate,
        endDate,
      );

      expect(result.topInterests).toHaveLength(1);
      expect(result.deviceDistribution).toBeDefined();
      expect(result.activeHours).toHaveLength(24);
      expect(result.activeDays).toHaveLength(7);
    });
  });

  describe('getAudienceGrowthTrend', () => {
    it('should return audience growth trend data', async () => {
      const workspaceId = 'workspace-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockGrowthData = [
        {
          _id: '2024-01-01',
          totalFollowers: 1000,
          newFollowers: 50,
          unfollowers: 10,
        },
        {
          _id: '2024-01-02',
          totalFollowers: 1040,
          newFollowers: 60,
          unfollowers: 20,
        },
      ];

      mockAudienceDemographicModel.aggregate.mockResolvedValue(mockGrowthData);

      const result = await service.getAudienceGrowthTrend(
        workspaceId,
        startDate,
        endDate,
        'daily',
      );

      expect(result).toHaveLength(2);
      expect(result[0].totalFollowers).toBe(1000);
      expect(result[0].netGrowth).toBe(40);
      expect(result[1].totalFollowers).toBe(1040);
    });
  });

  describe('getAudienceInsights', () => {
    it('should return audience insights with recommendations', async () => {
      const workspaceId = 'workspace-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockDemographicData = {
        demographics: {
          ageRanges: {
            '25-34': 2000,
          },
          gender: {
            male: 1500,
            female: 500,
          },
          topCountries: [
            { country: 'United States', countryCode: 'US', percentage: 70, count: 1400 },
          ],
        },
        audienceMetrics: {
          totalFollowers: 2000,
        },
      };

      mockAudienceDemographicModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockDemographicData]),
          }),
        }),
      });

      const mockGrowthData = [
        {
          _id: '2024-01-01',
          totalFollowers: 2000,
          newFollowers: 50,
          unfollowers: 10,
        },
      ];

      mockAudienceDemographicModel.aggregate.mockResolvedValue(mockGrowthData);

      const result = await service.getAudienceInsights(
        workspaceId,
        startDate,
        endDate,
      );

      expect(result.summary).toBeDefined();
      expect(result.summary.totalAudience).toBe(2000);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });
});
