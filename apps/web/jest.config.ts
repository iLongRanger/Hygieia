import type { Config } from 'jest'
import { pathsToModuleNameMapper } from 'ts-jest'

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.tsx',
    '**/?(*.)+(spec|test).tsx'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: pathsToModuleNameMapper({
    '@hygieia/types': ['<rootDir>/../../packages/types/src'],
    '@hygieia/utils': ['<rootDir>/../../packages/utils/src'],
    '@hygieia/ui': ['<rootDir>/../../packages/ui/src']
  }, { prefix: '<rootDir>/../../' }),
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react-jsx'
        }
      }
    ]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
}

export default config
