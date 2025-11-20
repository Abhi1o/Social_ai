import { Test, TestingModule } from '@nestjs/testing';
import { ContentCreatorAgent } from './content-creator.agent';
import { AICoordinatorService } from '../services/ai-coordinator.service';
import { AIModel } from '../interfaces/ai.interface';

describe('ContentCreatorAgent', () => {
  let agent: ContentCreatorAgent;
  let aiCoordinator: AICoordinatorService;

  const mockAICoordinator = {
    complete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentCreatorAgent,
        {
          provide: AICoordinatorService,
          useValue: mockAICoordinator,
        },
      ],
    }).compile();

    agent = module.get<ContentCreatorAgent>(ContentCreatorAgent);
    aiCoordinator = module.get<AICoordinatorService>(AICoordinatorService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(agent).toBeDefined();
  });

  describe('generateContent', () => {
    const workspaceId = 'workspace-123';

    it('should generate content variations for single platform', async () => {
      const request = {
        context: {
          topic: 'Product Launch',
          tone: 'professional' as const,
          platforms: ['instagram'],
          targetAudience: 'Tech enthusiasts',
        },
        variations: 3,
        workspaceId,
      };

      const mockResponse = {
        content: JSON.stringify([
          {
            text: 'Exciting news! 🚀 Our new product is here.',
            hashtags: ['tech', 'innovation', 'productlaunch'],
            mentions: [],
            reasoning: 'Engaging hook with emoji and clear message',
          },
          {
            text: 'Introducing our latest innovation! Check it out.',
            hashtags: ['newproduct', 'technology', 'launch'],
            mentions: [],
            reasoning: 'Direct and informative approach',
          },
          {
            text: 'The wait is over! Our new product launches today.',
            hashtags: ['launch', 'tech', 'innovation'],
            mentions: [],
            reasoning: 'Creates urgency and excitement',
          },
        ]),
        cost: 0.002,
        tokensUsed: { prompt: 100, completion: 200, total: 300 },
        model: AIModel.GPT_4O_MINI,
        cached: false,
      };

      mockAICoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.generateContent(request);

      expect(result.variations).toHaveLength(3);
      expect(result.variations[0].platform).toBe('instagram');
      expect(result.variations[0].content.text).toBeTruthy();
      expect(result.variations[0].score).toBeGreaterThan(0);
      expect(result.cost).toBe(0.002);
      expect(result.tokensUsed).toBe(300);
      expect(mockAICoordinator.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          model: AIModel.GPT_4O_MINI,
          temperature: 0.8,
          workspaceId,
        }),
      );
    });

    it('should generate content for multiple platforms', async () => {
      const request = {
        context: {
          topic: 'Product Launch',
          platforms: ['instagram', 'twitter'],
        },
        variations: 2,
        workspaceId,
      };

      const mockResponse = {
        content: JSON.stringify([
          {
            text: 'Test content',
            hashtags: ['test'],
            mentions: [],
            reasoning: 'Test',
          },
        ]),
        cost: 0.001,
        tokensUsed: { prompt: 50, completion: 100, total: 150 },
        model: AIModel.GPT_4O_MINI,
        cached: false,
      };

      mockAICoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.generateContent(request);

      // Should call AI coordinator twice (once per platform)
      expect(mockAICoordinator.complete).toHaveBeenCalledTimes(2);
      expect(result.variations.length).toBeGreaterThan(0);
    });

    it('should handle different tones correctly', async () => {
      const tones = ['professional', 'casual', 'friendly', 'formal', 'humorous'] as const;

      for (const tone of tones) {
        const request = {
          context: {
            tone,
            platforms: ['instagram'],
          },
          workspaceId,
        };

        const mockResponse = {
          content: JSON.stringify([
            {
              text: `Content with ${tone} tone`,
              hashtags: [],
              mentions: [],
              reasoning: 'Test',
            },
          ]),
          cost: 0.001,
          tokensUsed: { prompt: 50, completion: 100, total: 150 },
          model: AIModel.GPT_4O_MINI,
          cached: false,
        };

        mockAICoordinator.complete.mockResolvedValue(mockResponse);

        await agent.generateContent(request);

        // Check that the tone is mentioned in the system prompt (case-insensitive)
        const call = mockAICoordinator.complete.mock.calls[0][0];
        const systemMessage = call.messages.find((m: any) => m.role === 'system');
        expect(systemMessage.content.toLowerCase()).toContain(tone.toLowerCase());

        jest.clearAllMocks();
      }
    });

    it('should include keywords in prompt when provided', async () => {
      const request = {
        context: {
          platforms: ['instagram'],
          keywords: ['innovation', 'technology', 'future'],
        },
        workspaceId,
      };

      const mockResponse = {
        content: JSON.stringify([
          {
            text: 'Test content',
            hashtags: [],
            mentions: [],
            reasoning: 'Test',
          },
        ]),
        cost: 0.001,
        tokensUsed: { prompt: 50, completion: 100, total: 150 },
        model: AIModel.GPT_4O_MINI,
        cached: false,
      };

      mockAICoordinator.complete.mockResolvedValue(mockResponse);

      await agent.generateContent(request);

      expect(mockAICoordinator.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('innovation, technology, future'),
            }),
          ]),
        }),
      );
    });

    it('should handle non-JSON responses gracefully', async () => {
      const request = {
        context: {
          platforms: ['instagram'],
        },
        workspaceId,
      };

      const mockResponse = {
        content: 'This is plain text, not JSON',
        cost: 0.001,
        tokensUsed: { prompt: 50, completion: 100, total: 150 },
        model: AIModel.GPT_4O_MINI,
        cached: false,
      };

      mockAICoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.generateContent(request);

      expect(result.variations).toHaveLength(1);
      expect(result.variations[0].content.text).toBe('This is plain text, not JSON');
    });
  });

  describe('optimizeContent', () => {
    const workspaceId = 'workspace-123';

    it('should optimize content for engagement', async () => {
      const request = {
        content: 'Check out our new product',
        platform: 'instagram',
        optimizationGoals: ['engagement' as const],
        workspaceId,
      };

      const mockResponse = {
        content: JSON.stringify({
          optimizedContent: 'Check out our new product! 🚀 What do you think?',
          suggestions: [
            {
              type: 'engagement',
              original: 'Check out our new product',
              suggested: 'Check out our new product! 🚀 What do you think?',
              reasoning: 'Added emoji and question to increase engagement',
            },
          ],
          predictedPerformance: {
            engagementRate: 0.05,
            reachEstimate: 10000,
          },
        }),
        cost: 0.001,
        tokensUsed: { prompt: 50, completion: 100, total: 150 },
        model: AIModel.GPT_4O_MINI,
        cached: false,
      };

      mockAICoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.optimizeContent(request);

      expect(result.optimizedContent).toBeTruthy();
      expect(result.suggestions).toHaveLength(1);
      expect(result.predictedPerformance).toBeDefined();
      expect(mockAICoordinator.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('engagement'),
            }),
          ]),
        }),
      );
    });

    it('should handle multiple optimization goals', async () => {
      const request = {
        content: 'Test content',
        platform: 'instagram',
        optimizationGoals: ['engagement' as const, 'reach' as const, 'conversions' as const],
        workspaceId,
      };

      const mockResponse = {
        content: JSON.stringify({
          optimizedContent: 'Optimized content',
          suggestions: [],
          predictedPerformance: {
            engagementRate: 0.04,
            reachEstimate: 8000,
          },
        }),
        cost: 0.001,
        tokensUsed: { prompt: 50, completion: 100, total: 150 },
        model: AIModel.GPT_4O_MINI,
        cached: false,
      };

      mockAICoordinator.complete.mockResolvedValue(mockResponse);

      await agent.optimizeContent(request);

      expect(mockAICoordinator.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('engagement, reach, conversions'),
            }),
          ]),
        }),
      );
    });

    it('should return fallback response on parse error', async () => {
      const request = {
        content: 'Test content',
        platform: 'instagram',
        optimizationGoals: ['engagement' as const],
        workspaceId,
      };

      const mockResponse = {
        content: 'Invalid JSON response',
        cost: 0.001,
        tokensUsed: { prompt: 50, completion: 100, total: 150 },
        model: AIModel.GPT_4O_MINI,
        cached: false,
      };

      mockAICoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.optimizeContent(request);

      expect(result.optimizedContent).toBe('Test content');
      expect(result.suggestions).toEqual([]);
      expect(result.predictedPerformance).toBeDefined();
    });
  });

  describe('checkBrandVoice', () => {
    const workspaceId = 'workspace-123';
    const brandVoice = {
      id: 'bv-123',
      workspaceId,
      name: 'Tech Brand',
      description: 'Professional tech company',
      tone: 'professional',
      vocabulary: ['innovative', 'cutting-edge', 'solution'],
      avoidWords: ['cheap', 'basic', 'simple'],
      examples: ['Example content 1', 'Example content 2'],
      guidelines: 'Always maintain professional tone',
    };

    it('should check brand voice consistency', async () => {
      const content = 'Our innovative solution is cutting-edge';

      const mockResponse = {
        content: JSON.stringify({
          score: 90,
          issues: [],
          suggestions: [],
        }),
        cost: 0.001,
        tokensUsed: { prompt: 50, completion: 100, total: 150 },
        model: AIModel.GPT_4O_MINI,
        cached: false,
      };

      mockAICoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.checkBrandVoice(content, brandVoice, workspaceId);

      expect(result.score).toBe(90);
      expect(result.issues).toEqual([]);
      expect(mockAICoordinator.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('professional'),
            }),
          ]),
          temperature: 0.3,
        }),
      );
    });

    it('should identify brand voice issues', async () => {
      const content = 'This cheap and basic product is simple to use';

      const mockResponse = {
        content: JSON.stringify({
          score: 40,
          issues: ['Uses avoided word: cheap', 'Uses avoided word: basic', 'Uses avoided word: simple'],
          suggestions: ['Replace "cheap" with "affordable"', 'Replace "basic" with "essential"'],
        }),
        cost: 0.001,
        tokensUsed: { prompt: 50, completion: 100, total: 150 },
        model: AIModel.GPT_4O_MINI,
        cached: false,
      };

      mockAICoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.checkBrandVoice(content, brandVoice, workspaceId);

      expect(result.score).toBeLessThan(50);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should return fallback response on parse error', async () => {
      const content = 'Test content';

      const mockResponse = {
        content: 'Invalid JSON',
        cost: 0.001,
        tokensUsed: { prompt: 50, completion: 100, total: 150 },
        model: AIModel.GPT_4O_MINI,
        cached: false,
      };

      mockAICoordinator.complete.mockResolvedValue(mockResponse);

      const result = await agent.checkBrandVoice(content, brandVoice, workspaceId);

      expect(result.score).toBe(75);
      expect(result.issues).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('calculateQualityScore', () => {
    it('should score Instagram content appropriately', async () => {
      const variation = {
        id: 'var-1',
        content: {
          text: 'Check out our new product! 🚀 What do you think? #innovation #tech #product #launch #newrelease',
          hashtags: ['innovation', 'tech', 'product', 'launch', 'newrelease'],
          mentions: [],
        },
        platform: 'instagram',
        score: 0,
        reasoning: 'Test',
      };

      // Access private method through any type
      const score = (agent as any).calculateQualityScore(variation);

      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should score Twitter content with appropriate length', async () => {
      const variation = {
        id: 'var-1',
        content: {
          text: 'Exciting news! Our new product launches today. Check it out! #tech',
          hashtags: ['tech'],
          mentions: [],
        },
        platform: 'twitter',
        score: 0,
        reasoning: 'Test',
      };

      const score = (agent as any).calculateQualityScore(variation);

      expect(score).toBeGreaterThan(50);
    });

    it('should penalize content with too many hashtags for Twitter', async () => {
      const variation = {
        id: 'var-1',
        content: {
          text: 'Test content',
          hashtags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
          mentions: [],
        },
        platform: 'twitter',
        score: 0,
        reasoning: 'Test',
      };

      const score = (agent as any).calculateQualityScore(variation);

      // Should be penalized for too many hashtags
      expect(score).toBeLessThan(80);
    });

    it('should reward engagement elements', async () => {
      const withEngagement = {
        id: 'var-1',
        content: {
          text: 'What do you think about our new product? Click to learn more!',
          hashtags: ['tech'],
          mentions: [],
        },
        platform: 'instagram',
        score: 0,
        reasoning: 'Test',
      };

      const withoutEngagement = {
        id: 'var-2',
        content: {
          text: 'Our new product is available.',
          hashtags: ['tech'],
          mentions: [],
        },
        platform: 'instagram',
        score: 0,
        reasoning: 'Test',
      };

      const scoreWith = (agent as any).calculateQualityScore(withEngagement);
      const scoreWithout = (agent as any).calculateQualityScore(withoutEngagement);

      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });
  });

  describe('platform specifications', () => {
    it('should provide correct specifications for each platform', () => {
      const platforms = ['instagram', 'twitter', 'linkedin', 'facebook', 'tiktok'];

      platforms.forEach((platform) => {
        const specs = (agent as any).getPlatformSpecifications(platform);
        expect(specs).toBeTruthy();
        expect(specs).toContain('Character Limit');
        expect(specs).toContain('Best Practices');
      });
    });

    it('should provide default specifications for unknown platforms', () => {
      const specs = (agent as any).getPlatformSpecifications('unknown-platform');
      expect(specs).toBeTruthy();
    });
  });

  describe('tone guidance', () => {
    it('should provide guidance for each tone', () => {
      const tones = ['professional', 'casual', 'friendly', 'formal', 'humorous'];

      tones.forEach((tone) => {
        const guidance = (agent as any).getToneGuidance(tone);
        expect(guidance).toBeTruthy();
        expect(guidance).toContain('Tone:');
      });
    });

    it('should return empty string for unknown tone', () => {
      const guidance = (agent as any).getToneGuidance('unknown-tone');
      expect(guidance).toBe('');
    });
  });
});
