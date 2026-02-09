import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as teamService from '../../services/teamService';

let mockUser: { id: string; role: string } | null = { id: 'user-1', role: 'owner' };
let sensitiveLimiterCalls = 0;

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!mockUser) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    req.user = mockUser;
    next();
  },
}));

jest.mock('../../middleware/rateLimiter', () => ({
  sensitiveRateLimiter: (_req: any, _res: any, next: any) => {
    sensitiveLimiterCalls += 1;
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission:
    (permission: string) =>
    (req: any, res: any, next: any) => {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const rolePermissions: Record<string, string[]> = {
        owner: ['all'],
        admin: ['teams_read', 'teams_write'],
        manager: ['teams_read', 'teams_write'],
        cleaner: [],
      };
      const permissions = rolePermissions[req.user.role] ?? [];

      if (!permissions.includes('all') && !permissions.includes(permission)) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        });
        return;
      }

      next();
    },
  requireRole:
    (...allowedRoles: string[]) =>
    (req: any, res: any, next: any) => {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        });
        return;
      }

      next();
    },
}));

jest.mock('../../services/teamService');

describe('Team Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUser = { id: 'user-1', role: 'owner' };
    sensitiveLimiterCalls = 0;
    app = createTestApp();
    const routes = (await import('../teams')).default;
    setupTestRoutes(app, routes, '/api/v1/teams');
  });

  it('GET / should list teams', async () => {
    (teamService.listTeams as jest.Mock).mockResolvedValue({
      data: [{ id: 'team-1', name: 'Alpha Team' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app).get('/api/v1/teams').expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Alpha Team');
  });

  it('GET / should return 401 when unauthenticated', async () => {
    mockUser = null;

    await request(app).get('/api/v1/teams').expect(401);
  });

  it('GET / should return 403 for cleaner role', async () => {
    mockUser = { id: 'user-2', role: 'cleaner' };

    await request(app).get('/api/v1/teams').expect(403);
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app).get('/api/v1/teams?limit=0').expect(422);
  });

  it('POST / should create team', async () => {
    (teamService.createTeam as jest.Mock).mockResolvedValue({ id: 'team-1', name: 'Alpha Team' });

    const response = await request(app)
      .post('/api/v1/teams')
      .send({ name: 'Alpha Team' })
      .expect(201);

    expect(response.body.data.id).toBe('team-1');
    expect(teamService.createTeam).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alpha Team',
        createdByUserId: 'user-1',
      })
    );
    expect(sensitiveLimiterCalls).toBe(1);
  });

  it('POST / should return 422 for invalid payload', async () => {
    await request(app)
      .post('/api/v1/teams')
      .send({ name: '', contactEmail: 'not-an-email' })
      .expect(422);
  });

  it('PATCH /:id should return 422 for invalid payload', async () => {
    await request(app)
      .patch('/api/v1/teams/team-1')
      .send({ contactEmail: 'invalid-email' })
      .expect(422);

    expect(sensitiveLimiterCalls).toBe(1);
  });

  it('PATCH /:id should update team', async () => {
    (teamService.getTeamById as jest.Mock).mockResolvedValue({ id: 'team-1' });
    (teamService.updateTeam as jest.Mock).mockResolvedValue({ id: 'team-1', name: 'Bravo Team' });

    const response = await request(app)
      .patch('/api/v1/teams/team-1')
      .send({ name: 'Bravo Team' })
      .expect(200);

    expect(response.body.data.name).toBe('Bravo Team');
    expect(sensitiveLimiterCalls).toBe(1);
  });

  it('DELETE /:id should archive team', async () => {
    (teamService.archiveTeam as jest.Mock).mockResolvedValue({ id: 'team-1', archivedAt: new Date().toISOString() });

    const response = await request(app)
      .delete('/api/v1/teams/team-1')
      .expect(200);

    expect(response.body.data.id).toBe('team-1');
    expect(sensitiveLimiterCalls).toBe(1);
  });

  it('POST /:id/restore should restore team', async () => {
    (teamService.restoreTeam as jest.Mock).mockResolvedValue({ id: 'team-1', archivedAt: null });

    const response = await request(app)
      .post('/api/v1/teams/team-1/restore')
      .expect(200);

    expect(response.body.data.id).toBe('team-1');
    expect(sensitiveLimiterCalls).toBe(1);
  });

  it('GET endpoints should not hit sensitive limiter', async () => {
    (teamService.listTeams as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await request(app).get('/api/v1/teams').expect(200);

    expect(sensitiveLimiterCalls).toBe(0);
  });
});
