module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: [
    '<rootDir>/test/setup-env.js'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/prisma/jest-setup.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/config/**',
    '!src/types/**',
    '!src/**/*.d.ts'
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  }
};