import axios from 'axios';
import type { PublicProposal, PublicProposalResponse } from '../types/publicProposal';

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

// Separate axios instance without auth headers
const publicApi = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function getPublicProposal(token: string): Promise<PublicProposalResponse> {
  const response = await publicApi.get(`/public/proposals/${token}`);
  return response.data;
}

export async function acceptPublicProposal(
  token: string,
  signatureName: string
): Promise<PublicProposal> {
  const response = await publicApi.post(`/public/proposals/${token}/accept`, {
    signatureName,
  });
  return response.data.data;
}

export async function rejectPublicProposal(
  token: string,
  rejectionReason: string
): Promise<PublicProposal> {
  const response = await publicApi.post(`/public/proposals/${token}/reject`, {
    rejectionReason,
  });
  return response.data.data;
}

export async function downloadPublicProposalPdf(
  token: string,
  proposalNumber: string
): Promise<void> {
  const response = await publicApi.get(`/public/proposals/${token}/pdf`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${proposalNumber}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
