import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Platform } from '@prisma/client';
import { BasePlatformAdapter } from './base-platform.adapter';
import { PlatformAccountInfo } from '../interfaces/platform-adapter.interface';

/**
 * Facebook OAuth adapter using Facebook Graph API
 */
@Injectable()
export class FacebookAdapter extends BasePlatformAdapter {
  readonly platform = Platform.FACEBOOK;

  constructor(configService: ConfigService) {
    super(configService, 'FACEBOOK');
  }

  protected getDefaultScopes(): string[] {
    return [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_manage_engagement',
      'pages_read_user_content',
      'publish_to_groups',
    ];
  }

  protected getAuthorizationEndpoint(): string {
    return 'https://www.facebook.com/v18.0/dialog/oauth';
  }

  protected getTokenEndpoint(): string {
    return 'https://graph.facebook.com/v18.0/oauth/access_token';
  }

  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const data = await this.makeAuthenticatedRequest<any>(
      'https://graph.facebook.com/v18.0/me?fields=id,name,picture',
      accessToken,
    );

    return {
      platformAccountId: data.id,
      username: data.id, // Facebook uses ID as username
      displayName: data.name,
      avatar: data.picture?.data?.url,
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest<any>(
        'https://graph.facebook.com/v18.0/me',
        accessToken,
      );
      return true;
    } catch {
      return false;
    }
  }

  async revokeToken(accessToken: string): Promise<void> {
    await this.makeAuthenticatedRequest<any>(
      'https://graph.facebook.com/v18.0/me/permissions',
      accessToken,
      'DELETE',
    );
  }
}
