import axios from 'axios';
import type {
  PublicContractAmendment,
  PublicContractAmendmentResponse,
} from '../types/publicContractAmendment';

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

const publicApi = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function getPublicContractAmendment(
  token: string
): Promise<PublicContractAmendmentResponse> {
  const response = await publicApi.get(`/public/contract-amendments/${token}`);
  return response.data;
}

export async function signPublicContractAmendment(
  token: string,
  signedByName: string,
  signedByEmail: string
): Promise<PublicContractAmendment> {
  const response = await publicApi.post(`/public/contract-amendments/${token}/sign`, {
    signedByName,
    signedByEmail,
  });
  return response.data.data;
}
