import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MetricDocument = Metric & Document;

@Schema({ 
  collection: 'metrics',
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'hours'
  }
})
export class Metric {
  @Prop({ required: true, index: true })
  workspaceId: string;

  @Prop({ required: true, index: true })
  accountId: string;

  @Prop({ required: true, index: true })
  platform: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true, index: true })
  metricType: string; // 'post', 'account', 'story', 'reel'

  @Prop({ type: Object })
  metadata: {
    postId?: string;
    platformPostId?: string;
    contentType?: string;
  };

  @Prop({ type: Object, required: true })
  metrics: {
    // Engagement metrics
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    
    // Reach metrics
    impressions?: number;
    reach?: number;
    
    // Follower metrics
    followers?: number;
    following?: number;
    
    // Video metrics
    views?: number;
    watchTime?: number;
    completionRate?: number;
    
    // Story metrics
    replies?: number;
    exits?: number;
    tapsForward?: number;
    tapsBack?: number;
    
    // Profile metrics
    profileViews?: number;
    websiteClicks?: number;
    emailClicks?: number;
    
    // Calculated metrics
    engagementRate?: number;
  };

  @Prop({ default: Date.now })
  collectedAt: Date;
}

export const MetricSchema = SchemaFactory.createForClass(Metric);

// Create indexes for efficient querying
MetricSchema.index({ workspaceId: 1, timestamp: -1 });
MetricSchema.index({ accountId: 1, timestamp: -1 });
MetricSchema.index({ workspaceId: 1, platform: 1, timestamp: -1 });
MetricSchema.index({ 'metadata.postId': 1, timestamp: -1 });
