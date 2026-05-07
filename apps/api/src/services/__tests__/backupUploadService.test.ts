import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { stat } from 'fs/promises';
import {
  buildBackupObjectKey,
  getR2BackupConfig,
  uploadBackupFileToR2,
} from '../backupUploadService';

jest.mock('fs/promises', () => ({
  stat: jest.fn(),
}));

jest.mock('fs', () => ({
  createReadStream: jest.fn(() => 'backup-stream'),
}));

describe('backupUploadService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.R2_BACKUP_BUCKET_NAME;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_ENDPOINT;
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_BACKUP_PREFIX;
    (stat as jest.Mock).mockResolvedValue({
      isFile: () => true,
      size: 4096,
    });
  });

  it('builds object keys under the configured prefix', () => {
    expect(
      buildBackupObjectKey(
        'A:/Projects/Hygieia/backups/database/hygieia.dump',
        '/backup/db/'
      )
    ).toBe('backup/db/hygieia.dump');
  });

  it('loads backup R2 config from environment', () => {
    process.env.R2_BACKUP_BUCKET_NAME = 'hygieia-backups';
    process.env.R2_ACCESS_KEY_ID = 'access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
    process.env.R2_ACCOUNT_ID = 'account-id';
    process.env.R2_BACKUP_PREFIX = 'db';

    expect(getR2BackupConfig()).toEqual({
      bucket: 'hygieia-backups',
      endpoint: 'https://account-id.r2.cloudflarestorage.com',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      prefix: 'db',
    });
  });

  it('uploads a backup file to R2', async () => {
    const client = {
      send: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    };

    const result = await uploadBackupFileToR2('backups/database/hygieia.dump', {
      config: {
        bucket: 'hygieia-backups',
        endpoint: 'https://account.r2.cloudflarestorage.com',
        accessKeyId: 'access-key',
        secretAccessKey: 'secret-key',
        prefix: 'backups/database',
      },
      client,
    });

    expect(client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(result).toEqual({
      bucket: 'hygieia-backups',
      objectKey: 'backups/database/hygieia.dump',
      sizeBytes: 4096,
    });
  });
});
