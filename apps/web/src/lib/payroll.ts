import api from './api';
import type { PaginatedResponse } from '../types/crm';
import type { PayrollRun, PayrollRunDetail, PayrollEntry, AdjustPayrollEntryInput } from '../types/payroll';

export interface PayrollListParams {
  status?: string;
  page?: number;
  limit?: number;
}

export async function listPayrollRuns(params: PayrollListParams = {}): Promise<PaginatedResponse<PayrollRun>> {
  const response = await api.get('/payroll', { params });
  return response.data;
}

export async function getPayrollRun(id: string): Promise<PayrollRunDetail> {
  const response = await api.get(`/payroll/${id}`);
  return response.data.data;
}

export async function generatePayrollRun(periodStart: string, periodEnd: string): Promise<PayrollRunDetail> {
  const response = await api.post('/payroll/generate', { periodStart, periodEnd });
  return response.data.data;
}

export async function approvePayrollRun(id: string): Promise<PayrollRunDetail> {
  const response = await api.post(`/payroll/${id}/approve`);
  return response.data.data;
}

export async function markPayrollRunPaid(id: string): Promise<PayrollRunDetail> {
  const response = await api.post(`/payroll/${id}/mark-paid`);
  return response.data.data;
}

export async function adjustPayrollEntry(runId: string, entryId: string, input: AdjustPayrollEntryInput): Promise<PayrollEntry> {
  const response = await api.patch(`/payroll/${runId}/entries/${entryId}`, input);
  return response.data.data;
}

export async function deletePayrollRun(id: string): Promise<void> {
  await api.delete(`/payroll/${id}`);
}
