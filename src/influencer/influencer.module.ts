import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Influencer, InfluencerSchema } from './schemas/influencer.schema';
import { InfluencerController } from './influencer.controller';
import { InfluencerDiscoveryService } from './services/influencer-discovery.service';
import { InfluencerAnalysisService } from './services/influencer-analysis.service';
import { AuthenticityCheckerService } from './services/authenticity-checker.service';
import { EngagementAnalyzerService } from './services/engagement-analyzer.service';
import { InfluencerScoringService } from './services/influencer-scoring.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Influencer.name, schema: InfluencerSchema },
    ]),
  ],
  controllers: [InfluencerController],
  providers: [
    InfluencerDiscoveryService,
    InfluencerAnalysisService,
    AuthenticityCheckerService,
    EngagementAnalyzerService,
    InfluencerScoringService,
  ],
  exports: [
    InfluencerDiscoveryService,
    InfluencerAnalysisService,
    AuthenticityCheckerService,
    EngagementAnalyzerService,
    InfluencerScoringService,
  ],
})
export class InfluencerModule {}
