import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface TemplateCreateInput {
  name: string;
  termsAndConditions: string;
  isDefault?: boolean;
  createdByUserId: string;
}

export interface TemplateUpdateInput {
  name?: string;
  termsAndConditions?: string;
  isDefault?: boolean;
}

const templateSelect = {
  id: true,
  name: true,
  termsAndConditions: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  createdByUser: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} as const;

export async function listTemplates(includeArchived = false) {
  const where: Prisma.ProposalTemplateWhereInput = {};
  if (!includeArchived) {
    where.archivedAt = null;
  }

  return prisma.proposalTemplate.findMany({
    where,
    select: templateSelect,
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
}

export async function getTemplateById(id: string) {
  return prisma.proposalTemplate.findUnique({
    where: { id },
    select: templateSelect,
  });
}

export async function getDefaultTemplate() {
  return prisma.proposalTemplate.findFirst({
    where: { isDefault: true, archivedAt: null },
    select: templateSelect,
  });
}

export async function createTemplate(input: TemplateCreateInput) {
  // If setting as default, unset other defaults
  if (input.isDefault) {
    await prisma.proposalTemplate.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.proposalTemplate.create({
    data: {
      name: input.name,
      termsAndConditions: input.termsAndConditions,
      isDefault: input.isDefault ?? false,
      createdByUserId: input.createdByUserId,
    },
    select: templateSelect,
  });
}

export async function updateTemplate(id: string, input: TemplateUpdateInput) {
  // If setting as default, unset other defaults
  if (input.isDefault) {
    await prisma.proposalTemplate.updateMany({
      where: { isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const updateData: Prisma.ProposalTemplateUpdateInput = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.termsAndConditions !== undefined) updateData.termsAndConditions = input.termsAndConditions;
  if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

  return prisma.proposalTemplate.update({
    where: { id },
    data: updateData,
    select: templateSelect,
  });
}

export async function archiveTemplate(id: string) {
  return prisma.proposalTemplate.update({
    where: { id },
    data: { archivedAt: new Date(), isDefault: false },
    select: templateSelect,
  });
}

export async function restoreTemplate(id: string) {
  return prisma.proposalTemplate.update({
    where: { id },
    data: { archivedAt: null },
    select: templateSelect,
  });
}

export async function deleteTemplate(id: string) {
  return prisma.proposalTemplate.delete({
    where: { id },
    select: { id: true },
  });
}
