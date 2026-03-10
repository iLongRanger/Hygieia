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
    user: {
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

  it('listContracts should scope managers to owned or managed accounts', async () => {
    (prisma.contract.count as jest.Mock).mockResolvedValue(0);
    (prisma.contract.findMany as jest.Mock).mockResolvedValue([]);

    await contractService.listContracts(
      { page: 1, limit: 10 },
      { userRole: 'manager', userId: 'manager-1' }
    );

    expect(prisma.contract.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { createdByUserId: 'manager-1' },
                { account: { accountManagerId: 'manager-1' } },
              ],
            },
          ],
        }),
      })
    );
  });

  it('listContracts should scope cleaners to directly assigned contracts', async () => {
    (prisma.contract.count as jest.Mock).mockResolvedValue(0);
    (prisma.contract.findMany as jest.Mock).mockResolvedValue([]);

    await contractService.listContracts(
      { page: 1, limit: 10 },
      { userRole: 'cleaner', userId: 'cleaner-1' }
    );

    expect(prisma.contract.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignedToUserId: 'cleaner-1',
        }),
      })
    );
  });

  it('getContractsSummary should scope managers to owned or managed accounts', async () => {
    (prisma.contract.count as jest.Mock).mockResolvedValue(0);

    await contractService.getContractsSummary(
      {},
      { userRole: 'manager', userId: 'manager-1' }
    );

    expect(prisma.contract.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { createdByUserId: 'manager-1' },
                { account: { accountManagerId: 'manager-1' } },
              ],
            },
          ],
        }),
      })
    );
  });

  it('getExpiringContracts should scope cleaners to directly assigned contracts', async () => {
    (prisma.contract.findMany as jest.Mock).mockResolvedValue([]);

    await contractService.getExpiringContracts(30, {
      userRole: 'cleaner',
      userId: 'cleaner-1',
    });

    expect(prisma.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignedToUserId: 'cleaner-1',
          status: 'active',
          archivedAt: null,
        }),
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

    expect(result).toEqual(expect.objectContaining({ id: 'contract-1' }));
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
      serviceFrequency: 'weekly',
      serviceSchedule: null,
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

    expect(result).toEqual(expect.objectContaining({ id: 'contract-2' }));
    expect(prisma.contract.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Proposal A',
          monthlyValue: 2500,
          serviceFrequency: 'weekly',
          proposal: { connect: { id: 'proposal-1' } },
          account: { connect: { id: 'account-1' } },
        }),
      })
    );
  });

  it('createContractFromProposal should ignore service frequency overrides and use proposal frequency', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      title: 'Proposal A',
      status: 'accepted',
      serviceFrequency: 'weekly',
      serviceSchedule: null,
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
    (prisma.contract.create as jest.Mock).mockResolvedValue({ id: 'contract-3' });

    await contractService.createContractFromProposal('proposal-1', 'user-1', {
      serviceFrequency: 'monthly',
    } as any);

    expect(prisma.contract.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          serviceFrequency: 'weekly',
        }),
      })
    );
  });

  it('createContractFromProposal should preserve proposal schedule frequency values', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      title: 'Proposal A',
      status: 'accepted',
      serviceFrequency: '5x_week',
      serviceSchedule: { days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
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
    (prisma.contract.create as jest.Mock).mockResolvedValue({ id: 'contract-4' });

    await contractService.createContractFromProposal('proposal-1', 'user-1');

    expect(prisma.contract.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          serviceFrequency: '5x_week',
        }),
      })
    );
  });

  it('createContractFromProposal should fall back when legacy contract columns are missing', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue({
      id: 'proposal-1',
      title: 'Proposal A',
      status: 'accepted',
      serviceFrequency: 'weekly',
      serviceSchedule: null,
      totalAmount: '2500',
      accountId: 'account-1',
      facilityId: 'facility-1',
      termsAndConditions: 'Terms',
      notes: 'Special',
      account: {
        name: 'Acme Corp',
        paymentTerms: 'Net 30',
      },
      facility: { id: 'facility-1', name: 'HQ', address: null },
      proposalServices: [],
    });
    (prisma.contract.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.contract.create as jest.Mock)
      .mockRejectedValueOnce(new Error('column contracts.assigned_to_user_id does not exist'))
      .mockResolvedValueOnce({ id: 'contract-legacy', title: 'Proposal A' });

    const result = await contractService.createContractFromProposal('proposal-1', 'user-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'contract-legacy',
        assignedToUser: null,
        pendingAssignedTeamId: null,
      })
    );
    expect(prisma.contract.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        select: expect.objectContaining({
          assignedToUser: expect.any(Object),
        }),
      })
    );
    expect(prisma.contract.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        select: expect.not.objectContaining({
          assignedToUser: expect.anything(),
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
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      accountId: 'account-1',
    });
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      id: 'team-1',
      isActive: true,
      archivedAt: null,
    });
    (prisma.contract.update as jest.Mock).mockResolvedValue({ id: 'contract-1', assignedTeam: { id: 'team-1' } });

    const result = await contractService.assignContractTeam('contract-1', 'team-1');

    expect(result).toEqual(
      expect.objectContaining({ id: 'contract-1', assignedTeam: { id: 'team-1' } })
    );
    expect(prisma.contract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contract-1' },
        data: expect.objectContaining({
          assignedTeamId: 'team-1',
          assignedToUserId: null,
          pendingAssignedTeamId: null,
          pendingAssignedToUserId: null,
          assignmentOverrideEffectiveDate: null,
        }),
      })
    );
  });

  it('assignContractTeam should assign an internal employee to an active contract', async () => {
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      accountId: 'account-1',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-2',
      status: 'active',
    });
    (prisma.contract.update as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      assignedToUser: { id: 'user-2' },
      assignedTeam: null,
    });

    const result = await contractService.assignContractTeam('contract-1', null, 'user-2');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'contract-1',
        assignedToUser: { id: 'user-2' },
        assignedTeam: null,
      })
    );
    expect(prisma.contract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contract-1' },
        data: expect.objectContaining({
          assignedTeamId: null,
          assignedToUserId: 'user-2',
          pendingAssignedTeamId: null,
          pendingAssignedToUserId: null,
          assignmentOverrideEffectiveDate: null,
        }),
      })
    );
  });

  it('scheduleContractAssignmentOverride should save pending assignment and effectivity date', async () => {
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      assignedTeamId: 'team-old',
      assignedToUserId: null,
      subcontractorTier: 'standard',
    });
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({
      id: 'team-new',
      isActive: true,
      archivedAt: null,
    });
    (prisma.contract.update as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      pendingAssignedTeamId: 'team-new',
      assignmentOverrideEffectiveDate: new Date('2026-03-10T00:00:00.000Z'),
    });

    const result = await contractService.scheduleContractAssignmentOverride(
      'contract-1',
      'team-new',
      null,
      new Date('2026-03-10'),
      'owner-1',
      'premium'
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'contract-1',
        pendingAssignedTeamId: 'team-new',
      })
    );
    expect(prisma.contract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contract-1' },
        data: expect.objectContaining({
          pendingAssignedTeamId: 'team-new',
          pendingAssignedToUserId: null,
          assignmentOverrideSetByUserId: 'owner-1',
        }),
      })
    );
  });

  it('archiveContract should fall back when legacy contract columns are missing', async () => {
    (prisma.contract.update as jest.Mock)
      .mockRejectedValueOnce(new Error('column contracts.assigned_to_user_id does not exist'))
      .mockResolvedValueOnce({ id: 'contract-archived', archivedAt: new Date('2026-03-10T00:00:00.000Z') });

    const result = await contractService.archiveContract('contract-archived');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'contract-archived',
        assignedToUser: null,
        pendingAssignedTeamId: null,
      })
    );
    expect(prisma.contract.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'contract-archived' },
        select: expect.objectContaining({
          assignedToUser: expect.any(Object),
        }),
      })
    );
    expect(prisma.contract.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'contract-archived' },
        select: expect.not.objectContaining({
          assignedToUser: expect.anything(),
        }),
      })
    );
  });
});
