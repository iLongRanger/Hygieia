import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { logAuthEvent } from '../lib/logger';

const TOKEN_BLACKLIST_PREFIX = 'token:revoked:';
const TOKEN_BLACKLIST_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export interface TokenMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export async function storeRefreshToken(
  userId: string,
  jti: string,
  expiresAt: Date,
  metadata: TokenMetadata = {}
): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenJti: jti,
      expiresAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    },
  });

  logAuthEvent('refresh_token_created', {
    userId,
    jti,
    expiresAt: expiresAt.toISOString(),
  });
}

export async function isTokenRevoked(jti: string): Promise<boolean> {
  // Check Redis blacklist first (faster)
  const blacklisted = await redis.get(`${TOKEN_BLACKLIST_PREFIX}${jti}`);
  if (blacklisted) {
    return true;
  }

  // Check database
  const token = await prisma.refreshToken.findUnique({
    where: { tokenJti: jti },
    select: { revokedAt: true },
  });

  if (!token) {
    // Token not found in DB - could be old token before system was implemented
    // Allow it to pass (will fail JWT verification anyway if invalid)
    return false;
  }

  if (token.revokedAt) {
    // Cache the revocation in Redis for faster future lookups
    await redis.setex(`${TOKEN_BLACKLIST_PREFIX}${jti}`, TOKEN_BLACKLIST_TTL, '1');
    return true;
  }

  return false;
}

export type RevokeReason = 'logout' | 'logout_all' | 'password_change' | 'admin_action' | 'security';

export async function revokeToken(
  jti: string,
  reason: RevokeReason
): Promise<boolean> {
  const token = await prisma.refreshToken.findUnique({
    where: { tokenJti: jti },
  });

  if (!token) {
    return false;
  }

  await prisma.refreshToken.update({
    where: { tokenJti: jti },
    data: {
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });

  // Add to Redis blacklist
  await redis.setex(`${TOKEN_BLACKLIST_PREFIX}${jti}`, TOKEN_BLACKLIST_TTL, '1');

  logAuthEvent('refresh_token_revoked', {
    jti,
    reason,
    userId: token.userId,
  });

  return true;
}

export async function revokeAllUserTokens(
  userId: string,
  reason: RevokeReason
): Promise<number> {
  const tokens = await prisma.refreshToken.findMany({
    where: {
      userId,
      revokedAt: null,
    },
    select: { tokenJti: true },
  });

  if (tokens.length === 0) {
    return 0;
  }

  // Update all tokens in database
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });

  // Add all to Redis blacklist
  const pipeline = redis.pipeline();
  for (const token of tokens) {
    pipeline.setex(`${TOKEN_BLACKLIST_PREFIX}${token.tokenJti}`, TOKEN_BLACKLIST_TTL, '1');
  }
  await pipeline.exec();

  logAuthEvent('all_user_tokens_revoked', {
    userId,
    reason,
    count: tokens.length,
  });

  return tokens.length;
}

export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  if (result.count > 0) {
    logAuthEvent('expired_tokens_cleaned', {
      count: result.count,
    });
  }

  return result.count;
}

export async function getTokenByJti(jti: string) {
  return prisma.refreshToken.findUnique({
    where: { tokenJti: jti },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          status: true,
        },
      },
    },
  });
}
