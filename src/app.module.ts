import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { UserModule } from './user/user.module';
import { MediaModule } from './media/media.module';
import { DatabaseConfig } from './config/database.config';
import { RedisConfig } from './config/redis.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // Database configuration with multi-tenant support
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    
    // Redis configuration for caching and job queues
    BullModule.forRootAsync({
      useClass: RedisConfig,
    }),
    
    // Feature modules
    AuthModule,
    TenantModule,
    UserModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}