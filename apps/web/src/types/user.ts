export interface Role {
  id: string;
  key: string;
  label: string;
  description: string | null;
  permissions: Record<string, boolean>;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: string;
  assignedAt: string;
  expiresAt: string | null;
  role: {
    id: string;
    key: string;
    label: string;
  };
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  lastLoginAt: string | null;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  roles: UserRole[];
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  status?: string;
  role?: string;
}

export interface UpdateUserInput {
  email?: string;
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: string;
  preferences?: Record<string, unknown>;
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
