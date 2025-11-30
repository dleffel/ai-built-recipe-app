// Set timezone to America/Los_Angeles for consistent test behavior
// This ensures timezone utilities work correctly in CI (which runs in UTC)
process.env.TZ = 'America/Los_Angeles';

process.env.OPENAI_API_KEY = 'sk-test-key';