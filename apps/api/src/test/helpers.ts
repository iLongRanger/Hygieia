import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

export type MockPrismaClient = DeepMockProxy<PrismaClient>;

export const createMockPrismaClient = (): MockPrismaClient => {
  return mockDeep<PrismaClient>();
};

export const resetMockPrismaClient = (prisma: MockPrismaClient): void => {
  mockReset(prisma);
};

export const createTestUser = (overrides?: Partial<any>) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  fullName: 'Test User',
  passwordHash: '$2a$10$test.hash.value',
  status: 'active',
  phoneNumber: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastLoginAt: null,
  ...overrides,
});

export const createTestRole = (overrides?: Partial<any>) => ({
  id: 'test-role-id',
  key: 'owner',
  label: 'Owner',
  description: 'Owner role',
  isSystemRole: true,
  permissions: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createTestLead = (overrides?: Partial<any>) => ({
  id: 'test-lead-id',
  status: 'new',
  companyName: 'Test Company',
  contactName: 'John Doe',
  primaryEmail: 'john@test.com',
  primaryPhone: '555-0100',
  secondaryEmail: null,
  secondaryPhone: null,
  address: null,
  estimatedValue: 5000,
  probability: 50,
  expectedCloseDate: new Date('2024-12-31'),
  notes: 'Test lead',
  lostReason: null,
  leadSourceId: null,
  assignedToUserId: null,
  createdByUserId: 'test-user-id',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  archivedAt: null,
  ...overrides,
});

export const createTestAccount = (overrides?: Partial<any>) => ({
  id: 'test-account-id',
  name: 'Test Account',
  accountType: 'commercial',
  status: 'active',
  primaryEmail: 'account@test.com',
  primaryPhone: '555-0200',
  secondaryEmail: null,
  secondaryPhone: null,
  billingAddress: null,
  shippingAddress: null,
  website: null,
  notes: null,
  createdByUserId: 'test-user-id',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  archivedAt: null,
  ...overrides,
});

export const createTestContact = (overrides?: Partial<any>) => ({
  id: 'test-contact-id',
  accountId: 'test-account-id',
  firstName: 'Jane',
  lastName: 'Smith',
  title: 'Manager',
  email: 'jane@test.com',
  phone: '555-0300',
  mobilePhone: null,
  isPrimary: true,
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  archivedAt: null,
  ...overrides,
});

export const createTestFacility = (overrides?: Partial<any>) => ({
  id: 'test-facility-id',
  accountId: 'test-account-id',
  name: 'Test Facility',
  address: {
    street: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zip: '12345',
    country: 'USA'
  },
  contactName: 'Facility Manager',
  contactPhone: '555-0400',
  contactEmail: 'facility@test.com',
  accessInstructions: null,
  squareFootage: 10000,
  floors: 2,
  cleaningFrequency: 'daily',
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  archivedAt: null,
  ...overrides,
});

export const createTestTaskTemplate = (overrides?: Partial<any>) => ({
  id: 'test-template-id',
  name: 'Test Task',
  description: 'Test task description',
  estimatedDuration: 30,
  requiredSkills: [],
  instructions: null,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createTestPricingRule = (overrides?: Partial<any>) => ({
  id: 'test-pricing-rule-id',
  name: 'Standard Hourly Rate',
  description: 'Default hourly rate for cleaning services',
  pricingType: 'hourly',
  baseRate: 25.00,
  minimumCharge: 50.00,
  squareFootRate: null,
  difficultyMultiplier: 1.0,
  conditionMultipliers: {
    excellent: 0.8,
    good: 1.0,
    fair: 1.3,
    poor: 1.6,
  },
  cleaningType: 'standard',
  areaTypeId: null,
  isActive: true,
  createdByUserId: 'test-user-id',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  archivedAt: null,
  ...overrides,
});

export const createTestPricingOverride = (overrides?: Partial<any>) => ({
  id: 'test-pricing-override-id',
  facilityId: 'test-facility-id',
  pricingRuleId: 'test-pricing-rule-id',
  overrideRate: 30.00,
  overrideReason: 'Special arrangement for long-term client',
  effectiveDate: new Date('2024-01-01'),
  expiryDate: null,
  approvedByUserId: null,
  createdByUserId: 'test-user-id',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const mockPaginatedResult = <T>(data: T[], page = 1, limit = 20) => ({
  data,
  pagination: {
    page,
    limit,
    total: data.length,
    totalPages: Math.ceil(data.length / limit),
  },
});
