import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as leadService from '../leadService';
import { prisma } from '../../lib/prisma';
import { createTestLead, mockPaginatedResult } from '../../test/helpers';
import { createNotification } from '../notificationService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    account: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    contact: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    facility: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    appointment: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    opportunity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
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

jest.mock('../notificationService', () => ({
  createNotification: jest.fn(),
}));

jest.mock('../geocodingService', () => ({
  geocodeAddressIfNeeded: jest.fn(async (address) => address),
}));

describe('leadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(prisma));
    (prisma.account.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.facility.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.account.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.facility.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.opportunity.create as jest.Mock).mockResolvedValue({ id: 'opp-1' });
    (prisma.opportunity.update as jest.Mock).mockResolvedValue({ id: 'opp-1' });
    (prisma.appointment.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
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
      const mockLeads = [createTestLead({ status: 'lead' })];

      (prisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads);
      (prisma.lead.count as jest.Mock).mockResolvedValue(1);

      await leadService.listLeads({ status: 'lead' });

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'lead',
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
        type: 'commercial',
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
        createdByUserId: 'creator-123',
      };

      const mockLead = createTestLead(input);

      (prisma.lead.create as jest.Mock).mockResolvedValue(mockLead);

      const result = await leadService.createLead(input);

      expect(prisma.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: input.type,
          companyName: input.companyName,
          contactName: input.contactName,
          primaryEmail: input.primaryEmail,
          createdByUserId: input.createdByUserId,
        }),
        select: expect.any(Object),
      });
      expect(prisma.opportunity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId: mockLead.id,
          title: 'Test Company',
          status: 'new',
          createdByUserId: input.createdByUserId,
        }),
      });
      expect(result).toEqual(mockLead);
      expect(createNotification).not.toHaveBeenCalled();
    });

    it('should create lead with minimal required fields', async () => {
      const input: leadService.LeadCreateInput = {
        type: 'residential',
        contactName: 'Jane Doe',
        createdByUserId: 'creator-123',
      };

      const mockLead = createTestLead(input);

      (prisma.lead.create as jest.Mock).mockResolvedValue(mockLead);

      const result = await leadService.createLead(input);

      expect(prisma.lead.create).toHaveBeenCalled();
      expect(result).toEqual(mockLead);
      expect(createNotification).not.toHaveBeenCalled();
    });

    it('should default probability to 0 if not provided', async () => {
      const input: leadService.LeadCreateInput = {
        type: 'commercial',
        contactName: 'Jane Doe',
        createdByUserId: 'creator-123',
      };

      const mockLead = createTestLead({ ...input, probability: 0 });

      (prisma.lead.create as jest.Mock).mockResolvedValue(mockLead);

      await leadService.createLead(input);

      expect(prisma.opportunity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId: mockLead.id,
          title: mockLead.companyName ?? mockLead.contactName,
          probability: 0,
        }),
      });
      expect(prisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: input.type,
            probability: 0,
          }),
        })
      );
      expect(createNotification).not.toHaveBeenCalled();
    });
  });

  describe('updateLead', () => {
    it('should update lead with provided fields', async () => {
      const input: leadService.LeadUpdateInput = {
        status: 'negotiation',
        contactName: 'Updated Name',
        estimatedValue: 15000,
      };

      const mockLead = createTestLead({ ...input, id: 'lead-123' });

      (prisma.lead.update as jest.Mock).mockResolvedValue(mockLead);

      const result = await leadService.updateLead('lead-123', input);

      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        data: expect.objectContaining({
          status: 'negotiation',
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

    it('should reject walkthrough booked status when no walkthrough is scheduled', async () => {
      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        leadService.updateLead('lead-123', { status: 'walk_through_booked' })
      ).rejects.toThrow('Walkthrough must be scheduled before marking lead as walkthrough booked');
    });

    it('should clear opportunity closed timestamps when a lost lead is reopened', async () => {
      const mockLead = createTestLead({
        id: 'lead-123',
        status: 'negotiation',
        contactName: 'Updated Name',
        assignedToUser: null,
        archivedAt: null,
      });

      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'opp-1',
          accountId: 'account-1',
          leadId: 'lead-123',
          status: 'lost',
          updatedAt: new Date('2026-03-10T10:00:00.000Z'),
          createdAt: new Date('2026-03-10T09:00:00.000Z'),
        },
      ]);
      (prisma.lead.update as jest.Mock).mockResolvedValue(mockLead);

      await leadService.updateLead('lead-123', { status: 'negotiation' });

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: 'opp-1' },
        data: expect.objectContaining({
          status: 'negotiation',
          wonAt: null,
          lostAt: null,
          closedAt: null,
        }),
      });
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

  describe('convertLead', () => {
    it('should preserve existing lead status when converting without a walkthrough booking', async () => {
      const leadId = 'lead-123';
      const existingLead = createTestLead({
        id: leadId,
        status: 'lead',
        convertedToAccountId: null,
        companyName: 'Acme Corporation',
        contactName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
        primaryPhone: '555-0100',
        archivedAt: null,
      });

      const updatedLead = {
        ...existingLead,
        convertedToAccountId: 'account-1',
        convertedAt: new Date('2026-03-10T10:00:00Z'),
        convertedByUserId: 'user-1',
      };

      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(existingLead);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
        callback({
          account: {
            create: jest.fn().mockResolvedValue({ id: 'account-1', name: 'Acme Corporation' }),
            findUnique: jest.fn(),
            findFirst: jest.fn().mockResolvedValue(null),
            findMany: jest.fn().mockResolvedValue([]),
          },
          contact: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'contact-1',
              name: 'Jane Smith',
              email: 'jane@example.com',
            }),
            update: jest.fn(),
          },
          facility: {
            create: jest.fn().mockResolvedValue({ id: 'facility-1', name: 'HQ' }),
            findUnique: jest.fn(),
            update: jest.fn(),
            findFirst: jest.fn().mockResolvedValue(null),
            findMany: jest.fn().mockResolvedValue([]),
          },
          appointment: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          opportunity: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ id: 'opp-1' }),
            update: jest.fn().mockResolvedValue({ id: 'opp-1' }),
          },
          lead: {
            update: jest.fn().mockResolvedValue(updatedLead),
          },
        })
      );

      const result = await leadService.convertLead(leadId, {
        createNewAccount: true,
        accountData: {
          name: 'Acme Corporation',
          type: 'commercial',
        },
        facilityOption: 'new',
        facilityData: {
          name: 'HQ',
          address: {
            street: '123 Main St',
          },
        },
        userId: 'user-1',
      });

      expect(result.lead.status).toBe('lead');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should reuse the existing primary contact when converting into an existing account', async () => {
      const leadId = 'lead-123';
      const existingLead = createTestLead({
        id: leadId,
        status: 'lead',
        convertedToAccountId: null,
        companyName: 'Acme Corporation',
        contactName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
        primaryPhone: '555-0100',
        archivedAt: null,
      });

      const updatedLead = {
        ...existingLead,
        convertedToAccountId: 'account-1',
        convertedAt: new Date('2026-03-10T10:00:00Z'),
        convertedByUserId: 'user-1',
      };

      const updateContactMock = jest.fn().mockResolvedValue({
        id: 'contact-1',
        name: 'Existing Primary',
        email: 'existing@example.com',
      });
      const createContactMock = jest.fn();

      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(existingLead);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
        callback({
          account: {
            create: jest.fn(),
            findUnique: jest.fn().mockResolvedValue({ id: 'account-1', name: 'Acme Corporation' }),
            findFirst: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
          },
          contact: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'contact-1',
              name: 'Existing Primary',
              email: 'existing@example.com',
              phone: null,
              isPrimary: true,
            }),
            create: createContactMock,
            update: updateContactMock,
          },
          facility: {
            create: jest.fn().mockResolvedValue({ id: 'facility-1', name: 'HQ' }),
            findUnique: jest.fn(),
            update: jest.fn(),
            findFirst: jest.fn().mockResolvedValue(null),
            findMany: jest.fn().mockResolvedValue([]),
          },
          appointment: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          opportunity: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ id: 'opp-1' }),
            update: jest.fn().mockResolvedValue({ id: 'opp-1' }),
          },
          lead: {
            update: jest.fn().mockResolvedValue(updatedLead),
          },
        })
      );

      const result = await leadService.convertLead(leadId, {
        createNewAccount: false,
        existingAccountId: 'account-1',
        facilityOption: 'new',
        facilityData: {
          name: 'HQ',
          address: {
            street: '123 Main St',
          },
        },
        userId: 'user-1',
      });

      expect(updateContactMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contact-1' },
          data: expect.objectContaining({
            email: 'existing@example.com',
            phone: '555-0100',
          }),
        })
      );
      expect(createContactMock).not.toHaveBeenCalled();
      expect(result.contact.id).toBe('contact-1');
    });

    it('should block creating a duplicate account during conversion', async () => {
      const leadId = 'lead-123';
      const existingLead = createTestLead({
        id: leadId,
        status: 'lead',
        convertedToAccountId: null,
        companyName: 'Acme Corporation',
        contactName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
        primaryPhone: '555-0100',
        archivedAt: null,
      });

      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(existingLead);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
        callback({
          account: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'account-1',
                name: 'Acme Corporation',
                billingEmail: null,
                billingPhone: null,
              },
            ]),
          },
          contact: {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
          facility: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
          },
          appointment: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          opportunity: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ id: 'opp-1' }),
            update: jest.fn().mockResolvedValue({ id: 'opp-1' }),
          },
          lead: {
            update: jest.fn(),
          },
        })
      );

      await expect(
        leadService.convertLead(leadId, {
          createNewAccount: true,
          accountData: {
            name: ' Acme Corporation ',
            type: 'commercial',
          },
          facilityOption: 'new',
          facilityData: {
            name: 'HQ',
            address: {
              street: '123 Main St',
            },
          },
          userId: 'user-1',
        })
      ).rejects.toThrow('A matching account already exists');
    });

    it('should block creating a duplicate facility during conversion', async () => {
      const leadId = 'lead-123';
      const existingLead = createTestLead({
        id: leadId,
        status: 'lead',
        convertedToAccountId: null,
        companyName: 'Acme Corporation',
        contactName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
        primaryPhone: '555-0100',
        archivedAt: null,
      });

      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(existingLead);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
        callback({
          account: {
            create: jest.fn().mockResolvedValue({ id: 'account-1', name: 'Acme Corporation' }),
            findUnique: jest.fn(),
            findFirst: jest.fn().mockResolvedValue(null),
            findMany: jest.fn().mockResolvedValue([]),
          },
          contact: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'contact-1',
              name: 'Jane Smith',
              email: 'jane@example.com',
            }),
            update: jest.fn(),
          },
          facility: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'facility-1',
                name: 'HQ',
              },
            ]),
          },
          appointment: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          opportunity: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ id: 'opp-1' }),
            update: jest.fn().mockResolvedValue({ id: 'opp-1' }),
          },
          lead: {
            update: jest.fn(),
          },
        })
      );

      await expect(
        leadService.convertLead(leadId, {
          createNewAccount: true,
          accountData: {
            name: 'Acme Corporation',
            type: 'commercial',
          },
          facilityOption: 'new',
          facilityData: {
            name: ' hq ',
            address: {
              street: '123 Main St',
            },
          },
          userId: 'user-1',
        })
      ).rejects.toThrow('already exists for this account');
    });

    it('should block converting into an account already linked to another lead', async () => {
      const leadId = 'lead-123';
      const existingLead = createTestLead({
        id: leadId,
        status: 'lead',
        convertedToAccountId: null,
        companyName: 'Acme Corporation',
        contactName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
        primaryPhone: '555-0100',
        archivedAt: null,
      });

      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(existingLead);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
        callback({
          account: {
            create: jest.fn(),
            findUnique: jest.fn().mockResolvedValue({
              id: 'account-1',
              name: 'Acme Corporation',
              sourceLead: {
                id: 'lead-other',
              },
            }),
            findFirst: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
          },
          contact: {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
          facility: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
          },
          appointment: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          opportunity: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ id: 'opp-1' }),
            update: jest.fn().mockResolvedValue({ id: 'opp-1' }),
          },
          lead: {
            update: jest.fn(),
          },
        })
      );

      await expect(
        leadService.convertLead(leadId, {
          createNewAccount: false,
          existingAccountId: 'account-1',
          facilityOption: 'existing',
          existingFacilityId: 'facility-1',
          userId: 'user-1',
        })
      ).rejects.toThrow('already linked to another lead');
    });

    it('should block creating a duplicate account during conversion by normalized name', async () => {
      const leadId = 'lead-123';
      const existingLead = createTestLead({
        id: leadId,
        status: 'lead',
        convertedToAccountId: null,
        companyName: 'Acme Corp',
        contactName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
        primaryPhone: '555-0100',
        archivedAt: null,
      });

      (prisma.lead.findUnique as jest.Mock).mockResolvedValue(existingLead);
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
        callback({
          account: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'account-1',
                name: 'Acme Corporation, LLC',
                billingEmail: null,
                billingPhone: null,
              },
            ]),
          },
          contact: {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
          facility: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
          },
          appointment: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          opportunity: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ id: 'opp-1' }),
            update: jest.fn().mockResolvedValue({ id: 'opp-1' }),
          },
          lead: {
            update: jest.fn(),
          },
        })
      );

      await expect(
        leadService.convertLead(leadId, {
          createNewAccount: true,
          accountData: {
            name: ' ACME Corp ',
            type: 'commercial',
          },
          facilityOption: 'new',
          facilityData: {
            name: 'HQ',
            address: {
              street: '123 Main St',
            },
          },
          userId: 'user-1',
        })
      ).rejects.toThrow('A matching account already exists');
    });
  });

  describe('autoSetLeadStatusForAccount', () => {
    it('should not downgrade a won lead to lost', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue({
        sourceLead: {
          id: 'lead-1',
          status: 'won',
          archivedAt: null,
        },
      });

      await leadService.autoSetLeadStatusForAccount('account-1', 'lost');

      expect(prisma.lead.update).not.toHaveBeenCalled();
    });
  });

  describe('autoSetLeadStatusForOpportunity', () => {
    it('should clear closed timestamps when reopening a lost opportunity', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: 'opp-1',
        status: 'lost',
        archivedAt: null,
        leadId: 'lead-1',
      });
      (prisma.lead.findUnique as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        status: 'lost',
        archivedAt: null,
      });

      await leadService.autoSetLeadStatusForOpportunity('opp-1', 'negotiation');

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: 'opp-1' },
        data: {
          status: 'negotiation',
          wonAt: null,
          lostAt: null,
          closedAt: null,
        },
      });
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { status: 'negotiation' },
      });
    });
  });
});
