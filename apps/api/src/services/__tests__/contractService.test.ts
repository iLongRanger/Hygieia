import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as contractService from '../contractService';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    contract: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
    },
    proposal: {
      findUnique: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
    },
    facility: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
  },
}));

describe('contractService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma)
    );
  });

  it('listContracts should return paginated contracts', async () => {
    (prisma.contract.count as jest.Mock).mockResolvedValue(1);
    (prisma.contract.findMany as jest.Mock).mockResolvedValue([
      { id: 'contract-1', contractNumber: 'CONT-202602-0001' },
    ]);

    const result = await contractService.listContracts({ page: 1, limit: 10 });

    expect(result.pagination.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(prisma.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
      })
    );
  });

  it('createContract should require proposalId', async () => {
    await expect(
      contractService.createContract({
        title: 'Contract A',
        accountId: 'account-1',
        startDate: new Date('2026-02-01'),
        monthlyValue: 1000,
        createdByUserId: 'user-1',
      })
    ).rejects.toThrow('Contract creation requires a proposal');
  });

  it('createContract should create when proposal is accepted', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({ status: 'accepted' });
    (prisma.contract.findFirst as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    (prisma.contract.create as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const result = await contractService.createContract({
      title: 'Contract A',
      accountId: 'account-1',
      proposalId: 'proposal-1',
      startDate: new Date('2026-02-01'),
      monthlyValue: 1000,
      createdByUserId: 'user-1',
    });

    expect(result).toEqual({ id: 'contract-1' });
    expect(prisma.contract.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          proposalId: 'proposal-1',
          status: 'draft',
        }),
      })
    );
  });

  it('createContractFromProposal should create a draft contract', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      title: 'Proposal A',
      status: 'accepted',
      totalAmount: '2500',
      accountId: 'account-1',
      facilityId: 'facility-1',
      termsAndConditions: 'Terms',
      notes: 'Special',
      account: {
        paymentTerms: 'Net 30',
      },
      facility: { id: 'facility-1' },
      proposalServices: [],
    });
    (prisma.contract.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.contract.create as jest.Mock).mockResolvedValue({ id: 'contract-2' });

    const result = await contractService.createContractFromProposal('proposal-1', 'user-1');

    expect(result).toEqual({ id: 'contract-2' });
    expect(prisma.contract.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Proposal A',
          monthlyValue: 2500,
          proposal: { connect: { id: 'proposal-1' } },
          account: { connect: { id: 'account-1' } },
        }),
      })
    );
  });

  it('renewContract should update existing contract renewal fields in place', async () => {
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      renewalNumber: 0,
    });
    (prisma.contract.update as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      renewalNumber: 1,
      startDate: new Date('2026-03-01'),
    });

    const result = await contractService.renewContract(
      'contract-1',
      {
        startDate: new Date('2026-03-01'),
      },
      'user-1'
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'contract-1',
        renewalNumber: 1,
      })
    );
    expect(prisma.contract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contract-1' },
        data: expect.objectContaining({
          renewalNumber: 1,
          startDate: new Date('2026-03-01'),
        }),
      })
    );
  });

  it('assignContractTeam should assign team to an active contract', async () => {
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({ id: 'contract-1', status: 'active' });
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      id: 'team-1',
      isActive: true,
      archivedAt: null,
    });
    (prisma.contract.update as jest.Mock).mockResolvedValue({ id: 'contract-1', assignedTeam: { id: 'team-1' } });

    const result = await contractService.assignContractTeam('contract-1', 'team-1');

    expect(result).toEqual({ id: 'contract-1', assignedTeam: { id: 'team-1' } });
    expect(prisma.contract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contract-1' },
        data: { assignedTeamId: 'team-1' },
      })
    );
  });
});
