import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Influencer, InfluencerDocument } from '../schemas/influencer.schema';
import { SearchInfluencersDto } from '../dto/search-influencers.dto';

@Injectable()
export class InfluencerDiscoveryService {
  private readonly logger = new Logger(InfluencerDiscoveryService.name);

  constructor(
    @InjectModel(Influencer.name)
    private influencerModel: Model<InfluencerDocument>,
  ) {}

  /**
   * Search for influencers based on criteria
   */
  async searchInfluencers(
    workspaceId: string,
    searchDto: SearchInfluencersDto,
  ) {
    const {
      keyword,
      platforms,
      niches,
      minFollowers,
      maxFollowers,
      minEngagementRate,
      minAuthenticityScore,
      location,
      language,
      tags,
      status,
      sortBy = 'followers',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = searchDto;

    // Build query
    const query: any = { workspaceId };

    if (keyword) {
      query.$or = [
        { username: { $regex: keyword, $options: 'i' } },
        { displayName: { $regex: keyword, $options: 'i' } },
        { bio: { $regex: keyword, $options: 'i' } },
      ];
    }

    if (platforms && platforms.length > 0) {
      query.platform = { $in: platforms };
    }

    if (niches && niches.length > 0) {
      query.niche = { $in: niches };
    }

    if (minFollowers !== undefined) {
      query['metrics.followers'] = { $gte: minFollowers };
    }

    if (maxFollowers !== undefined) {
      query['metrics.followers'] = {
        ...query['metrics.followers'],
        $lte: maxFollowers,
      };
    }

    if (minEngagementRate !== undefined) {
      query['metrics.engagementRate'] = { $gte: minEngagementRate };
    }

    if (minAuthenticityScore !== undefined) {
      query.authenticityScore = { $gte: minAuthenticityScore };
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (language) {
      query.language = language;
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    if (status) {
      query.status = status;
    }

    // Build sort
    const sort: any = {};
    if (sortBy === 'followers') {
      sort['metrics.followers'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'engagementRate') {
      sort['metrics.engagementRate'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'authenticityScore') {
      sort.authenticityScore = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'lastAnalyzed') {
      sort.lastAnalyzed = sortOrder === 'asc' ? 1 : -1;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [influencers, total] = await Promise.all([
      this.influencerModel.find(query).sort(sort).skip(skip).limit(limit).exec(),
      this.influencerModel.countDocuments(query).exec(),
    ]);

    return {
      influencers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get influencer by ID
   */
  async getInfluencerById(workspaceId: string, influencerId: string) {
    return this.influencerModel
      .findOne({ _id: influencerId, workspaceId })
      .exec();
  }

  /**
   * Get influencer by platform and username
   */
  async getInfluencerByUsername(
    workspaceId: string,
    platform: string,
    username: string,
  ) {
    return this.influencerModel
      .findOne({ workspaceId, platform, username })
      .exec();
  }

  /**
   * Create or update influencer
   */
  async upsertInfluencer(workspaceId: string, influencerData: Partial<Influencer>) {
    const { platform, username } = influencerData;

    const existing = await this.influencerModel
      .findOne({ workspaceId, platform, username })
      .exec();

    if (existing) {
      Object.assign(existing, influencerData);
      existing.lastAnalyzed = new Date();
      return existing.save();
    }

    const newInfluencer = new this.influencerModel({
      ...influencerData,
      workspaceId,
      lastAnalyzed: new Date(),
    });

    return newInfluencer.save();
  }

  /**
   * Update influencer
   */
  async updateInfluencer(
    workspaceId: string,
    influencerId: string,
    updateData: Partial<Influencer>,
  ) {
    return this.influencerModel
      .findOneAndUpdate(
        { _id: influencerId, workspaceId },
        { $set: updateData },
        { new: true },
      )
      .exec();
  }

  /**
   * Delete influencer
   */
  async deleteInfluencer(workspaceId: string, influencerId: string) {
    return this.influencerModel
      .findOneAndDelete({ _id: influencerId, workspaceId })
      .exec();
  }

  /**
   * Get influencer statistics for workspace
   */
  async getInfluencerStats(workspaceId: string) {
    const [total, byPlatform, byStatus, topNiches] = await Promise.all([
      this.influencerModel.countDocuments({ workspaceId }).exec(),
      this.influencerModel.aggregate([
        { $match: { workspaceId } },
        { $group: { _id: '$platform', count: { $sum: 1 } } },
      ]),
      this.influencerModel.aggregate([
        { $match: { workspaceId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.influencerModel.aggregate([
        { $match: { workspaceId } },
        { $unwind: '$niche' },
        { $group: { _id: '$niche', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return {
      total,
      byPlatform: byPlatform.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topNiches: topNiches.map((item) => ({
        niche: item._id,
        count: item.count,
      })),
    };
  }
}
