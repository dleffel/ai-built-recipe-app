describe('Server Configuration', () => {
  let originalEnv;

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

  it('should load default values when env vars are not present', () => {
    // Clear relevant environment variables
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.CORS_ORIGIN;

    const config = require('../config/server-config');

    expect(config.port).toBe(5001);
    expect(config.nodeEnv).toBe('development');
    expect(config.corsOrigin).toBe('http://localhost:3000');
  });

  it('should use environment variables when provided', () => {
    // Set test environment variables
    process.env.PORT = '8000';
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://example.com';

    const config = require('../config/server-config');

    expect(config.port).toBe('8000');
    expect(config.nodeEnv).toBe('production');
    expect(config.corsOrigin).toBe('https://example.com');
  });
});