export type TimeEntryStatus = 'active' | 'completed' | 'edited' | 'approved' | 'rejected';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

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
  job: { id: string; jobNumber: string } | null;
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
    job: { id: string; jobNumber: string } | null;
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
