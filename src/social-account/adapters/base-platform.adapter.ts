import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  IPlatformAdapter,
  OAuthConfig,
  OAuthTokens,
  PlatformAccountInfo,
  TokenRefreshResult,
} from '../interfaces/platform-adapter.interface';
import { Platform } from '@prisma/client';

/**
 * Base class for platform adapters providing common OAuth functionality
 */
export abstract class BasePlatformAdapter implements IPlatformAdapter {
  protected readonly logger: Logger;
  protected readonly httpClient: AxiosInstance;
  protected readonly config: OAuthConfig;

  abstract readonly platform: Platform;

  constructor(
    protected readonly configService: ConfigService,
    platformConfigKey: string,
  ) {
    this.logger = new Logger(this.constructor.name);
    
    // Initialize HTTP client with default configuration
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Load OAuth configuration from environment
    this.config = this.loadOAuthConfig(platformConfigKey);
  }

  /**
   * Load OAuth configuration from environment variables
   */
  private loadOAuthConfig(platformKey: string): OAuthConfig {
    const clientId = this.configService.get<string>(`${platformKey}_CLIENT_ID`);
    const clientSecret = this.configService.get<string>(`${platformKey}_CLIENT_SECRET`);
    const redirectUri = this.configService.get<string>(`${platformKey}_REDIRECT_URI`);

    if (!clientId || !clientSecret || !redirectUri) {
      this.logger.warn(
        `OAuth configuration incomplete for ${platformKey}. ` +
        `Set ${platformKey}_CLIENT_ID, ${platformKey}_CLIENT_SECRET, and ${platformKey}_REDIRECT_URI`,
      );
    }

    return {
      clientId: clientId || '',
      clientSecret: clientSecret || '',
      redirectUri: redirectUri || '',
      scopes: this.getDefaultScopes(),
      authorizationUrl: this.getAuthorizationEndpoint(),
      tokenUrl: this.getTokenEndpoint(),
    };
  }

  /**
   * Get default OAuth scopes for this platform
   */
  protected abstract getDefaultScopes(): string[];

  /**
   * Get the authorization endpoint URL
   */
  protected abstract getAuthorizationEndpoint(): string;

  /**
   * Get the token endpoint URL
   */
  protected abstract getTokenEndpoint(): string;

  getOAuthConfig(): OAuthConfig {
    return this.config;
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
    });

    // Add platform-specific parameters
    const additionalParams = this.getAdditionalAuthParams();
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.append(key, value);
    });

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Get additional platform-specific authorization parameters
   */
  protected getAdditionalAuthParams(): Record<string, string> {
    return {};
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    try {
      const response = await this.httpClient.post(
        this.config.tokenUrl,
        this.buildTokenRequestBody(code),
        {
          headers: this.getTokenRequestHeaders(),
        },
      );

      return this.parseTokenResponse(response.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to exchange code for tokens: ${errorMessage}`);
      throw new HttpException(
        'Failed to authenticate with social platform',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Build the request body for token exchange
   */
  protected buildTokenRequestBody(code: string): any {
    return {
      grant_type: 'authorization_code',
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
    };
  }

  /**
   * Get headers for token request
   */
  protected getTokenRequestHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  /**
   * Parse the token response from the platform
   */
  protected parseTokenResponse(data: any): OAuthTokens {
    const expiresIn = data.expires_in ? parseInt(data.expires_in, 10) : undefined;
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : undefined;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn,
      expiresAt,
      scope: data.scope,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
    try {
      const response = await this.httpClient.post(
        this.config.tokenUrl,
        this.buildRefreshRequestBody(refreshToken),
        {
          headers: this.getTokenRequestHeaders(),
        },
      );

      const tokens = this.parseTokenResponse(response.data);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || refreshToken, // Some platforms don't return new refresh token
        expiresAt: tokens.expiresAt,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to refresh access token: ${errorMessage}`);
      throw new HttpException(
        'Failed to refresh access token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Build the request body for token refresh
   */
  protected buildRefreshRequestBody(refreshToken: string): any {
    return {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    };
  }

  abstract getAccountInfo(accessToken: string): Promise<PlatformAccountInfo>;

  abstract validateToken(accessToken: string): Promise<boolean>;

  abstract revokeToken(accessToken: string): Promise<void>;

  /**
   * Helper method to make authenticated API requests
   */
  protected async makeAuthenticatedRequest<T>(
    url: string,
    accessToken: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    data?: any,
  ): Promise<T> {
    try {
      const response = await this.httpClient.request({
        method,
        url,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data,
      });

      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`API request failed: ${errorMessage}`);
      throw new HttpException(
        'Failed to communicate with social platform',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
