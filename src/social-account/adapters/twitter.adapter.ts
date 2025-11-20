import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Platform } from '@prisma/client';
import { BasePlatformAdapter } from './base-platform.adapter';
import { PlatformAccountInfo } from '../interfaces/platform-adapter.interface';

/**
 * Twitter/X OAuth 2.0 adapter
 */
@Injectable()
export class TwitterAdapter extends BasePlatformAdapter {
  readonly platform = Platform.TWITTER;

  constructor(configService: ConfigService) {
    super(configService, 'TWITTER');
  }

  protected getDefaultScopes(): string[] {
    return [
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access', // Required for refresh tokens
    ];
  }

  protected getAuthorizationEndpoint(): string {
    return 'https://twitter.com/i/oauth2/authorize';
  }

  protected getTokenEndpoint(): string {
    return 'https://api.twitter.com/2/oauth2/token';
  }

  protected getAdditionalAuthParams(): Record<string, string> {
    return {
      code_challenge: 'challenge',
      code_challenge_method: 'plain',
    };
  }

  protected getTokenRequestHeaders(): Record<string, string> {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString('base64');

    return {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    };
  }

  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const data = await this.makeAuthenticatedRequest<any>(
      'https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name',
      accessToken,
    );

    return {
      platformAccountId: data.data.id,
      username: data.data.username,
      displayName: data.data.name,
      avatar: data.data.profile_image_url,
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest<any>(
        'https://api.twitter.com/2/users/me',
        accessToken,
      );
      return true;
    } catch {
      return false;
    }
  }

  async revokeToken(accessToken: string): Promise<void> {
    await this.makeAuthenticatedRequest<any>(
      'https://api.twitter.com/2/oauth2/revoke',
      accessToken,
      'POST',
      {
        token: accessToken,
        token_type_hint: 'access_token',
      },
    );
  }
}
