import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationClusterDocument = ConversationCluster & Document;

/**
 * MongoDB schema for conversation clustering
 * Groups related mentions and conversations by topic/theme
 * 
 * Requirements: 9.4
 */
@Schema({ 
  collection: 'conversation_clusters',
  timestamps: true,
})
export class ConversationCluster {
  @Prop({ required: true, index: true })
  workspaceId: string;

  @Prop({ required: true })
  name: string; // Auto-generated cluster name

  @Prop()
  description?: string; // Auto-generated description

  // Cluster identification
  @Prop({ required: true, type: [String] })
  keywords: string[]; // Key terms defining this cluster

  @Prop({ required: true, type: [String] })
  hashtags: string[]; // Hashtags in this cluster

  @Prop({ type: [String] })
  mentionIds: string[]; // IDs of mentions in this cluster

  // Cluster metrics
  @Prop({ required: true, default: 0 })
  size: number; // Number of mentions in cluster

  @Prop({ required: true, default: 0 })
  cohesionScore: number; // How tightly related the mentions are (0-1)

  @Prop({ required: true, default: 0 })
  diversityScore: number; // Diversity of authors/sources (0-1)

  // Temporal data
  @Prop({ required: true })
  startDate: Date; // When cluster started forming

  @Prop({ required: true })
  endDate: Date; // Most recent activity

  @Prop({ required: true })
  peakDate: Date; // Date of highest activity

  @Prop({ required: true, default: 0 })
  peakVolume: number; // Highest mention count in a period

  // Engagement metrics
  @Prop({ required: true, default: 0 })
  totalEngagement: number;

  @Prop({ required: true, default: 0 })
  averageEngagement: number;

  @Prop({ required: true, default: 0 })
  totalReach: number;

  // Sentiment analysis
  @Prop({ required: true, default: 0 })
  averageSentiment: number; // -1 to 1

  @Prop({ type: Object })
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };

  // Platform distribution
  @Prop({ type: Object })
  platformDistribution: Record<string, number>; // Platform -> count

  // Top contributors
  @Prop({ type: [Object] })
  topContributors: Array<{
    authorId: string;
    authorUsername: string;
    mentionCount: number;
    totalEngagement: number;
  }>;

  // Geographic data
  @Prop({ type: [String] })
  topLocations: string[];

  // Related clusters
  @Prop({ type: [String] })
  relatedClusterIds: string[]; // IDs of related clusters

  // Cluster evolution
  @Prop({ type: [Object] })
  evolutionTimeline: Array<{
    date: Date;
    size: number;
    sentiment: number;
    keywords: string[];
  }>;

  // Classification
  @Prop({ type: [String] })
  categories: string[]; // Auto-detected categories

  @Prop({ type: [String] })
  topics: string[]; // Main topics discussed

  // Status
  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  mergedIntoClusterId?: string; // If merged into another cluster

  @Prop({ type: Object })
  metadata: {
    language?: string;
    industry?: string;
    customTags?: string[];
  };
}

export const ConversationClusterSchema = SchemaFactory.createForClass(ConversationCluster);

// Create indexes
ConversationClusterSchema.index({ workspaceId: 1, isActive: 1, endDate: -1 });
ConversationClusterSchema.index({ workspaceId: 1, size: -1 });
ConversationClusterSchema.index({ workspaceId: 1, cohesionScore: -1 });
ConversationClusterSchema.index({ keywords: 1 });
ConversationClusterSchema.index({ hashtags: 1 });
