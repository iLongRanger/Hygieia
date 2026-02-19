import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import * as authService from '../../services/authService';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';

let mockAuthUser: { id: string; role: string } | null = { id: 'user-1', role: 'owner' };

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!mockAuthUser) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }
    req.user = mockAuthUser;
    next();
  },
}));

jest.mock('../../middleware/rateLimiter', () => ({
  authRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/authService');

describe('Auth Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuthUser = { id: 'user-1', role: 'owner' };
    app = createTestApp();
    const authRoutes = (await import('../auth')).default;
    setupTestRoutes(app, authRoutes, '/api/v1/auth');
  });

  describe('POST /login', () => {
    it('should login successfully', async () => {
      const mockResult = {
        user: { id: 'user-1', email: 'test@example.com', fullName: 'Test', role: 'owner' as const },
        tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 900 },
      };

      (authService.login as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password123' })
        .expect(200);

      expect(response.body.data.user).toEqual(mockResult.user);
      expect(response.body.data.tokens.tokenType).toBe('Bearer');
    });

    it('should return 401 for invalid credentials', async () => {
      (authService.login as jest.Mock).mockResolvedValue(null);

      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'wrong@example.com', password: 'wrong' })
        .expect(401);
    });

    it('should return 422 for missing email', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'Password123' })
        .expect(422);
    });

    it('should return 422 for missing password', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com' })
        .expect(422);
    });

    it('should return 422 for invalid email format', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'invalid-email', password: 'Password123' })
        .expect(422);
    });
  });

  describe('POST /refresh', () => {
    it('should refresh token successfully', async () => {
      const mockTokens = {
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        expiresIn: 900,
      };

      (authService.refreshAccessToken as jest.Mock).mockResolvedValue(mockTokens);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(response.body.data.tokens.accessToken).toBe('new-token');
    });

    it('should return 401 for invalid refresh token', async () => {
      (authService.refreshAccessToken as jest.Mock).mockResolvedValue(null);

      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should return 422 for missing refresh token', async () => {
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(422);
    });
  });

  describe('POST /logout', () => {
    it('should logout current session when refresh token is provided', async () => {
      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'refresh-token-1' })
        .expect(200);

      expect(response.body.data.message).toBe('Logged out successfully');
      expect(authService.logout).toHaveBeenCalledWith('refresh-token-1');
    });

    it('should succeed without refresh token payload', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .send({})
        .expect(200);

      expect(authService.logout).not.toHaveBeenCalled();
    });
  });

  describe('POST /logout-all', () => {
    it('should revoke all user sessions', async () => {
      (authService.logoutAll as jest.Mock).mockResolvedValue(3);

      const response = await request(app)
        .post('/api/v1/auth/logout-all')
        .send({})
        .expect(200);

      expect(response.body.data.sessionsRevoked).toBe(3);
      expect(authService.logoutAll).toHaveBeenCalledWith('user-1');
    });
  });

  describe('POST /dev/create-user', () => {
    it('should create dev user successfully', async () => {
      const mockResult = {
        user: { id: 'user-1', email: 'new@example.com', fullName: 'New User', role: 'owner' as const },
        tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 900 },
      };

      (authService.createDevUser as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/auth/dev/create-user')
        .send({ email: 'new@example.com', password: 'Password123', fullName: 'New User', role: 'owner' })
        .expect(201);

      expect(response.body.data.user.email).toBe('new@example.com');
    });

    it('should return 422 for missing email', async () => {
      await request(app)
        .post('/api/v1/auth/dev/create-user')
        .send({ password: 'Password123', fullName: 'Test' })
        .expect(422);
    });

    it('should return 422 for missing fullName', async () => {
      await request(app)
        .post('/api/v1/auth/dev/create-user')
        .send({ email: 'test@example.com', password: 'Password123' })
        .expect(422);
    });

    it('should return 422 for missing password', async () => {
      await request(app)
        .post('/api/v1/auth/dev/create-user')
        .send({ email: 'test@example.com', fullName: 'Test' })
        .expect(422);
    });

    it('should return 422 for short password', async () => {
      await request(app)
        .post('/api/v1/auth/dev/create-user')
        .send({ email: 'test@example.com', password: '12345', fullName: 'Test' })
        .expect(422);
    });
  });

  describe('GET /me', () => {
    it('should return authenticated user profile', async () => {
      (authService.getUserById as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'owner@example.com',
        fullName: 'Owner User',
        role: 'owner',
      });

      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(200);

      expect(response.body.data.user.id).toBe('user-1');
      expect(authService.getUserById).toHaveBeenCalledWith('user-1');
    });

    it('should return 401 without authentication', async () => {
      mockAuthUser = null;
      await request(app)
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should return 401 when user cannot be loaded', async () => {
      (authService.getUserById as jest.Mock).mockResolvedValue(null);

      await request(app)
        .get('/api/v1/auth/me')
        .expect(401);
    });
  });
});
