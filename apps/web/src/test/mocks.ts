import type { User } from '../types/user';
import type { Lead, Account, Contact, LeadSource } from '../types/crm';
import type { Facility } from '../types/facility';
import type {
  Job,
  JobDetail,
  JobTask,
  JobNote,
  JobActivity,
} from '../types/job';

// User Mocks
export const mockUser = (overrides?: Partial<User>): User => ({
  id: 'user-1',
  email: 'test@example.com',
  fullName: 'Test User',
  role: 'admin',
  status: 'active',
  phone: null,
  avatarUrl: null,
  lastLoginAt: null,
  roles: [],
  preferences: {},
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
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
  leadSource: mockLeadSource(),
  status: 'lead',
  estimatedValue: '10000',
  probability: null,
  expectedCloseDate: null,
  secondaryEmail: null,
  secondaryPhone: null,
  address: null,
  assignedToUser: null,
  createdByUser: {
    id: 'user-1',
    fullName: 'Test User',
  },
  convertedToAccountId: null,
  convertedAt: null,
  convertedToAccount: null,
  convertedByUser: null,
  notes: null,
  lostReason: null,
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
  _count: {
    leads: 0,
  },
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
    postalCode: '62701',
    country: 'USA',
  },
  paymentTerms: 'NET30',
  creditLimit: '50000',
  accountManager: mockUser(),
  qboCustomerId: null,
  taxId: null,
  notes: null,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
  archivedAt: null,
  createdByUser: {
    id: 'user-1',
    fullName: 'Test User',
  },
  _count: {
    contacts: 0,
    facilities: 0,
  },
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
  createdByUser: {
    id: 'user-1',
    fullName: 'Test User',
  },
  ...overrides,
});

// Facility Mocks
export const mockFacility = (overrides?: Partial<Facility>): Facility => ({
  id: 'facility-1',
  account: mockAccount(),
  name: 'Main Office',
  address: {
    street: '123 Business Blvd',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62701',
    country: 'USA',
  },
  buildingType: 'office',
  squareFeet: '50000',
  accessInstructions: null,
  parkingInfo: null,
  specialRequirements: null,
  status: 'active',
  notes: null,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
  archivedAt: null,
  facilityManager: null,
  createdByUser: {
    id: 'user-1',
    fullName: 'Test User',
  },
  _count: {
    areas: 0,
    facilityTasks: 0,
  },
  ...overrides,
});

// Job Mocks
export const mockJob = (overrides?: Partial<Job>): Job => ({
  id: 'job-1',
  jobNumber: 'JOB-202602-0001',
  status: 'scheduled',
  scheduledDate: '2026-02-15',
  scheduledStartTime: null,
  scheduledEndTime: null,
  actualStartTime: null,
  actualEndTime: null,
  estimatedHours: '4.0',
  actualHours: null,
  notes: null,
  completionNotes: null,
  createdAt: new Date('2026-02-01').toISOString(),
  updatedAt: new Date('2026-02-01').toISOString(),
  contract: {
    id: 'contract-1',
    contractNumber: 'CONT-202602-0001',
    title: 'Monthly Cleaning',
  },
  facility: {
    id: 'facility-1',
    name: 'Main Office',
  },
  account: {
    id: 'account-1',
    name: 'Acme Corporation',
  },
  assignedTeam: null,
  assignedToUser: null,
  createdByUser: {
    id: 'user-1',
    fullName: 'Test User',
  },
  ...overrides,
});

export const mockJobDetail = (overrides?: Partial<JobDetail>): JobDetail => ({
  ...mockJob(),
  tasks: [],
  notes_: [],
  activities: [],
  ...overrides,
});

export const mockJobTask = (overrides?: Partial<JobTask>): JobTask => ({
  id: 'task-1',
  taskName: 'Vacuum floors',
  description: null,
  status: 'pending',
  estimatedMinutes: 30,
  actualMinutes: null,
  notes: null,
  completedAt: null,
  completedByUser: null,
  facilityTask: null,
  ...overrides,
});

export const mockJobNote = (overrides?: Partial<JobNote>): JobNote => ({
  id: 'note-1',
  noteType: 'general',
  content: 'Everything went well',
  photoUrl: null,
  createdAt: new Date('2026-02-01').toISOString(),
  createdByUser: {
    id: 'user-1',
    fullName: 'Test User',
  },
  ...overrides,
});

export const mockJobActivity = (overrides?: Partial<JobActivity>): JobActivity => ({
  id: 'activity-1',
  action: 'job_created',
  metadata: {},
  createdAt: new Date('2026-02-01').toISOString(),
  performedByUser: {
    id: 'user-1',
    fullName: 'Test User',
  },
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
