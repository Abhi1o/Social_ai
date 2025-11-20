import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformPublisherFactory } from './adapters/platform-publisher.factory';
import { Platform, PostStatus, PublishStatus } from '@prisma/client';
import { CreatePostDto } from './dto/create-post.dto';

describe('PublishingService', () => {
  let service: PublishingService;
  let prismaService: PrismaService;
  let publisherFactory: PlatformPublisherFactory;

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
      update: jest.fn(),
    },
  };

  const mockPublisher = {
    platform: Platform.INSTAGRAM,
    validateContent: jest.fn().mockResolvedValue([]),
    formatContent: jest.fn().mockImplementation(content => Promise.resolve(content)),
    publishPost: jest.fn().mockResolvedValue({
      success: true,
      platformPostId: 'platform-123',
      url: 'https://instagram.com/p/123',
      publishedAt: new Date(),
    }),
    deletePost: jest.fn().mockResolvedValue(undefined),
  };

  const mockPublisherFactory = {
    getPublisher: jest.fn().mockReturnValue(mockPublisher),
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
    publisherFactory = module.get<PlatformPublisherFactory>(PlatformPublisherFactory);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPost', () => {
    const workspaceId = 'workspace-123';
    const authorId = 'user-123';
    const createPostDto: CreatePostDto = {
      content: {
        text: 'Test post',
        media: [],
        hashtags: ['test'],
        mentions: [],
      },
      platforms: [
        {
          platform: Platform.INSTAGRAM,
          accountId: 'account-123',
        },
      ],
    };

    it('should create a post successfully', async () => {
      const mockAccount = {
        id: 'account-123',
        workspaceId,
        isActive: true,
      };

      const mockPost = {
        id: 'post-123',
        workspaceId,
        authorId,
        content: createPostDto.content,
        status: PostStatus.DRAFT,
        platformPosts: [],
        mediaAssets: [],
        author: { id: authorId, name: 'Test User', email: 'test@example.com' },
      };

      mockPrismaService.socialAccount.findMany.mockResolvedValue([mockAccount]);
      mockPrismaService.post.create.mockResolvedValue(mockPost);

      const result = await service.createPost(workspaceId, authorId, createPostDto);

      expect(result).toEqual(mockPost);
      expect(mockPrismaService.socialAccount.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['account-123'] },
          workspaceId,
          isActive: true,
        },
      });
      expect(mockPublisher.validateContent).toHaveBeenCalled();
    });

    it('should throw BadRequestException if account not found', async () => {
      mockPrismaService.socialAccount.findMany.mockResolvedValue([]);

      await expect(
        service.createPost(workspaceId, authorId, createPostDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set status to SCHEDULED if scheduledAt is provided', async () => {
      const mockAccount = {
        id: 'account-123',
        workspaceId,
        isActive: true,
      };

      const scheduledDto = {
        ...createPostDto,
        scheduledAt: new Date().toISOString(),
      };

      mockPrismaService.socialAccount.findMany.mockResolvedValue([mockAccount]);
      mockPrismaService.post.create.mockImplementation((args) => {
        expect(args.data.status).toBe(PostStatus.SCHEDULED);
        return Promise.resolve({ id: 'post-123' });
      });

      await service.createPost(workspaceId, authorId, scheduledDto);
    });

    it('should validate media assets belong to workspace', async () => {
      const dtoWithMedia = {
        ...createPostDto,
        content: {
          ...createPostDto.content,
          media: ['media-123'],
        },
      };

      const mockAccount = {
        id: 'account-123',
        workspaceId,
        isActive: true,
      };

      mockPrismaService.socialAccount.findMany.mockResolvedValue([mockAccount]);
      mockPrismaService.mediaAsset.findMany.mockResolvedValue([]);

      await expect(
        service.createPost(workspaceId, authorId, dtoWithMedia),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPosts', () => {
    const workspaceId = 'workspace-123';

    it('should return paginated posts', async () => {
      const mockPosts = [
        { id: 'post-1', workspaceId },
        { id: 'post-2', workspaceId },
      ];

      mockPrismaService.post.findMany.mockResolvedValue(mockPosts);
      mockPrismaService.post.count.mockResolvedValue(2);

      const result = await service.getPosts(workspaceId, { page: 1, limit: 20 });

      expect(result).toEqual({
        posts: mockPosts,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      mockPrismaService.post.findMany.mockResolvedValue([]);
      mockPrismaService.post.count.mockResolvedValue(0);

      await service.getPosts(workspaceId, { status: PostStatus.PUBLISHED });

      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PostStatus.PUBLISHED,
          }),
        }),
      );
    });
  });

  describe('getPost', () => {
    const workspaceId = 'workspace-123';
    const postId = 'post-123';

    it('should return a post', async () => {
      const mockPost = {
        id: postId,
        workspaceId,
      };

      mockPrismaService.post.findFirst.mockResolvedValue(mockPost);

      const result = await service.getPost(workspaceId, postId);

      expect(result).toEqual(mockPost);
    });

    it('should throw NotFoundException if post not found', async () => {
      mockPrismaService.post.findFirst.mockResolvedValue(null);

      await expect(service.getPost(workspaceId, postId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePost', () => {
    const workspaceId = 'workspace-123';
    const postId = 'post-123';

    it('should update a post', async () => {
      const mockPost = {
        id: postId,
        workspaceId,
        status: PostStatus.DRAFT,
        content: { text: 'Old text' },
        platformPosts: [],
      };

      const updatedPost = {
        ...mockPost,
        content: { text: 'New text' },
      };

      mockPrismaService.post.findFirst.mockResolvedValue(mockPost);
      mockPrismaService.post.update.mockResolvedValue(updatedPost);

      const result = await service.updatePost(workspaceId, postId, {
        content: { text: 'New text', media: [], hashtags: [], mentions: [] },
      });

      expect(result).toEqual(updatedPost);
    });

    it('should not allow updating published posts', async () => {
      const mockPost = {
        id: postId,
        workspaceId,
        status: PostStatus.PUBLISHED,
      };

      mockPrismaService.post.findFirst.mockResolvedValue(mockPost);

      await expect(
        service.updatePost(workspaceId, postId, { tags: ['new-tag'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePost', () => {
    const workspaceId = 'workspace-123';
    const postId = 'post-123';

    it('should delete a draft post', async () => {
      const mockPost = {
        id: postId,
        workspaceId,
        status: PostStatus.DRAFT,
        platformPosts: [],
      };

      mockPrismaService.post.findFirst.mockResolvedValue(mockPost);
      mockPrismaService.post.delete.mockResolvedValue(mockPost);

      await service.deletePost(workspaceId, postId);

      expect(mockPrismaService.post.delete).toHaveBeenCalledWith({
        where: { id: postId },
      });
    });

    it('should attempt to delete from platforms if published', async () => {
      const mockPost = {
        id: postId,
        workspaceId,
        status: PostStatus.PUBLISHED,
        platformPosts: [
          {
            id: 'pp-123',
            platform: Platform.INSTAGRAM,
            publishStatus: PublishStatus.PUBLISHED,
            platformPostId: 'platform-123',
            account: {
              platformAccountId: 'account-123',
              accessToken: 'token',
            },
          },
        ],
      };

      mockPrismaService.post.findFirst.mockResolvedValue(mockPost);
      mockPrismaService.post.delete.mockResolvedValue(mockPost);

      await service.deletePost(workspaceId, postId);

      expect(mockPublisher.deletePost).toHaveBeenCalled();
    });
  });

  describe('publishPost', () => {
    const workspaceId = 'workspace-123';
    const postId = 'post-123';

    it('should publish a post successfully', async () => {
      const mockPost = {
        id: postId,
        workspaceId,
        status: PostStatus.DRAFT,
        content: { text: 'Test', hashtags: [], mentions: [] },
        platformPosts: [
          {
            id: 'pp-123',
            platform: Platform.INSTAGRAM,
            account: {
              platformAccountId: 'account-123',
              accessToken: 'token',
            },
          },
        ],
        mediaAssets: [],
      };

      mockPrismaService.post.findFirst.mockResolvedValue(mockPost);
      mockPrismaService.post.update.mockResolvedValue({
        ...mockPost,
        status: PostStatus.PUBLISHED,
      });
      mockPrismaService.platformPost.update.mockResolvedValue({});

      const result = await service.publishPost(workspaceId, postId);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(mockPublisher.publishPost).toHaveBeenCalled();
    });

    it('should throw BadRequestException if already published', async () => {
      const mockPost = {
        id: postId,
        workspaceId,
        status: PostStatus.PUBLISHED,
      };

      mockPrismaService.post.findFirst.mockResolvedValue(mockPost);

      await expect(service.publishPost(workspaceId, postId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle publishing failures gracefully', async () => {
      const mockPost = {
        id: postId,
        workspaceId,
        status: PostStatus.DRAFT,
        content: { text: 'Test', hashtags: [], mentions: [] },
        platformPosts: [
          {
            id: 'pp-123',
            platform: Platform.INSTAGRAM,
            account: {
              platformAccountId: 'account-123',
              accessToken: 'token',
            },
          },
        ],
        mediaAssets: [],
      };

      mockPublisher.publishPost.mockRejectedValue(new Error('API Error'));
      mockPrismaService.post.findFirst.mockResolvedValue(mockPost);
      mockPrismaService.post.update.mockResolvedValue(mockPost);
      mockPrismaService.platformPost.update.mockResolvedValue({});

      const result = await service.publishPost(workspaceId, postId);

      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('API Error');
    });
  });
});
