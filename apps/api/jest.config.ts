import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/__tests_integration__/'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/index.ts',
    '!src/types/**',
    '!src/**/__tests_integration__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    },
    './src/services/': {
      branches: 70,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node'
      }
    }]
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};

export default config;
