import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InfluencerDiscoveryService } from './influencer-discovery.service';
import { Influencer } from '../schemas/influencer.schema';

describe('InfluencerDiscoveryService', () => {
  let service: InfluencerDiscoveryService;
  let model: Model<Influencer>;

  const mockInfluencer = {
    _id: 'test-id',
    workspaceId: 'workspace-1',
    platform: 'instagram',
    username: 'testuser',
    displayName: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Test bio',
    metrics: {
      followers: 10000,
      following: 500,
      posts: 100,
      engagementRate: 5.5,
      avgLikes: 500,
      avgComments: 50,
      avgShares: 10,
    },
    authenticityScore: 85,
    niche: ['lifestyle', 'fashion'],
    tags: ['influencer'],
    location: 'United States',
    language: 'en',
    audienceData: {
      demographics: {
        ageGroups: { '18-24': 30, '25-34': 40 },
        genderSplit: { male: 45, female: 55 },
        topLocations: [{ location: 'US', percentage: 50 }],
      },
      interests: ['fashion', 'lifestyle'],
    },
    lastAnalyzed: new Date(),
    status: 'discovered',
  };

  const mockModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InfluencerDiscoveryService,
        {
          provide: getModelToken(Influencer.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<InfluencerDiscoveryService>(InfluencerDiscoveryService);
    model = module.get<Model<Influencer>>(getModelToken(Influencer.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchInfluencers', () => {
    it('should search influencers with basic criteria', async () => {
      const searchDto = {
        keyword: 'test',
        page: 1,
        limit: 20,
      };

      const mockInfluencers = [mockInfluencer];
      const mockTotal = 1;

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockInfluencers),
            }),
          }),
        }),
      });

      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTotal),
      });

      const result = await service.searchInfluencers('workspace-1', searchDto);

      expect(result.influencers).toEqual(mockInfluencers);
      expect(result.pagination.total).toBe(mockTotal);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should filter by platform', async () => {
      const searchDto = {
        platforms: ['instagram'],
        page: 1,
        limit: 20,
      };

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([mockInfluencer]),
            }),
          }),
        }),
      });

      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      await service.searchInfluencers('workspace-1', searchDto);

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: { $in: ['instagram'] },
        }),
      );
    });

    it('should filter by follower range', async () => {
      const searchDto = {
        minFollowers: 5000,
        maxFollowers: 50000,
        page: 1,
        limit: 20,
      };

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([mockInfluencer]),
            }),
          }),
        }),
      });

      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      await service.searchInfluencers('workspace-1', searchDto);

      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'metrics.followers': { $gte: 5000, $lte: 50000 },
        }),
      );
    });
  });

  describe('getInfluencerById', () => {
    it('should get influencer by ID', async () => {
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockInfluencer),
      });

      const result = await service.getInfluencerById('workspace-1', 'test-id');

      expect(result).toEqual(mockInfluencer);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        _id: 'test-id',
        workspaceId: 'workspace-1',
      });
    });
  });

  describe('getInfluencerByUsername', () => {
    it('should get influencer by platform and username', async () => {
      mockModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockInfluencer),
      });

      const result = await service.getInfluencerByUsername(
        'workspace-1',
        'instagram',
        'testuser',
      );

      expect(result).toEqual(mockInfluencer);
      expect(mockModel.findOne).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        platform: 'instagram',
        username: 'testuser',
      });
    });
  });

  describe('updateInfluencer', () => {
    it('should update influencer', async () => {
      const updateData = { tags: ['new-tag'] };

      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockInfluencer, ...updateData }),
      });

      const result = await service.updateInfluencer(
        'workspace-1',
        'test-id',
        updateData,
      );

      expect(result).toBeDefined();
      expect(result?.tags).toContain('new-tag');
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'test-id', workspaceId: 'workspace-1' },
        { $set: updateData },
        { new: true },
      );
    });
  });

  describe('deleteInfluencer', () => {
    it('should delete influencer', async () => {
      mockModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockInfluencer),
      });

      await service.deleteInfluencer('workspace-1', 'test-id');

      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: 'test-id',
        workspaceId: 'workspace-1',
      });
    });
  });

  describe('getInfluencerStats', () => {
    it('should get influencer statistics', async () => {
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(10),
      });

      mockModel.aggregate.mockResolvedValueOnce([
        { _id: 'instagram', count: 5 },
        { _id: 'twitter', count: 5 },
      ]);

      mockModel.aggregate.mockResolvedValueOnce([
        { _id: 'discovered', count: 8 },
        { _id: 'contacted', count: 2 },
      ]);

      mockModel.aggregate.mockResolvedValueOnce([
        { _id: 'fashion', count: 6 },
        { _id: 'lifestyle', count: 4 },
      ]);

      const result = await service.getInfluencerStats('workspace-1');

      expect(result.total).toBe(10);
      expect(result.byPlatform).toEqual({
        instagram: 5,
        twitter: 5,
      });
      expect(result.byStatus).toEqual({
        discovered: 8,
        contacted: 2,
      });
      expect(result.topNiches).toHaveLength(2);
    });
  });
});