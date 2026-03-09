import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as quotationService from '../../services/quotationService';
import { ensureOwnershipAccess } from '../../middleware/ownership';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = {
      id: 'manager-1',
      role: 'manager',
      email: 'manager@example.com',
      fullName: 'Manager User',
      supabaseUserId: null,
    };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/ownership', () => ({
  verifyOwnership: () => (_req: any, _res: any, next: any) => next(),
  ensureOwnershipAccess: jest.fn().mockResolvedValue(undefined),
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

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../quotations')).default;
    setupTestRoutes(app, routes, '/api/v1/quotations');
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
});
