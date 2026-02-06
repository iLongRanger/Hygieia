import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as fixtureTypeService from '../../services/fixtureTypeService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../middleware/rbac', () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/fixtureTypeService');

describe('Fixture Types Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../fixtureTypes')).default;
    setupTestRoutes(app, routes, '/api/v1/fixture-types');
  });

  it('GET / should list fixture types', async () => {
    (fixtureTypeService.listFixtureTypes as jest.Mock).mockResolvedValue({
      data: [{ id: 'fixture-1' }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });

    const response = await request(app).get('/api/v1/fixture-types').expect(200);

    expect(response.body.data).toHaveLength(1);
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app).get('/api/v1/fixture-types?limit=0').expect(422);
  });

  it('GET /:id should return fixture type', async () => {
    (fixtureTypeService.getFixtureTypeById as jest.Mock).mockResolvedValue({ id: 'fixture-1' });

    const response = await request(app).get('/api/v1/fixture-types/fixture-1').expect(200);

    expect(response.body.data.id).toBe('fixture-1');
  });

  it('POST / should create fixture type', async () => {
    (fixtureTypeService.createFixtureType as jest.Mock).mockResolvedValue({ id: 'fixture-1' });

    const response = await request(app)
      .post('/api/v1/fixture-types')
      .send({ name: 'Chair', category: 'furniture' })
      .expect(201);

    expect(response.body.data.id).toBe('fixture-1');
  });

  it('PATCH /:id should update fixture type', async () => {
    (fixtureTypeService.getFixtureTypeById as jest.Mock).mockResolvedValue({ id: 'fixture-1' });
    (fixtureTypeService.updateFixtureType as jest.Mock).mockResolvedValue({ id: 'fixture-1', name: 'Desk' });

    const response = await request(app)
      .patch('/api/v1/fixture-types/fixture-1')
      .send({ name: 'Desk' })
      .expect(200);

    expect(response.body.data.name).toBe('Desk');
  });

  it('DELETE /:id should delete fixture type', async () => {
    (fixtureTypeService.getFixtureTypeById as jest.Mock).mockResolvedValue({ id: 'fixture-1' });
    (fixtureTypeService.deleteFixtureType as jest.Mock).mockResolvedValue(undefined);

    await request(app).delete('/api/v1/fixture-types/fixture-1').expect(204);
  });
});
