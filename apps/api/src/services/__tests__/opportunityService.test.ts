import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as opportunityService from '../opportunityService';
import { prisma } from '../../lib/prisma';
import { createTestOpportunity, mockPaginatedResult } from '../../test/helpers';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    opportunity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('opportunityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listOpportunities', () => {
    it('should return paginated opportunities with default parameters', async () => {
      const mockOpportunities = [
        createTestOpportunity({ id: 'opp-1', name: 'Opportunity 1' }),
        createTestOpportunity({ id: 'opp-2', name: 'Opportunity 2' }),
      ];

      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities);
      (prisma.opportunity.count as jest.Mock).mockResolvedValue(2);

      const result = await opportunityService.listOpportunities({});

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith({
        where: { archivedAt: null },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual(mockOpportunities);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      const mockOpportunities = [createTestOpportunity({ status: 'negotiation' })];

      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities);
      (prisma.opportunity.count as jest.Mock).mockResolvedValue(1);

      await opportunityService.listOpportunities({ status: 'negotiation' });

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'negotiation',
            archivedAt: null,
          }),
        })
      );
    });

    it('should filter by leadId', async () => {
      const mockOpportunities = [createTestOpportunity({ leadId: 'lead-123' })];

      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities);
      (prisma.opportunity.count as jest.Mock).mockResolvedValue(1);

      await opportunityService.listOpportunities({ leadId: 'lead-123' });

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leadId: 'lead-123',
          }),
        })
      );
    });

    it('should filter by accountId', async () => {
      const mockOpportunities = [createTestOpportunity({ accountId: 'account-123' })];

      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities);
      (prisma.opportunity.count as jest.Mock).mockResolvedValue(1);

      await opportunityService.listOpportunities({ accountId: 'account-123' });

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'account-123',
          }),
        })
      );
    });

    it('should filter by assignedToUserId', async () => {
      const mockOpportunities = [createTestOpportunity({ assignedToUserId: 'user-123' })];

      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities);
      (prisma.opportunity.count as jest.Mock).mockResolvedValue(1);

      await opportunityService.listOpportunities({ assignedToUserId: 'user-123' });

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToUserId: 'user-123',
          }),
        })
      );
    });

    it('should search by name, description, lead, and account', async () => {
      const mockOpportunities = [createTestOpportunity()];

      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities);
      (prisma.opportunity.count as jest.Mock).mockResolvedValue(1);

      await opportunityService.listOpportunities({ search: 'test' });

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
              { lead: { contactName: { contains: 'test', mode: 'insensitive' } } },
              { lead: { companyName: { contains: 'test', mode: 'insensitive' } } },
              { account: { name: { contains: 'test', mode: 'insensitive' } } },
            ],
          }),
        })
      );
    });

    it('should include archived opportunities when requested', async () => {
      const mockOpportunities = [createTestOpportunity({ archivedAt: new Date() })];

      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities);
      (prisma.opportunity.count as jest.Mock).mockResolvedValue(1);

      await opportunityService.listOpportunities({ includeArchived: true });

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should paginate results correctly', async () => {
      const mockOpportunities = Array.from({ length: 10 }, (_, i) =>
        createTestOpportunity({ id: `opp-${i}` })
      );

      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities.slice(20, 30));
      (prisma.opportunity.count as jest.Mock).mockResolvedValue(100);

      const result = await opportunityService.listOpportunities({ page: 2, limit: 10 });

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
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
      const mockOpportunities = [createTestOpportunity()];

      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities);
      (prisma.opportunity.count as jest.Mock).mockResolvedValue(1);

      await opportunityService.listOpportunities({ sortBy: 'expectedValue', sortOrder: 'asc' });

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { expectedValue: 'asc' },
        })
      );
    });

    it('should default to createdAt for invalid sort field', async () => {
      const mockOpportunities = [createTestOpportunity()];

      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue(mockOpportunities);
      (prisma.opportunity.count as jest.Mock).mockResolvedValue(1);

      await opportunityService.listOpportunities({ sortBy: 'invalidField' });

      expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('getOpportunityById', () => {
    it('should return opportunity by id', async () => {
      const mockOpportunity = createTestOpportunity({ id: 'opp-123' });

      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue(mockOpportunity);

      const result = await opportunityService.getOpportunityById('opp-123');

      expect(prisma.opportunity.findUnique).toHaveBeenCalledWith({
        where: { id: 'opp-123' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockOpportunity);
    });

    it('should return null for non-existent opportunity', async () => {
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await opportunityService.getOpportunityById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createOpportunity', () => {
    it('should create a new opportunity with all fields', async () => {
      const input: opportunityService.OpportunityCreateInput = {
        leadId: 'lead-123',
        accountId: 'account-123',
        name: 'Big Deal Opportunity',
        status: 'qualification',
        probability: 50,
        expectedValue: 25000,
        expectedCloseDate: new Date('2024-12-31'),
        description: 'A great opportunity',
        assignedToUserId: 'user-123',
        createdByUserId: 'creator-123',
      };

      const mockOpportunity = createTestOpportunity(input);

      (prisma.opportunity.create as jest.Mock).mockResolvedValue(mockOpportunity);

      const result = await opportunityService.createOpportunity(input);

      expect(prisma.opportunity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: input.name,
          status: input.status,
          probability: input.probability,
          expectedValue: input.expectedValue,
          createdByUserId: input.createdByUserId,
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockOpportunity);
    });

    it('should create opportunity with minimal required fields', async () => {
      const input: opportunityService.OpportunityCreateInput = {
        name: 'Simple Opportunity',
        createdByUserId: 'creator-123',
      };

      const mockOpportunity = createTestOpportunity(input);

      (prisma.opportunity.create as jest.Mock).mockResolvedValue(mockOpportunity);

      const result = await opportunityService.createOpportunity(input);

      expect(prisma.opportunity.create).toHaveBeenCalled();
      expect(result).toEqual(mockOpportunity);
    });

    it('should default status to prospecting if not provided', async () => {
      const input: opportunityService.OpportunityCreateInput = {
        name: 'New Opportunity',
        createdByUserId: 'creator-123',
      };

      const mockOpportunity = createTestOpportunity({ ...input, status: 'prospecting' });

      (prisma.opportunity.create as jest.Mock).mockResolvedValue(mockOpportunity);

      await opportunityService.createOpportunity(input);

      expect(prisma.opportunity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'prospecting',
          }),
        })
      );
    });
  });

  describe('updateOpportunity', () => {
    it('should update opportunity with provided fields', async () => {
      const input: opportunityService.OpportunityUpdateInput = {
        status: 'closed_won',
        name: 'Updated Opportunity',
        actualValue: 30000,
        actualCloseDate: new Date('2024-06-15'),
      };

      const mockOpportunity = createTestOpportunity({ ...input, id: 'opp-123' });

      (prisma.opportunity.update as jest.Mock).mockResolvedValue(mockOpportunity);

      const result = await opportunityService.updateOpportunity('opp-123', input);

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: 'opp-123' },
        data: expect.objectContaining({
          status: 'closed_won',
          name: 'Updated Opportunity',
          actualValue: 30000,
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockOpportunity);
    });

    it('should disconnect lead when set to null', async () => {
      const input: opportunityService.OpportunityUpdateInput = {
        leadId: null,
      };

      const mockOpportunity = createTestOpportunity({ id: 'opp-123', leadId: null });

      (prisma.opportunity.update as jest.Mock).mockResolvedValue(mockOpportunity);

      await opportunityService.updateOpportunity('opp-123', input);

      expect(prisma.opportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lead: { disconnect: true },
          }),
        })
      );
    });

    it('should connect lead when provided', async () => {
      const input: opportunityService.OpportunityUpdateInput = {
        leadId: 'lead-456',
      };

      const mockOpportunity = createTestOpportunity({ id: 'opp-123', leadId: 'lead-456' });

      (prisma.opportunity.update as jest.Mock).mockResolvedValue(mockOpportunity);

      await opportunityService.updateOpportunity('opp-123', input);

      expect(prisma.opportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lead: { connect: { id: 'lead-456' } },
          }),
        })
      );
    });

    it('should disconnect account when set to null', async () => {
      const input: opportunityService.OpportunityUpdateInput = {
        accountId: null,
      };

      const mockOpportunity = createTestOpportunity({ id: 'opp-123', accountId: null });

      (prisma.opportunity.update as jest.Mock).mockResolvedValue(mockOpportunity);

      await opportunityService.updateOpportunity('opp-123', input);

      expect(prisma.opportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            account: { disconnect: true },
          }),
        })
      );
    });

    it('should connect account when provided', async () => {
      const input: opportunityService.OpportunityUpdateInput = {
        accountId: 'account-456',
      };

      const mockOpportunity = createTestOpportunity({ id: 'opp-123', accountId: 'account-456' });

      (prisma.opportunity.update as jest.Mock).mockResolvedValue(mockOpportunity);

      await opportunityService.updateOpportunity('opp-123', input);

      expect(prisma.opportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            account: { connect: { id: 'account-456' } },
          }),
        })
      );
    });

    it('should disconnect assignedToUser when set to null', async () => {
      const input: opportunityService.OpportunityUpdateInput = {
        assignedToUserId: null,
      };

      const mockOpportunity = createTestOpportunity({ id: 'opp-123', assignedToUserId: null });

      (prisma.opportunity.update as jest.Mock).mockResolvedValue(mockOpportunity);

      await opportunityService.updateOpportunity('opp-123', input);

      expect(prisma.opportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedToUser: { disconnect: true },
          }),
        })
      );
    });
  });

  describe('archiveOpportunity', () => {
    it('should set archivedAt timestamp', async () => {
      const mockOpportunity = createTestOpportunity({ id: 'opp-123', archivedAt: new Date() });

      (prisma.opportunity.update as jest.Mock).mockResolvedValue(mockOpportunity);

      const result = await opportunityService.archiveOpportunity('opp-123');

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: 'opp-123' },
        data: { archivedAt: expect.any(Date) },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockOpportunity);
    });
  });

  describe('restoreOpportunity', () => {
    it('should set archivedAt to null', async () => {
      const mockOpportunity = createTestOpportunity({ id: 'opp-123', archivedAt: null });

      (prisma.opportunity.update as jest.Mock).mockResolvedValue(mockOpportunity);

      const result = await opportunityService.restoreOpportunity('opp-123');

      expect(prisma.opportunity.update).toHaveBeenCalledWith({
        where: { id: 'opp-123' },
        data: { archivedAt: null },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockOpportunity);
    });
  });

  describe('deleteOpportunity', () => {
    it('should delete opportunity by id', async () => {
      (prisma.opportunity.delete as jest.Mock).mockResolvedValue({ id: 'opp-123' });

      const result = await opportunityService.deleteOpportunity('opp-123');

      expect(prisma.opportunity.delete).toHaveBeenCalledWith({
        where: { id: 'opp-123' },
        select: { id: true },
      });
      expect(result).toEqual({ id: 'opp-123' });
    });
  });
});
