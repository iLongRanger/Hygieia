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
  hourlyRate: string;

  // Labor Cost Settings
  laborCostPerHour: string;
  laborBurdenPercentage: string;
  sqftPerLaborHour: string;

  // Overhead Cost Settings
  insurancePercentage: string;
  adminOverheadPercentage: string;
  travelCostPerVisit: string;
  equipmentPercentage: string;

  // Supply Cost Settings
  supplyCostPercentage: string;
  supplyCostPerSqFt: string | null;

  // Profit Settings
  targetProfitMargin: string;

  floorTypeMultipliers: Record<string, number>;
  frequencyMultipliers: Record<string, number>;
  conditionMultipliers: Record<string, number>;
  trafficMultipliers: Record<string, number>;
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
  hourlyRate?: number;
  laborCostPerHour?: number;
  laborBurdenPercentage?: number;
  sqftPerLaborHour?: number;
  insurancePercentage?: number;
  adminOverheadPercentage?: number;
  travelCostPerVisit?: number;
  equipmentPercentage?: number;
  supplyCostPercentage?: number;
  supplyCostPerSqFt?: number | null;
  targetProfitMargin?: number;
  floorTypeMultipliers?: Record<string, number>;
  frequencyMultipliers?: Record<string, number>;
  conditionMultipliers?: Record<string, number>;
  trafficMultipliers?: Record<string, number>;
  buildingTypeMultipliers?: Record<string, number>;
  taskComplexityAddOns?: Record<string, number>;
  isActive?: boolean;
}

export interface UpdatePricingSettingsInput {
  name?: string;
  baseRatePerSqFt?: number;
  minimumMonthlyCharge?: number;
  hourlyRate?: number;
  laborCostPerHour?: number;
  laborBurdenPercentage?: number;
  sqftPerLaborHour?: number;
  insurancePercentage?: number;
  adminOverheadPercentage?: number;
  travelCostPerVisit?: number;
  equipmentPercentage?: number;
  supplyCostPercentage?: number;
  supplyCostPerSqFt?: number | null;
  targetProfitMargin?: number;
  floorTypeMultipliers?: Record<string, number>;
  frequencyMultipliers?: Record<string, number>;
  conditionMultipliers?: Record<string, number>;
  trafficMultipliers?: Record<string, number>;
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

// Detailed cost breakdown for an area
export interface AreaCostBreakdown {
  areaId: string;
  areaName: string;
  areaTypeName: string;
  squareFeet: number;
  floorType: string;
  conditionLevel: string;
  quantity: number;

  // Labor breakdown
  laborHours: number;
  laborCostBase: number;
  laborBurden: number;
  totalLaborCost: number;

  // Overhead breakdown
  insuranceCost: number;
  adminOverheadCost: number;
  equipmentCost: number;

  // Supply cost
  supplyCost: number;

  // Cost totals
  totalCostPerVisit: number;

  // Multipliers applied
  floorMultiplier: number;
  conditionMultiplier: number;

  // Final pricing
  pricePerVisit: number;
  monthlyVisits: number;
  monthlyPrice: number;
}

// Legacy interface for backwards compatibility
export interface AreaPricingBreakdown extends AreaCostBreakdown {
  basePrice?: number;
  frequencyMultiplier?: number;
  taskComplexityAddOn?: number;
  priceBeforeFrequency?: number;
  areaTotal?: number;
}

export interface PricingSettingsSnapshot {
  pricingSettingsId: string;
  pricingSettingsName: string;
  baseRatePerSqFt: number;
  minimumMonthlyCharge: number;
  hourlyRate?: number;
  laborCostPerHour?: number;
  laborBurdenPercentage?: number;
  sqftPerLaborHour?: number;
  insurancePercentage?: number;
  adminOverheadPercentage?: number;
  travelCostPerVisit?: number;
  equipmentPercentage?: number;
  supplyCostPercentage?: number;
  targetProfitMargin?: number;
  floorTypeMultipliers: Record<string, number>;
  frequencyMultipliers: Record<string, number>;
  conditionMultipliers: Record<string, number>;
  trafficMultipliers?: Record<string, number>;
  buildingTypeMultipliers: Record<string, number>;
  taskComplexityAddOns: Record<string, number>;
  capturedAt: string;
  workerCount?: number;
}

// Aggregate cost breakdown per visit
export interface CostBreakdown {
  totalLaborCost: number;
  totalLaborHours: number;
  totalInsuranceCost: number;
  totalAdminOverheadCost: number;
  totalEquipmentCost: number;
  totalTravelCost: number;
  totalSupplyCost: number;
  totalCostPerVisit: number;
}

export interface FacilityPricingResult {
  facilityId: string;
  facilityName: string;
  buildingType: string;
  serviceFrequency: string;
  totalSquareFeet: number;

  // Per-area breakdowns
  areas: AreaCostBreakdown[];

  // Aggregate cost breakdown (per visit)
  costBreakdown: CostBreakdown;

  // Monthly totals
  monthlyVisits: number;
  monthlyCostBeforeProfit: number;
  profitAmount: number;
  profitMarginApplied: number;

  // Building adjustment
  buildingMultiplier: number;
  buildingAdjustment: number;

  // Task complexity
  taskComplexityAddOn: number;
  taskComplexityAmount: number;

  // Final monthly price
  subtotal: number;
  monthlyTotal: number;
  minimumApplied: boolean;

  // Pricing source
  pricingSettingsId: string;
  pricingSettingsName: string;
}

// Extended pricing breakdown that includes strategy info
export interface PricingBreakdown extends FacilityPricingResult {
  strategyKey: string;
  strategyVersion: string;
  settingsSnapshot: PricingSettingsSnapshot;
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
  frequency: string = '5x_week',
  strategyKey?: string,
  workerCount?: number
): Promise<FacilityProposalTemplate> {
  const response = await api.get(`/facilities/${facilityId}/proposal-template`, {
    params: { frequency, strategyKey, workerCount },
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

// ============================================================
// Pricing Strategy API
// ============================================================

export interface PricingStrategyMetadata {
  key: string;
  name: string;
  description: string;
  version: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export async function listPricingStrategies(): Promise<PricingStrategyMetadata[]> {
  const response = await api.get('/proposals/pricing-strategies');
  return response.data.data;
}

export async function lockProposalPricing(proposalId: string): Promise<any> {
  const response = await api.post(`/proposals/${proposalId}/pricing/lock`);
  return response.data.data;
}

export async function unlockProposalPricing(proposalId: string): Promise<any> {
  const response = await api.post(`/proposals/${proposalId}/pricing/unlock`);
  return response.data.data;
}

export async function changeProposalPricingStrategy(
  proposalId: string,
  strategyKey: string
): Promise<any> {
  const response = await api.post(`/proposals/${proposalId}/pricing/strategy`, {
    strategyKey,
  });
  return response.data.data;
}

export async function recalculateProposalPricing(
  proposalId: string,
  serviceFrequency: string,
  lockAfterRecalculation: boolean = false,
  workerCount?: number
): Promise<any> {
  const response = await api.post(`/proposals/${proposalId}/pricing/recalculate`, {
    serviceFrequency,
    lockAfterRecalculation,
    workerCount,
  });
  return response.data.data;
}

export async function getProposalPricingPreview(
  proposalId: string,
  serviceFrequency: string,
  strategyKey?: string,
  workerCount?: number
): Promise<PricingBreakdown> {
  const response = await api.get(`/proposals/${proposalId}/pricing/preview`, {
    params: { serviceFrequency, strategyKey, workerCount },
  });
  return response.data.data;
}
