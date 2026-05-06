import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import {
  archivePhotoAsset,
  completePhotoUpload,
  createPhotoUpload,
  getPhotoViewUrl,
  listPhotoAssets,
  uploadPhotoAsset,
} from '../photos';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const apiGet = api.get as unknown as ReturnType<typeof vi.fn>;
const apiPost = api.post as unknown as ReturnType<typeof vi.fn>;
const apiPatch = api.patch as unknown as ReturnType<typeof vi.fn>;
const apiDelete = api.delete as unknown as ReturnType<typeof vi.fn>;

describe('photos api client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists photo assets by target', async () => {
    apiGet.mockResolvedValue({ data: { data: [{ id: 'photo-1' }] } });

    const result = await listPhotoAssets({
      targetType: 'facility',
      targetId: 'facility-1',
    });

    expect(apiGet).toHaveBeenCalledWith('/photos', {
      params: {
        targetType: 'facility',
        targetId: 'facility-1',
        includeArchived: undefined,
      },
    });
    expect(result).toEqual([{ id: 'photo-1' }]);
  });

  it('creates and completes photo uploads', async () => {
    apiPost.mockResolvedValueOnce({
      data: {
        data: {
          photo: { id: 'photo-1' },
          upload: { url: 'https://r2.example/upload', method: 'PUT', headers: {}, expiresIn: 600 },
        },
      },
    });
    apiPatch.mockResolvedValueOnce({ data: { data: { id: 'photo-1', status: 'uploaded' } } });

    const upload = await createPhotoUpload({
      targetType: 'appointment',
      targetId: 'appointment-1',
      category: 'walkthrough',
      caption: null,
      fileName: 'walkthrough.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 100,
    });
    const completed = await completePhotoUpload('photo-1', { sizeBytes: 100 });

    expect(apiPost).toHaveBeenCalledWith('/photos/upload-url', {
      targetType: 'appointment',
      targetId: 'appointment-1',
      category: 'walkthrough',
      caption: null,
      fileName: 'walkthrough.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 100,
    });
    expect(upload.photo.id).toBe('photo-1');
    expect(apiPatch).toHaveBeenCalledWith('/photos/photo-1/complete', { sizeBytes: 100 });
    expect(completed.status).toBe('uploaded');
  });

  it('creates view urls and archives photos', async () => {
    apiPost.mockResolvedValueOnce({ data: { data: { url: 'https://r2.example/view', expiresIn: 600 } } });
    apiDelete.mockResolvedValueOnce({ data: { data: { id: 'photo-1', status: 'archived' } } });

    await expect(getPhotoViewUrl('photo-1')).resolves.toEqual({
      url: 'https://r2.example/view',
      expiresIn: 600,
    });
    await expect(archivePhotoAsset('photo-1')).resolves.toEqual({
      id: 'photo-1',
      status: 'archived',
    });

    expect(apiPost).toHaveBeenCalledWith('/photos/photo-1/view-url');
    expect(apiDelete).toHaveBeenCalledWith('/photos/photo-1');
  });

  it('uploads the selected file to the signed R2 URL before completing the photo', async () => {
    const file = new File(['image'], 'walkthrough.jpg', { type: 'image/jpeg' });
    apiPost.mockResolvedValueOnce({
      data: {
        data: {
          photo: { id: 'photo-1' },
          upload: {
            url: 'https://r2.example/upload',
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg' },
            expiresIn: 600,
          },
        },
      },
    });
    apiPatch.mockResolvedValueOnce({ data: { data: { id: 'photo-1', status: 'uploaded' } } });
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));

    const result = await uploadPhotoAsset(
      {
        targetType: 'facility',
        targetId: 'facility-1',
        category: 'walkthrough',
        caption: null,
      },
      file
    );

    expect(fetch).toHaveBeenCalledWith('https://r2.example/upload', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: file,
    });
    expect(apiPatch).toHaveBeenCalledWith('/photos/photo-1/complete', { sizeBytes: file.size });
    expect(result.status).toBe('uploaded');
  });
});
