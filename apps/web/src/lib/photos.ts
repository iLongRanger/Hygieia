import api from './api';
import type {
  CreatePhotoUploadInput,
  PhotoAsset,
  PhotoTargetType,
  PhotoUploadResponse,
} from '../types/photo';

export async function listPhotoAssets(params: {
  targetType: PhotoTargetType;
  targetId: string;
  includeArchived?: boolean;
}): Promise<PhotoAsset[]> {
  const response = await api.get('/photos', {
    params: {
      ...params,
      includeArchived:
        params.includeArchived !== undefined ? String(params.includeArchived) : undefined,
    },
  });
  return response.data.data;
}

export async function createPhotoUpload(
  payload: CreatePhotoUploadInput
): Promise<PhotoUploadResponse> {
  const response = await api.post('/photos/upload-url', payload);
  return response.data.data;
}

export async function completePhotoUpload(
  id: string,
  payload?: { sizeBytes?: number }
): Promise<PhotoAsset> {
  const response = await api.patch(`/photos/${id}/complete`, payload ?? {});
  return response.data.data;
}

export async function getPhotoViewUrl(id: string): Promise<{ url: string; expiresIn: number }> {
  const response = await api.post(`/photos/${id}/view-url`);
  return response.data.data;
}

export async function archivePhotoAsset(id: string): Promise<PhotoAsset> {
  const response = await api.delete(`/photos/${id}`);
  return response.data.data;
}

export async function uploadPhotoAsset(
  payload: Omit<CreatePhotoUploadInput, 'fileName' | 'contentType' | 'sizeBytes'>,
  file: File
): Promise<PhotoAsset> {
  const upload = await createPhotoUpload({
    ...payload,
    fileName: file.name,
    contentType: file.type as CreatePhotoUploadInput['contentType'],
    sizeBytes: file.size,
  });

  const uploadResponse = await fetch(upload.upload.url, {
    method: upload.upload.method,
    headers: upload.upload.headers,
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error('Photo storage upload failed');
  }

  return completePhotoUpload(upload.photo.id, { sizeBytes: file.size });
}
