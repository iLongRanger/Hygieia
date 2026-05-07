import '../env.js';
import path from 'path';
import {
  downloadBackupFileFromR2,
  findLatestR2BackupObjectKey,
} from '../services/backupUploadService';

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const repoRoot = path.resolve(process.cwd(), '../..');
  const outputDir = path.resolve(
    getArg('--dir') ?? path.join(repoRoot, 'backups/database/restored')
  );
  const requestedKey = getArg('--key');

  if (!requestedKey && !hasFlag('--latest')) {
    throw new Error(
      'Pass --key <r2-object-key> or --latest. Optional: --dir <output-directory>.'
    );
  }

  const objectKey = requestedKey ?? (await findLatestR2BackupObjectKey());
  const downloaded = await downloadBackupFileFromR2(objectKey, outputDir);

  console.log(
    `Downloaded backup from R2: bucket=${downloaded.bucket} key=${downloaded.objectKey} file=${downloaded.filePath}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
