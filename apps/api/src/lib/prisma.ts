import '../env.js';
import { PrismaClient } from '@prisma/client';
import { getResolvedDatabaseUrl } from '../env.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = getResolvedDatabaseUrl();

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured for Prisma');
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
}
