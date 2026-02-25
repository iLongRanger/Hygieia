import type { Address } from './facility';

export interface PublicProposal {
  id: string;
  proposalNumber: string;
  title: string;
  status: string;
  description: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  serviceFrequency?: string | null;
  validUntil: string | null;
  createdAt: string;
  sentAt: string | null;
  signatureName: string | null;
  signatureDate: string | null;
  account: {
    name: string;
  };
  facility: {
    name: string;
    address: string | Address | null;
  } | null;
  pricingSnapshot?: {
    pricingType?: string;
    pricingBasis?: 'sqft_price_with_derived_hours' | 'hourly_task_minutes';
    operationalEstimate?: {
      monthlyLaborHours: number;
      monthlyVisits: number;
      hoursPerVisit: number;
      recommendedCrewSize: number;
      durationHoursPerVisit: number;
      durationRangePerVisit: {
        minHours: number;
        maxHours: number;
      };
      variabilityPercentage: number;
    };
  } | null;
  proposalItems: Array<{
    itemType: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sortOrder: number;
  }>;
  proposalServices: Array<{
    serviceName: string;
    serviceType: string;
    frequency: string;
    estimatedHours: number | null;
    hourlyRate: number | null;
    monthlyPrice: number;
    description: string | null;
    includedTasks: string[];
    sortOrder: number;
  }>;
}

export interface PublicProposalResponse {
  data: PublicProposal;
  branding: {
    companyName: string;
    companyEmail: string | null;
    companyPhone: string | null;
    companyWebsite: string | null;
    companyAddress: string | null;
    logoDataUrl: string | null;
    themePrimaryColor: string;
    themeAccentColor: string;
    themeBackgroundColor: string;
    themeTextColor: string;
  };
}
