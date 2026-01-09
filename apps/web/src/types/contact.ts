export interface Account {
  id: string;
  name: string;
  type: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface Contact {
  id: string;
  accountId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  title: string | null;
  department: string | null;
  isPrimary: boolean;
  isBilling: boolean;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  account: Account | null;
  createdByUser: User;
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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
