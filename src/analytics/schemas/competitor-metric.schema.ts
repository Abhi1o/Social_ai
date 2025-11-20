import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompetitorMetricDocument = CompetitorMetric & Document;

@Schema({ collection: 'competitor_metrics', timestamps: true })
export class CompetitorMetric {
  @Prop({ required: true, index: true })
  workspaceId: string;

  @Prop({ required: true, index: true })
  competitorId: string;

  @Prop({ required: true, index: true })
  competitorAccountId: string;

  @Prop({ required: true, enum: ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'threads', 'reddit'] })
  platform: string;

  @Prop({ required: true, index: true })
  timestamp: Date;

  // Follower metrics
  @Prop({ default: 0 })
  followers: number;

  @Prop({ default: 0 })
  following: number;

  // Engagement metrics
  @Prop({ default: 0 })
  totalPosts: number;

  @Prop({ default: 0 })
  totalLikes: number;

  @Prop({ default: 0 })
  totalComments: number;

  @Prop({ default: 0 })
  totalShares: number;

  @Prop({ default: 0 })
  totalViews: number;

  @Prop({ default: 0 })
  totalSaves: number;

  // Calculated metrics
  @Prop({ default: 0 })
  engagementRate: number;

  @Prop({ default: 0 })
  averageLikesPerPost: number;

  @Prop({ default: 0 })
  averageCommentsPerPost: number;

  @Prop({ default: 0 })
  postingFrequency: number; // Posts per day

  // Content analysis
  @Prop({ type: Object })
  contentTypes?: {
    image?: number;
    video?: number;
    carousel?: number;
    text?: number;
  };

  @Prop({ type: [String] })
  topHashtags?: string[];

  @Prop({ type: [String] })
  topMentions?: string[];

  // Metadata
  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const CompetitorMetricSchema = SchemaFactory.createForClass(CompetitorMetric);

// Create indexes for efficient querying
CompetitorMetricSchema.index({ workspaceId: 1, timestamp: -1 });
CompetitorMetricSchema.index({ competitorId: 1, timestamp: -1 });
CompetitorMetricSchema.index({ competitorAccountId: 1, timestamp: -1 });
CompetitorMetricSchema.index({ workspaceId: 1, platform: 1, timestamp: -1 });
