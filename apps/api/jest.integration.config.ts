import type { Config } from 'jest'
import { pathsToModuleNameMapper } from 'ts-jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  moduleNameMapper: pathsToModuleNameMapper({
    '@hygieia/types': ['<rootDir>/../../packages/types/src'],
    '@hygieia/utils': ['<rootDir>/../../packages/utils/src']
  }, { prefix: '<rootDir>/../../' }),
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/coverage'
}

export default config
