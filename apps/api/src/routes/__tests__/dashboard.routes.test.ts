import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import type { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as dashboardService from '../../services/dashboardService';

let mockUser: { id: string; role: string; teamId?: string | null } | null = {
  id: 'owner-1',
  role: 'owner',
};

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
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/dashboardService');

describe('Dashboard Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUser = { id: 'owner-1', role: 'owner' };
    app = createTestApp();
    const routes = (await import('../dashboard')).default;
    setupTestRoutes(app, routes, '/api/v1/dashboard');
  });

  it('GET /stats should return dashboard stats', async () => {
    (dashboardService.getDashboardStats as jest.Mock).mockResolvedValue({
      totalLeads: 10,
      activeAccounts: 5,
      totalContacts: 20,
      activeUsers: 4,
    });

    const response = await request(app).get('/api/v1/dashboard/stats').expect(200);

    expect(response.body.data.totalLeads).toBe(10);
    expect(dashboardService.getDashboardStats).toHaveBeenCalledWith(
      expect.objectContaining({
        userRole: 'owner',
        userId: 'owner-1',
      })
    );
  });

  it('GET /export should block manager exports', async () => {
    mockUser = { id: 'manager-1', role: 'manager' };

    await request(app)
      .get('/api/v1/dashboard/export?type=accounts')
      .expect(403);

    expect(dashboardService.exportDashboardCsv).not.toHaveBeenCalled();
  });
});
