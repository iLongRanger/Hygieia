import axios from 'axios';
import type { PublicContract, PublicContractResponse } from '../types/publicContract';

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function getPublicContract(token: string): Promise<PublicContractResponse> {
  const response = await publicApi.get(`/public/contracts/${token}`);
  return response.data;
}

export async function signPublicContract(
  token: string,
  signedByName: string,
  signedByEmail: string
): Promise<PublicContract> {
  const response = await publicApi.post(`/public/contracts/${token}/sign`, {
    signedByName,
    signedByEmail,
  });
  return response.data.data;
}

export async function downloadPublicContractPdf(
  token: string,
  contractNumber: string
): Promise<void> {
  const response = await publicApi.get(`/public/contracts/${token}/pdf`, {
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
