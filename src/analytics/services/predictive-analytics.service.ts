import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as tf from '@tensorflow/tfjs';
import * as stats from 'simple-statistics';
import { Metric, MetricDocument } from '../schemas/metric.schema';
import { AggregatedMetric, AggregatedMetricDocument } from '../schemas/aggregated-metric.schema';

export interface EngagementPrediction {
  postId?: string;
  predictedEngagement: number;
  predictedLikes: number;
  predictedComments: number;
  predictedShares: number;
  confidence: number;
  factors: {
    timeOfDay: number;
    dayOfWeek: number;
    contentLength: number;
    hashtagCount: number;
    mediaCount: number;
  };
}

export interface ReachForecast {
  date: string;
  predictedReach: number;
  predictedImpressions: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface PerformanceTrend {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  changeRate: number;
  prediction: number[];
  dates: string[];
  confidence: number;
}

export interface Anomaly {
  date: string;
  metric: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  type: 'spike' | 'drop';
}

export interface AIInsight {
  type: 'opportunity' | 'warning' | 'recommendation';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedAction?: string;
  data?: any;
}

@Injectable()
export class PredictiveAnalyticsService {
  private readonly logger = new Logger(PredictiveAnalyticsService.name);
  private engagementModel: tf.LayersModel | null = null;
  private reachModel: tf.LayersModel | null = null;

  constructor(
    @InjectModel(Metric.name) private metricModel: Model<MetricDocument>,
    @InjectModel(AggregatedMetric.name) private aggregatedMetricModel: Model<AggregatedMetricDocument>,
  ) {
    this.initializeModels();
  }

