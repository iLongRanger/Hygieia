export type PhotoTargetType = 'facility' | 'appointment' | 'inspection' | 'job';

export type PhotoCategory =
  | 'general'
  | 'parking'
  | 'access'
  | 'walkthrough'
  | 'inspection'
  | 'before'
  | 'after'
  | 'issue';

export interface PhotoAsset {
  id: string;
  facilityId: string | null;
  appointmentId: string | null;
  inspectionId: string | null;
  jobId: string | null;
  category: PhotoCategory;
  caption: string | null;
  originalFilename: string | null;
  contentType: string;
  sizeBytes: number;
  status: 'pending' | 'uploaded' | 'archived' | string;
  uploadedAt: string | null;
  createdAt: string;
  archivedAt: string | null;
  uploadedByUser: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface CreatePhotoUploadInput {
  targetType: PhotoTargetType;
  targetId: string;
  category: PhotoCategory;
  caption?: string | null;
  fileName: string;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
}

export interface PhotoUploadResponse {
  photo: PhotoAsset;
  upload: {
    url: string;
    method: 'PUT';
    headers: Record<string, string>;
    expiresIn: number;
  };
}
