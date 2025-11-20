import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InfluencerDocument = Influencer & Document;

@Schema({ timestamps: true })
export class Influencer {
  @Prop({ required: true, index: true })
  workspaceId: string;

  @Prop({ required: true, index: true })
  platform: string;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  displayName: string;

  @Prop()
  avatar: string;

  @Prop()
  bio: string;

  @Prop({ type: Object })
  metrics: {
    followers: number;
    following: number;
    posts: number;
    engagementRate: number;
    avgLikes: number;
    avgComments: number;
    avgShares: number;
  };

  @Prop({ index: true })
  authenticityScore: number;

  @Prop({ type: [String], index: true })
  niche: string[];

  @Prop({ type: [String], index: true })
  tags: string[];

  @Prop()
  location: string;

  @Prop()
  language: string;

  @Prop({ type: Object })
  audienceData: {
    demographics: {
      ageGroups: Record<string, number>;
      genderSplit: Record<string, number>;
      topLocations: Array<{ location: string; percentage: number }>;
    };
    interests: string[];
  };

  @Prop()
  lastAnalyzed: Date;

  @Prop({ type: Object })
  contactInfo: {
    email?: string;
    website?: string;
    businessInquiries?: string;
  };

  @Prop({ default: 'discovered' })
  status: 'discovered' | 'contacted' | 'collaborating' | 'archived';
}

export const InfluencerSchema = SchemaFactory.createForClass(Influencer);

// Compound indexes
InfluencerSchema.index({ platform: 1, username: 1 }, { unique: true });
InfluencerSchema.index({ 'metrics.followers': -1 });
InfluencerSchema.index({ 'metrics.engagementRate': -1 });
