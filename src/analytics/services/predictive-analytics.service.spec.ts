import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import { Metric } from '../schemas/metric.schema';
import { AggregatedMetric } from '../schemas/aggregated-metric.schema';

describe('PredictiveAnalyticsService', () => {
  let service: PredictiveAnalyticsService;
  let metricModel: any;
  let aggregatedMetricModel: any;

  beforeEach(async () => {
    const mockMetricModel = {
      find: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue([]),
    };

    const mockAggregatedMetricModel = {
      find: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictiveAnalyticsService,
        {
          provide: getModelToken(Metric.name),
          useValue: mockMetricModel,
        },
        {
          provide: getModelToken(AggregatedMetric.name),
          useValue: mockAggregatedMetricModel,
        },
      ],
    }).compile();

    service = module.get<PredictiveAnalyticsService>(PredictiveAnalyticsService);
    metricModel = module.get(getModelToken(Metric.name));
    aggregatedMetricModel = module.get(getModelToken(AggregatedMetric.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('predictEngagement', () => {
    it('should return engagement prediction with confidence score', async () => {
      const result = await service.predictEngagement('workspace1', 'instagram', {
        timeOfDay: 14,
        dayOfWeek: 3,
        contentLength: 150,
        hashtagCount: 10,
        mediaCount: 1,
      });

      expect(result).toHaveProperty('predictedEngagement');
      expect(result).toHaveProperty('predictedLikes');
      expect(result).toHaveProperty('predictedComments');
      expect(result).toHaveProperty('predictedShares');
      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('forecastReach', () => {
    it('should return empty array when insufficient data', async () => {
      metricModel.aggregate.mockResolvedValue([]);

      const result = await service.forecastReach('workspace1', 'instagram', 7);

      expect(result).toEqual([]);
    });

    it('should return reach forecasts with confidence intervals', async () => {
      const mockData = Array.from({ length: 60 }, (_, i) => ({
        _id: `2024-01-${String(i + 1).padStart(2, '0')}`,
        reach: 1000 + i * 10,
        impressions: 1500 + i * 15,
      }));

      metricModel.aggregate.mockResolvedValue(mockData);

      const result = await service.forecastReach('workspace1', 'instagram', 7);

      expect(result).toHaveLength(7);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('predictedReach');
      expect(result[0]).toHaveProperty('predictedImpressions');
      expect(result[0]).toHaveProperty('lowerBound');
      expect(result[0]).toHaveProperty('upperBound');
      expect(result[0]).toHaveProperty('confidence');
    });
  });

  describe('detectAnomalies', () => {
    it('should detect spikes and drops in metrics', async () => {
      // Create data with clear anomalies
      const mockData = [
        { _id: '2024-01-01', engagement: 100, reach: 1000, impressions: 1500, followers: 5000 },
        { _id: '2024-01-02', engagement: 110, reach: 1100, impressions: 1600, followers: 5010 },
        { _id: '2024-01-03', engagement: 105, reach: 1050, impressions: 1550, followers: 5020 },
        { _id: '2024-01-04', engagement: 108, reach: 1080, impressions: 1580, followers: 5030 },
        { _id: '2024-01-05', engagement: 112, reach: 1120, impressions: 1620, followers: 5040 },
        { _id: '2024-01-06', engagement: 107, reach: 1070, impressions: 1570, followers: 5050 },
        { _id: '2024-01-07', engagement: 109, reach: 1090, impressions: 1590, followers: 5060 },
        { _id: '2024-01-08', engagement: 1000, reach: 10000, impressions: 15000, followers: 5070 }, // Spike
        { _id: '2024-01-09', engagement: 111, reach: 1110, impressions: 1610, followers: 5080 },
        { _id: '2024-01-10', engagement: 106, reach: 1060, impressions: 1560, followers: 5090 },
      ];

      metricModel.aggregate.mockResolvedValue(mockData);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-10');

      const result = await service.detectAnomalies('workspace1', 'instagram', startDate, endDate, 2.0);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('metric');
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('expectedValue');
      expect(result[0]).toHaveProperty('deviation');
      expect(result[0]).toHaveProperty('severity');
      expect(result[0]).toHaveProperty('type');
      expect(['spike', 'drop']).toContain(result[0].type);
    });
  });

  describe('predictPerformanceTrends', () => {
    it('should predict trends for multiple metrics', async () => {
      const mockData = Array.from({ length: 30 }, (_, i) => ({
        _id: `2024-01-${String(i + 1).padStart(2, '0')}`,
        engagement: 100 + i * 5,
        reach: 1000 + i * 50,
        impressions: 1500 + i * 75,
        followers: 5000 + i * 10,
      }));

      metricModel.aggregate.mockResolvedValue(mockData);

      const result = await service.predictPerformanceTrends(
        'workspace1',
        'instagram',
        ['engagement', 'reach'],
        7,
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('metric');
      expect(result[0]).toHaveProperty('trend');
      expect(result[0]).toHaveProperty('changeRate');
      expect(result[0]).toHaveProperty('prediction');
      expect(result[0]).toHaveProperty('dates');
      expect(result[0]).toHaveProperty('confidence');
      expect(['increasing', 'decreasing', 'stable']).toContain(result[0].trend);
    });
  });

  describe('generateInsights', () => {
    it('should generate AI-powered insights from anomalies and trends', async () => {
      const mockData = Array.from({ length: 30 }, (_, i) => ({
        _id: `2024-01-${String(i + 1).padStart(2, '0')}`,
        engagement: 100 + i * 5,
        reach: 1000 + i * 50,
        impressions: 1500 + i * 75,
        followers: 5000 + i * 10,
      }));

      metricModel.aggregate.mockResolvedValue(mockData);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-30');

      const result = await service.generateInsights('workspace1', 'instagram', startDate, endDate);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('type');
        expect(result[0]).toHaveProperty('title');
        expect(result[0]).toHaveProperty('description');
        expect(result[0]).toHaveProperty('impact');
        expect(result[0]).toHaveProperty('actionable');
        expect(['opportunity', 'warning', 'recommendation']).toContain(result[0].type);
      }
    });
  });
});
