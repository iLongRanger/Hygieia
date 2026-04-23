export type JobType = 'scheduled_service' | 'special_job';
export type JobCategory = 'recurring' | 'one_time';
export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'canceled' | 'missed';
export type JobTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type JobNoteType = 'general' | 'issue' | 'photo';
export type WorkforceAssignmentType = 'unassigned' | 'internal_employee' | 'subcontractor_team';
export type JobSettlementStatus =
  | 'ready'
  | 'needs_review'
  | 'approved_invoice_only'
  | 'approved_payroll_only'
  | 'approved_both'
  | 'excluded';

export interface JobSettlement {
  id: string | null;
  status: JobSettlementStatus;
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

export interface Job {
  id: string;
  jobNumber: string;
  jobType: JobType;
  jobCategory: JobCategory;
  status: JobStatus;
  scheduledDate: string;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  estimatedHours: string | null;
  actualHours: string | null;
  notes: string | null;
  completionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  contract: {
    id: string;
    contractNumber: string;
    title: string;
  } | null;
  quotation?: {
    id: string;
    quotationNumber: string;
    title: string;
  } | null;
  proposal?: {
    id: string;
    proposalNumber: string;
    title: string;
  } | null;
  facility: {
    id: string;
    name: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      [key: string]: unknown;
    };
    accessInstructions?: string | null;
    parkingInfo?: string | null;
    specialRequirements?: string | null;
    notes?: string | null;
  };
  account: {
    id: string;
    name: string;
    type?: 'commercial' | 'residential' | string;
    billingPhone?: string | null;
    billingEmail?: string | null;
    contacts?: {
      id: string;
      name: string;
      phone: string | null;
      mobile: string | null;
      email: string | null;
      title: string | null;
      isPrimary: boolean;
    }[];
  };
  assignedTeam: {
    id: string;
    name: string;
    calendarColor?: string | null;
  } | null;
  assignedToUser: {
    id: string;
    fullName: string;
    email: string;
    calendarColor?: string | null;
  } | null;
  workforceAssignmentType?: WorkforceAssignmentType;
  settlement?: JobSettlement;
  createdByUser: {
    id: string;
    fullName: string;
  };
}

export interface JobDetail extends Job {
  initialClean: {
    included: boolean;
    completed: boolean;
    completedAt: string | null;
    eligibleJobId: string | null;
    canCompleteOnThisJob: boolean;
  };
  tasks: JobTask[];
  notes_: JobNote[];
  activities: JobActivity[];
}

export interface JobTask {
  id: string;
  taskName: string;
  description: string | null;
  status: JobTaskStatus;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  notes: string | null;
  completedAt: string | null;
  completedByUser: {
    id: string;
    fullName: string;
  } | null;
  facilityTask: {
    id: string;
    customName: string | null;
  } | null;
}

export interface JobNote {
  id: string;
  noteType: JobNoteType;
  content: string;
  photoUrl: string | null;
  createdAt: string;
  createdByUser: {
    id: string;
    fullName: string;
  };
}

export interface JobActivity {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  performedByUser: {
    id: string;
    fullName: string;
  } | null;
}

export interface CreateJobInput {
  contractId: string;
  facilityId: string;
  accountId: string;
  assignedTeamId?: string | null;
  assignedToUserId?: string | null;
  scheduledDate: string;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  estimatedHours?: number | null;
  notes?: string | null;
}

export interface UpdateJobInput {
  assignedTeamId?: string | null;
  assignedToUserId?: string | null;
  scheduledDate?: string;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  estimatedHours?: number | null;
  notes?: string | null;
}

export interface GenerateJobsInput {
  contractId: string;
  dateFrom: string;
  dateTo: string;
  assignedTeamId?: string | null;
  assignedToUserId?: string | null;
}

export interface SubmitJobSettlementExplanationInput {
  explanation: string;
}

export interface ReviewJobSettlementInput {
  decision: Exclude<JobSettlementStatus, 'ready' | 'needs_review'>;
  reviewNotes?: string | null;
}

export interface CreateJobTaskInput {
  facilityTaskId?: string | null;
  taskName: string;
  description?: string | null;
  estimatedMinutes?: number | null;
}

export interface CreateJobNoteInput {
  noteType?: JobNoteType;
  content: string;
  photoUrl?: string | null;
}
