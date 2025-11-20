import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  AudienceDemographic, 
  AudienceDemographicDocument 
} from '../schemas/audience-demographic.schema';

export interface DemographicData {
  ageDistribution: {
    ageRange: string;
    percentage: number;
    count: number;
  }[];
  genderDistribution: {
    gender: string;
    percentage: number;
    count: number;
  }[];
  totalAudience: number;
}

export interface LocationAnalytics {
  topCountries: Array<{
    country: string;
    countryCode: string;
    percentage: number;
    count: number;
  }>;
  topCities: Array<{
    city: string;
    country: string;
    percentage: number;
    count: number;
  }>;
  totalLocations: number;
}

export interface InterestBehaviorData {
  topInterests: Array<{
    interest: string;
    category: string;
    percentage: number;
    count: number;
  }>;
  deviceDistribution: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  activeHours: Array<{
    hour: number;
    activity: number;
  }>;
  activeDays: Array<{
    day: string;
    activity: number;
  }>;
}

export interface AudienceSegment {
  segmentName: string;
  segmentType: string;
  audienceSize: number;
  percentage: number;
  engagementRate: number;
  growthRate: number;
}

export interface AudienceGrowthTrend {
  date: string;
  totalFollowers: number;
  newFollowers: number;
  unfollowers: number;
  netGrowth: number;
  growthRate: number;
}

export interface AudienceInsights {
  summary: {
    totalAudience: number;
    audienceGrowth: number;
    growthRate: number;
    engagementRate: number;
    topDemographic: string;
    topLocation: string;
  };
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

@Injectable()
export class AudienceAnalyticsService {
  private readonly logger = new Logger(AudienceAnalyticsService.name);

  constructor(
    @InjectModel(AudienceDemographic.name) 
    private audienceDemographicModel: Model<AudienceDemographicDocument>,
    private prisma: PrismaService,
  ) {}

  /**
   * Collect demographic data from platform APIs
   * Requirements: 4.1, 11.1
   */
  async collectDemographicData(
    accountId: string,
    workspaceId: string,
    platform: string,
    demographicData: any,
  ): Promise<void> {
    this.logger.log(`Collecting demographic data for account ${accountId}`);

    const audienceDemographic = new this.audienceDemographicModel({
      workspaceId,
      accountId,
      platform,
      timestamp: new Date(),
      metadata: {
        accountName: demographicData.accountName,
        platformAccountId: demographicData.platformAccountId,
      },
      demographics: {
        ageRanges: demographicData.ageRanges,
        gender: demographicData.gender,
        topCountries: demographicData.topCountries,
        topCities: demographicData.topCities,
        topLanguages: demographicData.topLanguages,
        topInterests: demographicData.topInterests,
        deviceTypes: demographicData.deviceTypes,
        activeHours: demographicData.activeHours,
        activeDays: demographicData.activeDays,
      },
      audienceMetrics: {
        totalFollowers: demographicData.totalFollowers || 0,
        totalReach: demographicData.totalReach || 0,
        engagedAudience: demographicData.engagedAudience || 0,
        newFollowers: demographicData.newFollowers,
        unfollowers: demographicData.unfollowers,
      },
    });

    await audienceDemographic.save();
  }

  /**
   * Get demographic data for workspace
   * Requirements: 4.1, 11.1
   */
  async getDemographicData(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    platforms?: string[],
    accountIds?: string[],
  ): Promise<DemographicData> {
    this.logger.log(`Getting demographic data for workspace ${workspaceId}`);

    const filter: any = {
      workspaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    };

    if (platforms && platforms.length > 0) {
      filter.platform = { $in: platforms };
    }

    if (accountIds && accountIds.length > 0) {
      filter.accountId = { $in: accountIds };
    }

    // Get latest demographic data
    const demographics = await this.audienceDemographicModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(1)
      .exec();

    if (!demographics || demographics.length === 0) {
      return {
        ageDistribution: [],
        genderDistribution: [],
        totalAudience: 0,
      };
    }

    const latestDemo = demographics[0];
    const totalAudience = latestDemo.audienceMetrics.totalFollowers;

    // Process age distribution
    const ageDistribution = [];
    if (latestDemo.demographics.ageRanges) {
      for (const [ageRange, count] of Object.entries(latestDemo.demographics.ageRanges)) {
        if (count && count > 0) {
          ageDistribution.push({
            ageRange,
            count,
            percentage: totalAudience > 0 ? (count / totalAudience) * 100 : 0,
          });
        }
      }
    }

    // Process gender distribution
    const genderDistribution = [];
    if (latestDemo.demographics.gender) {
      for (const [gender, count] of Object.entries(latestDemo.demographics.gender)) {
        if (count && count > 0) {
          genderDistribution.push({
            gender,
            count,
            percentage: totalAudience > 0 ? (count / totalAudience) * 100 : 0,
          });
        }
      }
    }

    return {
      ageDistribution,
      genderDistribution,
      totalAudience,
    };
  }

