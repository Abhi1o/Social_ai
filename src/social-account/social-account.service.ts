import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Platform, SocialAccount } from '@prisma/client';
import { OAuthService } from './services/oauth.service';
import { TokenEncryptionService } from './services/token-encryption.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { PlatformAdapterFactory } from './adapters/platform-adapter.factory';
import { UpdateSocialAccountDto } from './dto/update-account.dto';

/**
 * Service for managing social media account connections
 * Implements Requirements 5.1, 5.5, 32.2
 */
@Injectable()
export class SocialAccountService {
  private readonly logger = new Logger(SocialAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oauthService: OAuthService,
    private readonly tokenEncryptionService: TokenEncryptionService,
    private readonly tokenRefreshService: TokenRefreshService,
    private readonly platformAdapterFactory: PlatformAdapterFactory,
  ) {}

  /**
   * Initiate OAuth connection for a social platform
   * @param platform - Social media platform
   * @param workspaceId - Workspace ID
   * @param userId - User ID
   * @returns Authorization URL
   */
  async initiateConnection(
    platform: Platform,
    workspaceId: string,
    userId: string,
  ): Promise<{ authorizationUrl: string }> {
    // Verify workspace exists
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if platform is configured
    if (!this.oauthService.isPlatformConfigured(platform)) {
      throw new BadRequestException(
        `Platform ${platform} is not configured. Please set up OAuth credentials.`,
      );
    }

    const authorizationUrl = this.oauthService.initiateOAuthFlow(
      platform,
      workspaceId,
      userId,
    );

    this.logger.log(
      `Initiated connection for ${platform} - workspace: ${workspaceId}`,
    );

    return { authorizationUrl };
  }

