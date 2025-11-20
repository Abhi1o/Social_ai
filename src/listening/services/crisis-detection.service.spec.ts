import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CrisisDetectionService } from './crisis-detection.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Crisis, CrisisSeverity, CrisisStatus, CrisisType } from '../schemas/crisis.schema';
import { Sentiment } from '@prisma/client';

// Mock the SentimentAnalysisService to avoid transformers dependency
class MockSentimentAnalysisService {
  analyzeSentiment = jest.fn();
}

describe('CrisisDetectionService', () => {
  let service: CrisisDetectionService;
  let prismaService: PrismaService;

  const mockCrisisModel = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockPrismaService = {
    listeningMention: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    workspace: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrisisDetectionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: 'SentimentAnalysisService',
          useClass: MockSentimentAnalysisService,
        },
        {
          provide: getModelToken(Crisis.name),
          useValue: mockCrisisModel,
        },
      ],
    }).compile();

    service = module.get<CrisisDetectionService>(CrisisDetectionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectSentimentAnomaly', () => {
    it('should detect sentiment spike when sentiment drops significantly', () => {
      const result = service.detectSentimentAnomaly(
        -0.6, // current sentiment
        0.2,  // baseline sentiment
        -0.5, // threshold
      );

      expect(result.isAnomaly).toBe(true);
      expect(result.type).toBe('sentiment');
      expect(result.severity).toBe(CrisisSeverity.HIGH);
    });

    it('should not detect anomaly when sentiment is stable', () => {
      const result = service.detectSentimentAnomaly(
        0.3,  // current sentiment
        0.2,  // baseline sentiment
        -0.5, // threshold
      );

      expect(result.isAnomaly).toBe(false);
    });

    it('should classify as CRITICAL for severe sentiment drop', () => {
      const result = service.detectSentimentAnomaly(
        -0.8, // current sentiment
        0.1,  // baseline sentiment
        -0.5, // threshold
      );

      expect(result.isAnomaly).toBe(true);
      expect(result.severity).toBe(CrisisSeverity.CRITICAL);
    });
  });

  describe('detectVolumeAnomaly', () => {
    it('should detect volume spike when volume increases significantly', () => {
      const result = service.detectVolumeAnomaly(
        300,  // current volume
        100,  // baseline volume
        200,  // threshold (200%)
      );

      expect(result.isAnomaly).toBe(true);
      expect(result.type).toBe('volume');
      expect(result.details.change).toBe(200); // 200% increase
    });

    it('should not detect anomaly when volume is stable', () => {
      const result = service.detectVolumeAnomaly(
        110,  // current volume
        100,  // baseline volume
        200,  // threshold
      );

      expect(result.isAnomaly).toBe(false);
    });

    it('should classify as CRITICAL for extreme volume spike', () => {
      const result = service.detectVolumeAnomaly(
        600,  // current volume
        100,  // baseline volume
        200,  // threshold
      );

      expect(result.isAnomaly).toBe(true);
      expect(result.severity).toBe(CrisisSeverity.CRITICAL);
      expect(result.details.change).toBe(500); // 500% increase
    });
  });

  describe('calculateCrisisScore', () => {
    it('should calculate high crisis score for severe conditions', () => {
      const score = service.calculateCrisisScore({
        sentimentScore: -0.8,
        sentimentChange: -0.6,
        volumeChange: 400,
        negativeMentionPercentage: 80,
        influencerInvolvement: 5,
        totalMentions: 200,
      });

      expect(score).toBeGreaterThan(70);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate low crisis score for mild conditions', () => {
      const score = service.calculateCrisisScore({
        sentimentScore: -0.2,
        sentimentChange: -0.1,
        volumeChange: 50,
        negativeMentionPercentage: 30,
        influencerInvolvement: 0,
        totalMentions: 20,
      });

      expect(score).toBeLessThan(30);
    });

    it('should cap crisis score at 100', () => {
      const score = service.calculateCrisisScore({
        sentimentScore: -1.0,
        sentimentChange: -1.0,
        volumeChange: 1000,
        negativeMentionPercentage: 100,
        influencerInvolvement: 20,
        totalMentions: 1000,
      });

      expect(score).toBe(100);
    });
  });

  describe('monitorForCrisis', () => {
    it('should detect crisis when both sentiment and volume anomalies occur', async () => {
      const workspaceId = 'workspace-123';
      const currentTime = new Date();

      // Mock current period mentions (high volume, negative sentiment)
      const currentMentions = Array(50).fill(null).map((_, i) => ({
        id: `mention-${i}`,
        workspaceId,
        platform: 'TWITTER',
        sentiment: Sentiment.NEGATIVE,
        content: 'This is terrible',
        publishedAt: new Date(currentTime.getTime() - 30 * 60 * 1000),
        likes: 10,
        comments: 5,
        shares: 2,
        reach: 1000,
        isInfluencer: i < 3,
        authorUsername: `user${i}`,
        authorFollowers: 1000,
      }));

      // Mock baseline period mentions (low volume, neutral sentiment)
      const baselineMentions = Array(10).fill(null).map((_, i) => ({
        id: `baseline-${i}`,
        workspaceId,
        platform: 'TWITTER',
        sentiment: Sentiment.NEUTRAL,
        content: 'Normal content',
        publishedAt: new Date(currentTime.getTime() - 90 * 60 * 1000),
        likes: 5,
        comments: 2,
        shares: 1,
        reach: 500,
        isInfluencer: false,
        authorUsername: `user${i}`,
        authorFollowers: 500,
      }));

      mockPrismaService.listeningMention.findMany
        .mockResolvedValueOnce(currentMentions)
        .mockResolvedValueOnce(baselineMentions);

      mockCrisisModel.create.mockResolvedValue({
        id: 'crisis-123',
        workspaceId,
        title: 'CRITICAL: Sentiment Spike',
        severity: CrisisSeverity.CRITICAL,
        status: CrisisStatus.DETECTED,
        crisisScore: 85,
      });

      const result = await service.monitorForCrisis(workspaceId);

      expect(result.crisisDetected).toBe(true);
      expect(result.crisis).toBeDefined();
      expect(result.metrics.crisisScore).toBeGreaterThan(50);
      expect(mockCrisisModel.create).toHaveBeenCalled();
    });

    it('should not detect crisis when metrics are normal', async () => {
      const workspaceId = 'workspace-123';
      const currentTime = new Date();

      // Mock normal mentions
      const normalMentions = Array(15).fill(null).map((_, i) => ({
        id: `mention-${i}`,
        workspaceId,
        platform: 'TWITTER',
        sentiment: Sentiment.NEUTRAL,
        content: 'Normal content',
        publishedAt: new Date(currentTime.getTime() - 30 * 60 * 1000),
        likes: 5,
        comments: 2,
        shares: 1,
        reach: 500,
        isInfluencer: false,
        authorUsername: `user${i}`,
        authorFollowers: 500,
      }));

      mockPrismaService.listeningMention.findMany
        .mockResolvedValueOnce(normalMentions)
        .mockResolvedValueOnce(normalMentions);

      const result = await service.monitorForCrisis(workspaceId);

      expect(result.crisisDetected).toBe(false);
      expect(result.crisis).toBeUndefined();
      expect(mockCrisisModel.create).not.toHaveBeenCalled();
    });

    it('should not detect crisis when mention volume is too low', async () => {
      const workspaceId = 'workspace-123';

      // Mock very few mentions
      const fewMentions = Array(5).fill(null).map((_, i) => ({
        id: `mention-${i}`,
        workspaceId,
        platform: 'TWITTER',
        sentiment: Sentiment.NEGATIVE,
        content: 'Negative content',
        publishedAt: new Date(),
        likes: 5,
        comments: 2,
        shares: 1,
        reach: 500,
        isInfluencer: false,
        authorUsername: `user${i}`,
        authorFollowers: 500,
      }));

      mockPrismaService.listeningMention.findMany
        .mockResolvedValueOnce(fewMentions)
        .mockResolvedValueOnce([]);

      const result = await service.monitorForCrisis(workspaceId, {
        minMentions: 10,
      });

      expect(result.crisisDetected).toBe(false);
      expect(mockCrisisModel.create).not.toHaveBeenCalled();
    });
  });

  describe('updateCrisisStatus', () => {
    it('should update crisis status and add timeline entry', async () => {
      const crisisId = 'crisis-123';
      const userId = 'user-123';
      const newStatus = CrisisStatus.ACKNOWLEDGED;

      const mockCrisis = {
        id: crisisId,
        status: CrisisStatus.DETECTED,
        timeline: [],
      };

      mockCrisisModel.findById.mockResolvedValue(mockCrisis);
      mockCrisisModel.findByIdAndUpdate.mockResolvedValue({
        ...mockCrisis,
        status: newStatus,
        acknowledgedAt: new Date(),
      });

      const result = await service.updateCrisisStatus(
        crisisId,
        newStatus,
        userId,
        'Team is investigating',
      );

      expect(result.status).toBe(newStatus);
      expect(mockCrisisModel.findByIdAndUpdate).toHaveBeenCalledWith(
        crisisId,
        expect.objectContaining({
          status: newStatus,
          acknowledgedAt: expect.any(Date),
        }),
        { new: true },
      );
    });
  });

  describe('getCrisisDashboard', () => {
    it('should return dashboard data with statistics and trends', async () => {
      const workspaceId = 'workspace-123';

      const mockActiveCrises = [
        {
          id: 'crisis-1',
          workspaceId,
          status: CrisisStatus.DETECTED,
          severity: CrisisSeverity.HIGH,
          crisisScore: 75,
          detectedAt: new Date(),
        },
      ];

      const mockAllCrises = [
        ...mockActiveCrises,
        {
          id: 'crisis-2',
          workspaceId,
          status: CrisisStatus.RESOLVED,
          severity: CrisisSeverity.MEDIUM,
          crisisScore: 60,
          detectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          acknowledgedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
          resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000),
        },
      ];

      mockCrisisModel.find
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockActiveCrises),
        })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(mockAllCrises),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockAllCrises),
        });

      const result = await service.getCrisisDashboard(workspaceId);

      expect(result.activeCrises).toHaveLength(1);
      expect(result.statistics.totalCrises).toBe(2);
      expect(result.statistics.activeCrises).toBe(1);
      expect(result.statistics.resolvedCrises).toBe(1);
      expect(result.trends).toBeDefined();
    });
  });
});
