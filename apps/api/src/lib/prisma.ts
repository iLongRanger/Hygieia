import '../env.js';
import { PrismaClient } from '@prisma/client';
import { getResolvedDatabaseUrl } from '../env.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl: string | undefined;
};

const databaseUrl = getResolvedDatabaseUrl();

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured for Prisma');
}

if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
  throw new Error(
    `DATABASE_URL must use postgresql:// protocol, got: ${databaseUrl.split('://')[0]}://`
  );
}

// Set process.env.DATABASE_URL BEFORE constructing PrismaClient so the
// Prisma query-engine never sees a stale / prisma:// value.
process.env.DATABASE_URL = databaseUrl;

// Invalidate the cached client when the resolved URL changes (e.g. after
// prisma generate triggers a tsx-watch hot-reload).
if (globalForPrisma.prismaUrl && globalForPrisma.prismaUrl !== databaseUrl) {
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaUrl = databaseUrl;
}
