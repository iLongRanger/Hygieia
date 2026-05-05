import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import type { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as opportunityService from '../../services/opportunityService';

const mockAuthUser = {
  id: 'user-1',
  role: 'owner',
};

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = mockAuthUser;
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/ownership', () => ({
  ensureOwnershipAccess: jest.fn(async () => undefined),
  ensureManagerAccountAccess: jest.fn(async () => undefined),
}));

jest.mock('../../services/opportunityService');

describe('Opportunity Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuthUser.id = 'user-1';
    mockAuthUser.role = 'owner';
    app = createTestApp();
    const routes = (await import('../opportunities')).default;
    setupTestRoutes(app, routes, '/api/v1/opportunities');
  });

  it('GET / should pass user scope to opportunity list service', async () => {
    mockAuthUser.role = 'manager';
    (opportunityService.listOpportunities as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await request(app)
      .get('/api/v1/opportunities?search=maple')
      .expect(200);

    expect(opportunityService.listOpportunities).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'maple',
      }),
      expect.objectContaining({
        userRole: 'manager',
        userId: 'user-1',
      })
    );
  });
});
