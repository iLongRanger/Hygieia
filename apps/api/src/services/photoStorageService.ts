import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';
import { prisma } from '../lib/prisma';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../middleware/errorHandler';
import { ensureOwnershipAccess } from '../middleware/ownership';
import type { ResourceType } from '../middleware/ownership';
import type { AuthenticatedUser } from '../types/express';
import { PERMISSIONS } from '../types';
import { hasPermission } from '../types/roles';
import type {
  CreatePhotoUploadInput,
  PhotoTargetType,
  UpdatePhotoAssetInput,
} from '../schemas/photoAsset';

const UPLOAD_URL_EXPIRES_SECONDS = 10 * 60;
const VIEW_URL_EXPIRES_SECONDS = 10 * 60;
const DEFAULT_PENDING_UPLOAD_RETENTION_HOURS = 24;

const targetPermissionMap: Record<
  PhotoTargetType,
  { read: string; write: string }
> = {
  facility: {
    read: PERMISSIONS.FACILITIES_READ,
    write: PERMISSIONS.FACILITIES_WRITE,
  },
  appointment: {
    read: PERMISSIONS.APPOINTMENTS_READ,
    write: PERMISSIONS.APPOINTMENTS_WRITE,
  },
  inspection: {
    read: PERMISSIONS.INSPECTIONS_READ,
    write: PERMISSIONS.INSPECTIONS_WRITE,
  },
  job: { read: PERMISSIONS.JOBS_READ, write: PERMISSIONS.JOBS_WRITE },
};

const targetForeignKeyMap: Record<
  PhotoTargetType,
  'facilityId' | 'appointmentId' | 'inspectionId' | 'jobId'
> = {
  facility: 'facilityId',
  appointment: 'appointmentId',
  inspection: 'inspectionId',
  job: 'jobId',
};

function getR2Config() {
  const bucket = process.env.R2_BUCKET_NAME ?? process.env.CLOUDFLARE_R2_BUCKET;
  const accessKeyId =
    process.env.R2_ACCESS_KEY_ID ?? process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.R2_SECRET_ACCESS_KEY ??
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const endpoint =
    process.env.R2_ENDPOINT ||
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined);

  if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) {
    throw new BadRequestError(
      'Photo storage is not configured. Set R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT or R2_ACCOUNT_ID.'
    );
  }

  return { bucket, accessKeyId, secretAccessKey, endpoint };
}

function createR2Client() {
  const config = getR2Config();
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function safeFileExtension(fileName: string, contentType: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return ext;
  if (contentType === 'image/png') return '.png';
  if (contentType === 'image/webp') return '.webp';
  return '.jpg';
}

function buildObjectKey(input: CreatePhotoUploadInput): string {
  const yyyyMm = new Date().toISOString().slice(0, 7);
  const ext = safeFileExtension(input.fileName, input.contentType);
  return [
    'photo-assets',
    input.targetType,
    input.targetId,
    yyyyMm,
    `${randomUUID()}${ext}`,
  ].join('/');
}

function assertPermission(
  user: AuthenticatedUser,
  targetType: PhotoTargetType,
  mode: 'read' | 'write'
) {
  const permission = targetPermissionMap[targetType][mode];
  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError(`Missing required permission: ${permission}`);
  }
}

async function ensureTargetAccess(
  user: AuthenticatedUser,
  targetType: PhotoTargetType,
  targetId: string
) {
  if (targetType === 'inspection') {
    const inspection = await prisma.inspection.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        appointment: { select: { id: true } },
        facilityId: true,
      },
    });
    if (!inspection) throw new NotFoundError('Inspection not found');
    if (inspection.appointment?.id) {
      await ensureOwnershipAccess(user, {
        resourceType: 'appointment',
        resourceId: inspection.appointment.id,
      });
    } else {
      await ensureOwnershipAccess(user, {
        resourceType: 'facility',
        resourceId: inspection.facilityId,
      });
    }
    return;
  }

  if (targetType === 'job') {
    const job = await prisma.job.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        facilityId: true,
        assignedTeamId: true,
        assignedToUserId: true,
      },
    });
    if (!job) throw new NotFoundError('Job not found');
    if (user.role === 'cleaner' && job.assignedToUserId !== user.id) {
      throw new ForbiddenError('Insufficient permissions');
    }
    if (
      user.role === 'subcontractor' &&
      (!user.teamId || job.assignedTeamId !== user.teamId)
    ) {
      throw new ForbiddenError('Insufficient permissions');
    }
    if (user.role === 'manager') {
      await ensureOwnershipAccess(user, {
        resourceType: 'facility',
        resourceId: job.facilityId,
      });
    }
    return;
  }

  const resourceType: ResourceType = targetType;
  await ensureOwnershipAccess(user, { resourceType, resourceId: targetId });
}

function toPhotoView(photo: {
  id: string;
  facilityId: string | null;
  appointmentId: string | null;
  inspectionId: string | null;
  jobId: string | null;
  category: string;
  caption: string | null;
  originalFilename: string | null;
  contentType: string;
  sizeBytes: number;
  status: string;
  uploadedAt: Date | null;
  createdAt: Date;
  archivedAt: Date | null;
  uploadedByUser: { id: string; fullName: string; email: string };
}) {
  return photo;
}

