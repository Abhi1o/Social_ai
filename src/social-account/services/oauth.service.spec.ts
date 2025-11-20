import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { OAuthService } from './oauth.service';
import { PlatformAdapterFactory } from '../adapters/platform-adapter.factory';
import { TokenEncryptionService } from './token-encryption.service';
import { IPlatformAdapter } from '../interfaces/platform-adapter.interface';

describe('OAuthService', () => {
  let service: OAuthService;
  let platformAdapterFactory: PlatformAdapterFactory;
  let tokenEncryptionService: TokenEncryptionService;

  const mockAdapter: Partial<IPlatformAdapter> = {
    platform: Platform.INSTAGRAM,
    getOAuthConfig: jest.fn(() => ({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3001/callback',
      scopes: ['basic', 'publish'],
      authorizationUrl: 'https://example.com/oauth/authorize',
      tokenUrl: 'https://example.com/oauth/token',
    })),
    getAuthorizationUrl: jest.fn((state: string) => 
      `https://example.com/oauth/authorize?state=${state}`
    ),
    exchangeCodeForTokens: jest.fn(async () => ({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600000),
    })),
    getAccountInfo: jest.fn(async () => ({
      platformAccountId: '12345',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: PlatformAdapterFactory,
          useValue: {
            getAdapter: jest.fn(() => mockAdapter),
          },
        },
        {
          provide: TokenEncryptionService,
          useValue: {
            encrypt: jest.fn((token) => `encrypted_${token}`),
            decrypt: jest.fn((token) => token.replace('encrypted_', '')),
          },
        },
      ],
    }).compile();

    service = module.get<OAuthService>(OAuthService);
    platformAdapterFactory = module.get<PlatformAdapterFactory>(PlatformAdapterFactory);
    tokenEncryptionService = module.get<TokenEncryptionService>(TokenEncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiateOAuthFlow', () => {
    it('should generate authorization URL with state', () => {
      const platform = Platform.INSTAGRAM;
      const workspaceId = 'workspace-123';
      const userId = 'user-123';

      const authUrl = service.initiateOAuthFlow(platform, workspaceId, userId);

      expect(authUrl).toContain('https://example.com/oauth/authorize');
      expect(authUrl).toContain('state=');
      expect(platformAdapterFactory.getAdapter).toHaveBeenCalledWith(platform);
    });

    it('should store OAuth state', () => {
      const platform = Platform.INSTAGRAM;
      const workspaceId = 'workspace-123';
      const userId = 'user-123';

      const authUrl = service.initiateOAuthFlow(platform, workspaceId, userId);
      const state = authUrl.split('state=')[1];

      expect(state).toBeDefined();
      expect(state.length).toBeGreaterThan(0);
    });
  });

  describe('handleOAuthCallback', () => {
    it('should successfully handle OAuth callback', async () => {
      const platform = Platform.INSTAGRAM;
      const workspaceId = 'workspace-123';
      const userId = 'user-123';

      // First initiate the flow to create state
      const authUrl = service.initiateOAuthFlow(platform, workspaceId, userId);
      const state = authUrl.split('state=')[1];

      const result = await service.handleOAuthCallback('auth-code-123', state);

      expect(result).toEqual({
        platform: Platform.INSTAGRAM,
        workspaceId,
        userId,
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: expect.any(Date),
        accountInfo: {
          platformAccountId: '12345',
          username: 'testuser',
          displayName: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
        },
      });

      expect(mockAdapter.exchangeCodeForTokens).toHaveBeenCalledWith('auth-code-123');
      expect(mockAdapter.getAccountInfo).toHaveBeenCalledWith('test-access-token');
    });

    it('should throw error for invalid state', async () => {
      await expect(
        service.handleOAuthCallback('auth-code-123', 'invalid-state')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for expired state', async () => {
      const platform = Platform.INSTAGRAM;
      const workspaceId = 'workspace-123';
      const userId = 'user-123';

      const authUrl = service.initiateOAuthFlow(platform, workspaceId, userId);
      const state = authUrl.split('state=')[1];

      // Use the state once
      await service.handleOAuthCallback('auth-code-123', state);

      // Try to use it again (should fail - one-time use)
      await expect(
        service.handleOAuthCallback('auth-code-456', state)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should return authorization URL configuration', () => {
      const result = service.getAuthorizationUrl(Platform.INSTAGRAM);

      expect(result).toEqual({
        url: 'https://example.com/oauth/authorize',
        scopes: ['basic', 'publish'],
      });
    });
  });

  describe('isPlatformConfigured', () => {
    it('should return true for configured platform', () => {
      const result = service.isPlatformConfigured(Platform.INSTAGRAM);
      expect(result).toBe(true);
    });

    it('should return false for platform with missing credentials', () => {
      const mockAdapterWithoutConfig = {
        ...mockAdapter,
        getOAuthConfig: jest.fn(() => ({
          clientId: '',
          clientSecret: '',
          redirectUri: '',
          scopes: [],
          authorizationUrl: '',
          tokenUrl: '',
        })),
      };

      jest.spyOn(platformAdapterFactory, 'getAdapter').mockReturnValue(
        mockAdapterWithoutConfig as any
      );

      const result = service.isPlatformConfigured(Platform.INSTAGRAM);
      expect(result).toBe(false);
    });
  });

  describe('getConfiguredPlatforms', () => {
    it('should return list of configured platforms', () => {
      const platforms = service.getConfiguredPlatforms();
      expect(Array.isArray(platforms)).toBe(true);
    });
  });
});
