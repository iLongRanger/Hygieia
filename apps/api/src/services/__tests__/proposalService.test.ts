import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as proposalService from '../proposalService';
import * as pricingService from '../pricing';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    proposal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    pricingSettings: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
    },
    facility: {
      findUnique: jest.fn(),
    },
    opportunity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    appointment: {
      findFirst: jest.fn(),
    },
    area: {
      count: jest.fn(),
    },
    facilityTask: {
      count: jest.fn(),
    },
  },
}));

const createTestProposal = (overrides = {}) => ({
  id: 'proposal-1',
  proposalNumber: 'PROP-20260116-0001',
  title: 'Test Proposal',
  status: 'draft',
  description: 'Test description',
  subtotal: 1000,
  taxRate: 0.08,
  taxAmount: 80,
  totalAmount: 1080,
  validUntil: new Date('2026-02-15'),
  sentAt: null,
  viewedAt: null,
  acceptedAt: null,
  rejectedAt: null,
  rejectionReason: null,
  notes: null,
  termsAndConditions: null,
  accountId: 'account-1',
  facilityId: 'facility-1',
  createdByUserId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  archivedAt: null,
  account: {
    id: 'account-1',
    name: 'Test Account',
    type: 'commercial',
  },
  facility: {
    id: 'facility-1',
    name: 'Main Building',
    address: {},
  },
  createdByUser: {
    id: 'user-1',
    fullName: 'John Doe',
    email: 'john@example.com',
  },
  proposalItems: [],
  proposalServices: [],
  ...overrides,
});

