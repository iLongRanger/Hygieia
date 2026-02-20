export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'canceled';
export type InspectionScore = 'pass' | 'fail' | 'na';
export type InspectionRating = 'excellent' | 'good' | 'fair' | 'poor' | 'failing';
export type InspectionCorrectiveActionSeverity = 'critical' | 'major' | 'minor';
export type InspectionCorrectiveActionStatus = 'open' | 'in_progress' | 'resolved' | 'verified' | 'canceled';
export type InspectionSignerType = 'supervisor' | 'client';

export interface InspectionTemplate {
  id: string;
  name: string;
  description: string | null;
  facilityTypeFilter: string | null;
  createdAt: string;
  archivedAt: string | null;
  createdByUser: { id: string; fullName: string };
  _count: { items: number; inspections: number };
}

export interface InspectionTemplateDetail {
  id: string;
  name: string;
  description: string | null;
  facilityTypeFilter: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  items: InspectionTemplateItem[];
  createdByUser: { id: string; fullName: string };
  _count: { inspections: number };
}

export interface InspectionTemplateItem {
  id: string;
  category: string;
  itemText: string;
  sortOrder: number;
  weight: number;
}

export interface Inspection {
  id: string;
  inspectionNumber: string;
  status: InspectionStatus;
  scheduledDate: string;
  completedAt: string | null;
  overallScore: string | null;
  overallRating: InspectionRating | null;
  facility: { id: string; name: string };
  account: { id: string; name: string };
  inspectorUser: { id: string; fullName: string };
  template: { id: string; name: string } | null;
  job: { id: string; jobNumber: string } | null;
  openCorrectiveActions: number;
  overdueCorrectiveActions: number;
  signoffCount: number;
  _count: { items: number; correctiveActions: number; signoffs: number };
  createdAt: string;
}

export interface InspectionDetail {
  id: string;
  inspectionNumber: string;
  templateId: string | null;
  jobId: string | null;
  contractId: string | null;
  facilityId: string;
  accountId: string;
  inspectorUserId: string;
  status: InspectionStatus;
  scheduledDate: string;
  completedAt: string | null;
  overallScore: string | null;
  overallRating: InspectionRating | null;
  notes: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  template: { id: string; name: string } | null;
  job: { id: string; jobNumber: string } | null;
  contract: { id: string; contractNumber: string } | null;
  facility: { id: string; name: string };
  account: { id: string; name: string };
  inspectorUser: { id: string; fullName: string };
  appointment?: {
    id: string;
    type: string;
    status: string;
    scheduledStart: string;
    scheduledEnd: string;
  } | null;
  items: InspectionItem[];
  activities: InspectionActivity[];
  correctiveActions: InspectionCorrectiveAction[];
  signoffs: InspectionSignoff[];
}

export interface InspectionItem {
  id: string;
  templateItemId: string | null;
  category: string;
  itemText: string;
  score: InspectionScore | null;
  rating: number | null;
  notes: string | null;
  photoUrl: string | null;
  sortOrder: number;
}

export interface InspectionActivity {
  id: string;
  action: string;
  performedByUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  performedByUser: { id: string; fullName: string } | null;
}

export interface InspectionCorrectiveAction {
  id: string;
  inspectionId: string;
  inspectionItemId: string | null;
  title: string;
  description: string | null;
  severity: InspectionCorrectiveActionSeverity;
  status: InspectionCorrectiveActionStatus;
  dueDate: string | null;
  assigneeUserId: string | null;
  createdByUserId: string;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  followUpInspectionId: string | null;
  createdAt: string;
  updatedAt: string;
  inspectionItem: { id: string; category: string; itemText: string } | null;
  assigneeUser: { id: string; fullName: string } | null;
  createdByUser: { id: string; fullName: string } | null;
  resolvedByUser: { id: string; fullName: string } | null;
  verifiedByUser: { id: string; fullName: string } | null;
}

export interface InspectionSignoff {
  id: string;
  inspectionId: string;
  signerType: InspectionSignerType;
  signerName: string;
  signerTitle: string | null;
  comments: string | null;
  signedByUserId: string | null;
  signedAt: string;
  createdAt: string;
  signedByUser: { id: string; fullName: string } | null;
}

// Input types
export interface CreateInspectionTemplateInput {
  name: string;
  description?: string | null;
  facilityTypeFilter?: string | null;
  items: {
    category: string;
    itemText: string;
    sortOrder?: number;
    weight?: number;
  }[];
}

export interface UpdateInspectionTemplateInput {
  name?: string;
  description?: string | null;
  facilityTypeFilter?: string | null;
  items?: {
    category: string;
    itemText: string;
    sortOrder?: number;
    weight?: number;
  }[];
}

export interface CreateInspectionInput {
  templateId?: string | null;
  jobId?: string | null;
  contractId?: string | null;
  facilityId: string;
  accountId: string;
  inspectorUserId: string;
  scheduledDate: string;
  notes?: string | null;
}

export interface UpdateInspectionInput {
  inspectorUserId?: string;
  scheduledDate?: string;
  notes?: string | null;
  summary?: string | null;
}

export interface CompleteInspectionInput {
  summary?: string | null;
  autoCreateCorrectiveActions?: boolean;
  defaultActionDueDate?: string;
  items: {
    id: string;
    score: InspectionScore;
    rating?: number | null;
    notes?: string | null;
    photoUrl?: string | null;
  }[];
}

export interface CreateInspectionCorrectiveActionInput {
  inspectionItemId?: string | null;
  title: string;
  description?: string | null;
  severity?: InspectionCorrectiveActionSeverity;
  dueDate?: string | null;
  assigneeUserId?: string | null;
}

export interface UpdateInspectionCorrectiveActionInput {
  status?: InspectionCorrectiveActionStatus;
  title?: string;
  description?: string | null;
  severity?: InspectionCorrectiveActionSeverity;
  dueDate?: string | null;
  assigneeUserId?: string | null;
  resolutionNotes?: string | null;
}

export interface CreateInspectionSignoffInput {
  signerType: InspectionSignerType;
  signerName: string;
  signerTitle?: string | null;
  comments?: string | null;
}

export interface CreateReinspectionInput {
  scheduledDate?: string;
  inspectorUserId?: string;
  notes?: string | null;
  actionIds?: string[];
}
