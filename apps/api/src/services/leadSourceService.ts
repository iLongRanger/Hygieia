import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export interface LeadSourceCreateInput {
  name: string;
  description?: string | null;
  color?: string;
  isActive?: boolean;
}

export interface LeadSourceUpdateInput {
  name?: string;
  description?: string | null;
  color?: string;
  isActive?: boolean;
}

const leadSourceSelect = {
  id: true,
  name: true,
  description: true,
  color: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LeadSourceSelect;

export async function listLeadSources(isActive?: boolean) {
  const where: Prisma.LeadSourceWhereInput = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  return prisma.leadSource.findMany({
    where,
    select: leadSourceSelect,
    orderBy: { name: 'asc' },
  });
}

export async function getLeadSourceById(id: string) {
  return prisma.leadSource.findUnique({
    where: { id },
    select: leadSourceSelect,
  });
}

export async function getLeadSourceByName(name: string) {
  return prisma.leadSource.findUnique({
    where: { name },
    select: leadSourceSelect,
  });
}

export async function createLeadSource(input: LeadSourceCreateInput) {
  return prisma.leadSource.create({
    data: {
      name: input.name,
      description: input.description,
      color: input.color ?? '#6B7280',
      isActive: input.isActive ?? true,
    },
    select: leadSourceSelect,
  });
}

export async function updateLeadSource(
  id: string,
  input: LeadSourceUpdateInput
) {
  const updateData: Prisma.LeadSourceUpdateInput = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  return prisma.leadSource.update({
    where: { id },
    data: updateData,
    select: leadSourceSelect,
  });
}

export async function deleteLeadSource(id: string) {
  return prisma.leadSource.delete({
    where: { id },
    select: { id: true },
  });
}
