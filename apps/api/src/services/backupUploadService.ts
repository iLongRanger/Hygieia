import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, stat } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export interface R2BackupConfig {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
}

export interface BackupUploadClient {
  send(command: PutObjectCommand): Promise<unknown>;
}

export interface BackupDownloadClient {
  send(command: GetObjectCommand | ListObjectsV2Command): Promise<unknown>;
}

export interface BackupUploadResult {
  bucket: string;
  objectKey: string;
  sizeBytes: number;
}

export interface BackupDownloadResult {
  bucket: string;
  objectKey: string;
  filePath: string;
}

export interface R2BackupObjectSummary {
  objectKey: string;
  lastModified: Date | null;
  sizeBytes: number | null;
}

export function getR2BackupConfig(): R2BackupConfig {
  const bucket =
    process.env.R2_BACKUP_BUCKET_NAME ??
    process.env.R2_BUCKET_NAME ??
    process.env.CLOUDFLARE_R2_BUCKET;
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
  const prefix = process.env.R2_BACKUP_PREFIX ?? 'backups/database';

  if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error(
      'R2 backup storage is not configured. Set R2_BACKUP_BUCKET_NAME or R2_BUCKET_NAME plus R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT or R2_ACCOUNT_ID.'
    );
  }

  return { bucket, endpoint, accessKeyId, secretAccessKey, prefix };
}

export function buildBackupObjectKey(filePath: string, prefix: string): string {
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
  return `${normalizedPrefix}/${path.basename(filePath)}`;
}

export function createR2BackupClient(config: R2BackupConfig): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function uploadBackupFileToR2(
  filePath: string,
  options: {
    config?: R2BackupConfig;
    client?: BackupUploadClient;
  } = {}
): Promise<BackupUploadResult> {
  const config = options.config ?? getR2BackupConfig();
  const client = options.client ?? createR2BackupClient(config);
  const fileInfo = await stat(filePath);
  if (!fileInfo.isFile()) {
    throw new Error(`Backup path is not a file: ${filePath}`);
  }

  const objectKey = buildBackupObjectKey(filePath, config.prefix);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: createReadStream(filePath),
      ContentType: 'application/octet-stream',
      Metadata: {
        originalFilename: path.basename(filePath),
        uploadedAt: new Date().toISOString(),
      },
    })
  );

  return {
    bucket: config.bucket,
    objectKey,
    sizeBytes: fileInfo.size,
  };
}

export async function findLatestR2BackupObjectKey(
  options: {
    config?: R2BackupConfig;
    client?: BackupDownloadClient;
  } = {}
): Promise<string> {
  const config = options.config ?? getR2BackupConfig();
  const client = options.client ?? createR2BackupClient(config);
  const normalizedPrefix = config.prefix.replace(/^\/+|\/+$/g, '');
  const response = (await client.send(
    new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: `${normalizedPrefix}/`,
    })
  )) as {
    Contents?: Array<{
      Key?: string;
      LastModified?: Date;
    }>;
  };

  const latest = (response.Contents ?? [])
    .filter((object) => object.Key && /\.(dump|sql)$/i.test(object.Key))
    .sort(
      (a, b) =>
        (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0)
    )[0];

  if (!latest?.Key) {
    throw new Error(
      `No .dump or .sql backup objects found under ${config.bucket}/${normalizedPrefix}`
    );
  }

  return latest.Key;
}

export async function listR2BackupObjects(
  options: {
    config?: R2BackupConfig;
    client?: BackupDownloadClient;
    limit?: number;
  } = {}
): Promise<R2BackupObjectSummary[]> {
  const config = options.config ?? getR2BackupConfig();
  const client = options.client ?? createR2BackupClient(config);
  const normalizedPrefix = config.prefix.replace(/^\/+|\/+$/g, '');
  const response = (await client.send(
    new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: `${normalizedPrefix}/`,
      MaxKeys: options.limit,
    })
  )) as {
    Contents?: Array<{
      Key?: string;
      LastModified?: Date;
      Size?: number;
    }>;
  };

  return (response.Contents ?? [])
    .filter((object) => object.Key && /\.(dump|sql)$/i.test(object.Key))
    .sort(
      (a, b) =>
        (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0)
    )
    .map((object) => ({
      objectKey: object.Key as string,
      lastModified: object.LastModified ?? null,
      sizeBytes: object.Size ?? null,
    }));
}

export async function downloadBackupFileFromR2(
  objectKey: string,
  outputDir: string,
  options: {
    config?: R2BackupConfig;
    client?: BackupDownloadClient;
  } = {}
): Promise<BackupDownloadResult> {
  const config = options.config ?? getR2BackupConfig();
  const client = options.client ?? createR2BackupClient(config);
  const safeFilename = path.basename(objectKey);
  if (!safeFilename || safeFilename === '.' || safeFilename === '..') {
    throw new Error(`Invalid backup object key: ${objectKey}`);
  }

  await mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, safeFilename);
  const response = (await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
    })
  )) as {
    Body?: NodeJS.ReadableStream | Readable;
  };

  if (!response.Body) {
    throw new Error(`R2 object has no response body: ${objectKey}`);
  }

  await pipeline(response.Body, createWriteStream(filePath));

  return {
    bucket: config.bucket,
    objectKey,
    filePath,
  };
}
