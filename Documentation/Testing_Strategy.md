# Hygieia Platform - Testing Strategy & Framework Specifications

## Overview

This specification defines comprehensive testing strategies, frameworks, and requirements for the Hygieia Platform to ensure code quality, reliability, and maintainability across all development phases.

## Testing Philosophy

### Testing Pyramid

```
    E2E Tests (10%)
     - Critical user journeys
     - Cross-system integration
     - Performance validation
     
   Integration Tests (20%)
    - API endpoint testing
    - Database integration
    - External service integration
    
  Unit Tests (70%)
   - Individual functions
   - Component testing
   - Business logic validation
```

### Testing Principles

1. **Test-Driven Development (TDD):** Write failing tests first, then implement code
2. **Red-Green-Refactor:** Follow TDD cycle strictly
3. **100% Coverage Goal:** Minimum 90% for critical paths, 100% for business logic
4. **Isolated Tests:** Each test should be independent
5. **Clear Naming:** Test names should describe the scenario being tested

## Testing Framework Stack

### Backend Testing

```javascript
// apps/api/package.json - Testing dependencies
{
  "jest": "^29.0.0",
  "supertest": "^6.3.0",
  "@types/jest": "^29.0.0",
  "@types/supertest": "^2.0.12",
  "ts-jest": "^29.0.0",
  "nock": "^13.3.0",
  "factory-girl": "^5.0.4",
  "faker": "^6.6.6"
}
```

### Frontend Testing

```javascript
// apps/web/package.json - Testing dependencies
{
  "jest": "^29.0.0",
  "@testing-library/react": "^13.4.0",
  "@testing-library/jest-dom": "^5.16.5",
  "@testing-library/user-event": "^14.4.3",
  "jest-environment-jsdom": "^29.0.0",
  "msw": "^1.2.0",
  "storybook": "^7.0.0"
}
```

### E2E Testing

```javascript
// tests/e2e/package.json - E2E dependencies
{
  "playwright": "^1.35.0",
  "@playwright/test": "^1.35.0",
  "playwright": "^1.35.0",
  "allure-playwright": "^2.0.0"
}
```

## Unit Testing

### Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps', '<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx}',
    'packages/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Critical paths must have 100% coverage
    './apps/api/src/services/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@ui/(.*)$': '<rootDir>/packages/ui/src/$1'
  }
};
```

### Test Setup

```typescript
// tests/setup.ts
import { Factory } from 'factory-girl';
import { DatabaseService } from '../apps/api/src/services/database';

// Global test setup
beforeAll(async () => {
  // Setup test database
  await DatabaseService.connect();
  await DatabaseService.migrate();
  
  // Setup factories
  await setupFactories();
});

beforeEach(async () => {
  // Clean database before each test
  await DatabaseService.truncate();
});

afterAll(async () => {
  // Cleanup
  await DatabaseService.close();
});

