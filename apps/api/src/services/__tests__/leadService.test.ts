import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as leadService from '../leadService';
import { prisma } from '../../lib/prisma';
import { createTestLead, mockPaginatedResult } from '../../test/helpers';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    lead: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('leadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listLeads', () => {
    it('should return paginated leads with default parameters', async () => {
      const mockLeads = [
        createTestLead({ id: 'lead-1', contactName: 'John Doe' }),
        createTestLead({ id: 'lead-2', contactName: 'Jane Smith' }),
      ];

      (prisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads);
      (prisma.lead.count as jest.Mock).mockResolvedValue(2);

      const result = await leadService.listLeads({});

      expect(prisma.lead.findMany).toHaveBeenCalledWith({
        where: { archivedAt: null },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual(mockLeads);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      const mockLeads = [createTestLead({ status: 'qualified' })];

      (prisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads);
      (prisma.lead.count as jest.Mock).mockResolvedValue(1);

      await leadService.listLeads({ status: 'qualified' });

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'qualified',
            archivedAt: null,
          }),
        })
      );
    });

    it('should filter by leadSourceId', async () => {
      const mockLeads = [createTestLead({ leadSourceId: 'source-123' })];

      (prisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads);
      (prisma.lead.count as jest.Mock).mockResolvedValue(1);

      await leadService.listLeads({ leadSourceId: 'source-123' });

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leadSourceId: 'source-123',
          }),
        })
      );
    });

    it('should filter by assignedToUserId', async () => {
      const mockLeads = [createTestLead({ assignedToUserId: 'user-123' })];

      (prisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads);
      (prisma.lead.count as jest.Mock).mockResolvedValue(1);

      await leadService.listLeads({ assignedToUserId: 'user-123' });

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToUserId: 'user-123',
          }),
        })
      );
    });

    it('should search by contactName, companyName, and email', async () => {
      const mockLeads = [createTestLead()];

      (prisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads);
      (prisma.lead.count as jest.Mock).mockResolvedValue(1);

      await leadService.listLeads({ search: 'test' });

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { contactName: { contains: 'test', mode: 'insensitive' } },
              { companyName: { contains: 'test', mode: 'insensitive' } },
              { primaryEmail: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should include archived leads when requested', async () => {
      const mockLeads = [createTestLead({ archivedAt: new Date() })];

      (prisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads);
      (prisma.lead.count as jest.Mock).mockResolvedValue(1);

      await leadService.listLeads({ includeArchived: true });

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should paginate results correctly', async () => {
      const mockLeads = Array.from({ length: 10 }, (_, i) =>
        createTestLead({ id: `lead-${i}` })
      );

      (prisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads.slice(20, 30));
      (prisma.lead.count as jest.Mock).mockResolvedValue(100);

      const result = await leadService.listLeads({ page: 2, limit: 10 });

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 100,
        totalPages: 10,
      });
    });

    it('should sort by valid fields', async () => {
      const mockLeads = [createTestLead()];

      (prisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads);
      (prisma.lead.count as jest.Mock).mockResolvedValue(1);

      await leadService.listLeads({ sortBy: 'contactName', sortOrder: 'asc' });

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { contactName: 'asc' },
        })
      );
    });

    it('should default to createdAt for invalid sort field', async () => {
      const mockLeads = [createTestLead()];

      (prisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads);
      (prisma.lead.count as jest.Mock).mockResolvedValue(1);

      await leadService.listLeads({ sortBy: 'invalidField' });

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('getLeadById', () => {
    it('should return lead by id', async () => {
      const mockLead = createTestLead({ id: 'lead-123' });

      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(mockLead);

      const result = await leadService.getLeadById('lead-123');

      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockLead);
    });

    it('should return null for non-existent lead', async () => {
      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await leadService.getLeadById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createLead', () => {
    it('should create a new lead with all fields', async () => {
      const input: leadService.LeadCreateInput = {
        leadSourceId: 'source-123',
        companyName: 'Test Company',
        contactName: 'John Doe',
        primaryEmail: 'john@test.com',
        primaryPhone: '555-0100',
        secondaryEmail: 'john2@test.com',
        secondaryPhone: '555-0101',
        address: { street: '123 Test St', city: 'Test City' },
        estimatedValue: 10000,
        probability: 75,
        expectedCloseDate: new Date('2024-12-31'),
        notes: 'Test notes',
        assignedToUserId: 'user-123',
        createdByUserId: 'creator-123',
      };

      const mockLead = createTestLead(input);

      (prisma.lead.create as jest.Mock).mockResolvedValue(mockLead);

      const result = await leadService.createLead(input);

      expect(prisma.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyName: input.companyName,
          contactName: input.contactName,
          primaryEmail: input.primaryEmail,
          createdByUserId: input.createdByUserId,
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockLead);
    });

    it('should create lead with minimal required fields', async () => {
      const input: leadService.LeadCreateInput = {
        contactName: 'Jane Doe',
        createdByUserId: 'creator-123',
      };

      const mockLead = createTestLead(input);

      (prisma.lead.create as jest.Mock).mockResolvedValue(mockLead);

      const result = await leadService.createLead(input);

      expect(prisma.lead.create).toHaveBeenCalled();
      expect(result).toEqual(mockLead);
    });

    it('should default probability to 0 if not provided', async () => {
      const input: leadService.LeadCreateInput = {
        contactName: 'Jane Doe',
        createdByUserId: 'creator-123',
      };

      const mockLead = createTestLead({ ...input, probability: 0 });

      (prisma.lead.create as jest.Mock).mockResolvedValue(mockLead);

      await leadService.createLead(input);

      expect(prisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            probability: 0,
          }),
        })
      );
    });
  });

  describe('updateLead', () => {
    it('should update lead with provided fields', async () => {
      const input: leadService.LeadUpdateInput = {
        status: 'qualified',
        contactName: 'Updated Name',
        estimatedValue: 15000,
      };

      const mockLead = createTestLead({ ...input, id: 'lead-123' });

      (prisma.lead.update as jest.Mock).mockResolvedValue(mockLead);

      const result = await leadService.updateLead('lead-123', input);

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        data: expect.objectContaining({
          status: 'qualified',
          contactName: 'Updated Name',
          estimatedValue: 15000,
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockLead);
    });

    it('should disconnect leadSource when set to null', async () => {
      const input: leadService.LeadUpdateInput = {
        leadSourceId: null,
      };

      const mockLead = createTestLead({ id: 'lead-123', leadSourceId: null });

      (prisma.lead.update as jest.Mock).mockResolvedValue(mockLead);

      await leadService.updateLead('lead-123', input);

      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadSource: { disconnect: true },
          }),
        })
      );
    });

    it('should connect leadSource when provided', async () => {
      const input: leadService.LeadUpdateInput = {
        leadSourceId: 'source-456',
      };

      const mockLead = createTestLead({ id: 'lead-123', leadSourceId: 'source-456' });

      (prisma.lead.update as jest.Mock).mockResolvedValue(mockLead);

      await leadService.updateLead('lead-123', input);

      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadSource: { connect: { id: 'source-456' } },
          }),
        })
      );
    });

    it('should disconnect assignedToUser when set to null', async () => {
      const input: leadService.LeadUpdateInput = {
        assignedToUserId: null,
      };

      const mockLead = createTestLead({ id: 'lead-123', assignedToUserId: null });

      (prisma.lead.update as jest.Mock).mockResolvedValue(mockLead);

      await leadService.updateLead('lead-123', input);

      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedToUser: { disconnect: true },
          }),
        })
      );
    });
  });

  describe('archiveLead', () => {
    it('should set archivedAt timestamp', async () => {
      const mockLead = createTestLead({ id: 'lead-123', archivedAt: new Date() });

      (prisma.lead.update as jest.Mock).mockResolvedValue(mockLead);

      const result = await leadService.archiveLead('lead-123');

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        data: { archivedAt: expect.any(Date) },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockLead);
    });
  });

  describe('restoreLead', () => {
    it('should set archivedAt to null', async () => {
      const mockLead = createTestLead({ id: 'lead-123', archivedAt: null });

      (prisma.lead.update as jest.Mock).mockResolvedValue(mockLead);

      const result = await leadService.restoreLead('lead-123');

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        data: { archivedAt: null },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockLead);
    });
  });

  describe('deleteLead', () => {
    it('should delete lead by id', async () => {
      (prisma.lead.delete as jest.Mock).mockResolvedValue({ id: 'lead-123' });

      const result = await leadService.deleteLead('lead-123');

      expect(prisma.lead.delete).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        select: { id: true },
      });
      expect(result).toEqual({ id: 'lead-123' });
    });
  });
});
