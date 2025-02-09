import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('Server Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env };
    // Clear cached modules
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  it('should load default values when env vars are not present', async () => {
    // Clear relevant environment variables
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.CORS_ORIGIN;

    const config = (await import('../config/server-config')).default;

    expect(config.port).toBe(5001);
    expect(config.nodeEnv).toBe('development');
    expect(config.corsOrigin).toBe('http://localhost:3000');
  });

  it('should use environment variables when provided', async () => {
    // Set test environment variables
    process.env.PORT = '8000';
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://example.com';

    const config = (await import('../config/server-config')).default;

    expect(config.port).toBe(8000); // Now expecting a number
    expect(config.nodeEnv).toBe('production');
    expect(config.corsOrigin).toBe('https://example.com');
  });
});