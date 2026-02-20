import { prisma } from '../lib/prisma';
import { NotFoundError } from '../middleware/errorHandler';

// ==================== Interfaces ====================

export interface InspectionTemplateListParams {
  facilityTypeFilter?: string;
  includeArchived?: boolean;
  page?: number;
  limit?: number;
}

export interface InspectionTemplateCreateInput {
  name: string;
  description?: string | null;
  facilityTypeFilter?: string | null;
  contractId?: string | null;
  createdByUserId: string;
  items: InspectionTemplateItemInput[];
}

export interface InspectionTemplateUpdateInput {
  name?: string;
  description?: string | null;
  facilityTypeFilter?: string | null;
  items?: InspectionTemplateItemInput[];
}

export interface InspectionTemplateItemInput {
  category: string;
  itemText: string;
  sortOrder?: number;
  weight?: number;
}

// ==================== Select objects ====================

const templateSelect = {
  id: true,
  name: true,
  description: true,
  facilityTypeFilter: true,
  contractId: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  contract: {
    select: { id: true, contractNumber: true, title: true },
  },
  items: {
    select: {
      id: true,
      category: true,
      itemText: true,
      sortOrder: true,
      weight: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  createdByUser: {
    select: { id: true, fullName: true },
  },
  _count: {
    select: { inspections: true },
  },
};

const templateListSelect = {
  id: true,
  name: true,
  description: true,
  facilityTypeFilter: true,
  contractId: true,
  createdAt: true,
  archivedAt: true,
  contract: {
    select: { id: true, contractNumber: true },
  },
  createdByUser: {
    select: { id: true, fullName: true },
  },
  _count: {
    select: { items: true, inspections: true },
  },
};

// ==================== Service ====================

export async function listInspectionTemplates(params: InspectionTemplateListParams) {
  const { facilityTypeFilter, includeArchived = false, page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (!includeArchived) where.archivedAt = null;
  if (facilityTypeFilter) where.facilityTypeFilter = facilityTypeFilter;

  const [data, total] = await Promise.all([
    prisma.inspectionTemplate.findMany({
      where,
      select: templateListSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.inspectionTemplate.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getInspectionTemplateById(id: string) {
  const template = await prisma.inspectionTemplate.findUnique({
    where: { id },
    select: templateSelect,
  });
  if (!template) throw new NotFoundError('Inspection template not found');
  return template;
}

export async function createInspectionTemplate(input: InspectionTemplateCreateInput) {
  const template = await prisma.inspectionTemplate.create({
    data: {
      name: input.name,
      description: input.description,
      facilityTypeFilter: input.facilityTypeFilter,
      contractId: input.contractId ?? null,
      createdByUserId: input.createdByUserId,
      items: {
        create: input.items.map((item, index) => ({
          category: item.category,
          itemText: item.itemText,
          sortOrder: item.sortOrder ?? index,
          weight: item.weight ?? 1,
        })),
      },
    },
    select: templateSelect,
  });
  return template;
}

export async function updateInspectionTemplate(id: string, input: InspectionTemplateUpdateInput) {
  const existing = await prisma.inspectionTemplate.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Inspection template not found');

  const template = await prisma.$transaction(async (tx) => {
    if (input.items !== undefined) {
      await tx.inspectionTemplateItem.deleteMany({ where: { templateId: id } });
      await tx.inspectionTemplateItem.createMany({
        data: input.items.map((item, index) => ({
          templateId: id,
          category: item.category,
          itemText: item.itemText,
          sortOrder: item.sortOrder ?? index,
          weight: item.weight ?? 1,
        })),
      });
    }

    return tx.inspectionTemplate.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.facilityTypeFilter !== undefined && { facilityTypeFilter: input.facilityTypeFilter }),
      },
      select: templateSelect,
    });
  });

  return template;
}

export async function archiveInspectionTemplate(id: string) {
  const existing = await prisma.inspectionTemplate.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Inspection template not found');

  await prisma.inspectionTemplate.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
}

export async function restoreInspectionTemplate(id: string) {
  const existing = await prisma.inspectionTemplate.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Inspection template not found');

  await prisma.inspectionTemplate.update({
    where: { id },
    data: { archivedAt: null },
  });
}

/**
 * Auto-create an inspection template from a contract's proposal services/tasks
 * Called when a contract is activated
 */
export async function autoCreateInspectionTemplate(contractId: string, createdByUserId: string) {
  // Guard: skip if template already exists for this contract
  const existing = await prisma.inspectionTemplate.findFirst({
    where: { contractId, archivedAt: null },
    select: { id: true },
  });
  if (existing) return null;

  // Fetch contract with proposal services
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      id: true,
      title: true,
      account: { select: { name: true } },
      facility: { select: { name: true } },
      proposal: {
        select: {
          proposalServices: {
            select: {
              serviceName: true,
              includedTasks: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!contract) return null;

  const proposalServices = contract.proposal?.proposalServices;
  if (!proposalServices) return null;

  const services = proposalServices;
  if (services.length === 0) return null;

  // Build template items from proposal services + their tasks
  const items: InspectionTemplateItemInput[] = [];
  let sortOrder = 0;

  for (const service of services) {
    const tasks = Array.isArray(service.includedTasks) ? (service.includedTasks as string[]) : [];
    if (tasks.length > 0) {
      for (const task of tasks) {
        items.push({
          category: service.serviceName,
          itemText: task,
          sortOrder: sortOrder++,
          weight: 1,
        });
      }
    } else {
      // No specific tasks - add a generic check item for this service
      items.push({
        category: service.serviceName,
        itemText: `${service.serviceName} - Quality Check`,
        sortOrder: sortOrder++,
        weight: 1,
      });
    }
  }

  const templateName = `${contract.account.name} - ${contract.facility?.name || contract.title} Inspection`;

  return createInspectionTemplate({
    name: templateName,
    description: `Auto-generated from contract activation`,
    contractId,
    createdByUserId,
    items,
  });
}

/**
 * Find the existing inspection template for a contract, or auto-create one.
 * Returns { id, name } or null if the contract has no proposal tasks.
 */
export async function getOrCreateTemplateForContract(contractId: string, createdByUserId: string) {
  const existing = await prisma.inspectionTemplate.findFirst({
    where: { contractId, archivedAt: null },
    select: { id: true, name: true },
  });
  if (existing) return existing;

  const created = await autoCreateInspectionTemplate(contractId, createdByUserId);
  if (!created) return null;

  return { id: created.id, name: created.name };
}
