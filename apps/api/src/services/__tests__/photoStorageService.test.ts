import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../../lib/prisma';
import { ensureOwnershipAccess } from '../../middleware/ownership';
import {
  cleanupStalePendingPhotoAssets,
  createPhotoUpload,
  listPhotoAssets,
  completePhotoUpload,
} from '../photoStorageService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    photoAsset: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    inspection: {
      findUnique: jest.fn(),
    },
    job: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../middleware/ownership', () => ({
  ensureOwnershipAccess: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  __esModule: true,
  getSignedUrl: jest.fn(),
}));

const mockUser = {
  id: 'user-1',
  email: 'owner@example.com',
  role: 'owner',
  teamId: null,
};

const mockPhoto = {
  id: 'photo-1',
  facilityId: 'facility-1',
  appointmentId: null,
  inspectionId: null,
  jobId: null,
  category: 'walkthrough',
  caption: 'Front access',
  originalFilename: 'front.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 1000,
  status: 'pending',
  uploadedAt: null,
  createdAt: new Date('2026-05-06T10:00:00.000Z'),
  archivedAt: null,
  uploadedByUser: {
    id: 'user-1',
    fullName: 'Owner User',
    email: 'owner@example.com',
  },
};

describe('photoStorageService', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    process.env.R2_BUCKET_NAME = 'hygieia-photos';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
    process.env.R2_ENDPOINT = 'https://account.r2.cloudflarestorage.com';
    (getSignedUrl as jest.Mock).mockResolvedValue(
      'https://r2.example/upload-url'
    );
  });

  it('creates a facility photo upload and returns a signed R2 PUT URL', async () => {
    (prisma.photoAsset.create as jest.Mock).mockResolvedValue(mockPhoto);

    const result = await createPhotoUpload(mockUser, {
      targetType: 'facility',
      targetId: 'facility-1',
      category: 'walkthrough',
      caption: 'Front access',
      fileName: 'front.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 1000,
    });

    expect(ensureOwnershipAccess).toHaveBeenCalledWith(mockUser, {
      resourceType: 'facility',
      resourceId: 'facility-1',
    });
    expect(prisma.photoAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          facilityId: 'facility-1',
          bucket: 'hygieia-photos',
          originalFilename: 'front.jpg',
          uploadedByUserId: 'user-1',
        }),
      })
    );
    expect(result.upload).toEqual(
      expect.objectContaining({
        url: 'https://r2.example/upload-url',
        method: 'PUT',
      })
    );
  });

  it('lists photos scoped to the requested target', async () => {
    (prisma.photoAsset.findMany as jest.Mock).mockResolvedValue([mockPhoto]);

    const result = await listPhotoAssets(mockUser, {
      targetType: 'facility',
      targetId: 'facility-1',
    });

    expect(prisma.photoAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          facilityId: 'facility-1',
          archivedAt: null,
        },
      })
    );
    expect(result).toEqual([mockPhoto]);
  });

  it('marks an uploaded photo as completed after access validation', async () => {
    (prisma.photoAsset.findUnique as jest.Mock).mockResolvedValue({
      ...mockPhoto,
      bucket: 'hygieia-photos',
      objectKey: 'photo-assets/facility/facility-1/2026-05/photo-1.jpg',
    });
    (prisma.photoAsset.update as jest.Mock).mockResolvedValue({
      ...mockPhoto,
      status: 'uploaded',
      uploadedAt: new Date('2026-05-06T10:05:00.000Z'),
    });

    const result = await completePhotoUpload(mockUser, 'photo-1', 1200);

    expect(prisma.photoAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'photo-1' },
        data: expect.objectContaining({
          status: 'uploaded',
          sizeBytes: 1200,
        }),
      })
    );
    expect(result.status).toBe('uploaded');
  });

  it('previews stale pending photo cleanup without archiving records', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-07T12:00:00.000Z'));
    (prisma.photoAsset.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'photo-stale',
        objectKey: 'photo-assets/facility/facility-1/2026-05/stale.jpg',
        createdAt: new Date('2026-05-06T10:00:00.000Z'),
      },
    ]);

    const result = await cleanupStalePendingPhotoAssets({
      olderThanHours: 24,
      dryRun: true,
    });

    expect(prisma.photoAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'pending',
          uploadedAt: null,
          archivedAt: null,
          createdAt: { lt: new Date('2026-05-06T12:00:00.000Z') },
        }),
      })
    );
    expect(prisma.photoAsset.updateMany).not.toHaveBeenCalled();
    expect(result.count).toBe(1);
    jest.useRealTimers();
  });

  it('archives stale pending photo records', async () => {
    (prisma.photoAsset.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'photo-stale',
        objectKey: 'photo-assets/facility/facility-1/2026-05/stale.jpg',
        createdAt: new Date('2026-05-06T10:00:00.000Z'),
      },
    ]);
    (prisma.photoAsset.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    await cleanupStalePendingPhotoAssets({ olderThanHours: 24 });

    expect(prisma.photoAsset.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['photo-stale'] },
          status: 'pending',
          uploadedAt: null,
          archivedAt: null,
        }),
        data: expect.objectContaining({
          status: 'archived',
          archivedAt: expect.any(Date),
        }),
      })
    );
  });
});
