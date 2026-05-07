import '../env.js';
import { cleanupStalePendingPhotoAssets } from '../services/photoStorageService';

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const olderThanHoursInput = getArg('--older-than-hours');
  const olderThanHours = olderThanHoursInput
    ? Number(olderThanHoursInput)
    : undefined;

  const result = await cleanupStalePendingPhotoAssets({
    olderThanHours,
    dryRun: hasFlag('--dry-run'),
  });

  console.log(
    `${result.dryRun ? 'Found' : 'Archived'} ${result.count} stale pending photo record(s) older than ${result.olderThanHours} hour(s).`
  );

  if (result.photos.length > 0) {
    console.table(
      result.photos.map((photo) => ({
        id: photo.id,
        objectKey: photo.objectKey,
        createdAt: photo.createdAt.toISOString(),
      }))
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
