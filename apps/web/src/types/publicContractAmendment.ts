export interface PublicContractAmendment {
  id: string;
  contractId: string;
  amendmentNumber: number;
  status: string;
  amendmentType: string;
  title: string;
  summary?: string | null;
  reason?: string | null;
  effectiveDate: string;
  oldMonthlyValue: number;
  newMonthlyValue?: number | null;
  monthlyDelta?: number | null;
  oldServiceFrequency?: string | null;
  newServiceFrequency?: string | null;
  oldServiceSchedule?: {
    days?: string[];
    allowedWindowStart?: string;
    allowedWindowEnd?: string;
  } | null;
  newServiceSchedule?: {
    days?: string[];
    allowedWindowStart?: string;
    allowedWindowEnd?: string;
  } | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  signedDate?: string | null;
  signedByName?: string | null;
  signedByEmail?: string | null;
  contract: {
    id: string;
    contractNumber: string;
    title: string;
    account: {
      name: string;
    };
    facility?: {
      name: string;
      address: any;
    } | null;
  };
  snapshots?: Array<{
    id: string;
    snapshotType: string;
    scopeJson: Record<string, any>;
    createdAt: string;
  }>;
}

export interface PublicContractAmendmentResponse {
  data: PublicContractAmendment;
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
    companyTimezone?: string | null;
  };
}
