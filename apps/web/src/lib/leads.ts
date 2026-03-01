import api from './api';
import type {
  Lead,
  CreateLeadInput,
  UpdateLeadInput,
  LeadSource,
  PaginatedResponse,
} from '../types/crm';

export async function listLeads(params?: {
  page?: number;
  limit?: number;
  status?: string;
  leadSourceId?: string;
  assignedToUserId?: string;
  search?: string;
  includeArchived?: boolean;
}): Promise<PaginatedResponse<Lead>> {
  const response = await api.get('/leads', { params });
  return response.data;
}

export async function getLead(id: string): Promise<Lead> {
  const response = await api.get(`/leads/${id}`);
  return response.data.data;
}

export async function createLead(data: CreateLeadInput): Promise<Lead> {
  const response = await api.post('/leads', data);
  return response.data.data;
}

export async function updateLead(
  id: string,
  data: UpdateLeadInput
): Promise<Lead> {
  const response = await api.patch(`/leads/${id}`, data);
  return response.data.data;
}

export async function archiveLead(id: string): Promise<Lead> {
  const response = await api.post(`/leads/${id}/archive`);
  return response.data.data;
}

export async function restoreLead(id: string): Promise<Lead> {
  const response = await api.post(`/leads/${id}/restore`);
  return response.data.data;
}

export async function deleteLead(id: string): Promise<void> {
  await api.delete(`/leads/${id}`);
}

export async function listLeadSources(params?: {
  isActive?: boolean;
}): Promise<{ data: LeadSource[] }> {
  const response = await api.get('/lead-sources', { params });
  return response.data;
}

export async function getLeadSource(id: string): Promise<LeadSource> {
  const response = await api.get(`/lead-sources/${id}`);
  return response.data.data;
}

export async function createLeadSource(data: {
  name: string;
  description?: string | null;
  color?: string;
  isActive?: boolean;
}): Promise<LeadSource> {
  const response = await api.post('/lead-sources', data);
  return response.data.data;
}

export async function updateLeadSource(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    color?: string;
    isActive?: boolean;
  }
): Promise<LeadSource> {
  const response = await api.patch(`/lead-sources/${id}`, data);
  return response.data.data;
}

export async function deleteLeadSource(id: string): Promise<void> {
  await api.delete(`/lead-sources/${id}`);
}

// Lead Conversion

export interface ConvertLeadInput {
  createNewAccount: boolean;
  existingAccountId?: string | null;
  accountData?: {
    name: string;
    type: 'commercial' | 'residential' | 'industrial' | 'government' | 'non_profit';
    industry?: string | null;
    website?: string | null;
    billingEmail?: string | null;
    billingPhone?: string | null;
    paymentTerms?: string;
    notes?: string | null;
  };
  facilityOption: 'new' | 'existing';
  existingFacilityId?: string | null;
  facilityData?: {
    name: string;
    address: {
      street: string;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
    };
    buildingType?: string | null;
    squareFeet?: number | null;
    accessInstructions?: string | null;
    notes?: string | null;
  };
}

export interface ConvertLeadResult {
  lead: Lead;
  account: {
    id: string;
    name: string;
  };
  contact: {
    id: string;
    name: string;
    email: string | null;
  };
  facility?: {
    id: string;
    name: string;
  };
}

export interface CanConvertLeadResult {
  canConvert: boolean;
  reason?: string;
}

export async function canConvertLead(id: string): Promise<CanConvertLeadResult> {
  const response = await api.get(`/leads/${id}/can-convert`);
  return response.data.data;
}

export async function convertLead(
  id: string,
  data: ConvertLeadInput
): Promise<ConvertLeadResult> {
  const response = await api.post(`/leads/${id}/convert`, data);
  return response.data.data;
}
