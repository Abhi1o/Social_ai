import { Test, TestingModule } from '@nestjs/testing';
import { BrandVoiceService } from './brand-voice.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('BrandVoiceService', () => {
  let service: BrandVoiceService;
  let prisma: PrismaService;

  const mockWorkspaceId = 'workspace-123';
  const mockBrandVoiceId = 'bv-123';

  const mockBrandVoice = {
    id: mockBrandVoiceId,
    workspaceId: mockWorkspaceId,
    name: 'Tech Startup Voice',
    description: 'Friendly and innovative',
    tone: 'friendly',
    vocabulary: ['innovative', 'cutting-edge', 'seamless'],
    avoidWords: ['cheap', 'basic'],
    examples: [
      'We empower teams to build innovative solutions.',
      'Our cutting-edge platform makes collaboration seamless.',
    ],
    guidelines: 'Use active voice',
    isDefault: true,
    isActive: true,
    trainingData: {
      patterns: {
        sentenceStructure: ['medium', 'medium'],
        commonPhrases: ['cutting-edge platform'],
        punctuationStyle: 'formal',
        averageWordLength: 5.5,
        vocabularyComplexity: 'medium',
      },
      analyzedAt: new Date(),
    },
    consistencyScore: 85,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    brandVoice: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandVoiceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BrandVoiceService>(BrandVoiceService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBrandVoice', () => {
    it('should create a brand voice profile with training data', async () => {
      mockPrismaService.brandVoice.create.mockResolvedValue(mockBrandVoice);

      const result = await service.createBrandVoice({
        workspaceId: mockWorkspaceId,
        name: 'Tech Startup Voice',
        description: 'Friendly and innovative',
        tone: 'friendly',
        vocabulary: ['innovative', 'cutting-edge', 'seamless'],
        avoidWords: ['cheap', 'basic'],
        examples: [
          'We empower teams to build innovative solutions.',
          'Our cutting-edge platform makes collaboration seamless.',
        ],
        guidelines: 'Use active voice',
        isDefault: true,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Tech Startup Voice');
      expect(prisma.brandVoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: mockWorkspaceId,
            name: 'Tech Startup Voice',
            tone: 'friendly',
            isDefault: true,
          }),
        }),
      );
    });

    it('should throw BadRequestException if no examples provided', async () => {
      await expect(
        service.createBrandVoice({
          workspaceId: mockWorkspaceId,
          name: 'Test Voice',
          tone: 'casual',
          examples: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should unset other default brand voices when setting new default', async () => {
      mockPrismaService.brandVoice.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.brandVoice.create.mockResolvedValue(mockBrandVoice);

      await service.createBrandVoice({
        workspaceId: mockWorkspaceId,
        name: 'New Default',
        tone: 'professional',
        examples: ['Example content'],
        isDefault: true,
      });

      expect(prisma.brandVoice.updateMany).toHaveBeenCalledWith({
        where: {
          workspaceId: mockWorkspaceId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    });
  });

  describe('updateBrandVoice', () => {
    it('should update an existing brand voice', async () => {
      mockPrismaService.brandVoice.findUnique.mockResolvedValue(mockBrandVoice);
      mockPrismaService.brandVoice.update.mockResolvedValue({
        ...mockBrandVoice,
        name: 'Updated Name',
      });

      const result = await service.updateBrandVoice(
        mockBrandVoiceId,
        mockWorkspaceId,
        {
          name: 'Updated Name',
        },
      );

      expect(result.name).toBe('Updated Name');
      expect(prisma.brandVoice.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if brand voice not found', async () => {
      mockPrismaService.brandVoice.findUnique.mockResolvedValue(null);

      await expect(
        service.updateBrandVoice(mockBrandVoiceId, mockWorkspaceId, {
          name: 'Updated',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if workspace mismatch', async () => {
      mockPrismaService.brandVoice.findUnique.mockResolvedValue({
        ...mockBrandVoice,
        workspaceId: 'different-workspace',
      });

      await expect(
        service.updateBrandVoice(mockBrandVoiceId, mockWorkspaceId, {
          name: 'Updated',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should re-analyze training data when examples change', async () => {
      mockPrismaService.brandVoice.findUnique.mockResolvedValue(mockBrandVoice);
      mockPrismaService.brandVoice.update.mockResolvedValue(mockBrandVoice);

      await service.updateBrandVoice(mockBrandVoiceId, mockWorkspaceId, {
        examples: ['New example content for training.'],
      });

      expect(prisma.brandVoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            examples: ['New example content for training.'],
            trainingData: expect.any(Object),
            consistencyScore: expect.any(Number),
          }),
        }),
      );
    });
  });

  describe('getBrandVoice', () => {
    it('should return a brand voice by ID', async () => {
      mockPrismaService.brandVoice.findUnique.mockResolvedValue(mockBrandVoice);

      const result = await service.getBrandVoice(
        mockBrandVoiceId,
        mockWorkspaceId,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(mockBrandVoiceId);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.brandVoice.findUnique.mockResolvedValue(null);

      await expect(
        service.getBrandVoice(mockBrandVoiceId, mockWorkspaceId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if workspace mismatch', async () => {
      mockPrismaService.brandVoice.findUnique.mockResolvedValue({
        ...mockBrandVoice,
        workspaceId: 'different-workspace',
      });

      await expect(
        service.getBrandVoice(mockBrandVoiceId, mockWorkspaceId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getBrandVoices', () => {
    it('should return all brand voices for a workspace', async () => {
      mockPrismaService.brandVoice.findMany.mockResolvedValue([
        mockBrandVoice,
        { ...mockBrandVoice, id: 'bv-456', isDefault: false },
      ]);

      const result = await service.getBrandVoices(mockWorkspaceId);

      expect(result).toHaveLength(2);
      expect(prisma.brandVoice.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: mockWorkspaceId,
          isActive: true,
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('deleteBrandVoice', () => {
    it('should delete a brand voice', async () => {
      mockPrismaService.brandVoice.findUnique.mockResolvedValue(mockBrandVoice);
      mockPrismaService.brandVoice.delete.mockResolvedValue(mockBrandVoice);

      await service.deleteBrandVoice(mockBrandVoiceId, mockWorkspaceId);

      expect(prisma.brandVoice.delete).toHaveBeenCalledWith({
        where: { id: mockBrandVoiceId },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.brandVoice.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteBrandVoice(mockBrandVoiceId, mockWorkspaceId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDefaultBrandVoice', () => {
    it('should return the default brand voice', async () => {
      mockPrismaService.brandVoice.findFirst.mockResolvedValue(mockBrandVoice);

      const result = await service.getDefaultBrandVoice(mockWorkspaceId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockBrandVoiceId);
      expect(prisma.brandVoice.findFirst).toHaveBeenCalledWith({
        where: {
          workspaceId: mockWorkspaceId,
          isDefault: true,
          isActive: true,
        },
      });
    });

    it('should return null if no default found', async () => {
      mockPrismaService.brandVoice.findFirst.mockResolvedValue(null);

      const result = await service.getDefaultBrandVoice(mockWorkspaceId);

      expect(result).toBeNull();
    });
  });

  describe('checkBrandVoiceConsistency', () => {
    beforeEach(() => {
      mockPrismaService.brandVoice.findUnique
        .mockResolvedValueOnce(mockBrandVoice)
        .mockResolvedValueOnce({
          ...mockBrandVoice,
          trainingData: mockBrandVoice.trainingData,
        });
    });

    it('should check content against brand voice', async () => {
      const content = 'We empower teams with innovative solutions.';

      const result = await service.checkBrandVoiceConsistency(
        content,
        mockBrandVoiceId,
        mockWorkspaceId,
      );

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should detect avoided words', async () => {
      const content = 'This is a cheap and basic solution.';

      const result = await service.checkBrandVoiceConsistency(
        content,
        mockBrandVoiceId,
        mockWorkspaceId,
      );

      expect(result.score).toBeLessThan(100);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('avoid');
    });

    it('should suggest preferred vocabulary', async () => {
      const content = 'This is a good product.';

      const result = await service.checkBrandVoiceConsistency(
        content,
        mockBrandVoiceId,
        mockWorkspaceId,
      );

      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });
});
