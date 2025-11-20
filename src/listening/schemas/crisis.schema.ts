import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CrisisDocument = Crisis & Document;

/**
 * Crisis severity levels
 */
export enum CrisisSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Crisis status
 */
export enum CrisisStatus {
  DETECTED = 'detected',
  ACKNOWLEDGED = 'acknowledged',
  RESPONDING = 'responding',
  RESOLVED = 'resolved',
  FALSE_ALARM = 'false_alarm',
}

/**
 * Crisis type classification
 */
export enum CrisisType {
  SENTIMENT_SPIKE = 'sentiment_spike',
  VOLUME_ANOMALY = 'volume_anomaly',
  NEGATIVE_TREND = 'negative_trend',
  INFLUENCER_BACKLASH = 'influencer_backlash',
  VIRAL_NEGATIVE = 'viral_negative',
  PRODUCT_ISSUE = 'product_issue',
  SERVICE_OUTAGE = 'service_outage',
  PR_INCIDENT = 'pr_incident',
  SECURITY_BREACH = 'security_breach',
  OTHER = 'other',
}

/**
 * Alert channel types
 */
export enum AlertChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
}

/**
 * MongoDB schema for crisis detection and tracking
 * Monitors sentiment spikes, volume anomalies, and negative trends
 * 
 * Requirements: 9.5, 35.1, 35.2, 35.3, 35.4, 35.5
 */
@Schema({ 
  collection: 'crises',
  timestamps: true,
})
export class Crisis {
  @Prop({ required: true, index: true })
  workspaceId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: CrisisType, index: true })
  type: CrisisType;

  @Prop({ required: true, enum: CrisisSeverity, index: true })
  severity: CrisisSeverity;

  @Prop({ required: true, enum: CrisisStatus, index: true })
  status: CrisisStatus;

  // Detection metrics
  @Prop({ required: true })
  detectedAt: Date;

  @Prop()
  acknowledgedAt?: Date;

  @Prop()
  resolvedAt?: Date;

  @Prop({ required: true, default: 0 })
  crisisScore: number; // 0-100 scale

  // Sentiment metrics
  @Prop({ required: true, default: 0 })
  sentimentScore: number; // -1 to 1

  @Prop({ required: true, default: 0 })
  sentimentChange: number; // Change from baseline

  @Prop({ required: true, default: 0 })
  negativeMentionCount: number;

  @Prop({ required: true, default: 0 })
  negativeMentionPercentage: number;

  // Volume metrics
  @Prop({ required: true, default: 0 })
  mentionVolume: number;

  @Prop({ required: true, default: 0 })
  volumeChange: number; // Percentage change from baseline

  @Prop({ required: true, default: 0 })
  peakVolume: number;

  @Prop()
  peakVolumeAt?: Date;

  // Baseline comparison
  @Prop({ required: true, default: 0 })
  baselineSentiment: number;

  @Prop({ required: true, default: 0 })
  baselineVolume: number;

  // Affected areas
  @Prop({ type: [String], index: true })
  platforms: string[];

  @Prop({ type: [String] })
  keywords: string[];

  @Prop({ type: [String] })
  hashtags: string[];

  @Prop({ type: [String] })
  topLocations: string[];

  // Influencer involvement
  @Prop({ required: true, default: 0 })
  influencerCount: number;

  @Prop({ type: [Object] })
  topInfluencers: Array<{
    username: string;
    followers: number;
    mentionCount: number;
    sentiment: string;
  }>;

  // Related mentions
  @Prop({ type: [String] })
  mentionIds: string[];

  @Prop({ type: [String] })
  sampleMentions: string[]; // Sample mention content for context

  // Response tracking
  @Prop({ type: [Object] })
  responses: Array<{
    timestamp: Date;
    userId: string;
    action: string;
    content?: string;
    platform?: string;
  }>;

  @Prop({ type: [String] })
  assignedTo: string[]; // User IDs

  @Prop({ type: [String] })
  teamMembers: string[]; // User IDs involved in response

  // Alert tracking
  @Prop({ type: [Object] })
  alerts: Array<{
    channel: AlertChannel;
    sentAt: Date;
    recipients: string[];
    success: boolean;
    error?: string;
  }>;

  @Prop({ required: true, default: false })
  alertsSent: boolean;

  // Timeline
  @Prop({ type: [Object] })
  timeline: Array<{
    timestamp: Date;
    event: string;
    description: string;
    userId?: string;
    metadata?: Record<string, any>;
  }>;

  // Impact assessment
  @Prop({ required: true, default: 0 })
  estimatedReach: number;

  @Prop({ required: true, default: 0 })
  totalEngagement: number;

  @Prop({ type: Object })
  impactMetrics: {
    brandMentions: number;
    mediaPickup: number;
    customerComplaints: number;
    supportTickets: number;
    websiteTraffic?: number;
    salesImpact?: number;
  };

  // Post-mortem
  @Prop()
  postMortem?: {
    rootCause: string;
    responseEffectiveness: number; // 0-100
    lessonsLearned: string[];
    preventiveMeasures: string[];
    responseTime: number; // minutes
    resolutionTime: number; // minutes
    createdAt: Date;
    createdBy: string;
  };

  // Configuration
  @Prop({ type: Object })
  detectionConfig: {
    sentimentThreshold: number;
    volumeThreshold: number;
    timeWindow: number; // minutes
    minMentions: number;
  };

  // Metadata
  @Prop({ type: Object })
  metadata: {
    category?: string;
    tags?: string[];
    relatedCrisisIds?: string[];
    externalReferences?: string[];
    notes?: string;
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  expiresAt?: Date;
}

export const CrisisSchema = SchemaFactory.createForClass(Crisis);

// Create compound indexes for efficient querying
CrisisSchema.index({ workspaceId: 1, status: 1, detectedAt: -1 });
CrisisSchema.index({ workspaceId: 1, severity: 1, detectedAt: -1 });
CrisisSchema.index({ workspaceId: 1, type: 1, status: 1 });
CrisisSchema.index({ workspaceId: 1, crisisScore: -1 });
CrisisSchema.index({ platforms: 1, status: 1 });
CrisisSchema.index({ isActive: 1, expiresAt: 1 });
CrisisSchema.index({ assignedTo: 1, status: 1 });
