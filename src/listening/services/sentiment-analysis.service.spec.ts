import { Test, TestingModule } from '@nestjs/testing';
import { SentimentAnalysisService } from './sentiment-analysis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Sentiment } from '@prisma/client';

// Mock @xenova/transformers
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue(async (text: string | string[]) => {
    // Simple mock that returns positive sentiment for texts with positive words
    const analyze = (t: string) => {
      const lower = t.toLowerCase();
      if (lower.includes('love') || lower.includes('great') || lower.includes('amazing')) {
        return { label: 'POSITIVE', score: 0.9 };
      } else if (lower.includes('hate') || lower.includes('terrible') || lower.includes('worst')) {
        return { label: 'NEGATIVE', score: 0.9 };
      }
      return { label: 'NEUTRAL', score: 0.5 };
    };

    if (Array.isArray(text)) {
      return text.map(analyze);
    }
    return analyze(text);
  }),
}));

describe('SentimentAnalysisService', () => {
  let service: SentimentAnalysisService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    listeningMention: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentimentAnalysisService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SentimentAnalysisService>(SentimentAnalysisService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeSentiment', () => {
    it('should analyze positive sentiment', async () => {
      const text = 'I love this product! It works amazingly well.';
      const result = await service.analyzeSentiment(text);

      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('rawScores');
      expect(['POSITIVE', 'NEUTRAL', 'NEGATIVE']).toContain(result.sentiment);
      expect(result.score).toBeGreaterThanOrEqual(-1);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should analyze negative sentiment', async () => {
      const text = 'This is terrible! Worst experience ever.';
      const result = await service.analyzeSentiment(text);

      expect(result).toHaveProperty('sentiment');
      expect(result.score).toBeGreaterThanOrEqual(-1);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should handle empty text', async () => {
      const text = '';
      const result = await service.analyzeSentiment(text);

      expect(result.sentiment).toBe(Sentiment.NEUTRAL);
      expect(result.score).toBe(0);
    });

    it('should handle text with URLs and mentions', async () => {
      const text = 'Check out https://example.com @user #hashtag great product!';
      const result = await service.analyzeSentiment(text);

      expect(result).toHaveProperty('sentiment');
      expect(result.score).toBeGreaterThanOrEqual(-1);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe('analyzeSentimentBatch', () => {
    it('should analyze multiple texts', async () => {
      const texts = [
        'I love this!',
        'This is terrible.',
        'It works okay.',
      ];
      const results = await service.analyzeSentimentBatch(texts);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('sentiment');
        expect(result).toHaveProperty('score');
        expect(result.score).toBeGreaterThanOrEqual(-1);
        expect(result.score).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty array', async () => {
      const texts: string[] = [];
      const results = await service.analyzeSentimentBatch(texts);

      expect(results).toHaveLength(0);
    });
  });

  describe('updateMentionSentiment', () => {
    it('should update mention sentiment', async () => {
      const mentionId = 'test-mention-id';
      const mockMention = {
        id: mentionId,
        content: 'Great product!',
        workspaceId: 'workspace-1',
        queryId: 'query-1',
        platform: 'TWITTER',
        authorId: 'author-1',
        authorUsername: 'testuser',
        authorName: 'Test User',
        url: 'https://example.com',
        platformPostId: 'post-123',
        likes: 10,
        comments: 5,
        shares: 2,
        reach: 1000,
        sentiment: Sentiment.NEUTRAL,
        sentimentScore: 0,
        publishedAt: new Date(),
        fetchedAt: new Date(),
      };

      mockPrismaService.listeningMention.findUnique.mockResolvedValue(mockMention);
      mockPrismaService.listeningMention.update.mockResolvedValue({
        ...mockMention,
        sentiment: Sentiment.POSITIVE,
        sentimentScore: 0.8,
      });

      await service.updateMentionSentiment(mentionId);

      expect(mockPrismaService.listeningMention.findUnique).toHaveBeenCalledWith({
        where: { id: mentionId },
      });
      expect(mockPrismaService.listeningMention.update).toHaveBeenCalled();
    });

    it('should throw error for non-existent mention', async () => {
      const mentionId = 'non-existent-id';
      mockPrismaService.listeningMention.findUnique.mockResolvedValue(null);

      await expect(service.updateMentionSentiment(mentionId)).rejects.toThrow();
    });
  });

  describe('updateMentionsSentimentBatch', () => {
    it('should update multiple mentions', async () => {
      const mentionIds = ['id-1', 'id-2', 'id-3'];
      const mockMentions = mentionIds.map((id, index) => ({
        id,
        content: `Test content ${index}`,
      }));

      mockPrismaService.listeningMention.findMany.mockResolvedValue(mockMentions);
      mockPrismaService.listeningMention.update.mockResolvedValue({});

      const updated = await service.updateMentionsSentimentBatch(mentionIds);

      expect(updated).toBe(3);
      expect(mockPrismaService.listeningMention.findMany).toHaveBeenCalled();
    });

    it('should return 0 for empty array', async () => {
      mockPrismaService.listeningMention.findMany.mockResolvedValue([]);

      const updated = await service.updateMentionsSentimentBatch([]);

      expect(updated).toBe(0);
    });
  });

  describe('getSentimentTrend', () => {
    it('should return sentiment trend data', async () => {
      const workspaceId = 'workspace-1';
      const mockMentions = [
        {
          publishedAt: new Date('2024-01-15'),
          sentiment: Sentiment.POSITIVE,
          sentimentScore: 0.8,
        },
        {
          publishedAt: new Date('2024-01-15'),
          sentiment: Sentiment.POSITIVE,
          sentimentScore: 0.7,
        },
        {
          publishedAt: new Date('2024-01-16'),
          sentiment: Sentiment.NEGATIVE,
          sentimentScore: -0.6,
        },
      ];

      mockPrismaService.listeningMention.findMany.mockResolvedValue(mockMentions);

      const trend = await service.getSentimentTrend(workspaceId, undefined, 7, 'day');

      expect(Array.isArray(trend)).toBe(true);
      trend.forEach(point => {
        expect(point).toHaveProperty('date');
        expect(point).toHaveProperty('averageScore');
        expect(point).toHaveProperty('sentiment');
        expect(point).toHaveProperty('mentionCount');
        expect(point).toHaveProperty('positiveCount');
        expect(point).toHaveProperty('neutralCount');
        expect(point).toHaveProperty('negativeCount');
      });
    });

    it('should handle empty data', async () => {
      const workspaceId = 'workspace-1';
      mockPrismaService.listeningMention.findMany.mockResolvedValue([]);

      const trend = await service.getSentimentTrend(workspaceId);

      expect(Array.isArray(trend)).toBe(true);
      expect(trend).toHaveLength(0);
    });
  });

  describe('getTopicSentimentBreakdown', () => {
    it('should return topic sentiment breakdown', async () => {
      const workspaceId = 'workspace-1';
      const mockMentions = [
        {
          tags: ['customer_service', 'support'],
          sentiment: Sentiment.NEGATIVE,
          sentimentScore: -0.5,
        },
        {
          tags: ['customer_service'],
          sentiment: Sentiment.NEGATIVE,
          sentimentScore: -0.7,
        },
        {
          tags: ['product', 'quality'],
          sentiment: Sentiment.POSITIVE,
          sentimentScore: 0.8,
        },
      ];

      mockPrismaService.listeningMention.findMany.mockResolvedValue(mockMentions);

      const breakdown = await service.getTopicSentimentBreakdown(workspaceId);

      expect(Array.isArray(breakdown)).toBe(true);
      breakdown.forEach(topic => {
        expect(topic).toHaveProperty('topic');
        expect(topic).toHaveProperty('averageScore');
        expect(topic).toHaveProperty('sentiment');
        expect(topic).toHaveProperty('mentionCount');
        expect(topic).toHaveProperty('positivePercentage');
        expect(topic).toHaveProperty('neutralPercentage');
        expect(topic).toHaveProperty('negativePercentage');
      });
    });
  });

  describe('getSentimentTimeline', () => {
    it('should return sentiment timeline with summary', async () => {
      const workspaceId = 'workspace-1';
      const mockMentions = [
        {
          publishedAt: new Date('2024-01-15'),
          sentiment: Sentiment.POSITIVE,
          sentimentScore: 0.5,
        },
        {
          publishedAt: new Date('2024-01-16'),
          sentiment: Sentiment.POSITIVE,
          sentimentScore: 0.6,
        },
        {
          publishedAt: new Date('2024-01-17'),
          sentiment: Sentiment.POSITIVE,
          sentimentScore: 0.7,
        },
      ];

      mockPrismaService.listeningMention.findMany.mockResolvedValue(mockMentions);

      const result = await service.getSentimentTimeline(workspaceId);

      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray(result.timeline)).toBe(true);
      expect(result.summary).toHaveProperty('averageScore');
      expect(result.summary).toHaveProperty('trend');
      expect(result.summary).toHaveProperty('volatility');
      expect(['improving', 'declining', 'stable']).toContain(result.summary.trend);
    });
  });
});
