import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformAdapterFactory } from '../adapters/platform-adapter.factory';
import { TokenEncryptionService } from './token-encryption.service';
import { Platform } from '@prisma/client';

/**
 * Service for automatic token refresh
 * Implements Requirement 5.1: Automatic token refresh with 1-hour buffer
 */
@Injectable()
export class TokenRefreshService {
  private readonly logger = new Logger(TokenRefreshService.name);
  private readonly REFRESH_BUFFER_HOURS = 1; // Refresh 1 hour before expiry

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformAdapterFactory: PlatformAdapterFactory,
    private readonly tokenEncryptionService: TokenEncryptionService,
  ) {}

  /**
   * Cron job to check and refresh expiring tokens
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async refreshExpiringTokens(): Promise<void> {
    this.logger.log('Starting automatic token refresh check');

    try {
      // Find accounts with tokens expiring within the buffer period
      const bufferTime = new Date(
        Date.now() + this.REFRESH_BUFFER_HOURS * 60 * 60 * 1000,
      );

      const expiringAccounts = await this.prisma.socialAccount.findMany({
        where: {
          isActive: true,
          tokenExpiry: {
            lte: bufferTime,
            gte: new Date(), // Not already expired
          },
          refreshToken: {
            not: null,
          },
        },
      });

      this.logger.log(
        `Found ${expiringAccounts.length} accounts with expiring tokens`,
      );

      // Refresh tokens for each account
      const results = await Promise.allSettled(
        expiringAccounts.map((account) => this.refreshAccountToken(account.id)),
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `Token refresh completed: ${successful} successful, ${failed} failed`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Token refresh check failed: ${errorMessage}`);
    }
  }

  /**
   * Refresh token for a specific account
   * @param accountId - Social account ID
   */
  async refreshAccountToken(accountId: string): Promise<void> {
    try {
      // Get account details
      const account = await this.prisma.socialAccount.findUnique({
        where: { id: accountId },
      });

      if (!account || !account.refreshToken) {
        throw new Error('Account not found or no refresh token available');
      }

      // Decrypt refresh token
      const refreshToken = this.tokenEncryptionService.decrypt(
        account.refreshToken,
      );

      // Get platform adapter
      const adapter = this.platformAdapterFactory.getAdapter(
        account.platform as Platform,
      );

      // Refresh the token
      const newTokens = await adapter.refreshAccessToken(refreshToken);

      // Encrypt new tokens
      const encryptedAccessToken = this.tokenEncryptionService.encrypt(
        newTokens.accessToken,
      );
      const encryptedRefreshToken = newTokens.refreshToken
        ? this.tokenEncryptionService.encrypt(newTokens.refreshToken)
        : account.refreshToken; // Keep old refresh token if new one not provided

      // Update account with new tokens
      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiry: newTokens.expiresAt,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Successfully refreshed token for account ${accountId} (${account.platform})`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to refresh token for account ${accountId}: ${errorMessage}`,
      );

      // Mark account as needing re-authentication
      await this.markAccountForReauth(accountId);

      throw error;
    }
  }

  /**
   * Check if an account's token needs refresh
   * @param accountId - Social account ID
   * @returns true if token needs refresh
   */
  async needsTokenRefresh(accountId: string): Promise<boolean> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
      select: { tokenExpiry: true },
    });

    if (!account || !account.tokenExpiry) {
      return false;
    }

    const bufferTime = new Date(
      Date.now() + this.REFRESH_BUFFER_HOURS * 60 * 60 * 1000,
    );

    return account.tokenExpiry <= bufferTime;
  }

  /**
   * Manually trigger token refresh for an account
   * @param accountId - Social account ID
   */
  async manualRefresh(accountId: string): Promise<void> {
    this.logger.log(`Manual token refresh requested for account ${accountId}`);
    await this.refreshAccountToken(accountId);
  }

  /**
   * Mark account as needing re-authentication
   * @param accountId - Social account ID
   */
  private async markAccountForReauth(accountId: string): Promise<void> {
    await this.prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        isActive: false,
        metadata: {
          needsReauth: true,
          reauthReason: 'Token refresh failed',
          reauthRequestedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.warn(
      `Account ${accountId} marked for re-authentication due to token refresh failure`,
    );
  }

  /**
   * Get accounts that need re-authentication
   * @param workspaceId - Workspace ID
   */
  async getAccountsNeedingReauth(workspaceId: string): Promise<any[]> {
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        workspaceId,
        isActive: false,
      },
    });

    return accounts.filter((account) => {
      const metadata = account.metadata as any;
      return metadata?.needsReauth === true;
    });
  }
}
