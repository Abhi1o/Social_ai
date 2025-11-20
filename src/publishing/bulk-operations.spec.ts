import { Test, TestingModule } from '@nestjs/testing';
import { PublishingService } from './publishing.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformPublisherFactory } from './adapters/platform-publisher.factory';
import { Platform, PostStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('PublishingService - Bulk Operations', () => {
  let service: PublishingService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    socialAccount: {
      findMany: jest.fn(),
    },
    mediaAsset: {
      findMany: jest.fn(),
    },
    campaign: {
      findFirst: jest.fn(),
    },
    platformPost: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPublisherFactory = {
    getPublisher: jest.fn().mockReturnValue({
      validateContent: jest.fn().mockResolvedValue([]),
      formatContent: jest.fn().mockResolvedValue({}),
      publishPost: jest.fn().mockResolvedValue({
        success: true,
        platformPostId: 'platform-123',
        url: 'https://example.com/post',
        publishedAt: new Date(),
      }),
      deletePost: jest.fn().mockResolvedValue(undefined),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PlatformPublisherFactory,
          useValue: mockPublisherFactory,
        },
      ],
    }).compile();

    service = module.get<PublishingService>(PublishingService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('bulkScheduleFromCsv', () => {
    it('should successfully schedule posts from valid CSV', async () => {
      const csvContent = `text,platforms,accountIds
"Test post 1",INSTAGRAM,account-123
"Test post 2",FACEBOOK,account-456`;

      // Mock for first post
      mockPrismaService.socialAccount.findMany
        .mockResolvedValueOnce([
          { id: 'account-123', platform: Platform.INSTAGRAM, isActive: true, workspaceId: 'workspace-123' },
        ])
        .mockResolvedValueOnce([
          { id: 'account-456', platform: Platform.FACEBOOK, isActive: true, workspaceId: 'workspace-123' },
        ]);

      mockPrismaService.post.create
        .mockResolvedValueOnce({
          id: 'post-123',
          content: { text: 'Test post 1' },
          status: PostStatus.DRAFT,
          platformPosts: [],
          mediaAssets: [],
          author: { id: 'user-123', name: 'Test User', email: 'test@example.com', avatar: null },
        })
        .mockResolvedValueOnce({
          id: 'post-456',
          content: { text: 'Test post 2' },
          status: PostStatus.DRAFT,
          platformPosts: [],
          mediaAssets: [],
          author: { id: 'user-123', name: 'Test User', email: 'test@example.com', avatar: null },
        });

      const result = await service.bulkScheduleFromCsv(
        'workspace-123',
        'user-123',
        csvContent,
      );

      expect(result.success).toBe(true);
      expect(result.totalPosts).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(mockPrismaService.post.create).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk schedule', async () => {
      const csvContent = `text,platforms,accountIds
"Test post 1",INSTAGRAM,account-123
"Test post 2",FACEBOOK,invalid-account`;

      mockPrismaService.socialAccount.findMany
        .mockResolvedValueOnce([
          { id: 'account-123', platform: Platform.INSTAGRAM, isActive: true },
        ])
        .mockResolvedValueOnce([]);

      mockPrismaService.post.create.mockResolvedValueOnce({
        id: 'post-123',
        content: { text: 'Test post 1' },
        status: PostStatus.DRAFT,
      });

      const result = await service.bulkScheduleFromCsv(
        'workspace-123',
        'user-123',
        csvContent,
      );

      expect(result.success).toBe(false);
      expect(result.totalPosts).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeDefined();
    });

    it('should reject invalid CSV structure', async () => {
      const csvContent = `text,platforms
"Test post",INSTAGRAM`;

      await expect(
        service.bulkScheduleFromCsv('workspace-123', 'user-123', csvContent),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkEditPosts', () => {
    it('should successfully edit multiple posts', async () => {
      const postIds = ['post-1', 'post-2'];
      const editDto = {
        postIds,
        scheduledAt: '2024-12-25T10:00:00Z',
        tags: ['updated', 'bulk'],
      };

      mockPrismaService.post.findMany.mockResolvedValue([
        {
          id: 'post-1',
          status: PostStatus.DRAFT,
          platformPosts: [],
        },
        {
          id: 'post-2',
          status: PostStatus.DRAFT,
          platformPosts: [],
        },
      ]);

      mockPrismaService.post.update.mockResolvedValue({
        id: 'post-1',
        status: PostStatus.SCHEDULED,
      });

      const result = await service.bulkEditPosts('workspace-123', editDto);

      expect(result.success).toBe(true);
      expect(result.totalPosts).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(mockPrismaService.post.update).toHaveBeenCalledTimes(2);
    });

    it('should reject editing published posts', async () => {
      const postIds = ['post-1'];
      const editDto = {
        postIds,
        scheduledAt: '2024-12-25T10:00:00Z',
      };

      mockPrismaService.post.findMany.mockResolvedValue([
        {
          id: 'post-1',
          status: PostStatus.PUBLISHED,
          platformPosts: [],
        },
      ]);

      await expect(
        service.bulkEditPosts('workspace-123', editDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle platform changes in bulk edit', async () => {
      const postIds = ['post-1'];
      const editDto = {
        postIds,
        platforms: [Platform.INSTAGRAM, Platform.FACEBOOK],
      };

      mockPrismaService.post.findMany.mockResolvedValue([
        {
          id: 'post-1',
          status: PostStatus.DRAFT,
          platformPosts: [
            { platform: Platform.INSTAGRAM },
            { platform: Platform.TWITTER },
          ],
        },
      ]);

      mockPrismaService.socialAccount.findMany.mockResolvedValue([
        { id: 'account-1', platform: Platform.FACEBOOK, isActive: true },
      ]);

      mockPrismaService.platformPost.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.platformPost.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.post.update.mockResolvedValue({ id: 'post-1' });

      const result = await service.bulkEditPosts('workspace-123', editDto);

      expect(result.success).toBe(true);
      expect(mockPrismaService.platformPost.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.platformPost.createMany).toHaveBeenCalled();
    });
  });

  describe('bulkDeletePosts', () => {
    it('should successfully delete multiple posts', async () => {
      const postIds = ['post-1', 'post-2'];
      const deleteDto = {
        postIds,
        confirmed: true,
      };

      mockPrismaService.post.findMany.mockResolvedValue([
        {
          id: 'post-1',
          status: PostStatus.DRAFT,
          platformPosts: [],
        },
        {
          id: 'post-2',
          status: PostStatus.DRAFT,
          platformPosts: [],
        },
      ]);

      mockPrismaService.post.delete.mockResolvedValue({ id: 'post-1' });

      const result = await service.bulkDeletePosts('workspace-123', deleteDto);

      expect(result.success).toBe(true);
      expect(result.totalPosts).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(mockPrismaService.post.delete).toHaveBeenCalledTimes(2);
    });

    it('should require confirmation for bulk delete', async () => {
      const deleteDto = {
        postIds: ['post-1'],
        confirmed: false,
      };

      await expect(
        service.bulkDeletePosts('workspace-123', deleteDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle deletion of published posts', async () => {
      const postIds = ['post-1'];
      const deleteDto = {
        postIds,
        confirmed: true,
      };

      mockPrismaService.post.findMany.mockResolvedValue([
        {
          id: 'post-1',
          status: PostStatus.PUBLISHED,
          platformPosts: [
            {
              id: 'pp-1',
              platform: Platform.INSTAGRAM,
              publishStatus: 'PUBLISHED',
              platformPostId: 'platform-123',
              account: {
                platformAccountId: 'account-123',
                accessToken: 'token',
              },
            },
          ],
        },
      ]);

      mockPrismaService.post.delete.mockResolvedValue({ id: 'post-1' });

      const result = await service.bulkDeletePosts('workspace-123', deleteDto);

      expect(result.success).toBe(true);
      expect(mockPublisherFactory.getPublisher).toHaveBeenCalled();
    });
  });

  describe('exportPosts', () => {
    it('should export posts with filters', async () => {
      const exportDto = {
        status: PostStatus.PUBLISHED,
        platform: Platform.INSTAGRAM,
      };

      mockPrismaService.post.findMany.mockResolvedValue([
        {
          id: 'post-1',
          content: { text: 'Test post' },
          status: PostStatus.PUBLISHED,
          platformPosts: [
            {
              platform: Platform.INSTAGRAM,
              accountId: 'account-1',
              account: { username: 'testuser' },
            },
          ],
          mediaAssets: [],
          tags: [],
          aiGenerated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.exportPosts('workspace-123', exportDto);

      expect(result).toContain('ID,Text,Platforms');
      expect(result).toContain('post-1');
      expect(result).toContain('Test post');
    });
  });

  describe('getCsvTemplate', () => {
    it('should return CSV template', () => {
      const template = service.getCsvTemplate();

      expect(template).toContain('text,platforms,accountIds');
      expect(template).toContain('Check out our new product launch!');
    });
  });
});
