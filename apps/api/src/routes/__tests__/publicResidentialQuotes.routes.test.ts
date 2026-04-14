import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import type { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as residentialService from '../../services/residentialService';

jest.mock('../../services/residentialService');
jest.mock('../../services/globalSettingsService', () => ({
  getGlobalSettings: jest.fn().mockResolvedValue({}),
  getDefaultBranding: jest.fn().mockReturnValue({}),
}));

describe('Public Residential Quote Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../publicResidentialQuotes')).default;
    setupTestRoutes(app, routes, '/api/v1/public/residential-quotes');
  });

  it('GET /:token returns quote and marks first public view', async () => {
    (residentialService.getResidentialQuoteByPublicToken as jest.Mock).mockResolvedValue({
      id: 'rq-1',
      quoteNumber: 'RQ-20260320-0001',
      status: 'sent',
    });
    (residentialService.markResidentialQuotePublicViewed as jest.Mock).mockResolvedValue({
      id: 'rq-1',
      newlyViewed: true,
    });

    const response = await request(app)
      .get('/api/v1/public/residential-quotes/token-123')
      .expect(200);

    expect(response.body.data.id).toBe('rq-1');
    expect(residentialService.markResidentialQuotePublicViewed).toHaveBeenCalledWith('token-123', expect.any(String));
  });

  it('POST /:token/accept handles duplicate acceptance safely', async () => {
    (residentialService.acceptResidentialQuotePublic as jest.Mock).mockResolvedValue({
      quote: { id: 'rq-1', status: 'accepted' },
      acceptedNow: false,
    });

    const response = await request(app)
      .post('/api/v1/public/residential-quotes/token-123/accept')
      .send({ signatureName: 'Jane Client' })
      .expect(200);

    expect(response.body.message).toBe('Residential quote already accepted');
  });

  it('POST /:token/decline handles duplicate decline safely', async () => {
    (residentialService.declineResidentialQuotePublic as jest.Mock).mockResolvedValue({
      quote: { id: 'rq-1', status: 'declined' },
      declinedNow: false,
    });

    const response = await request(app)
      .post('/api/v1/public/residential-quotes/token-123/decline')
      .send({ reason: 'Need different cadence' })
      .expect(200);

    expect(response.body.message).toBe('Residential quote already declined');
  });
});
