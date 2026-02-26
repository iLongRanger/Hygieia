export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired';

export interface QuotationService {
  id?: string;
  catalogItemId?: string | null;
  serviceName: string;
  description?: string | null;
  price: number;
  includedTasks?: string[];
  pricingMeta?: {
    unitType?: string;
    quantity?: number;
    unitPrice?: number;
    standardAmount?: number;
    finalAmount?: number;
    discountPercent?: number;
    discountAmount?: number;
    overrideReason?: string | null;
    addOns?: Array<{
      code?: string;
      name: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  };
  sortOrder?: number;
}

export interface QuotationActivity {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  ipAddress?: string | null;
  createdAt: string;
  performedByUser?: {
    id: string;
    fullName: string;
  } | null;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  title: string;
  status: QuotationStatus;
  description?: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  validUntil?: string | null;
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  pricingApprovalStatus?: 'not_required' | 'pending' | 'approved' | 'rejected';
  pricingApprovalReason?: string | null;
  pricingApprovalRequestedAt?: string | null;
  pricingApprovedAt?: string | null;
  pricingApprovalRejectedAt?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  publicToken?: string | null;
  signatureName?: string | null;
  signatureDate?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  account: {
    id: string;
    name: string;
    type: string;
    billingEmail?: string | null;
  };
  facility?: {
    id: string;
    name: string;
    address?: any;
  } | null;
  createdByUser: {
    id: string;
    fullName: string;
    email?: string;
  };
  services: QuotationService[];
  generatedJob?: {
    id: string;
    jobNumber: string;
    status: string;
  } | null;
  activities?: QuotationActivity[];
  _count?: {
    services: number;
  };
}

export interface CreateQuotationInput {
  accountId: string;
  facilityId?: string | null;
  title: string;
  description?: string | null;
  validUntil?: string | null;
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  taxRate?: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  services?: QuotationService[];
}

export interface UpdateQuotationInput {
  accountId?: string;
  facilityId?: string | null;
  title?: string;
  status?: QuotationStatus;
  description?: string | null;
  validUntil?: string | null;
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  taxRate?: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  services?: QuotationService[];
}

export interface ListQuotationsParams {
  page?: number;
  limit?: number;
  status?: QuotationStatus;
  accountId?: string;
  facilityId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
}

export interface SendQuotationInput {
  emailTo?: string;
  emailCc?: string[];
  emailSubject?: string;
  emailBody?: string;
}

export interface QuotationPricingApprovalInput {
  action: 'approved' | 'rejected';
  reason?: string | null;
}
