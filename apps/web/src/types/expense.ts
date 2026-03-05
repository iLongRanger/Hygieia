export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  date: string;
  amount: string;
  description: string;
  vendor: string | null;
  status: ExpenseStatus;
  receiptUrl: string | null;
  createdAt: string;
  category: { id: string; name: string };
  job: { id: string; jobNumber: string } | null;
  contract: { id: string; contractNumber: string } | null;
  facility: { id: string; name: string } | null;
  createdByUser: { id: string; fullName: string };
  approvedByUser: { id: string; fullName: string } | null;
}

export interface ExpenseDetail extends Expense {
  categoryId: string;
  jobId: string | null;
  contractId: string | null;
  facilityId: string | null;
  notes: string | null;
  approvedAt: string | null;
  updatedAt: string;
  createdByUserId: string;
}

export interface CreateExpenseInput {
  date: string;
  amount: number;
  description: string;
  vendor?: string | null;
  categoryId: string;
  jobId?: string | null;
  contractId?: string | null;
  facilityId?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
}

export interface UpdateExpenseInput {
  date?: string;
  amount?: number;
  description?: string;
  vendor?: string | null;
  categoryId?: string;
  jobId?: string | null;
  contractId?: string | null;
  facilityId?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
}
