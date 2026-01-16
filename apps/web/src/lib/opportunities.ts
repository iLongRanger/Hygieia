import api from './api';
import type {
  Opportunity,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  PaginatedResponse,
} from '../types/crm';

export async function listOpportunities(params?: {
  page?: number;
  limit?: number;
  status?: string;
  leadId?: string;
  accountId?: string;
  assignedToUserId?: string;
  search?: string;
  includeArchived?: boolean;
}): Promise<PaginatedResponse<Opportunity>> {
  const response = await api.get('/opportunities', { params });
  return response.data;
}

export async function getOpportunity(id: string): Promise<Opportunity> {
  const response = await api.get(`/opportunities/${id}`);
  return response.data.data;
}

export async function createOpportunity(data: CreateOpportunityInput): Promise<Opportunity> {
  const response = await api.post('/opportunities', data);
  return response.data.data;
}

export async function updateOpportunity(
  id: string,
  data: UpdateOpportunityInput
): Promise<Opportunity> {
  const response = await api.patch(`/opportunities/${id}`, data);
  return response.data.data;
}

export async function archiveOpportunity(id: string): Promise<Opportunity> {
  const response = await api.post(`/opportunities/${id}/archive`);
  return response.data.data;
}

export async function restoreOpportunity(id: string): Promise<Opportunity> {
  const response = await api.post(`/opportunities/${id}/restore`);
  return response.data.data;
}

export async function deleteOpportunity(id: string): Promise<void> {
  await api.delete(`/opportunities/${id}`);
}
