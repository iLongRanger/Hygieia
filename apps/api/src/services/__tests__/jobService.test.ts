import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import { createBulkNotifications, createNotification } from '../notificationService';
import {
  assignJob,
  autoGenerateRecurringJobsForContract,
  createJob,
  generateJobsFromContract,
  listJobs,
  runJobNearingEndNoCheckInAlertCycle,
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
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    timeEntry: {
      findMany: jest.fn(),
    },
    jobActivity: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback(prisma)),
  },
}));

jest.mock('../notificationService', () => ({
  createBulkNotifications: jest.fn(),
  createNotification: jest.fn(),
}));

describe('jobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma)
    );
    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.jobTask.createMany as jest.Mock).mockResolvedValue({ count: 0 });
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

  it('assignJob sends notification when internal user assignment is present', async () => {
    (prisma.job.findUnique as jest.Mock).mockResolvedValue({
      id: 'job-1',
      status: 'scheduled',
    });
    (prisma.job.update as jest.Mock).mockResolvedValue({
      id: 'job-1',
      jobNumber: 'WO-2026-0011',
      facility: { name: 'HQ' },
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

  it('runJobNearingEndNoCheckInAlertCycle notifies admins for jobs near end with no check-in', async () => {
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'job-1',
        jobNumber: 'WO-2026-0100',
        scheduledDate: new Date('2026-02-26T00:00:00.000Z'),
        scheduledStartTime: new Date('2026-02-26T16:00:00.000Z'),
        scheduledEndTime: new Date('2026-02-26T18:00:00.000Z'),
        facility: { id: 'facility-1', name: 'HQ' },
        contract: { id: 'contract-1', contractNumber: 'CT-100' },
        assignedToUser: { id: 'cleaner-1', fullName: 'Cleaner One', email: 'cleaner@example.com' },
        assignedTeam: null,
      },
    ]);
    (prisma.timeEntry.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.jobActivity.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'admin-1' }, { id: 'owner-1' }]);
    (createBulkNotifications as jest.Mock).mockResolvedValue([{ id: 'n-1' }, { id: 'n-2' }]);
    (prisma.jobActivity.create as jest.Mock).mockResolvedValue({ id: 'activity-1' });

    const result = await runJobNearingEndNoCheckInAlertCycle({
      now: new Date('2026-02-26T16:00:00.000Z'),
    });

    expect(createBulkNotifications).toHaveBeenCalledWith(
      ['admin-1', 'owner-1'],
      expect.objectContaining({
        type: 'job_no_checkin_near_end',
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
      notifications: 2,
    });
  });

  it('runJobNearingEndNoCheckInAlertCycle skips jobs with time entries or prior alert', async () => {
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
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
    ]);
    (prisma.timeEntry.findMany as jest.Mock).mockResolvedValue([{ jobId: 'job-1' }]);
    (prisma.jobActivity.findMany as jest.Mock).mockResolvedValue([{ jobId: 'job-2' }]);
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
    });
  });
});
