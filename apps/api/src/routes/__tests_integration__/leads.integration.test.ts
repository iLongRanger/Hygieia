import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Application } from 'express';
import * as leadService from '../../services/leadService';
import { createTestApp, setupTestRoutes, mockAuthMiddleware } from '../../test/integration-setup';
import { createTestLead, mockPaginatedResult } from '../../test/helpers';

jest.mock('../../services/leadService');
jest.mock('../../lib/prisma', () => ({
  prisma: {
    lead: {},
  },
}));
jest.mock('../../middleware/auth', () => ({
  authenticate: (_req: any, _res: any, next: any) => {
    _req.user = { sub: 'test-user-id', email: 'test@example.com', role: 'owner' };
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

describe('Leads Routes Integration Tests', () => {
  let app: Application;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = createTestApp();
    const leadsRoutes = (await import('../leads')).default;
    setupTestRoutes(app, leadsRoutes, '/api/v1/leads');
  });

  describe('GET /api/v1/leads', () => {
    it('should return paginated leads', async () => {
      const mockLeads = [
        createTestLead({ id: 'lead-1', contactName: 'John Doe' }),
        createTestLead({ id: 'lead-2', contactName: 'Jane Smith' }),
      ];

      const paginatedResult = mockPaginatedResult(mockLeads);
      (leadService.listLeads as jest.Mock).mockResolvedValue(paginatedResult);

      const response = await request(app)
        .get('/api/v1/leads')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter leads by status', async () => {
      const mockLeads = [createTestLead({ status: 'qualified' })];
      const paginatedResult = mockPaginatedResult(mockLeads);

      (leadService.listLeads as jest.Mock).mockResolvedValue(paginatedResult);

      await request(app)
        .get('/api/v1/leads')
        .query({ status: 'qualified' })
        .expect(200);

      expect(leadService.listLeads).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'qualified' })
      );
    });

    it('should search leads by query', async () => {
      const mockLeads = [createTestLead()];
      const paginatedResult = mockPaginatedResult(mockLeads);

      (leadService.listLeads as jest.Mock).mockResolvedValue(paginatedResult);

      await request(app)
        .get('/api/v1/leads')
        .query({ search: 'John' })
        .expect(200);

      expect(leadService.listLeads).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'John' })
      );
    });

    it('should handle pagination parameters', async () => {
      const mockLeads = [createTestLead()];
      const paginatedResult = mockPaginatedResult(mockLeads, 2, 10);

      (leadService.listLeads as jest.Mock).mockResolvedValue(paginatedResult);

      await request(app)
        .get('/api/v1/leads')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(leadService.listLeads).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10 })
      );
    });
  });

  describe('GET /api/v1/leads/:id', () => {
    it('should return a single lead by id', async () => {
      const mockLead = createTestLead({ id: 'lead-123', contactName: 'John Doe' });

      (leadService.getLeadById as jest.Mock).mockResolvedValue(mockLead);

      const response = await request(app)
        .get('/api/v1/leads/lead-123')
        .expect(200);

      expect(response.body.data.id).toBe('lead-123');
      expect(response.body.data.contactName).toBe('John Doe');
    });

    it('should return 404 for non-existent lead', async () => {
      (leadService.getLeadById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/leads/non-existent')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/leads', () => {
    it('should create a new lead', async () => {
      const newLeadData = {
        contactName: 'New Lead',
        companyName: 'Test Company',
        primaryEmail: 'new@test.com',
        primaryPhone: '555-0100',
      };

      const mockCreatedLead = createTestLead({
        ...newLeadData,
        id: 'lead-new',
        createdByUserId: 'test-user-id',
      });

      (leadService.createLead as jest.Mock).mockResolvedValue(mockCreatedLead);

      const response = await request(app)
        .post('/api/v1/leads')
        .send(newLeadData)
        .expect(201);

      expect(response.body.data.contactName).toBe('New Lead');
      expect(leadService.createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          contactName: 'New Lead',
          createdByUserId: 'test-user-id',
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .send({
          companyName: 'Test Company',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate email format if provided', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .send({
          contactName: 'New Lead',
          primaryEmail: 'invalid-email',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PATCH /api/v1/leads/:id', () => {
    it('should update a lead', async () => {
      const updateData = {
        contactName: 'Updated Name',
        status: 'qualified',
      };

      const mockUpdatedLead = createTestLead({
        ...updateData,
        id: 'lead-123',
      });

      (leadService.updateLead as jest.Mock).mockResolvedValue(mockUpdatedLead);

      const response = await request(app)
        .patch('/api/v1/leads/lead-123')
        .send(updateData)
        .expect(200);

      expect(response.body.data.contactName).toBe('Updated Name');
      expect(leadService.updateLead).toHaveBeenCalledWith(
        'lead-123',
        expect.objectContaining(updateData)
      );
    });

    it('should handle partial updates', async () => {
      const mockUpdatedLead = createTestLead({ id: 'lead-123', status: 'converted' });

      (leadService.updateLead as jest.Mock).mockResolvedValue(mockUpdatedLead);

      await request(app)
        .patch('/api/v1/leads/lead-123')
        .send({ status: 'converted' })
        .expect(200);

      expect(leadService.updateLead).toHaveBeenCalledWith(
        'lead-123',
        expect.objectContaining({ status: 'converted' })
      );
    });
  });

  describe('DELETE /api/v1/leads/:id', () => {
    it('should archive a lead (soft delete)', async () => {
      const mockArchivedLead = createTestLead({
        id: 'lead-123',
        archivedAt: new Date(),
      });

      (leadService.archiveLead as jest.Mock).mockResolvedValue(mockArchivedLead);

      const response = await request(app)
        .delete('/api/v1/leads/lead-123')
        .expect(200);

      expect(response.body.data.message).toBeDefined();
      expect(leadService.archiveLead).toHaveBeenCalledWith('lead-123');
    });

    it('should handle hard delete with query parameter', async () => {
      (leadService.deleteLead as jest.Mock).mockResolvedValue({ id: 'lead-123' });

      await request(app)
        .delete('/api/v1/leads/lead-123')
        .query({ hard: 'true' })
        .expect(200);

      expect(leadService.deleteLead).toHaveBeenCalledWith('lead-123');
    });
  });

  describe('POST /api/v1/leads/:id/restore', () => {
    it('should restore an archived lead', async () => {
      const mockRestoredLead = createTestLead({
        id: 'lead-123',
        archivedAt: null,
      });

      (leadService.restoreLead as jest.Mock).mockResolvedValue(mockRestoredLead);

      const response = await request(app)
        .post('/api/v1/leads/lead-123/restore')
        .expect(200);

      expect(response.body.data.archivedAt).toBeNull();
      expect(leadService.restoreLead).toHaveBeenCalledWith('lead-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      (leadService.listLeads as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/v1/leads')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should handle validation errors', async () => {
      (leadService.createLead as jest.Mock).mockRejectedValue(
        new Error('Validation failed')
      );

      const response = await request(app)
        .post('/api/v1/leads')
        .send({ contactName: 'Test Lead' })
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });
});
