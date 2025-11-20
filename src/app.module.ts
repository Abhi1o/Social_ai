import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { UserModule } from './user/user.module';
import { MediaModule } from './media/media.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { SocialAccountModule } from './social-account/social-account.module';
import { PublishingModule } from './publishing/publishing.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ListeningModule } from './listening/listening.module';
import { InfluencerModule } from './influencer/influencer.module';
import { CommunityModule } from './community/community.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { DatabaseConfig } from './config/database.config';
import { RedisConfig } from './config/redis.config';
import { validate } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkspaceIsolationMiddleware } from './auth/middleware/workspace-isolation.middleware';

@Module({
  imports: [
    // Configuration module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate,
    }),
    
    // Prisma ORM (Primary database client)
    PrismaModule,
    
    // TypeORM (Legacy support - can be removed later)
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    
    // MongoDB for analytics and logs
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/ai_social_analytics?authSource=admin'),
    
    // Redis configuration for caching and job queues
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    
    // Schedule module for cron jobs
    ScheduleModule.forRoot(),
    
    // Core modules
    HealthModule,
    
    // Feature modules
    AuthModule,
    TenantModule,
    UserModule,
    MediaModule,
    SocialAccountModule,
    PublishingModule,
    SchedulingModule,
    AnalyticsModule,
    ListeningModule,
    InfluencerModule,
    CommunityModule,
    ChatbotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply workspace isolation middleware to all routes except auth and health
    consumer
      .apply(WorkspaceIsolationMiddleware)
      .exclude(
        { path: 'auth/(.*)', method: RequestMethod.ALL },
        { path: 'health/(.*)', method: RequestMethod.ALL },
        { path: 'health', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}