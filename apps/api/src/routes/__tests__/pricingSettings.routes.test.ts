import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as pricingSettingsService from '../../services/pricingSettingsService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/pricingSettingsService');

describe('Pricing Settings Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../pricingSettings')).default;
    setupTestRoutes(app, routes, '/api/v1/pricing-settings');
  });

  it('GET / should list pricing settings', async () => {
    (pricingSettingsService.listPricingSettings as jest.Mock).mockResolvedValue({
      data: [{ id: 'plan-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app).get('/api/v1/pricing-settings').expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(pricingSettingsService.listPricingSettings).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app).get('/api/v1/pricing-settings?limit=0').expect(422);
  });

  it('GET /active should return default plan', async () => {
    (pricingSettingsService.getDefaultPricingSettings as jest.Mock).mockResolvedValue({ id: 'plan-default' });

    const response = await request(app).get('/api/v1/pricing-settings/active').expect(200);

    expect(response.body.data.id).toBe('plan-default');
  });

  it('GET /:id should return pricing settings', async () => {
    (pricingSettingsService.getPricingSettingsById as jest.Mock).mockResolvedValue({ id: 'plan-1' });

    const response = await request(app).get('/api/v1/pricing-settings/plan-1').expect(200);

    expect(response.body.data.id).toBe('plan-1');
  });

  it('GET /:id should return 404 when not found', async () => {
    (pricingSettingsService.getPricingSettingsById as jest.Mock).mockResolvedValue(null);

    await request(app).get('/api/v1/pricing-settings/missing').expect(404);
  });

  it('POST / should create pricing settings', async () => {
    (pricingSettingsService.createPricingSettings as jest.Mock).mockResolvedValue({ id: 'plan-1' });

    const response = await request(app)
      .post('/api/v1/pricing-settings')
      .send({ name: 'Standard Plan' })
      .expect(201);

    expect(response.body.data.id).toBe('plan-1');
    expect(pricingSettingsService.createPricingSettings).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Standard Plan' })
    );
  });

  it('POST / should return 422 for invalid payload', async () => {
    await request(app)
      .post('/api/v1/pricing-settings')
      .send({ name: '' })
      .expect(422);
  });

  it('PATCH /:id should update pricing settings', async () => {
    (pricingSettingsService.getPricingSettingsById as jest.Mock).mockResolvedValue({ id: 'plan-1' });
    (pricingSettingsService.updatePricingSettings as jest.Mock).mockResolvedValue({ id: 'plan-1', name: 'Updated' });

    const response = await request(app)
      .patch('/api/v1/pricing-settings/plan-1')
      .send({ name: 'Updated' })
      .expect(200);

    expect(response.body.data.name).toBe('Updated');
    expect(pricingSettingsService.updatePricingSettings).toHaveBeenCalledWith(
      'plan-1',
      expect.objectContaining({ name: 'Updated' })
    );
  });

  it('POST /:id/set-default should set default pricing settings', async () => {
    (pricingSettingsService.getPricingSettingsById as jest.Mock).mockResolvedValue({ id: 'plan-1' });
    (pricingSettingsService.setDefaultPricingSettings as jest.Mock).mockResolvedValue({ id: 'plan-1', isDefault: true });

    const response = await request(app)
      .post('/api/v1/pricing-settings/plan-1/set-default')
      .expect(200);

    expect(response.body.data.isDefault).toBe(true);
  });

  it('POST /:id/archive should archive pricing settings', async () => {
    (pricingSettingsService.getPricingSettingsById as jest.Mock).mockResolvedValue({ id: 'plan-1' });
    (pricingSettingsService.archivePricingSettings as jest.Mock).mockResolvedValue({ id: 'plan-1' });

    const response = await request(app)
      .post('/api/v1/pricing-settings/plan-1/archive')
      .expect(200);

    expect(response.body.data.id).toBe('plan-1');
  });

  it('POST /:id/restore should restore pricing settings', async () => {
    (pricingSettingsService.getPricingSettingsById as jest.Mock).mockResolvedValue({ id: 'plan-1' });
    (pricingSettingsService.restorePricingSettings as jest.Mock).mockResolvedValue({ id: 'plan-1' });

    const response = await request(app)
      .post('/api/v1/pricing-settings/plan-1/restore')
      .expect(200);

    expect(response.body.data.id).toBe('plan-1');
  });

  it('DELETE /:id should delete pricing settings', async () => {
    (pricingSettingsService.getPricingSettingsById as jest.Mock).mockResolvedValue({ id: 'plan-1' });
    (pricingSettingsService.deletePricingSettings as jest.Mock).mockResolvedValue({ id: 'plan-1' });

    await request(app).delete('/api/v1/pricing-settings/plan-1').expect(204);

    expect(pricingSettingsService.deletePricingSettings).toHaveBeenCalledWith('plan-1');
  });
});
