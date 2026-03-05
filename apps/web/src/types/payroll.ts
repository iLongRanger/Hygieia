export type PayrollRunStatus = 'draft' | 'approved' | 'paid';
export type PayrollEntryStatus = 'valid' | 'flagged' | 'adjusted';
export type PayType = 'hourly' | 'percentage';

export interface PayrollRun {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollRunStatus;
  totalGrossPay: string;
  totalEntries: number;
  approvedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  approvedByUser: { id: string; fullName: string } | null;
}

export interface PayrollEntry {
  id: string;
  userId: string;
  payType: PayType;
  scheduledHours: string | null;
  hourlyRate: string | null;
  contractId: string | null;
  contractMonthlyValue: string | null;
  tierPercentage: string | null;
  grossPay: string;
  status: PayrollEntryStatus;
  flagReason: string | null;
  adjustmentNotes: string | null;
  createdAt: string;
  user: { id: string; fullName: string; role: string };
  contract: { id: string; contractNumber: string; title: string } | null;
  adjustedByUser: { id: string; fullName: string } | null;
}

export interface PayrollRunDetail extends PayrollRun {
  updatedAt: string;
  entries: PayrollEntry[];
}

export interface AdjustPayrollEntryInput {
  grossPay?: number;
  scheduledHours?: number;
  status?: PayrollEntryStatus;
  adjustmentNotes?: string | null;
}
