import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import type { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import { BadRequestError, NotFoundError } from '../../middleware/errorHandler';
import * as payrollService from '../../services/payrollService';

const mockAuthUser: { id: string; role: string; teamId?: string } = {
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

jest.mock('../../services/payrollService');

describe('Payroll Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuthUser.role = 'owner';
    delete mockAuthUser.teamId;
    app = createTestApp();
    const routes = (await import('../payroll')).default;
    setupTestRoutes(app, routes, '/api/v1/payroll');
  });

  it('POST /generate returns validation errors without dropping the connection', async () => {
    (payrollService.generatePayrollRun as jest.Mock).mockRejectedValue(
      new BadRequestError('periodStart must be before periodEnd')
    );

    const response = await request(app)
      .post('/api/v1/payroll/generate')
      .send({ periodStart: '2026-05-05', periodEnd: '2026-05-05' })
      .expect(400);

    expect(response.body.error.message).toBe('periodStart must be before periodEnd');
  });

  it('GET /:id returns service errors through the error middleware', async () => {
    (payrollService.getPayrollRunById as jest.Mock).mockRejectedValue(
      new NotFoundError('Payroll run not found')
    );

    const response = await request(app)
      .get('/api/v1/payroll/run-1')
      .expect(404);

    expect(response.body.error.message).toBe('Payroll run not found');
  });
});
