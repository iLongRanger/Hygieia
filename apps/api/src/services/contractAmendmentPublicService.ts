import { prisma } from '../lib/prisma';
import { createPublicTokenPair, hashPublicToken } from './publicTokenService';

const PUBLIC_TOKEN_EXPIRY_DAYS = parseInt(process.env.PUBLIC_TOKEN_EXPIRY_DAYS || '30', 10);

const publicContractAmendmentSelect = {
  id: true,
  contractId: true,
  amendmentNumber: true,
  status: true,
  amendmentType: true,
  title: true,
  summary: true,
  reason: true,
  effectiveDate: true,
  oldMonthlyValue: true,
  newMonthlyValue: true,
  monthlyDelta: true,
  oldServiceFrequency: true,
  newServiceFrequency: true,
  oldServiceSchedule: true,
  newServiceSchedule: true,
  sentAt: true,
  viewedAt: true,
  signedDate: true,
  signedByName: true,
  signedByEmail: true,
  contract: {
    select: {
      id: true,
      contractNumber: true,
      title: true,
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
    },
  },
  snapshots: {
    select: {
      id: true,
      snapshotType: true,
      scopeJson: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

export async function generatePublicToken(amendmentId: string): Promise<string> {
  const { rawToken, hashedToken } = createPublicTokenPair();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PUBLIC_TOKEN_EXPIRY_DAYS);

  await prisma.contractAmendment.update({
    where: { id: amendmentId },
    data: {
      publicToken: hashedToken,
      publicTokenExpiresAt: expiresAt,
    },
  });

  return rawToken;
}

export async function getContractAmendmentByPublicToken(token: string) {
  const amendment = await prisma.contractAmendment.findUnique({
    where: { publicToken: hashPublicToken(token) },
    select: {
      ...publicContractAmendmentSelect,
      publicTokenExpiresAt: true,
    },
  });

  if (!amendment) {
    return null;
  }

  if (amendment.publicTokenExpiresAt && new Date() > amendment.publicTokenExpiresAt) {
    return null;
  }

  return amendment;
}

export async function markPublicViewed(token: string, ipAddress?: string) {
  const amendment = await prisma.contractAmendment.findUnique({
    where: { publicToken: hashPublicToken(token) },
    select: { id: true, status: true, viewedAt: true },
  });

  if (!amendment) return null;

  if (!amendment.viewedAt) {
    const updated = await prisma.contractAmendment.update({
      where: { id: amendment.id },
      data: {
        status: amendment.status === 'sent' ? 'viewed' : amendment.status,
        viewedAt: new Date(),
        signatureIp: ipAddress ?? null,
      },
      select: { id: true },
    });

    return { ...updated, newlyViewed: true };
  }

  return { id: amendment.id, newlyViewed: false };
}

export async function signContractAmendmentPublic(
  token: string,
  signedByName: string,
  signedByEmail: string,
  ipAddress?: string
) {
  const amendment = await prisma.contractAmendment.findUnique({
    where: { publicToken: hashPublicToken(token) },
    select: {
      id: true,
      status: true,
      publicTokenExpiresAt: true,
      signedByName: true,
      signedByEmail: true,
      signedDate: true,
    },
  });

  if (!amendment) {
    throw new Error('Amendment not found');
  }

  if (amendment.publicTokenExpiresAt && new Date() > amendment.publicTokenExpiresAt) {
    throw new Error('This amendment link has expired');
  }

  if (!['sent', 'viewed', 'signed'].includes(amendment.status)) {
    throw new Error('This amendment can no longer be signed');
  }

  const alreadySigned =
    amendment.status === 'signed' ||
    Boolean(amendment.signedDate && amendment.signedByName && amendment.signedByEmail);

  if (!alreadySigned) {
    await prisma.contractAmendment.update({
      where: { id: amendment.id },
      data: {
        status: 'signed',
        viewedAt: new Date(),
        signedByName,
        signedByEmail,
        signedDate: new Date(),
        signatureIp: ipAddress ?? null,
      },
    });
  }

  const resolved = await prisma.contractAmendment.findUniqueOrThrow({
    where: { id: amendment.id },
    select: publicContractAmendmentSelect,
  });

  return {
    amendment: resolved,
    signedNow: !alreadySigned,
  };
}
