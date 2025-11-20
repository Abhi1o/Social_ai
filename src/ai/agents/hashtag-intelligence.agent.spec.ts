import { Test, TestingModule } from '@nestjs/testing';
import { HashtagIntelligenceAgent } from './hashtag-intelligence.agent';
import { AICoordinatorService } from '../services/ai-coordinator.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AIModel } from '../interfaces/ai.interface';

describe('HashtagIntelligenceAgent', () => {
  let agent: HashtagIntelligenceAgent;
  let aiCoordinator: jest.Mocked<AICoordinatorService>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockAICoordinator = {
      complete: jest.fn(),
    };

    const mockPrisma = {
      post: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HashtagIntelligenceAgent,
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

    agent = module.get<HashtagIntelligenceAgent>(HashtagIntelligenceAgent);
    aiCoordinator = module.get(AICoordinatorService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(agent).toBeDefined();
  });

  describe('analyzeAndSuggest', () => {
    it('should analyze content and return hashtag suggestions', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            tag: 'socialmedia',
            category: 'high-reach',
            competition: 'high',
            relevanceScore: 85,
            estimatedReach: 100000,
            reasoning: 'Highly relevant to social media content',
          },
          {
            tag: 'marketing',
            category: 'medium-reach',
            competition: 'medium',
            relevanceScore: 80,
            estimatedReach: 50000,
            reasoning: 'Related to marketing strategies',
          },
          {
            tag: 'contentcreation',
            category: 'niche',
            competition: 'low',
            relevanceScore: 75,
            estimatedReach: 10000,
            reasoning: 'Specific to content creation niche',
          },
        ]),
        model: AIModel.GPT_4O_MINI,
        tokensUsed: {
          prompt: 100,
          completion: 200,
          total: 300,
        },
        cost: 0.001,
        cached: false,
      };

      aiCoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.analyzeAndSuggest({
        content: 'Tips for creating engaging social media content',
        platform: 'instagram',
        count: 10,
        workspaceId: 'workspace-123',
      });

      expect(result).toBeDefined();
      expect(result.hashtags).toHaveLength(3);
      expect(result.hashtags[0].tag).toBe('socialmedia');
      expect(result.hashtags[0].category).toBe('high-reach');
      expect(result.categoryBreakdown).toEqual({
        highReach: 1,
        mediumReach: 1,
        niche: 1,
      });
      expect(result.cost).toBe(0.001);
      expect(result.tokensUsed).toBe(300);

      expect(aiCoordinator.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AIModel.GPT_4O_MINI,
          temperature: 0.5,
          workspaceId: 'workspace-123',
        }),
      );
    });

    it('should handle different platforms correctly', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            tag: 'tech',
            category: 'high-reach',
            competition: 'high',
            relevanceScore: 90,
            estimatedReach: 200000,
            reasoning: 'Popular tech hashtag',
          },
        ]),
        model: AIModel.GPT_4O_MINI,
        tokensUsed: { prompt: 100, completion: 150, total: 250 },
        cost: 0.0008,
        cached: false,
      };

      aiCoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.analyzeAndSuggest({
        content: 'Latest tech innovations',
        platform: 'twitter',
        workspaceId: 'workspace-123',
      });

      expect(result.hashtags).toHaveLength(1);
      expect(aiCoordinator.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('Twitter'),
            }),
          ]),
        }),
      );
    });

    it('should limit results to requested count', async () => {
      const mockHashtags = Array.from({ length: 50 }, (_, i) => ({
        tag: `hashtag${i}`,
        category: 'medium-reach',
        competition: 'medium',
        relevanceScore: 70 - i,
        estimatedReach: 10000,
        reasoning: 'Test hashtag',
      }));

      const mockResponse = {
        content: JSON.stringify(mockHashtags),
        model: AIModel.GPT_4O_MINI,
        tokensUsed: { prompt: 100, completion: 500, total: 600 },
        cost: 0.002,
        cached: false,
      };

      aiCoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.analyzeAndSuggest({
        content: 'Test content',
        platform: 'instagram',
        count: 15,
        workspaceId: 'workspace-123',
      });

      expect(result.hashtags).toHaveLength(15);
      expect(result.totalSuggestions).toBe(50);
    });

    it('should handle AI parsing errors gracefully', async () => {
      const mockResponse = {
        content: 'Invalid JSON response',
        model: AIModel.GPT_4O_MINI,
        tokensUsed: { prompt: 100, completion: 50, total: 150 },
        cost: 0.0005,
        cached: false,
      };

      aiCoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.analyzeAndSuggest({
        content: 'Test content',
        platform: 'instagram',
        workspaceId: 'workspace-123',
      });

      expect(result.hashtags).toEqual([]);
      expect(result.totalSuggestions).toBe(0);
    });
  });

  describe('trackPerformance', () => {
    it('should track performance for multiple hashtags', async () => {
      const result = await agent.trackPerformance({
        hashtags: ['marketing', 'socialmedia', 'contentcreation'],
        platform: 'instagram',
        workspaceId: 'workspace-123',
      });

      expect(result).toBeDefined();
      expect(result.performance).toHaveLength(3);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);

      result.performance.forEach((perf) => {
        expect(perf).toHaveProperty('tag');
        expect(perf).toHaveProperty('totalPosts');
        expect(perf).toHaveProperty('totalEngagement');
        expect(perf).toHaveProperty('averageEngagement');
        expect(perf).toHaveProperty('engagementRate');
        expect(perf).toHaveProperty('trend');
        expect(['rising', 'stable', 'declining']).toContain(perf.trend);
      });
    });

    it('should generate performance recommendations', async () => {
      const result = await agent.trackPerformance({
        hashtags: ['test1', 'test2', 'test3'],
        platform: 'instagram',
        workspaceId: 'workspace-123',
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(typeof result.recommendations[0]).toBe('string');
    });

    it('should handle date range filtering', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await agent.trackPerformance({
        hashtags: ['marketing'],
        platform: 'instagram',
        workspaceId: 'workspace-123',
        startDate,
        endDate,
      });

      expect(result).toBeDefined();
      expect(result.performance).toHaveLength(1);
    });
  });

  describe('createHashtagGroup', () => {
    it('should create a hashtag group', async () => {
      const result = await agent.createHashtagGroup(
        'workspace-123',
        'Marketing Hashtags',
        ['marketing', 'socialmedia', 'digitalmarketing'],
        'Hashtags for marketing campaigns',
        'marketing',
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Marketing Hashtags');
      expect(result.hashtags).toEqual([
        'marketing',
        'socialmedia',
        'digitalmarketing',
      ]);
      expect(result.description).toBe('Hashtags for marketing campaigns');
      expect(result.category).toBe('marketing');
      expect(result.workspaceId).toBe('workspace-123');
    });

    it('should remove # from hashtags', async () => {
      const result = await agent.createHashtagGroup(
        'workspace-123',
        'Test Group',
        ['#hashtag1', '#hashtag2', 'hashtag3'],
      );

      expect(result.hashtags).toEqual(['hashtag1', 'hashtag2', 'hashtag3']);
    });
  });

  describe('getHashtagGroups', () => {
    it('should return hashtag groups for workspace', async () => {
      const result = await agent.getHashtagGroups('workspace-123');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('updateHashtagGroup', () => {
    it('should update a hashtag group', async () => {
      const result = await agent.updateHashtagGroup('group-123', {
        name: 'Updated Name',
        hashtags: ['new1', 'new2'],
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('group-123');
      expect(result.name).toBe('Updated Name');
      expect(result.hashtags).toEqual(['new1', 'new2']);
    });
  });

  describe('deleteHashtagGroup', () => {
    it('should delete a hashtag group', async () => {
      await expect(
        agent.deleteHashtagGroup('group-123'),
      ).resolves.not.toThrow();
    });
  });

  describe('detectTrending', () => {
    it('should detect trending hashtags', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            tag: 'trending',
            platform: 'instagram',
            volume: 50000,
            growthVelocity: 150,
            sentiment: 0.7,
            relatedTopics: ['viral', 'popular'],
            estimatedReach: 1000000,
          },
          {
            tag: 'viral',
            platform: 'instagram',
            volume: 75000,
            growthVelocity: 200,
            sentiment: 0.8,
            relatedTopics: ['trending', 'fyp'],
            estimatedReach: 1500000,
          },
        ]),
        model: AIModel.GPT_4O_MINI,
        tokensUsed: { prompt: 100, completion: 200, total: 300 },
        cost: 0.001,
        cached: false,
      };

      aiCoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.detectTrending({
        platform: 'instagram',
        workspaceId: 'workspace-123',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.trending).toHaveLength(2);
      expect(result.trending[0].tag).toBe('trending');
      expect(result.trending[0].growthVelocity).toBe(150);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle category and location filters', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            tag: 'tech',
            platform: 'twitter',
            volume: 30000,
            growthVelocity: 120,
            sentiment: 0.6,
            relatedTopics: ['technology', 'innovation'],
            estimatedReach: 500000,
          },
        ]),
        model: AIModel.GPT_4O_MINI,
        tokensUsed: { prompt: 100, completion: 150, total: 250 },
        cost: 0.0008,
        cached: false,
      };

      aiCoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.detectTrending({
        platform: 'twitter',
        category: 'technology',
        location: 'US',
        workspaceId: 'workspace-123',
      });

      expect(result.trending).toHaveLength(1);
      expect(aiCoordinator.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Category: technology'),
            }),
          ]),
        }),
      );
    });

    it('should use fallback trending hashtags on parse error', async () => {
      const mockResponse = {
        content: 'Invalid JSON',
        model: AIModel.GPT_4O_MINI,
        tokensUsed: { prompt: 100, completion: 50, total: 150 },
        cost: 0.0005,
        cached: false,
      };

      aiCoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.detectTrending({
        platform: 'instagram',
        workspaceId: 'workspace-123',
      });

      expect(result.trending.length).toBeGreaterThan(0);
      expect(result.trending[0]).toHaveProperty('tag');
      expect(result.trending[0]).toHaveProperty('growthVelocity');
    });
  });

  describe('analyzeCompetition', () => {
    it('should analyze hashtag competition', async () => {
      const result = await agent.analyzeCompetition(
        'marketing',
        'instagram',
        'workspace-123',
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('competition');
      expect(['low', 'medium', 'high']).toContain(result.competition);
      expect(result).toHaveProperty('totalPosts');
      expect(result).toHaveProperty('averageEngagement');
      expect(result).toHaveProperty('difficulty');
      expect(result.difficulty).toBeGreaterThanOrEqual(0);
      expect(result.difficulty).toBeLessThanOrEqual(100);
      expect(result).toHaveProperty('recommendation');
      expect(typeof result.recommendation).toBe('string');
    });

    it('should categorize competition correctly', async () => {
      // Run multiple times to test different competition levels
      const results = await Promise.all([
        agent.analyzeCompetition('test1', 'instagram', 'workspace-123'),
        agent.analyzeCompetition('test2', 'instagram', 'workspace-123'),
        agent.analyzeCompetition('test3', 'instagram', 'workspace-123'),
      ]);

      results.forEach((result) => {
        expect(['low', 'medium', 'high']).toContain(result.competition);
        
        if (result.competition === 'high') {
          expect(result.difficulty).toBeGreaterThan(60);
        } else if (result.competition === 'medium') {
          expect(result.difficulty).toBeGreaterThan(30);
          expect(result.difficulty).toBeLessThan(70);
        } else {
          expect(result.difficulty).toBeLessThan(40);
        }
      });
    });
  });

  describe('category breakdown', () => {
    it('should correctly calculate category breakdown', async () => {
      const mockResponse = {
        content: JSON.stringify([
          { tag: 'tag1', category: 'high-reach', competition: 'high', relevanceScore: 90, estimatedReach: 100000, reasoning: 'test' },
          { tag: 'tag2', category: 'high-reach', competition: 'high', relevanceScore: 85, estimatedReach: 90000, reasoning: 'test' },
          { tag: 'tag3', category: 'medium-reach', competition: 'medium', relevanceScore: 80, estimatedReach: 50000, reasoning: 'test' },
          { tag: 'tag4', category: 'medium-reach', competition: 'medium', relevanceScore: 75, estimatedReach: 40000, reasoning: 'test' },
          { tag: 'tag5', category: 'medium-reach', competition: 'medium', relevanceScore: 70, estimatedReach: 30000, reasoning: 'test' },
          { tag: 'tag6', category: 'niche', competition: 'low', relevanceScore: 65, estimatedReach: 10000, reasoning: 'test' },
          { tag: 'tag7', category: 'niche', competition: 'low', relevanceScore: 60, estimatedReach: 8000, reasoning: 'test' },
        ]),
        model: AIModel.GPT_4O_MINI,
        tokensUsed: { prompt: 100, completion: 300, total: 400 },
        cost: 0.0015,
        cached: false,
      };

      aiCoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.analyzeAndSuggest({
        content: 'Test content',
        platform: 'instagram',
        workspaceId: 'workspace-123',
      });

      expect(result.categoryBreakdown).toEqual({
        highReach: 2,
        mediumReach: 3,
        niche: 2,
      });
    });
  });

  describe('hashtag scoring', () => {
    it('should sort hashtags by relevance score', async () => {
      const mockResponse = {
        content: JSON.stringify([
          { tag: 'low', category: 'niche', competition: 'low', relevanceScore: 50, estimatedReach: 5000, reasoning: 'test' },
          { tag: 'high', category: 'high-reach', competition: 'high', relevanceScore: 95, estimatedReach: 100000, reasoning: 'test' },
          { tag: 'medium', category: 'medium-reach', competition: 'medium', relevanceScore: 70, estimatedReach: 30000, reasoning: 'test' },
        ]),
        model: AIModel.GPT_4O_MINI,
        tokensUsed: { prompt: 100, completion: 200, total: 300 },
        cost: 0.001,
        cached: false,
      };

      aiCoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.analyzeAndSuggest({
        content: 'Test content',
        platform: 'instagram',
        workspaceId: 'workspace-123',
      });

      expect(result.hashtags[0].tag).toBe('high');
      expect(result.hashtags[1].tag).toBe('medium');
      expect(result.hashtags[2].tag).toBe('low');
    });
  });
});
