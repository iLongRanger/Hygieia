import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { jwtConfig, getJwtSecret } from '../config/jwt';
import { UserRole } from '../types';
import {
  storeRefreshToken,
  isTokenRevoked,
  revokeToken,
  revokeAllUserTokens,
  type TokenMetadata,
  type RevokeReason,
} from './tokenService';
import { logAuthEvent } from '../lib/logger';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenJti: string;
  expiresIn: number;
}

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokens(payload: TokenPayload): AuthTokens {
  const secret = getJwtSecret();
  const jti = uuidv4();

  const accessToken = jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    },
    secret,
    {
      algorithm: jwtConfig.algorithm,
      expiresIn: '15m',
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }
  );

  const refreshToken = jwt.sign(
    {
      sub: payload.sub,
      type: 'refresh',
      jti,
    },
    secret,
    {
      algorithm: jwtConfig.algorithm,
      expiresIn: '7d',
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }
  );

  return {
    accessToken,
    refreshToken,
    refreshTokenJti: jti,
    expiresIn: 15 * 60,
  };
}

export interface LoginOptions {
  credentials: LoginCredentials;
  metadata?: TokenMetadata;
}

export async function login(
  credentials: LoginCredentials,
  metadata: TokenMetadata = {}
): Promise<{ tokens: AuthTokens; user: UserInfo } | null> {
  const user = await prisma.user.findUnique({
    where: { email: credentials.email.toLowerCase() },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user || !user.passwordHash) {
    logAuthEvent('login_failed', {
      email: credentials.email,
      reason: 'user_not_found',
    });
    return null;
  }

  const isValidPassword = await verifyPassword(
    credentials.password,
    user.passwordHash
  );

  if (!isValidPassword) {
    logAuthEvent('login_failed', {
      userId: user.id,
      reason: 'invalid_password',
    });
    return null;
  }

  if (user.status !== 'active') {
    logAuthEvent('login_failed', {
      userId: user.id,
      reason: 'account_inactive',
    });
    throw new Error('Account is not active');
  }

  const primaryRole = (user.roles[0]?.role?.key as UserRole) || 'cleaner';

  const tokens = generateTokens({
    sub: user.id,
    email: user.email,
    role: primaryRole,
  });

  // Store refresh token for revocation tracking
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await storeRefreshToken(user.id, tokens.refreshTokenJti, expiresAt, metadata);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logAuthEvent('login_success', {
    userId: user.id,
  });

  return {
    tokens,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: primaryRole,
    },
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  metadata: TokenMetadata = {}
): Promise<AuthTokens | null> {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(refreshToken, secret, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }) as { sub: string; type: string; jti: string };

    if (decoded.type !== 'refresh') {
      return null;
    }

    // Check if token has been revoked
    if (decoded.jti && (await isTokenRevoked(decoded.jti))) {
      logAuthEvent('refresh_token_rejected', {
        jti: decoded.jti,
        reason: 'revoked',
      });
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.status !== 'active') {
      return null;
    }

    const primaryRole = (user.roles[0]?.role?.key as UserRole) || 'cleaner';

    const tokens = generateTokens({
      sub: user.id,
      email: user.email,
      role: primaryRole,
    });

    // Store new refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await storeRefreshToken(user.id, tokens.refreshTokenJti, expiresAt, metadata);

    // Revoke old token (token rotation)
    if (decoded.jti) {
      await revokeToken(decoded.jti, 'logout');
    }

    return tokens;
  } catch {
    return null;
  }
}

export async function logout(refreshToken: string): Promise<boolean> {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(refreshToken, secret, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }) as { sub: string; type: string; jti: string };

    if (decoded.type !== 'refresh' || !decoded.jti) {
      return false;
    }

    await revokeToken(decoded.jti, 'logout');
    return true;
  } catch {
    // Token might be expired or invalid, but we still consider logout successful
    return true;
  }
}

export async function logoutAll(userId: string): Promise<number> {
  return revokeAllUserTokens(userId, 'logout_all');
}

export async function getUserById(id: string): Promise<UserInfo | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const primaryRole = (user.roles[0]?.role?.key as UserRole) || 'cleaner';

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: primaryRole,
  };
}

export async function createDevUser(
  email: string,
  fullName: string,
  password: string,
  role: UserRole = 'owner'
): Promise<{ user: UserInfo; tokens: AuthTokens }> {
  let roleRecord = await prisma.role.findUnique({
    where: { key: role },
  });

  if (!roleRecord) {
    roleRecord = await prisma.role.create({
      data: {
        key: role,
        label: role.charAt(0).toUpperCase() + role.slice(1),
        description: `${role} role`,
        isSystemRole: true,
        permissions: {},
      },
    });
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      fullName,
      status: 'active',
      roles: {
        create: {
          roleId: roleRecord.id,
        },
      },
    },
  });

  const tokens = generateTokens({
    sub: user.id,
    email: user.email,
    role,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role,
    },
    tokens,
  };
}