  /**
   * Complete OAuth connection after callback
   * @param code - Authorization code
   * @param state - OAuth state
   * @returns Created social account
   */
  async completeConnection(
    code: string,
    state: string,
  ): Promise<SocialAccount> {
    // Handle OAuth callback
    const result = await this.oauthService.handleOAuthCallback(code, state);

    // Check if account already exists
    const existingAccount = await this.prisma.socialAccount.findFirst({
      where: {
        workspaceId: result.workspaceId,
        platform: result.platform,
        platformAccountId: result.accountInfo.platformAccountId,
      },
    });

    if (existingAccount) {
      // Update existing account with new tokens
      return this.updateAccountTokens(
        existingAccount.id,
        result.accessToken,
        result.refreshToken,
        result.expiresAt,
      );
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = this.tokenEncryptionService.encrypt(
      result.accessToken,
    );
    const encryptedRefreshToken = result.refreshToken
      ? this.tokenEncryptionService.encrypt(result.refreshToken)
      : null;

    // Create new social account
    const account = await this.prisma.socialAccount.create({
      data: {
        workspaceId: result.workspaceId,
        platform: result.platform,
        platformAccountId: result.accountInfo.platformAccountId,
        username: result.accountInfo.username,
        displayName: result.accountInfo.displayName,
        avatar: result.accountInfo.avatar,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry: result.expiresAt,
        isActive: true,
        metadata: result.accountInfo.metadata || {},
      },
    });

    this.logger.log(
      `Created social account: ${account.id} (${account.platform} - ${account.username})`,
    );

    return account;
  }

  /**
   * Get all social accounts for a workspace
   * @param workspaceId - Workspace ID
   */
  async findAll(workspaceId: string): Promise<SocialAccount[]> {
    return this.prisma.socialAccount.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific social account
   * @param id - Account ID
   * @param workspaceId - Workspace ID
   */
  async findOne(id: string, workspaceId: string): Promise<SocialAccount> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id, workspaceId },
    });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    return account;
  }

  /**
   * Update a social account
   * @param id - Account ID
   * @param workspaceId - Workspace ID
   * @param updateDto - Update data
   */
  async update(
    id: string,
    workspaceId: string,
    updateDto: UpdateSocialAccountDto,
  ): Promise<SocialAccount> {
    // Verify account exists and belongs to workspace
    await this.findOne(id, workspaceId);

    return this.prisma.socialAccount.update({
      where: { id },
      data: updateDto,
    });
  }

  /**
   * Delete a social account (disconnect)
   * @param id - Account ID
   * @param workspaceId - Workspace ID
   */
  async remove(id: string, workspaceId: string): Promise<void> {
    const account = await this.findOne(id, workspaceId);

    try {
      // Attempt to revoke token on platform
      const decryptedToken = this.tokenEncryptionService.decrypt(
        account.accessToken,
      );
      const adapter = this.platformAdapterFactory.getAdapter(
        account.platform as Platform,
      );
      await adapter.revokeToken(decryptedToken);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to revoke token for account ${id}: ${errorMessage}`,
      );
      // Continue with deletion even if revocation fails
    }

    await this.prisma.socialAccount.delete({
      where: { id },
    });

    this.logger.log(`Deleted social account: ${id}`);
  }

  /**
   * Get account health status
   * @param id - Account ID
   * @param workspaceId - Workspace ID
   */
  async getAccountHealth(
    id: string,
    workspaceId: string,
  ): Promise<{
    isHealthy: boolean;
    needsReauth: boolean;
    tokenExpiry?: Date;
    daysUntilExpiry?: number;
  }> {
    const account = await this.findOne(id, workspaceId);

    const metadata = account.metadata as any;
    const needsReauth = metadata?.needsReauth === true;

    let daysUntilExpiry: number | undefined;
    if (account.tokenExpiry) {
      const msUntilExpiry = account.tokenExpiry.getTime() - Date.now();
      daysUntilExpiry = Math.floor(msUntilExpiry / (1000 * 60 * 60 * 24));
    }

    const isHealthy =
      account.isActive &&
      !needsReauth &&
      (!account.tokenExpiry || account.tokenExpiry > new Date());

    return {
      isHealthy,
      needsReauth,
      tokenExpiry: account.tokenExpiry || undefined,
      daysUntilExpiry,
    };
  }

  /**
   * Manually refresh account token
   * @param id - Account ID
   * @param workspaceId - Workspace ID
   */
  async refreshToken(id: string, workspaceId: string): Promise<void> {
    await this.findOne(id, workspaceId);
    await this.tokenRefreshService.manualRefresh(id);
  }

  /**
   * Get accounts needing re-authentication
   * @param workspaceId - Workspace ID
   */
  async getAccountsNeedingReauth(workspaceId: string): Promise<SocialAccount[]> {
    return this.tokenRefreshService.getAccountsNeedingReauth(workspaceId);
  }

  /**
   * Get list of configured platforms
   */
  getConfiguredPlatforms(): Platform[] {
    return this.oauthService.getConfiguredPlatforms();
  }

  /**
   * Get decrypted access token for internal use
   * @param id - Account ID
   * @param workspaceId - Workspace ID
   */
  async getDecryptedAccessToken(
    id: string,
    workspaceId: string,
  ): Promise<string> {
    const account = await this.findOne(id, workspaceId);

    // Check if token needs refresh
    if (await this.tokenRefreshService.needsTokenRefresh(id)) {
      await this.tokenRefreshService.refreshAccountToken(id);
      // Fetch updated account
      const updatedAccount = await this.findOne(id, workspaceId);
      return this.tokenEncryptionService.decrypt(updatedAccount.accessToken);
    }

    return this.tokenEncryptionService.decrypt(account.accessToken);
  }

  /**
   * Update account tokens (used during refresh)
   */
  private async updateAccountTokens(
    id: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: Date,
  ): Promise<SocialAccount> {
    const encryptedAccessToken = this.tokenEncryptionService.encrypt(accessToken);
    const encryptedRefreshToken = refreshToken
      ? this.tokenEncryptionService.encrypt(refreshToken)
      : undefined;

    return this.prisma.socialAccount.update({
      where: { id },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry: expiresAt,
        isActive: true,
        metadata: {}, // Clear reauth flags
      },
    });
  }
}