  /**
   * Build audience segmentation logic
   * Requirements: 4.1, 11.1
   */
  async getAudienceSegments(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    segmentBy: 'age' | 'gender' | 'location' | 'interests' | 'language',
    platforms?: string[],
    accountIds?: string[],
  ): Promise<AudienceSegment[]> {
    this.logger.log(`Getting audience segments for workspace ${workspaceId}`);

    const filter: any = {
      workspaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    };

    if (platforms && platforms.length > 0) {
      filter.platform = { $in: platforms };
    }

    if (accountIds && accountIds.length > 0) {
      filter.accountId = { $in: accountIds };
    }

    // Get latest demographic data
    const demographics = await this.audienceDemographicModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(1)
      .exec();

    if (!demographics || demographics.length === 0) {
      return [];
    }

    const latestDemo = demographics[0];
    const totalAudience = latestDemo.audienceMetrics.totalFollowers;
    const segments: AudienceSegment[] = [];

    switch (segmentBy) {
      case 'age':
        if (latestDemo.demographics.ageRanges) {
          for (const [ageRange, count] of Object.entries(latestDemo.demographics.ageRanges)) {
            if (count && count > 0) {
              segments.push({
                segmentName: ageRange,
                segmentType: 'age',
                audienceSize: count,
                percentage: totalAudience > 0 ? (count / totalAudience) * 100 : 0,
                engagementRate: 0, // Would be calculated from engagement data
                growthRate: 0, // Would be calculated from historical data
              });
            }
          }
        }
        break;

      case 'gender':
        if (latestDemo.demographics.gender) {
          for (const [gender, count] of Object.entries(latestDemo.demographics.gender)) {
            if (count && count > 0) {
              segments.push({
                segmentName: gender,
                segmentType: 'gender',
                audienceSize: count,
                percentage: totalAudience > 0 ? (count / totalAudience) * 100 : 0,
                engagementRate: 0,
                growthRate: 0,
              });
            }
          }
        }
        break;

      case 'location':
        if (latestDemo.demographics.topCountries) {
          for (const country of latestDemo.demographics.topCountries) {
            segments.push({
              segmentName: country.country,
              segmentType: 'location',
              audienceSize: country.count,
              percentage: country.percentage,
              engagementRate: 0,
              growthRate: 0,
            });
          }
        }
        break;

      case 'interests':
        if (latestDemo.demographics.topInterests) {
          for (const interest of latestDemo.demographics.topInterests) {
            segments.push({
              segmentName: interest.interest,
              segmentType: 'interests',
              audienceSize: interest.count,
              percentage: interest.percentage,
              engagementRate: 0,
              growthRate: 0,
            });
          }
        }
        break;

      case 'language':
        if (latestDemo.demographics.topLanguages) {
          for (const language of latestDemo.demographics.topLanguages) {
            segments.push({
              segmentName: language.language,
              segmentType: 'language',
              audienceSize: language.count,
              percentage: language.percentage,
              engagementRate: 0,
              growthRate: 0,
            });
          }
        }
        break;
    }

    return segments.sort((a, b) => b.audienceSize - a.audienceSize);
  }

  /**
   * Create location-based analytics
   * Requirements: 4.1, 11.1
   */
  async getLocationAnalytics(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    platforms?: string[],
    accountIds?: string[],
  ): Promise<LocationAnalytics> {
    this.logger.log(`Getting location analytics for workspace ${workspaceId}`);

    const filter: any = {
      workspaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    };

    if (platforms && platforms.length > 0) {
      filter.platform = { $in: platforms };
    }

    if (accountIds && accountIds.length > 0) {
      filter.accountId = { $in: accountIds };
    }

    // Get latest demographic data
    const demographics = await this.audienceDemographicModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(1)
      .exec();

    if (!demographics || demographics.length === 0) {
      return {
        topCountries: [],
        topCities: [],
        totalLocations: 0,
      };
    }

    const latestDemo = demographics[0];

    return {
      topCountries: latestDemo.demographics.topCountries || [],
      topCities: latestDemo.demographics.topCities || [],
      totalLocations: 
        (latestDemo.demographics.topCountries?.length || 0) + 
        (latestDemo.demographics.topCities?.length || 0),
    };
  }

