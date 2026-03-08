import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import { applyContractAmendment } from '../contractAmendmentService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    contractAmendment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    contractAmendmentScopeSnapshot: {
      create: jest.fn(),
    },
    contractAmendmentActivity: {
      create: jest.fn(),
    },
    area: {
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    facilityTask: {
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    contract: {
      update: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma)),
  },
}));

jest.mock('../serviceScheduleService', () => ({
  normalizeServiceSchedule: jest.fn((schedule: unknown) => schedule),
}));

describe('contractAmendmentService.applyContractAmendment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma)
    );
  });

  it('reuses matching live areas and tasks when draft ids are missing', async () => {
    (prisma.contractAmendment.findUnique as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      status: 'approved',
      effectiveDate: new Date('2026-03-06T00:00:00.000Z'),
      newMonthlyValue: 3200,
      newServiceFrequency: 'weekly',
      newServiceSchedule: { days: ['monday'] },
      snapshots: [
        {
          id: 'snap-working',
          snapshotType: 'working',
          scopeJson: {
            areas: [
              {
                tempId: 'draft-area-1',
                areaTypeId: 'area-type-1',
                name: 'Lobby',
                quantity: 1,
                squareFeet: 1200,
                floorType: 'vct',
                conditionLevel: 'standard',
                trafficLevel: 'medium',
                roomCount: 0,
                unitCount: 0,
              },
            ],
            tasks: [
              {
                tempId: 'draft-task-1',
                areaId: 'draft-area-1',
                taskTemplateId: 'template-1',
                customName: 'Vacuum',
                cleaningFrequency: 'weekly',
                estimatedMinutes: 25,
              },
            ],
          },
        },
      ],
      contract: {
        id: 'contract-1',
        status: 'active',
        facilityId: 'facility-1',
        serviceFrequency: 'weekly',
        serviceSchedule: { days: ['monday'] },
        monthlyValue: 2500,
      },
    });

    (prisma.area.findMany as jest.Mock).mockResolvedValue([
      { id: 'area-live-1', areaTypeId: 'area-type-1', name: 'Lobby' },
    ]);
    (prisma.facilityTask.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'task-live-1',
        areaId: 'area-live-1',
        taskTemplateId: 'template-1',
        customName: 'Vacuum',
        cleaningFrequency: 'weekly',
      },
    ]);
    (prisma.area.update as jest.Mock).mockResolvedValue({ id: 'area-live-1' });
    (prisma.facilityTask.update as jest.Mock).mockResolvedValue({ id: 'task-live-1' });
    (prisma.area.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.facilityTask.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.contract.update as jest.Mock).mockResolvedValue({ id: 'contract-1' });
    (prisma.contractAmendment.update as jest.Mock).mockResolvedValue({
      id: 'amend-1',
      contractId: 'contract-1',
      amendmentNumber: 1,
      status: 'applied',
      oldMonthlyValue: 2500,
      newMonthlyValue: 3200,
      monthlyDelta: 700,
      snapshots: [],
      activities: [],
    });
    (prisma.contractAmendmentScopeSnapshot.create as jest.Mock).mockResolvedValue({ id: 'snap-after' });
    (prisma.contractAmendmentActivity.create as jest.Mock).mockResolvedValue({ id: 'activity-1' });

    const result = await applyContractAmendment('amend-1', 'user-1');

    expect(prisma.area.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'area-live-1' },
      })
    );
    expect(prisma.area.create).not.toHaveBeenCalled();
    expect(prisma.facilityTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-live-1' },
      })
    );
    expect(prisma.facilityTask.create).not.toHaveBeenCalled();
    expect(prisma.contractAmendmentActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'applied',
          metadata: expect.objectContaining({
            updatedAreaCount: 1,
            createdAreaCount: 0,
            removedAreaCount: 0,
            updatedTaskCount: 1,
            createdTaskCount: 0,
            removedTaskCount: 0,
          }),
        }),
      })
    );
    expect(result.status).toBe('applied');
  });
});
