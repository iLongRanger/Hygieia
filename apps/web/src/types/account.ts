export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
}

export type AccountType = 'commercial' | 'residential';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  industry: string | null;
  website: string | null;
  billingEmail: string | null;
  billingPhone: string | null;
  billingAddress: Address | null;
  qboCustomerId: string | null;
  taxId: string | null;
  paymentTerms: string;
  creditLimit: string | null;
  accountManagerId: string | null;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  accountManager: User | null;
  createdByUser: User;
  _count?: {
    facilities: number;
    contacts: number;
  };
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  industry?: string | null;
  website?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingAddress?: Address | null;
  taxId?: string | null;
  paymentTerms?: string;
  creditLimit?: number | null;
  accountManagerId?: string | null;
  notes?: string | null;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  industry?: string | null;
  website?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingAddress?: Address | null;
  taxId?: string | null;
  paymentTerms?: string;
  creditLimit?: number | null;
  accountManagerId?: string | null;
  notes?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
