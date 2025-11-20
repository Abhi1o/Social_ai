import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { PlatformAdapterFactory } from '../adapters/platform-adapter.factory';
import { TokenEncryptionService } from './token-encryption.service';
import * as crypto from 'crypto';

/**
 * OAuth state stored in session/cache
 */
export interface OAuthState {
  state: string;
  platform: Platform;
  workspaceId: string;
  userId: string;
  createdAt: Date;
}

/**
 * Result of OAuth callback processing
 */
export interface OAuthCallbackResult {
  platform: Platform;
  workspaceId: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  accountInfo: {
    platformAccountId: string;
    username: string;
    displayName: string;
    avatar?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Service for handling OAuth 2.0 flows
 * Implements Requirement 5.1: OAuth token management
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly stateStore = new Map<string, OAuthState>();

  constructor(
    private readonly platformAdapterFactory: PlatformAdapterFactory,
    private readonly tokenEncryptionService: TokenEncryptionService,
  ) {}

  /**
   * Initiate OAuth flow for a platform
   * @param platform - Social media platform
   * @param workspaceId - Workspace ID
   * @param userId - User ID initiating the connection
   * @returns Authorization URL to redirect user to
   */
  initiateOAuthFlow(
    platform: Platform,
    workspaceId: string,
    userId: string,
  ): string {
    const adapter = this.platformAdapterFactory.getAdapter(platform);

    // Generate CSRF protection state
    const state = this.generateState();

    // Store state for validation
    const oauthState: OAuthState = {
      state,
      platform,
      workspaceId,
      userId,
      createdAt: new Date(),
    };

    this.stateStore.set(state, oauthState);

    // Clean up old states (older than 10 minutes)
    this.cleanupExpiredStates();

    // Get authorization URL
    const authUrl = adapter.getAuthorizationUrl(state);

    this.logger.log(
      `Initiated OAuth flow for ${platform} - workspace: ${workspaceId}, user: ${userId}`,
    );

    return authUrl;
  }

  /**
   * Handle OAuth callback after user authorization
   * @param code - Authorization code from platform
   * @param state - State parameter for CSRF protection
   * @returns OAuth callback result with tokens and account info
   */
  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<OAuthCallbackResult> {
    // Validate state
    const oauthState = this.stateStore.get(state);

    if (!oauthState) {
      throw new BadRequestException('Invalid or expired OAuth state');
    }

    // Remove state after use (one-time use)
    this.stateStore.delete(state);

    const { platform, workspaceId, userId } = oauthState;

    try {
      const adapter = this.platformAdapterFactory.getAdapter(platform);

      // Exchange code for tokens
      const tokens = await adapter.exchangeCodeForTokens(code);

      // Get account information
      const accountInfo = await adapter.getAccountInfo(tokens.accessToken);

      this.logger.log(
        `OAuth callback successful for ${platform} - account: ${accountInfo.username}`,
      );

      return {
        platform,
        workspaceId,
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        accountInfo,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `OAuth callback failed for ${platform}: ${errorMessage}`,
      );
      throw new BadRequestException(
        `Failed to complete OAuth flow: ${errorMessage}`,
      );
    }
  }

  /**
   * Get authorization URL for a platform
   * @param platform - Social media platform
   * @returns Authorization URL configuration
   */
  getAuthorizationUrl(platform: Platform): { url: string; scopes: string[] } {
    const adapter = this.platformAdapterFactory.getAdapter(platform);
    const config = adapter.getOAuthConfig();

    return {
      url: config.authorizationUrl,
      scopes: config.scopes,
    };
  }

  /**
   * Validate that a platform is properly configured
   * @param platform - Social media platform
   * @returns true if configured, false otherwise
   */
  isPlatformConfigured(platform: Platform): boolean {
    try {
      const adapter = this.platformAdapterFactory.getAdapter(platform);
      const config = adapter.getOAuthConfig();

      return !!(config.clientId && config.clientSecret && config.redirectUri);
    } catch {
      return false;
    }
  }

  /**
   * Get list of all configured platforms
   */
  getConfiguredPlatforms(): Platform[] {
    const allPlatforms = Object.values(Platform);
    return allPlatforms.filter((platform) => this.isPlatformConfigured(platform));
  }

  /**
   * Generate a cryptographically secure random state
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Clean up expired OAuth states (older than 10 minutes)
   */
  private cleanupExpiredStates(): void {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    for (const [state, oauthState] of this.stateStore.entries()) {
      if (oauthState.createdAt < tenMinutesAgo) {
        this.stateStore.delete(state);
      }
    }
  }
}
