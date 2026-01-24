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

// ============================================================
// Pricing Settings API
// ============================================================

export interface PricingSettings {
  id: string;
  name: string;
  baseRatePerSqFt: string;
  minimumMonthlyCharge: string;
  floorTypeMultipliers: Record<string, number>;
  frequencyMultipliers: Record<string, number>;
  conditionMultipliers: Record<string, number>;
  buildingTypeMultipliers: Record<string, number>;
  taskComplexityAddOns: Record<string, number>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface CreatePricingSettingsInput {
  name: string;
  baseRatePerSqFt?: number;
  minimumMonthlyCharge?: number;
  floorTypeMultipliers?: Record<string, number>;
  frequencyMultipliers?: Record<string, number>;
  conditionMultipliers?: Record<string, number>;
  buildingTypeMultipliers?: Record<string, number>;
  taskComplexityAddOns?: Record<string, number>;
  isActive?: boolean;
}

export interface UpdatePricingSettingsInput {
  name?: string;
  baseRatePerSqFt?: number;
  minimumMonthlyCharge?: number;
  floorTypeMultipliers?: Record<string, number>;
  frequencyMultipliers?: Record<string, number>;
  conditionMultipliers?: Record<string, number>;
  buildingTypeMultipliers?: Record<string, number>;
  taskComplexityAddOns?: Record<string, number>;
  isActive?: boolean;
}

export async function listPricingSettings(params?: {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
  includeArchived?: boolean;
}): Promise<PaginatedResponse<PricingSettings>> {
  const response = await api.get('/pricing-settings', { params });
  return response.data;
}

export async function getActivePricingSettings(): Promise<PricingSettings> {
  const response = await api.get('/pricing-settings/active');
  return response.data.data;
}

export async function getPricingSettings(id: string): Promise<PricingSettings> {
  const response = await api.get(`/pricing-settings/${id}`);
  return response.data.data;
}

export async function createPricingSettings(data: CreatePricingSettingsInput): Promise<PricingSettings> {
  const response = await api.post('/pricing-settings', data);
  return response.data.data;
}

export async function updatePricingSettings(
  id: string,
  data: UpdatePricingSettingsInput
): Promise<PricingSettings> {
  const response = await api.patch(`/pricing-settings/${id}`, data);
  return response.data.data;
}

export async function setActivePricingSettings(id: string): Promise<PricingSettings> {
  const response = await api.post(`/pricing-settings/${id}/set-active`);
  return response.data.data;
}

export async function archivePricingSettings(id: string): Promise<PricingSettings> {
  const response = await api.post(`/pricing-settings/${id}/archive`);
  return response.data.data;
}

export async function restorePricingSettings(id: string): Promise<PricingSettings> {
  const response = await api.post(`/pricing-settings/${id}/restore`);
  return response.data.data;
}

// ============================================================
// Facility Pricing API
// ============================================================

export interface AreaPricingBreakdown {
  areaId: string;
  areaName: string;
  areaTypeName: string;
  squareFeet: number;
  floorType: string;
  conditionLevel: string;
  quantity: number;
  basePrice: number;
  floorMultiplier: number;
  conditionMultiplier: number;
  frequencyMultiplier: number;
  taskComplexityAddOn: number;
  priceBeforeFrequency: number;
  areaTotal: number;
}

export interface FacilityPricingResult {
  facilityId: string;
  facilityName: string;
  buildingType: string;
  buildingMultiplier: number;
  serviceFrequency: string;
  totalSquareFeet: number;
  areas: AreaPricingBreakdown[];
  subtotal: number;
  buildingAdjustment: number;
  monthlyTotal: number;
  minimumApplied: boolean;
  pricingSettingsId: string;
  pricingSettingsName: string;
}

export interface FacilityPricingReadiness {
  isReady: boolean;
  reason?: string;
  areaCount: number;
  totalSquareFeet: number;
}

export async function getFacilityPricingReadiness(facilityId: string): Promise<FacilityPricingReadiness> {
  const response = await api.get(`/facilities/${facilityId}/pricing-readiness`);
  return response.data.data;
}

export async function getFacilityPricing(
  facilityId: string,
  frequency: string = '5x_week',
  taskComplexity: string = 'standard'
): Promise<FacilityPricingResult> {
  const response = await api.get(`/facilities/${facilityId}/pricing`, {
    params: { frequency, taskComplexity },
  });
  return response.data.data;
}

export async function getFacilityPricingComparison(
  facilityId: string,
  frequencies?: string[]
): Promise<{ frequency: string; monthlyTotal: number }[]> {
  const response = await api.get(`/facilities/${facilityId}/pricing-comparison`, {
    params: { frequencies: frequencies?.join(',') },
  });
  return response.data.data;
}

export interface SuggestedProposalService {
  serviceName: string;
  serviceType: string;
  frequency: string;
  monthlyPrice: number;
  description: string;
  includedTasks: string[];
}

export interface FacilityProposalTemplate {
  facility: any;
  pricing: FacilityPricingResult;
  suggestedServices: SuggestedProposalService[];
  suggestedItems: any[];
}

export async function getFacilityProposalTemplate(
  facilityId: string,
  frequency: string = '5x_week'
): Promise<FacilityProposalTemplate> {
  const response = await api.get(`/facilities/${facilityId}/proposal-template`, {
    params: { frequency },
  });
  return response.data.data;
}

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
