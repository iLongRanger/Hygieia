export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'canceled';
export type InspectionScore = 'pass' | 'fail' | 'na';
export type InspectionRating = 'excellent' | 'good' | 'fair' | 'poor' | 'failing';

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
  _count: { items: number };
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
  items: InspectionItem[];
  activities: InspectionActivity[];
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
  items: {
    id: string;
    score: InspectionScore;
    rating?: number | null;
    notes?: string | null;
    photoUrl?: string | null;
  }[];
}
