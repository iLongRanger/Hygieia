export interface PublicContract {
  id: string;
  contractNumber: string;
  title: string;
  status: string;
  renewalNumber?: number | null;
  startDate: string;
  endDate?: string | null;
  serviceFrequency?: string | null;
  monthlyValue: number;
  billingCycle: string;
  paymentTerms: string;
  termsAndConditions?: string | null;
  signedByName?: string | null;
  signedDate?: string | null;
  sentAt?: string | null;
  account: {
    name: string;
  };
  facility?: {
    name: string;
    address: any;
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
