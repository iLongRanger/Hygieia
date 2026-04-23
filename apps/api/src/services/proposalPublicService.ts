import { prisma } from '../lib/prisma';
import { createPublicTokenPair, hashPublicToken } from './publicTokenService';
import {
  autoAdvanceLeadStatusForAccount,
  autoSetLeadStatusForAccount,
  autoSetLeadStatusForOpportunity,
} from './leadService';
import { ensureOneTimeJobForAcceptedProposal } from './proposalService';

const PUBLIC_TOKEN_EXPIRY_DAYS = parseInt(process.env.PUBLIC_TOKEN_EXPIRY_DAYS ?? '30', 10);

const publicProposalSelect = {
  id: true,
  proposalNumber: true,
  title: true,
  status: true,
  proposalType: true,
  description: true,
  subtotal: true,
  taxRate: true,
  taxAmount: true,
  totalAmount: true,
  serviceFrequency: true,
  scheduledDate: true,
  scheduledStartTime: true,
  scheduledEndTime: true,
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
      catalogItemId: true,
      serviceType: true,
      frequency: true,
      estimatedHours: true,
      hourlyRate: true,
      monthlyPrice: true,
      description: true,
      includedTasks: true,
      pricingMeta: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

export async function generatePublicToken(proposalId: string): Promise<string> {
  const { rawToken, hashedToken } = createPublicTokenPair();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PUBLIC_TOKEN_EXPIRY_DAYS);

  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      publicToken: hashedToken,
      publicTokenExpiresAt: expiresAt,
    },
  });

  return rawToken;
}

export async function getProposalByPublicToken(token: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: hashPublicToken(token) },
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

export async function markPublicViewed(token: string, _ipAddress?: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: hashPublicToken(token) },
    select: { id: true, status: true, viewedAt: true },
  });

  if (!proposal) return null;

  // Auto-mark as viewed if status is 'sent'
  if (!proposal.viewedAt) {
    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: proposal.status === 'sent' ? 'viewed' : proposal.status,
        viewedAt: new Date(),
      },
      select: { id: true },
    });

    return { ...updated, newlyViewed: true };
  }

  return { id: proposal.id, newlyViewed: false };
}

export async function acceptProposalPublic(
  token: string,
  signatureName: string,
  _ipAddress?: string
) {
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: hashPublicToken(token) },
    select: {
      id: true,
      status: true,
      publicTokenExpiresAt: true,
      accountId: true,
      opportunityId: true,
      proposalType: true,
      scheduledDate: true,
      scheduledStartTime: true,
      scheduledEndTime: true,
      pricingApprovalStatus: true,
    },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (proposal.publicTokenExpiresAt && new Date() > proposal.publicTokenExpiresAt) {
    throw new Error('This proposal link has expired');
  }

  if (!['sent', 'viewed', 'accepted'].includes(proposal.status)) {
    throw new Error('This proposal can no longer be accepted');
  }

  const acceptedNow = proposal.status !== 'accepted';
  if (acceptedNow) {
    if (
      ['one_time', 'specialized'].includes(proposal.proposalType)
      && ['pending', 'rejected'].includes(proposal.pricingApprovalStatus)
    ) {
      throw new Error('Pricing approval is required before this proposal can be accepted');
    }
    if (
      ['one_time', 'specialized'].includes(proposal.proposalType)
      && (!proposal.scheduledDate || !proposal.scheduledStartTime || !proposal.scheduledEndTime)
    ) {
      throw new Error('This proposal must include a scheduled date and time before it can be accepted');
    }
    if (
      ['one_time', 'specialized'].includes(proposal.proposalType)
      && proposal.scheduledStartTime
      && proposal.scheduledEndTime
      && proposal.scheduledEndTime <= proposal.scheduledStartTime
    ) {
      throw new Error('Scheduled end time must be after scheduled start time');
    }

    await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        signatureName,
        signatureDate: new Date(),
        signatureIp: _ipAddress ?? null,
      },
    });

    if (proposal.opportunityId) {
      await autoSetLeadStatusForOpportunity(proposal.opportunityId, 'negotiation', {
        mode: 'advance',
      });
    } else {
      await autoAdvanceLeadStatusForAccount(proposal.accountId, 'negotiation');
    }

    if (['one_time', 'specialized'].includes(proposal.proposalType)) {
      await ensureOneTimeJobForAcceptedProposal(proposal.id);
    }
  }

  const resolvedProposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposal.id },
    select: publicProposalSelect,
  });

  return {
    proposal: resolvedProposal,
    acceptedNow,
  };
}

export async function rejectProposalPublic(
  token: string,
  rejectionReason: string,
  _ipAddress?: string
) {
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: hashPublicToken(token) },
    select: { id: true, status: true, publicTokenExpiresAt: true, accountId: true, opportunityId: true },
  });

  if (!proposal) {
    throw new Error('Proposal not found');
  }

  if (proposal.publicTokenExpiresAt && new Date() > proposal.publicTokenExpiresAt) {
    throw new Error('This proposal link has expired');
  }

  if (!['sent', 'viewed', 'rejected'].includes(proposal.status)) {
    throw new Error('This proposal can no longer be rejected');
  }

  const rejectedNow = proposal.status !== 'rejected';
  if (rejectedNow) {
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason,
      },
    });

    if (proposal.opportunityId) {
      await autoSetLeadStatusForOpportunity(proposal.opportunityId, 'lost');
    } else {
      await autoSetLeadStatusForAccount(proposal.accountId, 'lost');
    }
  }

  const resolvedProposal = await prisma.proposal.findUniqueOrThrow({
    where: { id: proposal.id },
    select: publicProposalSelect,
  });

  return {
    proposal: resolvedProposal,
    rejectedNow,
  };
}
