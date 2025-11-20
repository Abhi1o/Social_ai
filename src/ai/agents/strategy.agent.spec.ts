import { Test, TestingModule } from '@nestjs/testing';
import { StrategyAgent } from './strategy.agent';
import { AICoordinatorService } from '../services/ai-coordinator.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('StrategyAgent', () => {
  let agent: StrategyAgent;
  let aiCoordinator: AICoordinatorService;
  let prisma: PrismaService;

  const mockAICoordinator = {
    complete: jest.fn(),
  };

  const mockPrisma = {
    post: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StrategyAgent,
        {
          provide: AICoordinatorService,
          useValue: mockAICoordinator,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    agent = module.get<StrategyAgent>(StrategyAgent);
    aiCoordinator = module.get<AICoordinatorService>(AICoordinatorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzePerformance', () => {
    it('should analyze performance and generate recommendations', async () => {
      const mockPosts = [
        {
          id: '1',
          workspaceId: 'workspace-1',
          status: 'PUBLISHED',
          publishedAt: new Date('2024-01-15T14:00:00Z'),
          content: { text: 'Test post about sales' },
          platformPosts: [
            {
              account: {
                platform: 'INSTAGRAM',
              },
            },
          ],
        },
        {
          id: '2',
          workspaceId: 'workspace-1',
          status: 'PUBLISHED',
          publishedAt: new Date('2024-01-16T10:00:00Z'),
          content: { text: 'How to improve your marketing' },
          platformPosts: [
            {
              account: {
                platform: 'TWITTER',
              },
            },
          ],
        },
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);

      const mockAIResponse = {
        content: JSON.stringify({
          performanceAnalysis: {
            summary: 'Good performance overall',
            strengths: ['Consistent posting', 'Good engagement'],
            weaknesses: ['Limited content variety'],
            opportunities: ['Expand to new platforms'],
          },
          contentThemes: [
            {
              theme: 'Educational Content',
              reasoning: 'High engagement on how-to posts',
              suggestedFrequency: '2-3 times per week',
              targetAudience: 'Professionals',
              expectedPerformance: 'High engagement',
              examples: ['Tips', 'Guides'],
            },
          ],
          optimalPostingTimes: [
            {
              dayOfWeek: 'Monday',
              hour: 14,
              timezone: 'UTC',
              expectedEngagement: 850,
              confidence: 0.85,
              reasoning: 'Historical data shows strong engagement',
            },
          ],
          monthlyCalendar: {
            month: 'February',
            weeklyThemes: [],
            keyDates: [],
            contentMix: {
              promotional: 20,
              educational: 40,
              entertaining: 30,
              userGenerated: 10,
              reasoning: 'Balanced approach',
            },
            overallStrategy: 'Focus on value',
          },
          audiencePatterns: [
            {
              pattern: 'Peak Hours',
              description: 'Most active at 2pm',
              recommendation: 'Post during peak hours',
              impact: 'high',
            },
          ],
          actionableInsights: ['Post at 2pm', 'Focus on educational content'],
          predictedImpact: '25-40% increase in engagement',
        }),
        cost: 0.002,
        tokensUsed: { prompt: 100, completion: 200, total: 300 },
        model: 'gpt-4o-mini',
        cached: false,
      };

      mockAICoordinator.complete.mockResolvedValue(mockAIResponse);

      const request = {
        workspaceId: 'workspace-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const result = await agent.analyzePerformance(request);

      expect(result).toBeDefined();
      expect(result.performanceAnalysis).toBeDefined();
      expect(result.contentThemes).toBeDefined();
      expect(result.optimalPostingTimes).toBeDefined();
      expect(result.monthlyCalendar).toBeDefined();
      expect(result.audiencePatterns).toBeDefined();
      expect(result.actionableInsights).toBeDefined();
      expect(mockPrisma.post.findMany).toHaveBeenCalled();
      expect(mockAICoordinator.complete).toHaveBeenCalled();
    });

    it('should use fallback recommendations if AI parsing fails', async () => {
      const mockPosts = [
        {
          id: '1',
          workspaceId: 'workspace-1',
          status: 'PUBLISHED',
          publishedAt: new Date('2024-01-15T14:00:00Z'),
          content: { text: 'Test post' },
          platformPosts: [
            {
              account: {
                platform: 'INSTAGRAM',
              },
            },
          ],
        },
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);

      const mockAIResponse = {
        content: 'Invalid JSON response',
        cost: 0.002,
        tokensUsed: { prompt: 100, completion: 200, total: 300 },
        model: 'gpt-4o-mini',
        cached: false,
      };

      mockAICoordinator.complete.mockResolvedValue(mockAIResponse);

      const request = {
        workspaceId: 'workspace-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const result = await agent.analyzePerformance(request);

      expect(result).toBeDefined();
      expect(result.performanceAnalysis).toBeDefined();
      expect(result.contentThemes.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeOptimalPostingTimes', () => {
    it('should identify optimal posting times from performance data', async () => {
      const mockPerformanceData = {
        totalPosts: 10,
        totalEngagement: 5000,
        averageEngagementRate: 5.0,
        totalReach: 100000,
        totalImpressions: 150000,
        followerGrowth: 100,
        topPerformingPosts: [],
        platformBreakdown: [],
        hourlyEngagement: [
          { hour: 14, posts: 5, averageEngagement: 800, averageReach: 10000 },
          { hour: 10, posts: 3, averageEngagement: 600, averageReach: 8000 },
          { hour: 18, posts: 2, averageEngagement: 400, averageReach: 6000 },
        ],
        dailyEngagement: [
          { dayOfWeek: 1, posts: 5, averageEngagement: 700, averageReach: 9000 },
          { dayOfWeek: 3, posts: 3, averageEngagement: 600, averageReach: 8000 },
          { dayOfWeek: 5, posts: 2, averageEngagement: 500, averageReach: 7000 },
        ],
        contentTypePerformance: [],
      };

      const result = await agent.analyzeOptimalPostingTimes(
        'workspace-1',
        mockPerformanceData,
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('dayOfWeek');
      expect(result[0]).toHaveProperty('hour');
      expect(result[0]).toHaveProperty('expectedEngagement');
      expect(result[0]).toHaveProperty('confidence');
    });
  });

  describe('detectEngagementPatterns', () => {
    it('should detect audience engagement patterns', async () => {
      const mockPerformanceData = {
        totalPosts: 10,
        totalEngagement: 5000,
        averageEngagementRate: 5.0,
        totalReach: 100000,
        totalImpressions: 150000,
        followerGrowth: 100,
        topPerformingPosts: [],
        platformBreakdown: [
          {
            platform: 'INSTAGRAM',
            posts: 5,
            engagement: 3000,
            reach: 60000,
            engagementRate: 5.0,
          },
          {
            platform: 'TWITTER',
            posts: 5,
            engagement: 2000,
            reach: 40000,
            engagementRate: 5.0,
          },
        ],
        hourlyEngagement: [
          { hour: 14, posts: 5, averageEngagement: 800, averageReach: 10000 },
          { hour: 10, posts: 3, averageEngagement: 600, averageReach: 8000 },
        ],
        dailyEngagement: [
          { dayOfWeek: 1, posts: 5, averageEngagement: 700, averageReach: 9000 },
          { dayOfWeek: 3, posts: 3, averageEngagement: 600, averageReach: 8000 },
        ],
        contentTypePerformance: [
          {
            type: 'educational',
            posts: 5,
            averageEngagement: 800,
            averageReach: 10000,
          },
          {
            type: 'promotional',
            posts: 5,
            averageEngagement: 400,
            averageReach: 8000,
          },
        ],
      };

      const result = await agent.detectEngagementPatterns(
        'workspace-1',
        mockPerformanceData,
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('pattern');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('recommendation');
      expect(result[0]).toHaveProperty('impact');
    });
  });
});
