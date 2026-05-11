import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import type { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as userService from '../../services/userService';

let mockAuthUser = { id: 'admin-1', role: 'owner' };

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = mockAuthUser;
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/userService');

describe('Users Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuthUser = { id: 'admin-1', role: 'owner' };
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
    expect(userService.listUsers).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ includeCompensation: true })
    );
  });

  it('GET / should hide compensation fields for managers', async () => {
    mockAuthUser = { id: 'manager-1', role: 'manager' };
    (userService.listUsers as jest.Mock).mockResolvedValue({
      data: [{ id: 'user-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    await request(app).get('/api/v1/users').expect(200);

    expect(userService.listUsers).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ includeCompensation: false })
    );
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
    expect(userService.getUserById).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ includeCompensation: true })
    );
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
      address: { street: '123 Main St', city: 'Toronto' },
      role: 'manager',
      payType: 'hourly',
      hourlyPayRate: 25,
      employeeNumber: 'EMP-300',
      jobTitle: 'Account Manager',
      department: 'Sales',
      employmentType: 'full_time',
      startDate: '2026-05-01',
      emergencyContact: { name: 'Jane Doe', phone: '5551234567' },
      skills: ['walkthroughs'],
    };

    const response = await request(app).post('/api/v1/users').send(payload).expect(201);

    expect(response.body.data.id).toBe('user-1');
    expect(userService.createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: 'user@example.com',
      fullName: 'Test User',
      address: { street: '123 Main St', city: 'Toronto' },
      payType: 'hourly',
      hourlyPayRate: 25,
      employeeNumber: 'EMP-300',
      jobTitle: 'Account Manager',
      department: 'Sales',
      employmentType: 'full_time',
      startDate: '2026-05-01',
      emergencyContact: { name: 'Jane Doe', phone: '5551234567' },
      skills: ['walkthroughs'],
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
      .send({
        fullName: 'Updated User',
        address: { street: '456 Queen St', city: 'Toronto' },
        payType: 'hourly',
        hourlyPayRate: 28,
        jobTitle: 'Operations Lead',
        department: 'Operations',
        availability: { monday: true },
      })
      .expect(200);

    expect(response.body.data.fullName).toBe('Updated User');
    expect(userService.updateUser).toHaveBeenCalledWith('user-1', expect.objectContaining({
      payType: 'hourly',
      hourlyPayRate: 28,
      address: { street: '456 Queen St', city: 'Toronto' },
      jobTitle: 'Operations Lead',
      department: 'Operations',
      availability: { monday: true },
    }));
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
