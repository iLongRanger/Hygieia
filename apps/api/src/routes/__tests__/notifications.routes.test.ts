import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as notificationService from '../../services/notificationService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requireAnyRole: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/notificationService');

describe('Notifications Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../notifications')).default;
    setupTestRoutes(app, routes, '/api/v1/notifications');
  });

  it('GET / should list notifications', async () => {
    (notificationService.listNotifications as jest.Mock).mockResolvedValue([{ id: 'notification-1' }]);

    const response = await request(app).get('/api/v1/notifications').expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(notificationService.listNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' })
    );
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app).get('/api/v1/notifications?limit=0').expect(422);
  });

  it('PATCH /:id/read should mark notification read', async () => {
    (notificationService.markNotificationRead as jest.Mock).mockResolvedValue({
      id: 'notification-1',
      readAt: new Date().toISOString(),
    });

    const response = await request(app)
      .patch('/api/v1/notifications/notification-1/read')
      .send({ read: true })
      .expect(200);

    expect(response.body.data.id).toBe('notification-1');
    expect(notificationService.markNotificationRead).toHaveBeenCalledWith(
      'notification-1',
      'user-1',
      true
    );
  });

  it('PATCH /:id/read should return 404 when missing', async () => {
    (notificationService.markNotificationRead as jest.Mock).mockResolvedValue(null);

    await request(app)
      .patch('/api/v1/notifications/notification-1/read')
      .send({ read: true })
      .expect(404);
  });
});
