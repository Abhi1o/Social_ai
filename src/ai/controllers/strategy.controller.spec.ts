import { Test, TestingModule } from '@nestjs/testing';
import { StrategyController } from './strategy.controller';
import { StrategyAgent } from '../agents/strategy.agent';

describe('StrategyController', () => {
  let controller: StrategyController;
  let strategyAgent: StrategyAgent;

  const mockStrategyAgent = {
    analyzePerformance: jest.fn(),
    fetchPerformanceMetrics: jest.fn(),
    recommendContentThemes: jest.fn(),
    analyzeOptimalPostingTimes: jest.fn(),
    generateMonthlyCalendar: jest.fn(),
    detectEngagementPatterns: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StrategyController],
      providers: [
        {
          provide: StrategyAgent,
          useValue: mockStrategyAgent,
        },
      ],
    }).compile();

    controller = module.get<StrategyController>(StrategyController);
    strategyAgent = module.get<StrategyAgent>(StrategyAgent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('should return comprehensive strategy recommendations', async () => {
      const mockRecommendations = {
        performanceAnalysis: {
          summary: 'Good performance',
          strengths: ['Consistent posting'],
          weaknesses: ['Limited variety'],
          opportunities: ['Expand platforms'],
        },
        contentThemes: [],
        optimalPostingTimes: [],
        monthlyCalendar: {
          month: 'February',
          weeklyThemes: [],
          keyDates: [],
          contentMix: {
            promotional: 20,
            educational: 40,
            entertaining: 30,
            userGenerated: 10,
            reasoning: 'Balanced',
          },
          overallStrategy: 'Focus on value',
        },
        audiencePatterns: [],
        actionableInsights: [],
        predictedImpact: '25% increase',
      };

      mockStrategyAgent.analyzePerformance.mockResolvedValue(mockRecommendations);

      const req = {
        user: {
          workspaceId: 'workspace-1',
        },
      };

      const body = {
        startDate: '2024-01-01',
        endDate: '2024-03-31',
      };

      const result = await controller.getRecommendations(body, req);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecommendations);
      expect(mockStrategyAgent.analyzePerformance).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        platforms: undefined,
        accountIds: undefined,
      });
    });

    it('should handle platform and account filters', async () => {
      const mockRecommendations = {
        performanceAnalysis: {
          summary: 'Good performance',
          strengths: [],
          weaknesses: [],
          opportunities: [],
        },
        contentThemes: [],
        optimalPostingTimes: [],
        monthlyCalendar: {
          month: 'February',
          weeklyThemes: [],
          keyDates: [],
          contentMix: {
            promotional: 20,
            educational: 40,
            entertaining: 30,
            userGenerated: 10,
            reasoning: 'Balanced',
          },
          overallStrategy: 'Focus',
        },
        audiencePatterns: [],
        actionableInsights: [],
        predictedImpact: '25%',
      };

      mockStrategyAgent.analyzePerformance.mockResolvedValue(mockRecommendations);

      const req = {
        user: {
          workspaceId: 'workspace-1',
        },
      };

      const body = {
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        platforms: ['instagram', 'twitter'],
        accountIds: ['account-1'],
      };

      const result = await controller.getRecommendations(body, req);

      expect(result.success).toBe(true);
      expect(mockStrategyAgent.analyzePerformance).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        platforms: ['instagram', 'twitter'],
        accountIds: ['account-1'],
      });
    });
  });

  describe('getContentThemes', () => {
    it('should return content theme recommendations', async () => {
      const mockPerformanceData = {
        totalPosts: 10,
        totalEngagement: 5000,
        averageEngagementRate: 5.0,
        totalReach: 100000,
        totalImpressions: 150000,
        followerGrowth: 100,
        topPerformingPosts: [],
        platformBreakdown: [],
        hourlyEngagement: [],
        dailyEngagement: [],
        contentTypePerformance: [],
      };

      const mockThemes = [
        {
          theme: 'Educational',
          reasoning: 'High engagement',
          suggestedFrequency: '2-3 times per week',
          targetAudience: 'Professionals',
          expectedPerformance: 'High',
          examples: ['Tips', 'Guides'],
        },
      ];

      mockStrategyAgent.fetchPerformanceMetrics.mockResolvedValue(mockPerformanceData);
      mockStrategyAgent.recommendContentThemes.mockResolvedValue(mockThemes);

      const req = {
        user: {
          workspaceId: 'workspace-1',
        },
      };

      const result = await controller.getContentThemes(
        '2024-01-01',
        '2024-03-31',
        req,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockThemes);
    });
  });

  describe('getOptimalTimes', () => {
    it('should return optimal posting times', async () => {
      const mockPerformanceData = {
        totalPosts: 10,
        totalEngagement: 5000,
        averageEngagementRate: 5.0,
        totalReach: 100000,
        totalImpressions: 150000,
        followerGrowth: 100,
        topPerformingPosts: [],
        platformBreakdown: [],
        hourlyEngagement: [],
        dailyEngagement: [],
        contentTypePerformance: [],
      };

      const mockOptimalTimes = [
        {
          dayOfWeek: 'Monday',
          hour: 14,
          timezone: 'UTC',
          expectedEngagement: 850,
          confidence: 0.85,
          reasoning: 'Strong historical performance',
        },
      ];

      mockStrategyAgent.fetchPerformanceMetrics.mockResolvedValue(mockPerformanceData);
      mockStrategyAgent.analyzeOptimalPostingTimes.mockResolvedValue(mockOptimalTimes);

      const req = {
        user: {
          workspaceId: 'workspace-1',
        },
      };

      const result = await controller.getOptimalTimes(
        '2024-01-01',
        '2024-03-31',
        req,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOptimalTimes);
    });
  });

  describe('getMonthlyCalendar', () => {
    it('should return monthly calendar themes', async () => {
      const mockPerformanceData = {
        totalPosts: 10,
        totalEngagement: 5000,
        averageEngagementRate: 5.0,
        totalReach: 100000,
        totalImpressions: 150000,
        followerGrowth: 100,
        topPerformingPosts: [],
        platformBreakdown: [],
        hourlyEngagement: [],
        dailyEngagement: [],
        contentTypePerformance: [],
      };

      const mockCalendar = {
        month: 'February',
        weeklyThemes: [
          {
            week: 1,
            theme: 'Educational',
            contentIdeas: ['Tips', 'Guides'],
            platforms: ['instagram'],
          },
        ],
        keyDates: [],
        contentMix: {
          promotional: 20,
          educational: 40,
          entertaining: 30,
          userGenerated: 10,
          reasoning: 'Balanced approach',
        },
        overallStrategy: 'Focus on value',
      };

      mockStrategyAgent.fetchPerformanceMetrics.mockResolvedValue(mockPerformanceData);
      mockStrategyAgent.generateMonthlyCalendar.mockResolvedValue(mockCalendar);

      const req = {
        user: {
          workspaceId: 'workspace-1',
        },
      };

      const result = await controller.getMonthlyCalendar(
        '2024-01-01',
        '2024-03-31',
        req,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCalendar);
    });
  });

  describe('getEngagementPatterns', () => {
    it('should return audience engagement patterns', async () => {
      const mockPerformanceData = {
        totalPosts: 10,
        totalEngagement: 5000,
        averageEngagementRate: 5.0,
        totalReach: 100000,
        totalImpressions: 150000,
        followerGrowth: 100,
        topPerformingPosts: [],
        platformBreakdown: [],
        hourlyEngagement: [],
        dailyEngagement: [],
        contentTypePerformance: [],
      };

      const mockPatterns = [
        {
          pattern: 'Peak Hours',
          description: 'Most active at 2pm',
          recommendation: 'Post during peak hours',
          impact: 'high' as const,
        },
      ];

      mockStrategyAgent.fetchPerformanceMetrics.mockResolvedValue(mockPerformanceData);
      mockStrategyAgent.detectEngagementPatterns.mockResolvedValue(mockPatterns);

      const req = {
        user: {
          workspaceId: 'workspace-1',
        },
      };

      const result = await controller.getEngagementPatterns(
        '2024-01-01',
        '2024-03-31',
        req,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPatterns);
    });
  });
});
