import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import { createBulkNotifications, createNotification } from '../notificationService';
import { sendSms } from '../smsService';
import { completeInitialClean as completeContractInitialClean } from '../contractService';
import { flagJobForSettlementReview } from '../jobSettlementService';
import {
  assignJob,
  autoGenerateRecurringJobsForContract,
  completeInitialCleanForJob,
  completeJob,
  createJob,
  generateJobsFromContract,
  listJobs,
  reassignScheduledJobsForContract,
  runRecurringJobsAutoRegenerationCycle,
  runJobNearingEndNoCheckInAlertCycle,
  updateJob,
} from '../jobService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    job: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    facilityTask: {
      findMany: jest.fn(),
    },
    jobTask: {
      createMany: jest.fn(),
    },
    contract: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    residentialQuote: {
      findUnique: jest.fn(),
    },
    residentialProperty: {
      findUnique: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    timeEntry: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    jobActivity: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback(prisma)),
  },
}));

jest.mock('../notificationService', () => ({
  createBulkNotifications: jest.fn(),
  createNotification: jest.fn(),
}));

jest.mock('../smsService', () => ({
  sendSms: jest.fn(),
}));

jest.mock('../contractService', () => ({
  completeInitialClean: jest.fn(),
}));

jest.mock('../jobSettlementService', () => ({
  clearJobSettlementReview: jest.fn(),
  flagJobForSettlementReview: jest.fn(),
  getJobSettlementView: jest.fn(() => ({
    id: null,
    status: 'ready',
    issueCode: null,
    issueSummary: null,
    workerExplanation: null,
    workerRespondedAt: null,
    reviewNotes: null,
    reviewedAt: null,
    reviewedByUser: null,
    lastWorkerReminderAt: null,
    lastManagerReminderAt: null,
    requiresManagerReview: false,
    invoiceEligible: false,
    payrollEligible: false,
  })),
  jobSettlementReviewSelect: {},
}));

