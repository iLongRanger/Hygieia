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

export interface UserAddress {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role?: string;
  phone: string | null;
  address?: UserAddress | null;
  avatarUrl: string | null;
  status: string;
  lastLoginAt: string | null;
  preferences: Record<string, unknown>;
  calendarColor?: string | null;
  workforceType?: 'internal_employee' | 'subcontractor' | 'office' | null;
  payType?: 'hourly' | 'percentage' | null;
  hourlyPayRate?: number | null;
  percentagePayRate?: number | null;
  employeeNumber?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  employmentType?: 'full_time' | 'part_time' | 'casual' | 'contractor' | 'temporary' | null;
  supervisorUserId?: string | null;
  supervisor?: { id: string; fullName: string; email: string } | null;
  startDate?: string | null;
  terminationDate?: string | null;
  birthDate?: string | null;
  emergencyContact?: {
    name?: string | null;
    relationship?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  availability?: Record<string, unknown> | null;
  skills?: string[] | null;
  compliance?: Record<string, unknown> | null;
  onboarding?: Record<string, unknown> | null;
  hrNotes?: Array<{
    id?: string;
    note: string;
    createdAt?: string;
    createdBy?: string | null;
  }> | null;
  createdAt: string;
  updatedAt: string;
  roles: UserRole[];
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  address?: UserAddress | null;
  status?: string;
  role?: string;
  payType?: 'hourly' | 'percentage' | null;
  hourlyPayRate?: number | null;
  percentagePayRate?: number | null;
  employeeNumber?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  employmentType?: User['employmentType'];
  supervisorUserId?: string | null;
  startDate?: string | null;
  terminationDate?: string | null;
  birthDate?: string | null;
  emergencyContact?: User['emergencyContact'];
  availability?: Record<string, unknown> | null;
  skills?: string[] | null;
  compliance?: Record<string, unknown> | null;
  onboarding?: Record<string, unknown> | null;
  hrNotes?: User['hrNotes'];
}

export interface UpdateUserInput {
  email?: string;
  fullName?: string;
  phone?: string | null;
  address?: UserAddress | null;
  avatarUrl?: string | null;
  status?: string;
  preferences?: Record<string, unknown>;
  calendarColor?: string | null;
  payType?: 'hourly' | 'percentage' | null;
  hourlyPayRate?: number | null;
  percentagePayRate?: number | null;
  employeeNumber?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  employmentType?: User['employmentType'];
  supervisorUserId?: string | null;
  startDate?: string | null;
  terminationDate?: string | null;
  birthDate?: string | null;
  emergencyContact?: User['emergencyContact'];
  availability?: Record<string, unknown> | null;
  skills?: string[] | null;
  compliance?: Record<string, unknown> | null;
  onboarding?: Record<string, unknown> | null;
  hrNotes?: User['hrNotes'];
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
