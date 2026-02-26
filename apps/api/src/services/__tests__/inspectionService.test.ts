import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import {
  addInspectionItem,
  completeInspection,
  createInspection,
  getInspectionById,
  listInspections,
  updateInspection,
} from '../inspectionService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
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
    },
  },
}));

describe('inspectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    (prisma.inspection.findFirst as jest.Mock).mockResolvedValue({
      inspectionNumber: `INS-${year}-0003`,
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
});
