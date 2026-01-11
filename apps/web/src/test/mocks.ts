import type { User } from '../types/user';
import type { Lead, Account, Contact, Facility, LeadSource } from '../types/crm';

// User Mocks
export const mockUser = (overrides?: Partial<User>): User => ({
  id: 'user-1',
  email: 'test@example.com',
  fullName: 'Test User',
  role: 'admin',
  status: 'active',
  phone: null,
  preferences: {},
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
  archivedAt: null,
  ...overrides,
});

export const mockOwner = (overrides?: Partial<User>): User =>
  mockUser({ id: 'owner-1', email: 'owner@example.com', fullName: 'Owner User', role: 'owner', ...overrides });

export const mockAdmin = (overrides?: Partial<User>): User =>
  mockUser({ id: 'admin-1', email: 'admin@example.com', fullName: 'Admin User', role: 'admin', ...overrides });

// Lead Mocks
export const mockLead = (overrides?: Partial<Lead>): Lead => ({
  id: 'lead-1',
  contactName: 'John Doe',
  companyName: 'Acme Corp',
  primaryEmail: 'john@acme.com',
  primaryPhone: '(555) 123-4567',
  leadSourceId: 'source-1',
  leadSource: mockLeadSource(),
  status: 'lead',
  estimatedValue: '10000',
  probability: null,
  expectedCloseDate: null,
  assignedToUserId: null,
  assignedToUser: null,
  notes: null,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
  archivedAt: null,
  ...overrides,
});

export const mockLeadSource = (overrides?: Partial<LeadSource>): LeadSource => ({
  id: 'source-1',
  name: 'Website',
  description: 'Website inquiry',
  color: '#3b82f6',
  isActive: true,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
  ...overrides,
});

// Account Mocks
export const mockAccount = (overrides?: Partial<Account>): Account => ({
  id: 'account-1',
  name: 'Acme Corporation',
  type: 'commercial',
  industry: 'retail',
  website: 'https://acme.com',
  billingEmail: 'billing@acme.com',
  billingPhone: '(555) 123-4567',
  billingAddress: {
    street: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    country: 'USA',
  },
  paymentTerms: 'NET30',
  creditLimit: '50000',
  accountManagerId: 'user-1',
  accountManager: mockUser(),
  qboCustomerId: null,
  notes: null,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
  archivedAt: null,
  ...overrides,
});

// Contact Mocks
export const mockContact = (overrides?: Partial<Contact>): Contact => ({
  id: 'contact-1',
  accountId: 'account-1',
  account: mockAccount(),
  name: 'Jane Smith',
  email: 'jane@acme.com',
  phone: '(555) 123-4567',
  mobile: null,
  title: 'Facilities Manager',
  department: 'Operations',
  isPrimary: true,
  isBilling: false,
  notes: null,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
  archivedAt: null,
  ...overrides,
});

// Facility Mocks
export const mockFacility = (overrides?: Partial<Facility>): Facility => ({
  id: 'facility-1',
  accountId: 'account-1',
  account: mockAccount(),
  name: 'Main Office',
  address: {
    street: '123 Business Blvd',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    country: 'USA',
  },
  buildingType: 'office',
  squareFootage: 50000,
  numberOfFloors: 5,
  operatingHours: {
    monday: '8:00 AM - 6:00 PM',
    tuesday: '8:00 AM - 6:00 PM',
    wednesday: '8:00 AM - 6:00 PM',
    thursday: '8:00 AM - 6:00 PM',
    friday: '8:00 AM - 6:00 PM',
    saturday: 'Closed',
    sunday: 'Closed',
  },
  accessInstructions: null,
  specialRequirements: [],
  status: 'active',
  notes: null,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
  archivedAt: null,
  ...overrides,
});

// Paginated Response Mock
export const mockPaginatedResponse = <T,>(data: T[], page = 1, limit = 10) => ({
  data,
  pagination: {
    page,
    limit,
    total: data.length,
    totalPages: Math.ceil(data.length / limit),
  },
});

// Auth Response Mock
export const mockAuthResponse = (user: User = mockUser()) => ({
  user,
  tokens: {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 900,
    tokenType: 'Bearer',
  },
});
