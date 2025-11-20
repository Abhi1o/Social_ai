import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { PublishingModule } from '../publishing/publishing.module';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { PostSchedulerProcessor } from './processors/post-scheduler.processor';
import { OptimalTimeCalculator } from './services/optimal-time-calculator.service';
import { EvergreenRotationService } from './services/evergreen-rotation.service';
import { PostSchedulerCron } from './cron/post-scheduler.cron';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'post-publishing',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    PublishingModule,
  ],
  controllers: [SchedulingController],
  providers: [
    SchedulingService,
    PostSchedulerProcessor,
    OptimalTimeCalculator,
    EvergreenRotationService,
    PostSchedulerCron,
  ],
  exports: [SchedulingService, OptimalTimeCalculator, EvergreenRotationService],
})
export class SchedulingModule {}
