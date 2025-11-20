import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AggregatedMetricDocument = AggregatedMetric & Document;

@Schema({ collection: 'aggregated_metrics' })
export class AggregatedMetric {
  @Prop({ required: true, index: true })
  workspaceId: string;

  @Prop({ required: true, index: true })
  accountId: string;

  @Prop({ required: true, index: true })
  platform: string;

  @Prop({ required: true, index: true })
  period: string; // 'daily', 'weekly', 'monthly'

  @Prop({ required: true })
  periodStart: Date;

  @Prop({ required: true })
  periodEnd: Date;

  @Prop({ type: Object })
  metadata: {
    postId?: string;
    contentType?: string;
  };

  @Prop({ type: Object, required: true })
  aggregatedMetrics: {
    // Sum metrics
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalSaves: number;
    totalImpressions: number;
    totalReach: number;
    totalViews: number;
    
    // Average metrics
    avgEngagementRate: number;
    avgLikes: number;
    avgComments: number;
    avgShares: number;
    
    // Min/Max metrics
    maxLikes: number;
    minLikes: number;
    maxEngagementRate: number;
    minEngagementRate: number;
    
    // Count metrics
    postCount: number;
    
    // Growth metrics
    followerGrowth: number;
    followerGrowthRate: number;
  };

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const AggregatedMetricSchema = SchemaFactory.createForClass(AggregatedMetric);

// Create compound indexes for efficient querying
AggregatedMetricSchema.index({ workspaceId: 1, period: 1, periodStart: -1 });
AggregatedMetricSchema.index({ accountId: 1, period: 1, periodStart: -1 });
AggregatedMetricSchema.index({ workspaceId: 1, platform: 1, period: 1, periodStart: -1 });
