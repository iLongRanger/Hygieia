import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import { exportPhotoAssetManifest } from '../photoManifestExportService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    photoAsset: {
      findMany: jest.fn(),
    },
  },
}));

describe('photoManifestExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports R2 object metadata with target references', async () => {
    (prisma.photoAsset.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'photo-1',
        facilityId: 'facility-1',
        appointmentId: null,
        inspectionId: null,
        jobId: null,
        category: 'walkthrough',
        caption: 'Kitchen before',
        bucket: 'hygieia',
        objectKey: 'photo-assets/facility/facility-1/2026-05/photo.jpg',
        originalFilename: 'photo.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 1024,
        status: 'uploaded',
        uploadedAt: new Date('2026-05-01T12:00:00.000Z'),
        archivedAt: null,
        createdAt: new Date('2026-05-01T11:59:00.000Z'),
        uploadedByUser: {
          id: 'user-1',
          fullName: 'Admin User',
          email: 'admin@example.com',
        },
      },
    ]);

    const result = await exportPhotoAssetManifest();

    expect(result.metadata.format).toBe('hygieia-photo-asset-manifest');
    expect(result.metadata.totalCount).toBe(1);
    expect(result.photos[0]).toEqual(
      expect.objectContaining({
        targetType: 'facility',
        targetId: 'facility-1',
        bucket: 'hygieia',
        objectKey: 'photo-assets/facility/facility-1/2026-05/photo.jpg',
        uploadedAt: '2026-05-01T12:00:00.000Z',
      })
    );
  });
});