// Mock external services
jest.mock('../apps/api/src/services/email', () => ({
  emailService: {
    send: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../apps/api/src/services/quickbooks', () => ({
  quickbooksService: {
    createCustomer: jest.fn().mockResolvedValue({ id: 'qb-customer-123' }),
    createInvoice: jest.fn().mockResolvedValue({ id: 'qb-invoice-123' })
  }
}));
```

### Example Unit Test

```typescript
// apps/api/src/services/__tests__/leads.test.ts
import { leadsService } from '../leads';
import { userFactory, leadFactory } from '../../../tests/factories';

describe('Leads Service', () => {
  describe('create', () => {
    it('should create a lead with valid data', async () => {
      // Arrange
      const user = await userFactory.create();
      const leadData = {
        company_name: 'Test Company',
        contact_name: 'John Doe',
        primary_email: 'john@test.com'
      };

      // Act
      const result = await leadsService.create(leadData, user);

      // Assert
      expect(result).toBeDefined();
      expect(result.company_name).toBe('Test Company');
      expect(result.contact_name).toBe('John Doe');
      expect(result.primary_email).toBe('john@test.com');
      expect(result.tenant_id).toBe(user.tenant_id);
      expect(result.created_by_user_id).toBe(user.id);
    });

    it('should throw validation error with invalid email', async () => {
      // Arrange
      const user = await userFactory.create();
      const leadData = {
        company_name: 'Test Company',
        contact_name: 'John Doe',
        primary_email: 'invalid-email'
      };

      // Act & Assert
      await expect(leadsService.create(leadData, user))
        .rejects
        .toThrow('Invalid email format');
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      const user1 = await userFactory.create();
      const user2 = await userFactory.create();
      const leadData = {
        company_name: 'Test Company',
        contact_name: 'John Doe',
        primary_email: 'john@test.com'
      };

      // Act
      const lead = await leadsService.create(leadData, user1);

      // Assert - user2 cannot access user1's lead
      const user2Leads = await leadsService.list({}, user2);
      expect(user2Leads.items).not.toContainEqual(
        expect.objectContaining({ id: lead.id })
      );
    });
  });
});
```

## Integration Testing

### API Integration Tests

```typescript
// apps/api/src/routes/__tests__/leads.integration.test.ts
import request from 'supertest';
import { app } from '../../app';
import { userFactory, leadFactory } from '../../../tests/factories';
import { generateToken } from '../../../tests/helpers/auth';

describe('Leads API - Integration Tests', () => {
  describe('POST /api/v1/leads', () => {
    it('should create lead successfully', async () => {
      // Arrange
      const user = await userFactory.create({ role: 'admin' });
      const token = generateToken(user);
      const leadData = {
        company_name: 'Test Company',
        contact_name: 'John Doe',
        primary_email: 'john@test.com'
      };

      // Act
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${token}`)
        .send(leadData)
        .expect(201);

      // Assert
      expect(response.body.data).toMatchObject({
        company_name: 'Test Company',
        contact_name: 'John Doe',
        primary_email: 'john@test.com',
        tenant_id: user.tenant_id
      });
      expect(response.body.meta.request_id).toBeDefined();
    });

    it('should require authentication', async () => {
      // Act & Assert
      await request(app)
        .post('/api/v1/leads')
        .send({
          company_name: 'Test Company',
          contact_name: 'John Doe'
        })
        .expect(401);
    });

    it('should enforce role-based access', async () => {
      // Arrange
      const cleaner = await userFactory.create({ role: 'cleaner' });
      const token = generateToken(cleaner);

      // Act & Assert
      await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company_name: 'Test Company',
          contact_name: 'John Doe'
        })
        .expect(403);
    });
  });
});
```

### Database Integration Tests

```typescript
// apps/api/src/models/__tests__/leads.model.test.ts
import { LeadModel } from '../leads';
import { leadFactory, userFactory } from '../../../tests/factories';

describe('Lead Model - Integration Tests', () => {
  it('should enforce tenant isolation at database level', async () => {
    // Arrange
    const user1 = await userFactory.create();
    const user2 = await userFactory.create();
    const lead = await leadFactory.create({ user_id: user1.id });

    // Act & Assert - Try to query with wrong tenant
    const result = await DatabaseService.query(
      'SELECT * FROM leads WHERE id = $1 AND tenant_id = $2',
      [lead.id, user2.tenant_id]
    );

    expect(result.rows).toHaveLength(0);
  });

  it('should enforce foreign key constraints', async () => {
    // Arrange
    const user = await userFactory.create();

    // Act & Assert - Try to create lead with invalid user
    await expect(DatabaseService.query(
      'INSERT INTO leads (tenant_id, user_id, company_name, contact_name) VALUES ($1, $2, $3, $4)',
      [user.tenant_id, 'invalid-user-id', 'Test Company', 'John Doe']
    )).rejects.toThrow('violates foreign key constraint');
  });
});
```

## Frontend Testing

### Component Testing

```typescript
// apps/web/src/components/__tests__/LeadForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadForm } from '../LeadForm';
import { ThemeProvider } from '@/contexts/ThemeContext';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('LeadForm Component', () => {
  it('should render form fields correctly', () => {
    // Arrange
    const mockOnSubmit = jest.fn();
    
    // Act
    renderWithProviders(
      <LeadForm onSubmit={mockOnSubmit} />
    );

    // Assert
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create lead/i })).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    // Arrange
    const mockOnSubmit = jest.fn();
    const user = userEvent.setup();
    
    renderWithProviders(
      <LeadForm onSubmit={mockOnSubmit} />
    );

    // Act
    await user.type(screen.getByLabelText(/company name/i), 'Test Company');
    await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@test.com');
    await user.click(screen.getByRole('button', { name: /create lead/i }));

    // Assert
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        company_name: 'Test Company',
        contact_name: 'John Doe',
        primary_email: 'john@test.com'
      });
    });
  });

  it('should show validation errors for invalid email', async () => {
    // Arrange
    const mockOnSubmit = jest.fn();
    const user = userEvent.setup();
    
    renderWithProviders(
      <LeadForm onSubmit={mockOnSubmit} />
    );

    // Act
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /create lead/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
```

### API Integration Testing (Frontend)

```typescript
// apps/web/src/lib/__tests__/api.test.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { leadsApi } from '../api/leads';
import { mockLead, mockLeadsResponse } from '../../../tests/mocks';

const server = setupServer(
  rest.post('/api/v1/leads', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        data: mockLead,
        meta: { request_id: 'req-123' }
      })
    );
  }),

  rest.get('/api/v1/leads', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [mockLead],
        meta: { total: 1 }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Leads API', () => {
  it('should create lead successfully', async () => {
    // Arrange
    const leadData = {
      company_name: 'Test Company',
      contact_name: 'John Doe',
      primary_email: 'john@test.com'
    };

    // Act
    const result = await leadsApi.create(leadData);

    // Assert
    expect(result).toEqual(mockLead);
  });

  it('should handle API errors gracefully', async () => {
    // Arrange
    server.use(
      rest.post('/api/v1/leads', (req, res, ctx) => {
        return res(
          ctx.status(422),
          ctx.json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed'
            }
          })
        );
      })
    );

    const leadData = {
      company_name: 'Test Company',
      contact_name: 'John Doe'
    };

    // Act & Assert
    await expect(leadsApi.create(leadData)).rejects.toThrow('Request validation failed');
  });
});
```

## E2E Testing

### Playwright Configuration

```typescript
// tests/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['allure-playwright'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

### E2E Test Examples

```typescript
// tests/e2e/leads.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Lead Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'admin@hygieia.com');
    await page.fill('[data-testid=password]', 'password');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create a new lead', async ({ page }) => {
    // Navigate to leads page
    await page.click('[data-testid=nav-crm]');
    await page.click('[data-testid=create-lead-button]');

    // Fill lead form
    await page.fill('[data-testid=company-name]', 'Test Company');
    await page.fill('[data-testid=contact-name]', 'John Doe');
    await page.fill('[data-testid=email]', 'john@test.com');
    await page.fill('[data-testid=phone]', '+1-555-0123');

    // Submit form
    await page.click('[data-testid=save-lead-button]');

    // Verify success
    await expect(page.locator('[data-testid=success-message]')).toBeVisible();
    await expect(page.locator('text=Test Company')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('should validate lead form inputs', async ({ page }) => {
    await page.click('[data-testid=nav-crm]');
    await page.click('[data-testid=create-lead-button]');

    // Try to submit without required fields
    await page.click('[data-testid=save-lead-button]');

    // Verify validation errors
    await expect(page.locator('[data-testid=error-contact-name]')).toBeVisible();
    await expect(page.locator('[data-testid=error-email]')).toBeVisible();

    // Fill invalid email
    await page.fill('[data-testid=email]', 'invalid-email');
    await expect(page.locator('[data-testid=error-email]')).toHaveText('Invalid email format');
  });

  test('should filter leads by status', async ({ page }) => {
    await page.click('[data-testid=nav-crm]');

    // Apply status filter
    await page.click('[data-testid=status-filter]');
    await page.click('[data-testid=status-option-won]');

    // Verify only won leads are shown
    const leads = await page.locator('[data-testid=lead-row]').all();
    for (const lead of leads) {
      const statusBadge = await lead.locator('[data-testid=lead-status]').textContent();
      expect(statusBadge).toBe('won');
    }
  });
});
```

## Test Data Management

### Factories

```typescript
// tests/factories/leads.factory.ts
import { Factory } from 'factory-girl';
import { faker } from '@faker-js/faker';
import { Lead, User } from '../../apps/api/src/types';

Factory.define<Lead>('lead', {}, {
  id: () => faker.datatype.uuid(),
  tenant_id: async () => {
    const user = await Factory.create('user');
    return user.tenant_id;
  },
  company_name: () => faker.company.name(),
  contact_name: () => faker.name.fullName(),
  primary_email: () => faker.internet.email(),
  primary_phone: () => faker.phone.number('##########'),
  status: 'lead',
  created_at: () => new Date(),
  updated_at: () => new Date(),
  created_by_user_id: async () => {
    const user = await Factory.create('user');
    return user.id;
  }
});

Factory.define<User>('user', {}, {
  id: () => faker.datatype.uuid(),
  tenant_id: () => faker.datatype.uuid(),
  supabase_user_id: () => faker.datatype.uuid(),
  email: () => faker.internet.email(),
  full_name: () => faker.name.fullName(),
  status: 'active',
  created_at: () => new Date(),
  updated_at: () => new Date()
});
```

### Test Helpers

```typescript
// tests/helpers/auth.ts
import jwt from 'jsonwebtoken';
import { User } from '../../apps/api/src/types';

export const generateToken = (user: Partial<User>): string => {
  const payload = {
    sub: user.supabase_user_id,
    email: user.email,
    user_metadata: {
      role: user.role,
      tenant_id: user.tenant_id
    }
  };

  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET!, {
    expiresIn: '1h'
  });
};

export const createTestUser = async (overrides: Partial<User> = {}) => {
  return Factory.create('user', overrides);
};

export const createAuthenticatedRequest = (user: User) => {
  return {
    headers: {
      'Authorization': `Bearer ${generateToken(user)}`,
      'X-Request-ID': faker.datatype.uuid()
    },
    user
  };
};
```

## Performance Testing

### Load Testing

```typescript
// tests/performance/leads.load.test.ts
import { check } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

const customMetrics = {
  responseTime: new Rate('response_time_rate'),
};

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 10 }, // Stay
    { duration: '2m', target: 50 }, // Ramp up
    { duration: '5m', target: 50 }, // Stay
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function() {
  const response = http.post('http://localhost:3001/api/v1/leads', JSON.stringify({
    company_name: 'Test Company',
    contact_name: 'John Doe',
    primary_email: `test-${Date.now()}@test.com`
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + __ENV.TOKEN
    }
  });

  check(response, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## Testing Commands

```json
// package.json - Test scripts
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:performance": "k6 run tests/performance/",
    "test:smoke": "jest --testNamePattern=smoke",
    "test:security": "npm run test:unit && npm run test:integration && jest --config jest.security.config.js"
  }
}
```

## CI/CD Integration

### GitHub Actions Testing

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  test-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        run: npm run test:integration

  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Build application
        run: npm run build
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Quality Gates

### Coverage Requirements

```typescript
// jest.config.js - Coverage thresholds
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  },
  './apps/api/src/controllers/': {
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
}
```

### Performance Benchmarks

| Metric | Target | Acceptance Criteria |
|---------|--------|-------------------|
| API Response Time | < 200ms | 95th percentile |
| Page Load Time | < 2s | First Contentful Paint |
| Database Query Time | < 100ms | Average |
| Build Time | < 5min | Production builds |

---

**This testing specification is mandatory. All code must meet these testing standards before merge. Any exceptions require architectural approval.**