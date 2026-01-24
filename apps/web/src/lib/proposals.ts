import api from './api';
import type {
  Proposal,
  CreateProposalInput,
  UpdateProposalInput,
  ListProposalsParams,
  SendProposalInput,
  RejectProposalInput,
} from '../types/proposal';

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listProposals(
  params?: ListProposalsParams
): Promise<PaginatedResponse<Proposal>> {
  const response = await api.get('/proposals', { params });
  return response.data;
}

export async function getProposal(id: string): Promise<Proposal> {
  const response = await api.get(`/proposals/${id}`);
  return response.data.data;
}

export async function getProposalByNumber(proposalNumber: string): Promise<Proposal> {
  const response = await api.get(`/proposals/number/${proposalNumber}`);
  return response.data.data;
}

export async function createProposal(data: CreateProposalInput): Promise<Proposal> {
  const response = await api.post('/proposals', data);
  return response.data.data;
}

export async function updateProposal(
  id: string,
  data: UpdateProposalInput
): Promise<Proposal> {
  const response = await api.patch(`/proposals/${id}`, data);
  return response.data.data;
}

export async function sendProposal(
  id: string,
  data?: SendProposalInput
): Promise<Proposal> {
  const response = await api.post(`/proposals/${id}/send`, data || {});
  return response.data.data;
}

export async function markProposalAsViewed(id: string): Promise<Proposal> {
  const response = await api.post(`/proposals/${id}/viewed`);
  return response.data.data;
}

export async function acceptProposal(id: string): Promise<Proposal> {
  const response = await api.post(`/proposals/${id}/accept`, {});
  return response.data.data;
}

export async function rejectProposal(
  id: string,
  data: RejectProposalInput
): Promise<Proposal> {
  const response = await api.post(`/proposals/${id}/reject`, data);
  return response.data.data;
}

export async function archiveProposal(id: string): Promise<Proposal> {
  const response = await api.post(`/proposals/${id}/archive`);
  return response.data.data;
}

export async function restoreProposal(id: string): Promise<Proposal> {
  const response = await api.post(`/proposals/${id}/restore`);
  return response.data.data;
}

export async function deleteProposal(id: string): Promise<void> {
  await api.delete(`/proposals/${id}`);
}

// Proposals available for contract creation (accepted proposals without existing contracts)
export interface ProposalForContract {
  id: string;
  proposalNumber: string;
  title: string;
  totalAmount: string;
  acceptedAt: string;
  account: {
    id: string;
    name: string;
  };
  facility: {
    id: string;
    name: string;
  } | null;
}

export async function getProposalsAvailableForContract(
  accountId?: string
): Promise<ProposalForContract[]> {
  const response = await api.get('/proposals/available-for-contract', {
    params: { accountId },
  });
  return response.data.data;
}
