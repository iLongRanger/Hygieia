import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as dashboardService from '../../services/dashboardService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/dashboardService');

describe('Dashboard Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
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
    expect(dashboardService.getDashboardStats).toHaveBeenCalled();
  });
});
