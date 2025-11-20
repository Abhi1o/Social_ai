import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Platform } from '@prisma/client';
import { BasePlatformAdapter } from './base-platform.adapter';
import { PlatformAccountInfo } from '../interfaces/platform-adapter.interface';

/**
 * Instagram OAuth adapter using Facebook Graph API
 * Instagram Basic Display API for user authentication
 */
@Injectable()
export class InstagramAdapter extends BasePlatformAdapter {
  readonly platform = Platform.INSTAGRAM;

  constructor(configService: ConfigService) {
    super(configService, 'INSTAGRAM');
  }

  protected getDefaultScopes(): string[] {
    return [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_comments',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
    ];
  }

  protected getAuthorizationEndpoint(): string {
    return 'https://www.facebook.com/v18.0/dialog/oauth';
  }

  protected getTokenEndpoint(): string {
    return 'https://graph.facebook.com/v18.0/oauth/access_token';
  }

  protected getAdditionalAuthParams(): Record<string, string> {
    return {
      display: 'popup',
    };
  }

  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    // Get Instagram Business Account ID
    const meData = await this.makeAuthenticatedRequest<any>(
      'https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account',
      accessToken,
    );

    if (!meData.data || meData.data.length === 0) {
      throw new Error('No Instagram Business Account found');
    }

    const instagramAccountId = meData.data[0].instagram_business_account?.id;

    if (!instagramAccountId) {
      throw new Error('Instagram Business Account not connected to Facebook Page');
    }

    // Get Instagram account details
    const accountData = await this.makeAuthenticatedRequest<any>(
      `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=id,username,name,profile_picture_url`,
      accessToken,
    );

    return {
      platformAccountId: accountData.id,
      username: accountData.username,
      displayName: accountData.name || accountData.username,
      avatar: accountData.profile_picture_url,
      metadata: {
        facebookPageId: meData.data[0].id,
      },
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
