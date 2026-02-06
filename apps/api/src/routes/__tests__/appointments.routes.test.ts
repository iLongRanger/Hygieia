import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Application } from 'express';
import { createTestApp, setupTestRoutes } from '../../test/integration-setup';
import * as appointmentService from '../../services/appointmentService';

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', role: 'owner' };
    next();
  },
}));

jest.mock('../../middleware/rbac', () => ({
  requireAnyRole: (_req: any, _res: any, next: any) => next(),
  requireManager: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/appointmentService');

describe('Appointments Routes', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const routes = (await import('../appointments')).default;
    setupTestRoutes(app, routes, '/api/v1/appointments');
  });

  it('GET / should list appointments', async () => {
    (appointmentService.listAppointments as jest.Mock).mockResolvedValue([{ id: 'appt-1' }]);

    const response = await request(app).get('/api/v1/appointments').expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(appointmentService.listAppointments).toHaveBeenCalled();
  });

  it('GET / should return 422 for invalid query', async () => {
    await request(app)
      .get('/api/v1/appointments?leadId=not-a-uuid')
      .expect(422);
  });

  it('GET /:id should return appointment', async () => {
    (appointmentService.getAppointmentById as jest.Mock).mockResolvedValue({
      id: 'appt-1',
      assignedToUser: { id: 'user-1' },
    });

    const response = await request(app).get('/api/v1/appointments/appt-1').expect(200);

    expect(response.body.data.id).toBe('appt-1');
  });

  it('GET /:id should return 404 when not found', async () => {
    (appointmentService.getAppointmentById as jest.Mock).mockResolvedValue(null);

    await request(app).get('/api/v1/appointments/missing').expect(404);
  });

  it('POST / should create appointment', async () => {
    (appointmentService.createAppointment as jest.Mock).mockResolvedValue({ id: 'appt-1' });

    const payload = {
      leadId: '11111111-1111-1111-1111-111111111111',
      assignedToUserId: '22222222-2222-2222-2222-222222222222',
      type: 'walk_through',
      scheduledStart: '2026-02-10T10:00:00.000Z',
      scheduledEnd: '2026-02-10T11:00:00.000Z',
      timezone: 'America/New_York',
    };

    const response = await request(app).post('/api/v1/appointments').send(payload).expect(201);

    expect(response.body.data.id).toBe('appt-1');
    expect(appointmentService.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: payload.leadId,
        assignedToUserId: payload.assignedToUserId,
        createdByUserId: 'user-1',
      })
    );
  });

  it('POST / should return 422 for invalid payload', async () => {
    await request(app)
      .post('/api/v1/appointments')
      .send({
        assignedToUserId: 'not-a-uuid',
        scheduledStart: '2026-02-10T11:00:00.000Z',
        scheduledEnd: '2026-02-10T10:00:00.000Z',
      })
      .expect(422);
  });

  it('PATCH /:id should update appointment', async () => {
    (appointmentService.getAppointmentById as jest.Mock).mockResolvedValue({ id: 'appt-1' });
    (appointmentService.updateAppointment as jest.Mock).mockResolvedValue({ id: 'appt-1', notes: 'Updated' });

    const response = await request(app)
      .patch('/api/v1/appointments/appt-1')
      .send({ notes: 'Updated' })
      .expect(200);

    expect(response.body.data.id).toBe('appt-1');
    expect(appointmentService.updateAppointment).toHaveBeenCalledWith('appt-1', { notes: 'Updated' });
  });

  it('POST /:id/reschedule should reschedule appointment', async () => {
    (appointmentService.rescheduleAppointment as jest.Mock).mockResolvedValue({ id: 'appt-1' });

    const response = await request(app)
      .post('/api/v1/appointments/appt-1/reschedule')
      .send({
        scheduledStart: '2026-02-11T10:00:00.000Z',
        scheduledEnd: '2026-02-11T11:00:00.000Z',
        timezone: 'America/New_York',
      })
      .expect(201);

    expect(response.body.data.id).toBe('appt-1');
    expect(appointmentService.rescheduleAppointment).toHaveBeenCalledWith(
      'appt-1',
      expect.objectContaining({
        timezone: 'America/New_York',
      }),
      'user-1'
    );
  });

  it('POST /:id/complete should complete appointment', async () => {
    (appointmentService.getAppointmentById as jest.Mock).mockResolvedValue({
      id: 'appt-1',
      assignedToUser: { id: 'user-1' },
    });
    (appointmentService.completeAppointment as jest.Mock).mockResolvedValue({ id: 'appt-1', status: 'completed' });

    const response = await request(app)
      .post('/api/v1/appointments/appt-1/complete')
      .send({ facilityId: '33333333-3333-3333-3333-333333333333' })
      .expect(200);

    expect(response.body.data.status).toBe('completed');
  });

  it('DELETE /:id should delete appointment', async () => {
    (appointmentService.getAppointmentById as jest.Mock).mockResolvedValue({ id: 'appt-1' });
    (appointmentService.deleteAppointment as jest.Mock).mockResolvedValue(undefined);

    await request(app).delete('/api/v1/appointments/appt-1').expect(204);

    expect(appointmentService.deleteAppointment).toHaveBeenCalledWith('appt-1');
  });
});
