import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { jwtConfig, getJwtSecret } from '../config/jwt';
import { UserRole, isValidRole, resolveHighestRole } from '../types';
import {
  storeRefreshToken,
  isTokenRevoked,
  revokeToken,
  revokeAllUserTokens,
  type TokenMetadata,
} from './tokenService';
import { logAuthEvent } from '../lib/logger';
import { UnauthorizedError } from '../middleware/errorHandler';
import { validatePassword } from '../utils/passwordPolicy';
import { sendSms } from './smsService';

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
  teamId?: string | null;
}

const SALT_ROUNDS = 10;

function resolvePrimaryUserRole(
  roles: Array<{ role: { key: string } | null }>
): UserRole {
  const assignedRoles = roles.map((entry) => entry.role?.key).filter(isValidRole);
  return resolveHighestRole(assignedRoles);
}

export interface PasswordTokenResult {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    status: string;
  };
}

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

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  teamId?: string | null;
  phone?: string | null;
}

export type SmsChallengePurpose = 'login' | 'password_setup';

export interface SmsChallengeResult {
  challengeId: string;
  maskedPhone: string;
  expiresInSeconds: number;
}

const SMS_CHALLENGE_EXPIRY_MS = 10 * 60 * 1000;
const SMS_CHALLENGE_MAX_ATTEMPTS = 5;

function generateVerificationCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashVerificationCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return '***';
  }

  return `***-***-${digits.slice(-4)}`;
}

function buildVerificationMessage(code: string): string {
  return `Your Hygieia verification code is ${code}. It expires in 10 minutes.`;
}

function resolveUserSmsPhone(user: {
  phone?: string | null;
  team?: { contactPhone?: string | null } | null;
}): string | null {
  const directPhone = typeof user.phone === 'string' ? user.phone.trim() : '';
  if (directPhone) {
    return directPhone;
  }

  const teamPhone = typeof user.team?.contactPhone === 'string' ? user.team.contactPhone.trim() : '';
  return teamPhone || null;
}

function getPrimaryRoleFromUser(user: {
  roles: Array<{ role: { key: string } | null }>;
}): UserRole {
  return resolvePrimaryUserRole(user.roles);
}

function buildUserInfo(user: {
  id: string;
  email: string;
  fullName: string;
  teamId?: string | null;
  roles: Array<{ role: { key: string } | null }>;
}): UserInfo {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: getPrimaryRoleFromUser(user),
    teamId: user.teamId,
  };
}

async function getAuthenticatableUser(normalizedEmail: string) {
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
      team: {
        select: {
          contactPhone: true,
        },
      },
    },
  });

  return user;
}

export async function authenticateCredentials(
  credentials: LoginCredentials
): Promise<AuthenticatedUser | null> {
  const normalizedEmail = credentials.email.trim().toLowerCase();
  const user = await getAuthenticatableUser(normalizedEmail);

  if (!user) {
    logAuthEvent('login_failed', {
      email: normalizedEmail,
      reason: 'user_not_found',
    });
    return null;
  }

  if (user.status === 'pending' || !user.passwordHash) {
    logAuthEvent('login_failed', {
      userId: user.id,
      reason: 'pending_password_setup',
    });
    throw new UnauthorizedError(
      'Please set your password using the link sent to your email before logging in.'
    );
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

  return {
    ...buildUserInfo(user),
    phone: resolveUserSmsPhone(user),
  };
}

export async function issueSmsVerificationChallenge(
  userId: string,
  purpose: SmsChallengePurpose
): Promise<SmsChallengeResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: {
        select: {
          contactPhone: true,
        },
      },
    },
  });

  if (!user || user.status === 'disabled') {
    throw new UnauthorizedError('Unable to send a verification code for this account.');
  }

  const phone = resolveUserSmsPhone(user);
  if (!phone) {
    throw new UnauthorizedError(
      'A mobile number is required for verification. Contact an administrator to update this account.'
    );
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + SMS_CHALLENGE_EXPIRY_MS);

  await prisma.smsVerificationChallenge.updateMany({
    where: {
      userId,
      purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  });

  const challenge = await prisma.smsVerificationChallenge.create({
    data: {
      userId,
      purpose,
      phone,
      codeHash: hashVerificationCode(code),
      expiresAt,
    },
  });

  const sent = await sendSms(phone, buildVerificationMessage(code));
  if (!sent) {
    await prisma.smsVerificationChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    throw new UnauthorizedError('Unable to send a verification code right now. Please try again.');
  }

  return {
    challengeId: challenge.id,
    maskedPhone: maskPhoneNumber(phone),
    expiresInSeconds: Math.floor(SMS_CHALLENGE_EXPIRY_MS / 1000),
  };
}

export async function verifySmsChallenge(
  challengeId: string,
  code: string,
  purpose: SmsChallengePurpose
): Promise<{ userId: string }> {
  const challenge = await prisma.smsVerificationChallenge.findUnique({
    where: { id: challengeId },
    select: {
      id: true,
      userId: true,
      purpose: true,
      codeHash: true,
      expiresAt: true,
      consumedAt: true,
      attemptCount: true,
    },
  });

  if (!challenge || challenge.purpose !== purpose) {
    throw new UnauthorizedError('Invalid verification code.');
  }

  if (challenge.consumedAt || challenge.expiresAt < new Date()) {
    throw new UnauthorizedError('Verification code has expired. Request a new code and try again.');
  }

  if (challenge.attemptCount >= SMS_CHALLENGE_MAX_ATTEMPTS) {
    throw new UnauthorizedError('Too many failed verification attempts. Request a new code.');
  }

  const providedHash = hashVerificationCode(code.trim());
  if (providedHash !== challenge.codeHash) {
    await prisma.smsVerificationChallenge.update({
      where: { id: challenge.id },
      data: { attemptCount: { increment: 1 } },
    });
    throw new UnauthorizedError('Invalid verification code.');
  }

  await prisma.smsVerificationChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  return { userId: challenge.userId };
}

