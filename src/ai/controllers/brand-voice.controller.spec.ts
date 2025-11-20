import { Test, TestingModule } from '@nestjs/testing';
import { BrandVoiceController } from './brand-voice.controller';
import { BrandVoiceService } from '../services/brand-voice.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('BrandVoiceController', () => {
  let controller: BrandVoiceController;
  let service: BrandVoiceService;

  const mockWorkspaceId = 'workspace-123';
  const mockUserId = 'user-123';
  const mockBrandVoiceId = 'bv-123';

  const mockRequest = {
    user: {
      id: mockUserId,
      workspaceId: mockWorkspaceId,
    },
  };

  const mockBrandVoice = {
    id: mockBrandVoiceId,
    workspaceId: mockWorkspaceId,
    name: 'Test Voice',
    description: 'Test description',
    tone: 'friendly',
    vocabulary: ['test', 'example'],
    avoidWords: ['bad'],
    examples: ['This is a test example.'],
    guidelines: 'Test guidelines',
  };

  const mockBrandVoiceService = {
    createBrandVoice: jest.fn(),
    updateBrandVoice: jest.fn(),
    getBrandVoice: jest.fn(),
    getBrandVoices: jest.fn(),
    deleteBrandVoice: jest.fn(),
    getDefaultBrandVoice: jest.fn(),
    checkBrandVoiceConsistency: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandVoiceController],
      providers: [
        {
          provide: BrandVoiceService,
          useValue: mockBrandVoiceService,
        },
      ],
    }).compile();

    controller = module.get<BrandVoiceController>(BrandVoiceController);
    service = module.get<BrandVoiceService>(BrandVoiceService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createBrandVoice', () => {
    it('should create a brand voice profile', async () => {
      const dto = {
        name: 'Test Voice',
        description: 'Test description',
        tone: 'friendly',
        vocabulary: ['test', 'example'],
        avoidWords: ['bad'],
        examples: ['This is a test example.'],
        guidelines: 'Test guidelines',
        isDefault: true,
      };

      mockBrandVoiceService.createBrandVoice.mockResolvedValue(mockBrandVoice);

      const result = await controller.createBrandVoice(mockRequest, dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBrandVoice);
      expect(service.createBrandVoice).toHaveBeenCalledWith({
        workspaceId: mockWorkspaceId,
        ...dto,
      });
    });
  });

  describe('getBrandVoices', () => {
    it('should return all brand voices for workspace', async () => {
      const mockVoices = [mockBrandVoice];
      mockBrandVoiceService.getBrandVoices.mockResolvedValue(mockVoices);

      const result = await controller.getBrandVoices(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockVoices);
      expect(result.count).toBe(1);
      expect(service.getBrandVoices).toHaveBeenCalledWith(mockWorkspaceId);
    });
  });

  describe('getDefaultBrandVoice', () => {
    it('should return the default brand voice', async () => {
      mockBrandVoiceService.getDefaultBrandVoice.mockResolvedValue(mockBrandVoice);

      const result = await controller.getDefaultBrandVoice(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBrandVoice);
      expect(service.getDefaultBrandVoice).toHaveBeenCalledWith(mockWorkspaceId);
    });

    it('should return null if no default found', async () => {
      mockBrandVoiceService.getDefaultBrandVoice.mockResolvedValue(null);

      const result = await controller.getDefaultBrandVoice(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('getBrandVoice', () => {
    it('should return a brand voice by ID', async () => {
      mockBrandVoiceService.getBrandVoice.mockResolvedValue(mockBrandVoice);

      const result = await controller.getBrandVoice(mockRequest, mockBrandVoiceId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBrandVoice);
      expect(service.getBrandVoice).toHaveBeenCalledWith(
        mockBrandVoiceId,
        mockWorkspaceId,
      );
    });

    it('should throw NotFoundException if not found', async () => {
      mockBrandVoiceService.getBrandVoice.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        controller.getBrandVoice(mockRequest, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if workspace mismatch', async () => {
      mockBrandVoiceService.getBrandVoice.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        controller.getBrandVoice(mockRequest, mockBrandVoiceId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateBrandVoice', () => {
    it('should update a brand voice profile', async () => {
      const dto = {
        name: 'Updated Name',
      };

      const updatedVoice = { ...mockBrandVoice, name: 'Updated Name' };
      mockBrandVoiceService.updateBrandVoice.mockResolvedValue(updatedVoice);

      const result = await controller.updateBrandVoice(
        mockRequest,
        mockBrandVoiceId,
        dto,
      );

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Name');
      expect(service.updateBrandVoice).toHaveBeenCalledWith(
        mockBrandVoiceId,
        mockWorkspaceId,
        dto,
      );
    });
  });

  describe('deleteBrandVoice', () => {
    it('should delete a brand voice profile', async () => {
      mockBrandVoiceService.deleteBrandVoice.mockResolvedValue(undefined);

      await controller.deleteBrandVoice(mockRequest, mockBrandVoiceId);

      expect(service.deleteBrandVoice).toHaveBeenCalledWith(
        mockBrandVoiceId,
        mockWorkspaceId,
      );
    });
  });

  describe('checkBrandVoice', () => {
    it('should check content against brand voice', async () => {
      const dto = {
        content: 'This is test content.',
        brandVoiceId: mockBrandVoiceId,
      };

      const checkResult = {
        score: 85,
        issues: [],
        suggestions: [],
      };

      mockBrandVoiceService.checkBrandVoiceConsistency.mockResolvedValue(
        checkResult,
      );

      const result = await controller.checkBrandVoice(mockRequest, dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(checkResult);
      expect(service.checkBrandVoiceConsistency).toHaveBeenCalledWith(
        dto.content,
        dto.brandVoiceId,
        mockWorkspaceId,
      );
    });

    it('should return low score for content with avoided words', async () => {
      const dto = {
        content: 'This is bad content.',
        brandVoiceId: mockBrandVoiceId,
      };

      const checkResult = {
        score: 50,
        issues: ['Contains words to avoid: bad'],
        suggestions: ['Remove or replace: bad'],
      };

      mockBrandVoiceService.checkBrandVoiceConsistency.mockResolvedValue(
        checkResult,
      );

      const result = await controller.checkBrandVoice(mockRequest, dto);

      expect(result.data.score).toBeLessThan(100);
      expect(result.data.issues.length).toBeGreaterThan(0);
    });
  });
});
