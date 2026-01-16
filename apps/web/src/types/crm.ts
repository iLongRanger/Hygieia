export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
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
  _count: {
    opportunities: number;
  };
}

export interface CreateLeadInput {
  leadSourceId?: string | null;
  status?: string;
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
  assignedToUserId?: string | null;
}

export interface UpdateLeadInput {
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
  qboCustomerId: string | null;
  taxId: string | null;
  paymentTerms: string;
  creditLimit: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
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
    opportunities: number;
  };
}

export interface CreateAccountInput {
  name: string;
  type: string;
  industry?: string | null;
  website?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingAddress?: Address | null;
  qboCustomerId?: string | null;
  taxId?: string | null;
  paymentTerms?: string;
  creditLimit?: number | null;
  accountManagerId?: string | null;
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
  qboCustomerId?: string | null;
  taxId?: string | null;
  paymentTerms?: string;
  creditLimit?: number | null;
  accountManagerId?: string | null;
  notes?: string | null;
}

export interface Contact {
  id: string;
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

export interface Opportunity {
  id: string;
  name: string;
  status: string;
  probability: number | null;
  expectedValue: string | null;
  actualValue: string | null;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  lead: {
    id: string;
    contactName: string;
    companyName: string | null;
  } | null;
  account: {
    id: string;
    name: string;
    type: string;
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
}

export interface CreateOpportunityInput {
  leadId?: string | null;
  accountId?: string | null;
  name: string;
  status?: string;
  probability?: number | null;
  expectedValue?: number | null;
  expectedCloseDate?: string | null;
  description?: string | null;
  assignedToUserId?: string | null;
}

export interface UpdateOpportunityInput {
  leadId?: string | null;
  accountId?: string | null;
  name?: string;
  status?: string;
  probability?: number | null;
  expectedValue?: number | null;
  actualValue?: number | null;
  expectedCloseDate?: string | null;
  actualCloseDate?: string | null;
  description?: string | null;
  assignedToUserId?: string | null;
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
