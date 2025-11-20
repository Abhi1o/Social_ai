import { Test, TestingModule } from '@nestjs/testing';
import { SmartInboxRoutingService, MessageIntent, MessageCategory } from './smart-inbox-routing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LangChainService } from '../../ai/services/langchain.service';
import { Priority, Sentiment, Message } from '@prisma/client';

describe('SmartInboxRoutingService', () => {
  let service: SmartInboxRoutingService;
  let prismaService: PrismaService;
  let langChainService: LangChainService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockLangChainService = {
    analyzeSentiment: jest.fn(),
    getModel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartInboxRoutingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LangChainService,
          useValue: mockLangChainService,
        },
      ],
    }).compile();

    service = module.get<SmartInboxRoutingService>(SmartInboxRoutingService);
    prismaService = module.get<PrismaService>(PrismaService);
    langChainService = module.get<LangChainService>(LangChainService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectSentiment', () => {
    it('should detect positive sentiment', async () => {
      mockLangChainService.analyzeSentiment.mockResolvedValue({
        sentiment: 'positive',
        score: 0.8,
        reasoning: 'Contains positive language',
      });

      const result = await service.detectSentiment('I love this product!');

      expect(result.sentiment).toBe(Sentiment.POSITIVE);
      expect(result.score).toBe(0.8);
      expect(mockLangChainService.analyzeSentiment).toHaveBeenCalled();
    });

    it('should detect negative sentiment', async () => {
      mockLangChainService.analyzeSentiment.mockResolvedValue({
        sentiment: 'negative',
        score: -0.7,
        reasoning: 'Contains complaint language',
      });

      const result = await service.detectSentiment('This is terrible!');

      expect(result.sentiment).toBe(Sentiment.NEGATIVE);
      expect(result.score).toBe(-0.7);
    });

    it('should detect neutral sentiment', async () => {
      mockLangChainService.analyzeSentiment.mockResolvedValue({
        sentiment: 'neutral',
        score: 0.1,
        reasoning: 'Neutral tone',
      });

      const result = await service.detectSentiment('What time do you open?');

      expect(result.sentiment).toBe(Sentiment.NEUTRAL);
      expect(result.score).toBe(0.1);
    });

    it('should handle errors gracefully', async () => {
      mockLangChainService.analyzeSentiment.mockRejectedValue(
        new Error('API error'),
      );

      const result = await service.detectSentiment('Test message');

      expect(result.sentiment).toBe(Sentiment.NEUTRAL);
      expect(result.score).toBe(0);
    });
  });

  describe('detectIntent - keyword-based fallback', () => {
    beforeEach(() => {
      // Mock AI to fail so we test keyword-based detection
      mockLangChainService.getModel.mockImplementation(() => {
        throw new Error('Model not available');
      });
    });

    it('should detect question intent', async () => {
      const result = await service.detectIntent('How does this work?');

      expect(result.intent).toBe(MessageIntent.QUESTION);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect complaint intent', async () => {
      const result = await service.detectIntent(
        'This is broken and not working!',
      );

      expect(result.intent).toBe(MessageIntent.COMPLAINT);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect praise intent', async () => {
      const result = await service.detectIntent('Thank you, this is great!');

      expect(result.intent).toBe(MessageIntent.PRAISE);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect support request intent', async () => {
      const result = await service.detectIntent('I need help with my account');

      expect(result.intent).toBe(MessageIntent.SUPPORT_REQUEST);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect sales inquiry intent', async () => {
      const result = await service.detectIntent('How much does this cost?');

      expect(result.intent).toBe(MessageIntent.SALES_INQUIRY);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect spam intent', async () => {
      const result = await service.detectIntent('Click here for free money!');

      expect(result.intent).toBe(MessageIntent.SPAM);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should default to general intent', async () => {
      const result = await service.detectIntent('Hello');

      expect(result.intent).toBe(MessageIntent.GENERAL);
    });
  });

  describe('analyzeAndRoute', () => {
    const mockMessage: Message = {
      id: 'msg-1',
      conversationId: 'conv-1',
      direction: 'INBOUND',
      content: 'I have an urgent problem with my order!',
      platformMessageId: 'platform-123',
      authorId: null,
      sentiment: null,
      aiGenerated: false,
      metadata: null,
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockLangChainService.analyzeSentiment.mockResolvedValue({
        sentiment: 'negative',
        score: -0.8,
        reasoning: 'Urgent complaint',
      });

      mockLangChainService.getModel.mockReturnValue({
        call: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            intent: 'complaint',
            confidence: 0.9,
            reasoning: 'User has a problem',
          }),
        }),
      });

      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          conversations: [],
        },
        {
          id: 'user-2',
          conversations: [{ id: 'conv-x' }],
        },
      ]);
    });

    it('should analyze and route a message', async () => {
      const result = await service.analyzeAndRoute(
        'workspace-1',
        'conv-1',
        mockMessage,
      );

      expect(result.sentiment).toBe(Sentiment.NEGATIVE);
      expect(result.intent).toBe(MessageIntent.COMPLAINT);
      expect(result.priority).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });

    it('should assign to user with least load', async () => {
      const result = await service.analyzeAndRoute(
        'workspace-1',
        'conv-1',
        mockMessage,
      );

      expect(result.suggestedAssignee).toBe('user-1'); // User with no conversations
    });

    it('should calculate high priority for urgent complaints', async () => {
      const result = await service.analyzeAndRoute(
        'workspace-1',
        'conv-1',
        mockMessage,
      );

      expect([Priority.HIGH, Priority.URGENT]).toContain(result.priority);
    });
  });

  describe('applyRoutingRules', () => {
    const mockRoutingResult = {
      category: MessageCategory.URGENT,
      intent: MessageIntent.COMPLAINT,
      sentiment: Sentiment.NEGATIVE,
      sentimentScore: -0.8,
      priority: Priority.URGENT,
      suggestedAssignee: 'user-1',
      confidence: 0.9,
      reasoning: 'Urgent complaint detected',
    };

    beforeEach(() => {
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        tags: [],
      });

      mockPrismaService.conversation.update.mockResolvedValue({
        id: 'conv-1',
        tags: ['urgent'],
      });
    });

    it('should apply routing rules to conversation', async () => {
      await service.applyRoutingRules(
        'workspace-1',
        'conv-1',
        mockRoutingResult,
      );

      expect(mockPrismaService.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-1' },
          data: expect.objectContaining({
            priority: Priority.URGENT,
            sentiment: Sentiment.NEGATIVE,
          }),
        }),
      );
    });

    it('should add tags from routing rules', async () => {
      await service.applyRoutingRules(
        'workspace-1',
        'conv-1',
        mockRoutingResult,
      );

      expect(mockPrismaService.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: expect.arrayContaining(['urgent']),
          }),
        }),
      );
    });
  });

  describe('batchAnalyze', () => {
    const mockMessages = [
      {
        conversationId: 'conv-1',
        message: {
          id: 'msg-1',
          content: 'Question about pricing',
          direction: 'INBOUND',
        } as Message,
      },
      {
        conversationId: 'conv-2',
        message: {
          id: 'msg-2',
          content: 'This is broken!',
          direction: 'INBOUND',
        } as Message,
      },
    ];

    beforeEach(() => {
      mockLangChainService.analyzeSentiment.mockResolvedValue({
        sentiment: 'neutral',
        score: 0,
        reasoning: 'Neutral',
      });

      mockLangChainService.getModel.mockReturnValue({
        call: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            intent: 'question',
            confidence: 0.8,
            reasoning: 'User asking question',
          }),
        }),
      });

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', conversations: [] },
      ]);
    });

    it('should batch analyze multiple messages', async () => {
      const results = await service.batchAnalyze('workspace-1', mockMessages);

      expect(results.size).toBe(2);
      expect(results.has('conv-1')).toBe(true);
      expect(results.has('conv-2')).toBe(true);
    });

    it('should process messages in batches', async () => {
      const manyMessages = Array.from({ length: 12 }, (_, i) => ({
        conversationId: `conv-${i}`,
        message: {
          id: `msg-${i}`,
          content: 'Test message',
          direction: 'INBOUND',
        } as Message,
      }));

      const results = await service.batchAnalyze('workspace-1', manyMessages);

      expect(results.size).toBe(12);
    });
  });
});
