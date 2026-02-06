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
