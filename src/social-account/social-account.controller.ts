import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialAccountService } from './social-account.service';
import { InitiateConnectionDto, OAuthCallbackDto } from './dto/connect-account.dto';
import { UpdateSocialAccountDto } from './dto/update-account.dto';
import { Platform } from '@prisma/client';

/**
 * Controller for social account management
 * Implements CRUD endpoints for social account connections
 */
@Controller('api/social-accounts')
@UseGuards(JwtAuthGuard)
export class SocialAccountController {
  constructor(private readonly socialAccountService: SocialAccountService) {}

  /**
   * Get all social accounts for workspace
   * GET /api/social-accounts
   */
  @Get()
  async findAll(@Req() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.socialAccountService.findAll(workspaceId);
  }

  /**
   * Get a specific social account
   * GET /api/social-accounts/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.socialAccountService.findOne(id, workspaceId);
  }

  /**
   * Get list of configured platforms
   * GET /api/social-accounts/platforms/configured
   */
  @Get('platforms/configured')
  getConfiguredPlatforms() {
    return {
      platforms: this.socialAccountService.getConfiguredPlatforms(),
    };
  }

  /**
   * Initiate OAuth connection for a platform
   * POST /api/social-accounts/connect/initiate
   */
  @Post('connect/initiate')
  async initiateConnection(
    @Body() dto: InitiateConnectionDto,
    @Req() req: any,
  ) {
    const workspaceId = req.user.workspaceId;
    const userId = req.user.sub;

    return this.socialAccountService.initiateConnection(
      dto.platform,
      workspaceId,
      userId,
    );
  }

  /**
   * Complete OAuth connection (callback handler)
   * POST /api/social-accounts/connect/callback
   */
  @Post('connect/callback')
  async completeConnection(@Body() dto: OAuthCallbackDto) {
    const account = await this.socialAccountService.completeConnection(
      dto.code,
      dto.state,
    );

    // Remove sensitive data from response
    const { accessToken, refreshToken, ...safeAccount } = account;

    return safeAccount;
  }

  /**
   * Update a social account
   * PATCH /api/social-accounts/:id
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSocialAccountDto,
    @Req() req: any,
  ) {
    const workspaceId = req.user.workspaceId;
    const account = await this.socialAccountService.update(
      id,
      workspaceId,
      updateDto,
    );

    // Remove sensitive data from response
    const { accessToken, refreshToken, ...safeAccount } = account;
    return safeAccount;
  }

  /**
   * Delete a social account (disconnect)
   * DELETE /api/social-accounts/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.user.workspaceId;
    await this.socialAccountService.remove(id, workspaceId);
  }

  /**
   * Get account health status
   * GET /api/social-accounts/:id/health
   */
  @Get(':id/health')
  async getAccountHealth(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.socialAccountService.getAccountHealth(id, workspaceId);
  }

  /**
   * Manually refresh account token
   * POST /api/social-accounts/:id/refresh
   */
  @Post(':id/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Param('id') id: string, @Req() req: any) {
    const workspaceId = req.user.workspaceId;
    await this.socialAccountService.refreshToken(id, workspaceId);
    return { message: 'Token refreshed successfully' };
  }

  /**
   * Get accounts needing re-authentication
   * GET /api/social-accounts/reauth/needed
   */
  @Get('reauth/needed')
  async getAccountsNeedingReauth(@Req() req: any) {
    const workspaceId = req.user.workspaceId;
    const accounts = await this.socialAccountService.getAccountsNeedingReauth(
      workspaceId,
    );

    // Remove sensitive data
    return accounts.map(({ accessToken, refreshToken, ...account }) => account);
  }
}
