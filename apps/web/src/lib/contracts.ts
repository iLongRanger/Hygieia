import api from './api';
import type {
  Contract,
  ContractAmendment,
  ContractSummary,
  CreateContractAmendmentInput,
  CreateContractInput,
  CreateContractFromProposalInput,
  CreateStandaloneContractInput,
  RecalculateContractAmendmentInput,
  UpdateContractInput,
  UpdateContractAmendmentInput,
  SignContractInput,
  SendContractInput,
  TerminateContractInput,
  RenewContractInput,
  ListContractsParams,
} from '../types/contract';
import type { FacilityPricingResult } from './pricing';

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listContracts(
  params?: ListContractsParams
): Promise<PaginatedResponse<Contract>> {
  const response = await api.get('/contracts', { params });
  return response.data;
}

export async function getContractsSummary(params?: {
  accountId?: string;
  includeArchived?: boolean;
  renewalWindowDays?: number;
}): Promise<ContractSummary> {
  const response = await api.get('/contracts/summary', { params });
  return response.data.data;
}

export async function getContract(id: string): Promise<Contract> {
  const response = await api.get(`/contracts/${id}`);
  return response.data.data;
}

export async function createContract(data: CreateContractInput): Promise<Contract> {
  const response = await api.post('/contracts', data);
  return response.data.data;
}

export async function createContractFromProposal(
  proposalId: string,
  data?: Omit<CreateContractFromProposalInput, 'proposalId'>
): Promise<Contract> {
  const response = await api.post(`/contracts/from-proposal/${proposalId}`, data || {});
  return response.data.data;
}

export async function updateContract(
  id: string,
  data: UpdateContractInput
): Promise<Contract> {
  const response = await api.patch(`/contracts/${id}`, data);
  return response.data.data;
}

export async function updateContractStatus(
  id: string,
  status: string
): Promise<Contract> {
  const response = await api.patch(`/contracts/${id}/status`, { status });
  return response.data.data;
}

export async function sendContract(
  id: string,
  data?: SendContractInput
): Promise<Contract> {
  const response = await api.post(`/contracts/${id}/send`, data || {});
  return response.data.data;
}

export async function signContract(
  id: string,
  data: SignContractInput
): Promise<Contract> {
  const response = await api.post(`/contracts/${id}/sign`, data);
  return response.data.data;
}

export async function terminateContract(
  id: string,
  data: TerminateContractInput
): Promise<Contract> {
  const response = await api.post(`/contracts/${id}/terminate`, data);
  return response.data.data;
}

export async function archiveContract(id: string): Promise<Contract> {
  const response = await api.delete(`/contracts/${id}`);
  return response.data.data;
}

export async function restoreContract(id: string): Promise<Contract> {
  const response = await api.post(`/contracts/${id}/restore`);
  return response.data.data;
}

export async function assignContractTeam(
  id: string,
  teamId: string | null,
  assignedToUserId?: string | null,
  subcontractorTier?: string,
  effectivityDate?: string | null
): Promise<Contract> {
  const response = await api.patch(`/contracts/${id}/team`, {
    teamId,
    assignedToUserId: assignedToUserId ?? null,
    subcontractorTier,
    effectivityDate: effectivityDate ?? null,
  });
  return response.data.data;
}

// Contract Renewal

export async function renewContract(
  id: string,
  data: RenewContractInput
): Promise<Contract> {
  const response = await api.post(`/contracts/${id}/renew`, data);
  return response.data.data;
}

// Initial Clean

export async function completeInitialClean(id: string): Promise<Contract> {
  const response = await api.post(`/contracts/${id}/complete-initial-clean`);
  return response.data.data;
}

// Generate default contract terms

export interface GenerateTermsParams {
  accountId: string;
  facilityId?: string | null;
  startDate?: string;
  endDate?: string | null;
  monthlyValue: number;
  billingCycle?: string;
  paymentTerms?: string;
  serviceFrequency?: string | null;
  serviceSchedule?: Record<string, unknown> | null;
  autoRenew?: boolean;
  renewalNoticeDays?: number | null;
  title?: string;
}

export async function generateContractTerms(params: GenerateTermsParams): Promise<string> {
  const response = await api.post('/contracts/generate-terms', params);
  return response.data.data;
}

// PDF

export async function downloadContractPdf(id: string, contractNumber: string): Promise<void> {
  const response = await api.get(`/contracts/${id}/pdf`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${contractNumber}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function getContractPdfBlobUrl(id: string): Promise<string> {
  const response = await api.get(`/contracts/${id}/pdf`, {
    responseType: 'blob',
  });
  return window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
}

export async function downloadContractTermsDocument(
  id: string,
  filename?: string
): Promise<void> {
  const response = await api.get(`/contracts/${id}/terms-document`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || 'terms-document');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// Contract Activities

export async function getContractActivities(
  contractId: string,
  params?: { page?: number; limit?: number }
): Promise<{ data: any[]; pagination: any }> {
  const response = await api.get(`/contracts/${contractId}/activities`, { params });
  return response.data;
}

// Expiring Contracts

export async function getExpiringContracts(days: number = 30): Promise<Contract[]> {
  const response = await api.get('/contracts/expiring', { params: { days } });
  return response.data.data;
}

export async function listContractAmendments(contractId: string): Promise<ContractAmendment[]> {
  const response = await api.get(`/contracts/${contractId}/amendments`);
  return response.data.data;
}

export async function getContractAmendment(
  contractId: string,
  amendmentId: string
): Promise<ContractAmendment> {
  const response = await api.get(`/contracts/${contractId}/amendments/${amendmentId}`);
  return response.data.data;
}

export async function createContractAmendment(
  contractId: string,
  data: CreateContractAmendmentInput
): Promise<ContractAmendment> {
  const response = await api.post(`/contracts/${contractId}/amendments`, data);
  return response.data.data;
}

export async function updateContractAmendment(
  contractId: string,
  amendmentId: string,
  data: UpdateContractAmendmentInput
): Promise<ContractAmendment> {
  const response = await api.patch(`/contracts/${contractId}/amendments/${amendmentId}`, data);
  return response.data.data;
}

export async function recalculateContractAmendment(
  contractId: string,
  amendmentId: string,
  data: RecalculateContractAmendmentInput
): Promise<{ amendment: ContractAmendment; pricing: FacilityPricingResult }> {
  const response = await api.post(
    `/contracts/${contractId}/amendments/${amendmentId}/recalculate`,
    data
  );
  return response.data.data;
}

export async function approveContractAmendment(
  contractId: string,
  amendmentId: string
): Promise<ContractAmendment> {
  const response = await api.post(`/contracts/${contractId}/amendments/${amendmentId}/approve`);
  return response.data.data;
}

export async function rejectContractAmendment(
  contractId: string,
  amendmentId: string,
  rejectedReason: string
): Promise<ContractAmendment> {
  const response = await api.post(`/contracts/${contractId}/amendments/${amendmentId}/reject`, {
    rejectedReason,
  });
  return response.data.data;
}

// Standalone Contract Creation (imported/legacy)

export async function createStandaloneContract(
  data: CreateStandaloneContractInput
): Promise<Contract> {
  const response = await api.post('/contracts/standalone', data);
  return response.data.data;
}