describe('jobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma)
    );
    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.jobTask.createMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.job.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.jobActivity.createMany as jest.Mock).mockResolvedValue({ count: 0 });
    (sendSms as jest.Mock).mockResolvedValue(true);
    (createNotification as jest.Mock).mockResolvedValue({ id: 'notification-1' });
    (createBulkNotifications as jest.Mock).mockResolvedValue([]);
    (flagJobForSettlementReview as jest.Mock).mockResolvedValue(undefined);
  });

  it('listJobs applies filters and pagination', async () => {
    (prisma.job.findMany as jest.Mock).mockResolvedValue([{ id: 'job-1' }]);
    (prisma.job.count as jest.Mock).mockResolvedValue(11);

    const result = await listJobs({
      contractId: 'contract-1',
      status: 'scheduled',
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-01-31T00:00:00.000Z'),
      page: 2,
      limit: 5,
    });

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contractId: 'contract-1',
          status: 'scheduled',
          scheduledDate: expect.objectContaining({
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lte: new Date('2026-01-31T00:00:00.000Z'),
          }),
        }),
        skip: 5,
        take: 5,
      })
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 11,
      totalPages: 3,
    });
  });

  it('createJob rejects when contract is not active', async () => {
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'draft',
    });

    await expect(
      createJob({
        contractId: 'contract-1',
        facilityId: 'facility-1',
        accountId: 'account-1',
        scheduledDate: new Date('2026-03-01T00:00:00.000Z'),
        createdByUserId: 'user-1',
      })
    ).rejects.toThrow('Contract must be active to create jobs');
  });

  it('createJob creates job and activity in a transaction', async () => {
    const year = new Date().getFullYear();
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
    });
    (prisma.job.findFirst as jest.Mock).mockResolvedValue({
      jobNumber: `WO-${year}-0009`,
    });
    (prisma.job.create as jest.Mock).mockResolvedValue({
      id: 'job-1',
      jobNumber: `WO-${year}-0010`,
    });

    await createJob({
      contractId: 'contract-1',
      facilityId: 'facility-1',
      accountId: 'account-1',
      scheduledDate: new Date('2026-03-01T00:00:00.000Z'),
      createdByUserId: 'user-1',
    });

    expect(prisma.job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'scheduled',
          jobType: 'special_job',
          jobCategory: 'one_time',
          contractId: 'contract-1',
          facilityId: 'facility-1',
          accountId: 'account-1',
        }),
      })
    );
    expect(prisma.jobActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'created',
          performedByUserId: 'user-1',
        }),
      })
    );
  });

  it('createJob seeds job tasks from facility tasks', async () => {
    const year = new Date().getFullYear();
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
    });
    (prisma.job.findFirst as jest.Mock).mockResolvedValue({
      jobNumber: `WO-${year}-0009`,
    });
    (prisma.job.create as jest.Mock).mockResolvedValue({
      id: 'job-1',
      jobNumber: `WO-${year}-0010`,
    });
    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'facility-task-1',
        customName: null,
        customInstructions: 'Do it carefully',
        estimatedMinutes: 25,
        taskTemplate: { name: 'Vacuum', estimatedMinutes: 20 },
      },
    ]);

    await createJob({
      contractId: 'contract-1',
      facilityId: 'facility-1',
      accountId: 'account-1',
      scheduledDate: new Date('2026-03-01T00:00:00.000Z'),
      createdByUserId: 'user-1',
    });

    expect(prisma.jobTask.createMany).toHaveBeenCalledWith({
      data: [
        {
          jobId: 'job-1',
          facilityTaskId: 'facility-task-1',
          taskName: 'Vacuum',
          description: 'Do it carefully',
          status: 'pending',
          estimatedMinutes: 25,
        },
      ],
    });
  });

  it('createJob falls back to proposal service tasks when facility tasks are empty', async () => {
    const year = new Date().getFullYear();
    (prisma.contract.findUnique as jest.Mock).mockImplementation(({ select }: { select?: Record<string, unknown> }) => {
      if (select?.status) {
        return Promise.resolve({
          id: 'contract-1',
          status: 'active',
        });
      }

      return Promise.resolve({
        proposal: {
          proposalServices: [
            {
              id: 'service-1',
              serviceName: 'Recurring Standard Cleaning',
              includedTasks: ['Kitchen: counters, sink', 'Bathrooms: mirrors', 'Kitchen: sink'],
            },
            {
              id: 'service-2',
              serviceName: 'Final Touch',
              includedTasks: [],
            },
          ],
        },
      });
    });
    (prisma.job.findFirst as jest.Mock).mockResolvedValue({
      jobNumber: `WO-${year}-0010`,
    });
    (prisma.job.create as jest.Mock).mockResolvedValue({
      id: 'job-2',
      jobNumber: `WO-${year}-0011`,
    });
    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([]);

    await createJob({
      contractId: 'contract-1',
      facilityId: 'facility-1',
      accountId: 'account-1',
      scheduledDate: new Date('2026-03-02T00:00:00.000Z'),
      createdByUserId: 'user-1',
    });

    expect(prisma.jobTask.createMany).toHaveBeenCalledWith({
      data: [
        {
          jobId: 'job-2',
          facilityTaskId: null,
          taskName: 'Kitchen: counters, sink',
          description: 'Recurring Standard Cleaning',
          status: 'pending',
          estimatedMinutes: null,
        },
        {
          jobId: 'job-2',
          facilityTaskId: null,
          taskName: 'Bathrooms: mirrors',
          description: 'Recurring Standard Cleaning',
          status: 'pending',
          estimatedMinutes: null,
        },
        {
          jobId: 'job-2',
          facilityTaskId: null,
          taskName: 'Kitchen: sink',
          description: 'Recurring Standard Cleaning',
          status: 'pending',
          estimatedMinutes: null,
        },
        {
          jobId: 'job-2',
          facilityTaskId: null,
          taskName: 'Final Touch',
          description: null,
          status: 'pending',
          estimatedMinutes: null,
        },
      ],
    });
  });

  it('createJob falls back to residential quote tasks when no facility or proposal tasks exist', async () => {
    const year = new Date().getFullYear();
    (prisma.contract.findUnique as jest.Mock).mockImplementation(({ select }: { select?: Record<string, unknown> }) => {
      if (select?.status) {
        return Promise.resolve({
          id: 'contract-1',
          status: 'active',
        });
      }

      return Promise.resolve({
        quoteSourceType: 'residential_quote',
        quoteSourceId: 'quote-1',
        residentialPropertyId: 'property-1',
        proposal: {
          proposalServices: [],
        },
      });
    });
    (prisma.residentialQuote.findUnique as jest.Mock).mockResolvedValue({
      includedTasks: ['Kitchen wipe down', 'Bathrooms sanitized'],
    });
    (prisma.residentialProperty.findUnique as jest.Mock).mockResolvedValue({
      defaultTasks: ['This should not be used'],
    });
    (prisma.job.findFirst as jest.Mock).mockResolvedValue({
      jobNumber: `WO-${year}-0010`,
    });
    (prisma.job.create as jest.Mock).mockResolvedValue({
      id: 'job-3',
      jobNumber: `WO-${year}-0011`,
    });
    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([]);

    await createJob({
      contractId: 'contract-1',
      facilityId: 'facility-1',
      accountId: 'account-1',
      scheduledDate: new Date('2026-03-03T00:00:00.000Z'),
      createdByUserId: 'user-1',
    });

    expect(prisma.jobTask.createMany).toHaveBeenCalledWith({
      data: [
        {
          jobId: 'job-3',
          facilityTaskId: null,
          taskName: 'Kitchen wipe down',
          description: 'Residential quote scope',
          status: 'pending',
          estimatedMinutes: null,
        },
        {
          jobId: 'job-3',
          facilityTaskId: null,
          taskName: 'Bathrooms sanitized',
          description: 'Residential quote scope',
          status: 'pending',
          estimatedMinutes: null,
        },
      ],
    });
  });

  it('createJob falls back to residential property tasks when quote tasks are empty', async () => {
    const year = new Date().getFullYear();
    (prisma.contract.findUnique as jest.Mock).mockImplementation(({ select }: { select?: Record<string, unknown> }) => {
      if (select?.status) {
        return Promise.resolve({
          id: 'contract-1',
          status: 'active',
        });
      }

      return Promise.resolve({
        quoteSourceType: 'residential_quote',
        quoteSourceId: 'quote-1',
        residentialPropertyId: 'property-1',
        proposal: {
          proposalServices: [],
        },
      });
    });
    (prisma.residentialQuote.findUnique as jest.Mock).mockResolvedValue({
      includedTasks: [],
    });
    (prisma.residentialProperty.findUnique as jest.Mock).mockResolvedValue({
      defaultTasks: ['Vacuum floors', 'Dust reachable surfaces'],
    });
    (prisma.job.findFirst as jest.Mock).mockResolvedValue({
      jobNumber: `WO-${year}-0012`,
    });
    (prisma.job.create as jest.Mock).mockResolvedValue({
      id: 'job-4',
      jobNumber: `WO-${year}-0013`,
    });
    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([]);

    await createJob({
      contractId: 'contract-1',
      facilityId: 'facility-1',
      accountId: 'account-1',
      scheduledDate: new Date('2026-03-04T00:00:00.000Z'),
      createdByUserId: 'user-1',
    });

    expect(prisma.jobTask.createMany).toHaveBeenCalledWith({
      data: [
        {
          jobId: 'job-4',
          facilityTaskId: null,
          taskName: 'Vacuum floors',
          description: 'Residential property scope',
          status: 'pending',
          estimatedMinutes: null,
        },
        {
          jobId: 'job-4',
          facilityTaskId: null,
          taskName: 'Dust reachable surfaces',
          description: 'Residential property scope',
          status: 'pending',
          estimatedMinutes: null,
        },
      ],
    });
  });

  it('createJob uses contract scope snapshot before other residential fallbacks', async () => {
    const year = new Date().getFullYear();
    (prisma.contract.findUnique as jest.Mock).mockImplementation(({ select }: { select?: Record<string, unknown> }) => {
      if (select?.status) {
        return Promise.resolve({ id: 'contract-1', status: 'active' });
      }

      return Promise.resolve({
        scopeTasksSnapshot: ['Snapshot task one', 'Snapshot task two'],
        quoteSourceType: 'residential_quote',
        quoteSourceId: 'quote-1',
        residentialPropertyId: 'property-1',
        accountId: 'account-1',
        proposal: { proposalServices: [] },
      });
    });
    (prisma.job.findFirst as jest.Mock).mockResolvedValue({
      jobNumber: `WO-${year}-0014`,
    });
    (prisma.job.create as jest.Mock).mockResolvedValue({
      id: 'job-5',
      jobNumber: `WO-${year}-0015`,
    });
    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([]);

    await createJob({
      contractId: 'contract-1',
      facilityId: 'facility-1',
      accountId: 'account-1',
      scheduledDate: new Date('2026-03-05T00:00:00.000Z'),
      createdByUserId: 'user-1',
    });

    expect(prisma.jobTask.createMany).toHaveBeenCalledWith({
      data: [
        {
          jobId: 'job-5',
          facilityTaskId: null,
          taskName: 'Snapshot task one',
          description: 'Contract scope snapshot',
          status: 'pending',
          estimatedMinutes: null,
        },
        {
          jobId: 'job-5',
          facilityTaskId: null,
          taskName: 'Snapshot task two',
          description: 'Contract scope snapshot',
          status: 'pending',
          estimatedMinutes: null,
        },
      ],
    });
  });

  it('createJob falls back to residential account task library when quote and property tasks are empty', async () => {
    const year = new Date().getFullYear();
    (prisma.contract.findUnique as jest.Mock).mockImplementation(({ select }: { select?: Record<string, unknown> }) => {
      if (select?.status) {
        return Promise.resolve({ id: 'contract-1', status: 'active' });
      }

      return Promise.resolve({
        scopeTasksSnapshot: [],
        quoteSourceType: 'residential_quote',
        quoteSourceId: 'quote-1',
        residentialPropertyId: null,
        accountId: 'account-1',
        proposal: { proposalServices: [] },
      });
    });
    (prisma.residentialQuote.findUnique as jest.Mock).mockResolvedValue({
      includedTasks: [],
    });
    (prisma.account.findUnique as jest.Mock).mockResolvedValue({
      residentialTaskLibrary: ['Change linens', 'Use unscented products'],
    });
    (prisma.job.findFirst as jest.Mock).mockResolvedValue({
      jobNumber: `WO-${year}-0016`,
    });
    (prisma.job.create as jest.Mock).mockResolvedValue({
      id: 'job-6',
      jobNumber: `WO-${year}-0017`,
    });
    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([]);

    await createJob({
      contractId: 'contract-1',
      facilityId: 'facility-1',
      accountId: 'account-1',
      scheduledDate: new Date('2026-03-06T00:00:00.000Z'),
      createdByUserId: 'user-1',
    });

    expect(prisma.jobTask.createMany).toHaveBeenCalledWith({
      data: [
        {
          jobId: 'job-6',
          facilityTaskId: null,
          taskName: 'Change linens',
          description: 'Residential account scope',
          status: 'pending',
          estimatedMinutes: null,
        },
        {
          jobId: 'job-6',
          facilityTaskId: null,
          taskName: 'Use unscented products',
          description: 'Residential account scope',
          status: 'pending',
          estimatedMinutes: null,
        },
      ],
    });
  });

  it('assignJob sends notification when internal user assignment is present', async () => {
    (prisma.job.findUnique as jest.Mock).mockResolvedValue({
      id: 'job-1',
      status: 'scheduled',
      assignedTeamId: null,
      assignedToUserId: null,
    });
    (prisma.job.update as jest.Mock).mockResolvedValue({
      id: 'job-1',
      jobNumber: 'WO-2026-0011',
      facility: { name: 'HQ' },
      assignedTeam: null,
      assignedToUser: { id: 'user-7' },
    });

    await assignJob('job-1', null, 'user-7', 'admin-1');

    expect(prisma.jobActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'assigned',
          metadata: {
            assignedTeamId: null,
            assignedToUserId: 'user-7',
          },
        }),
      })
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-7',
        type: 'job_assigned',
        metadata: expect.objectContaining({
          jobId: 'job-1',
          jobNumber: 'WO-2026-0011',
          facilityName: 'HQ',
        }),
      })
    );
  });

  it('assignJob sends notifications to active team members when team assignment is present', async () => {
    (prisma.job.findUnique as jest.Mock).mockResolvedValue({
      id: 'job-1',
      status: 'scheduled',
      assignedTeamId: null,
      assignedToUserId: null,
    });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'team-user-1' },
      { id: 'team-user-2' },
    ]);
    (prisma.job.update as jest.Mock).mockResolvedValue({
      id: 'job-1',
      jobNumber: 'WO-2026-0011',
      facility: { name: 'HQ' },
      assignedTeam: { id: 'team-9', name: 'Night Shift' },
      assignedToUser: null,
    });

    await assignJob('job-1', 'team-9', null, 'admin-1');

    expect(createBulkNotifications).toHaveBeenCalledWith(
      ['team-user-1', 'team-user-2'],
      expect.objectContaining({
        type: 'job_assigned',
        title: 'Job WO-2026-0011 assigned to Night Shift',
        metadata: expect.objectContaining({
          jobId: 'job-1',
          assignedTeamId: 'team-9',
        }),
      })
    );
  });

  it('updateJob sends notification when direct assignee changes', async () => {
    (prisma.job.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'job-2',
        status: 'scheduled',
        assignedTeamId: null,
        assignedToUserId: 'user-1',
      })
      .mockResolvedValueOnce({
        assignedToUserId: 'user-1',
        scheduledStartTime: null,
        scheduledEndTime: null,
      });
    (prisma.job.update as jest.Mock).mockResolvedValue({
      id: 'job-2',
      jobNumber: 'WO-2026-0012',
      facility: { name: 'Branch' },
      assignedTeam: null,
      assignedToUser: { id: 'user-8' },
    });

    await updateJob('job-2', { assignedToUserId: 'user-8' }, 'admin-1');

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-8',
        type: 'job_assigned',
        metadata: expect.objectContaining({
          jobId: 'job-2',
          assignedToUserId: 'user-8',
        }),
      })
    );
  });

  it('updateJob does not send notification when assignee is unchanged', async () => {
    (prisma.job.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'job-2',
        status: 'scheduled',
        assignedTeamId: null,
        assignedToUserId: 'user-8',
      })
      .mockResolvedValueOnce({
        assignedToUserId: 'user-8',
        scheduledStartTime: null,
        scheduledEndTime: null,
      });
    (prisma.job.update as jest.Mock).mockResolvedValue({
      id: 'job-2',
      jobNumber: 'WO-2026-0012',
      facility: { name: 'Branch' },
      assignedTeam: null,
      assignedToUser: { id: 'user-8' },
    });

    await updateJob('job-2', { notes: 'Adjusted window only' }, 'admin-1');

    expect(createNotification).not.toHaveBeenCalled();
    expect(createBulkNotifications).not.toHaveBeenCalled();
  });

  it('reassignScheduledJobsForContract notifies each newly reassigned direct assignee', async () => {
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'job-10',
        jobNumber: 'WO-2026-0100',
        facility: { name: 'HQ' },
        assignedTeamId: 'team-1',
        assignedToUserId: null,
      },
      {
        id: 'job-11',
        jobNumber: 'WO-2026-0101',
        facility: { name: 'Branch' },
        assignedTeamId: null,
        assignedToUserId: 'user-4',
      },
    ]);

    const result = await reassignScheduledJobsForContract({
      contractId: 'contract-1',
      assignedTeamId: null,
      assignedToUserId: 'user-8',
      performedByUserId: 'admin-1',
    });

    expect(prisma.job.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          assignedTeamId: null,
          assignedToUserId: 'user-8',
        },
      })
    );
    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ updated: 2, notifications: 2 });
  });

  it('reassignScheduledJobsForContract notifies team members for team-based reassignment', async () => {
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'job-10',
        jobNumber: 'WO-2026-0100',
        facility: { name: 'HQ' },
        assignedTeamId: null,
        assignedToUserId: 'user-4',
      },
    ]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'team-user-1' },
      { id: 'team-user-2' },
    ]);
    (createBulkNotifications as jest.Mock).mockResolvedValue([{ id: 'n-1' }, { id: 'n-2' }]);

    const result = await reassignScheduledJobsForContract({
      contractId: 'contract-1',
      assignedTeamId: 'team-9',
      assignedToUserId: null,
      performedByUserId: 'admin-1',
    });

    expect(createBulkNotifications).toHaveBeenCalledWith(
      ['team-user-1', 'team-user-2'],
      expect.objectContaining({
        type: 'job_assigned',
        title: 'Job WO-2026-0100 assigned to your team',
        metadata: expect.objectContaining({
          jobId: 'job-10',
          assignedTeamId: 'team-9',
        }),
      })
    );
    expect(result).toEqual({ updated: 1, notifications: 2 });
  });

  it('generateJobsFromContract skips dates that already have jobs', async () => {
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      facilityId: 'facility-1',
      accountId: 'account-1',
      assignedTeamId: 'team-1',
      serviceFrequency: 'weekly',
      serviceSchedule: null,
    });
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      { scheduledDate: new Date('2026-01-01T00:00:00.000Z') },
      { scheduledDate: new Date('2026-01-08T00:00:00.000Z') },
    ]);

    const result = await generateJobsFromContract({
      contractId: 'contract-1',
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-01-08T00:00:00.000Z'),
      createdByUserId: 'user-1',
    });

    expect(result).toEqual({
      created: 0,
      message: 'All dates already have jobs scheduled',
    });
    expect(prisma.job.create).not.toHaveBeenCalled();
  });

  it('generateJobsFromContract preserves canceled dates unless explicitly ignored', async () => {
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      facilityId: 'facility-1',
      accountId: 'account-1',
      assignedTeamId: 'team-1',
      serviceFrequency: 'weekly',
      serviceSchedule: null,
    });
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      { scheduledDate: new Date('2026-01-01T00:00:00.000Z'), status: 'canceled' },
      { scheduledDate: new Date('2026-01-08T00:00:00.000Z'), status: 'scheduled' },
    ]);

    const result = await generateJobsFromContract({
      contractId: 'contract-1',
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-01-08T00:00:00.000Z'),
      createdByUserId: 'user-1',
    });

    expect(result).toEqual({
      created: 0,
      message: 'All dates already have jobs scheduled',
    });
    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          status: { not: 'canceled' },
        }),
      })
    );
  });

  it('generateJobsFromContract creates jobs for missing dates', async () => {
    const year = new Date().getFullYear();
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      facilityId: 'facility-1',
      accountId: 'account-1',
      assignedTeamId: 'team-1',
      serviceFrequency: 'weekly',
      serviceSchedule: null,
    });
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      { scheduledDate: new Date('2026-01-01T00:00:00.000Z') },
    ]);
    (prisma.job.findFirst as jest.Mock).mockResolvedValueOnce({
      jobNumber: `WO-${year}-0001`,
    });
    (prisma.job.create as jest.Mock).mockResolvedValue({
      id: 'job-2',
      jobNumber: `WO-${year}-0002`,
      scheduledDate: new Date('2026-01-08T00:00:00.000Z'),
    });
    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'facility-task-1',
        customName: 'Mop Floors',
        customInstructions: null,
        estimatedMinutes: null,
        taskTemplate: { name: 'Mop', estimatedMinutes: 15 },
      },
    ]);

    const result = await generateJobsFromContract({
      contractId: 'contract-1',
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-01-08T00:00:00.000Z'),
      createdByUserId: 'user-1',
    });

    expect(prisma.job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contractId: 'contract-1',
          facilityId: 'facility-1',
          accountId: 'account-1',
          assignedTeamId: 'team-1',
          jobType: 'scheduled_service',
          jobCategory: 'recurring',
        }),
      })
    );
    expect(result.created).toBe(1);
    expect(prisma.jobTask.createMany).toHaveBeenCalledWith({
      data: [
        {
          jobId: 'job-2',
          facilityTaskId: 'facility-task-1',
          taskName: 'Mop Floors',
          description: null,
          status: 'pending',
          estimatedMinutes: 15,
        },
      ],
    });
  });

  it('generateJobsFromContract supports every_4_weeks recurring cadence', async () => {
    const year = new Date().getFullYear();
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      facilityId: 'facility-1',
      accountId: 'account-1',
      assignedTeamId: null,
      serviceFrequency: 'every_4_weeks',
      serviceSchedule: {
        days: ['wednesday'],
        allowedWindowStart: '08:00',
        allowedWindowEnd: '17:00',
      },
      facility: { address: null },
    });
    (prisma.job.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.job.findFirst as jest.Mock)
      .mockResolvedValueOnce({ jobNumber: `WO-${year}-0001` })
      .mockResolvedValueOnce({ jobNumber: `WO-${year}-0002` });
    (prisma.job.create as jest.Mock)
      .mockResolvedValueOnce({
        id: 'job-1',
        jobNumber: `WO-${year}-0002`,
        scheduledDate: new Date('2026-01-07T00:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'job-2',
        jobNumber: `WO-${year}-0003`,
        scheduledDate: new Date('2026-02-04T00:00:00.000Z'),
      });

    const result = await generateJobsFromContract({
      contractId: 'contract-1',
      dateFrom: new Date('2026-01-07T00:00:00.000Z'),
      dateTo: new Date('2026-02-04T00:00:00.000Z'),
      createdByUserId: 'user-1',
    });

    expect(result.created).toBe(2);
    expect(prisma.job.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          scheduledDate: new Date('2026-01-07T00:00:00.000Z'),
        }),
      })
    );
    expect(prisma.job.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          scheduledDate: new Date('2026-02-04T00:00:00.000Z'),
        }),
      })
    );
  });

  it('generateJobsFromContract supports internal employee override assignment', async () => {
    const year = new Date().getFullYear();
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      facilityId: 'facility-1',
      accountId: 'account-1',
      assignedTeamId: 'team-1',
      serviceFrequency: 'weekly',
      serviceSchedule: null,
    });
    (prisma.job.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.job.findFirst as jest.Mock).mockResolvedValueOnce({
      jobNumber: `WO-${year}-0005`,
    });
    (prisma.job.create as jest.Mock).mockResolvedValue({
      id: 'job-6',
      jobNumber: `WO-${year}-0006`,
      scheduledDate: new Date('2026-01-01T00:00:00.000Z'),
    });

    await generateJobsFromContract({
      contractId: 'contract-1',
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-01-01T00:00:00.000Z'),
      assignedToUserId: 'user-2',
      createdByUserId: 'user-1',
    });

    expect(prisma.job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedTeamId: null,
          assignedToUserId: 'user-2',
        }),
      })
    );
  });

  it('autoGenerateRecurringJobsForContract skips generation when no team is assigned', async () => {
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      startDate: new Date('2026-02-01T00:00:00.000Z'),
      endDate: new Date('2026-02-28T00:00:00.000Z'),
      assignedTeamId: null,
      assignedToUserId: null,
    });

    const result = await autoGenerateRecurringJobsForContract({
      contractId: 'contract-1',
      createdByUserId: 'user-1',
    });

    expect(result).toEqual({
      created: 0,
      message: 'Contract has no assignee; recurring jobs were not auto-generated',
    });
    expect(prisma.job.findMany).not.toHaveBeenCalled();
  });

  it('autoGenerateRecurringJobsForContract supports internal employee assignment', async () => {
    const year = new Date().getFullYear();
    const today = new Date();
    const startDate = new Date(today);
    startDate.setUTCDate(startDate.getUTCDate() - 1);
    const endDate = new Date(today);
    endDate.setUTCDate(endDate.getUTCDate() + 40);

    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      startDate,
      endDate,
      assignedTeamId: null,
      assignedToUserId: 'user-2',
      facilityId: 'facility-1',
      accountId: 'account-1',
      serviceFrequency: 'daily',
      serviceSchedule: null,
      facility: { address: null },
    });
    (prisma.job.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.job.findFirst as jest.Mock).mockResolvedValueOnce({
      jobNumber: `WO-${year}-0007`,
    });
    (prisma.job.create as jest.Mock).mockResolvedValue({
      id: 'job-8',
      jobNumber: `WO-${year}-0008`,
      scheduledDate: new Date('2026-02-03T00:00:00.000Z'),
    });

    await autoGenerateRecurringJobsForContract({
      contractId: 'contract-1',
      createdByUserId: 'user-1',
    });

    expect(prisma.job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedTeamId: null,
          assignedToUserId: 'user-2',
          jobCategory: 'recurring',
        }),
      })
    );
  });

  it('runRecurringJobsAutoRegenerationCycle extends recurring jobs when the horizon is short', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-09T10:00:00.000Z'));
    const year = new Date().getFullYear();

    (prisma.contract.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'contract-1',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: null,
        assignedTeamId: 'team-1',
        assignedToUserId: null,
      },
    ]);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'system-user-1' });
    (prisma.job.findFirst as jest.Mock)
      .mockResolvedValueOnce({
        scheduledDate: new Date('2026-03-27T00:00:00.000Z'),
      })
      .mockResolvedValue({
        jobNumber: `WO-${year}-0001`,
      });
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      status: 'active',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: null,
      assignedTeamId: 'team-1',
      assignedToUserId: null,
      facilityId: 'facility-1',
      accountId: 'account-1',
      serviceFrequency: '7x_week',
      serviceSchedule: null,
      facility: { address: null },
    });
    (prisma.job.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.job.create as jest.Mock).mockImplementation(async ({ data }) => ({
      id: `job-${data.scheduledDate.toISOString().slice(0, 10)}`,
      scheduledDate: data.scheduledDate,
      jobNumber: `WO-${year}-0002`,
    }));

    const result = await runRecurringJobsAutoRegenerationCycle();

    expect(prisma.contract.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contract-1' },
      })
    );
    expect(prisma.job.create).toHaveBeenCalled();
    expect(result).toEqual({
      checked: 1,
      generatedFor: 1,
      created: 30,
    });

    jest.useRealTimers();
  });

  it('runRecurringJobsAutoRegenerationCycle skips contracts already filled to the lookahead horizon', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-09T10:00:00.000Z'));

    (prisma.contract.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'contract-1',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: null,
        assignedTeamId: 'team-1',
        assignedToUserId: null,
      },
    ]);
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'system-user-1' });
    (prisma.job.findFirst as jest.Mock).mockResolvedValue({
      scheduledDate: new Date('2026-04-07T00:00:00.000Z'),
    });

    const result = await runRecurringJobsAutoRegenerationCycle();

    expect(prisma.contract.findUnique).not.toHaveBeenCalled();
    expect(result).toEqual({
      checked: 1,
      generatedFor: 0,
      created: 0,
    });

    jest.useRealTimers();
  });

  it('runJobNearingEndNoCheckInAlertCycle notifies admins for jobs near end with no check-in', async () => {
    (prisma.job.findMany as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 'job-1',
          jobNumber: 'WO-2026-0100',
          scheduledDate: new Date('2026-02-26T00:00:00.000Z'),
          scheduledStartTime: new Date('2026-02-26T16:00:00.000Z'),
          scheduledEndTime: new Date('2026-02-26T18:00:00.000Z'),
          facility: { id: 'facility-1', name: 'HQ' },
          contract: { id: 'contract-1', contractNumber: 'CT-100' },
          assignedToUser: {
            id: 'cleaner-1',
            fullName: 'Cleaner One',
            email: 'cleaner@example.com',
            phone: '+15550003333',
          },
          assignedTeam: null,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.timeEntry.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.jobActivity.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'admin-1', phone: '+15550001111' },
      { id: 'owner-1', phone: '+15550002222' },
    ]);
    (createBulkNotifications as jest.Mock).mockResolvedValue([
      { id: 'n-1' },
      { id: 'n-2' },
      { id: 'n-3' },
    ]);
    (prisma.jobActivity.create as jest.Mock).mockResolvedValue({ id: 'activity-1' });

    const result = await runJobNearingEndNoCheckInAlertCycle({
      now: new Date('2026-02-26T16:00:00.000Z'),
    });

    expect(createBulkNotifications).toHaveBeenCalledWith(
      ['admin-1', 'owner-1', 'cleaner-1'],
      expect.objectContaining({
        type: 'job_no_checkin_near_end',
        sendEmail: true,
        metadata: expect.objectContaining({
          jobId: 'job-1',
        }),
      })
    );
    expect(prisma.jobActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobId: 'job-1',
          action: 'no_checkin_alert_sent',
        }),
      })
    );
    expect(result).toEqual({
      checked: 1,
      alerted: 1,
      notifications: 3,
      settlementReviewsTriggered: 0,
    });
    expect(sendSms).toHaveBeenCalledTimes(3);
    expect(sendSms).toHaveBeenCalledWith('+15550001111', expect.stringContaining('WO-2026-0100'));
    expect(sendSms).toHaveBeenCalledWith('+15550002222', expect.stringContaining('WO-2026-0100'));
    expect(sendSms).toHaveBeenCalledWith('+15550003333', expect.stringContaining('WO-2026-0100'));
  });

  it('runJobNearingEndNoCheckInAlertCycle skips jobs with time entries or prior alert', async () => {
    (prisma.job.findMany as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 'job-1',
          jobNumber: 'WO-2026-0100',
          scheduledDate: new Date('2026-02-26T00:00:00.000Z'),
          scheduledStartTime: new Date('2026-02-26T16:00:00.000Z'),
          scheduledEndTime: new Date('2026-02-26T18:00:00.000Z'),
          facility: { id: 'facility-1', name: 'HQ' },
          contract: null,
          assignedToUser: null,
          assignedTeam: { id: 'team-1', name: 'Team Alpha' },
        },
        {
          id: 'job-2',
          jobNumber: 'WO-2026-0101',
          scheduledDate: new Date('2026-02-26T00:00:00.000Z'),
          scheduledStartTime: new Date('2026-02-26T16:00:00.000Z'),
          scheduledEndTime: new Date('2026-02-26T17:30:00.000Z'),
          facility: { id: 'facility-2', name: 'Branch' },
          contract: null,
          assignedToUser: null,
          assignedTeam: { id: 'team-1', name: 'Team Alpha' },
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.timeEntry.findMany as jest.Mock)
      .mockResolvedValueOnce([{ jobId: 'job-1' }])
      .mockResolvedValueOnce([]);
    (prisma.jobActivity.findMany as jest.Mock)
      .mockResolvedValueOnce([{ jobId: 'job-2' }])
      .mockResolvedValueOnce([]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'admin-1' }]);

    const result = await runJobNearingEndNoCheckInAlertCycle({
      now: new Date('2026-02-26T16:00:00.000Z'),
    });

    expect(createBulkNotifications).not.toHaveBeenCalled();
    expect(prisma.jobActivity.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      checked: 2,
      alerted: 0,
      notifications: 0,
      settlementReviewsTriggered: 0,
    });
  });

  it('runJobNearingEndNoCheckInAlertCycle marks overdue no-checkin jobs as missed and notifies recipients', async () => {
    (prisma.job.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'job-9',
          jobNumber: 'WO-2026-0199',
          scheduledDate: new Date('2026-02-26T00:00:00.000Z'),
          scheduledStartTime: new Date('2026-02-26T14:00:00.000Z'),
          scheduledEndTime: new Date('2026-02-26T15:00:00.000Z'),
          facility: { id: 'facility-9', name: 'Branch B' },
          contract: { id: 'contract-9', contractNumber: 'CT-900' },
          assignedToUser: {
            id: 'cleaner-9',
            fullName: 'Cleaner Nine',
            email: 'cleaner9@example.com',
            phone: '+15550009999',
          },
          assignedTeam: null,
        },
      ])
      .mockResolvedValueOnce([]);
    (prisma.timeEntry.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.jobActivity.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'admin-1', phone: '+15550001111' },
      { id: 'owner-1', phone: '+15550002222' },
    ]);
    (createBulkNotifications as jest.Mock).mockResolvedValue([
      { id: 'n-1' },
      { id: 'n-2' },
      { id: 'n-3' },
    ]);
    (prisma.job.update as jest.Mock).mockResolvedValue({ id: 'job-9', status: 'missed' });
    (prisma.jobActivity.create as jest.Mock).mockResolvedValue({ id: 'activity-9' });

    const result = await runJobNearingEndNoCheckInAlertCycle({
      now: new Date('2026-02-26T16:00:00.000Z'),
    });

    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: 'job-9' },
      data: { status: 'missed' },
    });
    expect(createBulkNotifications).toHaveBeenCalledWith(
      ['admin-1', 'owner-1', 'cleaner-9'],
      expect.objectContaining({
        type: 'job_missed',
        sendEmail: true,
        metadata: expect.objectContaining({
          jobId: 'job-9',
          communicationRequired: true,
        }),
      })
    );
    expect(sendSms).toHaveBeenCalledWith(
      '+15550009999',
      expect.stringContaining('WO-2026-0199')
    );
    expect(result).toEqual({
      checked: 0,
      alerted: 1,
      notifications: 3,
      settlementReviewsTriggered: 0,
    });
  });

  it('runJobNearingEndNoCheckInAlertCycle flags unresolved completed-work jobs for settlement review', async () => {
    (prisma.job.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'job-12',
          jobNumber: 'WO-2026-0212',
          facility: { name: 'North Tower' },
          settlementReview: null,
        },
      ]);
    (prisma.timeEntry.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.jobActivity.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    const result = await runJobNearingEndNoCheckInAlertCycle({
      now: new Date('2026-02-26T16:00:00.000Z'),
    });

    expect(flagJobForSettlementReview).toHaveBeenCalledWith({
      jobId: 'job-12',
      issueCode: 'missing_completion',
      issueSummary: 'WO-2026-0212 at North Tower has recorded work but is still not completed.',
      notifyWorker: true,
      notifyManagers: true,
    });
    expect(result).toEqual({
      checked: 1,
      alerted: 1,
      notifications: 0,
      settlementReviewsTriggered: 1,
    });
  });

  it('runJobNearingEndNoCheckInAlertCycle skips unresolved jobs already waiting on settlement review', async () => {
    (prisma.job.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'job-13',
          jobNumber: 'WO-2026-0213',
          facility: { name: 'South Tower' },
          settlementReview: { status: 'needs_review' },
        },
      ]);
    (prisma.timeEntry.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.jobActivity.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    const result = await runJobNearingEndNoCheckInAlertCycle({
      now: new Date('2026-02-26T16:00:00.000Z'),
    });

    expect(flagJobForSettlementReview).not.toHaveBeenCalled();
    expect(result).toEqual({
      checked: 1,
      alerted: 0,
      notifications: 0,
      settlementReviewsTriggered: 0,
    });
  });

  it('completeJob requires active clock-in for cleaners', async () => {
    (prisma.job.findUnique as jest.Mock).mockResolvedValue({
      id: 'job-1',
      status: 'in_progress',
      actualStartTime: new Date('2026-02-26T15:00:00.000Z'),
      facilityId: 'facility-1',
      facility: { address: { lat: 0, lng: 0 } },
      contract: { id: 'contract-1', facility: { address: { lat: 0, lng: 0 } } },
    });
    (prisma.timeEntry.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      completeJob('job-1', {
        userId: 'cleaner-1',
        userRole: 'cleaner',
        geoLocation: { latitude: 0, longitude: 0 },
      })
    ).rejects.toThrow('You must clock in to this job before completing it.');

    expect(prisma.job.update).not.toHaveBeenCalled();
  });

  it('completeJob clocks out active entry linked to the same job', async () => {
    (prisma.job.findUnique as jest.Mock).mockResolvedValue({
      id: 'job-1',
      status: 'in_progress',
      actualStartTime: new Date('2026-02-26T15:00:00.000Z'),
      facilityId: 'facility-1',
      facility: { address: { lat: 0, lng: 0 } },
      contract: { id: 'contract-1', facility: { address: { lat: 0, lng: 0 } } },
    });
    (prisma.timeEntry.findFirst as jest.Mock).mockResolvedValue({
      id: 'entry-1',
      clockIn: new Date('2026-02-26T15:30:00.000Z'),
      breakMinutes: 0,
      geoLocation: {},
    });
    (prisma.job.update as jest.Mock).mockResolvedValue({
      id: 'job-1',
      assignedTeam: null,
      assignedToUser: { id: 'cleaner-1' },
    });

    await completeJob('job-1', {
      userId: 'cleaner-1',
      userRole: 'cleaner',
      geoLocation: { latitude: 0, longitude: 0 },
    });

    expect(prisma.timeEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'entry-1' },
        data: expect.objectContaining({
          status: 'completed',
        }),
      })
    );
  });

  it('completeInitialCleanForJob rejects non-first eligible jobs', async () => {
    (prisma.job.findUnique as jest.Mock).mockResolvedValue({
      id: 'job-2',
      jobType: 'scheduled_service',
      status: 'completed',
      contract: {
        id: 'contract-1',
        contractNumber: 'CONT-001',
        title: 'Office Cleaning',
        status: 'active',
        includesInitialClean: true,
        initialCleanCompleted: false,
        initialCleanCompletedAt: null,
      },
      tasks: [],
      notes_: [],
      activities: [],
    });
    (prisma.job.findFirst as jest.Mock).mockResolvedValue({ id: 'job-1' });

    await expect(
      completeInitialCleanForJob('job-2', 'admin-1')
    ).rejects.toThrow('Initial clean can only be completed from the first eligible job');

    expect(completeContractInitialClean).not.toHaveBeenCalled();
  });

  it('completeInitialCleanForJob marks initial clean from the first eligible job', async () => {
    (prisma.job.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'job-1',
        jobType: 'scheduled_service',
        status: 'completed',
        contract: {
          id: 'contract-1',
          contractNumber: 'CONT-001',
          title: 'Office Cleaning',
          status: 'active',
          includesInitialClean: true,
          initialCleanCompleted: false,
          initialCleanCompletedAt: null,
        },
        tasks: [],
        notes_: [],
        activities: [],
      })
      .mockResolvedValueOnce({
        id: 'job-1',
        jobNumber: 'WO-2026-0001',
        jobType: 'scheduled_service',
        jobCategory: 'recurring',
        status: 'completed',
        scheduledDate: new Date('2026-03-01T00:00:00.000Z'),
        scheduledStartTime: null,
        scheduledEndTime: null,
        actualStartTime: null,
        actualEndTime: null,
        estimatedHours: null,
        actualHours: null,
        notes: null,
        completionNotes: null,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
        contract: {
          id: 'contract-1',
          contractNumber: 'CONT-001',
          title: 'Office Cleaning',
          status: 'active',
          includesInitialClean: true,
          initialCleanCompleted: true,
          initialCleanCompletedAt: new Date('2026-03-01T18:00:00.000Z'),
        },
        quotation: null,
        facility: { id: 'facility-1', name: 'Main Office' },
        account: { id: 'account-1', name: 'Acme' },
        assignedTeam: null,
        assignedToUser: null,
        createdByUser: { id: 'admin-1', fullName: 'Admin User' },
        tasks: [],
        notes_: [],
        activities: [],
      });
    (prisma.job.findFirst as jest.Mock).mockResolvedValue({ id: 'job-1' });
    (prisma.jobActivity.create as jest.Mock).mockResolvedValue({ id: 'activity-1' });
    (completeContractInitialClean as jest.Mock).mockResolvedValue({ id: 'contract-1' });

    const result = await completeInitialCleanForJob('job-1', 'admin-1');

    expect(completeContractInitialClean).toHaveBeenCalledWith('contract-1', 'admin-1');
    expect(prisma.jobActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          jobId: 'job-1',
          action: 'initial_clean_completed',
          performedByUserId: 'admin-1',
        }),
      })
    );
    expect(result.initialClean).toEqual(
      expect.objectContaining({
        included: true,
        completed: true,
        eligibleJobId: 'job-1',
        canCompleteOnThisJob: false,
      })
    );
  });
});
