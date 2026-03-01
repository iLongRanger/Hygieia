import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { autoAdvanceLeadStatusForAccount, autoSetLeadStatusForAccount } from './leadService';

const PUBLIC_TOKEN_EXPIRY_DAYS = parseInt(process.env.PUBLIC_TOKEN_EXPIRY_DAYS || '30', 10);

const publicProposalSelect = {
  id: true,
  proposalNumber: true,
  title: true,
  status: true,
  description: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  serviceFrequency: true,
  validUntil: true,
  createdAt: true,
  sentAt: true,
  account: {
    select: {
      name: true,
    },
  },
  pricingSnapshot: true,
  facility: {
    select: {
      name: true,
      address: true,
    },
  },
  createdByUser: {
    select: {
      fullName: true,
      email: true,
    },
  },
  proposalItems: {
    select: {
      itemType: true,
      description: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  proposalServices: {
    select: {
      serviceName: true,
      serviceType: true,
      frequency: true,
      estimatedHours: true,
      hourlyRate: true,
      monthlyPrice: true,
      description: true,
      includedTasks: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

export async function generatePublicToken(proposalId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PUBLIC_TOKEN_EXPIRY_DAYS);

  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      publicToken: token,
      publicTokenExpiresAt: expiresAt,
    },
  });

  return token;
}

export async function getProposalByPublicToken(token: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: token },
    select: {
      ...publicProposalSelect,
      publicTokenExpiresAt: true,
      signatureName: true,
      signatureDate: true,
    },
  });

  if (!proposal) {
    return null;
  }

  // Check expiry
  if (proposal.publicTokenExpiresAt && new Date() > proposal.publicTokenExpiresAt) {
    return null;
  }

  return proposal;
}

export async function markPublicViewed(token: string, ipAddress?: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: token },
    select: { id: true, status: true, viewedAt: true },
  });

  if (!proposal) return null;

  // Auto-mark as viewed if status is 'sent'
  if (!proposal.viewedAt) {
    return prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: proposal.status === 'sent' ? 'viewed' : proposal.status,
        viewedAt: new Date(),
      },
      select: { id: true },
    });
  }

  return { id: proposal.id };
}

export async function acceptProposalPublic(
  token: string,
  signatureName: string,
  ipAddress?: string
) {
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: token },
    select: { id: true, status: true, publicTokenExpiresAt: true, accountId: true },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (proposal.publicTokenExpiresAt && new Date() > proposal.publicTokenExpiresAt) {
    throw new Error('This proposal link has expired');
  }

  if (!['sent', 'viewed'].includes(proposal.status)) {
    throw new Error('This proposal can no longer be accepted');
  }

  const updatedProposal = await prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      status: 'accepted',
      acceptedAt: new Date(),
      signatureName,
      signatureDate: new Date(),
      signatureIp: ipAddress ?? null,
    },
    select: publicProposalSelect,
  });

  await autoAdvanceLeadStatusForAccount(proposal.accountId, 'negotiation');
  return updatedProposal;
}

export async function rejectProposalPublic(
  token: string,
  rejectionReason: string,
  ipAddress?: string
) {
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: token },
    select: { id: true, status: true, publicTokenExpiresAt: true, accountId: true },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (proposal.publicTokenExpiresAt && new Date() > proposal.publicTokenExpiresAt) {
    throw new Error('This proposal link has expired');
  }

  if (!['sent', 'viewed'].includes(proposal.status)) {
    throw new Error('This proposal can no longer be rejected');
  }

  const updatedProposal = await prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason,
    },
    select: publicProposalSelect,
  });

  await autoSetLeadStatusForAccount(proposal.accountId, 'lost');
  return updatedProposal;
}
