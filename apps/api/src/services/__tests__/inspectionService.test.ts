import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import {
  addInspectionItem,
  completeInspection,
  createInspection,
  createInspectionItemFeedback,
  createInspectionSignoff,
  findInspectionItemInScope,
  getInspectionById,
  listInspectionItemFeedback,
  listInspections,
  startInspection,
  updateInspection,
} from '../inspectionService';
import { createNotification } from '../notificationService';

jest.mock('../notificationService', () => ({
  createNotification: jest.fn(async () => undefined),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    facility: {
      findUnique: jest.fn(),
    },
    inspection: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inspectionTemplate: {
      findUnique: jest.fn(),
    },
    inspectionItem: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inspectionCorrectiveAction: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    inspectionActivity: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    inspectionSignoff: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    inspectionItemFeedback: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    appointment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    contract: {
      findUnique: jest.fn(),
    },
  },
}));

describe('inspectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createNotification as jest.Mock).mockResolvedValue(undefined);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      roles: [{ role: { key: 'manager' } }],
    });
    (prisma.facility.findUnique as jest.Mock).mockResolvedValue({
      id: 'facility-1',
      accountId: 'account-1',
      archivedAt: null,
      status: 'active',
    });
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue(null);
  });

  it('listInspections applies date and score filters with pagination', async () => {
    (prisma.inspection.findMany as jest.Mock).mockResolvedValue([
      { id: 'ins-1', correctiveActions: [], signoffs: [] },
    ]);
    (prisma.inspection.count as jest.Mock).mockResolvedValue(3);

    const result = await listInspections({
      facilityId: 'facility-1',
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-01-31T00:00:00.000Z'),
      minScore: 70,
      maxScore: 95,
      page: 2,
      limit: 2,
    });

    expect(prisma.inspection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          facilityId: 'facility-1',
          scheduledDate: expect.objectContaining({
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lte: new Date('2026-01-31T00:00:00.000Z'),
          }),
          overallScore: expect.objectContaining({
            gte: 70,
            lte: 95,
          }),
        }),
        skip: 2,
        take: 2,
      })
    );
    expect(result.pagination.totalPages).toBe(2);
  });

  it('getInspectionById throws when inspection does not exist', async () => {
    (prisma.inspection.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(getInspectionById('missing')).rejects.toThrow('Inspection not found');
  });

  it('createInspection pre-populates items from template', async () => {
    const year = new Date().getFullYear();
    (prisma.inspection.findFirst as jest.Mock).mockImplementation((args: { where?: { status?: unknown } } = {}) => {
      if (args.where?.status) return Promise.resolve(null);
      return Promise.resolve({ inspectionNumber: `INS-${year}-0003` });
    });
    (prisma.inspectionTemplate.findUnique as jest.Mock).mockResolvedValue({
      items: [
        { id: 'ti-1', category: 'Lobby', itemText: 'Floors clean', sortOrder: 0, weight: 1 },
        { id: 'ti-2', category: 'Restroom', itemText: 'Supplies stocked', sortOrder: 1, weight: 2 },
      ],
    });
    (prisma.inspection.create as jest.Mock).mockResolvedValue({ id: 'ins-1' });

    await createInspection({
      templateId: 'template-1',
      facilityId: 'facility-1',
      accountId: 'account-1',
      inspectorUserId: 'user-1',
      scheduledDate: new Date('2026-02-01T00:00:00.000Z'),
      createdByUserId: 'admin-1',
      skipAutoCreate: true,
    });

    expect(prisma.inspection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({
                templateItemId: 'ti-1',
                category: 'Lobby',
                itemText: 'Floors clean',
                sortOrder: 0,
              }),
              expect.objectContaining({
                templateItemId: 'ti-2',
                category: 'Restroom',
                itemText: 'Supplies stocked',
                sortOrder: 1,
              }),
            ],
          },
          activities: {
            create: expect.objectContaining({
              action: 'created',
              performedByUserId: 'admin-1',
            }),
          },
        }),
      })
    );
  });

  it('createInspection blocks new inspection when one is still incomplete for the service location', async () => {
    (prisma.inspection.findFirst as jest.Mock).mockImplementation((args: { where?: { status?: unknown } } = {}) => {
      if (args.where?.status) {
        return Promise.resolve({ inspectionNumber: 'INS-2026-0001' });
      }
      return Promise.resolve(null);
    });

    await expect(
      createInspection({
        templateId: 'template-1',
        facilityId: 'facility-1',
        accountId: 'account-1',
        inspectorUserId: 'user-1',
        scheduledDate: new Date('2026-02-01T00:00:00.000Z'),
        createdByUserId: 'admin-1',
        skipAutoCreate: true,
      })
    ).rejects.toThrow(/INS-2026-0001 is still pending/);

    expect(prisma.inspection.create).not.toHaveBeenCalled();
  });

  it('updateInspection rejects edits to completed inspections', async () => {
    (prisma.inspection.findUnique as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      status: 'completed',
    });

    await expect(updateInspection('ins-1', { notes: 'Updated' })).rejects.toThrow(
      'Cannot edit a completed inspection'
    );
  });

  it('completeInspection computes weighted overall score and rating', async () => {
    (prisma.inspection.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'ins-1',
        status: 'in_progress',
        templateId: 'template-1',
        inspectorUserId: 'inspector-1',
        items: [
          { id: 'item-1', templateItemId: 'template-item-1', category: 'Floor', itemText: 'Floors clean', sortOrder: 0 },
          { id: 'item-2', templateItemId: 'template-item-2', category: 'Trash', itemText: 'Bins emptied', sortOrder: 1 },
        ],
      })
      .mockResolvedValueOnce({
        id: 'ins-1',
        items: [],
        activities: [],
        correctiveActions: [],
        signoffs: [],
      });
    (prisma.inspectionTemplate.findUnique as jest.Mock).mockResolvedValue({
      items: [
        { id: 'template-item-1', weight: 2 },
        { id: 'template-item-2', weight: 1 },
      ],
    });
    (prisma.inspectionItem.update as jest.Mock).mockResolvedValue({});
    (prisma.inspectionCorrectiveAction.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.inspectionActivity.create as jest.Mock).mockResolvedValue({});
    (prisma.inspection.update as jest.Mock).mockResolvedValue({ id: 'ins-1' });

    await completeInspection('ins-1', {
      userId: 'inspector-1',
      summary: 'Completed',
      items: [
        { id: 'item-1', score: 'pass', notes: 'Floor looks good' },
        { id: 'item-2', score: 'fail', notes: 'Trash bins were not emptied' },
      ],
    });

    expect(prisma.inspectionItem.update).toHaveBeenCalledTimes(2);
    expect(prisma.inspectionCorrectiveAction.createMany).toHaveBeenCalledTimes(1);

    const updateArg = (prisma.inspection.update as jest.Mock).mock.calls[0][0];
    expect(updateArg.data.status).toBe('completed');
    expect(updateArg.data.overallRating).toBe('fair');
    expect(updateArg.data.overallScore.toString()).toBe('66.67');
    expect(updateArg.data.activities.create.metadata).toEqual({
      overallScore: 66.67,
      overallRating: 'fair',
      failedItems: 1,
      correctiveActionsAutoCreated: 1,
    });
  });

  it('createInspection rejects non-management inspectors', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'cleaner-1',
      roles: [{ role: { key: 'cleaner' } }],
    });

    await expect(
      createInspection({
        facilityId: 'facility-1',
        accountId: 'account-1',
        inspectorUserId: 'cleaner-1',
        scheduledDate: new Date('2026-02-01T00:00:00.000Z'),
        createdByUserId: 'admin-1',
        skipAutoCreate: true,
      })
    ).rejects.toThrow('Inspector must be an owner, admin, or manager');
  });

  it('startInspection rejects canceled inspections', async () => {
    (prisma.inspection.findUnique as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      status: 'canceled',
    });

    await expect(startInspection('ins-1', 'manager-1')).rejects.toThrow(
      'Cannot restart a canceled inspection'
    );
  });

  it('addInspectionItem defaults sortOrder to next index', async () => {
    (prisma.inspection.findUnique as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      status: 'scheduled',
    });
    (prisma.inspectionItem.findFirst as jest.Mock).mockResolvedValue({ sortOrder: 4 });
    (prisma.inspectionItem.create as jest.Mock).mockResolvedValue({ id: 'item-9' });

    await addInspectionItem('ins-1', {
      category: 'Safety',
      itemText: 'Emergency exits clear',
    });

    expect(prisma.inspectionItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inspectionId: 'ins-1',
          sortOrder: 5,
        }),
      })
    );
  });

  it('createInspectionSignoff rejects duplicate signer types', async () => {
    (prisma.inspection.findUnique as jest.Mock).mockResolvedValue({
      id: 'ins-1',
      status: 'completed',
    });
    (prisma.inspectionSignoff.findFirst as jest.Mock).mockResolvedValue({
      id: 'signoff-1',
    });

    await expect(
      createInspectionSignoff(
        'ins-1',
        {
          signerType: 'client',
          signerName: 'Jane Client',
        },
        'manager-1'
      )
    ).rejects.toThrow('A client signoff already exists for this inspection');
  });

  it('listInspections scopes cleaner to inspections on assigned contracts', async () => {
    (prisma.inspection.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inspection.count as jest.Mock).mockResolvedValue(0);

    await listInspections({}, { userRole: 'cleaner', userId: 'cleaner-1' });

    expect(prisma.inspection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contract: { assignedToUserId: 'cleaner-1' },
          status: { in: ['scheduled', 'completed'] },
        }),
      })
    );
  });

  it('listInspections scopes subcontractor by team OR user assignment', async () => {
    (prisma.inspection.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.inspection.count as jest.Mock).mockResolvedValue(0);

    await listInspections(
      {},
      { userRole: 'subcontractor', userId: 'sub-1', userTeamId: 'team-1' }
    );

    expect(prisma.inspection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contract: {
            OR: [
              { assignedTeamId: 'team-1' },
              { assignedToUserId: 'sub-1' },
            ],
          },
          status: { in: ['scheduled', 'completed'] },
        }),
      })
    );
  });

  it('listInspections returns empty for subcontractor with no userId', async () => {
    const result = await listInspections({}, { userRole: 'subcontractor' });

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(prisma.inspection.findMany).not.toHaveBeenCalled();
  });

  describe('findInspectionItemInScope', () => {
    it('returns the item when it belongs to the inspection', async () => {
      (prisma.inspectionItem.findFirst as jest.Mock).mockResolvedValue({
        id: 'item-1',
        inspectionId: 'ins-1',
        itemText: 'Floors',
      });

      const item = await findInspectionItemInScope('ins-1', 'item-1');

      expect(item.id).toBe('item-1');
      expect(prisma.inspectionItem.findFirst).toHaveBeenCalledWith({
        where: { id: 'item-1', inspectionId: 'ins-1' },
        select: { id: true, inspectionId: true, itemText: true },
      });
    });

    it('throws NotFoundError when the item is in a different inspection', async () => {
      (prisma.inspectionItem.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(findInspectionItemInScope('ins-1', 'item-other')).rejects.toThrow(
        'Inspection item not found'
      );
    });
  });

  describe('listInspectionItemFeedback', () => {
    it('returns feedback ordered by createdAt asc when item is in scope', async () => {
      (prisma.inspectionItem.findFirst as jest.Mock).mockResolvedValue({
        id: 'item-1',
        inspectionId: 'ins-1',
        itemText: 'Floors',
      });
      (prisma.inspectionItemFeedback.findMany as jest.Mock).mockResolvedValue([
        { id: 'fb-1', body: 'first', createdAt: new Date('2026-01-01'), authorUser: { id: 'u-1', fullName: 'A' } },
      ]);

      const result = await listInspectionItemFeedback('ins-1', 'item-1');

      expect(result).toHaveLength(1);
      expect(prisma.inspectionItemFeedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { inspectionItemId: 'item-1' },
          orderBy: { createdAt: 'asc' },
        })
      );
    });
  });

  describe('createInspectionItemFeedback', () => {
    beforeEach(() => {
      (createNotification as jest.Mock).mockResolvedValue(undefined);
      (prisma.inspectionItem.findFirst as jest.Mock).mockResolvedValue({
        id: 'item-1',
        inspectionId: 'ins-1',
        itemText: 'Floors',
      });
      (prisma.inspection.findUnique as jest.Mock).mockResolvedValue({
        id: 'ins-1',
        inspectionNumber: 'INS-2026-0001',
        inspectorUserId: 'inspector-1',
        account: { accountManagerId: 'manager-1' },
      });
      (prisma.inspectionItemFeedback.create as jest.Mock).mockResolvedValue({
        id: 'fb-1',
        body: 'something is off',
        createdAt: new Date('2026-04-26'),
        authorUser: { id: 'cleaner-1', fullName: 'Cleaner' },
      });
    });

    it('creates feedback and writes an activity row', async () => {
      await createInspectionItemFeedback('ins-1', 'item-1', {
        body: 'something is off',
        authorUserId: 'cleaner-1',
      });

      expect(prisma.inspectionItemFeedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            inspectionItemId: 'item-1',
            authorUserId: 'cleaner-1',
            body: 'something is off',
          },
        })
      );
      expect(prisma.inspectionActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inspectionId: 'ins-1',
            action: 'field_feedback_posted',
          }),
        })
      );
    });

    it('notifies inspector and account manager, deduplicating and skipping author', async () => {
      await createInspectionItemFeedback('ins-1', 'item-1', {
        body: 'something is off',
        authorUserId: 'cleaner-1',
      });

      const userIds = (createNotification as jest.Mock).mock.calls.map(
        (call: unknown[]) => (call[0] as { userId: string }).userId
      );
      expect(new Set(userIds)).toEqual(new Set(['inspector-1', 'manager-1']));
    });

    it('does not notify author when author is also the inspector', async () => {
      (prisma.inspection.findUnique as jest.Mock).mockResolvedValue({
        id: 'ins-1',
        inspectionNumber: 'INS-2026-0001',
        inspectorUserId: 'cleaner-1',
        account: { accountManagerId: 'manager-1' },
      });

      await createInspectionItemFeedback('ins-1', 'item-1', {
        body: 'something is off',
        authorUserId: 'cleaner-1',
      });

      const userIds = (createNotification as jest.Mock).mock.calls.map(
        (call: unknown[]) => (call[0] as { userId: string }).userId
      );
      expect(userIds).toEqual(['manager-1']);
    });
  });
});
