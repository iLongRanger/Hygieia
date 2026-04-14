export type TimeEntryStatus = 'active' | 'completed' | 'edited' | 'approved' | 'rejected';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type TimeEntryJobSettlementStatus =
  | 'ready'
  | 'needs_review'
  | 'approved_invoice_only'
  | 'approved_payroll_only'
  | 'approved_both'
  | 'excluded';

export interface TimeEntryJobSettlement {
  id: string | null;
  status: TimeEntryJobSettlementStatus;
  issueCode: string | null;
  issueSummary: string | null;
  workerExplanation: string | null;
  workerRespondedAt: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  reviewedByUser: {
    id: string;
    fullName: string;
  } | null;
  lastWorkerReminderAt: string | null;
  lastManagerReminderAt: string | null;
  requiresManagerReview: boolean;
  invoiceEligible: boolean;
  payrollEligible: boolean;
}

export interface TimeEntry {
  id: string;
  userId: string;
  entryType: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  totalHours: string | null;
  notes: string | null;
  status: TimeEntryStatus;
  editReason: string | null;
  approvedAt: string | null;
  timesheetId: string | null;
  createdAt: string;
  user: { id: string; fullName: string };
  job: {
    id: string;
    jobNumber: string;
    status: string;
    settlement: TimeEntryJobSettlement;
  } | null;
  contract: { id: string; contractNumber: string } | null;
  facility: { id: string; name: string } | null;
  approvedByUser: { id: string; fullName: string } | null;
  editedByUser: { id: string; fullName: string } | null;
  geoLocation: Record<string, unknown> | null;
}

export interface Timesheet {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  status: TimesheetStatus;
  totalHours: string;
  regularHours: string;
  overtimeHours: string;
  notes: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  createdAt: string;
  user: { id: string; fullName: string };
  approvedByUser: { id: string; fullName: string } | null;
  _count: { entries: number };
}

export interface TimesheetDetail extends Timesheet {
  updatedAt: string;
  entries: {
    id: string;
    entryType: string;
    clockIn: string;
    clockOut: string | null;
    breakMinutes: number;
    totalHours: string | null;
    notes: string | null;
    status: string;
    job: {
      id: string;
      jobNumber: string;
      status: string;
      settlement: TimeEntryJobSettlement;
    } | null;
    facility: { id: string; name: string } | null;
  }[];
}

export interface TimeSummary {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  entryCount: number;
}

// Input types
export interface ClockInInput {
  jobId?: string | null;
  contractId?: string | null;
  facilityId?: string | null;
  notes?: string | null;
  geoLocation?: Record<string, unknown> | null;
  managerOverride?: boolean;
  overrideReason?: string | null;
}

export interface ManualEntryInput {
  userId: string;
  jobId?: string | null;
  contractId?: string | null;
  facilityId?: string | null;
  clockIn: string;
  clockOut: string;
  breakMinutes?: number;
  notes?: string | null;
}

export interface EditTimeEntryInput {
  clockIn?: string;
  clockOut?: string | null;
  breakMinutes?: number;
  notes?: string | null;
  jobId?: string | null;
  facilityId?: string | null;
  editReason: string;
}

export interface GenerateTimesheetInput {
  userId: string;
  periodStart: string;
  periodEnd: string;
}

export interface GenerateTimesheetsBulkInput {
  userIds: string[];
  periodStart: string;
  periodEnd: string;
}

export interface GenerateTimesheetsBulkResult {
  created: TimesheetDetail[];
  skipped: { userId: string; reason: string }[];
  failed: { userId: string; error: string }[];
  summary: {
    requested: number;
    created: number;
    skipped: number;
    failed: number;
  };
}
