import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TokenEncryptionService } from './token-encryption.service';

describe('TokenEncryptionService', () => {
  let service: TokenEncryptionService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenEncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_KEY') {
                return 'test-encryption-key-for-unit-tests-must-be-long-enough';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TokenEncryptionService>(TokenEncryptionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt', () => {
    it('should encrypt a token successfully', () => {
      const token = 'test-access-token-12345';
      const encrypted = service.encrypt(token);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(token);
      expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:encryptedData
    });

    it('should produce different encrypted values for the same token', () => {
      const token = 'test-access-token-12345';
      const encrypted1 = service.encrypt(token);
      const encrypted2 = service.encrypt(token);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
    });

    it('should throw error for empty token', () => {
      expect(() => service.encrypt('')).toThrow('Token cannot be empty');
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted token successfully', () => {
      const originalToken = 'test-access-token-12345';
      const encrypted = service.encrypt(originalToken);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(originalToken);
    });

    it('should handle long tokens', () => {
      const longToken = 'a'.repeat(1000);
      const encrypted = service.encrypt(longToken);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(longToken);
    });

    it('should handle special characters in tokens', () => {
      const specialToken = 'token!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = service.encrypt(specialToken);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(specialToken);
    });

    it('should throw error for empty encrypted token', () => {
      expect(() => service.decrypt('')).toThrow('Encrypted token cannot be empty');
    });

    it('should throw error for invalid encrypted token format', () => {
      expect(() => service.decrypt('invalid-format')).toThrow(
        'Invalid encrypted token format',
      );
    });

    it('should throw error for tampered encrypted token', () => {
      const originalToken = 'test-access-token-12345';
      const encrypted = service.encrypt(originalToken);
      const tampered = encrypted.replace(/.$/, 'X'); // Change last character

      expect(() => service.decrypt(tampered)).toThrow('Failed to decrypt token');
    });
  });

  describe('isValidEncryptedToken', () => {
    it('should return true for valid encrypted token', () => {
      const token = 'test-access-token-12345';
      const encrypted = service.encrypt(token);

      expect(service.isValidEncryptedToken(encrypted)).toBe(true);
    });

    it('should return false for invalid encrypted token', () => {
      expect(service.isValidEncryptedToken('invalid-token')).toBe(false);
    });

    it('should return false for tampered encrypted token', () => {
      const token = 'test-access-token-12345';
      const encrypted = service.encrypt(token);
      const tampered = encrypted.replace(/.$/, 'X');

      expect(service.isValidEncryptedToken(tampered)).toBe(false);
    });
  });

  describe('round-trip encryption', () => {
    it('should successfully encrypt and decrypt multiple times', () => {
      const token = 'test-token';

      for (let i = 0; i < 10; i++) {
        const encrypted = service.encrypt(token);
        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(token);
      }
    });

    it('should handle various token formats', () => {
      const tokens = [
        'simple-token',
        'token.with.dots',
        'token_with_underscores',
        'token-with-dashes',
        'TokenWithCaps',
        '1234567890',
        'token with spaces',
        'token\nwith\nnewlines',
      ];

      tokens.forEach((token) => {
        const encrypted = service.encrypt(token);
        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(token);
      });
    });
  });

  describe('error handling', () => {
    it('should throw error if ENCRYPTION_KEY is not set', () => {
      const mockConfigService = {
        get: jest.fn(() => null),
      };

      expect(() => {
        new TokenEncryptionService(mockConfigService as any);
      }).toThrow('ENCRYPTION_KEY must be set in environment variables');
    });
  });
});
