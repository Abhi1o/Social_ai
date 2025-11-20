import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityModule } from './community.module';
import { ConversationService } from './services/conversation.service';
import { MessageService } from './services/message.service';
import { MessageCollectionService } from './services/message-collection.service';
import { ConversationThreadingService } from './services/conversation-threading.service';
import { InboxFilterService } from './services/inbox-filter.service';
import { Platform, ConversationType } from '@prisma/client';

describe('Community Module Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let conversationService: ConversationService;
  let messageService: MessageService;
  let messageCollectionService: MessageCollectionService;
  let threadingService: ConversationThreadingService;
  let filterService: InboxFilterService;

  const testWorkspaceId = 'test-workspace-' + Date.now();
  const testAccountId = 'test-account-' + Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CommunityModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    conversationService = moduleFixture.get<ConversationService>(ConversationService);
    messageService = moduleFixture.get<MessageService>(MessageService);
    messageCollectionService = moduleFixture.get<MessageCollectionService>(MessageCollectionService);
    threadingService = moduleFixture.get<ConversationThreadingService>(ConversationThreadingService);
    filterService = moduleFixture.get<InboxFilterService>(InboxFilterService);

    // Create test workspace
    await prisma.workspace.create({
      data: {
        id: testWorkspaceId,
        name: 'Test Workspace',
        slug: 'test-workspace-' + Date.now(),
        plan: 'FREE',
      },
    });

    // Create test social account
    await prisma.socialAccount.create({
      data: {
        id: testAccountId,
        workspaceId: testWorkspaceId,
        platform: Platform.INSTAGRAM,
        platformAccountId: 'ig-123',
        username: 'testuser',
        displayName: 'Test User',
        accessToken: 'encrypted-token',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.message.deleteMany({
      where: {
        conversation: {
          workspaceId: testWorkspaceId,
        },
      },
    });

    await prisma.conversation.deleteMany({
      where: { workspaceId: testWorkspaceId },
    });

    await prisma.socialAccount.deleteMany({
      where: { workspaceId: testWorkspaceId },
    });

    await prisma.workspace.delete({
      where: { id: testWorkspaceId },
    });

    await app.close();
  });

  describe('Conversation Management', () => {
    it('should create a conversation', async () => {
      const conversation = await conversationService.create(testWorkspaceId, {
        accountId: testAccountId,
        platform: Platform.INSTAGRAM,
        type: ConversationType.COMMENT,
        participantId: 'user-123',
        participantName: 'John Doe',
      });

      expect(conversation).toBeDefined();
      expect(conversation.workspaceId).toBe(testWorkspaceId);
      expect(conversation.participantName).toBe('John Doe');
      expect(conversation.status).toBe('OPEN');
    });

    it('should query conversations with filters', async () => {
      const result = await conversationService.query(testWorkspaceId, {
        status: 'OPEN',
        page: 1,
        limit: 20,
      });

      expect(result).toBeDefined();
      expect(result.conversations).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should get conversation statistics', async () => {
      const stats = await conversationService.getStats(testWorkspaceId);

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.byPriority).toBeDefined();
      expect(stats.bySentiment).toBeDefined();
      expect(stats.byPlatform).toBeDefined();
    });
  });

  describe('Message Collection', () => {
    it('should process incoming message', async () => {
      const incomingMessage = {
        platform: Platform.INSTAGRAM,
        accountId: testAccountId,
        type: ConversationType.COMMENT,
        participantId: 'user-456',
        participantName: 'Jane Smith',
        content: 'Great product!',
        platformMessageId: 'ig-msg-' + Date.now(),
        sentiment: 0.8,
      };

      const result = await messageCollectionService.processIncomingMessage(
        testWorkspaceId,
        incomingMessage,
      );

      expect(result).toBeDefined();
      expect(result.conversationId).toBeDefined();
      expect(result.messageId).toBeDefined();
    });

    it('should deduplicate messages', async () => {
      const platformMessageId = 'ig-msg-duplicate-' + Date.now();

      const incomingMessage = {
        platform: Platform.INSTAGRAM,
        accountId: testAccountId,
        type: ConversationType.COMMENT,
        participantId: 'user-789',
        participantName: 'Bob Johnson',
        content: 'Duplicate message',
        platformMessageId,
        sentiment: 0.5,
      };

      // Process first time
      const result1 = await messageCollectionService.processIncomingMessage(
        testWorkspaceId,
        incomingMessage,
      );

      // Process second time (should be deduplicated)
      const result2 = await messageCollectionService.processIncomingMessage(
        testWorkspaceId,
        incomingMessage,
      );

      expect(result1.messageId).toBe(result2.messageId);
    });

    it('should get collection statistics', async () => {
      const stats = await messageCollectionService.getCollectionStats(testWorkspaceId);

      expect(stats).toBeDefined();
      expect(stats.totalMessages).toBeGreaterThanOrEqual(0);
      expect(stats.messagesLast24h).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Filtering and Search', () => {
    it('should apply filters', async () => {
      const result = await filterService.applyFilters(
        testWorkspaceId,
        {
          status: 'OPEN',
          platform: Platform.INSTAGRAM,
        },
        1,
        20,
      );

      expect(result).toBeDefined();
      expect(result.conversations).toBeInstanceOf(Array);
    });

    it('should search conversations', async () => {
      const results = await filterService.search(testWorkspaceId, 'Jane', 50);

      expect(results).toBeInstanceOf(Array);
    });

    it('should get filter suggestions', async () => {
      const suggestions = await filterService.getFilterSuggestions(testWorkspaceId);

      expect(suggestions).toBeDefined();
      expect(suggestions.platforms).toBeInstanceOf(Array);
      expect(suggestions.tags).toBeInstanceOf(Array);
      expect(suggestions.statusCounts).toBeDefined();
    });

    it('should validate filters', async () => {
      const validation = filterService.validateFilter({
        createdAfter: new Date('2024-01-01'),
        createdBefore: new Date('2023-01-01'), // Invalid: before is earlier than after
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Conversation Threading', () => {
    let conversation1Id: string;
    let conversation2Id: string;

    beforeAll(async () => {
      // Create two conversations for the same participant
      const conv1 = await conversationService.create(testWorkspaceId, {
        accountId: testAccountId,
        platform: Platform.INSTAGRAM,
        type: ConversationType.COMMENT,
        participantId: 'threading-user',
        participantName: 'Threading User',
      });

      const conv2 = await conversationService.create(testWorkspaceId, {
        accountId: testAccountId,
        platform: Platform.INSTAGRAM,
        type: ConversationType.COMMENT,
        participantId: 'threading-user',
        participantName: 'Threading User',
      });

      conversation1Id = conv1.id;
      conversation2Id = conv2.id;

      // Add messages to both
      await messageService.create({
        conversationId: conversation1Id,
        direction: 'INBOUND',
        content: 'First message',
        platformMessageId: 'msg-1-' + Date.now(),
      });

      await messageService.create({
        conversationId: conversation2Id,
        direction: 'INBOUND',
        content: 'Second message',
        platformMessageId: 'msg-2-' + Date.now(),
      });
    });

    it('should get threaded conversation with context', async () => {
      const result = await threadingService.getThreadedConversation(
        conversation1Id,
        testWorkspaceId,
      );

      expect(result).toBeDefined();
      expect(result.conversation).toBeDefined();
      expect(result.messages).toBeInstanceOf(Array);
      expect(result.context).toBeDefined();
      expect(result.context.totalMessages).toBeGreaterThanOrEqual(0);
    });

    it('should get related conversations', async () => {
      const related = await threadingService.getRelatedConversations(
        testWorkspaceId,
        'threading-user',
        conversation1Id,
      );

      expect(related).toBeInstanceOf(Array);
      expect(related.length).toBeGreaterThanOrEqual(1);
    });

    it('should merge conversations', async () => {
      const merged = await threadingService.mergeConversations(
        testWorkspaceId,
        conversation1Id,
        conversation2Id,
      );

      expect(merged).toBeDefined();
      expect(merged.id).toBe(conversation1Id);

      // Verify second conversation is deleted
      const deleted = await prisma.conversation.findUnique({
        where: { id: conversation2Id },
      });
      expect(deleted).toBeNull();
    });
  });
});
