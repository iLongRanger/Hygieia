import api from './api';
import type {
  PricingRule,
  CreatePricingRuleInput,
  UpdatePricingRuleInput,
  PricingOverride,
  CreatePricingOverrideInput,
  UpdatePricingOverrideInput,
  PaginatedResponse,
} from '../types/crm';

// Pricing Rules API

export async function listPricingRules(params?: {
  page?: number;
  limit?: number;
  pricingType?: string;
  cleaningType?: string;
  areaTypeId?: string;
  isActive?: boolean;
  search?: string;
  includeArchived?: boolean;
}): Promise<PaginatedResponse<PricingRule>> {
  const response = await api.get('/pricing-rules', { params });
  return response.data;
}

export async function getPricingRule(id: string): Promise<PricingRule> {
  const response = await api.get(`/pricing-rules/${id}`);
  return response.data.data;
}

export async function createPricingRule(data: CreatePricingRuleInput): Promise<PricingRule> {
  const response = await api.post('/pricing-rules', data);
  return response.data.data;
}

export async function updatePricingRule(
  id: string,
  data: UpdatePricingRuleInput
): Promise<PricingRule> {
  const response = await api.patch(`/pricing-rules/${id}`, data);
  return response.data.data;
}

export async function archivePricingRule(id: string): Promise<PricingRule> {
  const response = await api.post(`/pricing-rules/${id}/archive`);
  return response.data.data;
}

export async function restorePricingRule(id: string): Promise<PricingRule> {
  const response = await api.post(`/pricing-rules/${id}/restore`);
  return response.data.data;
}

export async function deletePricingRule(id: string): Promise<void> {
  await api.delete(`/pricing-rules/${id}`);
}

// Pricing Overrides API

export async function listPricingOverrides(params?: {
  page?: number;
  limit?: number;
  facilityId?: string;
  pricingRuleId?: string;
  approvedByUserId?: string;
  isActive?: boolean;
  search?: string;
}): Promise<PaginatedResponse<PricingOverride>> {
  const response = await api.get('/pricing-overrides', { params });
  return response.data;
}

export async function getPricingOverride(id: string): Promise<PricingOverride> {
  const response = await api.get(`/pricing-overrides/${id}`);
  return response.data.data;
}

export async function createPricingOverride(data: CreatePricingOverrideInput): Promise<PricingOverride> {
  const response = await api.post('/pricing-overrides', data);
  return response.data.data;
}

export async function updatePricingOverride(
  id: string,
  data: UpdatePricingOverrideInput
): Promise<PricingOverride> {
  const response = await api.patch(`/pricing-overrides/${id}`, data);
  return response.data.data;
}

export async function approvePricingOverride(id: string): Promise<PricingOverride> {
  const response = await api.post(`/pricing-overrides/${id}/approve`);
  return response.data.data;
}

export async function deletePricingOverride(id: string): Promise<void> {
  await api.delete(`/pricing-overrides/${id}`);
}
