import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const versionSelect = {
  id: true,
  versionNumber: true,
  snapshot: true,
  changeReason: true,
  createdAt: true,
  changedByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const;

const versionListSelect = {
  id: true,
  versionNumber: true,
  changeReason: true,
  createdAt: true,
  changedByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const;

export async function buildSnapshotFromProposal(proposalId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      proposalItems: { orderBy: { sortOrder: 'asc' } },
      proposalServices: { orderBy: { sortOrder: 'asc' } },
      account: { select: { id: true, name: true } },
      facility: { select: { id: true, name: true } },
    },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  return {
    proposalNumber: proposal.proposalNumber,
    title: proposal.title,
    status: proposal.status,
    description: proposal.description,
    subtotal: proposal.subtotal.toString(),
    taxRate: proposal.taxRate.toString(),
    taxAmount: proposal.taxAmount.toString(),
    totalAmount: proposal.totalAmount.toString(),
    validUntil: proposal.validUntil?.toISOString() ?? null,
    notes: proposal.notes,
    pricingPlanId: proposal.pricingPlanId,
    pricingSnapshot: proposal.pricingSnapshot,
    pricingLocked: proposal.pricingLocked,
    account: proposal.account,
    facility: proposal.facility,
    proposalItems: proposal.proposalItems.map((item) => ({
      itemType: item.itemType,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      totalPrice: item.totalPrice.toString(),
      sortOrder: item.sortOrder,
    })),
    proposalServices: proposal.proposalServices.map((service) => ({
      serviceName: service.serviceName,
      serviceType: service.serviceType,
      frequency: service.frequency,
      estimatedHours: service.estimatedHours?.toString() ?? null,
      hourlyRate: service.hourlyRate?.toString() ?? null,
      monthlyPrice: service.monthlyPrice.toString(),
      description: service.description,
      includedTasks: service.includedTasks,
      sortOrder: service.sortOrder,
    })),
  };
}

export async function createVersion(
  proposalId: string,
  changedByUserId: string,
  changeReason?: string
) {
  // Get the next version number
  const lastVersion = await prisma.proposalVersion.findFirst({
    where: { proposalId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  });

  const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  const snapshot = await buildSnapshotFromProposal(proposalId);

  return prisma.proposalVersion.create({
    data: {
      proposalId,
      versionNumber,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
      changedByUserId,
      changeReason: changeReason ?? null,
    },
    select: versionSelect,
  });
}

export async function getVersions(proposalId: string) {
  return prisma.proposalVersion.findMany({
    where: { proposalId },
    select: versionListSelect,
    orderBy: { versionNumber: 'desc' },
  });
}

export async function getVersion(proposalId: string, versionNumber: number) {
  return prisma.proposalVersion.findUnique({
    where: {
      proposalId_versionNumber: { proposalId, versionNumber },
    },
    select: versionSelect,
  });
}