  /**
   * Implement interest and behavior analysis
   * Requirements: 4.1, 11.1
   */
  async getInterestBehaviorAnalysis(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    platforms?: string[],
    accountIds?: string[],
  ): Promise<InterestBehaviorData> {
    this.logger.log(`Getting interest and behavior analysis for workspace ${workspaceId}`);

    const filter: any = {
      workspaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    };

    if (platforms && platforms.length > 0) {
      filter.platform = { $in: platforms };
    }

    if (accountIds && accountIds.length > 0) {
      filter.accountId = { $in: accountIds };
    }

    // Get latest demographic data
    const demographics = await this.audienceDemographicModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(1)
      .exec();

    if (!demographics || demographics.length === 0) {
      return {
        topInterests: [],
        deviceDistribution: { mobile: 0, desktop: 0, tablet: 0 },
        activeHours: [],
        activeDays: [],
      };
    }

    const latestDemo = demographics[0];

    // Process active hours
    const activeHours = [];
    if (latestDemo.demographics.activeHours) {
      for (let hour = 0; hour < 24; hour++) {
        const activity = latestDemo.demographics.activeHours[hour.toString()] || 0;
        activeHours.push({ hour, activity });
      }
    }

    // Process active days
    const activeDays = [];
    const dayNames: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'> = 
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (latestDemo.demographics.activeDays) {
      for (const day of dayNames) {
        const activity = latestDemo.demographics.activeDays[day] || 0;
        activeDays.push({ day, activity });
      }
    }

    const deviceTypes = latestDemo.demographics.deviceTypes;
    const deviceDistribution = {
      mobile: deviceTypes?.mobile || 0,
      desktop: deviceTypes?.desktop || 0,
      tablet: deviceTypes?.tablet || 0,
    };

    return {
      topInterests: latestDemo.demographics.topInterests || [],
      deviceDistribution,
      activeHours,
      activeDays,
    };
  }