export async function listPhotoAssets(
  user: AuthenticatedUser,
  input: {
    targetType: PhotoTargetType;
    targetId: string;
    includeArchived?: boolean;
  }
) {
  assertPermission(user, input.targetType, 'read');
  await ensureTargetAccess(user, input.targetType, input.targetId);

  const parentKey = targetForeignKeyMap[input.targetType];
  const photos = await prisma.photoAsset.findMany({
    where: {
      [parentKey]: input.targetId,
      ...(input.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: { createdAt: 'desc' },
    select: photoSelect,
  });

  return photos.map(toPhotoView);
}

const photoSelect = {
  id: true,
  facilityId: true,
  appointmentId: true,
  inspectionId: true,
  jobId: true,
  category: true,
  caption: true,
  originalFilename: true,
  contentType: true,
  sizeBytes: true,
  status: true,
  uploadedAt: true,
  createdAt: true,
  archivedAt: true,
  uploadedByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const;

export async function createPhotoUpload(
  user: AuthenticatedUser,
  input: CreatePhotoUploadInput
) {
  assertPermission(user, input.targetType, 'write');
  await ensureTargetAccess(user, input.targetType, input.targetId);

  const config = getR2Config();
  const client = createR2Client();
  const objectKey = buildObjectKey(input);
  const parentKey = targetForeignKeyMap[input.targetType];

  const photo = await prisma.photoAsset.create({
    data: {
      [parentKey]: input.targetId,
      category: input.category,
      caption: input.caption ?? null,
      bucket: config.bucket,
      objectKey,
      originalFilename: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      uploadedByUserId: user.id,
    },
    select: photoSelect,
  });

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      ContentType: input.contentType,
    }),
    { expiresIn: UPLOAD_URL_EXPIRES_SECONDS }
  );

  return {
    photo: toPhotoView(photo),
    upload: {
      url: uploadUrl,
      method: 'PUT',
      headers: {
        'Content-Type': input.contentType,
      },
      expiresIn: UPLOAD_URL_EXPIRES_SECONDS,
    },
  };
}

async function getPhotoForUser(
  user: AuthenticatedUser,
  photoId: string,
  mode: 'read' | 'write'
) {
  const photo = await prisma.photoAsset.findUnique({
    where: { id: photoId },
    select: {
      ...photoSelect,
      bucket: true,
      objectKey: true,
    },
  });
  if (!photo || photo.archivedAt) throw new NotFoundError('Photo not found');

  const targetType = photo.facilityId
    ? 'facility'
    : photo.appointmentId
      ? 'appointment'
      : photo.inspectionId
        ? 'inspection'
        : 'job';
  const targetId =
    photo.facilityId ??
    photo.appointmentId ??
    photo.inspectionId ??
    photo.jobId;
  if (!targetId) throw new NotFoundError('Photo target not found');

  assertPermission(user, targetType, mode);
  await ensureTargetAccess(user, targetType, targetId);
  return photo;
}

export async function completePhotoUpload(
  user: AuthenticatedUser,
  photoId: string,
  sizeBytes?: number
) {
  await getPhotoForUser(user, photoId, 'write');
  const photo = await prisma.photoAsset.update({
    where: { id: photoId },
    data: {
      status: 'uploaded',
      uploadedAt: new Date(),
      ...(sizeBytes ? { sizeBytes } : {}),
    },
    select: photoSelect,
  });
  return toPhotoView(photo);
}

export async function updatePhotoAsset(
  user: AuthenticatedUser,
  photoId: string,
  input: UpdatePhotoAssetInput
) {
  await getPhotoForUser(user, photoId, 'write');
  const photo = await prisma.photoAsset.update({
    where: { id: photoId },
    data: {
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.caption !== undefined ? { caption: input.caption } : {}),
    },
    select: photoSelect,
  });
  return toPhotoView(photo);
}

export async function archivePhotoAsset(
  user: AuthenticatedUser,
  photoId: string
) {
  await getPhotoForUser(user, photoId, 'write');
  const photo = await prisma.photoAsset.update({
    where: { id: photoId },
    data: {
      archivedAt: new Date(),
      status: 'archived',
    },
    select: photoSelect,
  });
  return toPhotoView(photo);
}

export async function createPhotoViewUrl(
  user: AuthenticatedUser,
  photoId: string
) {
  const photo = await getPhotoForUser(user, photoId, 'read');
  const client = createR2Client();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: photo.bucket,
      Key: photo.objectKey,
    }),
    { expiresIn: VIEW_URL_EXPIRES_SECONDS }
  );

  return { url, expiresIn: VIEW_URL_EXPIRES_SECONDS };
}

export async function cleanupStalePendingPhotoAssets(
  options: {
    olderThanHours?: number;
    dryRun?: boolean;
  } = {}
) {
  const olderThanHours =
    options.olderThanHours ?? DEFAULT_PENDING_UPLOAD_RETENTION_HOURS;
  if (!Number.isFinite(olderThanHours) || olderThanHours <= 0) {
    throw new BadRequestError('olderThanHours must be greater than 0');
  }

  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const stalePhotos = await prisma.photoAsset.findMany({
    where: {
      status: 'pending',
      uploadedAt: null,
      archivedAt: null,
      createdAt: { lt: cutoff },
    },
    select: {
      id: true,
      objectKey: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!options.dryRun && stalePhotos.length > 0) {
    await prisma.photoAsset.updateMany({
      where: {
        id: { in: stalePhotos.map((photo) => photo.id) },
        status: 'pending',
        uploadedAt: null,
        archivedAt: null,
      },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    });
  }

  return {
    dryRun: options.dryRun ?? false,
    olderThanHours,
    cutoff,
    count: stalePhotos.length,
    photos: stalePhotos,
  };
}
