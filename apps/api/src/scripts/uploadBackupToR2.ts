import '../env.js';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { uploadBackupFileToR2 } from '../services/backupUploadService';

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function findLatestBackupFile(directory: string): Promise<string> {
  const entries = await readdir(directory);
  const candidates = await Promise.all(
    entries
      .filter((entry) => /\.(dump|sql)$/i.test(entry))
      .map(async (entry) => {
        const fullPath = path.resolve(directory, entry);
        const info = await stat(fullPath);
        return { fullPath, mtimeMs: info.mtimeMs };
      })
  );

  const latest = candidates.sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
  if (!latest) {
    throw new Error(`No .dump or .sql backup files found in ${directory}`);
  }
  return latest.fullPath;
}

async function main() {
  const repoRoot = path.resolve(process.cwd(), '../..');
  const backupDir = path.resolve(
    getArg('--dir') ?? path.join(repoRoot, 'backups/database')
  );
  const requestedFile = getArg('--file');
  const filePath = path.resolve(
    requestedFile ??
      (hasFlag('--latest') ? await findLatestBackupFile(backupDir) : '')
  );

  if (!requestedFile && !hasFlag('--latest')) {
    throw new Error(
      'Pass --file <path> or --latest. Optional: --dir <backup-directory>.'
    );
  }

  const uploaded = await uploadBackupFileToR2(filePath);
  console.log(
    `Uploaded backup to R2: bucket=${uploaded.bucket} key=${uploaded.objectKey} bytes=${uploaded.sizeBytes}`
  );

  if (hasFlag('--include-manifest')) {
    const parsed = path.parse(filePath);
    const manifestPath = path.join(parsed.dir, `${parsed.name}.manifest.json`);
    const manifestInfo = await stat(manifestPath).catch(() => null);
    if (manifestInfo?.isFile()) {
      const manifestUploaded = await uploadBackupFileToR2(manifestPath);
      console.log(
        `Uploaded manifest to R2: bucket=${manifestUploaded.bucket} key=${manifestUploaded.objectKey} bytes=${manifestUploaded.sizeBytes}`
      );
    } else {
      console.warn(`No matching manifest found at ${manifestPath}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
