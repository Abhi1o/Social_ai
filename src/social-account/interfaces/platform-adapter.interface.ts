import { Platform } from '@prisma/client';

/**
 * OAuth configuration for a platform
 */
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationUrl: string;
  tokenUrl: string;
}

/**
 * OAuth tokens returned from platform
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number; // seconds until expiration
  expiresAt?: Date; // calculated expiration date
  scope?: string;
}

/**
 * Account information from platform
 */
export interface PlatformAccountInfo {
  platformAccountId: string;
  username: string;
  displayName: string;
  avatar?: string;
  metadata?: Record<string, any>;
}

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * Interface that all platform adapters must implement
 * Provides OAuth flow and token management for each social platform
 */
export interface IPlatformAdapter {
  /**
   * The platform this adapter handles
   */
  readonly platform: Platform;

  /**
   * Get OAuth configuration for this platform
   */
  getOAuthConfig(): OAuthConfig;

  /**
   * Generate the authorization URL for OAuth flow
   * @param state - CSRF protection state parameter
   */
  getAuthorizationUrl(state: string): string;

  /**
   * Exchange authorization code for access tokens
   * @param code - Authorization code from OAuth callback
   */
  exchangeCodeForTokens(code: string): Promise<OAuthTokens>;

  /**
   * Refresh an expired access token
   * @param refreshToken - The refresh token
   */
  refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult>;

  /**
   * Get account information from the platform
   * @param accessToken - Valid access token
   */
  getAccountInfo(accessToken: string): Promise<PlatformAccountInfo>;

  /**
   * Validate that an access token is still valid
   * @param accessToken - Token to validate
   */
  validateToken(accessToken: string): Promise<boolean>;

  /**
   * Revoke access token (disconnect account)
   * @param accessToken - Token to revoke
   */
  revokeToken(accessToken: string): Promise<void>;
}
