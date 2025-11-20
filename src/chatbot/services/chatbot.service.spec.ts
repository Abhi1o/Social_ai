import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotService } from './chatbot.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Platform, EntityType, FlowTriggerType } from '@prisma/client';

describe('ChatbotService', () => {
  let service: ChatbotService;
  let prisma: PrismaService;

  const mockPrismaService = {
    chatbot: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    chatbotFlow: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    chatbotIntent: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    chatbotEntity: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a chatbot', async () => {
      const workspaceId = 'workspace-123';
      const userId = 'user-123';
      const dto = {
        name: 'Test Chatbot',
        description: 'Test description',
        platforms: [Platform.INSTAGRAM],
        accountIds: ['account-123'],
        greeting: 'Hello!',
        fallbackMessage: 'Sorry, I did not understand.',
        confidenceThreshold: 0.7,
        language: 'en',
        isActive: true,
      };

      const expectedResult = {
        id: 'chatbot-123',
        ...dto,
        workspaceId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.chatbot.create.mockResolvedValue(expectedResult);

      const result = await service.create(workspaceId, userId, dto);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.chatbot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId,
          name: dto.name,
          platforms: dto.platforms,
          createdBy: userId,
        }),
        include: {
          flows: true,
          intents: true,
          entities: true,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all chatbots for a workspace', async () => {
      const workspaceId = 'workspace-123';
      const expectedResult = [
        {
          id: 'chatbot-1',
          name: 'Chatbot 1',
          workspaceId,
        },
        {
          id: 'chatbot-2',
          name: 'Chatbot 2',
          workspaceId,
        },
      ];

      mockPrismaService.chatbot.findMany.mockResolvedValue(expectedResult);

      const result = await service.findAll(workspaceId);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.chatbot.findMany).toHaveBeenCalledWith({
        where: { workspaceId },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createIntent', () => {
    it('should create an intent', async () => {
      const chatbotId = 'chatbot-123';
      const workspaceId = 'workspace-123';
      const dto = {
        name: 'greeting',
        description: 'Greeting intent',
        trainingPhrases: ['hello', 'hi'],
        responses: ['Hello!', 'Hi there!'],
        priority: 10,
        isActive: true,
      };

      mockPrismaService.chatbot.findFirst.mockResolvedValue({
        id: chatbotId,
        workspaceId,
      });

      mockPrismaService.chatbotIntent.findFirst.mockResolvedValue(null);

      const expectedResult = {
        id: 'intent-123',
        chatbotId,
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.chatbotIntent.create.mockResolvedValue(expectedResult);

      const result = await service.createIntent(chatbotId, workspaceId, dto);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.chatbotIntent.create).toHaveBeenCalled();
    });

    it('should throw error if intent name already exists', async () => {
      const chatbotId = 'chatbot-123';
      const workspaceId = 'workspace-123';
      const dto = {
        name: 'greeting',
        description: 'Greeting intent',
        trainingPhrases: ['hello'],
        responses: ['Hello!'],
        priority: 10,
        isActive: true,
      };

      mockPrismaService.chatbot.findFirst.mockResolvedValue({
        id: chatbotId,
        workspaceId,
      });

      mockPrismaService.chatbotIntent.findFirst.mockResolvedValue({
        id: 'existing-intent',
        name: 'greeting',
      });

      await expect(
        service.createIntent(chatbotId, workspaceId, dto),
      ).rejects.toThrow('Intent with this name already exists');
    });
  });

  describe('createEntity', () => {
    it('should create an entity', async () => {
      const chatbotId = 'chatbot-123';
      const workspaceId = 'workspace-123';
      const dto = {
        name: 'product_name',
        description: 'Product name',
        type: EntityType.CUSTOM_LIST,
        values: [{ value: 'iPhone', synonyms: ['iphone'] }],
        isRequired: false,
      };

      mockPrismaService.chatbot.findFirst.mockResolvedValue({
        id: chatbotId,
        workspaceId,
      });

      mockPrismaService.chatbotEntity.findFirst.mockResolvedValue(null);

      const expectedResult = {
        id: 'entity-123',
        chatbotId,
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.chatbotEntity.create.mockResolvedValue(expectedResult);

      const result = await service.createEntity(chatbotId, workspaceId, dto);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.chatbotEntity.create).toHaveBeenCalled();
    });
  });

  describe('createFlow', () => {
    it('should create a flow', async () => {
      const chatbotId = 'chatbot-123';
      const workspaceId = 'workspace-123';
      const dto = {
        name: 'Greeting Flow',
        description: 'Simple greeting flow',
        triggerType: FlowTriggerType.INTENT,
        triggerValue: 'greeting',
        nodes: [
          { id: 'start', type: 'start', data: {} },
          { id: 'end', type: 'end', data: {} },
        ],
        edges: [{ id: 'e1', source: 'start', target: 'end' }],
        priority: 10,
        isActive: true,
      };

      mockPrismaService.chatbot.findFirst.mockResolvedValue({
        id: chatbotId,
        workspaceId,
      });

      const expectedResult = {
        id: 'flow-123',
        chatbotId,
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.chatbotFlow.create.mockResolvedValue(expectedResult);

      const result = await service.createFlow(chatbotId, workspaceId, dto);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.chatbotFlow.create).toHaveBeenCalled();
    });
  });

  describe('trainChatbot', () => {
    it('should train a chatbot', async () => {
      const chatbotId = 'chatbot-123';
      const workspaceId = 'workspace-123';

      mockPrismaService.chatbot.findFirst.mockResolvedValue({
        id: chatbotId,
        workspaceId,
      });

      mockPrismaService.chatbot.update.mockResolvedValue({
        id: chatbotId,
        isTraining: false,
      });

      mockPrismaService.chatbotIntent.updateMany.mockResolvedValue({
        count: 5,
      });

      const result = await service.trainChatbot(chatbotId, workspaceId);

      expect(result.success).toBe(true);
      expect(mockPrismaService.chatbot.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.chatbotIntent.updateMany).toHaveBeenCalled();
    });
  });
});
