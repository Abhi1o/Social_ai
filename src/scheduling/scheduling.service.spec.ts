import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { SchedulingService } from './scheduling.service';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let prismaService: PrismaService;
  let mockQueue: any;

  const mockPost = {
    id: 'post-1',
    workspaceId: 'workspace-1',
    authorId: 'user-1',
    content: { text: 'Test post' },
    status: PostStatus.DRAFT,
    scheduledAt: null,
    publishedAt: null,
    campaignId: null,
    tags: [],
    aiGenerated: false,
    aiMetadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
      getJob: jest.fn().mockResolvedValue(null),
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getActiveCount: jest.fn().mockResolvedValue(0),
      getCompletedCount: jest.fn().mockResolvedValue(0),
      getFailedCount: jest.fn().mockResolvedValue(0),
      getDelayedCount: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        {
          provide: getQueueToken('post-publishing'),
          useValue: mockQueue,
        },
        {
          provide: PrismaService,
          useValue: {
            post: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('schedulePost', () => {
    it('should schedule a post successfully', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const dto = {
        scheduledAt: futureDate.toISOString(),
        timezone: 'UTC',
      };

      jest.spyOn(prismaService.post, 'findFirst').mockResolvedValue(mockPost);
      jest.spyOn(prismaService.post, 'update').mockResolvedValue({
        ...mockPost,
        status: PostStatus.SCHEDULED,
        scheduledAt: futureDate,
        platformPosts: [],
      } as any);

      const result = await service.schedulePost('workspace-1', 'post-1', dto);

      expect(result.post.status).toBe(PostStatus.SCHEDULED);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'publish-scheduled-post',
        expect.objectContaining({
          postId: 'post-1',
          workspaceId: 'workspace-1',
        }),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if post does not exist', async () => {
      jest.spyOn(prismaService.post, 'findFirst').mockResolvedValue(null);

      const futureDate = new Date(Date.now() + 3600000);
      const dto = {
        scheduledAt: futureDate.toISOString(),
      };

      await expect(service.schedulePost('workspace-1', 'post-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if scheduled time is in the past', async () => {
      jest.spyOn(prismaService.post, 'findFirst').mockResolvedValue(mockPost);

      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const dto = {
        scheduledAt: pastDate.toISOString(),
      };

      await expect(service.schedulePost('workspace-1', 'post-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if post is already published', async () => {
      jest.spyOn(prismaService.post, 'findFirst').mockResolvedValue({
        ...mockPost,
        status: PostStatus.PUBLISHED,
      });

      const futureDate = new Date(Date.now() + 3600000);
      const dto = {
        scheduledAt: futureDate.toISOString(),
      };

      await expect(service.schedulePost('workspace-1', 'post-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelScheduledPost', () => {
    it('should cancel a scheduled post successfully', async () => {
      const scheduledPost = {
        ...mockPost,
        status: PostStatus.SCHEDULED,
        scheduledAt: new Date(Date.now() + 3600000),
      };

      jest.spyOn(prismaService.post, 'findFirst').mockResolvedValue(scheduledPost);
      jest.spyOn(prismaService.post, 'update').mockResolvedValue({
        ...scheduledPost,
        status: PostStatus.DRAFT,
        scheduledAt: null,
      } as any);

      const mockJob = {
        remove: jest.fn().mockResolvedValue(true),
      };
      mockQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.cancelScheduledPost('workspace-1', 'post-1');

      expect(result.post.status).toBe(PostStatus.DRAFT);
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException if scheduled post does not exist', async () => {
      jest.spyOn(prismaService.post, 'findFirst').mockResolvedValue(null);

      await expect(service.cancelScheduledPost('workspace-1', 'post-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(3);
      mockQueue.getDelayedCount.mockResolvedValue(10);

      const stats = await service.getQueueStats();

      expect(stats).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 10,
        total: 17, // waiting + active + delayed
      });
    });
  });

  describe('getScheduledPosts', () => {
    it('should return scheduled posts for a workspace', async () => {
      const scheduledPosts = [
        {
          ...mockPost,
          status: PostStatus.SCHEDULED,
          scheduledAt: new Date(Date.now() + 3600000),
          platformPosts: [],
          author: { id: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null },
          campaign: null,
        },
      ];

      jest.spyOn(prismaService.post, 'findMany').mockResolvedValue(scheduledPosts as any);

      const result = await service.getScheduledPosts('workspace-1');

      expect(result).toEqual(scheduledPosts);
      expect(prismaService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 'workspace-1',
            status: PostStatus.SCHEDULED,
          }),
        }),
      );
    });
  });
});
