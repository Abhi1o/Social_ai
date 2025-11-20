import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Platform } from '@prisma/client';
import { BasePlatformAdapter } from './base-platform.adapter';
import { PlatformAccountInfo } from '../interfaces/platform-adapter.interface';

/**
 * TikTok OAuth 2.0 adapter
 */
@Injectable()
export class TikTokAdapter extends BasePlatformAdapter {
  readonly platform = Platform.TIKTOK;

  constructor(configService: ConfigService) {
    super(configService, 'TIKTOK');
  }

  protected getDefaultScopes(): string[] {
    return [
      'user.info.basic',
      'video.list',
      'video.upload',
      'video.publish',
    ];
  }

  protected getAuthorizationEndpoint(): string {
    return 'https://www.tiktok.com/v2/auth/authorize';
  }

  protected getTokenEndpoint(): string {
    return 'https://open.tiktokapis.com/v2/oauth/token/';
  }

  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const data = await this.makeAuthenticatedRequest<any>(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username',
      accessToken,
    );

    return {
      platformAccountId: data.data.user.open_id,
      username: data.data.user.username || data.data.user.open_id,
      displayName: data.data.user.display_name,
      avatar: data.data.user.avatar_url,
      metadata: {
        unionId: data.data.user.union_id,
      },
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest<any>(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id',
        accessToken,
      );
      return true;
    } catch {
      return false;
    }
  }

  async revokeToken(accessToken: string): Promise<void> {
    await this.makeAuthenticatedRequest<any>(
      'https://open.tiktokapis.com/v2/oauth/revoke/',
      accessToken,
      'POST',
      {
        token: accessToken,
      },
    );
  }
}
