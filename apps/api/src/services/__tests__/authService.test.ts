import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as authService from '../authService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    passwordSetToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    emailVerificationChallenge: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

jest.mock('../tokenService', () => ({
  storeRefreshToken: jest.fn().mockResolvedValue(undefined),
  isTokenRevoked: jest.fn().mockResolvedValue(false),
  revokeToken: jest.fn().mockResolvedValue(true),
  revokeAllUserTokens: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../lib/logger', () => ({
  logAuthEvent: jest.fn(),
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2a$10$hashedValue';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await authService.hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('password setup tokens', () => {
    it('hashes setup tokens deterministically', () => {
      const hash = authService.hashPasswordSetToken('raw-token');

      expect(hash).toHaveLength(64);
      expect(hash).toBe(authService.hashPasswordSetToken('raw-token'));
      expect(hash).not.toBe('raw-token');
    });

    it('stores only the setup token hash when creating a token', async () => {
      const expiresAt = new Date('2026-05-13T12:00:00.000Z');
      (prisma.passwordSetToken.create as jest.Mock).mockResolvedValue({
        id: 'token-record-1',
        userId: 'user-1',
        token: 'database-placeholder-token',
        tokenHash: 'stored-hash',
        expiresAt,
      });

      const result = await authService.createPasswordSetTokenForUser('user-1', expiresAt);

      expect(result.token).not.toBe('database-placeholder-token');
      expect(result.token).toMatch(/^[a-f0-9]{64}$/);
      expect(prisma.passwordSetToken.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt,
        },
      });
      expect(
        (prisma.passwordSetToken.create as jest.Mock).mock.calls[0][0].data
      ).not.toHaveProperty('token');
    });

    it('builds encoded setup and reset URLs', () => {
      expect(authService.buildPasswordSetUrl('https://portal.example.com/app', 'abc+123/==')).toBe(
        'https://portal.example.com/auth/set-password?token=abc%2B123%2F%3D%3D'
      );
      expect(authService.buildPasswordResetUrl('https://portal.example.com', 'abc+123/==')).toBe(
        'https://portal.example.com/auth/reset-password?token=abc%2B123%2F%3D%3D'
      );
    });

    it('revokes active password setup tokens for a user', async () => {
      (prisma.passwordSetToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await authService.revokeActivePasswordSetTokensForUser('user-1');

      expect(prisma.passwordSetToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('allows pending users only for password setup email verification', () => {
      expect(
        authService.canIssueEmailVerificationForUserStatus('pending', 'password_setup')
      ).toBe(true);
      expect(authService.canIssueEmailVerificationForUserStatus('pending', 'login')).toBe(false);
      expect(authService.canIssueEmailVerificationForUserStatus('active', 'login')).toBe(true);
      expect(authService.canIssueEmailVerificationForUserStatus('disabled', 'password_setup')).toBe(false);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching password', async () => {
      const password = 'testPassword123';
      const hash = '$2a$10$hashedValue';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.verifyPassword(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'wrongPassword';
      const hash = '$2a$10$hashedValue';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.verifyPassword(password, hash);

      expect(result).toBe(false);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'owner' as const,
      };

      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';

      (jwt.sign as jest.Mock)
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = authService.generateTokens(payload);

      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        refreshTokenJti: expect.any(String),
        expiresIn: 15 * 60,
      });
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        passwordHash: '$2a$10$hashedValue',
        status: 'active',
        roles: [
          {
            role: {
              key: 'owner',
            },
          },
        ],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access.token')
        .mockReturnValueOnce('refresh.token');
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.login(credentials);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: credentials.email.toLowerCase() },
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
      expect(result).toBeDefined();
      expect(result?.user.email).toBe(credentials.email);
      expect(result?.user.role).toBe('owner');
      expect(result?.tokens.accessToken).toBe('access.token');
    });

    it('should return null for non-existent user', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authService.login(credentials);

      expect(result).toBeNull();
    });

    it('should throw unauthorized for user without password hash', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: null,
        status: 'active',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.login(credentials)).rejects.toThrow(
        'Please set your password using the link sent to your email before logging in.'
      );
    });

    it('should return null for invalid password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2a$10$hashedValue',
        status: 'active',
        roles: [{ role: { key: 'owner' } }],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.login(credentials);

      expect(result).toBeNull();
    });

    it('should throw error for inactive user', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2a$10$hashedValue',
        status: 'inactive',
        roles: [{ role: { key: 'owner' } }],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(authService.login(credentials)).rejects.toThrow('Account is not active');
    });

    it('should normalize email to lowercase', async () => {
      const credentials = {
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await authService.login(credentials);

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        })
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const refreshToken = 'valid.refresh.token';
      const decodedToken = {
        sub: 'user-123',
        type: 'refresh',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        status: 'active',
        roles: [{ role: { key: 'owner' } }],
      };

      (jwt.verify as jest.Mock).mockReturnValue(decodedToken);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('new.access.token')
        .mockReturnValueOnce('new.refresh.token');

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toBeDefined();
      expect(result?.accessToken).toBe('new.access.token');
    });

    it('should return null for invalid token type', async () => {
      const refreshToken = 'invalid.type.token';
      const decodedToken = {
        sub: 'user-123',
        type: 'access',
      };

      (jwt.verify as jest.Mock).mockReturnValue(decodedToken);

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const refreshToken = 'valid.refresh.token';
      const decodedToken = {
        sub: 'user-123',
        type: 'refresh',
      };

      (jwt.verify as jest.Mock).mockReturnValue(decodedToken);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const refreshToken = 'valid.refresh.token';
      const decodedToken = {
        sub: 'user-123',
        type: 'refresh',
      };

      const mockUser = {
        id: 'user-123',
        status: 'inactive',
        roles: [{ role: { key: 'owner' } }],
      };

      (jwt.verify as jest.Mock).mockReturnValue(decodedToken);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toBeNull();
    });

    it('should return null for invalid token', async () => {
      const refreshToken = 'invalid.token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user info for valid user id', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'Test User',
        roles: [{ role: { key: 'owner' } }],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.getUserById(userId);

      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'owner',
      });
    });

    it('should return null for non-existent user', async () => {
      const userId = 'non-existent';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authService.getUserById(userId);

      expect(result).toBeNull();
    });

    it('should default to cleaner role if no roles assigned', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'Test User',
        roles: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.getUserById(userId);

      expect(result?.role).toBe('cleaner');
    });
  });

  describe('createDevUser', () => {
    it('should create a new dev user with existing role', async () => {
      const email = 'dev@example.com';
      const fullName = 'Dev User';
      const password = 'devPassword123';
      const role = 'owner';

      const mockRole = {
        id: 'role-123',
        key: 'owner',
        label: 'Owner',
        description: 'owner role',
        isSystemRole: true,
        permissions: {},
      };

      const mockUser = {
        id: 'user-123',
        email: email.toLowerCase(),
        fullName,
        status: 'active',
      };

      (prisma.role.findUnique as jest.Mock).mockResolvedValue(mockRole);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashedPassword');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access.token')
        .mockReturnValueOnce('refresh.token');

      const result = await authService.createDevUser(email, fullName, password, role);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { key: role },
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result.user.email).toBe(email.toLowerCase());
      expect(result.tokens.accessToken).toBe('access.token');
    });

    it('should create role if it does not exist', async () => {
      const email = 'dev@example.com';
      const fullName = 'Dev User';
      const password = 'devPassword123';
      const role = 'manager';

      const mockRole = {
        id: 'role-new',
        key: 'manager',
        label: 'Manager',
        description: 'manager role',
        isSystemRole: true,
        permissions: {},
      };

      const mockUser = {
        id: 'user-123',
        email: email.toLowerCase(),
        fullName,
        status: 'active',
      };

      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.role.create as jest.Mock).mockResolvedValue(mockRole);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashedPassword');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access.token')
        .mockReturnValueOnce('refresh.token');

      const result = await authService.createDevUser(email, fullName, password, role);

      expect(prisma.role.create).toHaveBeenCalledWith({
        data: {
          key: role,
          label: 'Manager',
          description: 'manager role',
          isSystemRole: true,
          permissions: {},
        },
      });
      expect(result.user.email).toBe(email.toLowerCase());
    });

    it('should normalize email to lowercase', async () => {
      const email = 'DEV@EXAMPLE.COM';
      const fullName = 'Dev User';
      const password = 'devPassword123';

      const mockRole = {
        id: 'role-123',
        key: 'owner',
      };

      const mockUser = {
        id: 'user-123',
        email: email.toLowerCase(),
        fullName,
        status: 'active',
      };

      (prisma.role.findUnique as jest.Mock).mockResolvedValue(mockRole);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashedPassword');
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access.token')
        .mockReturnValueOnce('refresh.token');

      const result = await authService.createDevUser(email, fullName, password);

      expect(result.user.email).toBe('dev@example.com');
    });
  });
});
