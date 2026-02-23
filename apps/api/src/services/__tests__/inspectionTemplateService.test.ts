import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prisma } from '../../lib/prisma';
import {
  autoCreateInspectionTemplate,
  createInspectionTemplate,
  getInspectionTemplateById,
  listInspectionTemplates,
  updateInspectionTemplate,
} from '../inspectionTemplateService';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    inspectionTemplate: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inspectionTemplateItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    contract: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback(prisma)),
  },
}));

describe('inspectionTemplateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma)
    );
  });

  it('listInspectionTemplates excludes archived by default', async () => {
    (prisma.inspectionTemplate.findMany as jest.Mock).mockResolvedValue([{ id: 'tpl-1' }]);
    (prisma.inspectionTemplate.count as jest.Mock).mockResolvedValue(1);

    await listInspectionTemplates({});

    expect(prisma.inspectionTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { archivedAt: null },
      })
    );
  });

  it('getInspectionTemplateById throws when missing', async () => {
    (prisma.inspectionTemplate.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(getInspectionTemplateById('missing')).rejects.toThrow(
      'Inspection template not found'
    );
  });

  it('createInspectionTemplate applies default sortOrder and weight', async () => {
    (prisma.inspectionTemplate.create as jest.Mock).mockResolvedValue({ id: 'tpl-2' });

    await createInspectionTemplate({
      name: 'Nightly',
      createdByUserId: 'user-1',
      items: [
        { category: 'Lobby', itemText: 'Trash removed' },
        { category: 'Restroom', itemText: 'Mirrors clean', weight: 2 },
      ],
    });

    expect(prisma.inspectionTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({ sortOrder: 0, weight: 1 }),
              expect.objectContaining({ sortOrder: 1, weight: 2 }),
            ],
          },
        }),
      })
    );
  });

  it('updateInspectionTemplate rebuilds items when provided', async () => {
    (prisma.inspectionTemplate.findUnique as jest.Mock).mockResolvedValue({ id: 'tpl-1' });
    (prisma.inspectionTemplate.update as jest.Mock).mockResolvedValue({ id: 'tpl-1' });

    await updateInspectionTemplate('tpl-1', {
      name: 'Updated',
      items: [{ category: 'Hallway', itemText: 'Floors', weight: 3 }],
    });

    expect(prisma.inspectionTemplateItem.deleteMany).toHaveBeenCalledWith({
      where: { templateId: 'tpl-1' },
    });
    expect(prisma.inspectionTemplateItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          templateId: 'tpl-1',
          category: 'Hallway',
          itemText: 'Floors',
          sortOrder: 0,
          weight: 3,
        },
      ],
    });
    expect(prisma.inspectionTemplate.update).toHaveBeenCalled();
  });

  it('autoCreateInspectionTemplate preserves manual templates when one exists', async () => {
    (prisma.inspectionTemplate.findFirst as jest.Mock).mockResolvedValue({
      id: 'tpl-existing',
      description: 'Custom manual checklist',
    });
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      title: 'Main Contract',
      account: { name: 'Acme Corp' },
      facility: {
        name: 'HQ Tower',
        areas: [{ name: 'Lobby', areaType: { name: 'Lobby' } }],
      },
      proposal: { proposalServices: [] },
    });

    const result = await autoCreateInspectionTemplate('contract-1', 'user-1');

    expect(result).toBeNull();
    expect(prisma.inspectionTemplate.update).not.toHaveBeenCalled();
  });

  it('autoCreateInspectionTemplate builds area-first Hygieia items', async () => {
    (prisma.inspectionTemplate.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.contract.findUnique as jest.Mock).mockResolvedValue({
      id: 'contract-1',
      title: 'Main Contract',
      account: { name: 'Acme Corp' },
      facility: {
        name: 'HQ Tower',
        areas: [
          { name: 'Lobby', areaType: { name: 'Lobby' } },
          { name: 'Restroom', areaType: { name: 'Restroom' } },
        ],
      },
      proposal: {
        proposalServices: [
          { serviceName: 'Lobby' },
          { serviceName: 'Breakroom' },
        ],
      },
    });
    (prisma.inspectionTemplate.create as jest.Mock).mockResolvedValue({ id: 'tpl-new' });

    await autoCreateInspectionTemplate('contract-1', 'user-1');

    const createArg = (prisma.inspectionTemplate.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data.name).toBe('Acme Corp - HQ Tower Inspection');
    expect(createArg.data.items.create).toHaveLength(3);
    expect(createArg.data.items.create[0]).toEqual(
      expect.objectContaining({
        itemText: 'Area is clean, maintained, stocked, and safe per Hygieia Standard.',
        weight: 2,
      })
    );
  });
});
