import api from './api';
import type { Opportunity, PaginatedResponse } from '../types/crm';

export async function listOpportunities(params?: {
  page?: number;
  limit?: number;
  status?: string;
  accountId?: string;
  facilityId?: string;
  leadId?: string;
  ownerUserId?: string;
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

export async function updateOpportunity(
  id: string,
  data: {
    title?: string;
    status?: string;
    source?: string | null;
    estimatedValue?: number | null;
    probability?: number | null;
    expectedCloseDate?: string | null;
    lostReason?: string | null;
    ownerUserId?: string | null;
    accountId?: string | null;
    facilityId?: string | null;
    primaryContactId?: string | null;
  }
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
