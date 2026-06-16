/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/audio/**',
    '!src/utils/haptics.ts',
    '!src/ads/AdManager.ts',
    '!src/ads/constants.ts',
    '!src/ads/banner.tsx',
    '!src/iap/**',
    '!src/services/**',
    '!src/components/**',
  ],
};
