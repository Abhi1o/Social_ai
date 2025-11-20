import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { BulkScheduleResult, BulkPostResult } from './dto/bulk-schedule.dto';
import { BulkEditDto, BulkEditResult, BulkEditPostResult } from './dto/bulk-edit.dto';
import { BulkDeleteDto, BulkDeleteResult, BulkDeletePostResult } from './dto/bulk-delete.dto';
import { ExportPostsDto } from './dto/export-posts.dto';
import { PlatformPublisherFactory } from './adapters/platform-publisher.factory';
import { Post, PostStatus, PublishStatus, Prisma } from '@prisma/client';
import { PublishContent, PublishMediaAsset } from './interfaces/platform-publisher.interface';
import { CsvParser } from './utils/csv-parser';
import { CsvExporter } from './utils/csv-exporter';

@Injectable()
export class PublishingService {
  private readonly logger = new Logger(PublishingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisherFactory: PlatformPublisherFactory,
  ) {}

  /**
   * Create a new post
   */
  async createPost(workspaceId: string, authorId: string, dto: CreatePostDto): Promise<Post> {
    this.logger.log(`Creating post for workspace ${workspaceId}`);

    // Validate that all accounts belong to the workspace
    const accountIds = dto.platforms.map(p => p.accountId);
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        id: { in: accountIds },
        workspaceId,
        isActive: true,
      },
    });

    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('One or more social accounts not found or inactive');
    }

    // Validate media assets exist and belong to workspace
    if (dto.content.media && dto.content.media.length > 0) {
      const mediaAssets = await this.prisma.mediaAsset.findMany({
        where: {
          id: { in: dto.content.media },
          workspaceId,
        },
      });

      if (mediaAssets.length !== dto.content.media.length) {
        throw new BadRequestException('One or more media assets not found');
      }
    }

    // Validate campaign if provided
    if (dto.campaignId) {
      const campaign = await this.prisma.campaign.findFirst({
        where: {
          id: dto.campaignId,
          workspaceId,
        },
      });

      if (!campaign) {
        throw new BadRequestException('Campaign not found');
      }
    }

    // Validate content for each platform
    await this.validateContentForPlatforms(dto);

    // Determine post status
    const status = dto.scheduledAt ? PostStatus.SCHEDULED : PostStatus.DRAFT;

    // Create post with platform posts
    const post = await this.prisma.post.create({
      data: {
        workspaceId,
        authorId,
        content: dto.content as any,
        status,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        campaignId: dto.campaignId,
        tags: dto.tags || [],
        aiGenerated: dto.aiGenerated || false,
        platformPosts: {
          create: dto.platforms.map(p => ({
            accountId: p.accountId,
            platform: p.platform,
            customContent: p.customContent as any,
            publishStatus: PublishStatus.PENDING,
          })),
        },
        mediaAssets: dto.content.media
          ? {
              create: dto.content.media.map((mediaId, index) => ({
                mediaId,
                order: index,
              })),
            }
          : undefined,
      },
      include: {
        platformPosts: {
          include: {
            account: true,
          },
        },
        mediaAssets: {
          include: {
            media: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        campaign: true,
      },
    });

    this.logger.log(`Post created successfully: ${post.id}`);
    return post;
  }

  /**
   * Get posts with filtering and pagination
   */
  async getPosts(workspaceId: string, query: QueryPostsDto) {
    const { status, platform, startDate, endDate, campaignId, page = 1, limit = 20 } = query;

    const where: Prisma.PostWhereInput = {
      workspaceId,
    };

    if (status) {
      where.status = status;
    }

    if (platform) {
      where.platformPosts = {
        some: {
          platform,
        },
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (campaignId) {
      where.campaignId = campaignId;
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          platformPosts: {
            include: {
              account: true,
            },
          },
          mediaAssets: {
            include: {
              media: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          campaign: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single post by ID
   */
  async getPost(workspaceId: string, postId: string): Promise<Post> {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        workspaceId,
      },
      include: {
        platformPosts: {
          include: {
            account: true,
          },
        },
        mediaAssets: {
          include: {
            media: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        campaign: true,
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  /**
   * Update a post
   */
  async updatePost(workspaceId: string, postId: string, dto: UpdatePostDto): Promise<Post> {
    this.logger.log(`Updating post ${postId}`);

    const existingPost = await this.getPost(workspaceId, postId);

    // Don't allow updating published posts
    if (existingPost.status === PostStatus.PUBLISHED) {
      throw new BadRequestException('Cannot update published posts');
    }

    // Validate new content if provided
    if (dto.content || dto.platforms) {
      const existingPostWithRelations = existingPost as any;
      const validationDto = {
        content: dto.content || (existingPost.content as any),
        platforms: dto.platforms || existingPostWithRelations.platformPosts.map((pp: any) => ({
          platform: pp.platform,
          accountId: pp.accountId,
          customContent: pp.customContent as any,
        })),
      };
      await this.validateContentForPlatforms(validationDto as CreatePostDto);
    }

    // Update post
    const updateData: Prisma.PostUpdateInput = {};

    if (dto.content) {
      updateData.content = dto.content as any;
    }

    if (dto.scheduledAt !== undefined) {
      updateData.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
      if (dto.scheduledAt && existingPost.status === PostStatus.DRAFT) {
        updateData.status = PostStatus.SCHEDULED;
      }
    }

    if (dto.campaignId !== undefined) {
      updateData.campaign = dto.campaignId ? { connect: { id: dto.campaignId } } : { disconnect: true };
    }

    if (dto.tags) {
      updateData.tags = dto.tags;
    }

    if (dto.status) {
      updateData.status = dto.status;
    }

    const post = await this.prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        platformPosts: {
          include: {
            account: true,
          },
        },
        mediaAssets: {
          include: {
            media: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        campaign: true,
      },
    });

    this.logger.log(`Post updated successfully: ${postId}`);
    return post;
  }

  /**
   * Delete a post
   */
  async deletePost(workspaceId: string, postId: string): Promise<void> {
    this.logger.log(`Deleting post ${postId}`);

    const post = await this.getPost(workspaceId, postId);

    // If post is published, try to delete from platforms
    if (post.status === PostStatus.PUBLISHED) {
      await this.deleteFromPlatforms(post);
    }

    await this.prisma.post.delete({
      where: { id: postId },
    });

    this.logger.log(`Post deleted successfully: ${postId}`);
  }

  /**
   * Publish a post immediately
   */
  async publishPost(workspaceId: string, postId: string) {
    this.logger.log(`Publishing post ${postId} immediately`);

    const post = await this.getPost(workspaceId, postId);

    if (post.status === PostStatus.PUBLISHED) {
      throw new BadRequestException('Post is already published');
    }

    // Update post status to publishing
    await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.PUBLISHING },
    });

    const results = [];
    const postWithRelations = post as any;

    // Publish to each platform
    for (const platformPost of postWithRelations.platformPosts) {
      try {
        const result = await this.publishToPlatform(post, platformPost);
        results.push({
          platform: platformPost.platform,
          success: result.success,
          platformPostId: result.platformPostId,
          url: result.url,
          error: result.error,
        });

        // Update platform post status
        await this.prisma.platformPost.update({
          where: { id: platformPost.id },
          data: {
            publishStatus: result.success ? PublishStatus.PUBLISHED : PublishStatus.FAILED,
            platformPostId: result.platformPostId,
            error: result.error,
            publishedAt: result.success ? result.publishedAt : null,
          },
        });
      } catch (error: any) {
        this.logger.error(`Failed to publish to ${platformPost.platform}:`, error);
        results.push({
          platform: platformPost.platform,
          success: false,
          error: error?.message || 'Unknown error',
        });

        await this.prisma.platformPost.update({
          where: { id: platformPost.id },
          data: {
            publishStatus: PublishStatus.FAILED,
            error: error?.message || 'Unknown error',
          },
        });
      }
    }

    // Update overall post status
    const allSuccess = results.every(r => r.success);
    const anySuccess = results.some(r => r.success);

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: allSuccess ? PostStatus.PUBLISHED : anySuccess ? PostStatus.PUBLISHED : PostStatus.FAILED,
        publishedAt: anySuccess ? new Date() : null,
      },
    });

    const updatedPost = await this.getPost(workspaceId, postId);

    this.logger.log(`Post publishing completed: ${postId}`);
    return {
      post: updatedPost,
      results,
    };
  }

  /**
   * Validate content for all platforms
   */
  private async validateContentForPlatforms(dto: CreatePostDto): Promise<void> {
    const errors: string[] = [];

    for (const platformPost of dto.platforms) {
      const publisher = this.publisherFactory.getPublisher(platformPost.platform);
      
      // Merge custom content with base content
      const content = {
        ...dto.content,
        ...(platformPost.customContent || {}),
      };

      // Convert to PublishContent format
      const publishContent: PublishContent = {
        text: content.text,
        media: [], // Will be populated when actually publishing
        hashtags: content.hashtags,
        mentions: content.mentions,
        link: content.link,
        firstComment: content.firstComment,
      };

      const validationErrors = await publisher.validateContent(publishContent);
      
      if (validationErrors.length > 0) {
        errors.push(`${platformPost.platform}: ${validationErrors.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Content validation failed: ${errors.join('; ')}`);
    }
  }

  /**
   * Publish to a specific platform
   */
  private async publishToPlatform(post: any, platformPost: any) {
    const publisher = this.publisherFactory.getPublisher(platformPost.platform);
    
    // Get content (use custom content if available, otherwise use base content)
    const content = platformPost.customContent || post.content;

    // Load media assets
    const mediaAssets: PublishMediaAsset[] = await this.loadMediaAssets(post.mediaAssets);

    // Format content for platform
    const publishContent: PublishContent = {
      text: content.text,
      media: mediaAssets,
      hashtags: content.hashtags || [],
      mentions: content.mentions || [],
      link: content.link,
      firstComment: content.firstComment,
    };

    const formattedContent = await publisher.formatContent(publishContent);

    // Publish
    return await publisher.publishPost(
      platformPost.account.platformAccountId,
      platformPost.account.accessToken,
      formattedContent,
    );
  }

  /**
   * Delete post from all platforms
   */
  private async deleteFromPlatforms(post: any): Promise<void> {
    for (const platformPost of post.platformPosts) {
      if (platformPost.publishStatus === PublishStatus.PUBLISHED && platformPost.platformPostId) {
        try {
          const publisher = this.publisherFactory.getPublisher(platformPost.platform);
          await publisher.deletePost(
            platformPost.account.platformAccountId,
            platformPost.account.accessToken,
            platformPost.platformPostId,
          );
        } catch (error) {
          this.logger.error(`Failed to delete post from ${platformPost.platform}:`, error);
          // Continue with deletion even if platform deletion fails
        }
      }
    }
  }

  /**
   * Load media assets for publishing
   */
  private async loadMediaAssets(postMedia: any[]): Promise<PublishMediaAsset[]> {
    if (!postMedia || postMedia.length === 0) {
      return [];
    }

    return postMedia.map(pm => ({
      url: pm.media.url,
      type: pm.media.type.toLowerCase() as 'image' | 'video' | 'gif',
      thumbnailUrl: pm.media.thumbnailUrl,
      dimensions: pm.media.dimensions,
      duration: pm.media.duration,
    }));
  }

  /**
   * Bulk schedule posts from CSV
   */
  async bulkScheduleFromCsv(
    workspaceId: string,
    authorId: string,
    csvContent: string,
  ): Promise<BulkScheduleResult> {
    this.logger.log(`Processing bulk schedule for workspace ${workspaceId}`);

    // Validate CSV structure first
    const validation = CsvParser.validateCsvStructure(csvContent);
    if (!validation.valid) {
      throw new BadRequestException(`CSV validation failed: ${validation.errors.join('; ')}`);
    }

    // Parse CSV
    let posts: CreatePostDto[];
    try {
      posts = CsvParser.parseBulkScheduleCsv(csvContent);
    } catch (error: any) {
      throw new BadRequestException(`Failed to parse CSV: ${error.message}`);
    }

    // Process each post
    const results: BulkPostResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < posts.length; i++) {
      try {
        const post = await this.createPost(workspaceId, authorId, posts[i]);
        results.push({
          index: i,
          success: true,
          postId: post.id,
        });
        successCount++;
      } catch (error: any) {
        this.logger.error(`Failed to create post at index ${i}:`, error);
        results.push({
          index: i,
          success: false,
          error: error.message,
          validationErrors: error.response?.message
            ? Array.isArray(error.response.message)
              ? error.response.message
              : [error.response.message]
            : undefined,
        });
        failureCount++;
      }
    }

    this.logger.log(
      `Bulk schedule completed: ${successCount} success, ${failureCount} failures`,
    );

    return {
      success: failureCount === 0,
      totalPosts: posts.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Bulk edit posts
   */
  async bulkEditPosts(
    workspaceId: string,
    dto: BulkEditDto,
  ): Promise<BulkEditResult> {
    this.logger.log(`Bulk editing ${dto.postIds.length} posts for workspace ${workspaceId}`);

    // Verify all posts exist and belong to workspace
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: dto.postIds },
        workspaceId,
      },
      include: {
        platformPosts: true,
      },
    });

    if (posts.length !== dto.postIds.length) {
      const foundIds = posts.map(p => p.id);
      const missingIds = dto.postIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(
        `Posts not found or not accessible: ${missingIds.join(', ')}`,
      );
    }

    // Check if any posts are published (can't edit published posts)
    const publishedPosts = posts.filter(p => p.status === PostStatus.PUBLISHED);
    if (publishedPosts.length > 0) {
      throw new BadRequestException(
        `Cannot edit published posts: ${publishedPosts.map(p => p.id).join(', ')}`,
      );
    }

    const results: BulkEditPostResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Build update data
    const updateData: Prisma.PostUpdateInput = {};

    if (dto.scheduledAt !== undefined) {
      updateData.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
      if (dto.scheduledAt) {
        updateData.status = PostStatus.SCHEDULED;
      }
    }

    if (dto.status) {
      updateData.status = dto.status;
    }

    if (dto.tags) {
      updateData.tags = dto.tags;
    }

    if (dto.campaignId !== undefined) {
      updateData.campaign = dto.campaignId
        ? { connect: { id: dto.campaignId } }
        : { disconnect: true };
    }

    // Update each post
    for (const post of posts) {
      try {
        // Handle platform changes if specified
        if (dto.platforms && dto.platforms.length > 0) {
          // Get current platform posts
          const currentPlatforms = post.platformPosts.map(pp => pp.platform);
          const platformsToAdd = dto.platforms.filter(p => !currentPlatforms.includes(p));
          const platformsToRemove = currentPlatforms.filter(p => !dto.platforms!.includes(p));

          // Remove platforms
          if (platformsToRemove.length > 0) {
            await this.prisma.platformPost.deleteMany({
              where: {
                postId: post.id,
                platform: { in: platformsToRemove },
              },
            });
          }

          // Add new platforms (need to get accounts for these platforms)
          if (platformsToAdd.length > 0) {
            const accounts = await this.prisma.socialAccount.findMany({
              where: {
                workspaceId,
                platform: { in: platformsToAdd },
                isActive: true,
              },
            });

            if (accounts.length !== platformsToAdd.length) {
              throw new BadRequestException(
                `No active accounts found for platforms: ${platformsToAdd.join(', ')}`,
              );
            }

            await this.prisma.platformPost.createMany({
              data: accounts.map(account => ({
                postId: post.id,
                accountId: account.id,
                platform: account.platform,
                publishStatus: PublishStatus.PENDING,
              })),
            });
          }
        }

        // Update post
        await this.prisma.post.update({
          where: { id: post.id },
          data: updateData,
        });

        results.push({
          postId: post.id,
          success: true,
        });
        successCount++;
      } catch (error: any) {
        this.logger.error(`Failed to update post ${post.id}:`, error);
        results.push({
          postId: post.id,
          success: false,
          error: error.message,
        });
        failureCount++;
      }
    }

    this.logger.log(`Bulk edit completed: ${successCount} success, ${failureCount} failures`);

    return {
      success: failureCount === 0,
      totalPosts: dto.postIds.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Bulk delete posts
   */
  async bulkDeletePosts(
    workspaceId: string,
    dto: BulkDeleteDto,
  ): Promise<BulkDeleteResult> {
    this.logger.log(`Bulk deleting ${dto.postIds.length} posts for workspace ${workspaceId}`);

    if (!dto.confirmed) {
      throw new BadRequestException('Bulk delete must be confirmed');
    }

    // Verify all posts exist and belong to workspace
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: dto.postIds },
        workspaceId,
      },
      include: {
        platformPosts: {
          include: {
            account: true,
          },
        },
      },
    });

    if (posts.length !== dto.postIds.length) {
      const foundIds = posts.map(p => p.id);
      const missingIds = dto.postIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(
        `Posts not found or not accessible: ${missingIds.join(', ')}`,
      );
    }

    const results: BulkDeletePostResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Delete each post
    for (const post of posts) {
      try {
        // If post is published, try to delete from platforms
        if (post.status === PostStatus.PUBLISHED) {
          await this.deleteFromPlatforms(post);
        }

        await this.prisma.post.delete({
          where: { id: post.id },
        });

        results.push({
          postId: post.id,
          success: true,
        });
        successCount++;
      } catch (error: any) {
        this.logger.error(`Failed to delete post ${post.id}:`, error);
        results.push({
          postId: post.id,
          success: false,
          error: error.message,
        });
        failureCount++;
      }
    }

    this.logger.log(`Bulk delete completed: ${successCount} success, ${failureCount} failures`);

    return {
      success: failureCount === 0,
      totalPosts: dto.postIds.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Export posts to CSV
   */
  async exportPosts(workspaceId: string, dto: ExportPostsDto): Promise<string> {
    this.logger.log(`Exporting posts for workspace ${workspaceId}`);

    const where: Prisma.PostWhereInput = {
      workspaceId,
    };

    // Apply filters
    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.platform) {
      where.platformPosts = {
        some: {
          platform: dto.platform,
        },
      };
    }

    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) {
        where.createdAt.gte = new Date(dto.startDate);
      }
      if (dto.endDate) {
        where.createdAt.lte = new Date(dto.endDate);
      }
    }

    if (dto.campaignId) {
      where.campaignId = dto.campaignId;
    }

    if (dto.postIds && dto.postIds.length > 0) {
      where.id = { in: dto.postIds };
    }

    // Fetch posts
    const posts = await this.prisma.post.findMany({
      where,
      include: {
        platformPosts: {
          include: {
            account: true,
          },
        },
        mediaAssets: {
          include: {
            media: true,
          },
        },
        campaign: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    this.logger.log(`Exporting ${posts.length} posts`);

    return CsvExporter.exportPostsToCsv(posts);
  }

  /**
   * Get CSV template
   */
  getCsvTemplate(): string {
    return CsvParser.generateTemplate();
  }
}
