import api from './api';
import type {
  Quotation,
  CreateQuotationInput,
  UpdateQuotationInput,
  ListQuotationsParams,
  SendQuotationInput,
} from '../types/quotation';

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listQuotations(
  params?: ListQuotationsParams
): Promise<PaginatedResponse<Quotation>> {
  const response = await api.get('/quotations', { params });
  return response.data;
}

export async function getQuotation(id: string): Promise<Quotation> {
  const response = await api.get(`/quotations/${id}`);
  return response.data.data;
}

export async function createQuotation(data: CreateQuotationInput): Promise<Quotation> {
  const response = await api.post('/quotations', data);
  return response.data.data;
}

export async function updateQuotation(
  id: string,
  data: UpdateQuotationInput
): Promise<Quotation> {
  const response = await api.put(`/quotations/${id}`, data);
  return response.data.data;
}

export async function sendQuotation(
  id: string,
  data?: SendQuotationInput
): Promise<{ data: Quotation; publicUrl?: string }> {
  const response = await api.post(`/quotations/${id}/send`, data || {});
  return response.data;
}

export async function acceptQuotation(
  id: string,
  signatureName?: string
): Promise<Quotation> {
  const response = await api.post(`/quotations/${id}/accept`, { signatureName });
  return response.data.data;
}

export async function rejectQuotation(
  id: string,
  rejectionReason: string
): Promise<Quotation> {
  const response = await api.post(`/quotations/${id}/reject`, { rejectionReason });
  return response.data.data;
}

export async function archiveQuotation(id: string): Promise<Quotation> {
  const response = await api.post(`/quotations/${id}/archive`);
  return response.data.data;
}

export async function restoreQuotation(id: string): Promise<Quotation> {
  const response = await api.post(`/quotations/${id}/restore`);
  return response.data.data;
}

export async function deleteQuotation(id: string): Promise<void> {
  await api.delete(`/quotations/${id}`);
}
