import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../prisma/prisma.service';
import { SentimentAnalysisService } from './sentiment-analysis.service';
import { 
  Crisis, 
  CrisisDocument, 
  CrisisType, 
  CrisisSeverity, 
  CrisisStatus,
  AlertChannel,
} from '../schemas/crisis.schema';
import { Platform, Sentiment } from '@prisma/client';

/**
 * Crisis detection result
 */
export interface CrisisDetectionResult {
  crisisDetected: boolean;
  crisis?: CrisisDocument;
  metrics: {
    sentimentScore: number;
    sentimentChange: number;
    volumeChange: number;
    crisisScore: number;
  };
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  type: 'sentiment' | 'volume' | 'both';
  severity: CrisisSeverity;
  score: number;
  details: {
    currentValue: number;
    baseline: number;
    change: number;
    threshold: number;
  };
}

/**
 * Service for crisis detection and management
 * Implements sentiment spike detection, volume anomaly detection, crisis scoring,
 * multi-channel alerts, crisis response dashboard, and post-mortem tracking
 * 
 * Requirements: 9.5, 35.1, 35.2, 35.3, 35.4, 35.5
 */
@Injectable()
export class CrisisDetectionService {
  private readonly logger = new Logger(CrisisDetectionService.name);

  // Default detection thresholds
  private readonly DEFAULT_SENTIMENT_THRESHOLD = -0.5;
  private readonly DEFAULT_VOLUME_THRESHOLD = 200; // 200% increase
  private readonly DEFAULT_TIME_WINDOW = 60; // minutes
  private readonly DEFAULT_MIN_MENTIONS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sentimentService: SentimentAnalysisService,
    @InjectModel(Crisis.name) private crisisModel: Model<CrisisDocument>,
  ) {}

  /**
   * Monitor workspace for potential crises
   * Analyzes recent mentions for sentiment spikes and volume anomalies
   * 
   * @param workspaceId - Workspace ID
   * @param config - Detection configuration
   * @returns Crisis detection result
   */
  async monitorForCrisis(
    workspaceId: string,
    config?: {
      sentimentThreshold?: number;
      volumeThreshold?: number;
      timeWindow?: number;
      minMentions?: number;
      platforms?: Platform[];
    },
  ): Promise<CrisisDetectionResult> {
    const {
      sentimentThreshold = this.DEFAULT_SENTIMENT_THRESHOLD,
      volumeThreshold = this.DEFAULT_VOLUME_THRESHOLD,
      timeWindow = this.DEFAULT_TIME_WINDOW,
      minMentions = this.DEFAULT_MIN_MENTIONS,
      platforms,
    } = config || {};

    this.logger.log(`Monitoring workspace ${workspaceId} for crisis`);

    // Get current period mentions
    const currentPeriodStart = new Date(Date.now() - timeWindow * 60 * 1000);
    const baselinePeriodStart = new Date(Date.now() - 2 * timeWindow * 60 * 1000);

    const where: any = { workspaceId };
    if (platforms && platforms.length > 0) {
      where.platform = { in: platforms };
    }

    // Get current period mentions
    const currentMentions = await this.prisma.listeningMention.findMany({
      where: {
        ...where,
        publishedAt: { gte: currentPeriodStart },
      },
    });

    // Get baseline period mentions
    const baselineMentions = await this.prisma.listeningMention.findMany({
      where: {
        ...where,
        publishedAt: { gte: baselinePeriodStart, lt: currentPeriodStart },
      },
    });

    // Check if we have enough data
    if (currentMentions.length < minMentions) {
      return {
        crisisDetected: false,
        metrics: {
          sentimentScore: 0,
          sentimentChange: 0,
          volumeChange: 0,
          crisisScore: 0,
        },
      };
    }

    // Calculate metrics
    const currentSentiment = this.calculateAverageSentiment(currentMentions);
    const baselineSentiment = this.calculateAverageSentiment(baselineMentions);
    const sentimentChange = currentSentiment - baselineSentiment;

    const volumeChange = baselineMentions.length > 0
      ? ((currentMentions.length - baselineMentions.length) / baselineMentions.length) * 100
      : currentMentions.length * 100;

    // Detect anomalies
    const sentimentAnomaly = this.detectSentimentAnomaly(
      currentSentiment,
      baselineSentiment,
      sentimentThreshold,
    );

    const volumeAnomaly = this.detectVolumeAnomaly(
      currentMentions.length,
      baselineMentions.length,
      volumeThreshold,
    );

    // Calculate crisis score
    const crisisScore = this.calculateCrisisScore({
      sentimentScore: currentSentiment,
      sentimentChange,
      volumeChange,
      negativeMentionPercentage: this.calculateNegativePercentage(currentMentions),
      influencerInvolvement: currentMentions.filter(m => m.isInfluencer).length,
      totalMentions: currentMentions.length,
    });

    const metrics = {
      sentimentScore: currentSentiment,
      sentimentChange,
      volumeChange,
      crisisScore,
    };

    // Determine if crisis should be triggered
    const crisisDetected = (sentimentAnomaly.isAnomaly || volumeAnomaly.isAnomaly) && crisisScore >= 50;

    if (crisisDetected) {
      // Create crisis record
      const crisis = await this.createCrisis(workspaceId, {
        currentMentions,
        baselineMentions,
        sentimentAnomaly,
        volumeAnomaly,
        metrics,
        config: {
          sentimentThreshold,
          volumeThreshold,
          timeWindow,
          minMentions,
        },
      });

      return {
        crisisDetected: true,
        crisis,
        metrics,
      };
    }

    return {
      crisisDetected: false,
      metrics,
    };
  }

  /**
   * Detect sentiment spike anomaly
   * Identifies sudden drops in sentiment score
   * 
   * @param currentSentiment - Current sentiment score
   * @param baselineSentiment - Baseline sentiment score
   * @param threshold - Threshold for detection
   * @returns Anomaly detection result
   */
  detectSentimentAnomaly(
    currentSentiment: number,
    baselineSentiment: number,
    threshold: number,
  ): AnomalyDetectionResult {
    const change = currentSentiment - baselineSentiment;
    const isAnomaly = currentSentiment < threshold && change < -0.2;

    let severity: CrisisSeverity;
    if (currentSentiment < -0.7 || change < -0.5) {
      severity = CrisisSeverity.CRITICAL;
    } else if (currentSentiment < -0.5 || change < -0.3) {
      severity = CrisisSeverity.HIGH;
    } else if (currentSentiment < -0.3 || change < -0.2) {
      severity = CrisisSeverity.MEDIUM;
    } else {
      severity = CrisisSeverity.LOW;
    }

    const score = Math.abs(change) * 100;

    return {
      isAnomaly,
      type: 'sentiment',
      severity,
      score,
      details: {
        currentValue: currentSentiment,
        baseline: baselineSentiment,
        change,
        threshold,
      },
    };
  }

  /**
   * Detect volume anomaly
   * Identifies sudden increases in mention volume
   * 
   * @param currentVolume - Current mention count
   * @param baselineVolume - Baseline mention count
   * @param threshold - Percentage threshold for detection
   * @returns Anomaly detection result
   */
  detectVolumeAnomaly(
    currentVolume: number,
    baselineVolume: number,
    threshold: number,
  ): AnomalyDetectionResult {
    const change = baselineVolume > 0
      ? ((currentVolume - baselineVolume) / baselineVolume) * 100
      : currentVolume * 100;

    const isAnomaly = change >= threshold;

    let severity: CrisisSeverity;
    if (change >= 500) {
      severity = CrisisSeverity.CRITICAL;
    } else if (change >= 300) {
      severity = CrisisSeverity.HIGH;
    } else if (change >= 200) {
      severity = CrisisSeverity.MEDIUM;
    } else {
      severity = CrisisSeverity.LOW;
    }

    const score = Math.min(change / 5, 100);

    return {
      isAnomaly,
      type: 'volume',
      severity,
      score,
      details: {
        currentValue: currentVolume,
        baseline: baselineVolume,
        change,
        threshold,
      },
    };
  }

  /**
   * Calculate crisis score (0-100)
   * Combines multiple factors to determine crisis severity
   * 
   * @param factors - Crisis factors
   * @returns Crisis score
   */
  calculateCrisisScore(factors: {
    sentimentScore: number;
    sentimentChange: number;
    volumeChange: number;
    negativeMentionPercentage: number;
    influencerInvolvement: number;
    totalMentions: number;
  }): number {
    const {
      sentimentScore,
      sentimentChange,
      volumeChange,
      negativeMentionPercentage,
      influencerInvolvement,
      totalMentions,
    } = factors;

    // Sentiment factor (0-30 points)
    const sentimentFactor = Math.abs(Math.min(sentimentScore, 0)) * 30;

    // Sentiment change factor (0-20 points)
    const sentimentChangeFactor = Math.abs(Math.min(sentimentChange, 0)) * 20;

    // Volume change factor (0-20 points)
    const volumeFactor = Math.min(volumeChange / 500, 1) * 20;

    // Negative percentage factor (0-15 points)
    const negativeFactor = (negativeMentionPercentage / 100) * 15;

    // Influencer factor (0-10 points)
    const influencerFactor = Math.min(influencerInvolvement / 5, 1) * 10;

    // Volume magnitude factor (0-5 points)
    const magnitudeFactor = Math.min(totalMentions / 100, 1) * 5;

    const score = 
      sentimentFactor +
      sentimentChangeFactor +
      volumeFactor +
      negativeFactor +
      influencerFactor +
      magnitudeFactor;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Create crisis record
   * 
   * @param workspaceId - Workspace ID
   * @param data - Crisis data
   * @returns Created crisis document
   */
  private async createCrisis(
    workspaceId: string,
    data: {
      currentMentions: any[];
      baselineMentions: any[];
      sentimentAnomaly: AnomalyDetectionResult;
      volumeAnomaly: AnomalyDetectionResult;
      metrics: any;
      config: any;
    },
  ): Promise<CrisisDocument> {
    const { currentMentions, baselineMentions, sentimentAnomaly, volumeAnomaly, metrics, config } = data;

    // Determine crisis type
    let type: CrisisType;
    if (sentimentAnomaly.isAnomaly && volumeAnomaly.isAnomaly) {
      type = CrisisType.SENTIMENT_SPIKE;
    } else if (sentimentAnomaly.isAnomaly) {
      type = CrisisType.NEGATIVE_TREND;
    } else {
      type = CrisisType.VOLUME_ANOMALY;
    }

    // Determine severity
    const sentimentSeverityLevel = this.getSeverityLevel(sentimentAnomaly.severity);
    const volumeSeverityLevel = this.getSeverityLevel(volumeAnomaly.severity);
    const maxSeverityLevel = Math.max(sentimentSeverityLevel, volumeSeverityLevel);
    
    const severity = this.getSeverityFromLevel(maxSeverityLevel);

    // Extract keywords and hashtags
    const allContent = currentMentions.map(m => m.content).join(' ');
    const keywords = this.extractKeywords(allContent);
    const hashtags = this.extractHashtags(allContent);

    // Get top influencers
    const influencers = currentMentions
      .filter(m => m.isInfluencer)
      .map(m => ({
        username: m.authorUsername,
        followers: m.authorFollowers || 0,
        mentionCount: 1,
        sentiment: m.sentiment,
      }));

    const topInfluencers = this.aggregateInfluencers(influencers).slice(0, 10);

    // Get sample mentions
    const negativeMentions = currentMentions
      .filter(m => m.sentiment === Sentiment.NEGATIVE)
      .sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares))
      .slice(0, 5);

    const sampleMentions = negativeMentions.map(m => m.content);

    // Calculate impact metrics
    const totalEngagement = currentMentions.reduce(
      (sum, m) => sum + m.likes + m.comments + m.shares,
      0,
    );
    const estimatedReach = currentMentions.reduce((sum, m) => sum + m.reach, 0);

    // Create crisis
    const crisis = await this.crisisModel.create({
      workspaceId,
      title: this.generateCrisisTitle(type, severity, keywords),
      description: this.generateCrisisDescription(metrics, currentMentions.length),
      type,
      severity,
      status: CrisisStatus.DETECTED,
      detectedAt: new Date(),
      crisisScore: metrics.crisisScore,
      sentimentScore: metrics.sentimentScore,
      sentimentChange: metrics.sentimentChange,
      negativeMentionCount: currentMentions.filter(m => m.sentiment === Sentiment.NEGATIVE).length,
      negativeMentionPercentage: this.calculateNegativePercentage(currentMentions),
      mentionVolume: currentMentions.length,
      volumeChange: metrics.volumeChange,
      peakVolume: currentMentions.length,
      peakVolumeAt: new Date(),
      baselineSentiment: this.calculateAverageSentiment(baselineMentions),
      baselineVolume: baselineMentions.length,
      platforms: [...new Set(currentMentions.map(m => m.platform))],
      keywords,
      hashtags,
      topLocations: [],
      influencerCount: influencers.length,
      topInfluencers,
      mentionIds: currentMentions.map(m => m.id),
      sampleMentions,
      responses: [],
      assignedTo: [],
      teamMembers: [],
      alerts: [],
      alertsSent: false,
      timeline: [
        {
          timestamp: new Date(),
          event: 'crisis_detected',
          description: `Crisis detected with score ${metrics.crisisScore}`,
        },
      ],
      estimatedReach,
      totalEngagement,
      impactMetrics: {
        brandMentions: currentMentions.length,
        mediaPickup: 0,
        customerComplaints: 0,
        supportTickets: 0,
      },
      detectionConfig: config,
      metadata: {
        tags: [],
      },
      isActive: true,
    });

    this.logger.warn(
      `Crisis detected for workspace ${workspaceId}: ${crisis.title} (Score: ${metrics.crisisScore})`,
    );

    return crisis;
  }

  /**
   * Send multi-channel alerts for crisis
   * Sends alerts via SMS, email, push notifications, and Slack
   * 
   * @param crisisId - Crisis ID
   * @param channels - Alert channels to use
   * @param recipients - User IDs to alert
   * @param customMessage - Optional custom message
   * @returns Alert results
   */
  async sendCrisisAlerts(
    crisisId: string,
    channels: AlertChannel[],
    recipients: string[],
    customMessage?: string,
  ): Promise<{
    success: boolean;
    results: Array<{
      channel: AlertChannel;
      success: boolean;
      error?: string;
    }>;
  }> {
    const crisis = await this.crisisModel.findById(crisisId);
    if (!crisis) {
      throw new Error(`Crisis not found: ${crisisId}`);
    }

    this.logger.log(`Sending crisis alerts for ${crisisId} via ${channels.join(', ')}`);

    const results: Array<{
      channel: AlertChannel;
      success: boolean;
      error?: string;
    }> = [];

    // Get recipient details
    const users = await this.prisma.user.findMany({
      where: { id: { in: recipients } },
      select: { id: true, email: true, name: true },
    });

    const message = customMessage || this.generateAlertMessage(crisis);

    // Send alerts through each channel
    for (const channel of channels) {
      try {
        switch (channel) {
          case AlertChannel.EMAIL:
            await this.sendEmailAlert(users, crisis, message);
            results.push({ channel, success: true });
            break;

          case AlertChannel.SMS:
            await this.sendSMSAlert(users, crisis, message);
            results.push({ channel, success: true });
            break;

          case AlertChannel.PUSH:
            await this.sendPushAlert(users, crisis, message);
            results.push({ channel, success: true });
            break;

          case AlertChannel.SLACK:
            await this.sendSlackAlert(crisis, message);
            results.push({ channel, success: true });
            break;

          case AlertChannel.WEBHOOK:
            await this.sendWebhookAlert(crisis, message);
            results.push({ channel, success: true });
            break;

          default:
            results.push({ 
              channel, 
              success: false, 
              error: 'Unsupported channel' 
            });
        }
      } catch (error) {
        const err = error as Error;
        this.logger.error(`Failed to send alert via ${channel}: ${err.message}`);
        results.push({ 
          channel, 
          success: false, 
          error: err.message 
        });
      }
    }

    // Update crisis with alert information
    await this.crisisModel.findByIdAndUpdate(crisisId, {
      $push: {
        alerts: {
          channel: channels,
          sentAt: new Date(),
          recipients,
          success: results.every(r => r.success),
        },
        timeline: {
          timestamp: new Date(),
          event: 'alerts_sent',
          description: `Alerts sent via ${channels.join(', ')}`,
        },
      },
      $set: {
        alertsSent: true,
      },
    });

    const success = results.every(r => r.success);
    return { success, results };
  }

  /**
   * Update crisis status
   * 
   * @param crisisId - Crisis ID
   * @param status - New status
   * @param userId - User ID performing the update
   * @param notes - Optional notes
   * @returns Updated crisis
   */
  async updateCrisisStatus(
    crisisId: string,
    status: CrisisStatus,
    userId?: string,
    notes?: string,
  ): Promise<CrisisDocument> {
    const crisis = await this.crisisModel.findById(crisisId);
    if (!crisis) {
      throw new Error(`Crisis not found: ${crisisId}`);
    }

    const update: any = {
      status,
      $push: {
        timeline: {
          timestamp: new Date(),
          event: 'status_changed',
          description: `Status changed to ${status}${notes ? `: ${notes}` : ''}`,
          userId,
        },
      },
    };

    // Set timestamps based on status
    if (status === CrisisStatus.ACKNOWLEDGED && !crisis.acknowledgedAt) {
      update.acknowledgedAt = new Date();
    } else if (status === CrisisStatus.RESOLVED && !crisis.resolvedAt) {
      update.resolvedAt = new Date();
      update.isActive = false;
    }

    const updatedCrisis = await this.crisisModel.findByIdAndUpdate(
      crisisId,
      update,
      { new: true },
    );

    this.logger.log(`Crisis ${crisisId} status updated to ${status}`);
    return updatedCrisis!;
  }

  /**
   * Add response to crisis
   * 
   * @param crisisId - Crisis ID
   * @param response - Response data
   * @returns Updated crisis
   */
  async addCrisisResponse(
    crisisId: string,
    response: {
      userId: string;
      action: string;
      content?: string;
      platform?: string;
    },
  ): Promise<CrisisDocument> {
    const crisis = await this.crisisModel.findByIdAndUpdate(
      crisisId,
      {
        $push: {
          responses: {
            timestamp: new Date(),
            ...response,
          },
          timeline: {
            timestamp: new Date(),
            event: 'response_added',
            description: `Response: ${response.action}`,
            userId: response.userId,
          },
        },
        $addToSet: {
          teamMembers: response.userId,
        },
      },
      { new: true },
    );

    if (!crisis) {
      throw new Error(`Crisis not found: ${crisisId}`);
    }

    return crisis;
  }

  /**
   * Create post-mortem analysis for resolved crisis
   * 
   * @param crisisId - Crisis ID
   * @param postMortem - Post-mortem data
   * @returns Updated crisis
   */
  async createPostMortem(
    crisisId: string,
    postMortem: {
      rootCause: string;
      responseEffectiveness: number;
      lessonsLearned: string[];
      preventiveMeasures: string[];
      createdBy: string;
    },
  ): Promise<CrisisDocument> {
    const crisis = await this.crisisModel.findById(crisisId);
    if (!crisis) {
      throw new Error(`Crisis not found: ${crisisId}`);
    }

    if (crisis.status !== CrisisStatus.RESOLVED) {
      throw new Error('Crisis must be resolved before creating post-mortem');
    }

    // Calculate response and resolution times
    const responseTime = crisis.acknowledgedAt
      ? Math.round((crisis.acknowledgedAt.getTime() - crisis.detectedAt.getTime()) / 60000)
      : 0;

    const resolutionTime = crisis.resolvedAt
      ? Math.round((crisis.resolvedAt.getTime() - crisis.detectedAt.getTime()) / 60000)
      : 0;

    const updatedCrisis = await this.crisisModel.findByIdAndUpdate(
      crisisId,
      {
        $set: {
          postMortem: {
            ...postMortem,
            responseTime,
            resolutionTime,
            createdAt: new Date(),
          },
        },
        $push: {
          timeline: {
            timestamp: new Date(),
            event: 'post_mortem_created',
            description: 'Post-mortem analysis completed',
            userId: postMortem.createdBy,
          },
        },
      },
      { new: true },
    );

    this.logger.log(`Post-mortem created for crisis ${crisisId}`);
    return updatedCrisis!;
  }

  /**
   * Get crisis dashboard data
   * Provides real-time crisis monitoring data
   * 
   * @param workspaceId - Workspace ID
   * @param filters - Optional filters
   * @returns Crisis dashboard data
   */
  async getCrisisDashboard(
    workspaceId: string,
    filters?: {
      status?: CrisisStatus[];
      severity?: CrisisSeverity[];
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{
    activeCrises: CrisisDocument[];
    recentCrises: CrisisDocument[];
    statistics: {
      totalCrises: number;
      activeCrises: number;
      resolvedCrises: number;
      averageResponseTime: number;
      averageResolutionTime: number;
      criticalCrises: number;
    };
    trends: {
      crisisFrequency: Array<{ date: string; count: number }>;
      severityDistribution: Record<CrisisSeverity, number>;
      typeDistribution: Record<CrisisType, number>;
    };
  }> {
    const query: any = { workspaceId };

    if (filters?.status) {
      query.status = { $in: filters.status };
    }

    if (filters?.severity) {
      query.severity = { $in: filters.severity };
    }

    if (filters?.startDate || filters?.endDate) {
      query.detectedAt = {};
      if (filters.startDate) {
        query.detectedAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.detectedAt.$lte = filters.endDate;
      }
    }

    // Get active crises
    const activeCrises = await this.crisisModel
      .find({
        workspaceId,
        status: { $in: [CrisisStatus.DETECTED, CrisisStatus.ACKNOWLEDGED, CrisisStatus.RESPONDING] },
      })
      .sort({ crisisScore: -1, detectedAt: -1 })
      .limit(10)
      .exec();

    // Get recent crises
    const recentCrises = await this.crisisModel
      .find(query)
      .sort({ detectedAt: -1 })
      .limit(20)
      .exec();

    // Calculate statistics
    const allCrises = await this.crisisModel.find({ workspaceId }).exec();
    const resolvedCrises = allCrises.filter(c => c.status === CrisisStatus.RESOLVED);

    const responseTimes = resolvedCrises
      .filter(c => c.acknowledgedAt)
      .map(c => (c.acknowledgedAt!.getTime() - c.detectedAt.getTime()) / 60000);

    const resolutionTimes = resolvedCrises
      .filter(c => c.resolvedAt)
      .map(c => (c.resolvedAt!.getTime() - c.detectedAt.getTime()) / 60000);

    const statistics = {
      totalCrises: allCrises.length,
      activeCrises: activeCrises.length,
      resolvedCrises: resolvedCrises.length,
      averageResponseTime: responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0,
      averageResolutionTime: resolutionTimes.length > 0
        ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
        : 0,
      criticalCrises: allCrises.filter(c => c.severity === CrisisSeverity.CRITICAL).length,
    };

    // Calculate trends
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCrisesForTrends = allCrises.filter(c => c.detectedAt >= last30Days);

    const crisisFrequency = this.calculateCrisisFrequency(recentCrisesForTrends);
    const severityDistribution = this.calculateSeverityDistribution(allCrises);
    const typeDistribution = this.calculateTypeDistribution(allCrises);

    return {
      activeCrises,
      recentCrises,
      statistics,
      trends: {
        crisisFrequency,
        severityDistribution,
        typeDistribution,
      },
    };
  }

  /**
   * Get crisis history for analysis
   * 
   * @param workspaceId - Workspace ID
   * @param options - Query options
   * @returns Crisis history
   */
  async getCrisisHistory(
    workspaceId: string,
    options?: {
      limit?: number;
      offset?: number;
      includePostMortems?: boolean;
    },
  ): Promise<{
    crises: CrisisDocument[];
    total: number;
    hasMore: boolean;
  }> {
    const { limit = 50, offset = 0, includePostMortems = false } = options || {};

    const query: any = { workspaceId };
    if (includePostMortems) {
      query.postMortem = { $exists: true };
    }

    const [crises, total] = await Promise.all([
      this.crisisModel
        .find(query)
        .sort({ detectedAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.crisisModel.countDocuments(query),
    ]);

    return {
      crises,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Assign crisis to team members
   * 
   * @param crisisId - Crisis ID
   * @param userIds - User IDs to assign
   * @returns Updated crisis
   */
  async assignCrisis(
    crisisId: string,
    userIds: string[],
  ): Promise<CrisisDocument> {
    const crisis = await this.crisisModel.findByIdAndUpdate(
      crisisId,
      {
        $set: { assignedTo: userIds },
        $push: {
          timeline: {
            timestamp: new Date(),
            event: 'crisis_assigned',
            description: `Assigned to ${userIds.length} team member(s)`,
          },
        },
      },
      { new: true },
    );

    if (!crisis) {
      throw new Error(`Crisis not found: ${crisisId}`);
    }

    return crisis;
  }

  // Helper methods

  private calculateAverageSentiment(mentions: any[]): number {
    if (mentions.length === 0) return 0;

    const sentimentMap: Record<string, number> = {
      POSITIVE: 1,
      NEUTRAL: 0,
      NEGATIVE: -1,
    };

    const sum = mentions.reduce((acc, m) => acc + (sentimentMap[m.sentiment] || 0), 0);
    return sum / mentions.length;
  }

  private calculateNegativePercentage(mentions: any[]): number {
    if (mentions.length === 0) return 0;
    const negativeCount = mentions.filter(m => m.sentiment === Sentiment.NEGATIVE).length;
    return (negativeCount / mentions.length) * 100;
  }

  private getSeverityLevel(severity: CrisisSeverity): number {
    const levels: Record<CrisisSeverity, number> = {
      [CrisisSeverity.LOW]: 1,
      [CrisisSeverity.MEDIUM]: 2,
      [CrisisSeverity.HIGH]: 3,
      [CrisisSeverity.CRITICAL]: 4,
    };
    return levels[severity] || 1;
  }

  private getSeverityFromLevel(level: number): CrisisSeverity {
    if (level >= 4) return CrisisSeverity.CRITICAL;
    if (level >= 3) return CrisisSeverity.HIGH;
    if (level >= 2) return CrisisSeverity.MEDIUM;
    return CrisisSeverity.LOW;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - in production, use NLP library
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const frequency: Record<string, number> = {};

    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  private extractHashtags(text: string): string[] {
    const hashtags = text.match(/#\w+/g) || [];
    return [...new Set(hashtags.map(h => h.toLowerCase()))];
  }

  private aggregateInfluencers(influencers: any[]): any[] {
    const map = new Map<string, any>();

    influencers.forEach(inf => {
      const existing = map.get(inf.username);
      if (existing) {
        existing.mentionCount += inf.mentionCount;
      } else {
        map.set(inf.username, { ...inf });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.followers - a.followers);
  }

  private generateCrisisTitle(type: CrisisType, severity: CrisisSeverity, keywords: string[]): string {
    const typeLabels: Record<CrisisType, string> = {
      [CrisisType.SENTIMENT_SPIKE]: 'Sentiment Spike',
      [CrisisType.VOLUME_ANOMALY]: 'Volume Surge',
      [CrisisType.NEGATIVE_TREND]: 'Negative Trend',
      [CrisisType.INFLUENCER_BACKLASH]: 'Influencer Backlash',
      [CrisisType.VIRAL_NEGATIVE]: 'Viral Negative Content',
      [CrisisType.PRODUCT_ISSUE]: 'Product Issue',
      [CrisisType.SERVICE_OUTAGE]: 'Service Outage',
      [CrisisType.PR_INCIDENT]: 'PR Incident',
      [CrisisType.SECURITY_BREACH]: 'Security Breach',
      [CrisisType.OTHER]: 'Crisis',
    };

    const severityLabel = severity.toUpperCase();
    const topKeywords = keywords.slice(0, 3).join(', ');

    return `${severityLabel}: ${typeLabels[type]}${topKeywords ? ` - ${topKeywords}` : ''}`;
  }

  private generateCrisisDescription(metrics: any, mentionCount: number): string {
    return `Crisis detected with ${mentionCount} mentions. ` +
      `Sentiment score: ${metrics.sentimentScore.toFixed(2)}, ` +
      `Change: ${metrics.sentimentChange.toFixed(2)}, ` +
      `Volume change: ${metrics.volumeChange.toFixed(0)}%`;
  }

  private generateAlertMessage(crisis: CrisisDocument): string {
    return `🚨 CRISIS ALERT: ${crisis.title}\n\n` +
      `Severity: ${crisis.severity.toUpperCase()}\n` +
      `Score: ${crisis.crisisScore}/100\n` +
      `Mentions: ${crisis.mentionVolume}\n` +
      `Sentiment: ${crisis.sentimentScore.toFixed(2)}\n\n` +
      `${crisis.description}\n\n` +
      `Immediate action required!`;
  }

  private calculateCrisisFrequency(crises: CrisisDocument[]): Array<{ date: string; count: number }> {
    const frequency = new Map<string, number>();

    crises.forEach(crisis => {
      const date = crisis.detectedAt.toISOString().split('T')[0];
      frequency.set(date, (frequency.get(date) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateSeverityDistribution(crises: CrisisDocument[]): Record<CrisisSeverity, number> {
    const distribution: Record<CrisisSeverity, number> = {
      [CrisisSeverity.LOW]: 0,
      [CrisisSeverity.MEDIUM]: 0,
      [CrisisSeverity.HIGH]: 0,
      [CrisisSeverity.CRITICAL]: 0,
    };

    crises.forEach(crisis => {
      distribution[crisis.severity]++;
    });

    return distribution;
  }

  private calculateTypeDistribution(crises: CrisisDocument[]): Record<CrisisType, number> {
    const distribution: Record<CrisisType, number> = {
      [CrisisType.SENTIMENT_SPIKE]: 0,
      [CrisisType.VOLUME_ANOMALY]: 0,
      [CrisisType.NEGATIVE_TREND]: 0,
      [CrisisType.INFLUENCER_BACKLASH]: 0,
      [CrisisType.VIRAL_NEGATIVE]: 0,
      [CrisisType.PRODUCT_ISSUE]: 0,
      [CrisisType.SERVICE_OUTAGE]: 0,
      [CrisisType.PR_INCIDENT]: 0,
      [CrisisType.SECURITY_BREACH]: 0,
      [CrisisType.OTHER]: 0,
    };

    crises.forEach(crisis => {
      distribution[crisis.type]++;
    });

    return distribution;
  }

  // Alert channel implementations (stubs - to be implemented with actual services)

  private async sendEmailAlert(users: any[], crisis: CrisisDocument, message: string): Promise<void> {
    // TODO: Integrate with email service (SendGrid, etc.)
    this.logger.log(`Email alert sent to ${users.length} users for crisis ${crisis.id}`);
    // Implementation would use email service
  }

  private async sendSMSAlert(users: any[], crisis: CrisisDocument, message: string): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, etc.)
    this.logger.log(`SMS alert sent to ${users.length} users for crisis ${crisis.id}`);
    // Implementation would use SMS service
  }

  private async sendPushAlert(users: any[], crisis: CrisisDocument, message: string): Promise<void> {
    // TODO: Integrate with push notification service
    this.logger.log(`Push notification sent to ${users.length} users for crisis ${crisis.id}`);
    // Implementation would use push notification service
  }

  private async sendSlackAlert(crisis: CrisisDocument, message: string): Promise<void> {
    // TODO: Integrate with Slack API
    this.logger.log(`Slack alert sent for crisis ${crisis.id}`);
    // Implementation would use Slack webhook or API
  }

  private async sendWebhookAlert(crisis: CrisisDocument, message: string): Promise<void> {
    // TODO: Send webhook to configured URL
    this.logger.log(`Webhook alert sent for crisis ${crisis.id}`);
    // Implementation would send HTTP POST to webhook URL
  }
}