export async function completeLogin(
  userId: string,
  metadata: TokenMetadata = {}
): Promise<{ tokens: AuthTokens; user: UserInfo }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user || user.status !== 'active') {
    throw new UnauthorizedError('Account is not active');
  }

  const primaryRole = resolvePrimaryUserRole(user.roles);
  const tokens = generateTokens({
    sub: user.id,
    email: user.email,
    role: primaryRole,
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
    user: buildUserInfo(user),
  };
}

export async function login(
  credentials: LoginCredentials,
  metadata: TokenMetadata = {}
): Promise<{ tokens: AuthTokens; user: UserInfo } | null> {
  const user = await authenticateCredentials(credentials);
  if (!user) {
    return null;
  }

  return completeLogin(user.id, metadata);
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

    const primaryRole = resolvePrimaryUserRole(user.roles);

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

  const primaryRole = resolvePrimaryUserRole(user.roles);

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: primaryRole,
    teamId: user.teamId,
  };
}

export async function issuePasswordSetTokenForEmail(
  email: string,
  expiresInHours = 2
): Promise<PasswordTokenResult | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
    },
  });

  if (!user || user.status === 'disabled') {
    return null;
  }

  await prisma.passwordSetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  });

  const passwordToken = await prisma.passwordSetToken.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
    },
  });

  return {
    token: passwordToken.token,
    user,
  };
}

export async function consumePasswordSetToken(
  token: string,
  password: string,
  options?: {
    smsChallengeId?: string;
    smsCode?: string;
  }
): Promise<void> {
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    throw new UnauthorizedError(passwordValidation.error || 'Invalid password');
  }

  const passwordToken = await prisma.passwordSetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!passwordToken || passwordToken.usedAt || passwordToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  const userRoles = await prisma.userRole.findMany({
    where: { userId: passwordToken.userId },
    include: { role: true },
  });

  const requiresSubcontractorVerification = resolvePrimaryUserRole(userRoles) === 'subcontractor';
  if (requiresSubcontractorVerification) {
    if (!options?.smsChallengeId || !options?.smsCode) {
      throw new UnauthorizedError('SMS verification is required before setting this password.');
    }

    const verifiedChallenge = await verifySmsChallenge(
      options.smsChallengeId,
      options.smsCode,
      'password_setup'
    );

    if (verifiedChallenge.userId !== passwordToken.userId) {
      throw new UnauthorizedError('Verification code does not match this password setup link.');
    }
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: passwordToken.userId },
      data: { passwordHash, status: 'active' },
    }),
    prisma.passwordSetToken.update({
      where: { id: passwordToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await revokeAllUserTokens(passwordToken.userId, 'password_change');
}

export async function beginPasswordSetVerification(
  token: string
): Promise<
  | ({ required: false })
  | ({ required: true } & SmsChallengeResult)
> {
  const passwordToken = await prisma.passwordSetToken.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          team: {
            select: {
              contactPhone: true,
            },
          },
        },
      },
    },
  });

  if (!passwordToken || passwordToken.usedAt || passwordToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  if (resolvePrimaryUserRole(passwordToken.user.roles) !== 'subcontractor') {
    return { required: false };
  }

  const challenge = await issueSmsVerificationChallenge(passwordToken.userId, 'password_setup');
  return {
    required: true,
    ...challenge,
  };
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
      status: true,
    },
  });

  if (!user || user.status !== 'active' || !user.passwordHash) {
    throw new UnauthorizedError('Invalid account state for password change');
  }

  const currentPasswordMatches = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentPasswordMatches) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new UnauthorizedError(passwordValidation.error || 'Invalid password');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await revokeAllUserTokens(userId, 'password_change');
}

export async function createSubcontractorUser(teamId: string): Promise<{ user: any; token: string } | null> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { users: true },
  });

  if (!team || !team.contactEmail) return null;

  // If team already has a linked user, skip creation
  if (team.users.length > 0) return null;

  // Find or create the 'subcontractor' role
  let subRole = await prisma.role.findUnique({ where: { key: 'subcontractor' } });
  if (!subRole) {
    subRole = await prisma.role.create({
      data: {
        key: 'subcontractor',
        label: 'Subcontractor',
        permissions: {
          dashboard_read: true,
          contracts_read: true,
          facilities_read: true,
          jobs_read: true,
          jobs_write: true,
          time_tracking_read: true,
          time_tracking_write: true,
        },
        isSystemRole: true,
      },
    });
  }

  // Check if a user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: team.contactEmail.toLowerCase() },
  });
  if (existingUser) return null;

  const user = await prisma.user.create({
    data: {
      email: team.contactEmail.toLowerCase(),
      fullName: team.contactName || team.name,
      teamId: team.id,
      status: 'pending',
      roles: {
        create: { roleId: subRole.id },
      },
    },
  });

  const passwordToken = await prisma.passwordSetToken.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    },
  });

  return { user, token: passwordToken.token };
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
