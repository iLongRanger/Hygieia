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

    it('should return null for user without password hash', async () => {
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

      const result = await authService.login(credentials);

      expect(result).toBeNull();
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
