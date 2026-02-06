import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as userService from '../../services/userService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/userService');

describe('Users Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../users')).default;
    setupTestRoutes(app, routes, '/api/v1/users');
  });

  it('GET / should list users', async () => {
    (userService.listUsers as jest.Mock).mockResolvedValue({
      data: [{ id: 'user-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app).get('/api/v1/users').expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(userService.listUsers).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/users?limit=0')
      .expect(422);
  });

  it('GET /roles should return available roles', async () => {
    (userService.listRoles as jest.Mock).mockResolvedValue([
      { key: 'owner', label: 'Owner' },
      { key: 'admin', label: 'Admin' },
    ]);

    const response = await request(app).get('/api/v1/users/roles').expect(200);

    expect(response.body.data).toHaveLength(2);
  });

  it('GET /:id should return user', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ id: 'user-1' });

    const response = await request(app).get('/api/v1/users/user-1').expect(200);

    expect(response.body.data.id).toBe('user-1');
  });

  it('GET /:id should return 404 when missing', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue(null);

    await request(app).get('/api/v1/users/missing').expect(404);
  });

  it('POST / should create user', async () => {
    (userService.getUserByEmail as jest.Mock).mockResolvedValue(null);
    (userService.createUser as jest.Mock).mockResolvedValue({ id: 'user-1' });

    const payload = {
      email: 'user@example.com',
      password: 'StrongPass1',
      fullName: 'Test User',
      role: 'manager',
    };

    const response = await request(app).post('/api/v1/users').send(payload).expect(201);

    expect(response.body.data.id).toBe('user-1');
    expect(userService.createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: 'user@example.com',
      fullName: 'Test User',
    }));
  });

  it('POST / should return 409 for duplicate email', async () => {
    (userService.getUserByEmail as jest.Mock).mockResolvedValue({ id: 'user-1' });

    await request(app)
      .post('/api/v1/users')
      .send({
        email: 'user@example.com',
        password: 'StrongPass1',
        fullName: 'Test User',
      })
      .expect(409);
  });

  it('PATCH /:id should update user', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ id: 'user-1' });
    (userService.updateUser as jest.Mock).mockResolvedValue({ id: 'user-1', fullName: 'Updated User' });

    const response = await request(app)
      .patch('/api/v1/users/user-1')
      .send({ fullName: 'Updated User' })
      .expect(200);

    expect(response.body.data.fullName).toBe('Updated User');
  });

  it('POST /:id/roles should assign role', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ id: 'user-1' });
    (userService.assignRole as jest.Mock).mockResolvedValue({ id: 'user-1' });

    const response = await request(app)
      .post('/api/v1/users/user-1/roles')
      .send({ role: 'manager' })
      .expect(200);

    expect(response.body.data.id).toBe('user-1');
    expect(userService.assignRole).toHaveBeenCalledWith('user-1', 'manager');
  });

  it('DELETE /:id/roles/:roleKey should remove role', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ id: 'user-1' });
    (userService.removeRole as jest.Mock).mockResolvedValue({ id: 'user-1' });

    const response = await request(app)
      .delete('/api/v1/users/user-1/roles/manager')
      .expect(200);

    expect(response.body.data.id).toBe('user-1');
    expect(userService.removeRole).toHaveBeenCalledWith('user-1', 'manager');
  });

  it('PATCH /:id/password should change password', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ id: 'user-1' });
    (userService.changePassword as jest.Mock).mockResolvedValue({ id: 'user-1' });

    const response = await request(app)
      .patch('/api/v1/users/user-1/password')
      .send({ password: 'StrongPass1' })
      .expect(200);

    expect(response.body.data.id).toBe('user-1');
    expect(userService.changePassword).toHaveBeenCalledWith('user-1', 'StrongPass1');
  });

  it('DELETE /:id should block self-delete', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ id: 'admin-1' });

    await request(app)
      .delete('/api/v1/users/admin-1')
      .expect(422);
  });

  it('DELETE /:id should delete another user', async () => {
    (userService.getUserById as jest.Mock).mockResolvedValue({ id: 'user-1' });
    (userService.deleteUser as jest.Mock).mockResolvedValue(undefined);

    await request(app)
      .delete('/api/v1/users/user-1')
      .expect(204);

    expect(userService.deleteUser).toHaveBeenCalledWith('user-1');
  });
});
