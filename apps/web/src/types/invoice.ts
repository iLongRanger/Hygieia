export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue' | 'void' | 'written_off';
export type PaymentMethod = 'check' | 'ach' | 'credit_card' | 'cash' | 'other';
export type InvoiceItemType = 'service' | 'additional' | 'adjustment' | 'credit';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
  account: { id: string; name: string };
  contract: { id: string; contractNumber: string } | null;
  facility: { id: string; name: string } | null;
  createdByUser: { id: string; fullName: string };
  _count: { items: number; payments: number };
}

export interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  contractId: string | null;
  accountId: string;
  facilityId: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  notes: string | null;
  paymentInstructions: string | null;
  publicToken: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  paidAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  account: { id: string; name: string; billingEmail: string | null; billingAddress: unknown };
  contract: { id: string; contractNumber: string; title: string } | null;
  facility: { id: string; name: string } | null;
  createdByUser: { id: string; fullName: string };
  items: InvoiceItem[];
  payments: InvoicePayment[];
  activities: InvoiceActivity[];
}

export interface InvoiceItem {
  id: string;
  itemType: InvoiceItemType;
  description: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  sortOrder: number;
}

export interface InvoicePayment {
  id: string;
  paymentDate: string;
  amount: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
  recordedByUser: { id: string; fullName: string };
}

export interface InvoiceActivity {
  id: string;
  action: string;
  performedByUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  performedByUser: { id: string; fullName: string } | null;
}

// Input types
export interface CreateInvoiceInput {
  contractId?: string | null;
  accountId: string;
  facilityId?: string | null;
  issueDate: string;
  dueDate: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  taxRate?: number;
  notes?: string | null;
  paymentInstructions?: string | null;
  items: {
    itemType?: InvoiceItemType;
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface RecordPaymentInput {
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface GenerateFromContractInput {
  contractId: string;
  periodStart: string;
  periodEnd: string;
}

export interface BatchGenerateInput {
  periodStart: string;
  periodEnd: string;
}
