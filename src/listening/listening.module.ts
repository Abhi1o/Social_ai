import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { ListeningController, MentionController } from './listening.controller';
import { SentimentAnalysisController } from './controllers/sentiment-analysis.controller';
import { TrendDetectionController } from './controllers/trend-detection.controller';
import { CrisisDetectionController } from './controllers/crisis-detection.controller';
import { ListeningQueryService } from './services/listening-query.service';
import { BooleanQueryBuilderService } from './services/boolean-query-builder.service';
import { ListeningStreamManagerService } from './services/listening-stream-manager.service';
import { MentionProcessingService } from './services/mention-processing.service';
import { SentimentAnalysisService } from './services/sentiment-analysis.service';
import { TrendDetectionService } from './services/trend-detection.service';
import { CrisisDetectionService } from './services/crisis-detection.service';
import { ListeningStreamFactory } from './streams/listening-stream.factory';
import { MentionCollectionWorker } from './workers/mention-collection.worker';
import { TrendDetectionWorker } from './workers/trend-detection.worker';
import { CrisisMonitoringWorker } from './workers/crisis-monitoring.worker';
import { MentionGateway } from './gateways/mention.gateway';
import { Trend, TrendSchema } from './schemas/trend.schema';
import { ConversationCluster, ConversationClusterSchema } from './schemas/conversation-cluster.schema';
import { Crisis, CrisisSchema } from './schemas/crisis.schema';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Trend.name, schema: TrendSchema },
      { name: ConversationCluster.name, schema: ConversationClusterSchema },
      { name: Crisis.name, schema: CrisisSchema },
    ]),
  ],
  controllers: [
    ListeningController,
    MentionController,
    SentimentAnalysisController,
    TrendDetectionController,
    CrisisDetectionController,
  ],
  providers: [
    ListeningQueryService,
    BooleanQueryBuilderService,
    ListeningStreamManagerService,
    MentionProcessingService,
    SentimentAnalysisService,
    TrendDetectionService,
    CrisisDetectionService,
    ListeningStreamFactory,
    MentionCollectionWorker,
    TrendDetectionWorker,
    CrisisMonitoringWorker,
    MentionGateway,
  ],
  exports: [
    ListeningQueryService,
    BooleanQueryBuilderService,
    ListeningStreamManagerService,
    MentionProcessingService,
    SentimentAnalysisService,
    TrendDetectionService,
    CrisisDetectionService,
    MentionGateway,
  ],
})
export class ListeningModule {}
