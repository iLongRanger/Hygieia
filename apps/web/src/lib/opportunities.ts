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
