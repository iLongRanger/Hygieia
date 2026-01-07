/**
 * Hygieia Shared Types
 *
 * These are API/UI-facing DTOs. For database entity types, use @hygieia/database.
 * Single-tenant architecture - no tenantId fields.
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: 'active' | 'disabled' | 'pending';
}

export interface UserWithRoles extends User {
  roles: Role[];
}

export interface Role {
  id: string;
  key: string;
  label: string;
  permissions: Record<string, boolean>;
}

export interface Lead {
  id: string;
  companyName: string | null;
  contactName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  status: LeadStatus;
  estimatedValue: number | null;
  probability: number | null;
  expectedCloseDate: string | null;
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus =
  | 'lead'
  | 'walk_through_booked'
  | 'walk_through_completed'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'reopened';

export interface Account {
  id: string;
  name: string;
  type: 'commercial' | 'residential';
  industry: string | null;
  website: string | null;
  billingEmail: string | null;
  billingPhone: string | null;
  paymentTerms: string;
  accountManagerId: string | null;
  createdAt: string;
  updatedAt: string;
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
}

export interface Facility {
  id: string;
  accountId: string;
  name: string;
  squareFeet: number | null;
  buildingType: string | null;
  status: 'active' | 'inactive' | 'archived';
  facilityManagerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Area {
  id: string;
  facilityId: string;
  areaTypeId: string;
  name: string | null;
  quantity: number;
  squareFeet: number | null;
  conditionLevel: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface AreaType {
  id: string;
  name: string;
  description: string | null;
  defaultSquareFeet: number | null;
  baseCleaningTimeMinutes: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
