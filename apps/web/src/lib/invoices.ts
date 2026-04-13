import api from './api';
import type { PaginatedResponse } from '../types/crm';
import type {
  Invoice,
  InvoiceDetail,
  InvoiceActivity,
  CreateInvoiceInput,
  RecordPaymentInput,
  GenerateFromContractInput,
  BatchGenerateInput,
} from '../types/invoice';

export interface InvoiceListParams {
  accountId?: string;
  contractId?: string;
  facilityId?: string;
  status?: string;
  overdue?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function listInvoices(
  params: InvoiceListParams = {}
): Promise<PaginatedResponse<Invoice>> {
  const queryParams: Record<string, string | number | boolean | undefined> = { ...params };
  if (params.overdue) queryParams.overdue = 'true';
  const response = await api.get('/invoices', { params: queryParams });
  return response.data;
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  const response = await api.get(`/invoices/${id}`);
  return response.data.data;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceDetail> {
  const response = await api.post('/invoices', input);
  return response.data.data;
}

export async function updateInvoice(
  id: string,
  input: Partial<CreateInvoiceInput>
): Promise<InvoiceDetail> {
  const response = await api.patch(`/invoices/${id}`, input);
  return response.data.data;
}

export async function sendInvoice(id: string): Promise<InvoiceDetail> {
  const response = await api.post(`/invoices/${id}/send`);
  return response.data.data;
}

export async function issueInvoicePublicLink(id: string): Promise<string> {
  const response = await api.post(`/invoices/${id}/public-link`);
  return response.data.data.publicUrl;
}

export async function recordPayment(
  invoiceId: string,
  input: RecordPaymentInput
): Promise<InvoiceDetail> {
  const response = await api.post(`/invoices/${invoiceId}/payments`, input);
  return response.data.data;
}

export async function voidInvoice(id: string, reason?: string): Promise<InvoiceDetail> {
  const response = await api.post(`/invoices/${id}/void`, { reason });
  return response.data.data;
}

export async function generateFromContract(
  input: GenerateFromContractInput
): Promise<InvoiceDetail> {
  const response = await api.post('/invoices/generate-from-contract', input);
  return response.data.data;
}

export async function batchGenerateInvoices(
  input: BatchGenerateInput
): Promise<{
  periodStart: string;
  periodEnd: string;
  prorate: boolean;
  generated: number;
  skipped: number;
  duplicates: number;
  errors: number;
  results: {
    accountId: string;
    status: 'generated' | 'skipped_duplicate' | 'error';
    reason?: string;
    invoiceId?: string;
    lineItems?: number;
  }[];
}> {
  const response = await api.post('/invoices/batch-generate', input);
  return response.data.data;
}

export async function listInvoiceActivities(invoiceId: string): Promise<InvoiceActivity[]> {
  const response = await api.get(`/invoices/${invoiceId}/activities`);
  return response.data.data;
}

interface InvoiceBranding {
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
}

// Public
export async function getPublicInvoice(
  token: string
): Promise<{ data: InvoiceDetail; branding: InvoiceBranding }> {
  const response = await api.get(`/public/invoices/${token}`);
  return response.data;
}
