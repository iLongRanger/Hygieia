import { prisma } from '../lib/prisma';

function getTarget(photo: {
  facilityId: string | null;
  appointmentId: string | null;
  inspectionId: string | null;
  jobId: string | null;
}) {
  if (photo.facilityId)
    return { targetType: 'facility', targetId: photo.facilityId };
  if (photo.appointmentId)
    return { targetType: 'appointment', targetId: photo.appointmentId };
  if (photo.inspectionId)
    return { targetType: 'inspection', targetId: photo.inspectionId };
  if (photo.jobId) return { targetType: 'job', targetId: photo.jobId };
  return { targetType: 'unknown', targetId: null };
}

export async function exportPhotoAssetManifest() {
  const photos = await prisma.photoAsset.findMany({
    select: {
      id: true,
      facilityId: true,
      appointmentId: true,
      inspectionId: true,
      jobId: true,
      category: true,
      caption: true,
      bucket: true,
      objectKey: true,
      originalFilename: true,
      contentType: true,
      sizeBytes: true,
      status: true,
      uploadedAt: true,
      archivedAt: true,
      createdAt: true,
      uploadedByUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: [{ bucket: 'asc' }, { objectKey: 'asc' }],
  });

  return {
    metadata: {
      schemaVersion: 1,
      format: 'hygieia-photo-asset-manifest',
      exportedAt: new Date().toISOString(),
      totalCount: photos.length,
    },
    photos: photos.map((photo) => {
      const target = getTarget(photo);
      return {
        id: photo.id,
        ...target,
        category: photo.category,
        caption: photo.caption,
        bucket: photo.bucket,
        objectKey: photo.objectKey,
        originalFilename: photo.originalFilename,
        contentType: photo.contentType,
        sizeBytes: photo.sizeBytes,
        status: photo.status,
        uploadedAt: photo.uploadedAt?.toISOString() ?? null,
        archivedAt: photo.archivedAt?.toISOString() ?? null,
        createdAt: photo.createdAt.toISOString(),
        uploadedByUser: photo.uploadedByUser,
      };
    }),
  };
}
