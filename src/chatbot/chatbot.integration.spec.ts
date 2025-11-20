import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, EntityType, FlowTriggerType } from '@prisma/client';

describe('Chatbot Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let workspaceId: string;
  let userId: string;
  let chatbotId: string;
  let socialAccountId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up test data
    await prisma.chatbot.deleteMany({
      where: { name: { contains: 'Test Chatbot' } },
    });

    // Create test workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Test Workspace',
        slug: `test-workspace-${Date.now()}`,
        plan: 'PROFESSIONAL',
      },
    });
    workspaceId = workspace.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-chatbot-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Test User',
        workspaceId,
        role: 'ADMIN',
      },
    });
    userId = user.id;

    // Create test social account
    const socialAccount = await prisma.socialAccount.create({
      data: {
        workspaceId,
        platform: Platform.INSTAGRAM,
        platformAccountId: 'test-account-123',
        username: 'testuser',
        displayName: 'Test User',
        accessToken: 'encrypted-token',
        isActive: true,
      },
    });
    socialAccountId = socialAccount.id;

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: 'hashedpassword',
      });

    authToken = loginResponse.body.accessToken || 'mock-token';
  });

  afterAll(async () => {
    // Clean up
    if (chatbotId) {
      await prisma.chatbot.delete({ where: { id: chatbotId } }).catch(() => {});
    }
    await prisma.socialAccount.delete({ where: { id: socialAccountId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});

    await app.close();
  });

  describe('Chatbot Management', () => {
    it('should create a chatbot', async () => {
      const response = await request(app.getHttpServer())
        .post('/chatbot')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Chatbot',
          description: 'A test chatbot for integration testing',
          platforms: [Platform.INSTAGRAM],
          accountIds: [socialAccountId],
          greeting: 'Hello! How can I help you today?',
          fallbackMessage: "I'm sorry, I didn't understand that.",
          confidenceThreshold: 0.7,
          language: 'en',
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Chatbot');
      expect(response.body.platforms).toContain(Platform.INSTAGRAM);

      chatbotId = response.body.id;
    });

    it('should list all chatbots', async () => {
      const response = await request(app.getHttpServer())
        .get('/chatbot')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get a specific chatbot', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chatbot/${chatbotId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(chatbotId);
      expect(response.body.name).toBe('Test Chatbot');
    });

    it('should update a chatbot', async () => {
      const response = await request(app.getHttpServer())
        .put(`/chatbot/${chatbotId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Test Chatbot',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Test Chatbot');
      expect(response.body.description).toBe('Updated description');
    });
  });

  describe('Intent Management', () => {
    let intentId: string;

    it('should create an intent', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chatbot/${chatbotId}/intents`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'greeting',
          description: 'Greeting intent',
          trainingPhrases: ['hello', 'hi', 'hey', 'good morning'],
          responses: ['Hello! How can I help you?', 'Hi there!', 'Hey! What can I do for you?'],
          priority: 10,
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('greeting');
      expect(response.body.trainingPhrases).toContain('hello');

      intentId = response.body.id;
    });

    it('should list all intents', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chatbot/${chatbotId}/intents`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should update an intent', async () => {
      const response = await request(app.getHttpServer())
        .put(`/chatbot/${chatbotId}/intents/${intentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trainingPhrases: ['hello', 'hi', 'hey', 'good morning', 'greetings'],
        })
        .expect(200);

      expect(response.body.trainingPhrases).toContain('greetings');
    });
  });

  describe('Entity Management', () => {
    let entityId: string;

    it('should create an entity', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chatbot/${chatbotId}/entities`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'product_name',
          description: 'Product name entity',
          type: EntityType.CUSTOM_LIST,
          values: [
            { value: 'iPhone', synonyms: ['iphone', 'apple phone'] },
            { value: 'MacBook', synonyms: ['macbook', 'mac'] },
          ],
          isRequired: false,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('product_name');
      expect(response.body.type).toBe(EntityType.CUSTOM_LIST);

      entityId = response.body.id;
    });

    it('should list all entities', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chatbot/${chatbotId}/entities`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should create a system email entity', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chatbot/${chatbotId}/entities`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'user_email',
          description: 'User email address',
          type: EntityType.SYSTEM_EMAIL,
          isRequired: true,
        })
        .expect(201);

      expect(response.body.type).toBe(EntityType.SYSTEM_EMAIL);
    });
  });

  describe('Flow Management', () => {
    let flowId: string;

    it('should create a flow', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chatbot/${chatbotId}/flows`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Greeting Flow',
          description: 'Simple greeting flow',
          triggerType: FlowTriggerType.INTENT,
          triggerValue: 'greeting',
          nodes: [
            {
              id: 'start',
              type: 'start',
              data: { nextNode: 'message1' },
            },
            {
              id: 'message1',
              type: 'message',
              data: {
                message: 'Hello! Welcome to our service.',
                nextNode: 'question1',
              },
            },
            {
              id: 'question1',
              type: 'question',
              data: {
                message: 'How can I help you today?',
                quickReplies: [
                  { label: 'Product Info', value: 'product_info' },
                  { label: 'Support', value: 'support' },
                ],
                nextNode: 'end',
              },
            },
            {
              id: 'end',
              type: 'end',
              data: { message: 'Thank you!' },
            },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'message1' },
            { id: 'e2', source: 'message1', target: 'question1' },
            { id: 'e3', source: 'question1', target: 'end' },
          ],
          priority: 10,
          isActive: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Greeting Flow');
      expect(response.body.triggerType).toBe(FlowTriggerType.INTENT);

      flowId = response.body.id;
    });

    it('should list all flows', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chatbot/${chatbotId}/flows`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get a specific flow', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chatbot/${chatbotId}/flows/${flowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(flowId);
      expect(response.body.nodes).toBeDefined();
      expect(response.body.edges).toBeDefined();
    });
  });

  describe('Message Processing', () => {
    let conversationId: string;

    beforeAll(async () => {
      // Create a test conversation
      const conversation = await prisma.conversation.create({
        data: {
          workspaceId,
          accountId: socialAccountId,
          platform: Platform.INSTAGRAM,
          type: 'DM',
          participantId: 'test-participant-123',
          participantName: 'Test Participant',
          status: 'OPEN',
        },
      });
      conversationId = conversation.id;
    });

    it('should process a greeting message', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chatbot/${chatbotId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'hello',
          conversationId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('intent');
      expect(response.body.intent).toBe('greeting');
      expect(response.body.confidence).toBeGreaterThan(0.5);
    });

    it('should handle unknown message with fallback', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chatbot/${chatbotId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'xyzabc123nonsense',
          conversationId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('response');
      expect(response.body.response).toContain("didn't understand");
    });

    it('should extract entities from message', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chatbot/${chatbotId}/process`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'I want to buy an iPhone',
          conversationId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('entities');
    });
  });

  describe('Analytics', () => {
    it('should get analytics summary', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chatbot/${chatbotId}/analytics/summary?days=7`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalSessions');
      expect(response.body).toHaveProperty('totalInteractions');
      expect(response.body).toHaveProperty('avgConfidence');
    });

    it('should get intent performance', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chatbot/${chatbotId}/analytics/intents?days=7`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get session stats', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chatbot/${chatbotId}/analytics/sessions?days=7`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalSessions');
      expect(response.body).toHaveProperty('activeSessions');
    });
  });

  describe('Training', () => {
    it('should train the chatbot', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chatbot/${chatbotId}/train`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });
  });
});