describe('proposalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(pricingService, 'resolvePricingPlan').mockResolvedValue({
      id: 'pricing-plan-1',
      name: 'Standard',
      pricingType: 'square_foot',
    } as any);
    (prisma.account.findUnique as jest.Mock).mockResolvedValue({
      id: 'account-1',
      archivedAt: null,
    });
    (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'opp-1',
        accountId: 'account-1',
        leadId: 'lead-1',
        status: 'walk_through_completed',
        updatedAt: new Date('2026-03-10T10:00:00.000Z'),
        createdAt: new Date('2026-03-10T09:00:00.000Z'),
      },
    ]);
    (prisma.appointment.findFirst as jest.Mock).mockResolvedValue({ id: 'appt-1' });
    (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
      id: 'facility-1',
      accountId: 'account-1',
      archivedAt: null,
      status: 'active',
    });
    (prisma.area.count as jest.Mock).mockResolvedValue(1);
    (prisma.facilityTask.count as jest.Mock).mockResolvedValue(1);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listProposals', () => {
    it('should return paginated proposals with default parameters', async () => {
      const mockProposals = [
        createTestProposal({ id: 'proposal-1', title: 'Proposal 1' }),
        createTestProposal({ id: 'proposal-2', title: 'Proposal 2' }),
      ];

      (prisma.proposal.findMany as jest.Mock).mockResolvedValue(mockProposals);
      (prisma.proposal.count as jest.Mock).mockResolvedValue(2);

      const result = await proposalService.listProposals({});

      expect(prisma.proposal.findMany).toHaveBeenCalledWith({
        where: { archivedAt: null },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(result.data).toEqual(mockProposals);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      const mockProposals = [createTestProposal({ status: 'sent' })];

      (prisma.proposal.findMany as jest.Mock).mockResolvedValue(mockProposals);
      (prisma.proposal.count as jest.Mock).mockResolvedValue(1);

      await proposalService.listProposals({ status: 'sent' });

      expect(prisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'sent',
            archivedAt: null,
          }),
        })
      );
    });

    it('should filter by accountId', async () => {
      const mockProposals = [createTestProposal({ accountId: 'account-123' })];

      (prisma.proposal.findMany as jest.Mock).mockResolvedValue(mockProposals);
      (prisma.proposal.count as jest.Mock).mockResolvedValue(1);

      await proposalService.listProposals({ accountId: 'account-123' });

      expect(prisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'account-123',
          }),
        })
      );
    });

    it('should filter by facilityId', async () => {
      const mockProposals = [createTestProposal({ facilityId: 'facility-123' })];

      (prisma.proposal.findMany as jest.Mock).mockResolvedValue(mockProposals);
      (prisma.proposal.count as jest.Mock).mockResolvedValue(1);

      await proposalService.listProposals({ facilityId: 'facility-123' });

      expect(prisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            facilityId: 'facility-123',
          }),
        })
      );
    });

    it('should search by proposal number, title, description, and account', async () => {
      const mockProposals = [createTestProposal()];

      (prisma.proposal.findMany as jest.Mock).mockResolvedValue(mockProposals);
      (prisma.proposal.count as jest.Mock).mockResolvedValue(1);

      await proposalService.listProposals({ search: 'test' });

      expect(prisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { proposalNumber: { contains: 'test', mode: 'insensitive' } },
              { title: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
              { account: { name: { contains: 'test', mode: 'insensitive' } } },
            ],
          }),
        })
      );
    });

    it('should include archived proposals when requested', async () => {
      const mockProposals = [createTestProposal({ archivedAt: new Date() })];

      (prisma.proposal.findMany as jest.Mock).mockResolvedValue(mockProposals);
      (prisma.proposal.count as jest.Mock).mockResolvedValue(1);

      await proposalService.listProposals({ includeArchived: true });

      expect(prisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            archivedAt: null,
          }),
        })
      );
    });

    it('should apply pagination correctly', async () => {
      const mockProposals = [createTestProposal()];

      (prisma.proposal.findMany as jest.Mock).mockResolvedValue(mockProposals);
      (prisma.proposal.count as jest.Mock).mockResolvedValue(45);

      const result = await proposalService.listProposals({ page: 2, limit: 10 });

      expect(prisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 45,
        totalPages: 5,
      });
    });

    it('should sort by valid sort fields', async () => {
      const mockProposals = [createTestProposal()];

      (prisma.proposal.findMany as jest.Mock).mockResolvedValue(mockProposals);
      (prisma.proposal.count as jest.Mock).mockResolvedValue(1);

      await proposalService.listProposals({ sortBy: 'totalAmount', sortOrder: 'asc' });

      expect(prisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { totalAmount: 'asc' },
        })
      );
    });
  });

  describe('getProposalById', () => {
    it('should return proposal by ID', async () => {
      const mockProposal = createTestProposal();

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(mockProposal);

      const result = await proposalService.getProposalById('proposal-1');

      expect(prisma.proposal.findUnique).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockProposal);
    });

    it('should return null if proposal not found', async () => {
      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await proposalService.getProposalById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getProposalByNumber', () => {
    it('should return proposal by proposal number', async () => {
      const mockProposal = createTestProposal();

      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(mockProposal);

      const result = await proposalService.getProposalByNumber('PROP-20260116-0001');

      expect(prisma.proposal.findUnique).toHaveBeenCalledWith({
        where: { proposalNumber: 'PROP-20260116-0001' },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockProposal);
    });
  });

  describe('getProposalsAvailableForContract', () => {
    it('should scope accepted proposals for managers', async () => {
      (prisma.proposal.findMany as jest.Mock).mockResolvedValue([createTestProposal({
        status: 'accepted',
      })]);

      await proposalService.getProposalsAvailableForContract(undefined, {
        userRole: 'manager',
        userId: 'manager-123',
      });

      expect(prisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'accepted',
            archivedAt: null,
            AND: [
              {
                OR: [
                  { createdByUserId: 'manager-123' },
                  { account: { accountManagerId: 'manager-123' } },
                ],
              },
            ],
          }),
        })
      );
    });

    it('should preserve account filtering when scoping manager access', async () => {
      (prisma.proposal.findMany as jest.Mock).mockResolvedValue([]);

      await proposalService.getProposalsAvailableForContract('account-123', {
        userRole: 'manager',
        userId: 'manager-123',
      });

      expect(prisma.proposal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'account-123',
          }),
        })
      );
    });
  });

  describe('createProposal', () => {
    beforeEach(() => {
      (prisma.proposal.findFirst as jest.Mock).mockResolvedValue(null);
    });

    it('should create proposal with minimal data', async () => {
      const mockProposal = createTestProposal();
      (prisma.proposal.create as jest.Mock).mockResolvedValue(mockProposal);

      const input = {
        accountId: 'account-1',
        title: 'Test Proposal',
        createdByUserId: 'user-1',
      };

      const result = await proposalService.createProposal(input);

      expect(prisma.proposal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          proposalNumber: expect.stringMatching(/^PROP-\d{8}-\d{4}$/),
          title: 'Test Proposal',
          accountId: 'account-1',
          status: 'draft',
          subtotal: 0,
          taxRate: 0,
          taxAmount: 0,
          totalAmount: 0,
          createdByUserId: 'user-1',
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockProposal);
    });

    it('should create proposal with items and calculate totals', async () => {
      const mockProposal = createTestProposal();
      (prisma.proposal.create as jest.Mock).mockResolvedValue(mockProposal);

      const input = {
        accountId: 'account-1',
        title: 'Test Proposal',
        taxRate: 0.08,
        createdByUserId: 'user-1',
        proposalItems: [
          {
            itemType: 'labor',
            description: 'Cleaning labor',
            quantity: 10,
            unitPrice: 50,
            totalPrice: 500,
          },
        ],
      };

      await proposalService.createProposal(input);

      expect(prisma.proposal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subtotal: 500,
          taxRate: 0.08,
          taxAmount: 40,
          totalAmount: 540,
        }),
        select: expect.any(Object),
      });
    });

    it('should ignore zero-value proposal items on create', async () => {
      const mockProposal = createTestProposal();
      (prisma.proposal.create as jest.Mock).mockResolvedValue(mockProposal);

      await proposalService.createProposal({
        accountId: 'account-1',
        title: 'Test Proposal',
        createdByUserId: 'user-1',
        proposalItems: [
          {
            itemType: 'labor',
            description: 'Zero item',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
          },
          {
            itemType: 'labor',
            description: 'Paid item',
            quantity: 2,
            unitPrice: 50,
            totalPrice: 100,
          },
        ],
      });

      expect(prisma.proposal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 100,
            proposalItems: {
              create: [
                expect.objectContaining({
                  description: 'Paid item',
                  totalPrice: 100,
                }),
              ],
            },
          }),
        })
      );
    });

    it('should create proposal with services and calculate totals', async () => {
      const mockProposal = createTestProposal();
      (prisma.proposal.create as jest.Mock).mockResolvedValue(mockProposal);

      const input = {
        accountId: 'account-1',
        title: 'Test Proposal',
        taxRate: 0.1,
        createdByUserId: 'user-1',
        proposalServices: [
          {
            serviceName: 'Daily Cleaning',
            serviceType: 'daily',
            frequency: 'daily',
            monthlyPrice: 2000,
          },
        ],
      };

      await proposalService.createProposal(input);

      expect(prisma.proposal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subtotal: 2000,
          taxRate: 0.1,
          taxAmount: 200,
          totalAmount: 2200,
        }),
        select: expect.any(Object),
      });
    });

    it('should generate sequential proposal numbers for same day', async () => {
      (prisma.proposal.findFirst as jest.Mock).mockResolvedValueOnce({
        proposalNumber: 'PROP-20260116-0005',
      });

      const mockProposal = createTestProposal();
      (prisma.proposal.create as jest.Mock).mockResolvedValue(mockProposal);

      const input = {
        accountId: 'account-1',
        title: 'Test Proposal',
        createdByUserId: 'user-1',
      };

      await proposalService.createProposal(input);

      expect(prisma.proposal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          proposalNumber: expect.stringMatching(/-0006$/),
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('updateProposal', () => {
    it('should update basic proposal fields', async () => {
      const mockProposal = createTestProposal();
      (prisma.proposal.update as jest.Mock).mockResolvedValue(mockProposal);

      const input = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      const result = await proposalService.updateProposal('proposal-1', input);

      expect(prisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          title: 'Updated Title',
          description: 'Updated description',
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockProposal);
    });

    it('should re-run readiness checks when changing facility', async () => {
      (prisma.proposal.findUnique as jest.Mock).mockResolvedValueOnce({
        accountId: 'account-1',
        facilityId: 'facility-1',
        taxRate: 0.08,
      });
      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        id: 'facility-2',
        accountId: 'account-1',
        archivedAt: null,
        status: 'active',
      });
      (prisma.area.count as jest.Mock).mockResolvedValue(0);

      await expect(
        proposalService.updateProposal('proposal-1', {
          facilityId: 'facility-2',
        })
      ).rejects.toThrow('Facility must have at least one area before creating a proposal');

      expect(prisma.proposal.update).not.toHaveBeenCalled();
    });

    it('should re-run readiness checks when changing account and facility', async () => {
      const mockProposal = createTestProposal({
        accountId: 'account-2',
        facilityId: 'facility-2',
      });
      (prisma.proposal.findUnique as jest.Mock).mockResolvedValueOnce({
        accountId: 'account-1',
        facilityId: 'facility-1',
        taxRate: 0.08,
      });
      (prisma.account.findUnique as jest.Mock).mockResolvedValue({
        id: 'account-2',
        archivedAt: null,
      });
      (prisma.opportunity.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'opp-2',
          accountId: 'account-2',
          leadId: 'lead-2',
          status: 'walk_through_completed',
          updatedAt: new Date('2026-03-10T11:00:00.000Z'),
          createdAt: new Date('2026-03-10T09:00:00.000Z'),
        },
      ]);
      (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
        id: 'facility-2',
        accountId: 'account-2',
        archivedAt: null,
        status: 'active',
      });
      (prisma.proposal.update as jest.Mock).mockResolvedValue(mockProposal);

      const result = await proposalService.updateProposal('proposal-1', {
        accountId: 'account-2',
        facilityId: 'facility-2',
      });

      expect(prisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          account: { connect: { id: 'account-2' } },
          facility: { connect: { id: 'facility-2' } },
        }),
        select: expect.any(Object),
      });
      expect(result).toEqual(mockProposal);
    });

    it('should validate opportunity ownership when only opportunityId changes', async () => {
      (prisma.proposal.findUnique as jest.Mock).mockResolvedValueOnce({
        accountId: 'account-1',
        facilityId: 'facility-1',
        opportunityId: 'opp-1',
        taxRate: 0.08,
      });
      (prisma.opportunity.findUnique as jest.Mock).mockResolvedValue({
        id: 'opp-foreign',
        accountId: 'account-2',
        leadId: 'lead-2',
        archivedAt: null,
      });

      await expect(
        proposalService.updateProposal('proposal-1', {
          opportunityId: 'opp-foreign',
        })
      ).rejects.toThrow('Opportunity does not belong to the selected account');

      expect(prisma.proposal.update).not.toHaveBeenCalled();
    });

    it('should recalculate totals when items are updated', async () => {
      const currentProposal = createTestProposal({
        proposalItems: [],
        proposalServices: [],
      });
      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(currentProposal);
      (prisma.proposal.update as jest.Mock).mockResolvedValue(currentProposal);

      const input = {
        proposalItems: [
          {
            itemType: 'labor',
            description: 'Updated item',
            quantity: 5,
            unitPrice: 100,
            totalPrice: 500,
          },
        ],
        taxRate: 0.1,
      };

      await proposalService.updateProposal('proposal-1', input);

      expect(prisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: expect.objectContaining({
          subtotal: 500,
          taxRate: 0.1,
          taxAmount: 50,
          totalAmount: 550,
          proposalItems: {
            deleteMany: {},
            create: expect.any(Array),
          },
        }),
        select: expect.any(Object),
      });
    });

    it('should ignore zero-value proposal items on update', async () => {
      const currentProposal = createTestProposal({
        proposalItems: [],
        proposalServices: [],
      });
      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(currentProposal);
      (prisma.proposal.update as jest.Mock).mockResolvedValue(currentProposal);

      await proposalService.updateProposal('proposal-1', {
        proposalItems: [
          {
            itemType: 'supplies',
            description: 'No charge',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
          },
          {
            itemType: 'materials',
            description: 'Chargeable',
            quantity: 1,
            unitPrice: 250,
            totalPrice: 250,
          },
        ],
        taxRate: 0,
      });

      expect(prisma.proposal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 250,
            proposalItems: {
              deleteMany: {},
              create: [
                expect.objectContaining({
                  description: 'Chargeable',
                  totalPrice: 250,
                }),
              ],
            },
          }),
        })
      );
    });
  });

  describe('sendProposal', () => {
    it('should mark proposal as sent with timestamp', async () => {
      const mockProposal = createTestProposal({ status: 'sent', sentAt: new Date() });
      (prisma.proposal.update as jest.Mock).mockResolvedValue(mockProposal);

      const result = await proposalService.sendProposal('proposal-1');

      expect(prisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: {
          status: 'sent',
          sentAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockProposal);
    });

    it('should allow creating another proposal for a facility that already had proposals', async () => {
      const mockProposal = createTestProposal();
      (prisma.proposal.create as jest.Mock).mockResolvedValue(mockProposal);

      const result = await proposalService.createProposal({
        accountId: 'account-1',
        facilityId: 'facility-1',
        title: 'Repeat Proposal',
        createdByUserId: 'user-1',
      });

      expect(result).toEqual(mockProposal);
      expect(prisma.facility.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'facility-1' },
        })
      );
    });

    it('should require a completed walkthrough before creating a proposal', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue({
        id: 'account-1',
        archivedAt: null,
      });
      (prisma.appointment.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        proposalService.createProposal({
          accountId: 'account-1',
          facilityId: 'facility-1',
          title: 'Blocked Proposal',
          createdByUserId: 'user-1',
        })
      ).rejects.toThrow('Walkthrough must be completed before creating a proposal');

      expect(prisma.proposal.create).not.toHaveBeenCalled();
    });

    it('should require facility scope data before creating a proposal', async () => {
      (prisma.area.count as jest.Mock).mockResolvedValue(0);

      await expect(
        proposalService.createProposal({
          accountId: 'account-1',
          facilityId: 'facility-1',
          title: 'Blocked Proposal',
          createdByUserId: 'user-1',
        })
      ).rejects.toThrow('Facility must have at least one area before creating a proposal');

      expect(prisma.proposal.create).not.toHaveBeenCalled();
    });
  });

  describe('markProposalAsViewed', () => {
    it('should mark proposal as viewed if not already viewed', async () => {
      const sentProposal = createTestProposal({ status: 'sent', viewedAt: null });
      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(sentProposal);

      const viewedProposal = createTestProposal({ status: 'viewed', viewedAt: new Date() });
      (prisma.proposal.update as jest.Mock).mockResolvedValue(viewedProposal);

      const result = await proposalService.markProposalAsViewed('proposal-1');

      expect(prisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: {
          status: 'viewed',
          viewedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(viewedProposal);
    });

    it('should not update if already viewed', async () => {
      const viewedProposal = createTestProposal({ status: 'viewed', viewedAt: new Date() });
      (prisma.proposal.findUnique as jest.Mock)
        .mockResolvedValueOnce(viewedProposal)
        .mockResolvedValueOnce(viewedProposal);

      await proposalService.markProposalAsViewed('proposal-1');

      expect(prisma.proposal.update).not.toHaveBeenCalled();
      expect(prisma.proposal.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('acceptProposal', () => {
    it('should mark proposal as accepted with timestamp', async () => {
      const mockProposal = createTestProposal({ status: 'accepted', acceptedAt: new Date() });
      (prisma.proposal.update as jest.Mock).mockResolvedValue(mockProposal);

      const result = await proposalService.acceptProposal('proposal-1');

      expect(prisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: {
          status: 'accepted',
          acceptedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockProposal);
    });
  });

  describe('rejectProposal', () => {
    it('should mark proposal as rejected with reason and timestamp', async () => {
      const mockProposal = createTestProposal({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: 'Too expensive',
      });
      (prisma.proposal.update as jest.Mock).mockResolvedValue(mockProposal);

      const result = await proposalService.rejectProposal('proposal-1', 'Too expensive');

      expect(prisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: {
          status: 'rejected',
          rejectedAt: expect.any(Date),
          rejectionReason: 'Too expensive',
        },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockProposal);
    });
  });

  describe('archiveProposal', () => {
    it('should set archivedAt timestamp', async () => {
      const mockProposal = createTestProposal({ archivedAt: new Date() });
      (prisma.proposal.update as jest.Mock).mockResolvedValue(mockProposal);

      const result = await proposalService.archiveProposal('proposal-1');

      expect(prisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: { archivedAt: expect.any(Date) },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockProposal);
    });
  });

  describe('restoreProposal', () => {
    it('should clear archivedAt timestamp', async () => {
      const mockProposal = createTestProposal({ archivedAt: null });
      (prisma.proposal.update as jest.Mock).mockResolvedValue(mockProposal);

      const result = await proposalService.restoreProposal('proposal-1');

      expect(prisma.proposal.update).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        data: { archivedAt: null },
        select: expect.any(Object),
      });
      expect(result).toEqual(mockProposal);
    });
  });

  describe('deleteProposal', () => {
    it('should delete proposal permanently', async () => {
      (prisma.proposal.delete as jest.Mock).mockResolvedValue({ id: 'proposal-1' });

      const result = await proposalService.deleteProposal('proposal-1');

      expect(prisma.proposal.delete).toHaveBeenCalledWith({
        where: { id: 'proposal-1' },
        select: { id: true },
      });
      expect(result).toEqual({ id: 'proposal-1' });
    });
  });
});
