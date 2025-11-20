import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SocialAccountController } from './social-account.controller';
import { SocialAccountService } from './social-account.service';
import { TokenEncryptionService } from './services/token-encryption.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { OAuthService } from './services/oauth.service';
import { PlatformAdapterFactory } from './adapters/platform-adapter.factory';
import { InstagramAdapter } from './adapters/instagram.adapter';
import { FacebookAdapter } from './adapters/facebook.adapter';
import { TwitterAdapter } from './adapters/twitter.adapter';
import { LinkedInAdapter } from './adapters/linkedin.adapter';
import { TikTokAdapter } from './adapters/tiktok.adapter';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [SocialAccountController],
  providers: [
    SocialAccountService,
    TokenEncryptionService,
    TokenRefreshService,
    OAuthService,
    PlatformAdapterFactory,
    InstagramAdapter,
    FacebookAdapter,
    TwitterAdapter,
    LinkedInAdapter,
    TikTokAdapter,
  ],
  exports: [SocialAccountService, TokenEncryptionService, TokenRefreshService],
})
export class SocialAccountModule {}
