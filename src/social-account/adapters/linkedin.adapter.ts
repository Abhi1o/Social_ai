import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Platform } from '@prisma/client';
import { BasePlatformAdapter } from './base-platform.adapter';
import { PlatformAccountInfo } from '../interfaces/platform-adapter.interface';

/**
 * LinkedIn OAuth 2.0 adapter
 */
@Injectable()
export class LinkedInAdapter extends BasePlatformAdapter {
  readonly platform = Platform.LINKEDIN;

  constructor(configService: ConfigService) {
    super(configService, 'LINKEDIN');
  }

  protected getDefaultScopes(): string[] {
    return [
      'r_liteprofile',
      'r_emailaddress',
      'w_member_social',
      'r_organization_social',
      'w_organization_social',
    ];
  }

  protected getAuthorizationEndpoint(): string {
    return 'https://www.linkedin.com/oauth/v2/authorization';
  }

  protected getTokenEndpoint(): string {
    return 'https://www.linkedin.com/oauth/v2/accessToken';
  }

  async getAccountInfo(accessToken: string): Promise<PlatformAccountInfo> {
    const data = await this.makeAuthenticatedRequest<any>(
      'https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))',
      accessToken,
    );

    const displayName = `${data.localizedFirstName} ${data.localizedLastName}`;
    const avatar = data.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier;

    return {
      platformAccountId: data.id,
      username: data.id, // LinkedIn uses ID
      displayName,
      avatar,
    };
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest<any>(
        'https://api.linkedin.com/v2/me',
        accessToken,
      );
      return true;
    } catch {
      return false;
    }
  }

  async revokeToken(accessToken: string): Promise<void> {
    // LinkedIn doesn't have a revoke endpoint, token expires naturally
    // We just mark it as inactive in our system
    this.logger.log('LinkedIn tokens cannot be explicitly revoked, will expire naturally');
  }
}
