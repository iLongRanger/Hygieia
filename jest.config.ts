import type { Config } from 'jest'
import { pathsToModuleNameMapper } from 'ts-jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps', '<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.next/'
  ],
  moduleNameMapper: pathsToModuleNameMapper({
    '@hygieia/api': ['<rootDir>/apps/api/src'],
    '@hygieia/web': ['<rootDir>/apps/web/src'],
    '@hygieia/database': ['<rootDir>/packages/database/src'],
    '@hygieia/types': ['<rootDir>/packages/types/src'],
    '@hygieia/utils': ['<rootDir>/packages/utils/src'],
    '@hygieia/ui': ['<rootDir>/packages/ui/src'],
    '@hygieia/shared': ['<rootDir>/packages/shared/src']
  }),
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx}',
    'packages/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/.next/**',
    '!**/coverage/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './apps/api/src/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './apps/api/src/services/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './apps/web/src/components/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
}

export default config
