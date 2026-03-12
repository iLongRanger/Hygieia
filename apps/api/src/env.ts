import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPathCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../../../.env'),
];
const envPath = envPathCandidates.find((candidate) => fs.existsSync(candidate)) ?? envPathCandidates[0];
const shouldOverrideProcessEnv = process.env.NODE_ENV !== 'production';
const result = dotenv.config({ path: envPath, override: shouldOverrideProcessEnv });
const loadedEnv = result.parsed ?? {};

function getProtocol(url?: string): string {
  return url?.split('://')[0] || 'missing';
}

function isPrismaProxyUrl(url?: string): boolean {
  return typeof url === 'string' && (url.startsWith('prisma://') || url.startsWith('prisma+postgres://'));
}

function isDirectDatabaseUrl(url?: string): boolean {
  return typeof url === 'string' && /^(postgres|postgresql):\/\//.test(url);
}

export function getResolvedDatabaseUrl(): string | undefined {
  const processDatabaseUrl = process.env.DATABASE_URL;
  const fileDatabaseUrl = loadedEnv.DATABASE_URL;

  if (isDirectDatabaseUrl(processDatabaseUrl)) {
    return processDatabaseUrl;
  }

  if (isPrismaProxyUrl(processDatabaseUrl) && isDirectDatabaseUrl(fileDatabaseUrl)) {
    console.warn(
      `[dotenv] DATABASE_URL is ${getProtocol(processDatabaseUrl)} in process env; using direct ${getProtocol(fileDatabaseUrl)} URL from ${envPath} for local Prisma runtime`
    );
    return fileDatabaseUrl;
  }

  return processDatabaseUrl ?? fileDatabaseUrl;
}

const resolvedDatabaseUrl = getResolvedDatabaseUrl();

if (result.error) {
  console.warn(`[dotenv] Failed to load ${envPath}:`, result.error.message);
} else {
  console.log(`[dotenv] Loaded env from ${envPath}`);
  console.log(
    `[dotenv] DATABASE_URL protocol: ${getProtocol(process.env.DATABASE_URL)}, resolved: ${getProtocol(resolvedDatabaseUrl)}, override: ${shouldOverrideProcessEnv}`
  );
  console.log(`[dotenv] RESEND_API_KEY set: ${!!process.env.RESEND_API_KEY}, EMAIL_FROM: ${process.env.EMAIL_FROM}`);
}
