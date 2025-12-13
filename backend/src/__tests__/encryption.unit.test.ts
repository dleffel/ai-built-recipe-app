import { jest, describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import { encrypt, decrypt, generateEncryptionKey, isEncryptionConfigured } from '../utils/encryption';

describe('Encryption Utility Tests', () => {
  const originalEnv = process.env;
  // Valid 64-character hex key (32 bytes)
  const validKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey();

      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it('should generate unique keys each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('isEncryptionConfigured', () => {
    it('should return true when valid key is configured', () => {
      process.env.GMAIL_TOKEN_ENCRYPTION_KEY = validKey;

      const result = isEncryptionConfigured();

      expect(result).toBe(true);
    });

    it('should return false when key is not set', () => {
      delete process.env.GMAIL_TOKEN_ENCRYPTION_KEY;

      const result = isEncryptionConfigured();

      expect(result).toBe(false);
    });

    it('should return false when key is invalid length', () => {
      process.env.GMAIL_TOKEN_ENCRYPTION_KEY = 'tooshort';

      const result = isEncryptionConfigured();

      expect(result).toBe(false);
    });

    it('should return false when key contains invalid characters', () => {
      // 64 characters but contains invalid hex characters
      process.env.GMAIL_TOKEN_ENCRYPTION_KEY = 'ghijklmnopqrstuvwxyz0123456789abcdef0123456789abcdef0123456789ab';

      const result = isEncryptionConfigured();

      expect(result).toBe(false);
    });
  });

  describe('encrypt', () => {
    beforeEach(() => {
      process.env.GMAIL_TOKEN_ENCRYPTION_KEY = validKey;
    });

    it('should encrypt a string and return formatted output', () => {
      const plaintext = 'Hello, World!';

      const encrypted = encrypt(plaintext);

      // Format should be iv:authTag:encryptedData
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);

      // IV should be 32 hex characters (16 bytes)
      expect(parts[0]).toHaveLength(32);
      expect(/^[0-9a-f]+$/.test(parts[0])).toBe(true);

      // Auth tag should be 32 hex characters (16 bytes)
      expect(parts[1]).toHaveLength(32);
      expect(/^[0-9a-f]+$/.test(parts[1])).toBe(true);

      // Encrypted data should be hex
      expect(/^[0-9a-f]+$/.test(parts[2])).toBe(true);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'Same message';

      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw error when encryption key is not set', () => {
      delete process.env.GMAIL_TOKEN_ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('GMAIL_TOKEN_ENCRYPTION_KEY environment variable is not set');
    });

    it('should throw error when encryption key is wrong length', () => {
      process.env.GMAIL_TOKEN_ENCRYPTION_KEY = 'tooshort';

      expect(() => encrypt('test')).toThrow('GMAIL_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    });

    it('should throw error when encryption key contains invalid characters', () => {
      process.env.GMAIL_TOKEN_ENCRYPTION_KEY = 'ghijklmnopqrstuvwxyz0123456789abcdef0123456789abcdef0123456789ab';

      expect(() => encrypt('test')).toThrow('GMAIL_TOKEN_ENCRYPTION_KEY must contain only valid hex characters');
    });

    it('should handle empty string', () => {
      const encrypted = encrypt('');

      expect(encrypted).toBeDefined();
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should handle unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا';

      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);

      const encrypted = encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted.split(':')).toHaveLength(3);
    });
  });

  describe('decrypt', () => {
    beforeEach(() => {
      process.env.GMAIL_TOKEN_ENCRYPTION_KEY = validKey;
    });

    it('should decrypt an encrypted string back to original', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);

      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string encryption/decryption', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);

      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا';
      const encrypted = encrypt(plaintext);

      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);

      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid format (missing parts)', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid encrypted text format');
      expect(() => decrypt('part1:part2')).toThrow('Invalid encrypted text format');
    });

    it('should throw error for invalid IV length', () => {
      // IV should be 32 hex chars, but we provide less
      const invalidEncrypted = 'abc:' + '0'.repeat(32) + ':' + '0'.repeat(32);

      expect(() => decrypt(invalidEncrypted)).toThrow('Invalid IV length');
    });

    it('should throw error for invalid auth tag length', () => {
      // Auth tag should be 32 hex chars, but we provide less
      const invalidEncrypted = '0'.repeat(32) + ':abc:' + '0'.repeat(32);

      expect(() => decrypt(invalidEncrypted)).toThrow('Invalid auth tag length');
    });

    it('should throw error when encryption key is not set', () => {
      const encrypted = encrypt('test');
      delete process.env.GMAIL_TOKEN_ENCRYPTION_KEY;

      expect(() => decrypt(encrypted)).toThrow('GMAIL_TOKEN_ENCRYPTION_KEY environment variable is not set');
    });

    it('should throw error when decrypting with wrong key', () => {
      const encrypted = encrypt('test');
      // Change to a different valid key
      process.env.GMAIL_TOKEN_ENCRYPTION_KEY = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

      expect(() => decrypt(encrypted)).toThrow();
    });

    it('should throw error for tampered ciphertext', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      // Tamper with the encrypted data
      parts[2] = 'ff' + parts[2].slice(2);
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });

    it('should throw error for tampered auth tag', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      // Tamper with the auth tag
      parts[1] = 'ff' + parts[1].slice(2);
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('encrypt/decrypt integration', () => {
    beforeEach(() => {
      process.env.GMAIL_TOKEN_ENCRYPTION_KEY = validKey;
    });

    it('should correctly round-trip JSON data', () => {
      const data = {
        accessToken: 'ya29.a0AfH6SMBx...',
        refreshToken: '1//0gYs...',
        expiresAt: 1234567890,
      };
      const plaintext = JSON.stringify(data);

      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      const parsed = JSON.parse(decrypted);

      expect(parsed).toEqual(data);
    });

    it('should handle special characters in JSON', () => {
      const data = {
        message: 'Hello "World"! \n\t Special: <>&\'',
        unicode: '日本語 🎉',
      };
      const plaintext = JSON.stringify(data);

      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      const parsed = JSON.parse(decrypted);

      expect(parsed).toEqual(data);
    });
  });
});
