import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import type { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as invoiceService from '../../services/invoiceService';
import { prisma } from '../../lib/prisma';

const mockAuthUser: { id: string; role: string; teamId?: string } = {
  id: 'manager-1',
  role: 'manager',
};
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_ACCOUNT_ID = '22222222-2222-2222-2222-222222222222';
const FACILITY_ID = '33333333-3333-3333-3333-333333333333';

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
  verifyOwnership: () => (_req: any, _res: any, next: any) => next(),
  ensureOwnershipAccess: jest.fn(async () => undefined),
  ensureManagerAccountAccess: jest.fn(async () => undefined),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    facility: {
      findUnique: jest.fn(),
    },
    contract: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../services/invoiceService');

jest.mock('../../lib/appUrl', () => ({
  requireFrontendBaseUrl: jest.fn(() => 'https://app.example.com'),
}));

describe('Invoice Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuthUser.id = 'manager-1';
    mockAuthUser.role = 'manager';
    app = createTestApp();
    const routes = (await import('../invoices')).default;
    setupTestRoutes(app, routes, '/api/v1/invoices');
  });

  it('GET / passes user scope into listInvoices', async () => {
    (invoiceService.listInvoices as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await request(app).get('/api/v1/invoices').expect(200);

    expect(invoiceService.listInvoices).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        userRole: 'manager',
        userId: 'manager-1',
      })
    );
  });

  it('POST / rejects a service location from another account', async () => {
    (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
      accountId: OTHER_ACCOUNT_ID,
    });

    const response = await request(app)
      .post('/api/v1/invoices')
      .send({
        accountId: ACCOUNT_ID,
        facilityId: FACILITY_ID,
        issueDate: '2026-05-01',
        dueDate: '2026-05-31',
        items: [
          {
            description: 'Service',
            quantity: 1,
            unitPrice: 100,
          },
        ],
      })
      .expect(400);

    expect(response.body.error.message).toBe('Service location does not belong to the selected account');
    expect(invoiceService.createInvoice).not.toHaveBeenCalled();
  });
});
