import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ListeningQueryService } from './listening-query.service';
import { BooleanQueryBuilderService } from './boolean-query-builder.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Platform } from '@prisma/client';

describe('ListeningQueryService', () => {
  let service: ListeningQueryService;
  let prisma: PrismaService;
  let queryBuilder: BooleanQueryBuilderService;

  const mockPrismaService = {
    listeningQuery: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    listeningMention: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockQueryBuilder = {
    validate: jest.fn(),
    parse: jest.fn(),
    toPlatformQuery: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListeningQueryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: BooleanQueryBuilderService,
          useValue: mockQueryBuilder,
        },
      ],
    }).compile();

    service = module.get<ListeningQueryService>(ListeningQueryService);
    prisma = module.get<PrismaService>(PrismaService);
    queryBuilder = module.get<BooleanQueryBuilderService>(BooleanQueryBuilderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const workspaceId = 'workspace-1';
    const createDto = {
      name: 'Brand Monitoring',
      description: 'Monitor brand mentions',
      keywords: ['brand', 'product'],
      query: 'brand OR product',
      platforms: [Platform.TWITTER, Platform.INSTAGRAM],
      languages: ['en', 'es'],
      locations: ['US', 'UK'],
      excludeKeywords: ['spam'],
      includeRetweets: true,
      minFollowers: 100,
      alertsEnabled: true,
      alertThreshold: 50,
      alertRecipients: ['admin@example.com'],
    };

    it('should create a listening query', async () => {
      mockQueryBuilder.validate.mockReturnValue({ valid: true, errors: [] });
      mockQueryBuilder.parse.mockReturnValue({
        root: {},
        keywords: ['brand', 'product'],
        phrases: [],
        excludedTerms: [],
      });

      const expectedQuery = {
        id: 'query-1',
        ...createDto,
        workspaceId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.listeningQuery.create.mockResolvedValue(expectedQuery);

      const result = await service.create(workspaceId, createDto);

      expect(result).toEqual(expectedQuery);
      expect(mockQueryBuilder.validate).toHaveBeenCalledWith(createDto.query);
      expect(mockPrismaService.listeningQuery.create).toHaveBeenCalled();
    });

    it('should throw error for invalid query', async () => {
      mockQueryBuilder.validate.mockReturnValue({
        valid: false,
        errors: ['Invalid syntax'],
      });

      await expect(service.create(workspaceId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for unsupported language', async () => {
      mockQueryBuilder.validate.mockReturnValue({ valid: true, errors: [] });

      const invalidDto = {
        ...createDto,
        languages: ['xx', 'yy'], // Invalid language codes
      };

      await expect(service.create(workspaceId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for empty platforms', async () => {
      mockQueryBuilder.validate.mockReturnValue({ valid: true, errors: [] });

      const invalidDto = {
        ...createDto,
        platforms: [],
      };

      await expect(service.create(workspaceId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    const workspaceId = 'workspace-1';

    it('should return all active queries', async () => {
      const queries = [
        {
          id: 'query-1',
          name: 'Query 1',
          isActive: true,
          _count: { mentions: 10, alerts: 2 },
        },
        {
          id: 'query-2',
          name: 'Query 2',
          isActive: true,
          _count: { mentions: 5, alerts: 0 },
        },
      ];

      mockPrismaService.listeningQuery.findMany.mockResolvedValue(queries);

      const result = await service.findAll(workspaceId);

      expect(result).toEqual(queries);
      expect(mockPrismaService.listeningQuery.findMany).toHaveBeenCalledWith({
        where: { workspaceId, isActive: true },
        include: {
          _count: {
            select: {
              mentions: true,
              alerts: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should include inactive queries when requested', async () => {
      mockPrismaService.listeningQuery.findMany.mockResolvedValue([]);

      await service.findAll(workspaceId, true);

      expect(mockPrismaService.listeningQuery.findMany).toHaveBeenCalledWith({
        where: { workspaceId },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });
  });

  describe('findOne', () => {
    const queryId = 'query-1';
    const workspaceId = 'workspace-1';

    it('should return a query by ID', async () => {
      const query = {
        id: queryId,
        workspaceId,
        name: 'Test Query',
        _count: { mentions: 10, alerts: 2 },
      };

      mockPrismaService.listeningQuery.findUnique.mockResolvedValue(query);

      const result = await service.findOne(queryId, workspaceId);

      expect(result).toEqual(query);
    });

    it('should throw NotFoundException if query not found', async () => {
      mockPrismaService.listeningQuery.findUnique.mockResolvedValue(null);

      await expect(service.findOne(queryId, workspaceId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for wrong workspace', async () => {
      const query = {
        id: queryId,
        workspaceId: 'other-workspace',
        name: 'Test Query',
      };

      mockPrismaService.listeningQuery.findUnique.mockResolvedValue(query);

      await expect(service.findOne(queryId, workspaceId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const queryId = 'query-1';
    const workspaceId = 'workspace-1';

    it('should update a query', async () => {
      const existingQuery = {
        id: queryId,
        workspaceId,
        name: 'Old Name',
      };

      const updateDto: any = {
        name: 'New Name',
        description: 'Updated description',
      };

      const updatedQuery = {
        ...existingQuery,
        ...updateDto,
      };

      mockPrismaService.listeningQuery.findUnique.mockResolvedValue(existingQuery);
      mockPrismaService.listeningQuery.update.mockResolvedValue(updatedQuery);

      const result = await service.update(queryId, workspaceId, updateDto);

      expect(result).toEqual(updatedQuery);
      expect(mockPrismaService.listeningQuery.update).toHaveBeenCalled();
    });

    it('should validate query if provided in update', async () => {
      const existingQuery = {
        id: queryId,
        workspaceId,
        name: 'Test Query',
      };

      const updateDto: any = {
        query: 'brand AND product',
      };

      mockPrismaService.listeningQuery.findUnique.mockResolvedValue(existingQuery);
      mockQueryBuilder.validate.mockReturnValue({ valid: true, errors: [] });
      mockPrismaService.listeningQuery.update.mockResolvedValue({
        ...existingQuery,
        ...updateDto,
      });

      await service.update(queryId, workspaceId, updateDto);

      expect(mockQueryBuilder.validate).toHaveBeenCalledWith(updateDto.query);
    });
  });

  describe('remove', () => {
    const queryId = 'query-1';
    const workspaceId = 'workspace-1';

    it('should delete a query', async () => {
      const query = {
        id: queryId,
        workspaceId,
        name: 'Test Query',
      };

      mockPrismaService.listeningQuery.findUnique.mockResolvedValue(query);
      mockPrismaService.listeningQuery.delete.mockResolvedValue(query);

      const result = await service.remove(queryId, workspaceId);

      expect(result.message).toBe('Listening query deleted successfully');
      expect(mockPrismaService.listeningQuery.delete).toHaveBeenCalledWith({
        where: { id: queryId },
      });
    });
  });

  describe('activate/deactivate', () => {
    const queryId = 'query-1';
    const workspaceId = 'workspace-1';

    it('should activate a query', async () => {
      const query = {
        id: queryId,
        workspaceId,
        isActive: false,
      };

      mockPrismaService.listeningQuery.findUnique.mockResolvedValue(query);
      mockPrismaService.listeningQuery.update.mockResolvedValue({
        ...query,
        isActive: true,
      });

      const result = await service.activate(queryId, workspaceId);

      expect(result.isActive).toBe(true);
    });

    it('should deactivate a query', async () => {
      const query = {
        id: queryId,
        workspaceId,
        isActive: true,
      };

      mockPrismaService.listeningQuery.findUnique.mockResolvedValue(query);
      mockPrismaService.listeningQuery.update.mockResolvedValue({
        ...query,
        isActive: false,
      });

      const result = await service.deactivate(queryId, workspaceId);

      expect(result.isActive).toBe(false);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const result = service.getSupportedLanguages();

      expect(result.languages).toBeDefined();
      expect(result.count).toBeGreaterThan(40);
      expect(result.languages).toContain('en');
      expect(result.languages).toContain('es');
      expect(result.languages).toContain('fr');
    });
  });

  describe('validateQuery', () => {
    it('should validate and parse a query', () => {
      const query = 'brand AND product';

      mockQueryBuilder.validate.mockReturnValue({ valid: true, errors: [] });
      mockQueryBuilder.parse.mockReturnValue({
        root: {},
        keywords: ['brand', 'product'],
        phrases: [],
        excludedTerms: [],
      });

      const result = service.validateQuery(query);

      expect(result.valid).toBe(true);
      expect(result.parsed).toBeDefined();
      expect(result.parsed?.keywords).toContain('brand');
      expect(result.parsed?.keywords).toContain('product');
    });

    it('should return errors for invalid query', () => {
      const query = '(brand AND';

      mockQueryBuilder.validate.mockReturnValue({
        valid: false,
        errors: ['Unbalanced parentheses'],
      });

      const result = service.validateQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unbalanced parentheses');
    });
  });
});
