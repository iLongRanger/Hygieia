import axios from 'axios';

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

interface BrandingConfig {
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

export interface PublicQuotation {
  id: string;
  quotationNumber: string;
  title: string;
  status: string;
  description: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  validUntil: string | null;
  createdAt: string;
  sentAt: string | null;
  termsAndConditions: string | null;
  signatureName: string | null;
  signatureDate: string | null;
  account: { name: string };
  facility: { name: string; address: Record<string, unknown> } | null;
  createdByUser: { fullName: string; email: string };
  services: {
    serviceName: string;
    description: string | null;
    price: number;
    includedTasks: string[];
    pricingMeta?: {
      unitType?: string;
      quantity?: number;
      unitPrice?: number;
      standardAmount?: number;
      finalAmount?: number;
      discountPercent?: number;
      discountAmount?: number;
      overrideReason?: string | null;
      addOns?: {
        code?: string;
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }[];
    };
    sortOrder: number;
  }[];
}

export interface PublicQuotationResponse {
  data: PublicQuotation;
  branding: BrandingConfig;
}

export async function getPublicQuotation(token: string): Promise<PublicQuotationResponse> {
  const response = await publicApi.get(`/public/quotations/${token}`);
  return response.data;
}

export async function acceptPublicQuotation(
  token: string,
  signatureName: string
): Promise<PublicQuotation> {
  const response = await publicApi.post(`/public/quotations/${token}/accept`, {
    signatureName,
  });
  return response.data.data;
}

export async function rejectPublicQuotation(
  token: string,
  rejectionReason: string
): Promise<PublicQuotation> {
  const response = await publicApi.post(`/public/quotations/${token}/reject`, {
    rejectionReason,
  });
  return response.data.data;
}

export async function downloadPublicQuotationPdf(
  token: string,
  quotationNumber: string
): Promise<void> {
  const response = await publicApi.get(`/public/quotations/${token}/pdf`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${quotationNumber}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
