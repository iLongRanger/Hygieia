import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import type { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';

const mockAuthUser: { id: string; role: string } = {
  id: 'user-1',
  role: 'owner',
};

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = mockAuthUser;
    next();
  },
}));

jest.mock('../../services/systemConfigExportService', () => ({
  exportSystemConfiguration: jest.fn(),
}));

describe('System Config Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuthUser.role = 'owner';
    app = createTestApp();
    const routes = (await import('../systemConfig')).default;
    setupTestRoutes(app, routes, '/api/v1/system-config');
  });

  it('GET /export returns baseline configuration export', async () => {
    const systemConfigExportService =
      await import('../../services/systemConfigExportService');
    (
      systemConfigExportService.exportSystemConfiguration as jest.Mock
    ).mockResolvedValue({
      metadata: { schemaVersion: 1 },
      pricing: { commercial: [] },
    });

    const response = await request(app)
      .get('/api/v1/system-config/export')
      .expect(200);

    expect(response.body.data.metadata.schemaVersion).toBe(1);
    expect(
      systemConfigExportService.exportSystemConfiguration
    ).toHaveBeenCalledTimes(1);
  });

  it('rejects users without settings read permission', async () => {
    mockAuthUser.role = 'cleaner';
    const systemConfigExportService =
      await import('../../services/systemConfigExportService');
    (
      systemConfigExportService.exportSystemConfiguration as jest.Mock
    ).mockResolvedValue({});

    const response = await request(app)
      .get('/api/v1/system-config/export')
      .expect(403);

    expect(response.body.error.code).toBe('INSUFFICIENT_SCOPE');
    expect(
      systemConfigExportService.exportSystemConfiguration
    ).not.toHaveBeenCalled();
  });
});
