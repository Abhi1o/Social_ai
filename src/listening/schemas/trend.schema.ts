import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TrendDocument = Trend & Document;

/**
 * Trend type classification
 */
export enum TrendType {
  HASHTAG = 'hashtag',
  TOPIC = 'topic',
  KEYWORD = 'keyword',
  CONVERSATION = 'conversation',
}

/**
 * Trend status based on growth velocity
 */
export enum TrendStatus {
  EMERGING = 'emerging', // New trend with high growth
  RISING = 'rising', // Growing trend
  STABLE = 'stable', // Consistent volume
  DECLINING = 'declining', // Decreasing volume
  VIRAL = 'viral', // Explosive growth
}

/**
 * MongoDB schema for trending topics and hashtags
 * Tracks trends across social platforms with growth metrics
 * 
 * Requirements: 9.4, 18.4
 */
@Schema({ 
  collection: 'trends',
  timestamps: true,
})
export class Trend {
  @Prop({ required: true, index: true })
  workspaceId: string;

  @Prop({ required: true, index: true })
  term: string; // The trending term (hashtag, keyword, topic)

  @Prop({ required: true, enum: TrendType, index: true })
  type: TrendType;

  @Prop({ required: true, enum: TrendStatus, index: true })
  status: TrendStatus;

  @Prop({ type: [String], index: true })
  platforms: string[]; // Platforms where this trend is active

  // Volume metrics
  @Prop({ required: true, default: 0 })
  currentVolume: number; // Current mention count

  @Prop({ required: true, default: 0 })
  previousVolume: number; // Previous period mention count

  @Prop({ required: true, default: 0 })
  peakVolume: number; // Highest volume recorded

  @Prop({ required: true })
  firstSeenAt: Date; // When trend was first detected

  @Prop({ required: true })
  lastSeenAt: Date; // Most recent mention

  // Growth metrics
  @Prop({ required: true, default: 0 })
  growthRate: number; // Percentage growth rate

  @Prop({ required: true, default: 0 })
  growthVelocity: number; // Rate of change in growth

  @Prop({ required: true, default: 0 })
  momentum: number; // Trend momentum score (0-100)

  // Engagement metrics
  @Prop({ required: true, default: 0 })
  totalEngagement: number; // Total likes, comments, shares

  @Prop({ required: true, default: 0 })
  averageEngagement: number; // Average engagement per mention

  @Prop({ required: true, default: 0 })
  reach: number; // Total reach/impressions

  // Sentiment analysis
  @Prop({ required: true, default: 0 })
  sentimentScore: number; // Average sentiment (-1 to 1)

  @Prop({ type: Object })
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };

  // Influencer involvement
  @Prop({ required: true, default: 0 })
  influencerCount: number; // Number of influencers discussing

  @Prop({ type: [String] })
  topInfluencers: string[]; // Top influencer usernames

  // Related trends
  @Prop({ type: [String] })
  relatedTerms: string[]; // Related hashtags/topics

  @Prop({ type: [String] })
  coOccurringTerms: string[]; // Terms that appear together

  // Geographic data
  @Prop({ type: [String] })
  topLocations: string[]; // Top geographic locations

  // Time-based metrics
  @Prop({ type: Object })
  hourlyDistribution: Record<string, number>; // Volume by hour

  @Prop({ type: Object })
  dailyDistribution: Record<string, number>; // Volume by day

  // Prediction
  @Prop()
  predictedPeakDate?: Date; // Predicted peak date

  @Prop()
  predictedDeclineDate?: Date; // Predicted decline date

  @Prop({ default: 0 })
  viralityScore: number; // Score indicating viral potential (0-100)

  // Metadata
  @Prop({ type: Object })
  metadata: {
    category?: string;
    industry?: string;
    language?: string;
    customTags?: string[];
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  expiresAt?: Date; // When to archive this trend
}

export const TrendSchema = SchemaFactory.createForClass(Trend);

// Create compound indexes for efficient querying
TrendSchema.index({ workspaceId: 1, status: 1, lastSeenAt: -1 });
TrendSchema.index({ workspaceId: 1, type: 1, growthRate: -1 });
TrendSchema.index({ workspaceId: 1, viralityScore: -1 });
TrendSchema.index({ term: 'text' }); // Text index for search
TrendSchema.index({ platforms: 1, status: 1 });
TrendSchema.index({ isActive: 1, expiresAt: 1 });