  /**
   * Build audience growth trend analysis
   * Requirements: 4.1, 11.1
   */
  async getAudienceGrowthTrend(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
    platforms?: string[],
    accountIds?: string[],
  ): Promise<AudienceGrowthTrend[]> {
    this.logger.log(`Getting audience growth trend for workspace ${workspaceId}`);

    const filter: any = {
      workspaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    };

    if (platforms && platforms.length > 0) {
      filter.platform = { $in: platforms };
    }

    if (accountIds && accountIds.length > 0) {
      filter.accountId = { $in: accountIds };
    }

    // Determine date grouping format
    let dateFormat: any;
    switch (granularity) {
      case 'hourly':
        dateFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } };
        break;
      case 'weekly':
        dateFormat = { $dateToString: { format: '%Y-W%V', date: '$timestamp' } };
        break;
      case 'monthly':
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$timestamp' } };
        break;
      default:
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } };
    }

    const growthData = await this.audienceDemographicModel.aggregate([
      { $match: filter },
      { $sort: { timestamp: 1 } },
      {
        $group: {
          _id: dateFormat,
          totalFollowers: { $last: '$audienceMetrics.totalFollowers' },
          newFollowers: { $sum: '$audienceMetrics.newFollowers' },
          unfollowers: { $sum: '$audienceMetrics.unfollowers' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Calculate growth metrics
    const result: AudienceGrowthTrend[] = [];
    let previousFollowers = 0;

    for (const data of growthData) {
      const totalFollowers = data.totalFollowers || 0;
      const newFollowers = data.newFollowers || 0;
      const unfollowers = data.unfollowers || 0;
      const netGrowth = newFollowers - unfollowers;
      const growthRate = previousFollowers > 0 ? (netGrowth / previousFollowers) * 100 : 0;

      result.push({
        date: data._id,
        totalFollowers,
        newFollowers,
        unfollowers,
        netGrowth,
        growthRate: Math.round(growthRate * 100) / 100,
      });

      previousFollowers = totalFollowers;
    }

    return result;
  }

  /**
   * Create audience insights endpoint with AI-powered recommendations
   * Requirements: 4.1, 11.1
   */
  async getAudienceInsights(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    platforms?: string[],
    accountIds?: string[],
  ): Promise<AudienceInsights> {
    this.logger.log(`Getting audience insights for workspace ${workspaceId}`);

    // Get demographic data
    const demographics = await this.getDemographicData(
      workspaceId,
      startDate,
      endDate,
      platforms,
      accountIds,
    );

    // Get growth trend
    const growthTrend = await this.getAudienceGrowthTrend(
      workspaceId,
      startDate,
      endDate,
      'daily',
      platforms,
      accountIds,
    );

    // Get location analytics
    const locationData = await this.getLocationAnalytics(
      workspaceId,
      startDate,
      endDate,
      platforms,
      accountIds,
    );

    // Calculate summary metrics
    const totalAudience = demographics.totalAudience;
    const latestGrowth = growthTrend.length > 0 ? growthTrend[growthTrend.length - 1] : null;
    const audienceGrowth = latestGrowth ? latestGrowth.netGrowth : 0;
    const growthRate = latestGrowth ? latestGrowth.growthRate : 0;

    // Find top demographic
    const topAge = demographics.ageDistribution.length > 0 
      ? demographics.ageDistribution.sort((a, b) => b.count - a.count)[0]
      : null;
    const topGender = demographics.genderDistribution.length > 0
      ? demographics.genderDistribution.sort((a, b) => b.count - a.count)[0]
      : null;
    const topDemographic = topAge && topGender 
      ? `${topGender.gender}, ${topAge.ageRange}`
      : 'Unknown';

    // Find top location
    const topLocation = locationData.topCountries.length > 0
      ? locationData.topCountries[0].country
      : 'Unknown';

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      demographics,
      growthTrend,
      locationData,
    );

    return {
      summary: {
        totalAudience,
        audienceGrowth,
        growthRate,
        engagementRate: 0, // Would be calculated from engagement metrics
        topDemographic,
        topLocation,
      },
      recommendations,
    };
  }

  /**
   * Generate AI-powered recommendations based on audience data
   */
  private generateRecommendations(
    demographics: DemographicData,
    growthTrend: AudienceGrowthTrend[],
    locationData: LocationAnalytics,
  ): Array<{ type: string; title: string; description: string; priority: 'high' | 'medium' | 'low' }> {
    const recommendations = [];

    // Analyze growth trend
    if (growthTrend.length > 0) {
      const recentGrowth = growthTrend.slice(-7); // Last 7 periods
      const avgGrowthRate = recentGrowth.reduce((sum, d) => sum + d.growthRate, 0) / recentGrowth.length;

      if (avgGrowthRate < 0) {
        recommendations.push({
          type: 'growth',
          title: 'Negative Growth Trend',
          description: 'Your audience is declining. Consider reviewing your content strategy and engagement tactics.',
          priority: 'high' as const,
        });
      } else if (avgGrowthRate > 5) {
        recommendations.push({
          type: 'growth',
          title: 'Strong Growth Momentum',
          description: 'Your audience is growing rapidly. Maintain your current strategy and consider scaling content production.',
          priority: 'medium' as const,
        });
      }
    }

    // Analyze demographics
    if (demographics.ageDistribution.length > 0) {
      const dominantAge = demographics.ageDistribution.sort((a, b) => b.percentage - a.percentage)[0];
      if (dominantAge.percentage > 50) {
        recommendations.push({
          type: 'demographics',
          title: 'Concentrated Age Group',
          description: `${dominantAge.percentage.toFixed(1)}% of your audience is ${dominantAge.ageRange}. Consider diversifying content to reach other age groups.`,
          priority: 'low' as const,
        });
      }
    }

    // Analyze location
    if (locationData.topCountries.length > 0) {
      const topCountry = locationData.topCountries[0];
      if (topCountry.percentage > 60) {
        recommendations.push({
          type: 'location',
          title: 'Geographic Concentration',
          description: `${topCountry.percentage.toFixed(1)}% of your audience is from ${topCountry.country}. Consider localized content and optimal posting times for this region.`,
          priority: 'medium' as const,
        });
      }
    }

    return recommendations;
  }
}
