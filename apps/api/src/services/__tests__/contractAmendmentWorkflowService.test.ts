import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import {
  applyContractAmendmentWorkflow,
  runContractAmendmentAutoApplyCycle,
} from '../contractAmendmentWorkflowService';
import * as contractAmendmentService from '../contractAmendmentService';
import * as jobService from '../jobService';
import * as contractActivityService from '../contractActivityService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    contractAmendment: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../contractAmendmentService', () => ({
  applyContractAmendment: jest.fn(),
  getContractAmendmentById: jest.fn(),
}));

jest.mock('../jobService', () => ({
  regenerateRecurringJobsForContract: jest.fn(),
}));

jest.mock('../contractActivityService', () => ({
  logContractActivity: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('contractAmendmentWorkflowService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('auto-apply workflow uses fallback actor while keeping appliedByUserId null', async () => {
    (contractAmendmentService.getContractAmendmentById as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 2,
      effectiveDate: new Date('2026-03-08T00:00:00.000Z'),
      approvedByUser: { id: 'approver-1' },
      createdByUser: { id: 'creator-1' },
    });
    (contractAmendmentService.applyContractAmendment as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 2,
      status: 'applied',
    });
    (jobService.regenerateRecurringJobsForContract as jest.Mock).mockResolvedValue({
      created: 3,
      canceled: 1,
    });
    (contractActivityService.logContractActivity as jest.Mock).mockResolvedValue(undefined);

    const result = await applyContractAmendmentWorkflow('amend-1', {
      appliedByUserId: null,
      now: new Date('2026-03-08T12:00:00.000Z'),
      source: 'automatic',
    });

    expect(contractAmendmentService.applyContractAmendment).toHaveBeenCalledWith(
      'amend-1',
      null,
      'approver-1'
    );
    expect(jobService.regenerateRecurringJobsForContract).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: 'contract-1',
        createdByUserId: 'approver-1',
      })
    );
    expect(contractActivityService.logContractActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: 'contract-1',
        performedByUserId: undefined,
        metadata: expect.objectContaining({
          source: 'automatic',
          jobsCreated: 3,
          jobsCanceled: 1,
        }),
      })
    );
    expect(result.recurringJobs).toEqual({ created: 3, canceled: 1 });
  });

  it('auto-apply cycle only applies approved amendments due today or earlier', async () => {
    (prisma.contractAmendment.findMany as jest.Mock).mockResolvedValue([
      { id: 'amend-due', effectiveDate: new Date('2026-03-08T00:00:00.000Z') },
      { id: 'amend-future', effectiveDate: new Date('2026-03-10T00:00:00.000Z') },
    ]);
    (contractAmendmentService.getContractAmendmentById as jest.Mock).mockImplementation(
      async (id: string) => ({
        id,
        contractId: 'contract-1',
        amendmentNumber: 1,
        effectiveDate:
          id === 'amend-due'
            ? new Date('2026-03-08T00:00:00.000Z')
            : new Date('2026-03-10T00:00:00.000Z'),
        approvedByUser: { id: 'approver-1' },
        createdByUser: { id: 'creator-1' },
      })
    );
    (contractAmendmentService.applyContractAmendment as jest.Mock).mockResolvedValue({
      id: 'amend-due',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'applied',
    });
    (jobService.regenerateRecurringJobsForContract as jest.Mock).mockResolvedValue({
      created: 2,
      canceled: 1,
    });
    (contractActivityService.logContractActivity as jest.Mock).mockResolvedValue(undefined);

    const result = await runContractAmendmentAutoApplyCycle(
      new Date('2026-03-08T18:00:00.000Z')
    );

    expect(contractAmendmentService.applyContractAmendment).toHaveBeenCalledTimes(1);
    expect(contractAmendmentService.applyContractAmendment).toHaveBeenCalledWith(
      'amend-due',
      null,
      'approver-1'
    );
    expect(result).toEqual({
      checked: 2,
      due: 1,
      applied: 1,
      failed: 0,
      jobsCanceled: 1,
      jobsCreated: 2,
    });
  });
});
