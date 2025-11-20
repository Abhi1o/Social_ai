import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Service for encrypting and decrypting OAuth tokens using AES-256
 * Implements secure token storage as per Requirement 5.1 and 32.2
 */
@Injectable()
export class TokenEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits
  private readonly encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    
    if (!key) {
      throw new Error('ENCRYPTION_KEY must be set in environment variables');
    }

    // Derive a 256-bit key from the provided key
    this.encryptionKey = crypto.scryptSync(key, 'salt', this.keyLength);
  }

  /**
   * Encrypts a token using AES-256-GCM
   * @param token - The plaintext token to encrypt
   * @returns Encrypted token in format: iv:authTag:encryptedData (all base64 encoded)
   */
  encrypt(token: string): string {
    if (!token) {
      throw new Error('Token cannot be empty');
    }

    // Generate a random initialization vector
    const iv = crypto.randomBytes(this.ivLength);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    // Encrypt the token
    let encrypted = cipher.update(token, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypts a token encrypted with AES-256-GCM
   * @param encryptedToken - The encrypted token in format: iv:authTag:encryptedData
   * @returns Decrypted plaintext token
   */
  decrypt(encryptedToken: string): string {
    if (!encryptedToken) {
      throw new Error('Encrypted token cannot be empty');
    }

    try {
      // Split the encrypted token into its components
      const parts = encryptedToken.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted token format');
      }

      const [ivBase64, authTagBase64, encryptedData] = parts;

      // Convert from base64
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt the token
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to decrypt token: ${errorMessage}`);
    }
  }

  /**
   * Validates that a token can be successfully decrypted
   * @param encryptedToken - The encrypted token to validate
   * @returns true if valid, false otherwise
   */
  isValidEncryptedToken(encryptedToken: string): boolean {
    try {
      this.decrypt(encryptedToken);
      return true;
    } catch {
      return false;
    }
  }
}
