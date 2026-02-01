import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as tokenService from '../tokenService';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('../../lib/redis', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    pipeline: jest.fn(() => ({
      setex: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    })),
  },
}));

jest.mock('../../lib/logger', () => ({
  logAuthEvent: jest.fn(),
}));

describe('tokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeRefreshToken', () => {
    it('should store refresh token in database', async () => {
      const userId = 'user-123';
      const jti = 'token-jti-123';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const metadata = { ipAddress: '192.168.1.1', userAgent: 'TestAgent/1.0' };

      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      await tokenService.storeRefreshToken(userId, jti, expiresAt, metadata);

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId,
          tokenJti: jti,
          expiresAt,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });
    });

    it('should store token without metadata', async () => {
      const userId = 'user-123';
      const jti = 'token-jti-123';
      const expiresAt = new Date();

      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      await tokenService.storeRefreshToken(userId, jti, expiresAt);

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId,
          tokenJti: jti,
          expiresAt,
          ipAddress: undefined,
          userAgent: undefined,
        },
      });
    });
  });

  describe('isTokenRevoked', () => {
    it('should return true if token is in Redis blacklist', async () => {
      const jti = 'revoked-jti';
      (redis.get as jest.Mock).mockResolvedValue('1');

      const result = await tokenService.isTokenRevoked(jti);

      expect(result).toBe(true);
      expect(redis.get).toHaveBeenCalledWith('token:revoked:revoked-jti');
      expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
    });

    it('should return true if token is revoked in database', async () => {
      const jti = 'revoked-jti';
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        revokedAt: new Date(),
      });
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const result = await tokenService.isTokenRevoked(jti);

      expect(result).toBe(true);
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should return false if token is not revoked', async () => {
      const jti = 'valid-jti';
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        revokedAt: null,
      });

      const result = await tokenService.isTokenRevoked(jti);

      expect(result).toBe(false);
    });

    it('should return false if token not found in database', async () => {
      const jti = 'unknown-jti';
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await tokenService.isTokenRevoked(jti);

      expect(result).toBe(false);
    });
  });

  describe('revokeToken', () => {
    it('should revoke a token', async () => {
      const jti = 'token-jti';
      const reason = 'logout';

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-123',
      });
      (prisma.refreshToken.update as jest.Mock).mockResolvedValue({});
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const result = await tokenService.revokeToken(jti, reason);

      expect(result).toBe(true);
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { tokenJti: jti },
        data: {
          revokedAt: expect.any(Date),
          revokedReason: reason,
        },
      });
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should return false if token not found', async () => {
      const jti = 'unknown-jti';
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await tokenService.revokeToken(jti, 'logout');

      expect(result).toBe(false);
      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all user tokens', async () => {
      const userId = 'user-123';
      const reason = 'logout_all';

      const mockTokens = [
        { tokenJti: 'token-1' },
        { tokenJti: 'token-2' },
        { tokenJti: 'token-3' },
      ];

      (prisma.refreshToken.findMany as jest.Mock).mockResolvedValue(mockTokens);
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({});

      const mockPipeline = {
        setex: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      (redis.pipeline as jest.Mock).mockReturnValue(mockPipeline);

      const result = await tokenService.revokeAllUserTokens(userId, reason);

      expect(result).toBe(3);
      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
        where: { userId, revokedAt: null },
        select: { tokenJti: true },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(mockPipeline.setex).toHaveBeenCalledTimes(3);
    });

    it('should return 0 if no tokens to revoke', async () => {
      (prisma.refreshToken.findMany as jest.Mock).mockResolvedValue([]);

      const result = await tokenService.revokeAllUserTokens('user-123', 'logout_all');

      expect(result).toBe(0);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await tokenService.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should return 0 if no expired tokens', async () => {
      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await tokenService.cleanupExpiredTokens();

      expect(result).toBe(0);
    });
  });

  describe('getTokenByJti', () => {
    it('should return token with user info', async () => {
      const jti = 'token-jti';
      const mockToken = {
        id: 'token-id',
        tokenJti: jti,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          status: 'active',
        },
      };

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockToken);

      const result = await tokenService.getTokenByJti(jti);

      expect(result).toEqual(mockToken);
      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
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
    });

    it('should return null if token not found', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await tokenService.getTokenByJti('unknown-jti');

      expect(result).toBeNull();
    });
  });
});
