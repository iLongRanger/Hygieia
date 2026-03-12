import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as quotationService from '../../services/quotationService';
import { ensureOwnershipAccess } from '../../middleware/ownership';

const mockAuthUser = {
  id: 'manager-1',
  role: 'manager',
  email: 'manager@example.com',
  fullName: 'Manager User',
  supabaseUserId: null,
};

const mockOwnership = {
  deniedKeys: new Set<string>(),
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
  verifyOwnership:
    ({ resourceType, paramName = 'id' }: { resourceType: string; paramName?: string }) =>
    (req: any, _res: any, next: any) => {
      const { ForbiddenError } = require('../../middleware/errorHandler');
      const key = `${req.user?.role}:${resourceType}:${req.params[paramName]}`;
      if (mockOwnership.deniedKeys.has(key)) {
        return next(new ForbiddenError('Access denied'));
      }
      next();
    },
  ensureOwnershipAccess: jest.fn(async (user: any, context: any) => {
    const { ForbiddenError } = require('../../middleware/errorHandler');
    const key = `${user?.role}:${context.resourceType}:${context.resourceId}`;
    if (mockOwnership.deniedKeys.has(key)) {
      throw new ForbiddenError('Access denied');
    }
  }),
  ensureManagerAccountAccess: jest.fn(async () => undefined),
}));

jest.mock('../../services/quotationService', () => ({
  listQuotations: jest.fn(),
  getQuotationById: jest.fn(),
  getQuotationByNumber: jest.fn(),
  createQuotation: jest.fn(),
  updateQuotation: jest.fn(),
  sendQuotation: jest.fn(),
  markQuotationAsViewed: jest.fn(),
  acceptQuotation: jest.fn(),
  rejectQuotation: jest.fn(),
  archiveQuotation: jest.fn(),
  restoreQuotation: jest.fn(),
  deleteQuotation: jest.fn(),
  logQuotationActivity: jest.fn().mockResolvedValue({}),
  setQuotationPricingApproval: jest.fn(),
}));

jest.mock('../../services/quotationPublicService', () => ({
  generatePublicToken: jest.fn().mockResolvedValue('quotation-public-token'),
}));

jest.mock('../../services/emailService', () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../services/globalSettingsService', () => ({
  getGlobalSettings: jest.fn().mockResolvedValue({}),
  getDefaultBranding: jest.fn().mockReturnValue({}),
}));

jest.mock('../../templates/quotationEmail', () => ({
  buildQuotationEmailHtmlWithBranding: jest.fn().mockReturnValue('<html></html>'),
  buildQuotationEmailSubject: jest.fn().mockReturnValue('Quotation'),
}));

jest.mock('../../config/email', () => ({
  isEmailConfigured: jest.fn().mockReturnValue(false),
}));

jest.mock('../../lib/logger', () => ({
  default: { error: jest.fn() },
  __esModule: true,
}));

describe('Quotation Routes', () => {
  let app: Application;
  const originalFrontendUrl = process.env.FRONTEND_URL;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'https://app.example.com';
    mockOwnership.deniedKeys.clear();
    app = createTestApp();
    const routes = (await import('../quotations')).default;
    setupTestRoutes(app, routes, '/api/v1/quotations');
  });

  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it('GET /:id resolves quotation numbers before ownership checks', async () => {
    (quotationService.getQuotationByNumber as jest.Mock).mockResolvedValue({
      id: 'quotation-1',
      quotationNumber: 'QT-20260101-0001',
    });

    const response = await request(app)
      .get('/api/v1/quotations/QT-20260101-0001')
      .expect(200);

    expect(response.body.data.id).toBe('quotation-1');
    expect(ensureOwnershipAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'manager-1',
        role: 'manager',
      }),
      expect.objectContaining({
        resourceType: 'quotation',
        resourceId: 'quotation-1',
      })
    );
  });

  it('GET /:id returns 404 when quotation number does not exist', async () => {
    (quotationService.getQuotationByNumber as jest.Mock).mockResolvedValue(null);

    await request(app)
      .get('/api/v1/quotations/QT-DOES-NOT-EXIST')
      .expect(404);
  });

  it('GET /:id returns 403 when resolved quotation is outside manager scope', async () => {
    const { ForbiddenError } = await import('../../middleware/errorHandler');
    (ensureOwnershipAccess as jest.Mock).mockRejectedValueOnce(new ForbiddenError('Access denied'));
    (quotationService.getQuotationByNumber as jest.Mock).mockResolvedValue({
      id: 'quotation-locked',
      quotationNumber: 'QT-LOCKED',
    });

    await request(app)
      .get('/api/v1/quotations/QT-LOCKED')
      .expect(403);
  });

  it('POST /:id/send returns 422 when FRONTEND_URL is missing', async () => {
    delete process.env.FRONTEND_URL;
    (quotationService.sendQuotation as jest.Mock).mockResolvedValue({
      id: 'quotation-1',
      quotationNumber: 'QT-20260101-0001',
      title: 'Test quotation',
      totalAmount: '100',
      validUntil: null,
      account: { name: 'Acme', billingEmail: 'billing@acme.com' },
    });

    await request(app)
      .post('/api/v1/quotations/quotation-1/send')
      .send({ emailTo: 'billing@acme.com' })
      .expect(422);
  });

  it('POST /:id/send returns 403 when manager lacks quotation ownership', async () => {
    mockOwnership.deniedKeys.add('manager:quotation:quotation-locked');

    await request(app)
      .post('/api/v1/quotations/quotation-locked/send')
      .send({ emailTo: 'billing@acme.com' })
      .expect(403);

    expect(quotationService.sendQuotation).not.toHaveBeenCalled();
  });
});
