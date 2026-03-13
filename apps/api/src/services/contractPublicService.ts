import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { autoAdvanceLeadStatusForAccount, autoSetLeadStatusForOpportunity } from './leadService';

const PUBLIC_TOKEN_EXPIRY_DAYS = parseInt(process.env.PUBLIC_TOKEN_EXPIRY_DAYS || '30', 10);

const publicContractSelect = {
  id: true,
  contractNumber: true,
  title: true,
  status: true,
  startDate: true,
  endDate: true,
  serviceFrequency: true,
  serviceSchedule: true,
  monthlyValue: true,
  totalValue: true,
  billingCycle: true,
  paymentTerms: true,
  termsAndConditions: true,
  termsDocumentName: true,
  termsDocumentMimeType: true,
  specialInstructions: true,
  signedByName: true,
  signedByEmail: true,
  signedDate: true,
  renewalNumber: true,
  sentAt: true,
  createdAt: true,
  account: {
    select: {
      name: true,
    },
  },
  facility: {
    select: {
      name: true,
      address: true,
    },
  },
  proposal: {
    select: {
      id: true,
      proposalNumber: true,
      title: true,
      proposalServices: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          serviceName: true,
          frequency: true,
          description: true,
          monthlyPrice: true,
          estimatedHours: true,
          hourlyRate: true,
          includedTasks: true,
        },
      },
    },
  },
  createdByUser: {
    select: {
      fullName: true,
      email: true,
    },
  },
} as const;

export async function generatePublicToken(contractId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PUBLIC_TOKEN_EXPIRY_DAYS);

  await prisma.contract.update({
    where: { id: contractId },
    data: {
      publicToken: token,
      publicTokenExpiresAt: expiresAt,
    },
  });

  return token;
}

export async function getContractByPublicToken(token: string) {
  const contract = await prisma.contract.findUnique({
    where: { publicToken: token },
    select: {
      ...publicContractSelect,
      publicTokenExpiresAt: true,
    },
  });

  if (!contract) {
    return null;
  }

  if (contract.publicTokenExpiresAt && new Date() > contract.publicTokenExpiresAt) {
    return null;
  }

  return contract;
}

export async function markPublicViewed(token: string, ipAddress?: string) {
  const contract = await prisma.contract.findUnique({
    where: { publicToken: token },
    select: { id: true, status: true, viewedAt: true },
  });

  if (!contract) return null;

  if (!contract.viewedAt) {
    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: contract.status === 'sent' ? 'viewed' : contract.status,
        viewedAt: new Date(),
      },
      select: { id: true },
    });

    return { ...updated, newlyViewed: true };
  }

  return { id: contract.id, newlyViewed: false };
}

export async function signContractPublic(
  token: string,
  signedByName: string,
  signedByEmail: string,
  ipAddress?: string
) {
  const contract = await prisma.contract.findUnique({
    where: { publicToken: token },
    select: {
      id: true,
      status: true,
      publicTokenExpiresAt: true,
      accountId: true,
      opportunityId: true,
      signedByName: true,
      signedByEmail: true,
      signedDate: true,
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  if (contract.publicTokenExpiresAt && new Date() > contract.publicTokenExpiresAt) {
    throw new Error('This contract link has expired');
  }

  if (!['sent', 'viewed', 'active', 'pending_signature'].includes(contract.status)) {
    throw new Error('This contract can no longer be signed');
  }

  const alreadySigned =
    contract.status === 'pending_signature' ||
    Boolean(contract.signedDate && contract.signedByName && contract.signedByEmail);

  if (!alreadySigned) {
    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        // Don't regress an active contract; otherwise move to pending_signature (signed, awaiting admin activation)
        ...(contract.status !== 'active' && { status: 'pending_signature' }),
        signedByName,
        signedByEmail,
        signedDate: new Date(),
        signatureIp: ipAddress ?? null,
      },
    });

    if (contract.opportunityId) {
      await autoSetLeadStatusForOpportunity(contract.opportunityId, 'won', {
        mode: 'advance',
      });
    } else {
      await autoAdvanceLeadStatusForAccount(contract.accountId, 'won');
    }
  }

  const resolvedContract = await prisma.contract.findUniqueOrThrow({
    where: { id: contract.id },
    select: publicContractSelect,
  });

  return {
    contract: resolvedContract,
    signedNow: !alreadySigned,
  };
}
