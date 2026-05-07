import '../env.js';
import { listR2BackupObjects } from '../services/backupUploadService';

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const limitInput = getArg('--limit');
  const limit = limitInput ? Number(limitInput) : 25;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('--limit must be a positive integer.');
  }

  const backups = await listR2BackupObjects({ limit });
  if (backups.length === 0) {
    console.log('No R2 database backups found.');
    return;
  }

  console.table(
    backups.map((backup) => ({
      objectKey: backup.objectKey,
      lastModified: backup.lastModified?.toISOString() ?? '',
      sizeBytes: backup.sizeBytes ?? '',
    }))
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
