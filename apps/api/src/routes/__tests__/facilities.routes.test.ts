import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as facilityService from '../../services/facilityService';
import * as pricingCalculatorService from '../../services/pricingCalculatorService';
import * as pricingService from '../../services/pricing';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/facilityService');
jest.mock('../../services/pricingCalculatorService');
jest.mock('../../services/pricing');

describe('Facility Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../facilities')).default;
    setupTestRoutes(app, routes, '/api/v1/facilities');
  });

  it('GET / should list facilities', async () => {
    (facilityService.listFacilities as jest.Mock).mockResolvedValue({
      data: [{ id: 'facility-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get('/api/v1/facilities')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(facilityService.listFacilities).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/facilities?limit=0')
      .expect(422);
  });

  it('GET /:id should return facility', async () => {
    (facilityService.getFacilityById as jest.Mock).mockResolvedValue({ id: 'facility-1' });

    const response = await request(app)
      .get('/api/v1/facilities/facility-1')
      .expect(200);

    expect(response.body.data.id).toBe('facility-1');
  });

  it('GET /:id should return 404 when not found', async () => {
    (facilityService.getFacilityById as jest.Mock).mockResolvedValue(null);

    await request(app)
      .get('/api/v1/facilities/missing')
      .expect(404);
  });

  it('POST / should create facility', async () => {
    (facilityService.createFacility as jest.Mock).mockResolvedValue({ id: 'facility-1' });

    const response = await request(app)
      .post('/api/v1/facilities')
      .send({
        name: 'Main Facility',
        accountId: '11111111-1111-1111-1111-111111111111',
        address: {},
      })
      .expect(201);

    expect(response.body.data.id).toBe('facility-1');
    expect(facilityService.createFacility).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Main Facility',
        accountId: '11111111-1111-1111-1111-111111111111',
        createdByUserId: 'user-1',
      })
    );
  });

  it('POST / should return 422 for invalid payload', async () => {
    await request(app)
      .post('/api/v1/facilities')
      .send({ accountId: '11111111-1111-1111-1111-111111111111' })
      .expect(422);
  });

  it('PATCH /:id should update facility', async () => {
    (facilityService.getFacilityById as jest.Mock).mockResolvedValue({ id: 'facility-1' });
    (facilityService.updateFacility as jest.Mock).mockResolvedValue({ id: 'facility-1' });

    const response = await request(app)
      .patch('/api/v1/facilities/facility-1')
      .send({ name: 'Updated' })
      .expect(200);

    expect(response.body.data.id).toBe('facility-1');
  });

  it('POST /:id/archive should archive facility', async () => {
    (facilityService.getFacilityById as jest.Mock).mockResolvedValue({ id: 'facility-1' });
    (facilityService.archiveFacility as jest.Mock).mockResolvedValue({ id: 'facility-1' });

    const response = await request(app)
      .post('/api/v1/facilities/facility-1/archive')
      .expect(200);

    expect(response.body.data.id).toBe('facility-1');
  });

  it('POST /:id/restore should restore facility', async () => {
    (facilityService.getFacilityById as jest.Mock).mockResolvedValue({ id: 'facility-1' });
    (facilityService.restoreFacility as jest.Mock).mockResolvedValue({ id: 'facility-1' });

    const response = await request(app)
      .post('/api/v1/facilities/facility-1/restore')
      .expect(200);

    expect(response.body.data.id).toBe('facility-1');
  });

  it('GET /:id/pricing-readiness should return readiness', async () => {
    (pricingCalculatorService.isFacilityReadyForPricing as jest.Mock).mockResolvedValue({ isReady: true });

    const response = await request(app)
      .get('/api/v1/facilities/facility-1/pricing-readiness')
      .expect(200);

    expect(response.body.data.isReady).toBe(true);
  });

  it('GET /:id/pricing should return pricing', async () => {
    (facilityService.getFacilityById as jest.Mock).mockResolvedValue({ id: 'facility-1' });
    (pricingCalculatorService.calculateFacilityPricing as jest.Mock).mockResolvedValue({ monthlyTotal: 100 });

    const response = await request(app)
      .get('/api/v1/facilities/facility-1/pricing?frequency=weekly')
      .expect(200);

    expect(response.body.data.monthlyTotal).toBe(100);
  });

  it('GET /:id/pricing-comparison should return comparisons', async () => {
    (facilityService.getFacilityById as jest.Mock).mockResolvedValue({ id: 'facility-1' });
    (pricingCalculatorService.calculateFacilityPricingComparison as jest.Mock).mockResolvedValue([
      { frequency: 'weekly', monthlyTotal: 100 },
    ]);

    const response = await request(app)
      .get('/api/v1/facilities/facility-1/pricing-comparison?frequencies=weekly,monthly')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
  });

  it('GET /:id/proposal-template should return template', async () => {
    (facilityService.getFacilityById as jest.Mock).mockResolvedValue({
      id: 'facility-1',
      account: { id: 'account-1' },
    });
    (pricingCalculatorService.isFacilityReadyForPricing as jest.Mock).mockResolvedValue({ isReady: true });
    (pricingService.calculatePricing as jest.Mock).mockResolvedValue({ monthlyTotal: 100 });
    (pricingService.generateProposalServices as jest.Mock).mockResolvedValue([{ serviceName: 'Weekly' }]);

    const response = await request(app)
      .get('/api/v1/facilities/facility-1/proposal-template?frequency=weekly')
      .expect(200);

    expect(response.body.data.pricing.monthlyTotal).toBe(100);
    expect(response.body.data.suggestedServices).toHaveLength(1);
  });

  it('GET /:id/proposal-template should pass subcontractorPercentageOverride for known tier', async () => {
    (facilityService.getFacilityById as jest.Mock).mockResolvedValue({
      id: 'facility-1',
      account: { id: 'account-1' },
    });
    (pricingCalculatorService.isFacilityReadyForPricing as jest.Mock).mockResolvedValue({ isReady: true });
    (pricingService.calculatePricing as jest.Mock).mockResolvedValue({ monthlyTotal: 200 });
    (pricingService.generateProposalServices as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/v1/facilities/facility-1/proposal-template?frequency=weekly&subcontractorTier=labor_only')
      .expect(200);

    expect(pricingService.calculatePricing).toHaveBeenCalledWith(
      expect.objectContaining({ subcontractorPercentageOverride: 0.40 }),
      expect.any(Object)
    );
    expect(pricingService.generateProposalServices).toHaveBeenCalledWith(
      expect.objectContaining({ subcontractorPercentageOverride: 0.40 }),
      expect.any(Object)
    );
  });

  it('GET /:id/proposal-template should not pass override when no tier specified', async () => {
    (facilityService.getFacilityById as jest.Mock).mockResolvedValue({
      id: 'facility-1',
      account: { id: 'account-1' },
    });
    (pricingCalculatorService.isFacilityReadyForPricing as jest.Mock).mockResolvedValue({ isReady: true });
    (pricingService.calculatePricing as jest.Mock).mockResolvedValue({ monthlyTotal: 200 });
    (pricingService.generateProposalServices as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/v1/facilities/facility-1/proposal-template?frequency=weekly')
      .expect(200);

    expect(pricingService.calculatePricing).toHaveBeenCalledWith(
      expect.objectContaining({ subcontractorPercentageOverride: undefined }),
      expect.any(Object)
    );
  });

  it('GET /:id/proposal-template should map all tier keys correctly', async () => {
    (facilityService.getFacilityById as jest.Mock).mockResolvedValue({
      id: 'facility-1',
      account: { id: 'account-1' },
    });
    (pricingCalculatorService.isFacilityReadyForPricing as jest.Mock).mockResolvedValue({ isReady: true });
    (pricingService.calculatePricing as jest.Mock).mockResolvedValue({ monthlyTotal: 200 });
    (pricingService.generateProposalServices as jest.Mock).mockResolvedValue([]);

    const tierMap = [
      ['labor_only', 0.40],
      ['standard', 0.50],
      ['premium', 0.60],
      ['independent', 0.70],
    ] as const;

    for (const [tier, expectedPct] of tierMap) {
      jest.clearAllMocks();
      (facilityService.getFacilityById as jest.Mock).mockResolvedValue({
        id: 'facility-1',
        account: { id: 'account-1' },
      });
      (pricingCalculatorService.isFacilityReadyForPricing as jest.Mock).mockResolvedValue({ isReady: true });
      (pricingService.calculatePricing as jest.Mock).mockResolvedValue({ monthlyTotal: 200 });
      (pricingService.generateProposalServices as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get(`/api/v1/facilities/facility-1/proposal-template?frequency=weekly&subcontractorTier=${tier}`)
        .expect(200);

      expect(pricingService.calculatePricing).toHaveBeenCalledWith(
        expect.objectContaining({ subcontractorPercentageOverride: expectedPct }),
        expect.any(Object)
      );
    }
  });

  it('GET /:id/tasks-grouped should return grouped tasks', async () => {
    (facilityService.getFacilityById as jest.Mock).mockResolvedValue({ id: 'facility-1' });
    (pricingCalculatorService.getFacilityTasksGrouped as jest.Mock).mockResolvedValue({
      byArea: new Map([['area-1', { areaName: 'Area', tasks: [{ name: 'Task', frequency: 'daily' }] }]]),
      byFrequency: new Map([['daily', [{ name: 'Task', areaName: 'Area' }]]]),
    });

    const response = await request(app)
      .get('/api/v1/facilities/facility-1/tasks-grouped')
      .expect(200);

    expect(response.body.data.byArea['area-1'].tasks).toHaveLength(1);
    expect(response.body.data.byFrequency.daily).toHaveLength(1);
  });

  it('DELETE /:id should delete facility', async () => {
    (facilityService.getFacilityById as jest.Mock).mockResolvedValue({ id: 'facility-1' });
    (facilityService.deleteFacility as jest.Mock).mockResolvedValue({ id: 'facility-1' });

    await request(app)
      .delete('/api/v1/facilities/facility-1')
      .expect(204);
  });
});
