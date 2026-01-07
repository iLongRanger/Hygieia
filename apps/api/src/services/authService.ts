import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { jwtConfig, getJwtSecret } from '../config/jwt';
import { UserRole } from '../types';

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
      jti: uuidv4(),
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
    expiresIn: 15 * 60,
  };
}

export async function login(
  credentials: LoginCredentials
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

  if (!user) {
    return null;
  }

  if (user.status !== 'active') {
    throw new Error('Account is not active');
  }

  const primaryRole = (user.roles[0]?.role?.key as UserRole) || 'cleaner';

  const tokens = generateTokens({
    sub: user.id,
    email: user.email,
    role: primaryRole,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
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
  refreshToken: string
): Promise<AuthTokens | null> {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(refreshToken, secret, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }) as { sub: string; type: string };

    if (decoded.type !== 'refresh') {
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

    return generateTokens({
      sub: user.id,
      email: user.email,
      role: primaryRole,
    });
  } catch {
    return null;
  }
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

  const user = await prisma.user.create({
    data: {
      supabaseUserId: uuidv4(),
      email: email.toLowerCase(),
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
