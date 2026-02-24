export type JobType = 'scheduled_service' | 'special_job';
export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'canceled' | 'missed';
export type JobTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type JobNoteType = 'general' | 'issue' | 'photo';
export type WorkforceAssignmentType = 'unassigned' | 'internal_employee' | 'subcontractor_team';

export interface Job {
  id: string;
  jobNumber: string;
  jobType: JobType;
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
  };
  facility: {
    id: string;
    name: string;
  };
  account: {
    id: string;
    name: string;
  };
  assignedTeam: {
    id: string;
    name: string;
  } | null;
  assignedToUser: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  workforceAssignmentType?: WorkforceAssignmentType;
  createdByUser: {
    id: string;
    fullName: string;
  };
}

export interface JobDetail extends Job {
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
