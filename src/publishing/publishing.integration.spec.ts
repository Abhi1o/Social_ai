import { PrismaClient, Platform, PostStatus } from '@prisma/client';

describe('Publishing Integration Tests', () => {
  let prisma: PrismaClient;
  let workspaceId: string;
  let userId: string;
  let accountId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Create test workspace and user
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Test Workspace',
        slug: 'test-workspace-' + Date.now(),
      },
    });
    workspaceId = workspace.id;

    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Test User',
        workspaceId,
      },
    });
    userId = user.id;

    // Create test social account
    const account = await prisma.socialAccount.create({
      data: {
        workspaceId,
        platform: Platform.INSTAGRAM,
        platformAccountId: 'test-account-123',
        username: 'testuser',
        displayName: 'Test User',
        accessToken: 'test-token',
        isActive: true,
      },
    });
    accountId = account.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.post.deleteMany({ where: { workspaceId } });
    await prisma.socialAccount.deleteMany({ where: { workspaceId } });
    await prisma.user.deleteMany({ where: { workspaceId } });
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.$disconnect();
  });

  describe('Direct Service Tests', () => {
    it('should create and retrieve a post', async () => {
      const post = await prisma.post.create({
        data: {
          workspaceId,
          authorId: userId,
          content: {
            text: 'Direct test post',
            hashtags: ['test'],
            mentions: [],
          },
          status: PostStatus.DRAFT,
          platformPosts: {
            create: [
              {
                accountId,
                platform: Platform.INSTAGRAM,
                publishStatus: 'PENDING',
              },
            ],
          },
        },
        include: {
          platformPosts: true,
        },
      });

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.status).toBe(PostStatus.DRAFT);
      expect(post.platformPosts).toHaveLength(1);

      // Retrieve the post
      const retrieved = await prisma.post.findUnique({
        where: { id: post.id },
        include: {
          platformPosts: true,
        },
      });

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(post.id);
    });

    it('should update a post', async () => {
      const post = await prisma.post.create({
        data: {
          workspaceId,
          authorId: userId,
          content: {
            text: 'Original text',
            hashtags: [],
            mentions: [],
          },
          status: PostStatus.DRAFT,
        },
      });

      const updated = await prisma.post.update({
        where: { id: post.id },
        data: {
          content: {
            text: 'Updated text',
            hashtags: ['updated'],
            mentions: [],
          },
        },
      });

      expect(updated.content).toEqual({
        text: 'Updated text',
        hashtags: ['updated'],
        mentions: [],
      });
    });

    it('should delete a post', async () => {
      const post = await prisma.post.create({
        data: {
          workspaceId,
          authorId: userId,
          content: {
            text: 'To be deleted',
            hashtags: [],
            mentions: [],
          },
          status: PostStatus.DRAFT,
        },
      });

      await prisma.post.delete({
        where: { id: post.id },
      });

      const deleted = await prisma.post.findUnique({
        where: { id: post.id },
      });

      expect(deleted).toBeNull();
    });

    it('should filter posts by status', async () => {
      // Create posts with different statuses
      await prisma.post.createMany({
        data: [
          {
            workspaceId,
            authorId: userId,
            content: { text: 'Draft 1' },
            status: PostStatus.DRAFT,
          },
          {
            workspaceId,
            authorId: userId,
            content: { text: 'Scheduled 1' },
            status: PostStatus.SCHEDULED,
            scheduledAt: new Date(Date.now() + 86400000),
          },
        ],
      });

      const draftPosts = await prisma.post.findMany({
        where: {
          workspaceId,
          status: PostStatus.DRAFT,
        },
      });

      const scheduledPosts = await prisma.post.findMany({
        where: {
          workspaceId,
          status: PostStatus.SCHEDULED,
        },
      });

      expect(draftPosts.length).toBeGreaterThan(0);
      expect(scheduledPosts.length).toBeGreaterThan(0);
      expect(draftPosts.every(p => p.status === PostStatus.DRAFT)).toBe(true);
      expect(scheduledPosts.every(p => p.status === PostStatus.SCHEDULED)).toBe(true);
    });
  });
});