  private async initializeModels(): Promise<void> {
    try {
      this.logger.log('Initializing predictive models...');
      
      this.engagementModel = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [5], units: 16, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 8, activation: 'relu' }),
          tf.layers.dense({ units: 4, activation: 'linear' }),
        ],
      });

      this.engagementModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae'],
      });

      this.reachModel = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [7], units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 8, activation: 'relu' }),
          tf.layers.dense({ units: 2, activation: 'linear' }),
        ],
      });

      this.reachModel.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae'],
      });

      this.logger.log('Predictive models initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize predictive models', error);
    }
  }

  async predictEngagement(
    workspaceId: string,
    platform: string,
    features: {
      timeOfDay: number;
      dayOfWeek: number;
      contentLength: number;
      hashtagCount: number;
      mediaCount: number;
    },
  ): Promise<EngagementPrediction> {
    this.logger.log(`Predicting engagement for workspace ${workspaceId}`);

    try {
      await this.trainEngagementModel(workspaceId, platform);

      const normalizedFeatures = [
        features.timeOfDay / 23,
        features.dayOfWeek / 6,
        Math.min(features.contentLength / 500, 1),
        Math.min(features.hashtagCount / 30, 1),
        Math.min(features.mediaCount / 10, 1),
      ];

      const inputTensor = tf.tensor2d([normalizedFeatures]);
      const prediction = this.engagementModel!.predict(inputTensor) as tf.Tensor;
      const predictionData = await prediction.data();

      inputTensor.dispose();
      prediction.dispose();

      const [likes, comments, shares, saves] = Array.from(predictionData);
      const totalEngagement = likes + comments + shares + saves;

      return {
        predictedEngagement: Math.max(0, Math.round(totalEngagement)),
        predictedLikes: Math.max(0, Math.round(likes)),
        predictedComments: Math.max(0, Math.round(comments)),
        predictedShares: Math.max(0, Math.round(shares)),
        confidence: 0.75,
        factors: features,
      };
    } catch (error) {
      this.logger.error('Failed to predict engagement', error);
      return {
        predictedEngagement: 0,
        predictedLikes: 0,
        predictedComments: 0,
        predictedShares: 0,
        confidence: 0,
        factors: features,
      };
    }
  }

  private async trainEngagementModel(workspaceId: string, platform: string): Promise<void> {
    if (this.engagementModel && (this.engagementModel as any).lastTrained) {
      const timeSinceTraining = Date.now() - (this.engagementModel as any).lastTrained;
      if (timeSinceTraining < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    this.logger.log('Training engagement model...');

    try {
      const historicalData = await this.metricModel.find({
        workspaceId,
        platform,
        metricType: 'post',
        'metadata.postId': { $exists: true },
      }).limit(1000).sort({ timestamp: -1 });

      if (historicalData.length < 50) {
        this.logger.warn('Insufficient data for training engagement model');
        return;
      }

      const features: number[][] = [];
      const labels: number[][] = [];

      for (const data of historicalData) {
        const timestamp = new Date(data.timestamp);
        const feature = [
          timestamp.getHours() / 23,
          timestamp.getDay() / 6,
          0.5,
          0.5,
          0.5,
        ];

        const label = [
          data.metrics.likes || 0,
          data.metrics.comments || 0,
          data.metrics.shares || 0,
          data.metrics.saves || 0,
        ];

        features.push(feature);
        labels.push(label);
      }

      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels);

      await this.engagementModel!.fit(xs, ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              this.logger.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}`);
            }
          },
        },
      });

      xs.dispose();
      ys.dispose();

      (this.engagementModel as any).lastTrained = Date.now();
      this.logger.log('Engagement model training completed');
    } catch (error) {
      this.logger.error('Failed to train engagement model', error);
    }
  }

  async forecastReach(
    workspaceId: string,
    platform: string,
    daysAhead: number = 7,
  ): Promise<ReachForecast[]> {
    this.logger.log(`Forecasting reach for ${daysAhead} days ahead`);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const historicalData = await this.metricModel.aggregate([
        {
          $match: {
            workspaceId,
            platform,
            timestamp: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            reach: { $sum: '$metrics.reach' },
            impressions: { $sum: '$metrics.impressions' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      if (historicalData.length < 30) {
        this.logger.warn('Insufficient data for reach forecasting');
        return [];
      }

      const reachSeries = historicalData.map((d) => d.reach);
      const impressionsSeries = historicalData.map((d) => d.impressions);

      const reachTrend = this.calculateTrend(reachSeries);
      const impressionsTrend = this.calculateTrend(impressionsSeries);

      const reachStdDev = stats.standardDeviation(reachSeries);

      const forecasts: ReachForecast[] = [];
      const lastIndex = reachSeries.length - 1;

      for (let i = 1; i <= daysAhead; i++) {
        const futureIndex = lastIndex + i;
        const predictedReach = reachTrend.slope * futureIndex + reachTrend.intercept;
        const predictedImpressions = impressionsTrend.slope * futureIndex + impressionsTrend.intercept;

        const date = new Date();
        date.setDate(date.getDate() + i);

        forecasts.push({
          date: date.toISOString().split('T')[0],
          predictedReach: Math.max(0, Math.round(predictedReach)),
          predictedImpressions: Math.max(0, Math.round(predictedImpressions)),
          lowerBound: Math.max(0, Math.round(predictedReach - 1.96 * reachStdDev)),
          upperBound: Math.round(predictedReach + 1.96 * reachStdDev),
          confidence: 0.95,
        });
      }

      return forecasts;
    } catch (error) {
      this.logger.error('Failed to forecast reach', error);
      return [];
    }
  }

  private calculateTrend(series: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = series.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = series.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * series[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const yMean = sumY / n;
    const ssTotal = series.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = series.reduce((sum, y, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (ssResidual / ssTotal);
    
    return { slope, intercept, rSquared };
  }

  private determineTrendDirection(slope: number, series: number[]): 'increasing' | 'decreasing' | 'stable' {
    const mean = stats.mean(series);
    const threshold = mean * 0.01;
    
    if (Math.abs(slope) < threshold) {
      return 'stable';
    }
    
    return slope > 0 ? 'increasing' : 'decreasing';
  }

  private calculateAnomalySeverity(deviation: number, threshold: number): 'low' | 'medium' | 'high' {
    const ratio = deviation / threshold;
    
    if (ratio > 2) {
      return 'high';
    } else if (ratio > 1.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  async generateInsights(
    workspaceId: string,
    platform: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AIInsight[]> {
    this.logger.log(`Generating AI insights for workspace ${workspaceId}`);

    const insights: AIInsight[] = [];

    try {
      const anomalies = await this.detectAnomalies(workspaceId, platform, startDate, endDate);
      const trends = await this.predictPerformanceTrends(workspaceId, platform);

      for (const anomaly of anomalies.slice(0, 3)) {
        if (anomaly.type === 'spike' && anomaly.severity === 'high') {
          insights.push({
            type: 'opportunity',
            title: `Exceptional ${anomaly.metric} performance detected`,
            description: `Your ${anomaly.metric} spiked to ${anomaly.value} on ${anomaly.date}, which is ${Math.round((anomaly.deviation / anomaly.expectedValue) * 100)}% above normal. Analyze what worked and replicate this success.`,
            impact: 'high',
            actionable: true,
            suggestedAction: `Review content posted on ${anomaly.date} and identify successful patterns`,
            data: anomaly,
          });
        } else if (anomaly.type === 'drop' && anomaly.severity === 'high') {
          insights.push({
            type: 'warning',
            title: `Significant ${anomaly.metric} decline detected`,
            description: `Your ${anomaly.metric} dropped to ${anomaly.value} on ${anomaly.date}, which is ${Math.round((anomaly.deviation / anomaly.expectedValue) * 100)}% below normal. Investigate potential causes.`,
            impact: 'high',
            actionable: true,
            suggestedAction: `Review recent changes in content strategy or posting schedule`,
            data: anomaly,
          });
        }
      }

      for (const trend of trends) {
        if (trend.trend === 'decreasing' && trend.confidence > 0.7) {
          insights.push({
            type: 'warning',
            title: `Declining ${trend.metric} trend`,
            description: `Your ${trend.metric} is trending downward with ${Math.round(trend.confidence * 100)}% confidence. Take action to reverse this trend.`,
            impact: 'medium',
            actionable: true,
            suggestedAction: `Experiment with new content formats or posting times`,
            data: trend,
          });
        } else if (trend.trend === 'increasing' && trend.confidence > 0.7) {
          insights.push({
            type: 'opportunity',
            title: `Growing ${trend.metric} momentum`,
            description: `Your ${trend.metric} is trending upward with ${Math.round(trend.confidence * 100)}% confidence. Maintain this momentum.`,
            impact: 'medium',
            actionable: true,
            suggestedAction: `Continue current strategy and consider increasing posting frequency`,
            data: trend,
          });
        }
      }

      return insights.slice(0, 5);
    } catch (error) {
      this.logger.error('Failed to generate insights', error);
      return [];
    }
  }

  async detectAnomalies(
    workspaceId: string,
    platform: string,
    startDate: Date,
    endDate: Date,
    sensitivity: number = 2.5,
  ): Promise<Anomaly[]> {
    this.logger.log(`Detecting anomalies with sensitivity ${sensitivity}`);

    try {
      const historicalData = await this.metricModel.aggregate([
        {
          $match: {
            workspaceId,
            platform,
            timestamp: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            engagement: {
              $sum: {
                $add: [
                  { $ifNull: ['$metrics.likes', 0] },
                  { $ifNull: ['$metrics.comments', 0] },
                  { $ifNull: ['$metrics.shares', 0] },
                  { $ifNull: ['$metrics.saves', 0] },
                ],
              },
            },
            reach: { $sum: '$metrics.reach' },
            impressions: { $sum: '$metrics.impressions' },
            followers: { $last: '$metrics.followers' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const anomalies: Anomaly[] = [];
      const metricsToCheck = ['engagement', 'reach', 'impressions', 'followers'];

      for (const metric of metricsToCheck) {
        const series = historicalData.map((d) => d[metric] || 0);
        
        if (series.length < 7) {
          continue;
        }

        const mean = stats.mean(series);
        const stdDev = stats.standardDeviation(series);
        const threshold = sensitivity * stdDev;

        for (let i = 0; i < historicalData.length; i++) {
          const value = historicalData[i][metric] || 0;
          const deviation = Math.abs(value - mean);

          if (deviation > threshold) {
            const severity = this.calculateAnomalySeverity(deviation, threshold);
            const type = value > mean ? 'spike' : 'drop';

            anomalies.push({
              date: historicalData[i]._id,
              metric,
              value,
              expectedValue: Math.round(mean),
              deviation: Math.round(deviation),
              severity,
              type,
            });
          }
        }
      }

      return anomalies.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    } catch (error) {
      this.logger.error('Failed to detect anomalies', error);
      return [];
    }
  }

  async predictPerformanceTrends(
    workspaceId: string,
    platform: string,
    metrics: string[] = ['engagement', 'reach', 'followers'],
    daysAhead: number = 30,
  ): Promise<PerformanceTrend[]> {
    this.logger.log(`Predicting performance trends for ${metrics.join(', ')}`);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const historicalData = await this.metricModel.aggregate([
        {
          $match: {
            workspaceId,
            platform,
            timestamp: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            engagement: {
              $sum: {
                $add: [
                  { $ifNull: ['$metrics.likes', 0] },
                  { $ifNull: ['$metrics.comments', 0] },
                  { $ifNull: ['$metrics.shares', 0] },
                  { $ifNull: ['$metrics.saves', 0] },
                ],
              },
            },
            reach: { $sum: '$metrics.reach' },
            impressions: { $sum: '$metrics.impressions' },
            followers: { $last: '$metrics.followers' },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const trends: PerformanceTrend[] = [];

      for (const metric of metrics) {
        const series = historicalData.map((d) => d[metric] || 0);
        
        if (series.length < 7) {
          continue;
        }

        const trend = this.calculateTrend(series);
        const trendDirection = this.determineTrendDirection(trend.slope, series);

        const predictions: number[] = [];
        const dates: string[] = [];
        const lastIndex = series.length - 1;

        for (let i = 1; i <= daysAhead; i++) {
          const futureIndex = lastIndex + i;
          const prediction = trend.slope * futureIndex + trend.intercept;
          predictions.push(Math.max(0, Math.round(prediction)));

          const date = new Date();
          date.setDate(date.getDate() + i);
          dates.push(date.toISOString().split('T')[0]);
        }

        const confidence = Math.min(0.95, Math.max(0.5, trend.rSquared));

        trends.push({
          metric,
          trend: trendDirection,
          changeRate: trend.slope,
          prediction: predictions,
          dates,
          confidence,
        });
      }

      return trends;
    } catch (error) {
      this.logger.error('Failed to predict performance trends', error);
      return [];
    }
  }
}
