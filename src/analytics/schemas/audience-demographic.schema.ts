import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AudienceDemographicDocument = AudienceDemographic & Document;

@Schema({ 
  collection: 'audience_demographics',
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'hours'
  }
})
export class AudienceDemographic {
  @Prop({ required: true, index: true })
  workspaceId: string;

  @Prop({ required: true, index: true })
  accountId: string;

  @Prop({ required: true, index: true })
  platform: string;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ type: Object })
  metadata: {
    accountName?: string;
    platformAccountId?: string;
  };

  @Prop({ type: Object })
  demographics: {
    // Age distribution
    ageRanges?: {
      '13-17'?: number;
      '18-24'?: number;
      '25-34'?: number;
      '35-44'?: number;
      '45-54'?: number;
      '55-64'?: number;
      '65+'?: number;
    };

    // Gender distribution
    gender?: {
      male?: number;
      female?: number;
      other?: number;
      unknown?: number;
    };

    // Location data
    topCountries?: Array<{
      country: string;
      countryCode: string;
      percentage: number;
      count: number;
    }>;

    topCities?: Array<{
      city: string;
      country: string;
      percentage: number;
      count: number;
    }>;

    // Language distribution
    topLanguages?: Array<{
      language: string;
      languageCode: string;
      percentage: number;
      count: number;
    }>;

    // Interests and behavior
    topInterests?: Array<{
      interest: string;
      category: string;
      percentage: number;
      count: number;
    }>;

    // Device and platform usage
    deviceTypes?: {
      mobile?: number;
      desktop?: number;
      tablet?: number;
    };

    // Activity patterns
    activeHours?: {
      [hour: string]: number; // 0-23
    };

    activeDays?: {
      monday?: number;
      tuesday?: number;
      wednesday?: number;
      thursday?: number;
      friday?: number;
      saturday?: number;
      sunday?: number;
    };
  };

  @Prop({ type: Object })
  audienceMetrics: {
    totalFollowers: number;
    totalReach: number;
    engagedAudience: number;
    newFollowers?: number;
    unfollowers?: number;
  };

  @Prop({ default: Date.now })
  collectedAt: Date;
}

export const AudienceDemographicSchema = SchemaFactory.createForClass(AudienceDemographic);

// Create indexes for efficient querying
AudienceDemographicSchema.index({ workspaceId: 1, timestamp: -1 });
AudienceDemographicSchema.index({ accountId: 1, timestamp: -1 });
AudienceDemographicSchema.index({ workspaceId: 1, platform: 1, timestamp: -1 });
