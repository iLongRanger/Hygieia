export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ResidentialAccountProfile {
  homeType?: 'apartment' | 'condo' | 'townhouse' | 'single_family' | null;
  squareFeet?: number | null;
  bedrooms?: number | null;
  fullBathrooms?: number | null;
  halfBathrooms?: number | null;
  levels?: number | null;
  occupiedStatus?: 'occupied' | 'vacant' | 'move_in' | 'move_out' | null;
  condition?: 'light' | 'standard' | 'heavy' | null;
  hasPets?: boolean | null;
  lastProfessionalCleaning?: string | null;
  parkingAccess?: string | null;
  entryNotes?: string | null;
  specialInstructions?: string | null;
  isFirstVisit?: boolean | null;
}

export interface ResidentialPropertySummary {
  id: string;
  accountId: string;
  name: string;
  serviceAddress: Address | null;
  homeProfile: ResidentialAccountProfile | null;
  defaultTasks?: string[];
  accessNotes?: string | null;
  parkingAccess?: string | null;
  entryNotes?: string | null;
  pets?: boolean | null;
  isPrimary: boolean;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface LeadSource {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    leads: number;
  };
}

export interface Lead {
  id: string;
  type: 'commercial' | 'residential' | 'unknown';
  leadSourceId?: string | null;
  assignedToUserId?: string | null;
  status: string;
  companyName: string | null;
  contactName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  secondaryEmail: string | null;
  secondaryPhone: string | null;
  address: Address | null;
  estimatedValue: string | null;
  probability: number | null;
  expectedCloseDate: string | null;
  notes: string | null;
  lostReason: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  leadSource: {
    id: string;
    name: string;
    color: string;
  } | null;
  assignedToUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
  };
  // Lead conversion tracking
  convertedToAccountId: string | null;
  convertedAt: string | null;
  convertedToAccount: {
    id: string;
    name: string;
  } | null;
  convertedByUser: {
    id: string;
    fullName: string;
  } | null;
}

export interface Opportunity {
  id: string;
  title: string;
  status: string;
  source: string | null;
  estimatedValue: string | null;
  probability: number | null;
  expectedCloseDate: string | null;
  lostReason: string | null;
  wonAt: string | null;
  lostAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  lead: {
    id: string;
    companyName: string | null;
    contactName: string;
    status: string;
  } | null;
  account: {
    id: string;
    name: string;
    type: string;
  } | null;
  facility: {
    id: string;
    name: string;
  } | null;
  primaryContact: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  ownerUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  _count: {
    appointments: number;
    proposals: number;
    contracts: number;
  };
}

export type AppointmentType = 'walk_through' | 'inspection' | 'visit';
export type AppointmentStatus =
  | 'scheduled'
  | 'completed'
  | 'canceled'
  | 'rescheduled'
  | 'no_show';

export interface Appointment {
  id: string;
  type: AppointmentType;
  calendarColorKey?: 'job' | AppointmentType;
  calendarColor?: string | null;
  status: AppointmentStatus;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  location: string | null;
  notes: string | null;
  completionNotes: string | null;
  actualDuration: number | null;
  completedAt: string | null;
  reminderSentAt: string | null;
  rescheduledFromId: string | null;
  lead: {
    id: string;
    contactName: string;
    companyName: string | null;
    status: string;
  } | null;
  account: {
    id: string;
    name: string;
    type: string;
  } | null;
  facility: {
    id: string;
    name: string;
  } | null;
  assignedToUser: {
    id: string;
    fullName: string;
    email: string;
  };
  assignedTeam: {
    id: string;
    name: string;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
  };
  inspectionId: string | null;
  inspection: {
    id: string;
    inspectionNumber: string;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  emailSent: boolean;
  createdAt: string;
}

export interface CreateLeadInput {
  type: 'commercial' | 'residential' | 'unknown';
  leadSourceId?: string | null;
  companyName?: string | null;
  contactName: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  secondaryEmail?: string | null;
  secondaryPhone?: string | null;
  address?: Address | null;
  estimatedValue?: number | null;
  probability?: number | null;
  expectedCloseDate?: string | null;
  notes?: string | null;
}

export interface UpdateLeadInput {
  type?: 'commercial' | 'residential' | 'unknown';
  leadSourceId?: string | null;
  status?: string;
  companyName?: string | null;
  contactName?: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  secondaryEmail?: string | null;
  secondaryPhone?: string | null;
  address?: Address | null;
  estimatedValue?: number | null;
  probability?: number | null;
  expectedCloseDate?: string | null;
  notes?: string | null;
  lostReason?: string | null;
  assignedToUserId?: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  industry: string | null;
  website: string | null;
  billingEmail: string | null;
  billingPhone: string | null;
  billingAddress: Address | null;
  serviceAddress?: Address | null;
  qboCustomerId: string | null;
  taxId: string | null;
  paymentTerms: string;
  creditLimit: string | null;
  residentialProfile?: ResidentialAccountProfile | null;
  residentialProperties?: ResidentialPropertySummary[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  accountManagerId?: string | null;
  accountManager: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
  };
  _count: {
    contacts: number;
    facilities: number;
  };
}

export type AccountActivityEntryType = 'note' | 'request' | 'complaint';

export interface AccountActivity {
  id: string;
  entryType: AccountActivityEntryType;
  note: string;
  createdAt: string;
  performedByUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface CreateAccountActivityInput {
  entryType?: AccountActivityEntryType;
  note: string;
}

export interface CreateAccountInput {
  name: string;
  type: string;
  industry?: string | null;
  website?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingAddress?: Address | null;
  serviceAddress?: Address | null;
  qboCustomerId?: string | null;
  taxId?: string | null;
  paymentTerms?: string;
  creditLimit?: number | null;
  accountManagerId?: string | null;
  residentialProfile?: ResidentialAccountProfile | null;
  notes?: string | null;
}

export interface UpdateAccountInput {
  name?: string;
  type?: string;
  industry?: string | null;
  website?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingAddress?: Address | null;
  serviceAddress?: Address | null;
  qboCustomerId?: string | null;
  taxId?: string | null;
  paymentTerms?: string;
  creditLimit?: number | null;
  accountManagerId?: string | null;
  residentialProfile?: ResidentialAccountProfile | null;
  notes?: string | null;
}

export interface Contact {
  id: string;
  accountId?: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  title: string | null;
  department: string | null;
  isPrimary: boolean;
  isBilling: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  account: {
    id: string;
    name: string;
    type: string;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
  };
}

export interface CreateContactInput {
  accountId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  title?: string | null;
  department?: string | null;
  isPrimary?: boolean;
  isBilling?: boolean;
  notes?: string | null;
}

export interface UpdateContactInput {
  accountId?: string | null;
  name?: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  title?: string | null;
  department?: string | null;
  isPrimary?: boolean;
  isBilling?: boolean;
  notes?: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
