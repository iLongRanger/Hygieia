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
