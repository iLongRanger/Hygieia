import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as globalSettingsService from '../../services/globalSettingsService';

let mockUser: { id: string; role: string } | null = { id: 'user-1', role: 'owner' };
let sensitiveLimiterCalls = 0;

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (!mockUser) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    req.user = mockUser;
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requireRole:
    (...allowedRoles: string[]) =>
    (req: any, res: any, next: any) => {
      if (!req.user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }
      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
        return;
      }
      next();
    },
}));

jest.mock('../../middleware/rateLimiter', () => ({
  sensitiveRateLimiter: (_req: any, _res: any, next: any) => {
    sensitiveLimiterCalls += 1;
    next();
  },
}));

jest.mock('../../services/globalSettingsService');

describe('Global Settings Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUser = { id: 'user-1', role: 'owner' };
    sensitiveLimiterCalls = 0;
    app = createTestApp();
    const routes = (await import('../globalSettings')).default;
    setupTestRoutes(app, routes, '/api/v1/settings/global');

    (globalSettingsService.getGlobalSettings as jest.Mock).mockResolvedValue({
      companyName: 'Hygieia Cleaning Services',
      themePrimaryColor: '#1a1a2e',
    });
    (globalSettingsService.updateGlobalSettings as jest.Mock).mockResolvedValue({
      companyName: 'Hygieia Cleaning Services',
      themePrimaryColor: '#1a1a2e',
    });
    (globalSettingsService.clearGlobalLogo as jest.Mock).mockResolvedValue({
      companyName: 'Hygieia Cleaning Services',
      logoDataUrl: null,
    });
  });

  it('GET / should return global settings', async () => {
    const response = await request(app).get('/api/v1/settings/global').expect(200);
    expect(response.body.data.companyName).toBe('Hygieia Cleaning Services');
  });

  it('PUT / should update settings', async () => {
    await request(app)
      .put('/api/v1/settings/global')
      .send({ companyName: 'Acme Janitorial', themePrimaryColor: '#112233' })
      .expect(200);

    expect(globalSettingsService.updateGlobalSettings).toHaveBeenCalledWith(
      expect.objectContaining({ companyName: 'Acme Janitorial', themePrimaryColor: '#112233' })
    );
    expect(sensitiveLimiterCalls).toBe(1);
  });

  it('PUT / should return 422 for invalid hex color', async () => {
    await request(app)
      .put('/api/v1/settings/global')
      .send({ themePrimaryColor: 'red' })
      .expect(422);
  });

  it('POST /logo should update logo', async () => {
    await request(app)
      .post('/api/v1/settings/global/logo')
      .send({ logoDataUrl: 'data:image/png;base64,aGVsbG8=' })
      .expect(200);

    expect(globalSettingsService.updateGlobalSettings).toHaveBeenCalledWith(
      expect.objectContaining({ logoDataUrl: 'data:image/png;base64,aGVsbG8=' })
    );
    expect(sensitiveLimiterCalls).toBe(1);
  });

  it('POST /logo should return 422 for invalid payload', async () => {
    await request(app)
      .post('/api/v1/settings/global/logo')
      .send({ logoDataUrl: 'https://example.com/logo.png' })
      .expect(422);
  });

  it('DELETE /logo should clear logo', async () => {
    await request(app).delete('/api/v1/settings/global/logo').expect(200);
    expect(globalSettingsService.clearGlobalLogo).toHaveBeenCalled();
    expect(sensitiveLimiterCalls).toBe(1);
  });

  it('GET / should return 401 when unauthenticated', async () => {
    mockUser = null;
    await request(app).get('/api/v1/settings/global').expect(401);
  });

  it('PUT / should return 403 for manager role', async () => {
    mockUser = { id: 'user-2', role: 'manager' };
    await request(app).put('/api/v1/settings/global').send({ companyName: 'Blocked' }).expect(403);
  });
});

