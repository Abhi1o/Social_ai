import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Platform } from '@prisma/client';
import { SocialAccountService } from './social-account.service';
import { OAuthService } from './services/oauth.service';
import { TokenEncryptionService } from './services/token-encryption.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { PlatformAdapterFactory } from './adapters/platform-adapter.factory';
import { PrismaService } from '../prisma/prisma.service';

describe('SocialAccountService Integration', () => {
  let service: SocialAccountService;
  let prismaService: PrismaService;
  let tokenEncryptionService: TokenEncryptionService;

  const mockPrismaService = {
    workspace: {
      findUnique: jest.fn(),
    },
    socialAccount: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        ENCRYPTION_KEY: 'test-encryption-key-for-integration-tests-must-be-long',
        INSTAGRAM_CLIENT_ID: 'test-instagram-client-id',
        INSTAGRAM_CLIENT_SECRET: 'test-instagram-client-secret',
        INSTAGRAM_REDIRECT_URI: 'http://localhost:3001/callback',
      };
      return config[key] || null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialAccountService,
        OAuthService,
        TokenEncryptionService,
        TokenRefreshService,
        {
          provide: PlatformAdapterFactory,
          useValue: {
            getAdapter: jest.fn(() => ({
              platform: Platform.INSTAGRAM,
              getOAuthConfig: jest.fn(() => ({
                clientId: 'test-client-id',
                clientSecret: 'test-client-secret',
                redirectUri: 'http://localhost:3001/callback',
                scopes: ['basic'],
                authorizationUrl: 'https://example.com/oauth',
                tokenUrl: 'https://example.com/token',
              })),
              revokeToken: jest.fn(),
            })),
            isPlatformSupported: jest.fn(() => true),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SocialAccountService>(SocialAccountService);
    prismaService = module.get<PrismaService>(PrismaService);
    tokenEncryptionService = module.get<TokenEncryptionService>(TokenEncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Token Encryption Integration', () => {
    it('should encrypt and decrypt tokens correctly', () => {
      const originalToken = 'test-access-token-12345';
      const encrypted = tokenEncryptionService.encrypt(originalToken);
      const decrypted = tokenEncryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalToken);
      expect(encrypted).not.toBe(originalToken);
    });

    it('should handle multiple encryption/decryption cycles', () => {
      const tokens = [
        'access-token-1',
        'access-token-2',
        'refresh-token-1',
        'refresh-token-2',
      ];

      tokens.forEach((token) => {
        const encrypted = tokenEncryptionService.encrypt(token);
        const decrypted = tokenEncryptionService.decrypt(encrypted);
        expect(decrypted).toBe(token);
      });
    });
  });

  describe('findAll', () => {
    it('should return all social accounts for workspace', async () => {
      const workspaceId = 'workspace-123';
      const mockAccounts = [
        {
          id: 'account-1',
          workspaceId,
          platform: Platform.INSTAGRAM,
          username: 'testuser1',
          displayName: 'Test User 1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'account-2',
          workspaceId,
          platform: Platform.FACEBOOK,
          username: 'testuser2',
          displayName: 'Test User 2',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.socialAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await service.findAll(workspaceId);

      expect(result).toEqual(mockAccounts);
      expect(mockPrismaService.socialAccount.findMany).toHaveBeenCalledWith({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getAccountHealth', () => {
    it('should return healthy status for active account with valid token', async () => {
      const accountId = 'account-123';
      const workspaceId = 'workspace-123';
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const mockAccount = {
        id: accountId,
        workspaceId,
        platform: Platform.INSTAGRAM,
        isActive: true,
        tokenExpiry: futureDate,
        metadata: {},
      };

      mockPrismaService.socialAccount.findFirst.mockResolvedValue(mockAccount);

      const result = await service.getAccountHealth(accountId, workspaceId);

      expect(result.isHealthy).toBe(true);
      expect(result.needsReauth).toBe(false);
      expect(result.daysUntilExpiry).toBeGreaterThan(6);
    });

    it('should return unhealthy status for account needing reauth', async () => {
      const accountId = 'account-123';
      const workspaceId = 'workspace-123';

      const mockAccount = {
        id: accountId,
        workspaceId,
        platform: Platform.INSTAGRAM,
        isActive: false,
        tokenExpiry: new Date(),
        metadata: { needsReauth: true },
      };

      mockPrismaService.socialAccount.findFirst.mockResolvedValue(mockAccount);

      const result = await service.getAccountHealth(accountId, workspaceId);

      expect(result.isHealthy).toBe(false);
      expect(result.needsReauth).toBe(true);
    });
  });

  describe('getConfiguredPlatforms', () => {
    it('should return list of configured platforms', () => {
      const platforms = service.getConfiguredPlatforms();

      expect(Array.isArray(platforms)).toBe(true);
      // Instagram should be configured based on our mock config
      expect(platforms).toContain(Platform.INSTAGRAM);
    });
  });
});
