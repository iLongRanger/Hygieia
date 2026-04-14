import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as residentialService from '../../services/residentialService';
import { createBulkNotifications } from '../../services/notificationService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/ownership', () => ({
  ensureOwnershipAccess: jest.fn(),
}));

jest.mock('../../services/residentialService');
jest.mock('../../services/notificationService', () => ({
  createBulkNotifications: jest.fn(),
}));
jest.mock('../../services/globalSettingsService', () => ({
  getGlobalSettings: jest.fn().mockResolvedValue({}),
  getDefaultBranding: jest.fn().mockReturnValue({}),
}));
jest.mock('../../config/email', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(false),
}));
jest.mock('../../services/emailService', () => ({
  sendNotificationEmail: jest.fn(),
}));
jest.mock('../../lib/prisma', () => ({
  prisma: {
    account: {
      findUnique: jest.fn().mockResolvedValue({
        name: 'Oak Household',
        createdByUserId: 'user-2',
        accountManagerId: 'user-3',
      }),
    },
    userRole: {
      findMany: jest.fn().mockResolvedValue([
        { user: { id: 'owner-1' } },
        { user: { id: 'admin-1' } },
      ]),
    },
  },
}));

describe('Residential Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../residential')).default;
    setupTestRoutes(app, routes, '/api/v1/residential');
  });

  it('POST /quotes/:id/request-review notifies internal approvers for manual review quotes', async () => {
    (residentialService.getResidentialQuoteById as jest.Mock).mockResolvedValue({
      id: 'rq-1',
      accountId: 'account-1',
      quoteNumber: 'RQ-0001',
      manualReviewRequired: true,
      status: 'review_required',
    });

    const response = await request(app)
      .post('/api/v1/residential/quotes/rq-1/request-review')
      .send({})
      .expect(200);

    expect(response.body.notified).toBe(4);
    expect(createBulkNotifications).toHaveBeenCalledWith(
      expect.arrayContaining(['user-2', 'user-3', 'owner-1', 'admin-1']),
      expect.objectContaining({
        type: 'residential_quote_review_required',
      })
    );
  });

  it('POST /quotes/:id/approve-review approves a manual review quote', async () => {
    (residentialService.getResidentialQuoteById as jest.Mock).mockResolvedValue({
      id: 'rq-1',
      accountId: 'account-1',
      manualReviewRequired: true,
      status: 'review_required',
    });
    (residentialService.approveResidentialQuoteReview as jest.Mock).mockResolvedValue({
      id: 'rq-1',
      status: 'review_approved',
    });

    const response = await request(app)
      .post('/api/v1/residential/quotes/rq-1/approve-review')
      .send({})
      .expect(200);

    expect(response.body.data.status).toBe('review_approved');
    expect(residentialService.approveResidentialQuoteReview).toHaveBeenCalledWith('rq-1');
  });
});
