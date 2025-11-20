import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { RedisModule } from '@nestjs-modules/ioredis';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaOptimizer } from './utils/media-optimizer';
import { RateLimiter } from './utils/rate-limiter';
import { ContentFormatter } from './utils/content-formatter';
import { InstagramPublisher } from './adapters/instagram-publisher.adapter';
import { FacebookPublisher } from './adapters/facebook-publisher.adapter';
import { TwitterPublisher } from './adapters/twitter-publisher.adapter';
import { LinkedInPublisher } from './adapters/linkedin-publisher.adapter';
import { TikTokPublisher } from './adapters/tiktok-publisher.adapter';
import { YouTubePublisher } from './adapters/youtube-publisher.adapter';
import { PinterestPublisher } from './adapters/pinterest-publisher.adapter';
import { PlatformPublisherFactory } from './adapters/platform-publisher.factory';
import { PublishingService } from './publishing.service';
import { PublishingController } from './publishing.controller';

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for CSV files
      },
    }),
  ],
  controllers: [PublishingController],
  providers: [
    // Core Service
    PublishingService,

    // Utilities
    MediaOptimizer,
    RateLimiter,
    ContentFormatter,

    // Platform Publishers
    InstagramPublisher,
    FacebookPublisher,
    TwitterPublisher,
    LinkedInPublisher,
    TikTokPublisher,
    YouTubePublisher,
    PinterestPublisher,

    // Factory
    PlatformPublisherFactory,
  ],
  exports: [
    PublishingService,
    MediaOptimizer,
    RateLimiter,
    ContentFormatter,
    PlatformPublisherFactory,
    InstagramPublisher,
    FacebookPublisher,
    TwitterPublisher,
    LinkedInPublisher,
    TikTokPublisher,
    YouTubePublisher,
    PinterestPublisher,
  ],
})
export class PublishingModule {}
