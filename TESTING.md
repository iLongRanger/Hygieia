# Hygieia Testing Strategy

This document outlines the testing infrastructure, strategy, and guidelines for the Hygieia project.

## Testing Infrastructure

### Tech Stack
- **Test Framework**: Jest 29.7.0
- **Test Runner**: ts-jest (TypeScript support)
- **API Testing**: Supertest 6.3.3
- **Mocking**: jest-mock-extended for type-safe mocks
- **Coverage**: Built-in Jest coverage with lcov, HTML, and JSON reporters

### Project Structure
```
apps/api/
├── src/
│   ├── services/
│   │   └── __tests__/          # Unit tests for services
│   ├── routes/
│   │   └── __tests__/          # Integration tests for API routes
│   └── test/
│       ├── setup.ts            # Global test setup
│       ├── helpers.ts          # Test utilities and mock factories
│       └── integration-setup.ts # Integration test app setup
├── jest.config.ts              # Jest configuration
└── package.json

apps/web/
├── src/
│   └── test/
│       └── setup.ts            # React Testing Library setup
├── jest.config.ts
└── package.json
```

## Testing Layers

### 1. Unit Tests (Service Layer)

Unit tests focus on testing individual service functions in isolation with all dependencies mocked.

**Location**: `apps/api/src/services/__tests__/*.test.ts`

**Current Coverage**:
- ✅ authService.ts - 100% coverage (35 tests)
- ✅ userService.ts - 98.76% coverage (28 tests)
- ✅ leadService.ts - 83.87% coverage (19 tests)
- ✅ taskTemplateService.ts - 86.66% coverage (18 tests)

**Example**:
```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as authService from '../authService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login with valid credentials', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const result = await authService.login(credentials);

    expect(result).toBeDefined();
    expect(result?.user.email).toBe(credentials.email);
  });
});
```

### 2. Integration Tests (API Routes)

Integration tests verify that routes, middleware, and services work together correctly.

**Location**: `apps/api/src/routes/__tests__/*.integration.test.ts`

**Current Coverage**:
- ✅ auth.ts - Partial coverage (login, refresh, register)
- ✅ leads.ts - Partial coverage (CRUD operations)

**Example**:
```typescript
import request from 'supertest';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    setupTestRoutes(app, authRoutes, '/api/v1/auth');
  });

  it('should return 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'wrong@test.com', password: 'wrong' })
      .expect(401);

    expect(response.body.error).toBeDefined();
  });
});
```

### 3. Component Tests (Frontend)

Component tests use React Testing Library to test UI components in isolation.

**Location**: `apps/web/src/**/__tests__/*.test.tsx`

**Status**: Configured but not yet implemented

### 4. E2E Tests (Playwright)

End-to-end tests verify complete user flows across the entire application.

**Location**: `tests/e2e/`

**Status**: Planned for future implementation

## Test Utilities

### Mock Factories (`apps/api/src/test/helpers.ts`)

Reusable factory functions for creating test data:

```typescript
export const createTestUser = (overrides?: Partial<any>) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  fullName: 'Test User',
  status: 'active',
  ...overrides,
});

export const createTestLead = (overrides?) => ({...});
export const createTestAccount = (overrides?) => ({...});
export const mockPaginatedResult = (data, page, limit) => ({...});
```

### Test Setup

Global test configuration in `apps/api/src/test/setup.ts`:

```typescript
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/hygieia_test';
});
```

## Running Tests

### Run All Tests
```bash
# From project root
pnpm test

# API tests only
cd apps/api && pnpm test

# Web tests only
cd apps/web && pnpm test
```

### Run Tests in Watch Mode
```bash
pnpm test:watch
```

### Run Tests with Coverage
```bash
pnpm test:coverage
```

### Run Integration Tests Only
```bash
cd apps/api && pnpm test:integration
```

## Coverage Thresholds

Current thresholds defined in `jest.config.ts`:

```typescript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  },
  './src/services/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90
  }
}
```

## Current Status

### API Tests Summary (as of Phase 9)
- **Total Test Suites**: 6
- **Total Tests**: 120
- **Passing Tests**: 103
- **Failed Tests**: 17 (integration tests need adjustment)
- **Overall Coverage**: ~17% (baseline established)

### Service Coverage Details
| Service | Lines | Branches | Functions | Statements |
|---------|-------|----------|-----------|------------|
| authService | 100% | 88.88% | 100% | 100% |
| userService | 98.76% | 92.85% | 100% | 100% |
| leadService | 83.87% | 66.66% | 100% | 86.44% |
| taskTemplateService | 86.66% | 72.5% | 100% | 87.71% |

### Next Steps for 80%+ Coverage

1. **Complete Service Unit Tests** (Priority: High)
   - accountService
   - contactService
   - facilityService
   - areaService
   - areaTypeService
   - leadSourceService
   - facilityTaskService

2. **Fix Integration Tests** (Priority: High)
   - Resolve Prisma client mocking issues
   - Complete auth route tests
   - Complete CRUD route tests
   - Add middleware tests

3. **Add Frontend Tests** (Priority: Medium)
   - Component unit tests
   - Hook tests
   - Integration tests for key flows

4. **Add E2E Tests** (Priority: Low)
   - User authentication flow
   - Lead management flow
   - Facility management flow

## Testing Best Practices

### 1. Test Structure (AAA Pattern)
```typescript
it('should do something', async () => {
  // Arrange - Set up test data and mocks
  const mockData = createTestUser();
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockData);

  // Act - Execute the function being tested
  const result = await userService.getUserById('user-123');

  // Assert - Verify the results
  expect(result).toEqual(mockData);
  expect(prisma.user.findUnique).toHaveBeenCalledWith({
    where: { id: 'user-123' }
  });
});
```

### 2. Descriptive Test Names
- ✅ `it('should return null for non-existent user')`
- ❌ `it('test user not found')`

### 3. One Assertion Per Test (when possible)
Focus each test on a single behavior or outcome.

### 4. Mock External Dependencies
Always mock:
- Database calls (Prisma)
- External APIs
- File system operations
- Environment-specific code

### 5. Use Test Helpers
Leverage factory functions and utilities to reduce boilerplate.

### 6. Clean Up After Tests
```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

## CI/CD Integration

Tests should run automatically on:
- Pre-commit hooks
- Pull request creation
- Main branch pushes
- Scheduled nightly builds

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

**Issue**: Tests timing out
```bash
# Increase timeout in jest.config.ts
testTimeout: 10000
```

**Issue**: Prisma client not found in tests
```typescript
// Mock at the module level
jest.mock('../../lib/prisma', () => ({
  prisma: { /* mocked methods */ }
}));
```

**Issue**: TypeScript errors in test files
```bash
# Ensure @types packages are installed
pnpm add -D @types/jest @types/supertest
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest GitHub](https://github.com/ladjs/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

## Contributing

When adding new features:
1. Write tests BEFORE implementing the feature (TDD)
2. Ensure all tests pass before committing
3. Maintain or improve coverage percentages
4. Update this documentation for new testing patterns
