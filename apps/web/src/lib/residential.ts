import api from './api';
import type { PaginatedResponse } from '../types/crm';
import type {
  PublicResidentialQuote,
  ResidentialPricingPlan,
  ResidentialPricingPlanSettings,
  ResidentialProperty,
  ResidentialQuote,
  ResidentialQuoteFormInput,
  ResidentialQuotePreview,
} from '../types/residential';

export interface CreateResidentialPricingPlanInput {
  name: string;
  strategyKey?: ResidentialPricingPlan['strategyKey'];
  settings: ResidentialPricingPlanSettings;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface UpdateResidentialPricingPlanInput {
  name?: string;
  strategyKey?: ResidentialPricingPlan['strategyKey'];
  settings?: ResidentialPricingPlanSettings;
  isActive?: boolean;
  isDefault?: boolean;
}

export async function listResidentialPricingPlans(params?: {
  page?: number;
  limit?: number;
  isActive?: boolean;
  isDefault?: boolean;
  includeArchived?: boolean;
  search?: string;
}): Promise<PaginatedResponse<ResidentialPricingPlan>> {
  const response = await api.get('/residential/pricing-plans', { params });
  return response.data;
}

export async function getDefaultResidentialPricingPlan(): Promise<ResidentialPricingPlan> {
  const response = await api.get('/residential/pricing-plans/default');
  return response.data.data;
}

export async function createResidentialPricingPlan(
  data: CreateResidentialPricingPlanInput
): Promise<ResidentialPricingPlan> {
  const response = await api.post('/residential/pricing-plans', data);
  return response.data.data;
}

export async function updateResidentialPricingPlan(
  id: string,
  data: UpdateResidentialPricingPlanInput
): Promise<ResidentialPricingPlan> {
  const response = await api.patch(`/residential/pricing-plans/${id}`, data);
  return response.data.data;
}

export async function setDefaultResidentialPricingPlan(id: string): Promise<ResidentialPricingPlan> {
  const response = await api.post(`/residential/pricing-plans/${id}/set-default`);
  return response.data.data;
}

export async function archiveResidentialPricingPlan(id: string): Promise<ResidentialPricingPlan> {
  const response = await api.post(`/residential/pricing-plans/${id}/archive`);
  return response.data.data;
}

export async function restoreResidentialPricingPlan(id: string): Promise<ResidentialPricingPlan> {
  const response = await api.post(`/residential/pricing-plans/${id}/restore`);
  return response.data.data;
}

export async function listResidentialQuotes(params?: {
  page?: number;
  limit?: number;
  accountId?: string;
  propertyId?: string;
  status?: ResidentialQuote['status'];
  includeArchived?: boolean;
  search?: string;
}): Promise<PaginatedResponse<ResidentialQuote>> {
  const response = await api.get('/residential/quotes', { params });
  return response.data;
}

export async function getResidentialQuote(id: string): Promise<ResidentialQuote> {
  const response = await api.get(`/residential/quotes/${id}`);
  return response.data.data;
}

export interface CreateResidentialPropertyInput {
  accountId: string;
  name: string;
  serviceAddress?: ResidentialProperty['serviceAddress'] | null;
  homeProfile: ResidentialProperty['homeProfile'];
  accessNotes?: string | null;
  parkingAccess?: string | null;
  entryNotes?: string | null;
  pets?: boolean | null;
  isPrimary?: boolean;
  status?: ResidentialProperty['status'];
}

export interface UpdateResidentialPropertyInput {
  name?: string;
  serviceAddress?: ResidentialProperty['serviceAddress'] | null;
  homeProfile?: ResidentialProperty['homeProfile'];
  accessNotes?: string | null;
  parkingAccess?: string | null;
  entryNotes?: string | null;
  pets?: boolean | null;
  isPrimary?: boolean;
  status?: ResidentialProperty['status'];
}

export async function createResidentialProperty(
  data: CreateResidentialPropertyInput
): Promise<ResidentialProperty> {
  const response = await api.post('/residential/properties', data);
  return response.data.data;
}

export async function updateResidentialProperty(
  id: string,
  data: UpdateResidentialPropertyInput
): Promise<ResidentialProperty> {
  const response = await api.patch(`/residential/properties/${id}`, data);
  return response.data.data;
}

export async function previewResidentialQuote(
  data: Omit<ResidentialQuoteFormInput, 'accountId' | 'title' | 'customerName' | 'customerEmail' | 'customerPhone' | 'notes' | 'preferredStartDate'>
): Promise<ResidentialQuotePreview> {
  const response = await api.post('/residential/quotes/preview', data);
  return response.data.data;
}

export async function createResidentialQuote(data: ResidentialQuoteFormInput): Promise<ResidentialQuote> {
  const response = await api.post('/residential/quotes', data);
  return response.data.data;
}

export async function updateResidentialQuote(
  id: string,
  data: Partial<ResidentialQuoteFormInput> & { status?: ResidentialQuote['status'] }
): Promise<ResidentialQuote> {
  const response = await api.patch(`/residential/quotes/${id}`, data);
  return response.data.data;
}

export async function sendResidentialQuote(
  id: string,
  emailTo?: string | null
): Promise<{ data: ResidentialQuote; publicUrl?: string | null; emailTo?: string | null }> {
  const response = await api.post(`/residential/quotes/${id}/send`, { emailTo });
  return response.data;
}

export async function getResidentialQuotePdfBlobUrl(id: string): Promise<string> {
  const response = await api.get(`/residential/quotes/${id}/pdf`, {
    responseType: 'blob',
  });
  return window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
}

export async function issueResidentialQuotePublicLink(id: string): Promise<string> {
  const response = await api.post(`/residential/quotes/${id}/public-link`);
  return response.data.data.publicUrl;
}

export async function requestResidentialQuoteReview(
  id: string
): Promise<{ data: ResidentialQuote; notified: number }> {
  const response = await api.post(`/residential/quotes/${id}/request-review`);
  return response.data;
}

export async function approveResidentialQuoteReview(id: string): Promise<ResidentialQuote> {
  const response = await api.post(`/residential/quotes/${id}/approve-review`);
  return response.data.data;
}

export async function acceptResidentialQuote(id: string): Promise<ResidentialQuote> {
  const response = await api.post(`/residential/quotes/${id}/accept`);
  return response.data.data;
}

export async function declineResidentialQuote(id: string, reason?: string): Promise<ResidentialQuote> {
  const response = await api.post(`/residential/quotes/${id}/decline`, { reason });
  return response.data.data;
}

export async function convertResidentialQuote(id: string, data?: {
  startDate?: string;
  title?: string;
  paymentTerms?: string;
}): Promise<{ id: string; contractNumber: string }> {
  const response = await api.post(`/residential/quotes/${id}/convert`, data ?? {});
  return response.data.data;
}

export async function archiveResidentialQuote(id: string): Promise<ResidentialQuote> {
  const response = await api.post(`/residential/quotes/${id}/archive`);
  return response.data.data;
}

export async function restoreResidentialQuote(id: string): Promise<ResidentialQuote> {
  const response = await api.post(`/residential/quotes/${id}/restore`);
  return response.data.data;
}

export async function getPublicResidentialQuote(
  token: string
): Promise<{
  data: PublicResidentialQuote;
  branding: {
    companyName?: string | null;
    companyEmail?: string | null;
    companyPhone?: string | null;
    companyWebsite?: string | null;
    companyAddress?: string | null;
    logoDataUrl?: string | null;
    themePrimaryColor?: string | null;
    themeAccentColor?: string | null;
    themeBackgroundColor?: string | null;
    themeTextColor?: string | null;
    companyTimezone?: string | null;
  };
}> {
  const response = await api.get(`/public/residential-quotes/${token}`);
  return response.data;
}

export async function acceptPublicResidentialQuote(
  token: string,
  signatureName: string
): Promise<PublicResidentialQuote> {
  const response = await api.post(`/public/residential-quotes/${token}/accept`, { signatureName });
  return response.data.data;
}

export async function declinePublicResidentialQuote(
  token: string,
  reason: string
): Promise<PublicResidentialQuote> {
  const response = await api.post(`/public/residential-quotes/${token}/decline`, { reason });
  return response.data.data;
}
