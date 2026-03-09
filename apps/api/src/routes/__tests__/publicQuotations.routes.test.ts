import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as quotationPublicService from '../../services/quotationPublicService';
import * as quotationService from '../../services/quotationService';

jest.mock('../../services/quotationPublicService');
jest.mock('../../services/quotationService', () => ({
  logQuotationActivity: jest.fn().mockResolvedValue({ id: 'activity-1' }),
}));
jest.mock('../../services/globalSettingsService', () => ({
  getGlobalSettings: jest.fn().mockResolvedValue({}),
  getDefaultBranding: jest.fn().mockReturnValue({}),
}));
jest.mock('../../services/emailService', () => ({
  sendNotificationEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../lib/prisma', () => ({
  prisma: {
    quotation: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));
jest.mock('../../services/notificationService', () => ({
  createBulkNotifications: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../lib/logger', () => ({
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  __esModule: true,
}));

describe('Public Quotation Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../publicQuotations')).default;
    setupTestRoutes(app, routes, '/api/v1/public/quotations');
  });

  it('GET /:token logs public_viewed only on first view', async () => {
    (quotationPublicService.getQuotationByPublicToken as jest.Mock).mockResolvedValue({
      id: 'quotation-1',
      quotationNumber: 'QT-001',
      status: 'sent',
    });
    (quotationPublicService.markPublicViewed as jest.Mock).mockResolvedValue({
      id: 'quotation-1',
      newlyViewed: true,
    });

    await request(app).get('/api/v1/public/quotations/token-123').expect(200);

    expect(quotationService.logQuotationActivity).toHaveBeenCalledWith(
      expect.objectContaining({ quotationId: 'quotation-1', action: 'public_viewed' })
    );
  });

  it('POST /:token/accept skips duplicate acceptance side effects', async () => {
    (quotationPublicService.acceptQuotationPublic as jest.Mock).mockResolvedValue({
      quotation: {
        id: 'quotation-1',
        status: 'accepted',
      },
      acceptedNow: false,
    });

    const response = await request(app)
      .post('/api/v1/public/quotations/token-123/accept')
      .send({ signatureName: 'Jane Client' })
      .expect(200);

    expect(response.body.message).toBe('Quotation already accepted');
    expect(quotationService.logQuotationActivity).not.toHaveBeenCalled();
  });

  it('POST /:token/reject skips duplicate rejection side effects', async () => {
    (quotationPublicService.rejectQuotationPublic as jest.Mock).mockResolvedValue({
      quotation: {
        id: 'quotation-1',
        status: 'rejected',
      },
      rejectedNow: false,
    });

    const response = await request(app)
      .post('/api/v1/public/quotations/token-123/reject')
      .send({ rejectionReason: 'Too expensive' })
      .expect(200);

    expect(response.body.message).toBe('Quotation already rejected');
    expect(quotationService.logQuotationActivity).not.toHaveBeenCalled();
  });
});
