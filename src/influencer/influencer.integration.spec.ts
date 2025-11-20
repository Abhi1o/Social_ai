import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InfluencerModule } from './influencer.module';
import { InfluencerDiscoveryService } from './services/influencer-discovery.service';
import { InfluencerAnalysisService } from './services/influencer-analysis.service';

describe('Influencer Module Integration', () => {
  let app: INestApplication;
  let discoveryService: InfluencerDiscoveryService;
  let analysisService: InfluencerAnalysisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://localhost:27017/test-influencer'),
        InfluencerModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    discoveryService = moduleFixture.get<InfluencerDiscoveryService>(
      InfluencerDiscoveryService,
    );
    analysisService = moduleFixture.get<InfluencerAnalysisService>(
      InfluencerAnalysisService,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Module Setup', () => {
    it('should have InfluencerDiscoveryService defined', () => {
      expect(discoveryService).toBeDefined();
    });

    it('should have InfluencerAnalysisService defined', () => {
      expect(analysisService).toBeDefined();
    });
  });

  describe('Service Integration', () => {
    it('should analyze and store influencer', async () => {
      const workspaceId = 'test-workspace';
      const analyzeDto = {
        platform: 'instagram',
        username: 'testinfluencer',
      };

      // Analyze influencer
      const analysis = await analysisService.analyzeInfluencer(
        workspaceId,
        analyzeDto,
      );

      expect(analysis).toBeDefined();
      expect(analysis.username).toBe('testinfluencer');
      expect(analysis.platform).toBe('instagram');
      expect(analysis.metrics).toBeDefined();
      expect(analysis.authenticityAnalysis).toBeDefined();
      expect(analysis.score).toBeDefined();

      // Verify it was stored
      const stored = await discoveryService.getInfluencerByUsername(
        workspaceId,
        'instagram',
        'testinfluencer',
      );

      expect(stored).toBeDefined();
      expect(stored?.username).toBe('testinfluencer');
    });

    it('should search for influencers', async () => {
      const workspaceId = 'test-workspace';
      const searchDto = {
        keyword: 'test',
        page: 1,
        limit: 10,
      };

      const result = await discoveryService.searchInfluencers(
        workspaceId,
        searchDto,
      );

      expect(result).toBeDefined();
      expect(result.influencers).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(Array.isArray(result.influencers)).toBe(true);
    });

    it('should get influencer statistics', async () => {
      const workspaceId = 'test-workspace';

      const stats = await discoveryService.getInfluencerStats(workspaceId);

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.byPlatform).toBeDefined();
      expect(stats.byStatus).toBeDefined();
      expect(stats.topNiches).toBeDefined();
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full influencer discovery workflow', async () => {
      const workspaceId = 'test-workspace-e2e';
      
      // Step 1: Analyze a new influencer
      const analysis = await analysisService.analyzeInfluencer(
        workspaceId,
        {
          platform: 'instagram',
          username: 'e2einfluencer',
        },
        ['fashion', 'lifestyle'],
      );

      expect(analysis.score.overall).toBeGreaterThan(0);
      expect(analysis.recommendations).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);

      // Step 2: Search for the influencer
      const searchResult = await discoveryService.searchInfluencers(
        workspaceId,
        {
          keyword: 'e2einfluencer',
          page: 1,
          limit: 10,
        },
      );

      expect(searchResult.influencers.length).toBeGreaterThan(0);
      const foundInfluencer = searchResult.influencers[0];

      // Step 3: Update the influencer
      const updated = await discoveryService.updateInfluencer(
        workspaceId,
        foundInfluencer._id.toString(),
        {
          tags: ['test-tag'],
          status: 'contacted',
        },
      );

      expect(updated?.tags).toContain('test-tag');
      expect(updated?.status).toBe('contacted');

      // Step 4: Re-analyze the influencer
      const reanalysis = await analysisService.reanalyzeInfluencer(
        workspaceId,
        foundInfluencer._id.toString(),
      );

      expect(reanalysis).toBeDefined();
      expect(reanalysis.username).toBe('e2einfluencer');

      // Step 5: Get statistics
      const stats = await discoveryService.getInfluencerStats(workspaceId);
      expect(stats.total).toBeGreaterThan(0);

      // Step 6: Clean up - delete the influencer
      await discoveryService.deleteInfluencer(
        workspaceId,
        foundInfluencer._id.toString(),
      );
    });
  });
});
