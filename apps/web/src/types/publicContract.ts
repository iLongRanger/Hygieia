export interface PublicContract {
  id: string;
  contractNumber: string;
  title: string;
  status: string;
  renewalNumber?: number | null;
  startDate: string;
  endDate?: string | null;
  serviceFrequency?: string | null;
  serviceSchedule?: {
    days?: string[];
    allowedWindowStart?: string;
    allowedWindowEnd?: string;
    windowAnchor?: string;
    timezoneSource?: string;
  } | null;
  monthlyValue: number;
  taxRate?: number | null;
  taxAmount?: number | null;
  billingCycle: string;
  paymentTerms: string;
  termsAndConditions?: string | null;
  termsDocumentName?: string | null;
  termsDocumentMimeType?: string | null;
  signedByName?: string | null;
  signedDate?: string | null;
  sentAt?: string | null;
  account: {
    name: string;
  };
  facility?: {
    name: string;
    address: Record<string, unknown>;
  } | null;
  proposal?: {
    id: string;
    proposalNumber: string;
    title: string;
    proposalServices?: {
      id: string;
      serviceName: string;
      frequency?: string | null;
      description?: string | null;
      monthlyPrice?: number | null;
      estimatedHours?: number | null;
      hourlyRate?: number | null;
      includedTasks?: string[];
    }[];
  } | null;
}

export interface PublicContractResponse {
  data: PublicContract;
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
